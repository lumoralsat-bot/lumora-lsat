// Lesson registry (Curriculum v2.0): one complete lesson per curriculum node.
import { LESSON_NS } from './necessarySufficient.js';
import { LESSON_CHAINS } from './conditionalChains.js';
import { LESSON_NEG } from './negationAndOr.js';
import { LESSON_QUANT } from './quantifiers.js';
import { LESSON_ARGS } from './argumentParts.js';
import { LESSON_TRUTH, LESSON_DEDUCTIVE } from './foundations.js';
import { LESSON_MAIN, LESSON_ROLE, LESSON_METHOD } from './lrStructure.js';
import { LESSON_NA, LESSON_SA, LESSON_STRENGTHEN, LESSON_WEAKEN, LESSON_EVALUATE } from './lrEvaluation.js';
import { LESSON_PARADOX, LESSON_CAUSAL, LESSON_MBT, LESSON_FLAWS, LESSON_PARALLEL, LESSON_PRINCIPLES } from './lrInference.js';
import { LESSON_RC_STRUCTURE, LESSON_RC_AUTHOR, LESSON_RC_INFERENCE, LESSON_RC_COMPARATIVE } from './rc.js';
import { LESSON_STATS, LESSON_MEDIA } from './applied.js';
export { CLASSIC_ROUTES, classicRoute, parseHash, routeToHash } from './classicMap.js';

// Shared: misconception tags → error-journal categories (spec §11).
export const TAG_TO_ERROR_CATEGORY = {
  converse: 'conditional_translation', inverse: 'conditional_translation', only_if_reversal: 'conditional_translation',
  unless_misread: 'conditional_translation', chain_error: 'conditional_translation', negation_error: 'conditional_translation',
  necessary_not_sufficient: 'conditional_translation', condition_not_met: 'conditional_translation',
  quantifier_scope: 'scope_quantifier', some_all: 'scope_quantifier', most_some: 'scope_quantifier', scope_shift: 'scope_quantifier',
  premise_as_conclusion: 'structure', intermediate_as_main: 'structure', background_as_premise: 'structure', last_sentence: 'structure',
  concession_as_premise: 'structure', topic_not_method: 'structure', method_as_flaw: 'structure', one_wrong_word: 'structure',
  detail_not_main: 'structure', wrong_function: 'structure', structure_mismatch: 'structure', topic_match: 'distractor_attraction',
  sufficient_not_necessary: 'distractor_attraction', too_strong: 'unsupported_inference', irrelevant: 'distractor_attraction',
  out_of_scope: 'unsupported_inference', unsupported: 'unsupported_inference', conceptual: 'conceptual',
  restates_premise: 'distractor_attraction', wrong_direction: 'distractor_attraction', shell_game: 'distractor_attraction',
  one_side_only: 'distractor_attraction', denies_premise: 'distractor_attraction', too_broad: 'unsupported_inference',
  extreme_wording: 'unsupported_inference', outside_knowledge: 'unsupported_inference', wrong_viewpoint: 'misread_passage',
  one_passage_only: 'misread_passage', wrong_flaw: 'distractor_attraction', principle_reversed: 'conditional_translation',
  correlation_causation: 'causal', reverse_causation: 'causal', alternative_cause: 'causal',
  unrepresentative_sample: 'statistical', base_rate: 'statistical', percent_vs_number: 'statistical',
  equivocation: 'conceptual', ad_hominem: 'conceptual',
  truth_as_support: 'conceptual', valid_means_true: 'conceptual', inductive_as_illogical: 'conceptual', sample_blind: 'statistical',
};

// Lesson-specific graduated hints, appended to an apply item's own hints so every guided item has ≥2.
const APPLY_HINTS = {
  'analysis.method': ['Describe what the argument DOES in abstract words — not its topic.', 'Check every word of your chosen answer against the argument.'],
  'analysis.role': ['Draw arrows: what supports what?', 'Is the statement supported, supporting, conceded, or opposed?'],
  'analysis.main_conclusion': ['Which claim do the others support?', 'Try “X because Y” with each candidate.'],
  'evaluation.necessary_assumption': ['Find the new idea in the conclusion that the evidence never mentions.', 'Negate each choice: which negation wrecks the argument?'],
  'evaluation.sufficient_assumption': ['Write the premise and conclusion as arrows.', 'Which choice links the premise term to the new conclusion term, in the right direction?'],
  'evaluation.strengthen': ['What is the gap between the evidence and the conclusion?', 'Which choice closes that gap or rules out an alternative explanation?'],
  'evaluation.weaken': ['What is the gap between the evidence and the conclusion?', 'Which choice gives a reason the evidence might not lead to the conclusion?'],
  'evaluation.causal': ['What correlation is the causal claim built on?', 'Check reverse causation, a common cause, and other causes.'],
  'evaluation.evaluate': ['Answer each question “yes,” then “no.”', 'Pick the one where the two answers push the conclusion in opposite directions.'],
  'evaluation.paradox': ['State the tension as “X, and yet Y.”', 'Which choice lets both facts be true at once?'],
  'inference.must_be_true': ['Accept each statement; combine them.', 'Could the facts be true while this choice is false? Then eliminate it.'],
  'inference.flaws': ['What does the conclusion claim that the evidence does not show?', 'Translate each abstract choice into this argument and check that it fits.'],
  'advanced.parallel': ['Replace topics with letters to get the form.', 'Compare conclusions first: certainty, quantifier, and direction must match.'],
  'advanced.principles': ['Translate the principle into an arrow: condition → result.', 'Find the case where every condition is met and the result matches.'],
  'rc.structure': ['Label each part of the passage by its function.', 'The answer must cover the whole passage, or name the part’s function with the right verb.'],
  'rc.author': ['Who holds each view: the author, or someone the author reports?', 'Match the strength of the author’s own words.'],
  'rc.inference': ['Find the line in the passage that supports the answer.', 'Stay one small step from the text — no outside knowledge.'],
  'rc.comparative': ['Summarize each passage in one line.', 'For agreement or disagreement, both passages must address the point.'],
  'transfer.statistics': ['Percent of what? Ask for the base.', 'Ask whether the sample resembles the group in the conclusion.'],
  'transfer.media': ['Find the underlying finding behind the headline.', 'Check causation, scope, sampling, and incentive — then judge the evidence, not the source.'],
};
const withHints = (L) => ({ ...L, items: L.items.map(it0 => {
  // Lessons with tracks: untagged items belong to the first (default) track.
  const it = L.tracks && !it0.track ? { ...it0, track: L.tracks[0].id } : it0;
  return it.stage !== 'apply' || (it.hints?.length >= 2) ? it : { ...it, hints: [...(it.hints || []), ...(APPLY_HINTS[L.skillId] || [])].slice(0, 3) };
}) });

export const LESSONS = [
  LESSON_ARGS, LESSON_TRUTH, LESSON_DEDUCTIVE,
  LESSON_NS, LESSON_NEG, LESSON_QUANT, LESSON_CHAINS,
  LESSON_MAIN, LESSON_ROLE, LESSON_METHOD,
  LESSON_NA, LESSON_SA, LESSON_STRENGTHEN, LESSON_WEAKEN, LESSON_CAUSAL, LESSON_EVALUATE, LESSON_PARADOX,
  LESSON_MBT, LESSON_FLAWS, LESSON_PARALLEL, LESSON_PRINCIPLES,
  LESSON_RC_STRUCTURE, LESSON_RC_AUTHOR, LESSON_RC_INFERENCE, LESSON_RC_COMPARATIVE,
  LESSON_STATS, LESSON_MEDIA,
].map(withHints);
export const LESSONS_BY_SKILL = Object.fromEntries(LESSONS.map(l => [l.skillId, l]));
export const LESSON_BY_ID = Object.fromEntries(LESSONS.map(l => [l.id, l]));
export const sectionForTag = (lesson, tag) => (lesson.tagToSection || {})[tag] || null;
/** Items for a track first (a Classic entry point lands on its track), then the rest. */
export function orderForTrack(items, track) {
  if (!track) return items;
  return [...items.filter(i => i.track === track), ...items.filter(i => i.track !== track)];
}
