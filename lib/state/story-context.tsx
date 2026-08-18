'use client';

import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useReducer,
  type Dispatch,
  type ReactNode,
} from 'react';
import { initialConfig, storyReducer, type StoryAction } from './story-reducer';
import type { StoryConfig } from '@/lib/story/schema';

const STORAGE_KEY = 'tell-tales:config:v1';

type StoryContextValue = {
  config: StoryConfig;
  dispatch: Dispatch<StoryAction>;
  /** False until localStorage has been read, so the first paint matches the server. */
  hydrated: boolean;
};

const StoryContext = createContext<StoryContextValue | null>(null);

/**
 * Hydration lives inside the reducer rather than a separate flag, so restoring
 * a draft is a single dispatch instead of a setState cascade after mount.
 */
type ProviderState = { config: StoryConfig; hydrated: boolean };
type ProviderAction = StoryAction | { type: 'HYDRATED'; config: StoryConfig };

function providerReducer(state: ProviderState, action: ProviderAction): ProviderState {
  if (action.type === 'HYDRATED') {
    return { config: action.config, hydrated: true };
  }
  return { ...state, config: storyReducer(state.config, action) };
}

export function StoryProvider({ children }: { children: ReactNode }) {
  const [state, rawDispatch] = useReducer(providerReducer, undefined, () => ({
    config: initialConfig(),
    hydrated: false,
  }));
  const { config, hydrated } = state;

  // Restore a draft on mount. Runs after the first render so server and client
  // markup agree.
  useEffect(() => {
    let restored = initialConfig();
    try {
      const saved = window.localStorage.getItem(STORAGE_KEY);
      if (saved) {
        // Merge onto a fresh config so a schema change can't strand the app on
        // an old shape missing newer fields.
        restored = { ...restored, ...(JSON.parse(saved) as StoryConfig) };
      }
    } catch {
      // A corrupt draft is not worth blocking startup for.
    }
    rawDispatch({ type: 'HYDRATED', config: restored });
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(config));
    } catch {
      // Storage full or blocked — the app still works, it just won't persist.
    }
  }, [config, hydrated]);

  const value = useMemo(
    () => ({ config, dispatch: rawDispatch as Dispatch<StoryAction>, hydrated }),
    [config, hydrated],
  );
  return <StoryContext.Provider value={value}>{children}</StoryContext.Provider>;
}

export function useStory(): StoryContextValue {
  const ctx = useContext(StoryContext);
  if (!ctx) throw new Error('useStory must be used inside a StoryProvider');
  return ctx;
}
