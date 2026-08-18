import { beforeEach, describe, expect, it } from 'vitest';
import {
  clearHistory,
  getHistorySnapshot,
  removeStory,
  saveStory,
  subscribeHistory,
  titleFor,
} from './story-history';
import { initialConfig, storyReducer } from './story-reducer';
import { compilePayload } from '@/lib/story/payload';
import { setValue, type StoryConfig } from '@/lib/story/schema';

function config(genre = 'Western'): StoryConfig {
  return {
    ...initialConfig(),
    plots: setValue(['The Quest']),
    settingTime: setValue('1920s'),
    settingPlace: setValue('A cabin'),
    isFact: setValue(false),
    characters: setValue([{ id: 'c1', name: 'Wren', age: '11', sex: 'Female', relationships: 'Lead' }]),
    conflict: setValue('The map is wrong'),
    theme: setValue('Courage'),
    tone: setValue({ flavor: 'Humor', intensity: 5 }),
    perspective: setValue('First person'),
    audience: setValue('11-year-old boy'),
    pacing: setValue('Balanced'),
    length: setValue('short'),
    genre: setValue(genre),
  };
}

const record = (genre = 'Western', text = 'Once upon a time.') => {
  const c = config(genre);
  return { config: c, payload: compilePayload(c), text };
};

describe('story history', () => {
  beforeEach(() => {
    window.localStorage.clear();
    clearHistory();
  });

  it('starts empty', () => {
    expect(getHistorySnapshot()).toEqual([]);
  });

  it('stores a finished story, newest first', () => {
    saveStory(record('Western'));
    saveStory(record('Horror'));
    expect(getHistorySnapshot().map((r) => r.title)).toEqual(['Horror · The Quest', 'Western · The Quest']);
  });

  it('returns a stable reference between writes, as useSyncExternalStore requires', () => {
    saveStory(record());
    expect(getHistorySnapshot()).toBe(getHistorySnapshot());
  });

  it('notifies subscribers on every change', () => {
    let calls = 0;
    const unsubscribe = subscribeHistory(() => {
      calls += 1;
    });
    saveStory(record());
    saveStory(record('Horror'));
    unsubscribe();
    saveStory(record('Mystery'));
    expect(calls).toBe(2);
  });

  it('caps the list so storage cannot grow without bound', () => {
    for (let i = 0; i < 20; i += 1) saveStory(record(`Genre${i}`));
    expect(getHistorySnapshot().length).toBeLessThanOrEqual(12);
    expect(getHistorySnapshot()[0].title).toContain('Genre19');
  });

  it('removes one story without disturbing the others', () => {
    saveStory(record('Western'));
    saveStory(record('Horror'));
    removeStory(getHistorySnapshot()[0].id);
    expect(getHistorySnapshot().map((r) => r.title)).toEqual(['Western · The Quest']);
  });

  it('survives a round trip through localStorage', () => {
    saveStory(record('Western', 'The whole story text.'));
    const raw = window.localStorage.getItem('tell-tales:stories:v1');
    expect(raw).toBeTruthy();
    const parsed = JSON.parse(raw as string);
    expect(parsed[0].text).toBe('The whole story text.');
    expect(parsed[0].config.genre).toEqual({ status: 'set', value: 'Western' });
  });

  it('keeps the config so the console can be restored from a past story', () => {
    saveStory(record('Western'));
    const saved = getHistorySnapshot()[0];
    const restored = storyReducer(initialConfig(), { type: 'HYDRATE', config: saved.config });
    expect(restored.genre).toEqual({ status: 'set', value: 'Western' });
    expect(restored.conflict).toEqual({ status: 'set', value: 'The map is wrong' });
  });
});

describe('titleFor', () => {
  it('names a story by its genre and primary plot', () => {
    expect(titleFor(compilePayload(config('Horror')))).toBe('Horror · The Quest');
  });

  it('falls back rather than rendering an empty label', () => {
    const bare = { ...compilePayload(config()), genre: '', plot: [] };
    expect(titleFor(bare)).toBe('Untitled story');
  });
});
