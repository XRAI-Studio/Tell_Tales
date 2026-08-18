import { lengthById } from '@/lib/story/length';
import type { StoryConfig, StoryRequest } from '@/lib/story/schema';

export type StoryRecord = {
  id: string;
  createdAt: number;
  title: string;
  config: StoryConfig;
  /** The request exactly as sent, so a past run is reproducible. */
  payload: StoryRequest;
  text: string;
};

const STORAGE_KEY = 'tell-tales:stories:v1';
const MAX_RECORDS = 12;

/**
 * localStorage is an external system, so history is exposed as a subscribable
 * store and read through useSyncExternalStore. The snapshot is cached because
 * that hook requires a stable reference between changes.
 */
const EMPTY: StoryRecord[] = [];
let cache: StoryRecord[] | null = null;
const listeners = new Set<() => void>();

function read(): StoryRecord[] {
  if (typeof window === 'undefined') return EMPTY;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return EMPTY;
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as StoryRecord[]) : EMPTY;
  } catch {
    return EMPTY;
  }
}

function write(records: StoryRecord[]) {
  cache = records;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(records));
  } catch {
    // Out of quota — the list still works for this session.
  }
  listeners.forEach((l) => l());
}

export function subscribeHistory(callback: () => void): () => void {
  listeners.add(callback);
  return () => {
    listeners.delete(callback);
  };
}

export function getHistorySnapshot(): StoryRecord[] {
  if (cache === null) cache = read();
  return cache;
}

export function getHistoryServerSnapshot(): StoryRecord[] {
  return EMPTY;
}

/** A short human label: what the story was, not when it was stored. */
export function titleFor(payload: StoryRequest): string {
  const parts = [payload.genre, payload.plot[0]].filter(Boolean);
  return parts.length ? parts.join(' · ') : 'Untitled story';
}

export function saveStory(input: {
  config: StoryConfig;
  payload: StoryRequest;
  text: string;
}): void {
  const record: StoryRecord = {
    id: `story-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`,
    createdAt: Date.now(),
    title: titleFor(input.payload),
    ...input,
  };
  write([record, ...getHistorySnapshot()].slice(0, MAX_RECORDS));
}

export function removeStory(id: string): void {
  write(getHistorySnapshot().filter((r) => r.id !== id));
}

/** Display label for a stored run, resolved from the id it was sent with. */
export function lengthLabelFor(record: StoryRecord): string {
  return lengthById(record.payload.lengthId).label;
}

export function clearHistory(): void {
  write([]);
}

/** Test seam: drop the in-memory cache along with the stored list. */
export function __resetForTests(): void {
  cache = null;
  listeners.clear();
  try {
    window.localStorage.removeItem(STORAGE_KEY);
  } catch {
    // Nothing to clear.
  }
}
