'use client';

import { useId, useState } from 'react';
import { Plus, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { VoiceButton } from './controls';
import type { Character, Tone } from '@/lib/story/schema';
import { LENGTH_OPTIONS } from '@/lib/story/length';

/* ------------------------------------------------------------------ text */

export function TextKnob({
  id,
  value,
  onChange,
  placeholder,
  label,
}: {
  id?: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  label: string;
}) {
  return (
    <div className="well flex items-center gap-2 rounded-sm px-3 py-2">
      <input
        id={id}
        type="text"
        className="field-input"
        value={value}
        placeholder={placeholder}
        onChange={(e) => onChange(e.target.value)}
      />
      <VoiceButton label={label} onTranscript={(t) => onChange(value ? `${value} ${t}` : t)} />
    </div>
  );
}

/* ------------------------------------------------------------------ tags */

export function TagsKnob({
  value,
  onChange,
  placeholder,
  label,
}: {
  value: string[];
  onChange: (v: string[]) => void;
  placeholder?: string;
  label: string;
}) {
  const [draft, setDraft] = useState('');

  const commit = (text: string) => {
    const next = text.trim();
    if (!next || value.includes(next)) return;
    onChange([...value, next]);
    setDraft('');
  };

  return (
    <div className="well rounded-sm px-3 py-2">
      {value.length > 0 ? (
        <ul className="mb-2 flex flex-wrap gap-1.5">
          {value.map((tag) => (
            <li
              key={tag}
              className="inline-flex items-center gap-1 rounded-full border border-edge bg-panel-700 py-0.5 pl-2.5 pr-1 text-xs text-legend"
            >
              {tag}
              <button
                type="button"
                onClick={() => onChange(value.filter((t) => t !== tag))}
                aria-label={`Remove ${tag}`}
                className="rounded-full p-0.5 text-legend-faint hover:text-lamp-red"
              >
                <X className="h-3 w-3" />
              </button>
            </li>
          ))}
        </ul>
      ) : null}
      <div className="flex items-center gap-2">
        <input
          type="text"
          className="field-input"
          value={draft}
          placeholder={value.length ? 'Add another…' : placeholder}
          onChange={(e) => setDraft(e.target.value)}
          onBlur={() => commit(draft)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ',') {
              e.preventDefault();
              commit(draft);
            }
          }}
        />
        <VoiceButton label={label} onTranscript={commit} />
      </div>
    </div>
  );
}

/* ---------------------------------------------------------------- select */

/** Rule of 10: few options become a segmented strip, more become a list. */
export function SelectKnob({
  value,
  options,
  onChange,
  labelFor,
}: {
  value: string;
  options: readonly string[];
  onChange: (v: string) => void;
  labelFor?: (v: string) => string;
}) {
  const display = labelFor ?? ((v: string) => v);
  const segmented = options.length <= 3;

  if (segmented) {
    return (
      <div className="well grid gap-1 rounded-sm p-1" style={{ gridTemplateColumns: `repeat(${options.length}, minmax(0, 1fr))` }}>
        {options.map((opt) => (
          <button
            key={opt}
            type="button"
            onClick={() => onChange(opt)}
            aria-pressed={value === opt}
            className={cn(
              'rounded-sm px-2 py-1.5 text-center text-xs transition',
              value === opt
                ? 'bg-lamp-amber text-panel-900 font-semibold'
                : 'text-legend-dim hover:bg-panel-700 hover:text-legend',
            )}
          >
            {display(opt)}
          </button>
        ))}
      </div>
    );
  }

  return (
    <div className="well flex flex-wrap gap-1 rounded-sm p-1.5">
      {options.map((opt) => (
        <button
          key={opt}
          type="button"
          onClick={() => onChange(opt)}
          aria-pressed={value === opt}
          className={cn(
            'rounded-full border px-2.5 py-1 text-xs transition',
            value === opt
              ? 'border-lamp-amber bg-lamp-amber text-panel-900 font-semibold'
              : 'border-edge text-legend-dim hover:border-edge-bright hover:text-legend',
          )}
        >
          {display(opt)}
        </button>
      ))}
    </div>
  );
}

export function LengthKnob({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  return (
    <div className="well flex flex-wrap gap-1 rounded-sm p-1.5">
      {LENGTH_OPTIONS.map((opt) => (
        <button
          key={opt.id}
          type="button"
          onClick={() => onChange(opt.id)}
          aria-pressed={value === opt.id}
          className={cn(
            'flex-1 rounded-sm border px-2 py-1.5 text-center transition',
            value === opt.id
              ? 'border-lamp-amber bg-lamp-amber text-panel-900'
              : 'border-edge text-legend-dim hover:border-edge-bright hover:text-legend',
          )}
        >
          <span className="block text-xs font-semibold">{opt.label}</span>
          <span
            className={cn(
              'block font-data text-[0.65rem]',
              value === opt.id ? 'text-panel-900/70' : 'text-legend-faint',
            )}
          >
            ~{opt.targetWords}w
          </span>
        </button>
      ))}
    </div>
  );
}

/* ----------------------------------------------------------- multiselect */

/** Spec: the first pick is the primary arc, the rest become subplots. */
export function MultiSelectKnob({
  value,
  options,
  onChange,
}: {
  value: string[];
  options: readonly string[];
  onChange: (v: string[]) => void;
}) {
  const toggle = (opt: string) =>
    onChange(value.includes(opt) ? value.filter((v) => v !== opt) : [...value, opt]);

  return (
    <div className="well flex flex-wrap gap-1 rounded-sm p-1.5">
      {options.map((opt) => {
        const index = value.indexOf(opt);
        const selected = index >= 0;
        return (
          <button
            key={opt}
            type="button"
            onClick={() => toggle(opt)}
            aria-pressed={selected}
            className={cn(
              'inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs transition',
              selected
                ? 'border-lamp-amber bg-lamp-amber/15 text-lamp-amber'
                : 'border-edge text-legend-dim hover:border-edge-bright hover:text-legend',
            )}
          >
            {selected ? (
              <span className="font-data text-[0.6rem] font-bold">
                {index === 0 ? 'MAIN' : `SUB${index}`}
              </span>
            ) : null}
            {opt}
          </button>
        );
      })}
    </div>
  );
}

/* ---------------------------------------------------------------- toggle */

export function FactFictionKnob({
  value,
  onChange,
}: {
  value: boolean | undefined;
  onChange: (v: boolean) => void;
}) {
  const options: { key: 'fiction' | 'fact'; label: string; note: string; on: boolean }[] = [
    { key: 'fiction', label: 'Fiction', note: 'Invent freely', on: false },
    { key: 'fact', label: 'Fact', note: 'Checked for accuracy', on: true },
  ];

  return (
    <div className="well grid grid-cols-2 gap-1 rounded-sm p-1">
      {options.map((opt) => {
        const selected = value === opt.on;
        return (
          <button
            key={opt.key}
            type="button"
            onClick={() => onChange(opt.on)}
            aria-pressed={selected}
            className={cn(
              'rounded-sm px-2 py-1.5 text-center transition',
              selected
                ? opt.on
                  ? 'bg-lamp-green text-panel-900'
                  : 'bg-lamp-amber text-panel-900'
                : 'text-legend-dim hover:bg-panel-700 hover:text-legend',
            )}
          >
            <span className="block text-sm font-semibold">{opt.label}</span>
            <span className={cn('block text-[0.65rem]', selected ? 'text-panel-900/70' : 'text-legend-faint')}>
              {opt.note}
            </span>
          </button>
        );
      })}
    </div>
  );
}

/* -------------------------------------------------------------- combobox */

/** Presets for speed, free text for everything else. */
export function ComboboxKnob({
  id,
  value,
  options,
  onChange,
  placeholder,
  label,
}: {
  id?: string;
  value: string;
  options: readonly string[];
  onChange: (v: string) => void;
  placeholder?: string;
  label: string;
}) {
  return (
    <div className="space-y-1.5">
      <div className="well flex items-center gap-2 rounded-sm px-3 py-2">
        <input
          id={id}
          type="text"
          className="field-input"
          value={value}
          placeholder={placeholder}
          onChange={(e) => onChange(e.target.value)}
        />
        <VoiceButton label={label} onTranscript={onChange} />
      </div>
      <div className="flex flex-wrap gap-1">
        {options.map((opt) => (
          <button
            key={opt}
            type="button"
            onClick={() => onChange(opt)}
            className={cn(
              'rounded-full border px-2 py-0.5 text-[0.7rem] transition',
              value === opt
                ? 'border-lamp-amber text-lamp-amber'
                : 'border-edge text-legend-faint hover:border-edge-bright hover:text-legend-dim',
            )}
          >
            {opt}
          </button>
        ))}
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ tone */

const BAND_COPY: Record<'subtle' | 'driving' | 'absolute', string> = {
  subtle: 'A subtle undercurrent',
  driving: 'Drives the emotional experience',
  absolute: 'Absolute and overwhelming',
};

export function bandFor(intensity: number): 'subtle' | 'driving' | 'absolute' {
  if (intensity <= 3) return 'subtle';
  if (intensity <= 7) return 'driving';
  return 'absolute';
}

/**
 * The intensity meter. The three colour bands are not decorative — they are the
 * exact 1-3 / 4-7 / 8-10 thresholds the Master Storyteller prompt acts on, so
 * the control shows what the model will actually do with the number.
 */
export function ToneKnob({
  value,
  flavors,
  onChange,
}: {
  value: Tone;
  flavors: readonly string[];
  onChange: (v: Tone) => void;
}) {
  const sliderId = useId();
  const band = bandFor(value.intensity);
  const bandColor =
    band === 'subtle'
      ? 'var(--color-lamp-green)'
      : band === 'driving'
        ? 'var(--color-lamp-amber)'
        : 'var(--color-lamp-red)';

  return (
    <div className="space-y-2">
      <SelectKnob value={value.flavor} options={flavors} onChange={(flavor) => onChange({ ...value, flavor })} />

      <div className="well rounded-sm px-3 py-2.5">
        <div className="mb-2 flex items-baseline justify-between">
          <label htmlFor={sliderId} className="legend">
            Intensity
          </label>
          <span className="font-data text-sm" style={{ color: bandColor }}>
            {value.intensity} / 10
          </span>
        </div>

        <div className="relative">
          {/* Ten segments, lit up to the current value. */}
          <div aria-hidden className="pointer-events-none flex gap-1">
            {Array.from({ length: 10 }, (_, i) => {
              const step = i + 1;
              const lit = step <= value.intensity;
              const segBand = bandFor(step);
              const color =
                segBand === 'subtle'
                  ? 'var(--color-lamp-green)'
                  : segBand === 'driving'
                    ? 'var(--color-lamp-amber)'
                    : 'var(--color-lamp-red)';
              return (
                <span
                  key={step}
                  className="h-5 flex-1 rounded-[2px] border transition-colors"
                  style={{
                    backgroundColor: lit ? color : 'transparent',
                    borderColor: lit ? color : 'var(--color-edge)',
                    opacity: lit ? 1 : 0.5,
                  }}
                />
              );
            })}
          </div>
          <input
            id={sliderId}
            type="range"
            min={1}
            max={10}
            step={1}
            value={value.intensity}
            onChange={(e) => onChange({ ...value, intensity: Number(e.target.value) })}
            aria-valuetext={`${value.intensity} of 10 — ${BAND_COPY[band]}`}
            className="absolute inset-0 h-5 w-full cursor-pointer appearance-none bg-transparent"
          />
        </div>

        <p className="mt-1.5 text-xs" style={{ color: bandColor }}>
          {BAND_COPY[band]}
        </p>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------ characters */

export function CharactersKnob({
  value,
  onAdd,
  onUpdate,
  onRemove,
}: {
  value: Character[];
  onAdd: () => void;
  onUpdate: (id: string, patch: Partial<Character>) => void;
  onRemove: (id: string) => void;
}) {
  return (
    <div className="space-y-2">
      {value.length === 0 ? (
        <p className="rounded-sm border border-dashed border-edge px-3 py-4 text-center text-sm text-legend-faint">
          No one yet. Add a character, or roll the whole cast.
        </p>
      ) : null}

      {value.map((character, index) => (
        <div key={character.id} className="well rounded-sm p-2.5">
          <div className="mb-2 flex items-center gap-2">
            <span className="font-data text-[0.65rem] text-legend-faint">
              {String(index + 1).padStart(2, '0')}
            </span>
            <input
              type="text"
              className="field-input font-semibold"
              value={character.name}
              placeholder="Name"
              onChange={(e) => onUpdate(character.id, { name: e.target.value })}
            />
            <button
              type="button"
              onClick={() => onRemove(character.id)}
              aria-label={`Remove ${character.name || `character ${index + 1}`}`}
              className="rounded-full p-1 text-legend-faint transition hover:text-lamp-red"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
          <div className="grid gap-1.5 sm:grid-cols-3">
            <input
              type="text"
              className="field-input rounded-sm border border-edge px-2 py-1 text-sm"
              value={character.age}
              placeholder="Age"
              onChange={(e) => onUpdate(character.id, { age: e.target.value })}
              aria-label={`Age of character ${index + 1}`}
            />
            <input
              type="text"
              className="field-input rounded-sm border border-edge px-2 py-1 text-sm"
              value={character.sex}
              placeholder="Sex / gender"
              onChange={(e) => onUpdate(character.id, { sex: e.target.value })}
              aria-label={`Sex or gender of character ${index + 1}`}
            />
            <input
              type="text"
              className="field-input rounded-sm border border-edge px-2 py-1 text-sm"
              value={character.relationships}
              placeholder="Relationship"
              onChange={(e) => onUpdate(character.id, { relationships: e.target.value })}
              aria-label={`Relationships of character ${index + 1}`}
            />
          </div>
        </div>
      ))}

      <button
        type="button"
        onClick={onAdd}
        className="inline-flex items-center gap-1.5 rounded-sm border border-edge px-3 py-1.5 text-xs text-legend-dim transition hover:border-lamp-amber hover:text-lamp-amber"
      >
        <Plus className="h-3.5 w-3.5" />
        Add character
      </button>
    </div>
  );
}
