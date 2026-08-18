import { describe, expect, it } from 'vitest';
import { encodeEvent, parseEvents, STAGE_LABELS, type StoryEvent } from './events';
import { mockStory } from './mock';
import { compilePayload } from './payload';
import { setValue, type StoryConfig } from './schema';
import { initialConfig } from '@/lib/state/story-reducer';

function roundTrip(events: StoryEvent[]) {
  return parseEvents(events.map(encodeEvent).join('')).events;
}

describe('event codec', () => {
  it('round-trips every event shape', () => {
    const events: StoryEvent[] = [
      { type: 'status', stage: 'drafting' },
      { type: 'text', delta: 'Once upon ' },
      { type: 'issues', items: ['Wrong year'] },
      { type: 'notice', message: 'fact-check unavailable' },
      { type: 'done' },
      { type: 'error', message: 'boom' },
    ];
    expect(roundTrip(events)).toEqual(events);
  });

  it('holds back a partial trailing line until the rest arrives', () => {
    const whole = encodeEvent({ type: 'text', delta: 'hello' });
    const split = Math.floor(whole.length / 2);

    const first = parseEvents(whole.slice(0, split));
    expect(first.events).toEqual([]);
    expect(first.rest).toBe(whole.slice(0, split));

    const second = parseEvents(first.rest + whole.slice(split));
    expect(second.events).toEqual([{ type: 'text', delta: 'hello' }]);
    expect(second.rest).toBe('');
  });

  it('survives a malformed line without dropping the good ones', () => {
    const buffer = `${encodeEvent({ type: 'text', delta: 'a' })}{not json}\n${encodeEvent({ type: 'done' })}`;
    expect(parseEvents(buffer).events).toEqual([{ type: 'text', delta: 'a' }, { type: 'done' }]);
  });

  it('preserves newlines inside story text across the wire', () => {
    const delta = 'End of scene.\n\nNew scene begins.';
    expect(roundTrip([{ type: 'text', delta }])).toEqual([{ type: 'text', delta }]);
  });

  it('labels every stage', () => {
    for (const label of Object.values(STAGE_LABELS)) expect(label.length).toBeGreaterThan(0);
  });
});

describe('mockStory', () => {
  const config: StoryConfig = {
    ...initialConfig(),
    plots: setValue(['The Quest']),
    settingTime: setValue('1920s'),
    settingPlace: setValue('A quiet cabin'),
    isFact: setValue(false),
    characters: setValue([
      { id: 'c1', name: 'Wren', age: '11', sex: 'Female', relationships: 'Protagonist' },
    ]),
    conflict: setValue('The map is wrong'),
    theme: setValue('Courage'),
    tone: setValue({ flavor: 'Humor', intensity: 9 }),
    perspective: setValue('First person'),
    audience: setValue('11-year-old boy'),
    pacing: setValue('Balanced'),
    length: setValue('short'),
    genre: setValue('Adventure'),
  };

  it('reflects the compiled payload, so a keyless run still proves the knobs wired through', () => {
    const text = mockStory(compilePayload(config));
    for (const fragment of ['1920s', 'A quiet cabin', 'The Quest', 'Wren', 'The map is wrong', 'Adventure']) {
      expect(text).toContain(fragment);
    }
  });

  it('says plainly that no model was called', () => {
    expect(mockStory(compilePayload(config))).toContain('MOCK STORY');
  });

  it('describes the intensity band it was given', () => {
    expect(mockStory(compilePayload(config))).toContain('drowned out everything else');
    const subtle = mockStory(compilePayload({ ...config, tone: setValue({ flavor: 'Humor', intensity: 2 }) }));
    expect(subtle).toContain('background hum');
  });
});
