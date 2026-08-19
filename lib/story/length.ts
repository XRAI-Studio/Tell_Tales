export type LengthOption = { id: string; label: string; targetWords: number };

export const LENGTH_OPTIONS: readonly LengthOption[] = [
  { id: 'flash', label: 'Flash Fiction', targetWords: 500 },
  { id: 'short', label: 'Short Story', targetWords: 1500 },
  { id: 'long', label: 'Long Short Story', targetWords: 3000 },
  { id: 'chapter', label: 'Chapter', targetWords: 5000 },
] as const;

export function lengthById(id: string): LengthOption {
  return LENGTH_OPTIONS.find((o) => o.id === id) ?? LENGTH_OPTIONS[1];
}

/**
 * Token ceiling for a generation, derived from measurement rather than a guess.
 *
 * The first version allowed 1.6 tokens per requested word, which assumed the
 * model writes roughly what it is asked for. It does not. Measured against the
 * real Master Storyteller prompt asking for 500 words:
 *
 *   run 1 -> 724 words, 1262 output tokens   (finished)
 *   run 2 -> 706 words, 1312 output tokens   (hit the 1312 ceiling, truncated)
 *
 * Two things fall out. Prose runs about 1.8 tokens per word, not 1.6. And the
 * model overshoots the target by around 45%. The old budget left so little
 * margin that whether a story survived was close to a coin flip.
 *
 * So: allow for the overshoot (x1.5) at the real token rate (x1.8), which is
 * x2.7, rounded to 3 for margin. This is a ceiling, not a spend commitment —
 * billing follows the tokens actually produced, so headroom is close to free
 * while truncation costs the whole story.
 */
const TOKENS_PER_WORD = 1.8;
const OVERSHOOT_ALLOWANCE = 1.7;

export function maxOutputTokensFor(targetWords: number): number {
  return Math.ceil(targetWords * TOKENS_PER_WORD * OVERSHOOT_ALLOWANCE) + 512;
}
