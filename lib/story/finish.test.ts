import { describe, expect, it } from 'vitest';
import { assertCleanFinish, TruncatedGenerationError } from './finish';

describe('assertCleanFinish', () => {
  it('accepts a model that stopped because it was done, in either shape', () => {
    expect(() => assertCleanFinish({ unified: 'stop', raw: 'stop' }, 'story')).not.toThrow();
    expect(() => assertCleanFinish('stop', 'story')).not.toThrow();
  });

  it('rejects a bare-string reason, which is what the SDK actually returns', () => {
    // Verified against the gateway: a run truncated by the token ceiling
    // resolves finishReason to the string 'length', not to { unified }.
    // Reading only .unified made this guard dead code.
    expect(() => assertCleanFinish('length', 'story')).toThrow(TruncatedGenerationError);
    expect(() => assertCleanFinish('content-filter', 'story')).toThrow(/content filter/i);
    expect(() => assertCleanFinish('error', 'story')).toThrow(/failed partway/i);
  });

  it('rejects a response cut off by the token ceiling', () => {
    // The dangerous case: the text is valid and non-empty, so nothing else in
    // the pipeline can tell this apart from a finished story.
    expect(() => assertCleanFinish({ unified: 'length', raw: 'max_tokens' }, 'story')).toThrow(
      TruncatedGenerationError,
    );
    expect(() => assertCleanFinish({ unified: 'length' }, 'story')).toThrow(/shorter length/i);
  });

  it('rejects a response stopped by a content filter', () => {
    expect(() => assertCleanFinish({ unified: 'content-filter' }, 'story')).toThrow(/content filter/i);
  });

  it('rejects a response that ended in a provider error', () => {
    expect(() => assertCleanFinish({ unified: 'error' }, 'story')).toThrow(/failed partway/i);
  });

  it('names the stage so fact mode says which call failed', () => {
    expect(() => assertCleanFinish({ unified: 'length' }, 'draft')).toThrow(/The draft ran past/);
    expect(() => assertCleanFinish({ unified: 'length' }, 'revision')).toThrow(/The revision ran past/);
  });

  it('does not fail a generation over an unfamiliar or missing reason', () => {
    // Providers vary; refusing anything unknown would break working models.
    for (const reason of [
      { unified: 'other' },
      { unified: 'tool-calls' },
      { unified: 'something-new' },
      'other',
      'tool-calls',
      'something-new',
      '',
      {},
      undefined,
      null,
    ]) {
      expect(() => assertCleanFinish(reason, 'story')).not.toThrow();
    }
  });
});
