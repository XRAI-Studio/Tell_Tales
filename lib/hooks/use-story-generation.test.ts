import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import { useStoryGeneration } from './use-story-generation';
import { encodeEvent, type StoryEvent } from '@/lib/story/events';
import { getHistorySnapshot, __resetForTests } from '@/lib/state/story-history';
import { initialConfig } from '@/lib/state/story-reducer';
import { setValue, type StoryConfig } from '@/lib/story/schema';

function config(): StoryConfig {
  return {
    ...initialConfig(),
    plots: setValue(['The Quest']),
    settingTime: setValue('1920s'),
    settingPlace: setValue('A cabin'),
    isFact: setValue(false),
    characters: setValue([{ id: 'c1', name: 'Wren', age: '11', sex: 'F', relationships: 'Lead' }]),
    conflict: setValue('The map is wrong'),
    theme: setValue('Courage'),
    tone: setValue({ flavor: 'Humor', intensity: 5 }),
    perspective: setValue('First person'),
    audience: setValue('11-year-old boy'),
    pacing: setValue('Balanced'),
    length: setValue('short'),
    genre: setValue('Adventure'),
  };
}

/** A fetch whose NDJSON body is exactly the given events, then EOF. */
function mockFetch(events: StoryEvent[]) {
  const body = events.map(encodeEvent).join('');
  return vi.fn().mockResolvedValue(
    new Response(new TextEncoder().encode(body), {
      status: 200,
      headers: { 'Content-Type': 'application/x-ndjson' },
    }),
  );
}

describe('useStoryGeneration', () => {
  beforeEach(() => {
    window.localStorage.clear();
    __resetForTests();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('completes and archives a run that terminates with done', async () => {
    vi.stubGlobal(
      'fetch',
      mockFetch([
        { type: 'status', stage: 'writing' },
        { type: 'text', delta: 'Once upon a time.' },
        { type: 'done' },
      ]),
    );

    const { result } = renderHook(() => useStoryGeneration());
    await act(async () => {
      await result.current.generate(config());
    });

    await waitFor(() => expect(result.current.complete).toBe(true));
    expect(result.current.text).toBe('Once upon a time.');
    expect(result.current.error).toBeNull();
    expect(getHistorySnapshot()).toHaveLength(1);
  });

  it('treats a stream that ends without done as a failure, not a finished story', async () => {
    // A proxy timeout or killed server looks exactly like this: valid text,
    // then EOF, with no terminator.
    vi.stubGlobal(
      'fetch',
      mockFetch([
        { type: 'status', stage: 'writing' },
        { type: 'text', delta: 'Once upon a time, the connection ' },
      ]),
    );

    const { result } = renderHook(() => useStoryGeneration());
    await act(async () => {
      await result.current.generate(config());
    });

    await waitFor(() => expect(result.current.running).toBe(false));
    expect(result.current.error).toMatch(/cut off/i);
    expect(result.current.complete).toBe(false);
  });

  it('never archives a truncated run', async () => {
    vi.stubGlobal('fetch', mockFetch([{ type: 'text', delta: 'A fragment of a story' }]));

    const { result } = renderHook(() => useStoryGeneration());
    await act(async () => {
      await result.current.generate(config());
    });

    await waitFor(() => expect(result.current.running).toBe(false));
    expect(getHistorySnapshot()).toHaveLength(0);
  });

  it('never archives a run that ends in an explicit error', async () => {
    vi.stubGlobal(
      'fetch',
      mockFetch([
        { type: 'text', delta: 'Partial output before the provider died' },
        { type: 'error', message: 'Provider exploded' },
      ]),
    );

    const { result } = renderHook(() => useStoryGeneration());
    await act(async () => {
      await result.current.generate(config());
    });

    await waitFor(() => expect(result.current.error).toBe('Provider exploded'));
    expect(getHistorySnapshot()).toHaveLength(0);
    expect(result.current.complete).toBe(false);
  });

  it('surfaces a non-ok response as an error', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(
        Response.json({ error: 'Too many stories requested.' }, { status: 429 }),
      ),
    );

    const { result } = renderHook(() => useStoryGeneration());
    await act(async () => {
      await result.current.generate(config());
    });

    await waitFor(() => expect(result.current.error).toMatch(/too many/i));
    expect(getHistorySnapshot()).toHaveLength(0);
  });

  it('carries a notice through without treating it as a failure', async () => {
    vi.stubGlobal(
      'fetch',
      mockFetch([
        { type: 'notice', message: 'fact-check unavailable' },
        { type: 'text', delta: 'An unverified draft.' },
        { type: 'done' },
      ]),
    );

    const { result } = renderHook(() => useStoryGeneration());
    await act(async () => {
      await result.current.generate(config());
    });

    await waitFor(() => expect(result.current.complete).toBe(true));
    expect(result.current.notice).toBe('fact-check unavailable');
    expect(result.current.error).toBeNull();
    expect(getHistorySnapshot()).toHaveLength(1);
  });
});
