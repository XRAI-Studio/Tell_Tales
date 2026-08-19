import { generateObject, generateText, streamText } from 'ai';
import { storyRequestSchema, factCheckSchema, type StoryPayload } from '@/lib/story/schema';
import { MASTER_STORYTELLER_PROMPT, FACT_CHECK_PROMPT, buildRevisionPrompt } from '@/lib/story/prompt';
import { payloadToUserMessage, resolveRequest, temperatureFor } from '@/lib/story/payload';
import { maxOutputTokensFor } from '@/lib/story/length';
import { encodeEvent, type StoryEvent } from '@/lib/story/events';
import { mockStory, mockFactIssues } from '@/lib/story/mock';
import { assertCleanFinish, type FinishReasonLike } from '@/lib/story/finish';
import { acquireSlot, clientKey, readJsonCapped, PayloadTooLargeError } from '@/lib/server/guards';

/**
 * Any AI Gateway model string. Override with STORY_MODEL in .env.local —
 * nothing else in the app is provider-specific.
 *
 * The default is one of the few models Vercel's free tier allows; better
 * storytellers like `anthropic/claude-sonnet-5` need paid credits.
 */
const MODEL = process.env.STORY_MODEL?.trim() || 'openai/gpt-oss-120b';

export const maxDuration = 300;

function isMockMode(): boolean {
  return !process.env.AI_GATEWAY_API_KEY?.trim();
}

/** Raised when the client goes away mid-generation. */
class AbortedError extends Error {
  constructor() {
    super('Generation cancelled');
    this.name = 'AbortedError';
  }
}

function throwIfAborted(signal: AbortSignal) {
  if (signal.aborted) throw new AbortedError();
}

/** Emit buffered text in word-sized chunks so mock mode still animates. */
async function streamChunks(
  text: string,
  emit: (e: StoryEvent) => void,
  signal: AbortSignal,
  delayMs = 0,
): Promise<void> {
  const chunks = text.match(/\S+\s*/g) ?? [text];
  for (const chunk of chunks) {
    throwIfAborted(signal);
    emit({ type: 'text', delta: chunk });
    if (delayMs > 0) await new Promise((r) => setTimeout(r, delayMs));
  }
}

type TextRunParams = {
  model: string;
  system: string;
  prompt: string;
  temperature: number;
  maxOutputTokens: number;
};

/**
 * streamText reports failures through onError rather than rejecting the
 * textStream iteration, so an unhandled provider error would otherwise look
 * like a successful empty story. Capture it and rethrow once the stream ends.
 */
async function streamModelText(
  params: TextRunParams,
  emit: (e: StoryEvent) => void,
  signal: AbortSignal,
  stage = 'story',
): Promise<void> {
  let streamError: unknown = null;
  const result = streamText({
    ...params,
    abortSignal: signal,
    onError: ({ error }) => {
      streamError = error;
    },
  });

  let produced = 0;
  for await (const delta of result.textStream) {
    produced += delta.length;
    emit({ type: 'text', delta });
  }

  // An abort surfaces here as a truncated stream, not as a thrown error.
  throwIfAborted(signal);

  if (streamError) {
    throw streamError instanceof Error ? streamError : new Error(String(streamError));
  }
  if (produced === 0) {
    throw new Error('The model returned an empty response.');
  }

  // Checked last: text arriving is not proof the model finished saying it.
  assertCleanFinish((await result.finishReason) as FinishReasonLike, stage);
}

async function runMock(
  payload: StoryPayload,
  emit: (e: StoryEvent) => void,
  signal: AbortSignal,
): Promise<void> {
  if (payload.isFact) {
    emit({ type: 'status', stage: 'drafting' });
    await new Promise((r) => setTimeout(r, 400));
    throwIfAborted(signal);
    emit({ type: 'status', stage: 'fact-checking' });
    await new Promise((r) => setTimeout(r, 600));
    throwIfAborted(signal);
    const issues = mockFactIssues(payload);
    if (issues.length) {
      emit({ type: 'issues', items: issues });
      emit({ type: 'status', stage: 'revising' });
      await new Promise((r) => setTimeout(r, 400));
    }
  }
  emit({ type: 'status', stage: 'writing' });
  await streamChunks(mockStory(payload), emit, signal, 12);
}

async function runFiction(
  payload: StoryPayload,
  emit: (e: StoryEvent) => void,
  signal: AbortSignal,
): Promise<void> {
  emit({ type: 'status', stage: 'writing' });
  await streamModelText(
    {
      model: MODEL,
      system: MASTER_STORYTELLER_PROMPT,
      prompt: payloadToUserMessage(payload),
      temperature: temperatureFor(false),
      maxOutputTokens: maxOutputTokensFor(payload.length.targetWords),
    },
    emit,
    signal,
    'story',
  );
}

/**
 * Fact mode (spec §3): draft at low temperature, verify, then revise once if
 * the verifier found anything. The draft cannot stream, because it may still
 * be corrected — hence the status events so the wait stays legible.
 *
 * Each stage checks for abort first: without that, cancelling during the draft
 * would still pay for verification and revision.
 */
async function runFactChecked(
  payload: StoryPayload,
  emit: (e: StoryEvent) => void,
  signal: AbortSignal,
): Promise<void> {
  const maxOutputTokens = maxOutputTokensFor(payload.length.targetWords);

  emit({ type: 'status', stage: 'drafting' });
  const draft = await generateText({
    model: MODEL,
    system: MASTER_STORYTELLER_PROMPT,
    prompt: payloadToUserMessage(payload),
    temperature: temperatureFor(true),
    maxOutputTokens,
    abortSignal: signal,
  });

  throwIfAborted(signal);
  // Verify nothing until the draft is known to be whole; a truncated draft
  // would otherwise be fact-checked, revised, and archived as a real story.
  assertCleanFinish(draft.finishReason as FinishReasonLike, 'draft');

  emit({ type: 'status', stage: 'fact-checking' });
  let issues: string[];
  try {
    const verdict = await generateObject({
      model: MODEL,
      schema: factCheckSchema,
      system: FACT_CHECK_PROMPT,
      prompt: `Story configuration:\n${payloadToUserMessage(payload)}\n\nNarrative to check:\n---\n${draft.text}\n---`,
      temperature: 0,
      abortSignal: signal,
    });
    issues = verdict.object.issues ?? [];
  } catch (error) {
    // A cancellation must not be mistaken for a verifier that misbehaved.
    if (signal.aborted || error instanceof AbortedError) throw new AbortedError();
    // Not every model can hold to a JSON schema. A verifier that fails is no
    // reason to discard a finished draft — hand it over, clearly labelled.
    emit({
      type: 'notice',
      message:
        'This model could not complete the fact-check, so the draft below is unverified. Set STORY_MODEL to a model with structured-output support for the full fact pass.',
    });
    emit({ type: 'status', stage: 'writing' });
    await streamChunks(draft.text, emit, signal);
    return;
  }

  throwIfAborted(signal);

  if (issues.length === 0) {
    emit({ type: 'status', stage: 'writing' });
    await streamChunks(draft.text, emit, signal);
    return;
  }

  emit({ type: 'issues', items: issues });
  emit({ type: 'status', stage: 'revising' });
  await streamModelText(
    {
      model: MODEL,
      system: MASTER_STORYTELLER_PROMPT,
      prompt: buildRevisionPrompt(draft.text, issues),
      temperature: temperatureFor(true),
      maxOutputTokens,
    },
    emit,
    signal,
    'revision',
  );
}

function reject(status: number, message: string, retryAfterSeconds?: number) {
  return Response.json(
    { error: message },
    {
      status,
      headers: retryAfterSeconds ? { 'Retry-After': String(retryAfterSeconds) } : undefined,
    },
  );
}

export async function POST(req: Request) {
  // Claimed before any parsing so a flood of malformed requests is cheap too.
  const slot = acquireSlot(clientKey(req));
  if (!slot.ok) {
    return reject(slot.rejection.status, slot.rejection.message, slot.rejection.retryAfterSeconds);
  }

  let payload: StoryPayload;
  try {
    const parsed = storyRequestSchema.safeParse(await readJsonCapped(req));
    if (!parsed.success) {
      slot.release();
      return Response.json(
        { error: 'Invalid story configuration', issues: parsed.error.issues },
        { status: 400 },
      );
    }
    payload = resolveRequest(parsed.data);
  } catch (error) {
    slot.release();
    if (error instanceof PayloadTooLargeError) {
      return reject(413, 'That story configuration is too large.');
    }
    return reject(400, 'Malformed request body');
  }

  // Fires when the client disconnects, so generation stops with them.
  const signal = req.signal;

  const encoder = new TextEncoder();
  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      let closed = false;
      const emit = (event: StoryEvent) => {
        if (closed) return;
        controller.enqueue(encoder.encode(encodeEvent(event)));
      };

      try {
        if (isMockMode()) {
          await runMock(payload, emit, signal);
        } else if (payload.isFact) {
          await runFactChecked(payload, emit, signal);
        } else {
          await runFiction(payload, emit, signal);
        }
        emit({ type: 'done' });
      } catch (error) {
        // A cancelled run has no one listening; emitting would only throw.
        if (!(error instanceof AbortedError) && !signal.aborted) {
          const message = error instanceof Error ? error.message : 'Story generation failed';
          emit({ type: 'error', message });
        }
      } finally {
        closed = true;
        slot.release();
        try {
          controller.close();
        } catch {
          // Already closed by the client disconnecting.
        }
      }
    },
    cancel() {
      slot.release();
    },
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'application/x-ndjson; charset=utf-8',
      'Cache-Control': 'no-cache, no-transform',
      'X-Accel-Buffering': 'no',
    },
  });
}
