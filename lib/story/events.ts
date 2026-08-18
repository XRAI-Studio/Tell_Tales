/**
 * Wire format between the generation route and the client.
 *
 * A hand-rolled NDJSON stream rather than the AI SDK's UI-message protocol:
 * this is a one-shot generation, not a chat, and the fact-check path needs to
 * announce its own stages. One line of JSON per event.
 */
export type StoryStage = 'drafting' | 'fact-checking' | 'revising' | 'writing';

export type StoryEvent =
  | { type: 'status'; stage: StoryStage }
  | { type: 'text'; delta: string }
  | { type: 'issues'; items: string[] }
  /** Something degraded but the story still arrived — not a failure. */
  | { type: 'notice'; message: string }
  | { type: 'done' }
  | { type: 'error'; message: string };

export const STAGE_LABELS: Record<StoryStage, string> = {
  drafting: 'Drafting the story…',
  'fact-checking': 'Checking the facts…',
  revising: 'Correcting the record…',
  writing: 'Writing…',
};

export function encodeEvent(event: StoryEvent): string {
  return `${JSON.stringify(event)}\n`;
}

/**
 * Parse a chunk of NDJSON, returning complete events plus any trailing
 * partial line for the caller to prepend to the next chunk.
 */
export function parseEvents(buffer: string): { events: StoryEvent[]; rest: string } {
  const lines = buffer.split('\n');
  const rest = lines.pop() ?? '';
  const events: StoryEvent[] = [];
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed) continue;
    try {
      events.push(JSON.parse(trimmed) as StoryEvent);
    } catch {
      // A malformed line is not worth killing the stream over.
    }
  }
  return { events, rest };
}
