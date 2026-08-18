import { describe, expect, it } from 'vitest';
import { initialConfig, storyReducer } from './story-reducer';
import { setValue } from '@/lib/story/schema';

describe('initialConfig', () => {
  it('starts every field unvisited except the prefilled audience default', () => {
    const config = initialConfig();
    expect(config.audience).toEqual(setValue('11-year-old boy'));
    expect(config.plots.status).toBe('unvisited');
    expect(config.isFact.status).toBe('unvisited');
    expect(config.style.status).toBe('unvisited');
  });
});

describe('storyReducer', () => {
  it('SET_FIELD stores a value', () => {
    const next = storyReducer(initialConfig(), { type: 'SET_FIELD', id: 'genre', value: 'Western' });
    expect(next.genre).toEqual({ status: 'set', value: 'Western' });
  });

  it('CLEAR_FIELD returns a field to unvisited, not to an empty value', () => {
    const set = storyReducer(initialConfig(), { type: 'SET_FIELD', id: 'genre', value: 'Western' });
    const cleared = storyReducer(set, { type: 'CLEAR_FIELD', id: 'genre' });
    expect(cleared.genre.status).toBe('unvisited');
  });

  it('SKIP_FIELD marks an optional field as a deliberate decline', () => {
    const next = storyReducer(initialConfig(), { type: 'SKIP_FIELD', id: 'style' });
    expect(next.style.status).toBe('skipped');
  });

  it('SKIP_FIELD refuses to skip a mandatory field', () => {
    const next = storyReducer(initialConfig(), { type: 'SKIP_FIELD', id: 'genre' });
    expect(next.genre.status).toBe('unvisited');
  });

  it('AUTO_GENERATE fills an empty field', () => {
    const next = storyReducer(initialConfig(), { type: 'AUTO_GENERATE', id: 'conflict' });
    expect(next.conflict.status).toBe('set');
  });

  it('AUTO_GENERATE replaces the previous suggestion on every click', () => {
    let config = initialConfig();
    const seen: string[] = [];
    for (let i = 0; i < 25; i += 1) {
      config = storyReducer(config, { type: 'AUTO_GENERATE', id: 'theme' });
      const value = config.theme.status === 'set' ? (config.theme.value as string) : '';
      expect(value).not.toBe(seen[seen.length - 1]);
      seen.push(value);
    }
    // The slot machine should visibly vary, not alternate between two entries.
    expect(new Set(seen).size).toBeGreaterThan(2);
  });

  it('ADD_CHARACTER seeds an editable blank row', () => {
    const next = storyReducer(initialConfig(), { type: 'ADD_CHARACTER' });
    expect(next.characters.status).toBe('set');
    const rows = next.characters.status === 'set' ? next.characters.value : [];
    expect(rows).toHaveLength(1);
    expect(rows[0].name).toBe('');
    expect(rows[0].id).toBeTruthy();
  });

  it('UPDATE_CHARACTER patches only the targeted row', () => {
    let config = storyReducer(initialConfig(), { type: 'ADD_CHARACTER' });
    config = storyReducer(config, { type: 'ADD_CHARACTER' });
    const rows = config.characters.status === 'set' ? config.characters.value : [];
    const updated = storyReducer(config, {
      type: 'UPDATE_CHARACTER',
      id: rows[0].id,
      patch: { name: 'Wren' },
    });
    const after = updated.characters.status === 'set' ? updated.characters.value : [];
    expect(after[0].name).toBe('Wren');
    expect(after[1].name).toBe('');
  });

  it('REMOVE_CHARACTER drops one row but keeps the rest', () => {
    let config = storyReducer(initialConfig(), { type: 'ADD_CHARACTER' });
    config = storyReducer(config, { type: 'ADD_CHARACTER' });
    const rows = config.characters.status === 'set' ? config.characters.value : [];
    const next = storyReducer(config, { type: 'REMOVE_CHARACTER', id: rows[0].id });
    const after = next.characters.status === 'set' ? next.characters.value : [];
    expect(after).toHaveLength(1);
    expect(after[0].id).toBe(rows[1].id);
  });

  it('removing the last character reverts the field to unvisited so validation prompts again', () => {
    const config = storyReducer(initialConfig(), { type: 'ADD_CHARACTER' });
    const rows = config.characters.status === 'set' ? config.characters.value : [];
    const next = storyReducer(config, { type: 'REMOVE_CHARACTER', id: rows[0].id });
    expect(next.characters.status).toBe('unvisited');
  });

  it('RESET returns to the initial state', () => {
    const dirty = storyReducer(initialConfig(), { type: 'SET_FIELD', id: 'genre', value: 'Noir' });
    expect(storyReducer(dirty, { type: 'RESET' })).toEqual(initialConfig());
  });

  it('does not mutate the config it was given', () => {
    const config = initialConfig();
    const snapshot = JSON.stringify(config);
    storyReducer(config, { type: 'SET_FIELD', id: 'genre', value: 'Western' });
    expect(JSON.stringify(config)).toBe(snapshot);
  });
});
