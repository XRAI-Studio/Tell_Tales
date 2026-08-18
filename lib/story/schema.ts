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

/**
 * What a client is allowed to send.
 *
 * Every field is bounded. The endpoint spends real money per call, so an
 * unbounded string or array here is a direct cost-amplification lever for
 * anyone posting to the route without going through the UI.
 *
 * Note what is *absent*: the client cannot specify a word target or token
 * budget. It picks a length by id and the server resolves the cost, so the
 * caller never gets to choose how large a generation it is buying.
 */
export const characterPayloadSchema = z.object({
  name: z.string().max(120),
  age: z.string().max(40),
  sex: z.string().max(60),
  relationships: z.string().max(400),
});

export const storyRequestSchema = z
  .object({
    plot: z.array(z.string().max(120)).min(1).max(7),
    setting: z.object({ time: z.string().max(400), place: z.string().max(400) }),
    isFact: z.boolean(),
    characters: z.array(characterPayloadSchema).max(20),
    conflict: z.string().max(2000),
    theme: z.string().max(2000),
    tone: z.object({
      flavor: z.string().max(60),
      intensity: z.number().int().min(1).max(10),
    }),
    perspective: z.string().max(120),
    audience: z.string().max(200),
    pacing: z.string().max(60),
    lengthId: z.string().max(40),
    genre: z.string().max(200),
    tropes: z.array(z.string().max(200)).max(20).nullable().optional(),
    style: z.string().max(600).nullable().optional(),
    formatting: z.string().max(120).nullable().optional(),
  })
  .strict();

export type StoryRequest = z.infer<typeof storyRequestSchema>;

/**
 * What the model is given: the request with the length resolved server-side
 * into the label and word target the Master Storyteller prompt expects.
 */
export type StoryPayload = Omit<StoryRequest, 'lengthId'> & {
  length: { label: string; targetWords: number };
};

/** Structured result of the fact-check pass. */
export const factCheckSchema = z.object({
  issues: z
    .array(z.string())
    .describe('Specific factual problems found. Empty if the narrative is sound.'),
});
