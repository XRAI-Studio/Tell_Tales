import type { Character, FieldId, Tone } from './schema';
import {
  BASIC_PLOTS,
  FORMATTING_OPTIONS,
  GENRE_PRESETS,
  PACING_OPTIONS,
  PERSPECTIVES,
  TONE_FLAVORS,
} from './fields';
import { LENGTH_OPTIONS } from './length';
import { nextSuggestion } from './cycler';

/**
 * Curated pools behind the Auto-Generate buttons. Deliberately local and
 * synchronous — spec §4 wants suggestions to appear instantly, which rules
 * out a model call per click.
 */

const TIMES = [
  '1920s',
  'The far future',
  'The last summer before the war',
  'Ancient Alexandria',
  'A Tuesday in 1997',
  'The third year of the long winter',
  'Twelve minutes from now',
  'The Bronze Age',
  'Sometime after the flood',
  'The night the power went out',
  'Victorian London',
  'The age of sail',
  '2049',
  'A thousand years after the last human',
  'The morning of the eclipse',
];

const PLACES = [
  'A sprawling cyberpunk city',
  'A quiet cabin at the treeline',
  'A generation ship losing speed',
  'A lighthouse nobody staffs anymore',
  'The undercity beneath a floating market',
  'A boarding school built into a cliff',
  'The last library on the continent',
  'A rain-drowned fishing village',
  'An orbital garden gone feral',
  'A desert town with one working well',
  'The tunnels under a frozen lake',
  'A hotel where the halls rearrange',
  'A mountain pass in the wrong season',
  'A railway station between two countries that no longer exist',
  'The bottom of a drained reservoir',
];

const CONFLICTS = [
  'A cartographer must chart a coast that keeps rearranging itself',
  'Two siblings inherit a debt neither of them incurred',
  'The only person who can fix the machine is the one who broke it',
  'A translator realizes the treaty says the opposite of what everyone believes',
  'A child discovers that the founding story of their town is a cover-up',
  'The rescue party has enough supplies for everyone but themselves',
  'A thief must return something before anyone notices it was taken',
  'The lighthouse keeper sees a ship that sank forty years ago',
  'A soldier is ordered to guard a door they must never open',
  'Someone must choose between the truth and the person who told the lie',
  'The harvest fails and the granary is guarded by a friend',
  'An apprentice outgrows a mentor who cannot admit it',
  'The map is accurate but the territory has moved',
  'A promise made in one language cannot be kept in another',
  'The cure works, but only once, and there are two patients',
];

const THEMES = [
  'Courage in the face of fear',
  'The cost of being believed',
  'Home is a decision, not a place',
  'What we owe the people who came before us',
  'Growing up means letting the map be wrong',
  'Mercy is harder than justice',
  'The quiet bravery of staying',
  'Curiosity outlives certainty',
  'Belonging cannot be inherited, only built',
  'Forgiveness is not the same as forgetting',
  'Small kindnesses outlast large gestures',
  'The story you tell yourself becomes the truth',
  'Strength is knowing when to ask for help',
  'What is lost can teach what is left',
  'Wonder survives disappointment',
];

const AUDIENCES = [
  '11-year-old boy',
  '11-year-old girl',
  'Curious 8-year-old',
  'Teenagers who think they are too old for stories',
  'Young adult readers',
  'Adults who read at bedtime',
  'A family reading aloud together',
  'Reluctant readers aged 9-12',
  'Grown-ups who miss being read to',
  'Anyone waiting for a delayed train',
];

const TROPES = [
  'Enemies to lovers',
  'Time loop',
  'The chosen one who refuses',
  'Found family',
  'Unreliable narrator',
  'The mentor with a secret',
  'Reluctant hero',
  'The heist that goes right',
  'Locked room mystery',
  'Portal to another world',
  'The prophecy read wrong',
  'Rivals forced to cooperate',
  'The last of their kind',
  'A letter arriving decades late',
  'The map with one blank corner',
];

const STYLES = [
  'Terse, like Hemingway',
  'Lush and Gothic, like the Brontes',
  'Wry and conversational',
  'Shakespearean grandeur',
  'Deadpan and understated',
  'Lyrical, close to poetry',
  'Plainspoken and warm, like a bedtime story',
  'Breathless and headlong',
  'A wry Victorian narrator who addresses the reader',
  'Clipped noir',
  'Folkloric, like a tale told around a fire',
  'Precise and clinical',
];

const NAMES = [
  'Wren',
  'Tobias',
  'Ines',
  'Cal',
  'Marisol',
  'Ozzie',
  'Nadia',
  'Felix',
  'Junie',
  'Ravi',
  'Sparrow',
  'Auden',
  'Clementine',
  'Bo',
  'Yusuf',
  'Odile',
  'Hugo',
  'Neve',
];

const AGES = ['8', '11', '13', '16', '24', '31', '40', '52', '67', 'Ageless'];

const SEXES = ['Female', 'Male', 'Non-binary', 'Unspecified'];

const RELATIONSHIPS = [
  'Protagonist',
  'Older sister to the protagonist',
  'Younger brother to the protagonist',
  'Sworn enemy',
  'Reluctant mentor',
  'Best friend since childhood',
  'Estranged parent',
  'Rival turned ally',
  'The one who left and came back',
  'Neighbour who knows too much',
  'Travelling companion',
  'The person they are trying to save',
];

/** Simple string pools, keyed by the field they feed. */
export const STRING_POOLS: Partial<Record<FieldId, readonly string[]>> = {
  settingTime: TIMES,
  settingPlace: PLACES,
  conflict: CONFLICTS,
  theme: THEMES,
  audience: AUDIENCES,
  style: STYLES,
  genre: GENRE_PRESETS,
  perspective: PERSPECTIVES,
  pacing: PACING_OPTIONS,
  formatting: FORMATTING_OPTIONS,
  length: LENGTH_OPTIONS.map((o) => o.id),
};

let characterSeq = 0;

export function newCharacterId(): string {
  characterSeq += 1;
  return `char-${Date.now().toString(36)}-${characterSeq}`;
}

export function randomCharacter(rand: () => number = Math.random): Character {
  return {
    id: newCharacterId(),
    name: nextSuggestion(NAMES, undefined, rand),
    age: nextSuggestion(AGES, undefined, rand),
    sex: nextSuggestion(SEXES, undefined, rand),
    relationships: nextSuggestion(RELATIONSHIPS, undefined, rand),
  };
}

/**
 * Produce the next Auto-Generate value for any field. `current` is excluded so
 * repeated clicks always visibly change something.
 */
export function suggestFor(
  id: FieldId,
  current?: unknown,
  rand: () => number = Math.random,
): unknown {
  switch (id) {
    case 'plots': {
      // One primary arc, and sometimes a subplot alongside it.
      const primary = nextSuggestion(BASIC_PLOTS, undefined, rand);
      if (rand() < 0.35) {
        return [primary, nextSuggestion(BASIC_PLOTS, primary, rand)];
      }
      return [primary];
    }
    case 'isFact':
      return rand() >= 0.75;
    case 'characters': {
      const count = 1 + Math.floor(rand() * 3);
      return Array.from({ length: count }, () => randomCharacter(rand));
    }
    case 'tone': {
      const currentTone = current as Tone | undefined;
      const flavor = nextSuggestion(TONE_FLAVORS, currentTone?.flavor, rand);
      const intensity = 1 + Math.min(9, Math.floor(rand() * 10));
      return { flavor, intensity } satisfies Tone;
    }
    case 'tropes': {
      const first = nextSuggestion(TROPES, undefined, rand);
      if (rand() < 0.4) return [first, nextSuggestion(TROPES, first, rand)];
      return [first];
    }
    default: {
      const pool = STRING_POOLS[id];
      if (!pool) throw new Error(`suggestFor: no suggestion pool for field "${id}"`);
      return nextSuggestion(pool, typeof current === 'string' ? current : undefined, rand);
    }
  }
}
