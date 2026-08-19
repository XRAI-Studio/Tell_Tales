import { afterEach, describe, expect, it, vi } from 'vitest';
import { requireAuth } from './auth-mode';

describe('requireAuth', () => {
  afterEach(() => vi.unstubAllEnvs());

  it('is off when unset, so a fresh deploy is public rather than accidentally locked', () => {
    vi.stubEnv('NEXT_PUBLIC_REQUIRE_AUTH', undefined);
    expect(requireAuth()).toBe(false);
  });

  it('is on only for the exact string "true"', () => {
    vi.stubEnv('NEXT_PUBLIC_REQUIRE_AUTH', 'true');
    expect(requireAuth()).toBe(true);
  });

  it('does not treat other truthy-looking values as enabled', () => {
    // A typo must fail closed to public rather than half-enabling a gate.
    for (const value of ['1', 'yes', 'TRUE', 'on', '', 'false']) {
      vi.stubEnv('NEXT_PUBLIC_REQUIRE_AUTH', value);
      expect(requireAuth(), `value ${JSON.stringify(value)}`).toBe(false);
    }
  });
});
