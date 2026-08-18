'use client';

import { useCallback, useRef, useState } from 'react';
import { parseEvents, type StoryStage } from '@/lib/story/events';
import { compilePayload } from '@/lib/story/payload';
import { saveStory } from '@/lib/state/story-history';
import type { StoryConfig } from '@/lib/story/schema';

export type GenerationState = {
  running: boolean;
  stage: StoryStage | null;
  text: string;
  issues: string[];
  /** A degradation worth showing, distinct from a failure. */
  notice: string | null;
  error: string | null;
  /** Set once a run finishes cleanly, so the UI can show a completed sheet. */
  complete: boolean;
};

const IDLE: GenerationState = {
  running: false,
  stage: null,
  text: '',
  issues: [],
  notice: null,
  error: null,
  complete: false,
};

export function useStoryGeneration() {
  const [state, setState] = useState<GenerationState>(IDLE);
  const abortRef = useRef<AbortController | null>(null);

  const cancel = useCallback(() => {
    abortRef.current?.abort();
    abortRef.current = null;
    setState((s) => ({ ...s, running: false, stage: null }));
  }, []);

  const generate = useCallback(async (config: StoryConfig) => {
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    const payload = compilePayload(config);
    setState({ ...IDLE, running: true, stage: 'drafting' });

    // Accumulated alongside React state so the finished text can be archived
    // without waiting for a re-render.
    let full = '';
    let finished = false;
    let errored = false;

    try {
      const response = await fetch('/api/story', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
        signal: controller.signal,
      });

      if (!response.ok || !response.body) {
        const detail = await response.json().catch(() => null);
        throw new Error(detail?.error ?? `Generation failed (${response.status})`);
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';

      for (;;) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const { events, rest } = parseEvents(buffer);
        buffer = rest;

        for (const event of events) {
          switch (event.type) {
            case 'status':
              setState((s) => ({ ...s, stage: event.stage }));
              break;
            case 'text':
              full += event.delta;
              setState((s) => ({ ...s, text: s.text + event.delta }));
              break;
            case 'issues':
              setState((s) => ({ ...s, issues: event.items }));
              break;
            case 'notice':
              setState((s) => ({ ...s, notice: event.message }));
              break;
            case 'done':
              setState((s) => ({ ...s, running: false, stage: null, complete: true }));
              finished = true;
              break;
            case 'error':
              setState((s) => ({ ...s, running: false, stage: null, error: event.message }));
              errored = true;
              finished = true;
              break;
          }
        }
      }

      // EOF without an explicit `done` means the stream was cut short — a
      // proxy timeout, a killed server, a dropped connection. Whatever text
      // arrived is a fragment, so surface it as a failure rather than
      // presenting (and archiving) a truncated story as a finished one.
      if (!finished) {
        errored = true;
        setState((s) => ({
          ...s,
          running: false,
          stage: null,
          error: 'The story was cut off before it finished. Nothing was saved — try again.',
        }));
      }

      // Archived once per run, outside any state updater so a StrictMode
      // double-invoke cannot write the story twice. A failed run is not saved.
      if (!errored && full.trim()) saveStory({ config, payload, text: full });
    } catch (error) {
      if (controller.signal.aborted) return;
      setState((s) => ({
        ...s,
        running: false,
        stage: null,
        error: error instanceof Error ? error.message : 'Generation failed',
      }));
    } finally {
      if (abortRef.current === controller) abortRef.current = null;
    }
  }, []);

  const reset = useCallback(() => setState(IDLE), []);

  return { ...state, generate, cancel, reset };
}
