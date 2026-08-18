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
 * Roughly 1.6 tokens per English word, plus headroom so the model is never
 * cut off mid-sentence while landing near the target.
 */
export function maxOutputTokensFor(targetWords: number): number {
  return Math.ceil(targetWords * 1.6) + 512;
}
