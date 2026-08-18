import { describe, expect, it } from 'vitest';
import { MASTER_STORYTELLER_PROMPT, buildRevisionPrompt } from './prompt';
import { nextSuggestion } from './cycler';
import { LENGTH_OPTIONS, lengthById, maxOutputTokensFor } from './length';
import { compilePayload, temperatureFor, FACT_TEMPERATURE, FICTION_TEMPERATURE } from './payload';
import { missingMandatory, isReadyToGenerate, gentlePromptFor } from './validate';
import { storyPayloadSchema, setValue, SKIPPED, UNVISITED, type StoryConfig } from './schema';
import { suggestFor } from './suggestions';
import { FIELDS, MANDATORY_FIELDS, OPTIONAL_FIELDS } from './fields';
import { initialConfig } from '@/lib/state/story-reducer';

describe('MASTER_STORYTELLER_PROMPT', () => {
  // This prompt was supplied verbatim by the product owner. These assertions
  // exist to catch an accidental paraphrase during a future refactor.
  it('keeps every required directive section', () => {
    for (const heading of [
      '# Role',
      '# Core Directives',
      '## 1. The Fact/Fiction Temperature Protocol',
      '## 2. Tonal Flavor and Intensity',
      '## 3. Structural Integration',
      '## 4. Optional Garnishes',
      '## 5. Audience Alignment',
      '# Output Constraints',
    ]) {
      expect(MASTER_STORYTELLER_PROMPT).toContain(heading);
    }
  });

  it('preserves the literal backticked payload keys', () => {
    for (const key of ['`isFact`', '`tone`', '`genre`', '`plot`', '`conflict`', '`theme`']) {
      expect(MASTER_STORYTELLER_PROMPT).toContain(key);
    }
  });

  it('keeps the intensity bands and the output constraints intact', () => {
    expect(MASTER_STORYTELLER_PROMPT).toContain('An intensity of 1-3');
    expect(MASTER_STORYTELLER_PROMPT).toContain('An intensity of 4-7');
    expect(MASTER_STORYTELLER_PROMPT).toContain('An intensity of 8-10');
    expect(MASTER_STORYTELLER_PROMPT).toContain('Output ONLY the generated story');
    expect(MASTER_STORYTELLER_PROMPT).toContain('11-year-old boy');
  });
});

describe('nextSuggestion', () => {
  it('never returns the current value twice in a row', () => {
    const pool = ['a', 'b', 'c', 'd'];
    let current = 'a';
    for (let i = 0; i < 200; i += 1) {
      const next = nextSuggestion(pool, current);
      expect(next).not.toBe(current);
      current = next;
    }
  });

  it('returns the only entry of a single-item pool without looping', () => {
    expect(nextSuggestion(['solo'], 'solo')).toBe('solo');
  });

  it('throws on an empty pool rather than returning undefined', () => {
    expect(() => nextSuggestion([])).toThrow(/empty/);
  });

  it('handles object values by structural identity', () => {
    const pool = [{ flavor: 'Dark' }, { flavor: 'Humor' }];
    expect(nextSuggestion(pool, { flavor: 'Dark' })).toEqual({ flavor: 'Humor' });
  });

  it('stays in range at the top of the random distribution', () => {
    const pool = ['a', 'b', 'c'];
    expect(pool).toContain(nextSuggestion(pool, undefined, () => 0.999999));
  });
});

describe('length', () => {
  it('maps every option id back to itself', () => {
    for (const o of LENGTH_OPTIONS) expect(lengthById(o.id)).toEqual(o);
  });

  it('falls back to Short Story for an unknown id', () => {
    expect(lengthById('nonsense').label).toBe('Short Story');
  });

  it('allots more tokens than words, with headroom', () => {
    expect(maxOutputTokensFor(1500)).toBe(Math.ceil(1500 * 1.6) + 512);
    expect(maxOutputTokensFor(500)).toBeGreaterThan(500);
  });
});

describe('temperatureFor', () => {
  it('clamps creativity in fact mode and opens it up for fiction', () => {
    expect(temperatureFor(true)).toBe(FACT_TEMPERATURE);
    expect(temperatureFor(false)).toBe(FICTION_TEMPERATURE);
    expect(FACT_TEMPERATURE).toBeLessThan(FICTION_TEMPERATURE);
  });
});

/** A config with every mandatory field satisfied. */
function completeConfig(): StoryConfig {
  return {
    ...initialConfig(),
    plots: setValue(['The Quest']),
    settingTime: setValue('1920s'),
    settingPlace: setValue('A quiet cabin'),
    isFact: setValue(false),
    characters: setValue([
      { id: 'c1', name: 'Wren', age: '11', sex: 'Female', relationships: 'Protagonist' },
    ]),
    conflict: setValue('The map is wrong'),
    theme: setValue('Courage in the face of fear'),
    tone: setValue({ flavor: 'Humor', intensity: 7 }),
    perspective: setValue('First person'),
    audience: setValue('11-year-old boy'),
    pacing: setValue('Balanced'),
    length: setValue('short'),
    genre: setValue('Adventure'),
  };
}

describe('missingMandatory', () => {
  it('reports every mandatory field on a fresh config except the prefilled audience', () => {
    const missing = missingMandatory(initialConfig());
    expect(missing).not.toContain('audience');
    expect(missing).toHaveLength(MANDATORY_FIELDS.length - 1);
  });

  it('is empty for a complete config', () => {
    expect(missingMandatory(completeConfig())).toEqual([]);
    expect(isReadyToGenerate(completeConfig())).toBe(true);
  });

  it('treats a whitespace-only string as missing, not as a value', () => {
    const config = { ...completeConfig(), conflict: setValue('   ') };
    expect(missingMandatory(config)).toContain('conflict');
  });

  it('treats an empty character list as missing', () => {
    const config = { ...completeConfig(), characters: setValue([]) };
    expect(missingMandatory(config)).toContain('characters');
  });

  it('ignores optional fields entirely', () => {
    const config = { ...completeConfig(), style: UNVISITED, tropes: UNVISITED };
    expect(missingMandatory(config)).toEqual([]);
  });

  it('accepts isFact=false as a real answer rather than an absence', () => {
    const config = { ...completeConfig(), isFact: setValue(false) };
    expect(missingMandatory(config)).not.toContain('isFact');
  });
});

describe('gentlePromptFor', () => {
  it('never phrases the prompt as an error', () => {
    for (const f of MANDATORY_FIELDS) {
      const copy = gentlePromptFor(f.id);
      expect(copy).not.toMatch(/error|invalid|required|must|failed/i);
      expect(copy.length).toBeGreaterThan(10);
    }
  });
});

describe('compilePayload', () => {
  it('produces a payload that satisfies the wire schema', () => {
    const payload = compilePayload(completeConfig());
    expect(() => storyPayloadSchema.parse(payload)).not.toThrow();
  });

  it('maps state onto the prompt vocabulary', () => {
    const payload = compilePayload(completeConfig());
    expect(payload.plot).toEqual(['The Quest']);
    expect(payload.setting).toEqual({ time: '1920s', place: 'A quiet cabin' });
    expect(payload.isFact).toBe(false);
    expect(payload.tone).toEqual({ flavor: 'Humor', intensity: 7 });
    expect(payload.length).toEqual({ label: 'Short Story', targetWords: 1500 });
    expect(payload.characters[0]).toEqual({
      name: 'Wren',
      age: '11',
      sex: 'Female',
      relationships: 'Protagonist',
    });
    // The internal row id is a UI concern and must not leak to the model.
    expect(payload.characters[0]).not.toHaveProperty('id');
  });

  it('sends null for a skipped optional field', () => {
    const payload = compilePayload({ ...completeConfig(), style: SKIPPED });
    expect('style' in payload).toBe(true);
    expect(payload.style).toBeNull();
  });

  it('omits an unvisited optional field entirely', () => {
    const payload = compilePayload({ ...completeConfig(), style: UNVISITED });
    expect('style' in payload).toBe(false);
  });

  it('keeps skipped and unvisited distinguishable on the wire', () => {
    const skipped = compilePayload({ ...completeConfig(), formatting: SKIPPED });
    const unvisited = compilePayload({ ...completeConfig(), formatting: UNVISITED });
    expect(JSON.stringify(skipped)).not.toEqual(JSON.stringify(unvisited));
  });

  it('passes through optional values that are present', () => {
    const payload = compilePayload({
      ...completeConfig(),
      tropes: setValue(['Time loop']),
      style: setValue('Terse, like Hemingway'),
      formatting: setValue('Screenplay'),
    });
    expect(payload.tropes).toEqual(['Time loop']);
    expect(payload.style).toBe('Terse, like Hemingway');
    expect(payload.formatting).toBe('Screenplay');
  });

  it('trims incidental whitespace from open inputs', () => {
    const payload = compilePayload({ ...completeConfig(), conflict: setValue('  tension  ') });
    expect(payload.conflict).toBe('tension');
  });
});

describe('buildRevisionPrompt', () => {
  it('embeds the draft and enumerates each issue', () => {
    const prompt = buildRevisionPrompt('Draft body', ['Wrong year', 'Anachronistic radio']);
    expect(prompt).toContain('Draft body');
    expect(prompt).toContain('1. Wrong year');
    expect(prompt).toContain('2. Anachronistic radio');
    expect(prompt).toContain('Output ONLY the corrected story');
  });
});

describe('suggestFor', () => {
  it('produces a usable value for every field in the registry', () => {
    for (const field of FIELDS) {
      const value = suggestFor(field.id);
      expect(value, `field ${field.id} produced nothing`).toBeDefined();
      if (typeof value === 'string') expect(value.trim().length).toBeGreaterThan(0);
      if (Array.isArray(value)) expect(value.length).toBeGreaterThan(0);
    }
  });

  it('auto-generates a config that passes validation end to end', () => {
    let config = initialConfig();
    for (const field of MANDATORY_FIELDS) {
      config = { ...config, [field.id]: setValue(suggestFor(field.id)) } as StoryConfig;
    }
    expect(missingMandatory(config)).toEqual([]);
    expect(() => storyPayloadSchema.parse(compilePayload(config))).not.toThrow();
  });

  it('keeps tone intensity inside the 1-10 band the prompt describes', () => {
    for (let i = 0; i < 100; i += 1) {
      const tone = suggestFor('tone') as { flavor: string; intensity: number };
      expect(tone.intensity).toBeGreaterThanOrEqual(1);
      expect(tone.intensity).toBeLessThanOrEqual(10);
    }
  });

  it('covers every optional field too', () => {
    for (const field of OPTIONAL_FIELDS) {
      expect(suggestFor(field.id)).toBeDefined();
    }
  });
});
