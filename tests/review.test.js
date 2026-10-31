import test from 'node:test';
import assert from 'node:assert/strict';
import { weakSkills } from '../src/learning/journal.js';
import { emptyEngine, recordAttempt, updateErrorRecord } from '../src/learning/store.js';

const T0 = Date.UTC(2026, 9, 1);
const miss = (id, cat, extra = {}) => ({ id, skillId: 'formal.necessary_sufficient', lessonId: 'lesson.formal.necessary_sufficient', stage: 'apply', correct: false, selected: 'A', correctChoice: 'B', errorCategory: cat, itemSnapshot: { stimulus: 'S', stem: 'Q', selectedText: 'a', correctText: 'b' }, ...extra });

test('error records keep a short snapshot; attempts stay lean', () => {
  const e = recordAttempt(emptyEngine(), miss('m1', 'conditional_translation'), T0).engine;
  assert.equal(e.errors[0].snapshot.stimulus, 'S');
  assert.equal(e.attempts[0].itemSnapshot, undefined);
});
test('student can refine category and add a note; unknown fields are ignored; notes are length-capped', () => {
  let e = recordAttempt(emptyEngine(), miss('m1', 'conditional_translation'), T0).engine;
  e = updateErrorRecord(e, e.errors[0].id, { category: 'careless', note: 'x'.repeat(5000), resolvedBy: 'hack', skillId: 'other' });
  assert.equal(e.errors[0].category, 'careless'); assert.equal(e.errors[0].categorySource, 'student');
  assert.equal(e.errors[0].note.length, 1000); assert.equal(e.errors[0].resolvedBy, null); assert.equal(e.errors[0].skillId, 'formal.necessary_sufficient');
});
test('weak skills need repeated, recent, unresolved evidence — one miss is not a pattern', () => {
  let e = recordAttempt(emptyEngine(), miss('m1', 'conditional_translation'), T0).engine;
  assert.equal(weakSkills(e, T0).length, 0);
  e = recordAttempt(e, miss('m2', 'conditional_translation'), T0).engine;
  const w = weakSkills(e, T0); assert.equal(w.length, 1); assert.ok(w[0].reason.includes('Conditional translation'));
  assert.equal(weakSkills(e, T0 + 40 * 86400000).length, 0, 'old mistakes age out');
  e = updateErrorRecord(e, e.errors[0].id, { archived: true });
  assert.equal(weakSkills(e, T0).length, 0, 'archived mistakes do not count');
});
