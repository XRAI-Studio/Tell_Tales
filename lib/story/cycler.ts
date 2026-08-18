/**
 * The "slot machine" behind every Auto-Generate button (spec §4).
 *
 * Synchronous and local by design: the spec calls for the suggestion to appear
 * *instantly*, so a network round-trip per click is not an option.
 */
const identity = (v: unknown) => (typeof v === 'string' ? v : JSON.stringify(v));

export function nextSuggestion<T>(
  pool: readonly T[],
  current?: T,
  rand: () => number = Math.random,
): T {
  if (pool.length === 0) {
    throw new Error('nextSuggestion: suggestion pool is empty');
  }
  // A single-entry pool can only ever return that entry — never loop looking
  // for a different one.
  if (pool.length === 1) return pool[0];

  const currentKey = current === undefined ? undefined : identity(current);
  const candidates =
    currentKey === undefined ? pool : pool.filter((v) => identity(v) !== currentKey);

  // Every entry equals the current value; nothing else to offer.
  if (candidates.length === 0) return pool[0];

  return candidates[Math.floor(rand() * candidates.length) % candidates.length];
}
