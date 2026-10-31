import test from 'node:test';
import assert from 'node:assert/strict';
import { evaluateAchievements, learningLevel, ACHIEVEMENTS } from '../src/learning/achievements.js';
import { emptyEngine, recordAttempt } from '../src/learning/store.js';

const T0 = Date.UTC(2026, 9, 1);
const a = (i, o = {}) => ({ id: 'a' + i, skillId: 's', lessonId: 'l', stage: 'challenge', correct: true, hintsUsed: 0, confidence: 'sure', itemId: 'i' + i, difficulty: 2, ts: T0 + i * 1000, ...o });

test('volume alone earns nothing: 50 guessed or hinted answers give no achievements', () => {
  let e = emptyEngine();
  for (let i = 0; i < 25; i++) e = recordAttempt(e, a(i, { confidence: 'guess' }), T0 + i).engine;
  for (let i = 25; i < 50; i++) e = recordAttempt(e, a(i, { hintsUsed: 2 }), T0 + i).engine;
  const ids = (e.achievements || []).map(x => x.id);
  assert.ok(!ids.includes('independent_10')); assert.ok(!ids.includes('calibrated'));
});
test('corrected misconception is rewarded exactly once', () => {
  let e = recordAttempt(emptyEngine(), a(1, { correct: false }), T0).engine;
  const r = recordAttempt(e, a(2), T0 + 1);
  assert.ok(r.newAchievements.includes('misconception_fixed'));
  const again = evaluateAchievements(r.engine, T0 + 2);
  assert.equal(again.xpGranted, 0); assert.equal(again.newly.length, 0);
});
test('calibration requires "Sure" answers to actually be right', () => {
  let e = emptyEngine();
  for (let i = 0; i < 10; i++) e = recordAttempt(e, a(i, { correct: i % 2 === 0 }), T0 + i).engine;
  assert.ok(!(e.achievements || []).some(x => x.id === 'calibrated'));
  let f = emptyEngine();
  for (let i = 0; i < 10; i++) f = recordAttempt(f, a(i), T0 + i).engine;
  assert.ok(f.achievements.some(x => x.id === 'calibrated'));
});
test('routine achievement needs 3 different days within a week, and is never revoked', () => {
  let e = emptyEngine(); const D = 86400000;
  e = recordAttempt(e, a(1, { ts: T0 }), T0).engine; e = recordAttempt(e, a(2, { ts: T0 + 2 * D }), T0).engine;
  assert.ok(!(e.achievements || []).some(x => x.id === 'routine_week'));
  e = recordAttempt(e, a(3, { ts: T0 + 5 * D }), T0).engine;
  assert.ok(e.achievements.some(x => x.id === 'routine_week'));
});
test('every achievement has a unique id and a positive reward; learning level grows from learning XP', () => {
  assert.equal(new Set(ACHIEVEMENTS.map(x => x.id)).size, ACHIEVEMENTS.length);
  assert.ok(ACHIEVEMENTS.every(x => x.xp > 0));
  assert.equal(learningLevel({ xp: { total: 0 } }).level, 1);
  assert.equal(learningLevel({ xp: { total: 100 } }).level, 2);
});
