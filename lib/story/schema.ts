import { z } from 'zod';

/**
 * Spec §5: state must distinguish a field the user has never touched
 * (`unvisited`, the "null" case) from one they deliberately declined
 * (`skipped`). Encoded as a union so the compiler enforces the distinction
 * rather than leaving it to convention.
 */
export type FieldState<T> =
  | { status: 'unvisited' }
  | { status: 'skipped' }
  | { status: 'set'; value: T };

export const UNVISITED = { status: 'unvisited' } as const;
export const SKIPPED = { status: 'skipped' } as const;
export const setValue = <T>(value: T): FieldState<T> => ({ status: 'set', value });

/**
 * Widened form, for code that walks the whole config and only cares whether a
 * field is filled. `FieldState<T>` is assignable to this for any `T`, which a
 * generic parameter cannot express across a union of differing `T`s.
 */
export type AnyFieldState =
  | { status: 'unvisited' }
  | { status: 'skipped' }
  | { status: 'set'; value: unknown };

export function isSet<T>(state: FieldState<T>): state is { status: 'set'; value: T } {
  return state.status === 'set';
}

/** A value counts as present only if it is `set` AND not blank/empty. */
export function hasValue(state: AnyFieldState): boolean {
  if (state.status !== 'set') return false;
  const v = state.value;
  if (typeof v === 'string') return v.trim().length > 0;
  if (Array.isArray(v)) return v.length > 0;
  return v !== null && v !== undefined;
}

export type Character = {
  id: string;
  name: string;
  age: string;
  sex: string;
  relationships: string;
};

export type Tone = { flavor: string; intensity: number };

export type StoryConfig = {
  plots: FieldState<string[]>;
  settingTime: FieldState<string>;
  settingPlace: FieldState<string>;
  isFact: FieldState<boolean>;
  characters: FieldState<Character[]>;
  conflict: FieldState<string>;
  theme: FieldState<string>;
  tone: FieldState<Tone>;
  perspective: FieldState<string>;
  audience: FieldState<string>;
  pacing: FieldState<string>;
  length: FieldState<string>;
  genre: FieldState<string>;
  tropes: FieldState<string[]>;
  style: FieldState<string>;
  formatting: FieldState<string>;
};

export type FieldId = keyof StoryConfig;

/** Wire format sent to the model. Key names mirror the Master Storyteller prompt. */
export const characterPayloadSchema = z.object({
  name: z.string(),
  age: z.string(),
  sex: z.string(),
  relationships: z.string(),
});

export const storyPayloadSchema = z.object({
  plot: z.array(z.string()).min(1),
  setting: z.object({ time: z.string(), place: z.string() }),
  isFact: z.boolean(),
  characters: z.array(characterPayloadSchema),
  conflict: z.string(),
  theme: z.string(),
  tone: z.object({ flavor: z.string(), intensity: z.number().min(1).max(10) }),
  perspective: z.string(),
  audience: z.string(),
  pacing: z.string(),
  length: z.object({ label: z.string(), targetWords: z.number() }),
  genre: z.string(),
  tropes: z.array(z.string()).nullable().optional(),
  style: z.string().nullable().optional(),
  formatting: z.string().nullable().optional(),
});

export type StoryPayload = z.infer<typeof storyPayloadSchema>;

/** Structured result of the fact-check pass. */
export const factCheckSchema = z.object({
  issues: z
    .array(z.string())
    .describe('Specific factual problems found. Empty if the narrative is sound.'),
});
