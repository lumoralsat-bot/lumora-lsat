import test from 'node:test';
import assert from 'node:assert/strict';
import { daysUntil, planMode, validateProfile, explainProfileChange, buildDailyPlan, weeklyCheckpoint, profileFromLegacyDiagnostic, DEFAULT_MINUTES } from '../src/learning/planner.js';
import { emptyEngine, recordAttempt, lessonEvent, setStudyProfile } from '../src/learning/store.js';
import { LESSONS_BY_SKILL } from '../src/learning/content/index.js';

const NOW = new Date(2026, 9, 31, 10, 0).getTime(); // Oct 31 2026 local
const iso = (days) => { const d = new Date(NOW + days * 86400000); return d.toISOString().slice(0, 10); };
const opts = { now: NOW, lessonsById: LESSONS_BY_SKILL };
const sum = (p) => p.tasks.reduce((s, t) => s + t.minutes, 0);

test('days until / plan modes by time remaining', () => {
  assert.equal(daysUntil(iso(10), NOW), 10);
  assert.equal(daysUntil('2026-02-30', NOW), null, 'invalid calendar date');
  assert.equal(daysUntil('garbage', NOW), null);
  const m = (d) => planMode({ testDate: iso(d), testStatus: 'scheduled' }, NOW);
  assert.equal(m(100), 'foundations'); assert.equal(m(70), 'strengthen'); assert.equal(m(40), 'focus'); assert.equal(m(20), 'consolidate'); assert.equal(m(5), 'final'); assert.equal(m(-3), 'past');
  assert.equal(planMode({}, NOW), 'no_date');
  assert.equal(planMode({ testStatus: 'completed', testDate: iso(-3) }, NOW), 'no_date');
});

test('profile validation: missing, invalid, past dates; skipped fields stay unknown', () => {
  assert.equal(validateProfile({ testStatus: 'scheduled', testDate: '' }, NOW).ok, false);
  const past = validateProfile({ testStatus: 'scheduled', testDate: iso(-1) }, NOW);
  assert.equal(past.ok, false); assert.ok(past.errors[0].includes('already took'));
  const v = validateProfile({ testStatus: 'undecided', minutesPerDay: '45' }, NOW);
  assert.ok(v.ok); assert.equal(v.value.minutesPerDay, 45); assert.equal(v.value.targetScore, null); assert.equal(v.value.daysPerWeek, null);
  assert.equal(validateProfile({ targetScore: 200 }, NOW).ok, false);
  assert.equal(validateProfile({ minutesPerDay: -5 }, NOW).ok, false);
});

test('plan respects available time and offers a shorter version', () => {
  for (const minutes of [10, 20, 30, 60, 90]) {
    for (const d of [null, 100, 70, 40, 20, 5]) {
      const p = buildDailyPlan(emptyEngine(), { minutesPerDay: minutes, testDate: d == null ? null : iso(d), testStatus: d == null ? 'undecided' : 'scheduled' }, opts);
      assert.ok(sum(p) <= minutes, `${minutes} min / ${d} days → ${sum(p)}`);
      assert.ok(p.tasks.some(t => t.primary), 'has one primary objective');
      assert.ok(p.shorter && p.shorter.minutes <= 15);
    }
  }
});
test('unknown time uses a labeled default; zero time is a rest day', () => {
  const p = buildDailyPlan(emptyEngine(), {}, opts);
  assert.equal(p.budget, DEFAULT_MINUTES); assert.ok(p.notes.some(n => n.includes('default')));
  assert.ok(p.provisional);
  const r = buildDailyPlan(emptyEngine(), { minutesPerDay: 0 }, opts);
  assert.equal(r.rest, true); assert.equal(r.tasks.length, 0);
});
test('overdue reviews cannot take over the plan', () => {
  let e = emptyEngine();
  e = { ...e, reviews: Object.fromEntries(Array.from({ length: 12 }, (_, i) => ['s' + i, { skillId: 's' + i, due: NOW - 10 * 86400000, step: 0, history: [] }])) };
  const p = buildDailyPlan(e, { minutesPerDay: 30 }, opts);
  const rv = p.tasks.find(t => t.kind === 'review');
  assert.ok(rv.minutes <= 30 * 0.35 + 4); assert.ok(p.tasks.some(t => t.primary && t.kind !== 'review'));
  assert.ok(rv.reason.includes('no backlog'));
});
test('missed days do not create a backlog: tomorrow’s plan is the same size', () => {
  const prof = { minutesPerDay: 30, testDate: iso(60), testStatus: 'scheduled' };
  const a = buildDailyPlan(emptyEngine(), prof, opts);
  const b = buildDailyPlan(emptyEngine(), prof, { ...opts, now: NOW + 5 * 86400000 });
  assert.ok(sum(b) <= 30); assert.equal(a.budget, b.budget);
});
test('approaching test date adds timed work; final weeks add rest/logistics', () => {
  assert.ok(buildDailyPlan(emptyEngine(), { minutesPerDay: 45, testDate: iso(40), testStatus: 'scheduled' }, opts).tasks.some(t => t.kind === 'timed'));
  const fin = buildDailyPlan(emptyEngine(), { minutesPerDay: 45, testDate: iso(6), testStatus: 'scheduled' }, opts);
  assert.ok(fin.notes.some(n => n.includes('logistics')));
  assert.ok(!buildDailyPlan(emptyEngine(), { minutesPerDay: 45, testDate: iso(120), testStatus: 'scheduled' }, opts).tasks.some(t => t.kind === 'timed'));
});
test('past test date asks for an update instead of planning', () => {
  const p = buildDailyPlan(emptyEngine(), { testDate: iso(-2), testStatus: 'scheduled', minutesPerDay: 30 }, opts);
  assert.equal(p.needsDateUpdate, true);
});
test('a struggling student close to the test gets targeted remediation as the primary task', () => {
  let e = emptyEngine();
  for (let i = 0; i < 3; i++) e = recordAttempt(e, { id: 'w' + i, skillId: 'formal.necessary_sufficient', lessonId: 'lesson.formal.necessary_sufficient', stage: 'apply', correct: false, errorCategory: 'conditional_translation' }, NOW - i * 1000).engine;
  const p = buildDailyPlan(e, { minutesPerDay: 30, testDate: iso(30), testStatus: 'scheduled' }, opts);
  assert.ok(p.primary.title.startsWith('Targeted work'));
});
test('changing the test date explains the change and preserves history', () => {
  let e = lessonEvent(emptyEngine(), LESSONS_BY_SKILL['formal.necessary_sufficient'], { type: 'start' }, NOW).engine;
  const before = { testStatus: 'scheduled', testDate: iso(100), minutesPerDay: 30 };
  const after = { ...before, testDate: iso(30) };
  const why = explainProfileChange(before, after, NOW);
  assert.ok(why.some(w => w.includes('Planning mode changed')));
  assert.ok(why.some(w => w.includes('unchanged')));
  e = setStudyProfile(setStudyProfile(e, before, [], NOW), after, why, NOW);
  assert.equal(e.planLog.length, 2); assert.equal(e.planLog[1].testDate, iso(30));
  assert.ok(e.lessons['lesson.formal.necessary_sufficient'], 'lesson progress kept');
  const fmt = explainProfileChange({ testStatus: 'scheduled', testDate: '2027-06-12' }, { testStatus: 'scheduled', testDate: '2027-08-14' }, NOW);
  assert.ok(fmt.some(w => w.includes('different LSAT format')));
});
test('weekly checkpoint is non-punitive and evidence-based', () => {
  const w0 = weeklyCheckpoint(emptyEngine(), { daysPerWeek: 4 }, NOW);
  assert.equal(w0.daysStudied, 0); assert.equal(w0.independentAccuracy, null);
  assert.ok(!/fail|behind|missed/i.test(JSON.stringify(w0)));
});
test('legacy onboarding answers become labeled estimates, never a fake test date', () => {
  const p = profileFromLegacyDiagnostic({ study_hours: '5–10 hrs', test_date: '1–2 months', target_score: '160–164' });
  assert.equal(p.testDate, null); assert.equal(p.targetScore, 162); assert.equal(p.minutesPerDay, 60); assert.equal(p.estimatedFrom, 'onboarding');
  assert.equal(profileFromLegacyDiagnostic({}).minutesPerDay, null);
});
