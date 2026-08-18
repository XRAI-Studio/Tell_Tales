'use client';

import { useState, useSyncExternalStore } from 'react';
import { BookOpen, RotateCcw, X } from 'lucide-react';
import {
  clearHistory,
  getHistoryServerSnapshot,
  getHistorySnapshot,
  removeStory,
  subscribeHistory,
  type StoryRecord,
} from '@/lib/state/story-history';
import { useStory } from '@/lib/state/story-context';

export function useStoryHistory(): StoryRecord[] {
  return useSyncExternalStore(subscribeHistory, getHistorySnapshot, getHistoryServerSnapshot);
}

function when(timestamp: number): string {
  const minutes = Math.round((Date.now() - timestamp) / 60000);
  if (minutes < 1) return 'just now';
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  return new Date(timestamp).toLocaleDateString();
}

/**
 * Finished stories, kept locally. Each one can be reopened, or its settings
 * loaded back onto the console as the starting point for the next attempt.
 */
export function StoryHistory() {
  const stories = useStoryHistory();
  const { dispatch } = useStory();
  const [open, setOpen] = useState<StoryRecord | null>(null);

  if (stories.length === 0) return null;

  return (
    <section className="mt-12 border-t border-edge pt-5">
      <div className="mb-3 flex items-baseline justify-between gap-3">
        <h2 className="font-legend text-lg font-semibold uppercase tracking-[0.2em] text-legend">
          Told so far
        </h2>
        <button
          type="button"
          onClick={clearHistory}
          className="legend text-legend-faint underline-offset-2 hover:text-lamp-red hover:underline"
        >
          Clear all
        </button>
      </div>

      <ul className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
        {stories.map((story) => (
          <li key={story.id} className="module rounded-sm p-3">
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold text-legend">{story.title}</p>
                <p className="font-data text-[0.7rem] text-legend-faint">
                  {when(story.createdAt)} · {story.payload.length.label}
                  {story.payload.isFact ? ' · fact' : ''}
                </p>
              </div>
              <button
                type="button"
                onClick={() => removeStory(story.id)}
                aria-label={`Delete ${story.title}`}
                className="shrink-0 rounded-full p-1 text-legend-faint transition hover:text-lamp-red"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </div>

            <p className="mt-1.5 line-clamp-2 text-xs text-legend-faint">{story.text.slice(0, 140)}</p>

            <div className="mt-2.5 flex gap-1.5">
              <button
                type="button"
                onClick={() => setOpen(story)}
                className="inline-flex items-center gap-1.5 rounded-sm border border-edge px-2 py-1 text-[0.7rem] text-legend-dim transition hover:border-lamp-amber hover:text-lamp-amber"
              >
                <BookOpen className="h-3 w-3" />
                Read
              </button>
              <button
                type="button"
                onClick={() => {
                  dispatch({ type: 'HYDRATE', config: story.config });
                  window.scrollTo({ top: 0, behavior: 'smooth' });
                }}
                className="inline-flex items-center gap-1.5 rounded-sm border border-edge px-2 py-1 text-[0.7rem] text-legend-dim transition hover:border-lamp-green hover:text-lamp-green"
              >
                <RotateCcw className="h-3 w-3" />
                Load settings
              </button>
            </div>
          </li>
        ))}
      </ul>

      {open ? (
        <div className="mt-4">
          <div className="mb-2 flex items-center justify-between">
            <h3 className="legend text-lamp-amber">{open.title}</h3>
            <button
              type="button"
              onClick={() => setOpen(null)}
              className="legend text-legend-faint underline-offset-2 hover:text-legend hover:underline"
            >
              Close
            </button>
          </div>
          <article className="animate-sheet rounded-sm bg-paper px-6 py-8 shadow-2xl sm:px-12">
            <div className="mx-auto max-w-[62ch] font-story text-[1.0625rem] leading-[1.75] text-ink">
              {open.text.split(/\n{2,}/).map((para, i) => (
                <p key={i} className="mb-4 whitespace-pre-wrap last:mb-0">
                  {para}
                </p>
              ))}
            </div>
          </article>
        </div>
      ) : null}
    </section>
  );
}
