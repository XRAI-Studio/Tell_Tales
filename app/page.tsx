'use client';

import { useCallback, useState } from 'react';
import { Play, Shuffle, Trash2 } from 'lucide-react';
import { UserButton } from '@clerk/nextjs';
import { clerkAppearance } from '@/lib/clerk-appearance';
import { requireAuth } from '@/lib/auth-mode';
import { StoryProvider, useStory } from '@/lib/state/story-context';
import { FIELDS, FIELD_GROUPS, MANDATORY_FIELDS } from '@/lib/story/fields';
import { missingMandatory } from '@/lib/story/validate';
import { isSet, type FieldId } from '@/lib/story/schema';
import { Knob } from '@/components/knobs/Knob';
import { MissingFieldsModal } from '@/components/MissingFieldsModal';
import { StoryOutput } from '@/components/StoryOutput';
import { StoryHistory } from '@/components/StoryHistory';
import { useStoryGeneration } from '@/lib/hooks/use-story-generation';

const GROUP_BLURB: Record<(typeof FIELD_GROUPS)[number], string> = {
  Story: 'What happens, and what it means',
  World: 'Where, when, and under whose rules',
  Cast: 'Who it happens to',
  Voice: 'How it sounds on the page',
  Garnishes: 'Optional — leave blank and the storyteller decides',
};

function Console() {
  const { config, dispatch, hydrated } = useStory();
  const generation = useStoryGeneration();
  const [queue, setQueue] = useState<FieldId[]>([]);
  const [highlight, setHighlight] = useState<FieldId[]>([]);

  const isFact = isSet(config.isFact) ? config.isFact.value : false;

  const run = useCallback(() => {
    void generation.generate(config);
  }, [config, generation]);

  /**
   * Spec §4: an incomplete console never produces an error. It opens the
   * gentle prompt over the gaps and walks the user through them.
   */
  const attemptGenerate = () => {
    const missing = missingMandatory(config);
    if (missing.length === 0) {
      run();
      return;
    }
    setQueue(missing);
    setHighlight(missing);
  };

  const rollEverything = () => {
    for (const field of MANDATORY_FIELDS) {
      dispatch({ type: 'AUTO_GENERATE', id: field.id });
    }
  };

  return (
    <main className="mx-auto w-full max-w-5xl px-4 pb-24 pt-8 sm:px-6">
      <header className="mb-8 border-b border-edge pb-5">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <h1 className="font-legend text-4xl font-bold uppercase tracking-[0.18em] text-legend sm:text-5xl">
              Tell Tales
            </h1>
            <p className="mt-1 text-sm text-legend-dim">
              Set the knobs, or let the machine set them for you.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={rollEverything}
              className="inline-flex items-center gap-2 rounded-sm border border-edge px-3 py-2 text-xs text-legend-dim transition hover:border-lamp-amber hover:text-lamp-amber"
            >
              <Shuffle className="h-3.5 w-3.5" />
              Roll everything
            </button>
            <button
              type="button"
              onClick={() => {
                dispatch({ type: 'RESET' });
                generation.reset();
              }}
              className="inline-flex items-center gap-2 rounded-sm border border-edge px-3 py-2 text-xs text-legend-faint transition hover:border-lamp-red hover:text-lamp-red"
            >
              <Trash2 className="h-3.5 w-3.5" />
              Clear
            </button>
            {requireAuth() ? <UserButton appearance={clerkAppearance} /> : null}
          </div>
        </div>
      </header>

      {/* Suppress the console until the saved draft is read, so a restored
          value never flashes as empty first. */}
      <div className={hydrated ? '' : 'pointer-events-none opacity-0'}>
        <div className="grid gap-5 lg:grid-cols-2">
          {FIELD_GROUPS.map((group) => {
            const fields = FIELDS.filter((f) => f.group === group);
            if (fields.length === 0) return null;
            return (
              <section
                key={group}
                className={`module rounded-md p-4 ${group === 'Cast' || group === 'Voice' ? '' : ''}`}
              >
                <div className="mb-3 flex items-baseline gap-3 border-b border-edge/60 pb-2">
                  <h2 className="font-legend text-lg font-semibold uppercase tracking-[0.2em] text-legend">
                    {group}
                  </h2>
                  <p className="text-xs text-legend-faint">{GROUP_BLURB[group]}</p>
                </div>
                <div className="space-y-1">
                  {fields.map((field) => (
                    <Knob key={field.id} id={field.id} highlight={highlight.includes(field.id)} />
                  ))}
                </div>
              </section>
            );
          })}
        </div>

        <div className="mt-8 flex flex-col items-center gap-3">
          <button
            type="button"
            onClick={generation.running ? generation.cancel : attemptGenerate}
            className="inline-flex w-full max-w-md items-center justify-center gap-3 rounded-sm border-2 border-lamp-amber bg-lamp-amber px-8 py-4 font-legend text-lg font-bold uppercase tracking-[0.2em] text-panel-900 shadow-[0_0_30px_-8px_var(--color-lamp-amber)] transition hover:brightness-110 active:translate-y-px"
          >
            <Play className="h-5 w-5 fill-current" />
            {generation.running ? 'Stop' : 'Tell the story'}
          </button>
          <p className="font-data text-xs text-legend-faint">
            {isFact
              ? 'Fact mode — low temperature, then a fact-checking pass'
              : 'Fiction mode — high temperature, one straight pass'}
          </p>
        </div>

        <StoryOutput generation={generation} isFact={isFact} onRegenerate={run} />

        <StoryHistory />
      </div>

      <MissingFieldsModal
        key={queue.join('|')}
        queue={queue}
        onResolved={() => {
          setQueue([]);
          setHighlight([]);
          run();
        }}
        onDismiss={() => setQueue([])}
      />
    </main>
  );
}

export default function Page() {
  return (
    <StoryProvider>
      <Console />
    </StoryProvider>
  );
}
