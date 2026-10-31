// Lesson registry. Add a lesson here and give its skill `lesson: 'full'` in skills.js.
import { LESSON_NS } from './necessarySufficient.js';
import { LESSON_CHAINS } from './conditionalChains.js';
import { LESSON_NEG } from './negationAndOr.js';
import { LESSON_QUANT } from './quantifiers.js';
import { LESSON_ARGS } from './argumentParts.js';

// Shared: misconception tags → error-journal categories (spec §11).
export const TAG_TO_ERROR_CATEGORY = {
  converse: 'conditional_translation', inverse: 'conditional_translation', only_if_reversal: 'conditional_translation',
  unless_misread: 'conditional_translation', chain_error: 'conditional_translation', negation_error: 'conditional_translation',
  quantifier_scope: 'scope_quantifier', some_all: 'scope_quantifier', most_some: 'scope_quantifier',
  premise_as_conclusion: 'structure', intermediate_as_main: 'structure', background_as_premise: 'structure',
  sufficient_not_necessary: 'distractor_attraction', too_strong: 'unsupported_inference', irrelevant: 'distractor_attraction',
  out_of_scope: 'unsupported_inference', unsupported: 'unsupported_inference', conceptual: 'conceptual',
};

export const LESSONS = [LESSON_ARGS, LESSON_NS, LESSON_NEG, LESSON_QUANT, LESSON_CHAINS];
export const LESSONS_BY_SKILL = Object.fromEntries(LESSONS.map(l => [l.skillId, l]));
export const LESSON_BY_ID = Object.fromEntries(LESSONS.map(l => [l.id, l]));
export const sectionForTag = (lesson, tag) => (lesson.tagToSection || {})[tag] || null;
