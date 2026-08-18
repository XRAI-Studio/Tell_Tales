'use client';

import { Mic, RotateCw, Square } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useVoiceInput } from '@/lib/hooks/use-voice-input';

/**
 * The Auto-Generate switch. Spec §2 puts one of these on every single field,
 * so it is deliberately small, quiet, and identical everywhere — the user
 * learns it once.
 */
export function AutoGenerateButton({
  onClick,
  label,
  size = 'sm',
}: {
  onClick: () => void;
  label: string;
  size?: 'sm' | 'lg';
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      title={`Roll ${label}`}
      aria-label={`Roll a suggestion for ${label}`}
      className={cn(
        'group inline-flex shrink-0 items-center justify-center rounded-full border transition',
        'border-edge bg-panel-700 text-legend-dim',
        'hover:border-lamp-amber hover:text-lamp-amber',
        'active:translate-y-px active:bg-panel-800',
        size === 'sm' ? 'h-7 w-7' : 'h-11 w-11',
      )}
    >
      <RotateCw
        className={cn('transition-transform duration-300 group-active:rotate-180', size === 'sm' ? 'h-3.5 w-3.5' : 'h-5 w-5')}
      />
    </button>
  );
}

/** Dictation control, rendered only where the browser actually supports it. */
export function VoiceButton({
  onTranscript,
  label,
}: {
  onTranscript: (text: string) => void;
  label: string;
}) {
  const voice = useVoiceInput(onTranscript);
  if (!voice.supported) return null;

  return (
    <button
      type="button"
      onClick={voice.listening ? voice.stop : voice.start}
      title={voice.listening ? `Stop dictating` : `Dictate ${label}`}
      aria-label={voice.listening ? `Stop dictating ${label}` : `Dictate ${label}`}
      className={cn(
        'inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-full border transition',
        voice.listening
          ? 'animate-lamp border-lamp-red bg-lamp-red/20 text-lamp-red'
          : 'border-edge bg-panel-700 text-legend-dim hover:border-lamp-green hover:text-lamp-green',
      )}
    >
      {voice.listening ? <Square className="h-3 w-3 fill-current" /> : <Mic className="h-3.5 w-3.5" />}
    </button>
  );
}

/** Shared frame: engraved legend, help text, and the always-present roll switch. */
export function FieldShell({
  label,
  help,
  optional,
  skipped,
  onSkip,
  onUnskip,
  onAutoGenerate,
  highlight,
  children,
  htmlFor,
}: {
  label: string;
  help?: string;
  optional?: boolean;
  skipped?: boolean;
  onSkip?: () => void;
  onUnskip?: () => void;
  onAutoGenerate: () => void;
  highlight?: boolean;
  children: React.ReactNode;
  htmlFor?: string;
}) {
  return (
    <div
      className={cn(
        'rounded-sm p-2.5 transition-shadow',
        highlight && 'ring-2 ring-lamp-amber ring-offset-2 ring-offset-panel-850',
      )}
    >
      <div className="mb-1.5 flex items-baseline gap-2">
        <label htmlFor={htmlFor} className="legend">
          {label}
        </label>
        {optional ? <span className="legend text-legend-faint">opt</span> : null}
        <span className="ml-auto flex items-center gap-1.5">
          {optional && !skipped && onSkip ? (
            <button
              type="button"
              onClick={onSkip}
              className="legend text-legend-faint underline-offset-2 hover:text-legend-dim hover:underline"
            >
              skip
            </button>
          ) : null}
          <AutoGenerateButton onClick={onAutoGenerate} label={label} />
        </span>
      </div>

      {skipped ? (
        <div className="flex items-center justify-between gap-2 rounded-sm border border-dashed border-edge px-3 py-2">
          <span className="text-sm text-legend-faint">Skipped — the storyteller will choose.</span>
          <button
            type="button"
            onClick={onUnskip}
            className="legend text-lamp-amber underline-offset-2 hover:underline"
          >
            undo
          </button>
        </div>
      ) : (
        children
      )}

      {help && !skipped ? <p className="mt-1.5 text-xs text-legend-faint">{help}</p> : null}
    </div>
  );
}
