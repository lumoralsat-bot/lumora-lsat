// Deterministic mastery assessment. Raw attempts are immutable evidence; mastery is DERIVED
// and records the policy version used. No UI or AI response can set mastery directly.
import { MASTERY_POLICY } from './config.js';

export const STATES = ['not_started', 'learning', 'practicing', 'developing', 'proficient', 'mastered'];
export const STATE_LABELS = {
  not_started: 'Not Started', learning: 'Learning', practicing: 'Practicing',
  developing: 'Developing', proficient: 'Proficient', mastered: 'Mastered',
};
const DAY = 86400000;

/** Independent = correct with no hints, no revealed answer, not self-marked as a guess. */
export function isIndependentCorrect(a) {
  return !!a.correct && !a.revealed && (a.hintsUsed || 0) === 0 && a.confidence !== 'guess';
}
export function isIndependentAttempt(a) { return !a.revealed && (a.hintsUsed || 0) === 0; }

/**
 * @param {object[]} attempts - this skill's attempts (any order)
 * @param {{lessonStarted?:boolean, testedOut?:boolean, peakState?:string, explanationOk?:boolean, unresolvedMisconceptions?:string[]}} ctx
 * @returns {{state, needsReview, reasons:string[], evidence:object, policyVersion}}
 */
export function assessMastery(attempts = [], ctx = {}, policy = MASTERY_POLICY) {
  const all = [...attempts].sort((a, b) => a.ts - b.ts);
  // Only validated, scorable items in scorable stages count. Excluded: provisional/disputed items.
  const scorable = all.filter(a => policy.scorableStages.includes(a.stage) && a.scorable !== false);
  const correct = scorable.filter(a => a.correct);
  const indep = scorable.filter(isIndependentAttempt);
  const indepCorrect = scorable.filter(isIndependentCorrect);
  const assisted = correct.filter(a => !isIndependentCorrect(a));
  const lowConfCorrect = correct.filter(a => a.confidence === 'guess');
  const distinctItems = new Set(indepCorrect.map(a => a.fingerprint || a.itemId)).size;
  // Question "structure": generated items carry a structural fingerprint; authored items an explicit
  // structure key, else their stem form. An approximation — documented in docs/CURRICULUM_TRACEABILITY.md.
  const distinctStructures = new Set(indepCorrect.map(a => a.structure || a.itemId)).size;
  const mixedCorrect = scorable.filter(a => a.mixed && isIndependentCorrect(a));
  const unresolved = ctx.unresolvedMisconceptions || [];
  const explanationOk = !policy.proficient.requireExplanation || !!ctx.explanationOk;
  const harderCorrect = indepCorrect.filter(a => (a.difficulty || 1) >= policy.proficient.harderDifficulty).length;
  const firstTs = all.length ? all[0].ts : null;
  const delayed = scorable.filter(a => firstTs && (a.ts - firstTs) >= policy.mastered.retentionDelayDays * DAY && ['review', 'mastery_check'].includes(a.stage) && isIndependentAttempt(a));
  const delayedCorrect = delayed.filter(isIndependentCorrect);

  const evidence = {
    scorable: scorable.length, correct: correct.length, independentCorrect: indepCorrect.length,
    assistedCorrect: assisted.length, lowConfidenceCorrect: lowConfCorrect.length,
    distinctItems, distinctStructures, harderCorrect, delayedAttempts: delayed.length, delayedCorrect: delayedCorrect.length,
    mixedCorrect: mixedCorrect.length, explanationOk, unresolvedMisconceptions: unresolved.length,
    excludedProvisional: all.filter(a => a.scorable === false).length,
  };
  const reasons = [];
  const recentAcc = (list, n) => { const r = list.slice(-n); return r.length ? r.filter(x => x.correct).length / r.length : 0; };
  const recentIndepAcc = (n) => { const r = indep.slice(-n); return r.length ? r.filter(isIndependentCorrect).length / r.length : 0; };

  let state = 'not_started';
  if (ctx.lessonStarted || all.length > 0) state = 'learning';
  const P = policy;
  if (scorable.length >= P.practicing.minScorable && correct.length >= P.practicing.minCorrect) state = 'practicing';
  if (scorable.length >= P.developing.minScorable && indepCorrect.length >= P.developing.minIndependentCorrect && recentAcc(scorable, P.developing.recentWindow) >= P.developing.recentAccuracy) state = 'developing';
  const proficientOk = indep.length >= P.proficient.minIndependent
    && recentIndepAcc(P.proficient.recentWindow) >= P.proficient.recentIndependentAccuracy
    && harderCorrect >= P.proficient.minHarderCorrect
    && distinctItems >= P.proficient.minDistinctItems
    && distinctStructures >= (P.proficient.minDistinctStructures || 1)
    && explanationOk && unresolved.length === 0;
  if (state === 'developing' && proficientOk) state = 'proficient';
  const lastDelayed = delayed[delayed.length - 1];
  if (state === 'proficient' && delayedCorrect.length >= P.mastered.minDelayedCorrect && lastDelayed && isIndependentCorrect(lastDelayed)
    && mixedCorrect.length >= (P.mastered.minMixedCorrect || 0)) state = 'mastered';

  // Retention decay: recent delayed checks failing → needs review (history preserved via peakState)
  let needsReview = false;
  const k = P.needsReview.failedDelayedInARow;
  const lastK = delayed.slice(-k);
  if (lastK.length === k && lastK.every(a => !a.correct)) {
    needsReview = true;
    if (STATES.indexOf(state) > STATES.indexOf('developing')) state = 'developing';
  }

  // Human-readable reasons (no false precision)
  if (state === 'not_started') reasons.push('No activity on this skill yet.');
  if (state === 'learning') reasons.push(scorable.length ? 'You have started, but there are not yet enough practice answers to judge reliability.' : 'Lesson started; no scored practice yet.');
  if (assisted.length) reasons.push(`${assisted.length} correct answer${assisted.length > 1 ? 's' : ''} used hints, a revealed answer, or were marked as guesses — these count as assisted, not independent.`);
  if (state === 'practicing') reasons.push(`Independent correct answers so far: ${indepCorrect.length}. Developing needs ${P.developing.minIndependentCorrect} with recent accuracy of at least ${Math.round(P.developing.recentAccuracy * 100)}%.`);
  if (state === 'developing' && !proficientOk) {
    const need = [];
    if (indep.length < P.proficient.minIndependent) need.push(`${P.proficient.minIndependent - indep.length} more unassisted answers`);
    if (harderCorrect < P.proficient.minHarderCorrect) need.push('more success on harder (challenge-level) items');
    if (distinctItems < P.proficient.minDistinctItems) need.push(`${P.proficient.minDistinctItems - distinctItems} more different questions answered correctly on your own`);
    if (distinctStructures < (P.proficient.minDistinctStructures || 1)) need.push('success on more kinds of question, not just one format');
    if (!explanationOk) need.push('an explanation in your own words (the Explain & reflect stage)');
    if (unresolved.length) need.push('fixing a repeated mistake: ' + unresolved.slice(0, 2).join(', '));
    if (recentIndepAcc(P.proficient.recentWindow) < P.proficient.recentIndependentAccuracy) need.push('higher recent unassisted accuracy');
    if (need.length) reasons.push('To reach Proficient: ' + need.join('; ') + '.');
  }
  if (state === 'proficient') reasons.push(`Reliable, unassisted performance. Mastered requires a correct, unassisted review at least ${P.mastered.retentionDelayDays} days after you first practiced this skill${P.mastered.minMixedCorrect ? ', plus a correct answer in mixed review (where the question type is not named)' : ''}.`);
  if (state === 'mastered') reasons.push('Reliable unassisted performance, including a delayed retention check and mixed review.');
  if (needsReview) reasons.push('Your recent delayed reviews were missed, so this skill needs review. Your earlier progress is still recorded.');
  if (ctx.testedOut) reasons.push('You tested out of the introductory lesson; the placement results count as evidence but not as mastery on their own.');

  return { state, needsReview, reasons, evidence, policyVersion: policy.version, peakState: higher(ctx.peakState, state) };
}

function higher(a, b) { if (!a) return b; return STATES.indexOf(a) >= STATES.indexOf(b) ? a : b; }
export function stateRank(s) { return STATES.indexOf(s); }
