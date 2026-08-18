import {
  SKIPPED,
  UNVISITED,
  setValue,
  type Character,
  type FieldId,
  type StoryConfig,
} from '@/lib/story/schema';
import { FIELD_BY_ID } from '@/lib/story/fields';
import { suggestFor, newCharacterId } from '@/lib/story/suggestions';

/**
 * Every field starts `unvisited` — the spec's "null" state. The one exception
 * is Audience, which the spec says defaults to "11-year-old boy". A default is
 * a value the user can see and change, so it is `set`, not `unvisited`.
 */
export function initialConfig(): StoryConfig {
  return {
    plots: UNVISITED,
    settingTime: UNVISITED,
    settingPlace: UNVISITED,
    isFact: UNVISITED,
    characters: UNVISITED,
    conflict: UNVISITED,
    theme: UNVISITED,
    tone: UNVISITED,
    perspective: UNVISITED,
    audience: setValue('11-year-old boy'),
    pacing: UNVISITED,
    length: UNVISITED,
    genre: UNVISITED,
    tropes: UNVISITED,
    style: UNVISITED,
    formatting: UNVISITED,
  };
}

export type StoryAction =
  | { type: 'SET_FIELD'; id: FieldId; value: unknown }
  | { type: 'CLEAR_FIELD'; id: FieldId }
  | { type: 'SKIP_FIELD'; id: FieldId }
  | { type: 'AUTO_GENERATE'; id: FieldId; rand?: () => number }
  | { type: 'ADD_CHARACTER' }
  | { type: 'UPDATE_CHARACTER'; id: string; patch: Partial<Character> }
  | { type: 'REMOVE_CHARACTER'; id: string }
  | { type: 'RESET' }
  | { type: 'HYDRATE'; config: StoryConfig };

const emptyCharacter = (): Character => ({
  id: newCharacterId(),
  name: '',
  age: '',
  sex: '',
  relationships: '',
});

function currentCharacters(config: StoryConfig): Character[] {
  return config.characters.status === 'set' ? config.characters.value : [];
}

export function storyReducer(config: StoryConfig, action: StoryAction): StoryConfig {
  switch (action.type) {
    case 'SET_FIELD':
      return { ...config, [action.id]: setValue(action.value) } as StoryConfig;

    case 'CLEAR_FIELD':
      return { ...config, [action.id]: UNVISITED } as StoryConfig;

    case 'SKIP_FIELD': {
      // Skipping is only meaningful for optional fields; a mandatory field
      // has to be filled, so we leave it untouched rather than lie about it.
      if (FIELD_BY_ID[action.id]?.required) return config;
      return { ...config, [action.id]: SKIPPED } as StoryConfig;
    }

    case 'AUTO_GENERATE': {
      const existing = config[action.id];
      const current = existing.status === 'set' ? existing.value : undefined;
      const value = suggestFor(action.id, current, action.rand);
      return { ...config, [action.id]: setValue(value) } as StoryConfig;
    }

    case 'ADD_CHARACTER':
      return {
        ...config,
        characters: setValue([...currentCharacters(config), emptyCharacter()]),
      };

    case 'UPDATE_CHARACTER':
      return {
        ...config,
        characters: setValue(
          currentCharacters(config).map((c) =>
            c.id === action.id ? { ...c, ...action.patch } : c,
          ),
        ),
      };

    case 'REMOVE_CHARACTER': {
      const remaining = currentCharacters(config).filter((c) => c.id !== action.id);
      // Removing the last character returns the field to unvisited so
      // validation prompts for it again rather than passing an empty cast.
      return {
        ...config,
        characters: remaining.length > 0 ? setValue(remaining) : UNVISITED,
      };
    }

    case 'RESET':
      return initialConfig();

    case 'HYDRATE':
      return action.config;

    default:
      return config;
  }
}
