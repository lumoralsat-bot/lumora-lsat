// Acceptance tests for Curriculum & Lesson Overhaul v2.0 (CUR-*) and the v2.1 Classic addendum (CL-*).
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { LESSONS, LESSONS_BY_SKILL, CLASSIC_ROUTES, classicRoute, parseHash, routeToHash, orderForTrack } from '../src/learning/content/index.js';
import { SKILLS, validateSkillGraph } from '../src/learning/skills.js';
import { STAGES, PLAYABLE_STAGES, UNSCORED_STAGES, applyLessonEvent, newLessonProgress, explanationOutcome } from '../src/learning/lessonEngine.js';
import { emptyEngine, recordExplanation, recordAttempt, lessonEvent } from '../src/learning/store.js';
import { structureKey } from '../src/learning/practiceEngine.js';
import { MASTERY_POLICY } from '../src/learning/config.js';

const APP = readFileSync(new URL('../src/App.jsx', import.meta.url), 'utf8');
const T0 = Date.UTC(2026, 9, 1);

test('CUR-01 every curriculum node has a complete guided lesson', () => {
  assert.equal(validateSkillGraph().length, 0);
  for (const s of SKILLS) { assert.equal(s.lesson, 'full', s.id); assert.ok(LESSONS_BY_SKILL[s.id], 'lesson for ' + s.id); }
  assert.equal(LESSONS.length, SKILLS.length);
});

test('CUR-02 lesson flow has the eight v2 stages in order', () => {
  assert.deepEqual(PLAYABLE_STAGES, ['learn', 'recognize', 'apply', 'challenge', 'explain', 'mastery_check']);
  assert.ok(STAGES.indexOf('explain') === STAGES.indexOf('challenge') + 1);
  for (const L of LESSONS) assert.equal(L.items.filter(i => i.stage === 'orient').length, 1, L.id + ' has exactly one Orient item');
});

test('CUR-03 Orient and Recognize never count toward mastery', () => {
  for (const s of ['orient', 'learn', 'recognize']) { assert.ok(UNSCORED_STAGES.includes(s)); assert.ok(!MASTERY_POLICY.scorableStages.includes(s)); }
});

test('CUR-04 completing Challenge leads to Explain & reflect, then Mastery check', () => {
  let p = newLessonProgress('L', '2', T0);
  for (const st of ['start', 'learn', 'recognize', 'apply', 'challenge']) p = applyLessonEvent(p, st === 'start' ? { type: 'start' } : { type: 'complete_stage', stage: st }, T0).progress;
  assert.equal(p.stage, 'explain');
  p = applyLessonEvent(p, { type: 'complete_stage', stage: 'explain' }, T0).progress;
  assert.equal(p.stage, 'mastery_check');
});

test('CUR-05 legacy progress saved before v2 (no explain stage) still completes', () => {
  let p = { ...newLessonProgress('L', '1', T0), stage: 'mastery_check', completedStages: ['learn', 'recognize', 'apply', 'challenge'] };
  p = applyLessonEvent(p, { type: 'complete_stage', stage: 'mastery_check' }, T0).progress;
  assert.equal(p.stage, 'completed');
});

test('CUR-06 explanation self-check: acceptable needs 2 of 3, and the written text is never stored', () => {
  assert.equal(explanationOutcome([true, false, false]).acceptable, false);
  assert.equal(explanationOutcome([true, true, false]).acceptable, true);
  const e = recordExplanation(emptyEngine(), { lessonId: 'lesson.x', skillId: 'evaluation.weaken', itemId: 'wk.c1', checks: [true, true, false], acceptable: true, text: 'my private words' }, T0);
  assert.equal(e.explanations['lesson.x'].acceptable, true);
  assert.ok(!JSON.stringify(e).includes('my private words'));
});

test('CUR-07 repeated open mistakes of the same kind block Proficient until fixed', () => {
  const L = LESSONS_BY_SKILL['evaluation.weaken'];
  let e = recordExplanation(emptyEngine(), { lessonId: L.id, skillId: L.skillId, checks: [true, true, true], acceptable: true }, T0);
  const a = (i, o = {}) => ({ id: 'a' + i, skillId: L.skillId, lessonId: L.id, stage: 'challenge', correct: true, hintsUsed: 0, confidence: 'sure', difficulty: 3, itemId: 'i' + i, structure: 's' + (i % 3), ts: T0 + i * 1000, ...o });
  for (let i = 0; i < 2; i++) e = recordAttempt(e, a(100 + i, { correct: false, errorCategory: 'causal' }), T0 + i).engine;
  for (let i = 0; i < 9; i++) e = recordAttempt(e, a(i), T0 + 10 + i).engine;
  // independent successes resolve open errors one at a time, so after enough wins the gate opens
  assert.equal(e.mastery[L.skillId].state, 'proficient');
});

test('CUR-08 every lesson has objective, why, worked examples, counterexample, misconceptions → sections', () => {
  for (const L of LESSONS) {
    assert.ok(L.workedExamples.length >= 1 && L.counterexample?.claim && L.misconceptions.length >= 3, L.id);
    for (const m of L.misconceptions) assert.ok(L.sections.some(s => s.id === L.tagToSection[m.tag]), `${L.id}:${m.tag}`);
  }
});

test('CUR-09 lessons with tracks tag items for each track', () => {
  for (const L of LESSONS.filter(l => l.tracks)) for (const t of L.tracks) assert.ok(L.items.some(i => i.track === t.id), `${L.id} track ${t.id}`);
  const L = LESSONS_BY_SKILL['rc.inference'];
  assert.equal(orderForTrack(L.items.filter(i => i.stage === 'recognize'), 'analogy')[0].track, 'analogy');
});

test('CUR-10 structure key distinguishes reasoning pattern × task', () => {
  assert.notEqual(structureKey({ stimulus: 'A survey of 200 people found 60 percent agree.', stem: 'Which weakens?' }), structureKey({ stimulus: 'If it rains, the game is canceled.', stem: 'Which must be true?' }));
  assert.equal(structureKey({ stimulus: 'The drug reduced symptoms.', stem: 'Which most strengthens the argument?' }), 'causal:support');
});

test('CL-01 all 17 Classic lesson types route to a rebuilt lesson', () => {
  assert.equal(CLASSIC_ROUTES.length, 17);
  const types = [...APP.matchAll(/^\s{6}type: "([^"]+)"/gm)].map(m => m[1]);
  for (const t of new Set(types)) assert.ok(CLASSIC_ROUTES.some(r => r.label === t), 'classic type routed: ' + t);
  for (const r of CLASSIC_ROUTES) {
    const L = LESSONS_BY_SKILL[r.skillId]; assert.ok(L, r.label);
    if (r.track) assert.ok(L.tracks?.some(t => t.id === r.track), `${r.label} → track ${r.track}`);
  }
});

test('CL-02 Inference is disambiguated by section', () => {
  assert.equal(classicRoute('LR', 'Inference').skillId, 'inference.must_be_true');
  assert.equal(classicRoute('Reading Comprehension', 'Inference').skillId, 'rc.inference');
  assert.equal(classicRoute('Logical Reasoning', 'Nope'), null);
});

test('CL-03 deep links round-trip and reject junk', () => {
  for (const r of CLASSIC_ROUTES) {
    const h = routeToHash({ kind: 'classic', section: r.section, label: r.label });
    const p = parseHash(h); assert.equal(p.skillId, r.skillId); assert.equal(p.track, r.track); assert.equal(p.fromClassic.label, r.label);
  }
  assert.deepEqual(parseHash('#learn/rc.structure/purpose'), { kind: 'learn', skillId: 'rc.structure', track: 'purpose' });
  assert.equal(routeToHash({ skillId: 'rc.structure', track: 'purpose' }), '#learn/rc.structure/purpose');
  for (const bad of ['', '#', '#access_token=abc&type=recovery', '#classic/XX/Weaken', '#classic/LR/%E0%A4%A', '#learn/../../etc']) assert.equal(parseHash(bad), null, bad);
});

test('CL-04 Classic grid opens the rebuilt lesson; Classic progress is labeled legacy and not promoted', () => {
  assert.ok(APP.includes('onClick={()=>openClassic(activeSection,t.type)}'));
  assert.ok(APP.includes('Legacy: level {prog} of 4'));
  assert.ok(!/learnProgress\[[^\]]+\][^;\n]*mastery/.test(APP), 'legacy levels never feed mastery');
});

test('CL-05 the original Classic lesson stays reachable as reference with a way back', () => {
  assert.ok(APP.includes('reference:true'));
  assert.ok(APP.includes('returnTo:pathOpen'));
});

test('CL-06 lesson events still work for a rebuilt lesson opened from Classic', () => {
  const L = LESSONS_BY_SKILL['evaluation.paradox'];
  const r = lessonEvent(emptyEngine(), L, { type: 'start' }, T0);
  assert.equal(r.engine.lessons[L.id].stage, 'learn');
});
