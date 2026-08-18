'use client';

import { useEffect, useRef, useState } from 'react';
import { AlertTriangle, Check, Copy, RotateCw } from 'lucide-react';
import { cn } from '@/lib/utils';
import { STAGE_LABELS, type StoryStage } from '@/lib/story/events';
import type { GenerationState } from '@/lib/hooks/use-story-generation';

const STAGES: StoryStage[] = ['drafting', 'fact-checking', 'revising', 'writing'];

/**
 * The stage lamps. In fiction mode only "writing" ever lights; fact mode walks
 * the whole strip, which is the honest way to show why it takes longer.
 */
function StageLamps({ stage, isFact }: { stage: StoryStage | null; isFact: boolean }) {
  const visible = isFact ? STAGES : (['writing'] as StoryStage[]);
  const activeIndex = stage ? visible.indexOf(stage) : -1;

  return (
    <ol className="flex flex-wrap items-center gap-x-4 gap-y-1.5">
      {visible.map((s, i) => {
        const active = stage === s;
        const past = activeIndex > i;
        return (
          <li key={s} className="flex items-center gap-1.5">
            <span
              aria-hidden
              className={cn(
                'h-2 w-2 rounded-full border',
                active && 'animate-lamp border-lamp-amber bg-lamp-amber',
                past && 'border-lamp-green bg-lamp-green',
                !active && !past && 'border-edge bg-transparent',
              )}
            />
            <span
              className={cn(
                'legend',
                active && 'text-lamp-amber',
                past && 'text-lamp-green',
                !active && !past && 'text-legend-faint',
              )}
            >
              {STAGE_LABELS[s].replace('…', '')}
            </span>
          </li>
        );
      })}
    </ol>
  );
}

export function StoryOutput({
  generation,
  isFact,
  onRegenerate,
}: {
  generation: GenerationState;
  isFact: boolean;
  onRegenerate: () => void;
}) {
  const sheetRef = useRef<HTMLDivElement>(null);
  const { running, stage, text, issues, notice, error, complete } = generation;

  // Bring the sheet into view once there is something to read.
  useEffect(() => {
    if (running || complete) {
      sheetRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
    // Only on the transition into a run, not on every token.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [running]);

  if (!running && !complete && !error) return null;

  return (
    <section ref={sheetRef} className="animate-sheet mt-8" aria-live="polite" aria-busy={running}>
      <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
        <StageLamps stage={stage} isFact={isFact} />
        <div className="flex items-center gap-2">
          {complete ? <CopyButton text={text} /> : null}
          {(complete || error) && (
            <button
              type="button"
              onClick={onRegenerate}
              className="inline-flex items-center gap-1.5 rounded-sm border border-edge px-3 py-1.5 text-xs text-legend-dim transition hover:border-lamp-amber hover:text-lamp-amber"
            >
              <RotateCw className="h-3.5 w-3.5" />
              Tell it again
            </button>
          )}
        </div>
      </div>

      {notice ? (
        <div className="mb-3 flex gap-2 rounded-sm border border-lamp-amber/50 bg-lamp-amber/10 p-3">
          <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0 text-lamp-amber" />
          <p className="text-sm text-legend-dim">{notice}</p>
        </div>
      ) : null}

      {issues.length > 0 ? (
        <div className="mb-3 rounded-sm border border-lamp-red/50 bg-lamp-red/10 p-3">
          <p className="legend mb-1.5 flex items-center gap-1.5 text-lamp-red">
            <AlertTriangle className="h-3.5 w-3.5" />
            Fact check found {issues.length === 1 ? 'one thing' : `${issues.length} things`} to fix
          </p>
          <ul className="list-inside list-disc space-y-0.5 text-sm text-legend-dim">
            {issues.map((issue) => (
              <li key={issue}>{issue}</li>
            ))}
          </ul>
        </div>
      ) : null}

      {error ? (
        <div className="rounded-sm border border-lamp-red bg-lamp-red/10 p-4">
          <p className="legend mb-1 text-lamp-red">The story did not come through</p>
          <p className="text-sm text-legend-dim">{error}</p>
        </div>
      ) : null}

      {text || running ? (
        <article className="rounded-sm bg-paper px-6 py-8 shadow-2xl sm:px-12 sm:py-12">
          <div className="mx-auto max-w-[62ch] font-story text-[1.0625rem] leading-[1.75] text-ink">
            {text.split(/\n{2,}/).map((para, i) => (
              <p key={i} className="mb-4 whitespace-pre-wrap last:mb-0">
                {para}
              </p>
            ))}
            {running ? (
              <span className="ml-0.5 inline-block h-[1.1em] w-[0.5ch] translate-y-[0.15em] animate-lamp bg-ink-soft" />
            ) : null}
          </div>
        </article>
      ) : null}
    </section>
  );
}

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!copied) return;
    const timer = setTimeout(() => setCopied(false), 1800);
    return () => clearTimeout(timer);
  }, [copied]);

  return (
    <button
      type="button"
      onClick={async () => {
        try {
          await navigator.clipboard.writeText(text);
          setCopied(true);
        } catch {
          // Clipboard blocked; leave the label alone rather than lie about it.
        }
      }}
      className="inline-flex items-center gap-1.5 rounded-sm border border-edge px-3 py-1.5 text-xs text-legend-dim transition hover:border-lamp-green hover:text-lamp-green"
    >
      {copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
      {copied ? 'Copied' : 'Copy'}
    </button>
  );
}
