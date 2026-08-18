import { generateObject, generateText, streamText } from 'ai';
import { storyPayloadSchema, factCheckSchema, type StoryPayload } from '@/lib/story/schema';
import { MASTER_STORYTELLER_PROMPT, FACT_CHECK_PROMPT, buildRevisionPrompt } from '@/lib/story/prompt';
import { payloadToUserMessage, temperatureFor } from '@/lib/story/payload';
import { maxOutputTokensFor } from '@/lib/story/length';
import { encodeEvent, type StoryEvent } from '@/lib/story/events';
import { mockStory, mockFactIssues } from '@/lib/story/mock';

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

/** Emit buffered text in word-sized chunks so mock mode still animates. */
async function streamChunks(
  text: string,
  emit: (e: StoryEvent) => void,
  delayMs = 0,
): Promise<void> {
  const chunks = text.match(/\S+\s*/g) ?? [text];
  for (const chunk of chunks) {
    emit({ type: 'text', delta: chunk });
    if (delayMs > 0) await new Promise((r) => setTimeout(r, delayMs));
  }
}

async function runMock(payload: StoryPayload, emit: (e: StoryEvent) => void): Promise<void> {
  if (payload.isFact) {
    emit({ type: 'status', stage: 'drafting' });
    await new Promise((r) => setTimeout(r, 400));
    emit({ type: 'status', stage: 'fact-checking' });
    await new Promise((r) => setTimeout(r, 600));
    const issues = mockFactIssues(payload);
    if (issues.length) {
      emit({ type: 'issues', items: issues });
      emit({ type: 'status', stage: 'revising' });
      await new Promise((r) => setTimeout(r, 400));
    }
  }
  emit({ type: 'status', stage: 'writing' });
  await streamChunks(mockStory(payload), emit, 12);
}

/**
 * streamText reports failures through onError rather than rejecting the
 * textStream iteration, so an unhandled provider error would otherwise look
 * like a successful empty story. Capture it and rethrow once the stream ends.
 */
type TextRunParams = {
  model: string;
  system: string;
  prompt: string;
  temperature: number;
  maxOutputTokens: number;
};

async function streamModelText(
  params: TextRunParams,
  emit: (e: StoryEvent) => void,
): Promise<void> {
  let streamError: unknown = null;
  const result = streamText({
    ...params,
    onError: ({ error }) => {
      streamError = error;
    },
  });

  let produced = 0;
  for await (const delta of result.textStream) {
    produced += delta.length;
    emit({ type: 'text', delta });
  }

  if (streamError) {
    throw streamError instanceof Error ? streamError : new Error(String(streamError));
  }
  if (produced === 0) {
    throw new Error('The model returned an empty response.');
  }
}

async function runFiction(payload: StoryPayload, emit: (e: StoryEvent) => void): Promise<void> {
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
  );
}

/**
 * Fact mode (spec §3): draft at low temperature, verify, then revise once if
 * the verifier found anything. The draft cannot stream, because it may still
 * be corrected — hence the status events so the wait stays legible.
 */
async function runFactChecked(payload: StoryPayload, emit: (e: StoryEvent) => void): Promise<void> {
  const maxOutputTokens = maxOutputTokensFor(payload.length.targetWords);

  emit({ type: 'status', stage: 'drafting' });
  const draft = await generateText({
    model: MODEL,
    system: MASTER_STORYTELLER_PROMPT,
    prompt: payloadToUserMessage(payload),
    temperature: temperatureFor(true),
    maxOutputTokens,
  });

  emit({ type: 'status', stage: 'fact-checking' });
  let issues: string[];
  try {
    const verdict = await generateObject({
      model: MODEL,
      schema: factCheckSchema,
      system: FACT_CHECK_PROMPT,
      prompt: `Story configuration:\n${payloadToUserMessage(payload)}\n\nNarrative to check:\n---\n${draft.text}\n---`,
      temperature: 0,
    });
    issues = verdict.object.issues ?? [];
  } catch {
    // Not every model can hold to a JSON schema. A verifier that fails is no
    // reason to discard a finished draft — hand it over, clearly labelled.
    emit({
      type: 'notice',
      message:
        'This model could not complete the fact-check, so the draft below is unverified. Set STORY_MODEL to a model with structured-output support for the full fact pass.',
    });
    emit({ type: 'status', stage: 'writing' });
    await streamChunks(draft.text, emit);
    return;
  }

  if (issues.length === 0) {
    emit({ type: 'status', stage: 'writing' });
    await streamChunks(draft.text, emit);
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
  );
}

export async function POST(req: Request) {
  let payload: StoryPayload;
  try {
    const parsed = storyPayloadSchema.safeParse(await req.json());
    if (!parsed.success) {
      return Response.json(
        { error: 'Invalid story configuration', issues: parsed.error.issues },
        { status: 400 },
      );
    }
    payload = parsed.data;
  } catch {
    return Response.json({ error: 'Malformed request body' }, { status: 400 });
  }

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
          await runMock(payload, emit);
        } else if (payload.isFact) {
          await runFactChecked(payload, emit);
        } else {
          await runFiction(payload, emit);
        }
        emit({ type: 'done' });
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Story generation failed';
        emit({ type: 'error', message });
      } finally {
        closed = true;
        controller.close();
      }
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
