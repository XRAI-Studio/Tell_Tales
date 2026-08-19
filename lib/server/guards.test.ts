import { beforeEach, describe, expect, it } from 'vitest';
import {
  MAX_BODY_BYTES,
  PayloadTooLargeError,
  __resetGuards,
  acquireSlot,
  clientKey,
  readJsonCapped,
} from './guards';

function request(body: string, headers: Record<string, string> = {}): Request {
  return new Request('http://localhost/api/story', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...headers },
    body,
  });
}

describe('clientKey', () => {
  it('prefers the first hop of x-forwarded-for', () => {
    const req = new Request('http://localhost/', {
      headers: { 'x-forwarded-for': '203.0.113.5, 70.41.3.18' },
    });
    expect(clientKey(req)).toBe('203.0.113.5');
  });

  it('falls back to x-real-ip, then to a constant', () => {
    expect(clientKey(new Request('http://localhost/', { headers: { 'x-real-ip': '198.51.100.9' } }))).toBe(
      '198.51.100.9',
    );
    expect(clientKey(new Request('http://localhost/'))).toBe('unknown');
  });
});

describe('acquireSlot', () => {
  beforeEach(() => __resetGuards());

  it('admits a first request and hands back a release', () => {
    const slot = acquireSlot('a');
    expect(slot.ok).toBe(true);
  });

  it('caps concurrent generations per client', () => {
    const first = acquireSlot('a');
    const second = acquireSlot('a');
    const third = acquireSlot('a');
    expect(first.ok).toBe(true);
    expect(second.ok).toBe(true);
    expect(third.ok).toBe(false);
    if (!third.ok) expect(third.rejection.status).toBe(429);
  });

  it('frees the slot on release so the next request is admitted', () => {
    const first = acquireSlot('a');
    const second = acquireSlot('a');
    expect(acquireSlot('a').ok).toBe(false);
    if (first.ok) first.release();
    expect(acquireSlot('a').ok).toBe(true);
    if (second.ok) second.release();
  });

  it('ignores a double release rather than corrupting the count', () => {
    const slot = acquireSlot('a');
    if (slot.ok) {
      slot.release();
      slot.release();
      slot.release();
    }
    // Two fresh slots must still be available, not three-plus.
    expect(acquireSlot('a').ok).toBe(true);
    expect(acquireSlot('a').ok).toBe(true);
    expect(acquireSlot('a').ok).toBe(false);
  });

  it('enforces the per-window request cap independently of concurrency', () => {
    // Release immediately so only the window counter can reject.
    let rejected = 0;
    for (let i = 0; i < 14; i += 1) {
      const slot = acquireSlot('burst');
      if (slot.ok) slot.release();
      else rejected += 1;
    }
    expect(rejected).toBeGreaterThan(0);
  });

  it('keeps clients isolated from one another', () => {
    acquireSlot('noisy');
    acquireSlot('noisy');
    expect(acquireSlot('noisy').ok).toBe(false);
    expect(acquireSlot('quiet').ok).toBe(true);
  });

  it('returns a retry hint the caller can put in a header', () => {
    for (let i = 0; i < 12; i += 1) {
      const slot = acquireSlot('hint');
      if (slot.ok) slot.release();
    }
    const blocked = acquireSlot('hint');
    expect(blocked.ok).toBe(false);
    if (!blocked.ok) expect(blocked.rejection.retryAfterSeconds).toBeGreaterThan(0);
  });
});

describe('readJsonCapped', () => {
  it('parses a normal body', async () => {
    await expect(readJsonCapped(request(JSON.stringify({ a: 1 })))).resolves.toEqual({ a: 1 });
  });

  it('refuses a body over the cap', async () => {
    const huge = JSON.stringify({ conflict: 'x'.repeat(MAX_BODY_BYTES + 100) });
    await expect(readJsonCapped(request(huge))).rejects.toBeInstanceOf(PayloadTooLargeError);
  });

  it('rejects on a declared content-length over the cap without reading the body', async () => {
    const req = request('{}', { 'content-length': String(MAX_BODY_BYTES * 10) });
    await expect(readJsonCapped(req)).rejects.toBeInstanceOf(PayloadTooLargeError);
  });

  it('propagates malformed JSON as a parse error', async () => {
    await expect(readJsonCapped(request('{ not json'))).rejects.toBeInstanceOf(SyntaxError);
  });
});

describe('client table capacity', () => {
  beforeEach(() => __resetGuards());

  it('sheds new keys once the table is full instead of growing without bound', () => {
    const cap = 10_000;
    // Simulate a caller rotating x-forwarded-for on every request.
    let lastOk = 0;
    for (let i = 0; i < cap + 50; i += 1) {
      const slot = acquireSlot(`rotating-${i}`);
      if (slot.ok) {
        slot.release();
        lastOk = i;
      }
    }
    // Admission stopped well before the final rotated key.
    expect(lastOk).toBeLessThan(cap + 50);
    const overflow = acquireSlot('rotating-brand-new');
    expect(overflow.ok).toBe(false);
    if (!overflow.ok) expect(overflow.rejection.status).toBe(503);
  });

  it('still serves a client already in the table when at capacity', () => {
    for (let i = 0; i < 10_050; i += 1) {
      const slot = acquireSlot(`rotating-${i}`);
      if (slot.ok) slot.release();
    }
    // An established key is not shed, because it needs no new entry.
    const known = acquireSlot('rotating-0');
    expect(known.ok).toBe(true);
  });
});
