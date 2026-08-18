import type { StoryPayload } from './schema';

/**
 * Mock generator used when no AI_GATEWAY_API_KEY is configured.
 *
 * It echoes the compiled payload back as prose so a keyless run still proves
 * something real: that the knobs reached the payload correctly. A fixed lorem
 * string would verify nothing.
 */
export function mockStory(payload: StoryPayload): string {
  const cast = payload.characters.length
    ? payload.characters
        .map((c) => `${c.name || 'Someone unnamed'} (${[c.age, c.sex].filter(Boolean).join(', ')})${c.relationships ? ` — ${c.relationships}` : ''}`)
        .join('; ')
    : 'nobody in particular';

  const [primary, ...subplots] = payload.plot;
  const garnishes = [
    payload.tropes?.length ? `tropes: ${payload.tropes.join(', ')}` : null,
    payload.style ? `style: ${payload.style}` : null,
    payload.formatting ? `format: ${payload.formatting}` : null,
  ].filter(Boolean);

  return `[MOCK STORY — no AI_GATEWAY_API_KEY is set, so nothing was sent to a model.]

In ${payload.setting.time || 'an unspecified time'}, in ${payload.setting.place || 'an unspecified place'}, a ${payload.genre || 'story'} began.

It followed the shape of ${primary || 'no particular plot'}${
    subplots.length ? `, threaded with ${subplots.join(' and ')}` : ''
  }. The people caught up in it were ${cast}.

The trouble was this: ${payload.conflict || 'something unnamed'}. Beneath it ran a quieter question — ${payload.theme || 'an unstated theme'} — and the story kept circling back to it the way stories do.

It was told in ${payload.perspective || 'some perspective'}, at a ${payload.pacing || 'measured'} pace, for ${payload.audience || 'whoever was listening'}. The mood was ${payload.tone.flavor} at intensity ${payload.tone.intensity} of 10${
    payload.tone.intensity >= 8
      ? ' — which is to say it drowned out everything else'
      : payload.tone.intensity <= 3
        ? ' — barely there, a background hum'
        : ' — enough to colour every scene'
  }.

${payload.isFact ? 'It was true, every word of it, and the fact-checking pass above confirms as much.' : 'None of it was true, and it did not need to be.'}

Target length: ${payload.length.label}, about ${payload.length.targetWords} words.${
    garnishes.length ? `\nGarnishes applied — ${garnishes.join('; ')}.` : ''
  }

Add a key to .env.local and this becomes a real story.`;
}

/** Plausible-looking issues so the fact path is visible without a model. */
export function mockFactIssues(payload: StoryPayload): string[] {
  if (!payload.isFact) return [];
  return [
    `The setting "${payload.setting.time || 'unspecified'}" needs a verifiable date before this reads as non-fiction.`,
  ];
}
