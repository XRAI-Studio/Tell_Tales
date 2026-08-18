import { hasValue, isSet, type StoryConfig, type StoryPayload, type StoryRequest } from './schema';
import { lengthById } from './length';

/**
 * Expand a validated request into the payload handed to the model. The word
 * target comes from the server's own table, never from the caller.
 */
export function resolveRequest(request: StoryRequest): StoryPayload {
  const { lengthId, ...rest } = request;
  const length = lengthById(lengthId);
  return { ...rest, length: { label: length.label, targetWords: length.targetWords } };
}

/**
 * Compile the console state into the JSON payload the Master Storyteller
 * prompt expects. Key names deliberately mirror the prompt's vocabulary
 * (`isFact`, `tone.flavor`, `tropes`, `style`, `formatting`).
 *
 * Optional fields follow spec §5's null-vs-unvisited distinction on the wire:
 *   - explicitly skipped -> the key is present with `null`
 *   - never visited      -> the key is omitted entirely
 * The prompt handles both ("If these optional fields are null or absent"),
 * but keeping them distinct means the payload records what the user actually
 * decided rather than flattening a choice into an absence.
 */
export function compilePayload(config: StoryConfig): StoryRequest {
  const text = (id: keyof StoryConfig): string => {
    const state = config[id];
    return state.status === 'set' && typeof state.value === 'string' ? state.value.trim() : '';
  };

  const payload: StoryRequest = {
    plot: isSet(config.plots) ? config.plots.value : [],
    setting: { time: text('settingTime'), place: text('settingPlace') },
    isFact: isSet(config.isFact) ? config.isFact.value : false,
    characters: (isSet(config.characters) ? config.characters.value : []).map((c) => ({
      name: c.name.trim(),
      age: c.age.trim(),
      sex: c.sex.trim(),
      relationships: c.relationships.trim(),
    })),
    conflict: text('conflict'),
    theme: text('theme'),
    tone: isSet(config.tone) ? config.tone.value : { flavor: 'Balanced', intensity: 5 },
    perspective: text('perspective'),
    audience: text('audience'),
    pacing: text('pacing'),
    lengthId: isSet(config.length) ? (config.length.value as string) : 'short',
    genre: text('genre'),
  };

  // Optional garnishes: present-as-null when skipped, omitted when unvisited.
  if (hasValue(config.tropes)) {
    payload.tropes = (config.tropes as { value: string[] }).value;
  } else if (config.tropes.status === 'skipped') {
    payload.tropes = null;
  }

  if (hasValue(config.style)) {
    payload.style = (config.style as { value: string }).value.trim();
  } else if (config.style.status === 'skipped') {
    payload.style = null;
  }

  if (hasValue(config.formatting)) {
    payload.formatting = (config.formatting as { value: string }).value;
  } else if (config.formatting.status === 'skipped') {
    payload.formatting = null;
  }

  return payload;
}

/** The payload as it is handed to the model: pretty-printed JSON. */
export function payloadToUserMessage(payload: StoryPayload): string {
  return JSON.stringify(payload, null, 2);
}

/** Spec §1: Fact mode clamps creativity; fiction opens it up. */
export const FACT_TEMPERATURE = 0.2;
export const FICTION_TEMPERATURE = 0.9;

export function temperatureFor(isFact: boolean): number {
  return isFact ? FACT_TEMPERATURE : FICTION_TEMPERATURE;
}
