import { hasValue, type FieldId, type StoryConfig } from './schema';
import { FIELD_BY_ID, MANDATORY_FIELDS } from './fields';

/**
 * Spec §4: this never produces an error state. It produces a *worklist* that
 * the gentle prompt walks the user through, one field at a time.
 */
export function missingMandatory(config: StoryConfig): FieldId[] {
  return MANDATORY_FIELDS.filter((f) => !hasValue(config[f.id])).map((f) => f.id);
}

export function isReadyToGenerate(config: StoryConfig): boolean {
  return missingMandatory(config).length === 0;
}

/** Gentle, non-accusatory copy for the missing-field prompt. */
export function gentlePromptFor(id: FieldId): string {
  const label = FIELD_BY_ID[id]?.label ?? id;
  const special: Partial<Record<FieldId, string>> = {
    plots: 'Every story needs a shape — shall we pick a plot?',
    characters: 'A story needs someone to happen to. Who is in this one?',
    isFact: 'Is this one true, or are we making it up?',
    tone: 'What should this story feel like?',
  };
  return special[id] ?? `It looks like we need a ${label} before we begin!`;
}
