/**
 * Abuse guards for the generation route.
 *
 * Every request here costs real money — one model call for fiction, up to
 * three for fact mode. The route has no user accounts, so these are the only
 * thing standing between a public deployment and someone draining the gateway
 * balance with a loop.
 *
 * LIMITATION, deliberately not hidden: this state is per-process. On a
 * serverless platform that runs several instances, each holds its own counters,
 * so the effective limit is (limit x instances). It raises the cost of abuse
 * substantially but is not a hard ceiling. A public deployment handling real
 * traffic wants durable counters (Redis/KV) and actual authentication; see the
 * README. Treat this as a floor, not a solution.
 */

const WINDOW_MS = numberFromEnv('STORY_RATE_WINDOW_MS', 60_000);
const MAX_PER_WINDOW = numberFromEnv('STORY_RATE_LIMIT', 10);
const MAX_CONCURRENT_PER_CLIENT = numberFromEnv('STORY_MAX_CONCURRENT', 2);
const MAX_CONCURRENT_GLOBAL = numberFromEnv('STORY_MAX_CONCURRENT_GLOBAL', 8);

/** Requests larger than this are refused before the body is parsed. */
export const MAX_BODY_BYTES = numberFromEnv('STORY_MAX_BODY_BYTES', 64 * 1024);

function numberFromEnv(name: string, fallback: number): number {
  const raw = process.env[name];
  if (!raw) return fallback;
  const parsed = Number(raw);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

type Window = { count: number; resetAt: number };

const windows = new Map<string, Window>();
const concurrentByClient = new Map<string, number>();
let concurrentGlobal = 0;

/**
 * Hard ceiling on tracked clients. Client keys come from a spoofable header,
 * so an attacker rotating it creates a new entry every request. Sweeping only
 * expired entries is not enough — inside a single window none have expired yet,
 * and the map grows unbounded.
 */
const MAX_TRACKED_CLIENTS = numberFromEnv('STORY_MAX_TRACKED_CLIENTS', 10_000);

function sweep(now: number) {
  if (windows.size < MAX_TRACKED_CLIENTS) return;
  for (const [key, window] of windows) {
    if (window.resetAt <= now) windows.delete(key);
  }
}

/** True when the table is full of live entries and cannot take a new key. */
function atClientCapacity(key: string): boolean {
  return windows.size >= MAX_TRACKED_CLIENTS && !windows.has(key);
}

/**
 * Best-effort client identity. Spoofable via headers, which is precisely why
 * this is a rate limit and not an authorization check.
 */
export function clientKey(req: Request): string {
  const forwarded = req.headers.get('x-forwarded-for');
  if (forwarded) return forwarded.split(',')[0].trim();
  return req.headers.get('x-real-ip') ?? 'unknown';
}

export type GuardRejection = { status: number; message: string; retryAfterSeconds?: number };

/**
 * Claim a generation slot. Returns a release function on success, or the
 * reason to refuse. Callers MUST invoke release in a finally block.
 */
export function acquireSlot(key: string): { ok: true; release: () => void } | { ok: false; rejection: GuardRejection } {
  const now = Date.now();
  sweep(now);

  // Fail closed rather than let a key-rotating caller exhaust memory. Clients
  // already being tracked are unaffected, so this sheds the attack, not users
  // mid-session.
  if (atClientCapacity(key)) {
    return {
      ok: false,
      rejection: {
        status: 503,
        message: 'The storyteller is at capacity right now. Try again shortly.',
        retryAfterSeconds: 30,
      },
    };
  }

  const window = windows.get(key);
  if (!window || window.resetAt <= now) {
    windows.set(key, { count: 1, resetAt: now + WINDOW_MS });
  } else if (window.count >= MAX_PER_WINDOW) {
    return {
      ok: false,
      rejection: {
        status: 429,
        message: 'Too many stories requested. Give it a minute and try again.',
        retryAfterSeconds: Math.max(1, Math.ceil((window.resetAt - now) / 1000)),
      },
    };
  } else {
    window.count += 1;
  }

  const current = concurrentByClient.get(key) ?? 0;
  if (current >= MAX_CONCURRENT_PER_CLIENT) {
    return {
      ok: false,
      rejection: {
        status: 429,
        message: 'A story is already being written. Wait for it to finish before starting another.',
        retryAfterSeconds: 5,
      },
    };
  }
  if (concurrentGlobal >= MAX_CONCURRENT_GLOBAL) {
    return {
      ok: false,
      rejection: {
        status: 503,
        message: 'The storyteller is at capacity right now. Try again shortly.',
        retryAfterSeconds: 10,
      },
    };
  }

  concurrentByClient.set(key, current + 1);
  concurrentGlobal += 1;

  let released = false;
  return {
    ok: true,
    release: () => {
      if (released) return;
      released = true;
      const remaining = (concurrentByClient.get(key) ?? 1) - 1;
      if (remaining <= 0) concurrentByClient.delete(key);
      else concurrentByClient.set(key, remaining);
      concurrentGlobal = Math.max(0, concurrentGlobal - 1);
    },
  };
}

/**
 * Read the body with a hard byte ceiling, so an oversized payload is refused
 * rather than buffered into memory and handed to JSON.parse.
 */
export async function readJsonCapped(req: Request, maxBytes = MAX_BODY_BYTES): Promise<unknown> {
  const declared = Number(req.headers.get('content-length') ?? '');
  if (Number.isFinite(declared) && declared > maxBytes) {
    throw new PayloadTooLargeError();
  }

  const reader = req.body?.getReader();
  if (!reader) throw new Error('Missing request body');

  const chunks: Uint8Array[] = [];
  let total = 0;
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    total += value.byteLength;
    if (total > maxBytes) {
      await reader.cancel();
      throw new PayloadTooLargeError();
    }
    chunks.push(value);
  }

  const merged = new Uint8Array(total);
  let offset = 0;
  for (const chunk of chunks) {
    merged.set(chunk, offset);
    offset += chunk.byteLength;
  }

  return JSON.parse(new TextDecoder().decode(merged));
}

export class PayloadTooLargeError extends Error {
  constructor() {
    super('Request body is too large');
    this.name = 'PayloadTooLargeError';
  }
}

/** Test seam: reset all counters. */
export function __resetGuards() {
  windows.clear();
  concurrentByClient.clear();
  concurrentGlobal = 0;
}
