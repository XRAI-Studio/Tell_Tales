'use client';

import { useStory } from '@/lib/state/story-context';
import { FIELD_BY_ID, TONE_FLAVORS } from '@/lib/story/fields';

import type { Character, FieldId, Tone } from '@/lib/story/schema';
import { FieldShell } from './controls';
import {
  CharactersKnob,
  ComboboxKnob,
  FactFictionKnob,
  LengthKnob,
  MultiSelectKnob,
  SelectKnob,
  TagsKnob,
  TextKnob,
  ToneKnob,
} from './inputs';

const DEFAULT_TONE: Tone = { flavor: 'Whimsical', intensity: 5 };

/**
 * Binds one registry entry to its input. Every field routes its Auto-Generate
 * through the same reducer action, so the roll behaves identically whether it
 * is clicked on the console or inside the missing-fields prompt.
 */
export function Knob({ id, highlight }: { id: FieldId; highlight?: boolean }) {
  const { config, dispatch } = useStory();
  const field = FIELD_BY_ID[id];
  const state = config[id];
  const domId = `knob-${id}`;

  const set = (value: unknown) => dispatch({ type: 'SET_FIELD', id, value });
  const read = <T,>(fallback: T): T => (state.status === 'set' ? (state.value as T) : fallback);

  // Only genuine form controls get a `for` target. Pointing a label at a group
  // of buttons would override each button's own accessible name.
  const labelTarget = field.kind === 'text' || field.kind === 'combobox' ? domId : undefined;

  const shell = (children: React.ReactNode) => (
    <FieldShell
      label={field.label}
      help={field.help}
      htmlFor={labelTarget}
      optional={!field.required}
      skipped={state.status === 'skipped'}
      onSkip={() => dispatch({ type: 'SKIP_FIELD', id })}
      onUnskip={() => dispatch({ type: 'CLEAR_FIELD', id })}
      onAutoGenerate={() => dispatch({ type: 'AUTO_GENERATE', id })}
      highlight={highlight}
    >
      {children}
    </FieldShell>
  );

  switch (field.kind) {
    case 'text':
      return shell(
        <TextKnob
          id={domId}
          label={field.label}
          value={read('')}
          placeholder={field.placeholder}
          onChange={set}
        />,
      );

    case 'tags':
      return shell(
        <TagsKnob
          label={field.label}
          value={read<string[]>([])}
          placeholder={field.placeholder}
          onChange={set}
        />,
      );

    case 'combobox':
      return shell(
        <ComboboxKnob
          id={domId}
          label={field.label}
          value={read('')}
          options={field.options ?? []}
          placeholder={field.placeholder}
          onChange={set}
        />,
      );

    case 'multiselect':
      return shell(
        <MultiSelectKnob value={read<string[]>([])} options={field.options ?? []} onChange={set} />,
      );

    case 'toggle':
      return shell(
        <FactFictionKnob
          value={state.status === 'set' ? (state.value as boolean) : undefined}
          onChange={set}
        />,
      );

    case 'tone':
      return shell(
        <ToneKnob value={read<Tone>(DEFAULT_TONE)} flavors={TONE_FLAVORS} onChange={set} />,
      );

    case 'characters':
      return shell(
        <CharactersKnob
          value={read<Character[]>([])}
          onAdd={() => dispatch({ type: 'ADD_CHARACTER' })}
          onUpdate={(charId, patch) => dispatch({ type: 'UPDATE_CHARACTER', id: charId, patch })}
          onRemove={(charId) => dispatch({ type: 'REMOVE_CHARACTER', id: charId })}
        />,
      );

    case 'select':
      if (id === 'length') {
        return shell(<LengthKnob value={read('')} onChange={set} />);
      }
      return shell(
        <SelectKnob value={read('')} options={field.options ?? []} onChange={set} />,
      );

    default:
      return null;
  }
}
