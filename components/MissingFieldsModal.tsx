'use client';

import { useEffect, useRef, useState } from 'react';
import * as Dialog from '@radix-ui/react-dialog';
import { RotateCw } from 'lucide-react';
import { useStory } from '@/lib/state/story-context';
import { FIELD_BY_ID } from '@/lib/story/fields';
import { gentlePromptFor } from '@/lib/story/validate';
import { hasValue, type FieldId } from '@/lib/story/schema';
import { Knob } from './knobs/Knob';

/**
 * Spec §4. A missing field is never an error — it is a turn at the slot
 * machine. One field at a time: roll until something lands, or fill it in by
 * hand, then accept and move on.
 */
export function MissingFieldsModal({
  queue,
  onResolved,
  onDismiss,
}: {
  queue: FieldId[];
  onResolved: () => void;
  onDismiss: () => void;
}) {
  const { config, dispatch } = useStory();
  const [index, setIndex] = useState(0);
  const [rollCount, setRollCount] = useState(0);
  const rollRef = useRef<HTMLButtonElement>(null);

  const open = queue.length > 0;
  const current = queue[Math.min(index, queue.length - 1)];
  const field = current ? FIELD_BY_ID[current] : null;
  const filled = current ? hasValue(config[current]) : false;

  // The walk resets by remounting: the parent keys this component on the queue,
  // so a fresh set of gaps starts a fresh walk without a reset effect.
  useEffect(() => {
    if (open) rollRef.current?.focus();
  }, [open, index]);

  if (!open || !current || !field) return null;

  const isLast = index >= queue.length - 1;

  const accept = () => {
    if (isLast) {
      onResolved();
    } else {
      setIndex((i) => i + 1);
      setRollCount(0);
    }
  };

  return (
    <Dialog.Root open onOpenChange={(next) => !next && onDismiss()}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-40 bg-panel-900/80 backdrop-blur-sm" />
        <Dialog.Content
          aria-describedby="missing-field-help"
          className="module fixed left-1/2 top-1/2 z-50 w-[min(32rem,calc(100vw-2rem))] -translate-x-1/2 -translate-y-1/2 rounded-md p-5 shadow-2xl focus:outline-none"
        >
          <div className="mb-1 flex items-center justify-between">
            <span className="legend text-lamp-amber">
              {queue.length > 1 ? `${index + 1} of ${queue.length}` : 'One more thing'}
            </span>
            <span className="legend text-legend-faint">{field.label}</span>
          </div>

          <Dialog.Title className="font-legend text-2xl font-semibold uppercase tracking-wide text-legend">
            {gentlePromptFor(current)}
          </Dialog.Title>

          <p id="missing-field-help" className="mt-1 text-sm text-legend-faint">
            Roll for an idea, or fill it in yourself. Either way works.
          </p>

          <div className="my-4 rounded-sm border border-edge bg-panel-850/60">
            {/* Re-keyed on each roll so the new value visibly drops into place. */}
            <div key={rollCount} className="animate-reel">
              <Knob id={current} />
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              ref={rollRef}
              type="button"
              onClick={() => {
                dispatch({ type: 'AUTO_GENERATE', id: current });
                setRollCount((c) => c + 1);
              }}
              className="inline-flex flex-1 items-center justify-center gap-2 rounded-sm border border-lamp-amber bg-lamp-amber px-4 py-2.5 font-legend text-sm font-bold uppercase tracking-widest text-panel-900 transition hover:brightness-110 active:translate-y-px"
            >
              <RotateCw className="h-4 w-4" />
              {rollCount === 0 ? 'Roll one for me' : 'Roll again'}
            </button>

            <button
              type="button"
              onClick={accept}
              disabled={!filled}
              className="flex-1 rounded-sm border border-edge px-4 py-2.5 font-legend text-sm font-bold uppercase tracking-widest text-legend transition enabled:hover:border-lamp-green enabled:hover:text-lamp-green disabled:cursor-not-allowed disabled:opacity-40"
            >
              {isLast ? 'Accept & begin' : 'Accept & continue'}
            </button>
          </div>

          <button
            type="button"
            onClick={onDismiss}
            className="legend mt-3 block w-full text-center text-legend-faint underline-offset-2 hover:text-legend-dim hover:underline"
          >
            Back to the console
          </button>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
