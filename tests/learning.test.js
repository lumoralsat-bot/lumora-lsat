// Run with:  npm test   (uses Node's built-in test runner — no extra dependencies)
import test from 'node:test';
import assert from 'node:assert/strict';

import { parse, entails, equivalent, checkFormalItem } from '../src/learning/logic.js';
import { SKILLS, validateSkillGraph, SKILL_BY_ID } from '../src/learning/skills.js';
import { LESSON_NS } from '../src/learning/content/necessarySufficient.js';
import { TAG_TO_ERROR_CATEGORY } from '../src/learning/content/index.js';
const TAG_TO_SECTION = LESSON_NS.tagToSection;
import { assessMastery } from '../src/learning/mastery.js';
import { newLessonProgress, applyLessonEvent, recognizeCheckpoint, challengeOutcome, placementOutcome } from '../src/learning/lessonEngine.js';
import { scheduleInitial, recordReview, dueReviews } from '../src/learning/review.js';
import { awardXP } from '../src/learning/xp.js';
import { validateGeneratedQuestion, fingerprintQuestion, screenDuplicate, parseExplanation } from '../src/learning/questionValidation.js';
import { generateSkillQuestion, buildGenerationRequest, requestToPrompt } from '../src/learning/practiceEngine.js';
import { emptyEngine, recordAttempt, lessonEvent, flagItem, getEngine, engineUpdate, ENGINE_KEY } from '../src/learning/store.js';
import { recommendNext } from '../src/learning/recommend.js';
import { formatForDate, MASTERY_POLICY } from '../src/learning/config.js';

const DAY = 86400000;
const T0 = Date.UTC(2026, 9, 1);

// ─── A. Conditional logic rules (educational correctness) ──────────────────
test('contrapositive is equivalent; converse and inverse are not', () => {
  assert.ok(equivalent('A -> B', '~B -> ~A'));
  assert.ok(!equivalent('A -> B', 'B -> A'));
  assert.ok(!equivalent('A -> B', '~A -> ~B'));
  assert.ok(equivalent('B -> A', '~A -> ~B'), 'converse and inverse are equivalent to each other');
});
test('"A unless B" = ~B -> A = ~A -> B (not a biconditional)', () => {
  assert.ok(equivalent('~B -> A', '~A -> B'));
  assert.ok(equivalent('~B -> A', 'A | B'));
  assert.ok(!equivalent('~B -> A', 'B -> ~A'));
});
test('modus ponens / tollens valid; affirming consequent / denying antecedent invalid', () => {
  assert.ok(entails(['A -> B', 'A'], 'B'));
  assert.ok(entails(['A -> B', '~B'], '~A'));
  assert.ok(!entails(['A -> B', 'B'], 'A'));
  assert.ok(!entails(['A -> B', '~A'], '~B'));
});
test('chains link head-to-tail only', () => {
  assert.ok(entails(['A -> B', 'B -> C'], 'A -> C'));
  assert.ok(!entails(['A -> B', 'C -> B'], 'A -> C'));
});
test('negation of compound statements (De Morgan)', () => {
  assert.ok(equivalent('~(A & B)', '~A | ~B'));
  assert.ok(equivalent('~(A | B)', '~A & ~B'));
});
test('parser rejects malformed formulas', () => {
  assert.throws(() => parse('A ->'));
  assert.throws(() => parse('A $ B'));
});

// ─── B. Curriculum content verification ────────────────────────────────────
test('every formally-encoded lesson item has exactly one logically valid answer, and it is the key', () => {
  for (const item of LESSON_NS.items.filter(i => i.formal)) {
    const r = checkFormalItem(item);
    assert.ok(r.ok, `${item.id}: ${r.problems.join('; ')}`);
  }
});
test('learn checkpoint (classification item) is keyed to the sufficient condition', () => {
  const it = LESSON_NS.items.find(i => i.id === 'ns.l1');
  assert.equal(it.correct, 'A'); // "Whenever the alarm sounds, the doors lock": Alarm -> Lock; alarm is sufficient
  assert.ok(entails(['Alarm -> Lock', 'Alarm'], 'Lock'));
  assert.ok(!entails(['Alarm -> Lock', 'Lock'], 'Alarm'));
});
test('lesson items are complete: rationale, every distractor explained and tagged, hints on apply items', () => {
  for (const it of LESSON_NS.items) {
    assert.ok(it.rationale, it.id + ' rationale');
    assert.ok(it.choices[it.correct], it.id + ' key refers to a real choice');
    for (const L of Object.keys(it.choices)) {
      if (L === it.correct) continue;
      assert.ok(it.distractorRationales?.[L], `${it.id} missing rationale for ${L}`);
      const tag = it.distractorTags?.[L];
      assert.ok(tag && TAG_TO_ERROR_CATEGORY[tag] && TAG_TO_SECTION[tag], `${it.id} distractor ${L} has a mapped tag`);
    }
    if (it.stage === 'apply') assert.ok(it.hints?.length >= 2, it.id + ' has graduated hints');
    if (it.formal) assert.equal(Object.keys(it.formal.choices).sort().join(), Object.keys(it.choices).sort().join(), it.id + ' formal choices align');
  }
});
test('lesson has required components and enough items per stage', () => {
  for (const k of ['objective', 'why', 'sections', 'workedExamples', 'misconceptions', 'counterexample']) assert.ok(LESSON_NS[k], k);
  const n = (s) => LESSON_NS.items.filter(i => i.stage === s).length;
  assert.ok(n('recognize') >= 4); assert.ok(n('apply') >= 2); assert.ok(n('challenge') >= 2); assert.ok(n('mastery_check') >= 3);
  for (const id of LESSON_NS.placementItemIds) assert.ok(LESSON_NS.items.find(i => i.id === id), 'placement item ' + id);
  assert.notEqual(LESSON_NS.review.status, 'approved', 'must not claim human approval before a review happens');
});
test('no two lesson items are duplicates under the screening fingerprint', () => {
  const fps = LESSON_NS.items.map(i => fingerprintQuestion({ stimulus: i.stimulus, question: i.stem }));
  fps.forEach((fp, i) => assert.ok(!screenDuplicate(fp, fps.slice(0, i)).duplicate || LESSON_NS.items[i].stage === 'recognize', `item ${LESSON_NS.items[i].id} collides`));
});

// ─── C. Skill graph ────────────────────────────────────────────────────────
test('skill graph has no cycles or unknown prerequisites', () => { assert.deepEqual(validateSkillGraph(), []); });
test('cycle detection works', () => {
  const bad = [{ id: 'x', prerequisites: ['y'] }, { id: 'y', prerequisites: ['x'] }];
  assert.ok(validateSkillGraph(bad).some(p => p.startsWith('cycle')));
});
test('the full lesson skill exists and links to its lesson', () => { assert.equal(SKILL_BY_ID[LESSON_NS.skillId].lesson, 'full'); assert.ok(SKILLS.length > 20); });

// ─── D. Lesson state machine ───────────────────────────────────────────────
test('stages advance in order and completion is idempotent', () => {
  let p = newLessonProgress('L', '1', T0);
  p = applyLessonEvent(p, { type: 'start' }, T0).progress;
  assert.equal(p.stage, 'learn');
  let r = applyLessonEvent(p, { type: 'complete_stage', stage: 'learn' }, T0);
  assert.equal(r.awarded.length, 1); p = r.progress; assert.equal(p.stage, 'recognize');
  r = applyLessonEvent(p, { type: 'complete_stage', stage: 'learn' }, T0); // double-click / refresh
  assert.equal(r.changed, false); assert.equal(r.awarded.length, 0);
  for (const s of ['recognize', 'apply', 'challenge', 'mastery_check']) p = applyLessonEvent(p, { type: 'complete_stage', stage: s }, T0).progress;
  assert.equal(p.stage, 'completed'); assert.ok(p.completedAt);
});
test('remediation returns to an earlier stage without erasing history', () => {
  let p = newLessonProgress('L', '1', T0);
  for (const e of [{ type: 'start' }, { type: 'complete_stage', stage: 'learn' }, { type: 'complete_stage', stage: 'recognize' }, { type: 'complete_stage', stage: 'apply' }]) p = applyLessonEvent(p, e, T0).progress;
  p = applyLessonEvent(p, { type: 'remediate', toStage: 'apply', reason: 'x' }, T0).progress;
  assert.equal(p.stage, 'apply'); assert.ok(p.completedStages.includes('recognize')); assert.ok(!p.completedStages.includes('apply'));
  const again = applyLessonEvent(p, { type: 'complete_stage', stage: 'apply' }, T0);
  assert.equal(again.awarded.length, 1, 'engine reports the event; the XP ledger (keyed) prevents a duplicate reward');
});
test('stage checkpoints', () => {
  assert.equal(recognizeCheckpoint([{ correct: true }, { correct: false }, { correct: true }, { correct: true }]).passed, true);
  assert.equal(recognizeCheckpoint([{ correct: true }, { correct: false }, { correct: false }, { correct: true }]).passed, false);
  assert.equal(challengeOutcome([{ correct: false }, { correct: false }]).remediate, true);
  assert.equal(challengeOutcome([{ correct: true }, { correct: false }]).remediate, false);
  assert.equal(placementOutcome([1, 2, 3, 4, 5].map(() => ({ correct: true, hintsUsed: 0 }))).passed, true);
  assert.equal(placementOutcome([1, 2, 3, 4, 5].map((_, i) => ({ correct: true, confidence: i < 2 ? 'guess' : 'sure' }))).passed, false, 'guesses do not test you out');
});

// ─── E. Mastery model (adaptive-system tests from spec §16C) ───────────────
const att = (i, o = {}) => ({ id: 'x' + i, ts: T0 + i * 60000, skillId: 's', stage: 'challenge', correct: true, hintsUsed: 0, confidence: 'sure', difficulty: 2, itemId: 'item' + i, ...o });
test('one perfect set does not produce Mastered', () => {
  const m = assessMastery([0, 1, 2, 3, 4, 5, 6, 7].map(i => att(i)));
  assert.equal(m.state, 'proficient');
  assert.notEqual(m.state, 'mastered');
});
test('success with hints is not independent proficiency', () => {
  const m = assessMastery([0, 1, 2, 3, 4, 5, 6, 7].map(i => att(i, { hintsUsed: 1 })));
  assert.ok(['practicing'].includes(m.state), m.state);
  assert.ok(m.reasons.some(r => r.includes('assisted')));
});
test('lucky low-confidence guesses are not mastery', () => {
  const m = assessMastery([0, 1, 2, 3, 4, 5, 6, 7].map(i => att(i, { confidence: 'guess' })));
  assert.equal(m.state, 'practicing');
});
test('revealed answers never count as independent correct', () => {
  const m = assessMastery([0, 1, 2, 3].map(i => att(i, { revealed: true })));
  assert.equal(m.evidence.independentCorrect, 0);
});
test('success on only easy items is not proficient', () => {
  const m = assessMastery([0, 1, 2, 3, 4, 5, 6, 7].map(i => att(i, { difficulty: 1 })));
  assert.equal(m.state, 'developing');
});
test('repeating the same item does not establish breadth', () => {
  const m = assessMastery([0, 1, 2, 3, 4, 5, 6, 7].map(i => att(i, { itemId: 'same' })));
  assert.equal(m.state, 'developing');
});
test('delayed independent review promotes Proficient to Mastered', () => {
  const base = [0, 1, 2, 3, 4, 5, 6, 7].map(i => att(i));
  const late = att(99, { ts: T0 + (MASTERY_POLICY.mastered.retentionDelayDays + 1) * DAY, stage: 'review' });
  assert.equal(assessMastery([...base, late]).state, 'mastered');
});
test('failed delayed reviews mark needs-review and lower state, keeping peak', () => {
  const base = [0, 1, 2, 3, 4, 5, 6, 7].map(i => att(i));
  const late = (k, c) => att(100 + k, { ts: T0 + (4 + k) * DAY, stage: 'review', correct: c });
  const m1 = assessMastery([...base, late(0, true)]);
  const m2 = assessMastery([...base, late(0, true), late(1, false), late(2, false)], { peakState: m1.peakState });
  assert.equal(m2.needsReview, true); assert.equal(m2.state, 'developing'); assert.equal(m2.peakState, 'mastered');
});
test('one isolated error does not collapse progress', () => {
  const list = [0, 1, 2, 3, 4, 5, 6, 7].map(i => att(i)); list.push(att(8, { correct: false }));
  assert.equal(assessMastery(list).state, 'proficient');
});
test('provisional (unverified) items are excluded from mastery scoring', () => {
  const m = assessMastery([0, 1, 2, 3, 4, 5, 6, 7].map(i => att(i, { scorable: false })));
  assert.equal(m.state, 'learning'); assert.equal(m.evidence.excludedProvisional, 8);
});
test('mastery result records its policy version', () => { assert.equal(assessMastery([]).policyVersion, MASTERY_POLICY.version); });

// ─── F. Review scheduling ──────────────────────────────────────────────────
test('review intervals grow on success, reset on miss, and are idempotent', () => {
  let s = scheduleInitial(null, 'k', T0);
  assert.equal(scheduleInitial(s, 'k', T0 + 5), s, 'one active schedule per skill');
  s = recordReview(s, { attemptId: 'a', correct: true, independent: true }, T0);
  assert.equal(s.step, 1); const due1 = s.due;
  assert.equal(recordReview(s, { attemptId: 'a', correct: true, independent: true }, T0 + 10).due, due1, 'replay is a no-op');
  s = recordReview(s, { attemptId: 'b', correct: true, independent: false }, T0);
  assert.equal(s.step, 0, 'assisted success does not advance');
  assert.equal(dueReviews({ k: s }, s.due + 1).totalDue, 1);
});

// ─── G. XP idempotency ─────────────────────────────────────────────────────
test('XP cannot be duplicated by retries', () => {
  let l = { keys: [], total: 0 };
  l = awardXP(l, 'k1', 10, 'x').ledger; l = awardXP(l, 'k1', 10, 'x').ledger;
  assert.equal(l.total, 10);
});

// ─── H. Store: attempts, derived state, errors ─────────────────────────────
const lesson = LESSON_NS;
test('recording the same attempt twice (double submit) has no effect', () => {
  let e = emptyEngine();
  const a = { id: 'att1', skillId: lesson.skillId, lessonId: lesson.id, stage: 'apply', correct: true, hintsUsed: 0, confidence: 'sure', itemId: 'ns.a1', difficulty: 1 };
  const r1 = recordAttempt(e, a, T0); const r2 = recordAttempt(r1.engine, a, T0 + 1);
  assert.equal(r2.duplicate, true); assert.equal(r2.engine.attempts.length, 1); assert.equal(r2.xpGranted, 0);
});
test('a wrong answer creates an error record; a later independent success resolves it and rewards the correction once', () => {
  let e = emptyEngine();
  e = recordAttempt(e, { id: 'w1', skillId: lesson.skillId, lessonId: lesson.id, stage: 'apply', correct: false, selected: 'D', correctChoice: 'B', errorCategory: 'conditional_translation', itemId: 'ns.a1' }, T0).engine;
  assert.equal(e.errors.length, 1); assert.equal(e.errors[0].categorySource, 'provisional');
  const r = recordAttempt(e, { id: 'c1', skillId: lesson.skillId, lessonId: lesson.id, stage: 'apply', correct: true, hintsUsed: 0, confidence: 'sure', itemId: 'ns.a2' }, T0 + 1);
  assert.ok(r.engine.errors[0].resolvedBy === 'c1'); assert.ok(r.xpGranted >= 15);
});
test('lesson completion schedules a review; stage XP is not double-awarded after remediation', () => {
  let e = emptyEngine(); let total = 0;
  for (const ev of [{ type: 'start' }, ...['learn', 'recognize', 'apply', 'challenge'].map(stage => ({ type: 'complete_stage', stage }))]) { const r = lessonEvent(e, lesson, ev, T0); e = r.engine; total += r.xpGranted; }
  const before = total;
  for (const ev of [{ type: 'remediate', toStage: 'apply' }, { type: 'complete_stage', stage: 'apply' }]) { const r = lessonEvent(e, lesson, ev, T0); e = r.engine; total += r.xpGranted; }
  assert.equal(total, before, 'no duplicate stage XP');
  e = lessonEvent(e, lesson, { type: 'complete_stage', stage: 'challenge' }, T0).engine;
  e = lessonEvent(e, lesson, { type: 'complete_stage', stage: 'mastery_check' }, T0).engine;
  assert.ok(e.reviews[lesson.skillId]);
});
test('flagging an item removes it from mastery scoring', () => {
  let e = emptyEngine();
  for (let i = 0; i < 8; i++) e = recordAttempt(e, att(i, { skillId: lesson.skillId, lessonId: lesson.id, itemId: 'q' + i }), T0 + i).engine;
  assert.equal(e.mastery[lesson.skillId].state, 'proficient');
  for (let i = 0; i < 4; i++) e = flagItem(e, { itemKey: 'q' + i, skillId: lesson.skillId, reason: 'ambiguous' });
  assert.notEqual(e.mastery[lesson.skillId].state, 'proficient');
});
test('engine round-trips through the user record without touching legacy progress', () => {
  const user = { learnProgress: { Assumption: 3 }, stats: { xp: 5 } };
  const upd = engineUpdate(user, emptyEngine(), 10);
  assert.equal(upd.learnProgress.Assumption, 3); assert.ok(upd.learnProgress[ENGINE_KEY]); assert.equal(upd.stats.xp, 15);
  assert.equal(getEngine({ ...user, ...upd }).v, 1);
  assert.equal(getEngine({}).v, 1);
});

// ─── I. Question validation & duplicates ──────────────────────────────────
const goodQ = () => ({
  stimulus: 'Only members may vote. If someone votes, they attended the meeting. Ana did not attend the meeting.',
  question: 'Which must be true?', choices: { A: 'Ana voted.', B: 'Ana did not vote.', C: 'Ana is a member.', D: 'All members attended.', E: 'Ana will attend later.' },
  correct: 'B', explanation: 'CORRECT (B): contrapositive. WRONG (A): contradicts. WRONG (C): unsupported. WRONG (D): unsupported. WRONG (E): out of scope.',
});
test('schema validation accepts a well-formed item', () => {
  const v = validateGeneratedQuestion(goodQ()); assert.ok(v.ok, v.errors.join()); assert.deepEqual(v.warnings, []);
  assert.equal(Object.keys(v.question.answer.distractor_rationales).length, 4);
});
test('schema validation rejects malformed output', () => {
  assert.equal(validateGeneratedQuestion(null).ok, false);
  assert.equal(validateGeneratedQuestion({ ...goodQ(), choices: { A: 'x', B: 'y', C: 'z', D: 'w' } }).ok, false, 'missing choice');
  assert.equal(validateGeneratedQuestion({ ...goodQ(), correct: 'F' }).ok, false, 'key to nonexistent choice');
  assert.equal(validateGeneratedQuestion({ ...goodQ(), explanation: 'CORRECT (C): ... WRONG (A): ...' }).ok, false, 'explanation contradicts key');
  assert.equal(validateGeneratedQuestion({ ...goodQ(), explanation: 'CORRECT (B): x CORRECT (D): y' }).ok, false, 'two answers marked correct');
  assert.equal(validateGeneratedQuestion({ ...goodQ(), choices: { ...goodQ().choices, E: 'Ana voted.' } }).ok, false, 'duplicate choices');
});
test('explanation parser extracts per-choice rationales', () => {
  const p = parseExplanation(goodQ().explanation); assert.deepEqual(p.correctLetters, ['B']); assert.ok(p.distractors.E.includes('scope'));
});
test('duplicate screening: exact, superficial edit, and same-structure-new-nouns', () => {
  const base = fingerprintQuestion({ stimulus: 'The council will approve the transit plan only if the environmental review is finished. The council approved the transit plan.', question: 'Which must be true?' });
  const exact = fingerprintQuestion({ stimulus: 'The council will approve the transit plan only if the environmental review is finished. The council approved the transit plan.', question: 'Which must be true?' });
  const punct = fingerprintQuestion({ stimulus: 'The council will approve the transit plan only if the environmental review is finished; the council approved the transit plan!', question: 'Which must be true?' });
  const swapped = fingerprintQuestion({ stimulus: 'The Senate will approve the housing bill only if the economic analysis is finished. The Senate approved the housing bill.', question: 'Which must be true?' });
  const fresh = fingerprintQuestion({ stimulus: 'Whenever the reservoir falls below forty percent, lawn watering is restricted. Watering is currently unrestricted, and the pumps were inspected.', question: 'Which must be true?' });
  assert.equal(screenDuplicate(exact, [base]).kind, 'exact');
  assert.ok(screenDuplicate(punct, [base]).duplicate, 'punctuation-only edit');
  assert.ok(screenDuplicate(swapped, [base]).duplicate, 'name/noun swap: ' + JSON.stringify(screenDuplicate(swapped, [base])));
  assert.equal(screenDuplicate(fresh, [base]).duplicate, false, 'a genuinely different item passes');
});

// ─── J. Practice engine with mocked provider ───────────────────────────────
const parseJSON = (s) => JSON.parse(s);
const ctx = { skillId: 'formal.necessary_sufficient', stage: 'challenge', difficulty: 2 };
const rng = () => 0.3; // deterministic: correct letter = B
test('generation request carries lesson context', () => {
  const req = buildGenerationRequest({ ...ctx, recentErrorTags: ['converse'] }, rng);
  assert.equal(req.context.skill_id, ctx.skillId); assert.equal(req.context.lesson_stage, 'challenge');
  const prompt = requestToPrompt(req);
  assert.ok(prompt.includes('Must Be True')); assert.ok(prompt.includes('converse')); assert.ok(prompt.includes('choice B'));
});
test('approved path: valid item + agreeing verifier', async () => {
  const calls = [];
  const callModel = async (sys, msg) => { calls.push(sys); return calls.length === 1 ? JSON.stringify(goodQ()) : JSON.stringify({ answer: 'B', confidence: 'high', ambiguous: false, second_defensible: null }); };
  const r = await generateSkillQuestion(ctx, { callModel, practiceSystem: 'SYS', parseJSON, lesson, rng });
  assert.equal(r.status, 'approved'); assert.equal(r.question.scorable, true); assert.equal(r.question.source, 'generated');
  assert.equal(calls[0], 'SYS', 'uses the existing PRACTICE_SYSTEM prompt');
});
test('verifier disagreement rejects the item and regenerates', async () => {
  const callModel = async (sys) => sys === 'S' ? JSON.stringify(goodQ()) : JSON.stringify({ answer: 'D', confidence: 'high' });
  const r = await generateSkillQuestion(ctx, { callModel, practiceSystem: 'S', parseJSON, lesson, rng });
  assert.equal(r.status, 'fallback'); assert.ok(r.log.outcomes.every(o => o.reason === 'logic_mismatch'));
});
test('invalid JSON / malformed output falls back to labeled authored practice', async () => {
  const callModel = async () => 'not json at all';
  const r = await generateSkillQuestion(ctx, { callModel, practiceSystem: 'S', parseJSON, lesson, rng });
  assert.equal(r.status, 'fallback'); assert.equal(r.question.source, 'fallback'); assert.equal(r.log.attempts, 3);
});
test('provider timeout falls back without crashing', async () => {
  const callModel = async () => { throw new Error('The AI provider timed out.'); };
  const r = await generateSkillQuestion(ctx, { callModel, practiceSystem: 'S', parseJSON, lesson, rng });
  assert.equal(r.status, 'fallback'); assert.ok(r.question.content.stimulus);
});
test('not-configured error stops retrying immediately', async () => {
  let n = 0; const callModel = async () => { n++; throw new Error('AI is not configured on the server'); };
  await generateSkillQuestion(ctx, { callModel, practiceSystem: 'S', parseJSON, lesson, rng }); assert.equal(n, 1);
});
test('verifier unavailable → provisional item, excluded from mastery scoring', async () => {
  let n = 0; const callModel = async () => { n++; if (n === 1) return JSON.stringify(goodQ()); throw new Error('network'); };
  const r = await generateSkillQuestion(ctx, { callModel, practiceSystem: 'S', parseJSON, lesson, rng });
  assert.equal(r.status, 'provisional'); assert.equal(r.question.scorable, false);
});
test('previously exposed items are screened out', async () => {
  const fp = fingerprintQuestion(validateGeneratedQuestion(goodQ()).question);
  const callModel = async (sys) => sys === 'S' ? JSON.stringify(goodQ()) : JSON.stringify({ answer: 'B' });
  const r = await generateSkillQuestion(ctx, { callModel, practiceSystem: 'S', parseJSON, lesson, rng, exposure: [fp] });
  assert.equal(r.status, 'fallback'); assert.ok(r.log.outcomes.every(o => o.reason.startsWith('duplicate')));
});
test('item testing the wrong skill is rejected', async () => {
  const off = { ...goodQ(), stimulus: 'Sales rose 10 percent after the ad campaign launched. Analysts credit the campaign.' };
  const callModel = async (sys) => sys === 'S' ? JSON.stringify(off) : JSON.stringify({ answer: 'B' });
  const r = await generateSkillQuestion(ctx, { callModel, practiceSystem: 'S', parseJSON, lesson, rng });
  assert.ok(r.log.outcomes.some(o => o.reason === 'skill_alignment'));
});
test('no provider at all → fallback, and nothing when no authored items remain', async () => {
  const r = await generateSkillQuestion(ctx, { callModel: null, lesson, rng });
  assert.equal(r.status, 'fallback');
  const none = await generateSkillQuestion(ctx, { callModel: null, lesson: { items: [] }, rng });
  assert.equal(none.status, 'failed'); assert.equal(none.question, null);
});

// ─── K. Recommendation & format config ─────────────────────────────────────
const lessonsById = { [lesson.skillId]: lesson };
test('new student is told to start the first full lesson, with a reason', () => {
  const r = recommendNext(emptyEngine(), { lessonsById, now: T0 });
  assert.equal(r.kind, 'lesson'); assert.ok(r.reason.length > 20);
});
test('due reviews come first; in-progress lessons are resumed', () => {
  let e = lessonEvent(emptyEngine(), lesson, { type: 'start' }, T0).engine;
  assert.ok(recommendNext(e, { lessonsById, now: T0 }).title.startsWith('Continue'));
  e = { ...e, reviews: { [lesson.skillId]: { skillId: lesson.skillId, due: T0 - 1, step: 0, history: [] } } };
  assert.equal(recommendNext(e, { lessonsById, now: T0 }).kind, 'review');
});
test('LSAT format is date-aware (Aug 2027 change)', () => {
  assert.equal(formatForDate('2026-11-14').id, 'lsat-2024-08');
  assert.equal(formatForDate('2027-06-12').id, 'lsat-2024-08');
  assert.equal(formatForDate('2027-08-14').id, 'lsat-2027-08');
});
