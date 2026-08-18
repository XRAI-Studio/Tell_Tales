import type { FieldId } from './schema';
import { LENGTH_OPTIONS } from './length';

/**
 * Spec §2, the "Rule of 10": a finite set of 10 or fewer options is rendered
 * as an explicit list; anything open-ended becomes a text field that accepts
 * typing or dictation.
 */
export type InputKind =
  | 'multiselect' // <=10 options, pick many
  | 'select' // <=10 options, pick one
  | 'toggle' // binary
  | 'combobox' // presets + free text (the hybrid case)
  | 'text' // open input + voice
  | 'tags' // open input, multiple values
  | 'tone' // flavor select + 1-10 intensity slider
  | 'characters'; // dynamic list editor

export type FieldDef = {
  id: FieldId;
  label: string;
  kind: InputKind;
  required: boolean;
  group: 'Story' | 'World' | 'Cast' | 'Voice' | 'Garnishes';
  help?: string;
  options?: readonly string[];
  placeholder?: string;
};

export const BASIC_PLOTS = [
  'Overcoming the Monster',
  'Rags to Riches',
  'The Quest',
  'Voyage and Return',
  'Comedy',
  'Tragedy',
  'Rebirth',
] as const;

export const TONE_FLAVORS = [
  'Humor',
  'Dark',
  'Melancholy',
  'Whimsical',
  'Suspenseful',
  'Heroic',
  'Bittersweet',
  'Eerie',
  'Hopeful',
  'Romantic',
] as const;

export const PERSPECTIVES = [
  'First person',
  'Third person limited',
  'Third person omniscient',
] as const;

export const PACING_OPTIONS = ['Fast / Action-heavy', 'Balanced', 'Slow / Descriptive'] as const;

export const FORMATTING_OPTIONS = [
  'Standard Prose',
  'Screenplay',
  'Epistolary / Letters',
  'Journal / Diary Entries',
  'Radio Play',
  'Comic Script',
] as const;

export const GENRE_PRESETS = [
  'High Fantasy',
  'Science Fiction',
  'Mystery',
  'Adventure',
  'Historical',
  'Horror',
  'Comedy',
  'Fairy Tale',
  'Cyberpunk',
  'Western',
  'Superhero',
  'Magical Realism',
] as const;

export const FIELDS: readonly FieldDef[] = [
  {
    id: 'plots',
    label: 'Plot',
    kind: 'multiselect',
    required: true,
    group: 'Story',
    help: 'Pick one for the main arc. Extra picks become subplots.',
    options: BASIC_PLOTS,
  },
  {
    id: 'conflict',
    label: 'Conflict',
    kind: 'text',
    required: true,
    group: 'Story',
    help: 'The central struggle that drives the action.',
    placeholder: 'A cartographer must chart a coast that keeps rearranging itself',
  },
  {
    id: 'theme',
    label: 'Theme',
    kind: 'text',
    required: true,
    group: 'Story',
    help: 'The underlying message or moral.',
    placeholder: 'Courage in the face of fear',
  },
  {
    id: 'genre',
    label: 'Genre',
    kind: 'combobox',
    required: true,
    group: 'World',
    help: 'The rules of the universe. Pick a preset or write your own.',
    options: GENRE_PRESETS,
    placeholder: 'Solarpunk maritime folklore',
  },
  {
    id: 'settingTime',
    label: 'Time',
    kind: 'text',
    required: true,
    group: 'World',
    placeholder: '1920s',
  },
  {
    id: 'settingPlace',
    label: 'Place',
    kind: 'text',
    required: true,
    group: 'World',
    placeholder: 'A sprawling cyberpunk city',
  },
  {
    id: 'isFact',
    label: 'Fact or Fiction',
    kind: 'toggle',
    required: true,
    group: 'World',
    help: 'Fact lowers the temperature and adds a fact-checking pass.',
  },
  {
    id: 'characters',
    label: 'Characters',
    kind: 'characters',
    required: true,
    group: 'Cast',
    help: 'Add as many as the story needs.',
  },
  {
    id: 'tone',
    label: 'Tone',
    kind: 'tone',
    required: true,
    group: 'Voice',
    help: 'Flavor plus how strongly it comes through.',
    options: TONE_FLAVORS,
  },
  {
    id: 'perspective',
    label: 'Perspective',
    kind: 'select',
    required: true,
    group: 'Voice',
    options: PERSPECTIVES,
  },
  {
    id: 'audience',
    label: 'Audience',
    kind: 'text',
    required: true,
    group: 'Voice',
    help: 'Who is this for?',
    placeholder: '11-year-old boy',
  },
  {
    id: 'pacing',
    label: 'Pacing',
    kind: 'select',
    required: true,
    group: 'Voice',
    options: PACING_OPTIONS,
  },
  {
    id: 'length',
    label: 'Length',
    kind: 'select',
    required: true,
    group: 'Voice',
    options: LENGTH_OPTIONS.map((o) => o.id),
  },
  {
    id: 'tropes',
    label: 'Literary Tropes',
    kind: 'tags',
    required: false,
    group: 'Garnishes',
    help: 'Fun narrative devices.',
    placeholder: 'Enemies to lovers',
  },
  {
    id: 'style',
    label: 'Linguistic Style',
    kind: 'text',
    required: false,
    group: 'Garnishes',
    help: 'An authorial voice to borrow.',
    placeholder: 'Terse, like Hemingway',
  },
  {
    id: 'formatting',
    label: 'Format',
    kind: 'select',
    required: false,
    group: 'Garnishes',
    options: FORMATTING_OPTIONS,
  },
] as const;

export const FIELD_BY_ID: Record<FieldId, FieldDef> = Object.fromEntries(
  FIELDS.map((f) => [f.id, f]),
) as Record<FieldId, FieldDef>;

export const MANDATORY_FIELDS = FIELDS.filter((f) => f.required);
export const OPTIONAL_FIELDS = FIELDS.filter((f) => !f.required);

export const FIELD_GROUPS = ['Story', 'World', 'Cast', 'Voice', 'Garnishes'] as const;
