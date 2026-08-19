/**
 * Terminal-state check for a model response.
 *
 * A story that stopped because it ran out of tokens is not a finished story,
 * even though the text that arrived is perfectly valid. Without this the
 * transport-level truncation guard is defeated from the provider side: the
 * stream closes cleanly, `done` is emitted, and the client archives a story
 * that stops mid-sentence.
 */

/**
 * Two shapes are possible and both occur in practice.
 *
 * The provider-level type (`LanguageModelV4FinishReason`) is an object with
 * `unified` and `raw`, but the value the AI SDK surfaces on a `streamText` /
 * `generateText` result is a bare string. Verified against the gateway: a
 * request truncated by the token ceiling resolves `finishReason` to the string
 * `'length'`. Reading only `.unified` silently never matches, which would make
 * the truncation guard dead code.
 */
export type FinishReasonLike =
  | string
  | { unified?: string; raw?: string | undefined }
  | undefined
  | null;

function normalize(reason: FinishReasonLike): string | undefined {
  if (typeof reason === 'string') return reason;
  return reason?.unified;
}

/**
 * Only genuinely bad terminal states are rejected. Providers differ in what
 * they report on a clean finish ('stop', sometimes 'other', sometimes nothing
 * at all), so anything not known to be a truncation passes rather than failing
 * a good generation.
 */
export function assertCleanFinish(reason: FinishReasonLike, stage: string): void {
  switch (normalize(reason)) {
    case 'length':
      throw new TruncatedGenerationError(
        `The ${stage} ran past the length limit and stopped mid-story. Choose a shorter length and try again.`,
      );
    case 'content-filter':
      throw new TruncatedGenerationError(
        `The provider's content filter stopped the ${stage} before it finished.`,
      );
    case 'error':
      throw new TruncatedGenerationError(`The provider failed partway through the ${stage}.`);
    default:
      return;
  }
}

export class TruncatedGenerationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'TruncatedGenerationError';
  }
}
