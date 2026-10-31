// View-model helpers behind Home and Learn (UI acceptance criteria that can be checked without a browser).
import test from 'node:test';
import assert from 'node:assert/strict';
import { currentLearning, curriculumModules, reviewSummary, lessonStatus } from '../src/learning/navigation.js';
import { emptyEngine, lessonEvent } from '../src/learning/store.js';
import { LESSONS, LESSONS_BY_SKILL, CLASSIC_ROUTES, parseHash } from '../src/learning/content/index.js';
import { SKILLS } from '../src/learning/skills.js';

const T0 = Date.UTC(2026, 10, 1);

test('NAV-01 a new student is pointed at the first lesson, flagged as new', () => {
  const c = currentLearning(emptyEngine(), T0);
  assert.equal(c.isNewStudent, true);
  assert.equal(c.skill.id, 'found.argument_parts');
  assert.equal(c.kind, 'start');
});

test('NAV-02 a returning student continues the lesson they were in, with its stage', () => {
  const L = LESSONS_BY_SKILL['evaluation.weaken'];
  let e = lessonEvent(emptyEngine(), L, { type: 'start' }, T0).engine;
  e = lessonEvent(e, L, { type: 'complete_stage', stage: 'learn' }, T0 + 1).engine;
  const c = currentLearning(e, T0 + 2);
  assert.equal(c.skill.id, 'evaluation.weaken'); assert.equal(c.kind, 'continue');
  assert.equal(c.progress.stage, 'recognize'); assert.equal(c.progress.done, 1);
  assert.equal(lessonStatus(e, 'evaluation.weaken', c.skill.id), 'current');
});

test('NAV-03 reviews never hide the current lesson', () => {
  const L = LESSONS_BY_SKILL['found.argument_parts'];
  let e = lessonEvent(emptyEngine(), L, { type: 'start' }, T0).engine;
  e = { ...e, reviews: { 'formal.chains': { skillId: 'formal.chains', due: T0 - 1, step: 0 } } };
  assert.equal(currentLearning(e, T0).skill.id, 'found.argument_parts');
  assert.equal(reviewSummary(e, T0).due, 1);
});

test('NAV-04 modules cover every lesson exactly once; one current module', () => {
  const c = currentLearning(emptyEngine(), T0);
  const mods = curriculumModules(emptyEngine(), c.skill.id);
  const all = mods.flatMap(m => m.lessons.map(l => l.skill.id));
  assert.equal(all.length, SKILLS.length); assert.equal(new Set(all).size, LESSONS.length);
  assert.equal(mods.filter(m => m.hasCurrent).length, 1);
});

test('NAV-05 every lesson entry point resolves (skill links, track links, older type links)', () => {
  for (const s of SKILLS) assert.equal(parseHash('#learn/' + s.id).skillId, s.id);
  for (const r of CLASSIC_ROUTES) {
    const p = parseHash(`#classic/${r.section}/${encodeURIComponent(r.label)}`);
    assert.ok(LESSONS_BY_SKILL[p.skillId], r.label);
    if (r.track) assert.equal(parseHash(`#learn/${r.skillId}/${r.track}`).track, r.track);
  }
});
