// Learning-engine state, persisted inside the user record at user.learnProgress.__engine.
//
// Why there: the existing Supabase `users` table already syncs `learn_progress` (jsonb).
// Adding a new column would require a DB migration the app cannot run itself, and an
// unknown column makes every save fail. Legacy code reads learnProgress[<TypeName>] numbers
// and ignores this key. A dedicated table is recommended later (see audit, R-6).
//
// All functions are pure: (engine, input, now) -> { engine, ...effects }. The UI applies them
// via a functional user update so the attempt and its derived progress are written together.
import { assessMastery, stateRank, isIndependentCorrect, isIndependentAttempt } from './mastery.js';
import { newLessonProgress, applyLessonEvent } from './lessonEngine.js';
import { scheduleInitial, recordReview } from './review.js';
import { awardXP, xpForEvent } from './xp.js';
import { GENERATION_POLICY } from './config.js';

export const ENGINE_KEY = '__engine';
const MAX_ATTEMPTS = 1500;

export function emptyEngine() {
  return { v: 1, lessons: {}, attempts: [], mastery: {}, reviews: {}, xp: { keys: [], total: 0 }, exposure: [], genLog: [], errors: [], flags: [], recs: [] };
}
export function getEngine(user) {
  const e = user?.learnProgress?.[ENGINE_KEY];
  if (!e || e.v !== 1) return emptyEngine();
  return { ...emptyEngine(), ...e };
}
/** Returns the partial user update that writes the engine back. */
export function engineUpdate(user, engine, xpGranted = 0) {
  const upd = { learnProgress: { ...(user.learnProgress || {}), [ENGINE_KEY]: engine } };
  if (xpGranted > 0) upd.stats = { ...(user.stats || {}), xp: (user.stats?.xp || 0) + xpGranted };
  return upd;
}

export function newId(prefix = 'a') {
  const r = (typeof crypto !== 'undefined' && crypto.randomUUID) ? crypto.randomUUID() : Math.random().toString(36).slice(2) + Date.now().toString(36);
  return prefix + '_' + r;
}

/** This skill's attempts; items the student flagged as ambiguous/incorrect are excluded from scoring (raw records untouched). */
export function skillAttempts(engine, skillId) {
  const flagged = new Set((engine.flags || []).map(f => f.itemKey));
  return engine.attempts.filter(a => a.skillId === skillId).map(a => (flagged.has(a.itemId) || flagged.has(a.fingerprint)) ? { ...a, scorable: false } : a);
}

function grant(engine, key, kind, extra = {}, now) {
  const amount = xpForEvent(kind, extra);
  const { ledger, granted } = awardXP(engine.xp, key, amount, kind, now);
  engine.xp = ledger;
  return granted;
}

/** Lesson event (start / complete_stage / remediate / goto / tested_out). */
export function lessonEvent(engine0, lesson, event, now = Date.now()) {
  const engine = { ...engine0, lessons: { ...engine0.lessons } };
  const cur = engine.lessons[lesson.id] || newLessonProgress(lesson.id, lesson.version, now);
  const { progress, changed, awarded } = applyLessonEvent(cur, event, now);
  if (!changed) return { engine: engine0, xpGranted: 0, changed: false };
  engine.lessons[lesson.id] = progress;
  let xpGranted = 0;
  for (const a of awarded) xpGranted += grant(engine, a.key, a.kind, {}, now);
  if (event.type === 'tested_out' || progress.stage === 'completed') {
    engine.reviews = { ...engine.reviews, [lesson.skillId]: scheduleInitial(engine.reviews[lesson.skillId], lesson.skillId, now) };
  }
  engine.mastery = { ...engine.mastery, [lesson.skillId]: assessMastery(skillAttempts(engine, lesson.skillId), { lessonStarted: true, testedOut: progress.placement === 'tested_out', peakState: engine.mastery[lesson.skillId]?.peakState }) };
  return { engine, xpGranted, changed: true };
}

/**
 * Record an answer. Idempotent by attempt.id (double-submit / retry safe).
 * Writes: attempt (append-only), derived mastery, review schedule, error record, XP.
 */
export function recordAttempt(engine0, attempt, now = Date.now()) {
  if (!attempt?.id || engine0.attempts.some(a => a.id === attempt.id)) return { engine: engine0, xpGranted: 0, duplicate: true, mastery: engine0.mastery[attempt?.skillId] };
  const engine = { ...engine0, attempts: [...engine0.attempts, { ...attempt, ts: attempt.ts || now }], mastery: { ...engine0.mastery }, reviews: { ...engine0.reviews }, errors: [...engine0.errors] };
  if (engine.attempts.length > MAX_ATTEMPTS) engine.attempts = engine.attempts.slice(-MAX_ATTEMPTS);
  let xpGranted = 0;
  const sid = attempt.skillId;
  const prev = engine0.mastery[sid];

  if (attempt.fingerprint) engine.exposure = [...engine0.exposure.filter(f => f.id !== attempt.fingerprint.id), attempt.fingerprint].slice(-GENERATION_POLICY.exposureMemory);
  if (attempt.fingerprint) engine.attempts[engine.attempts.length - 1].fingerprint = attempt.fingerprint.id;

  if (attempt.scorable !== false && isIndependentCorrect(attempt)) {
    xpGranted += grant(engine, `ic:${attempt.id}`, 'independent_correct', {}, now);
    const open = engine.errors.filter(e => e.skillId === sid && !e.resolvedBy);
    if (open.length) {
      const e = open[open.length - 1];
      engine.errors = engine.errors.map(x => x.id === e.id ? { ...x, resolvedBy: attempt.id, resolvedAt: now } : x);
      xpGranted += grant(engine, `mc:${e.id}`, 'misconception_corrected', {}, now);
    }
  }
  if (!attempt.correct) {
    engine.errors.push({
      id: newId('err'), attemptId: attempt.id, skillId: sid, itemId: attempt.itemId, at: now,
      selected: attempt.selected, correctChoice: attempt.correctChoice, confidence: attempt.confidence || null,
      timeMs: attempt.timeMs || null, category: attempt.errorCategory || 'unclassified', categorySource: attempt.errorCategory ? 'provisional' : 'none',
      remediationSection: attempt.remediationSection || null, note: '', resolvedBy: null,
    });
    if (engine.errors.length > 400) engine.errors = engine.errors.slice(-400);
  }
  if (attempt.stage === 'review' && engine.reviews[sid]) {
    engine.reviews[sid] = recordReview(engine.reviews[sid], { attemptId: attempt.id, correct: attempt.correct, independent: isIndependentAttempt(attempt) && attempt.confidence !== 'guess' }, now);
    if (attempt.correct && isIndependentAttempt(attempt)) xpGranted += grant(engine, `rv:${attempt.id}`, 'review_success', {}, now);
  }
  const lessonP = Object.values(engine.lessons).find(l => l.lessonId === attempt.lessonId);
  const m = assessMastery(skillAttempts(engine, sid), { lessonStarted: true, testedOut: lessonP?.placement === 'tested_out', peakState: prev?.peakState });
  engine.mastery[sid] = { ...m, assessedAt: now };
  if (stateRank(m.state) > stateRank(prev?.state || 'not_started')) {
    xpGranted += grant(engine, `state:${sid}:${m.state}`, 'state_reached', { state: m.state }, now);
  }
  return { engine, xpGranted, duplicate: false, mastery: engine.mastery[sid], previousState: prev?.state || 'not_started' };
}

/** Student refines an error record (category / note). */
export function updateErrorRecord(engine, errorId, patch) {
  return { ...engine, errors: engine.errors.map(e => e.id === errorId ? { ...e, ...patch, categorySource: patch.category ? 'student' : e.categorySource } : e) };
}

/** Flag an item (ambiguous / wrong key / repeated). Flagged items stop counting toward mastery pending review. */
export function flagItem(engine0, flag, now = Date.now()) {
  if (engine0.flags.some(f => f.itemKey === flag.itemKey)) return engine0;
  const engine = { ...engine0, flags: [...engine0.flags, { ...flag, at: now }].slice(-200) };
  if (flag.skillId) {
    const prev = engine0.mastery[flag.skillId];
    engine.mastery = { ...engine0.mastery, [flag.skillId]: { ...assessMastery(skillAttempts(engine, flag.skillId), { lessonStarted: true, peakState: prev?.peakState }), assessedAt: now } };
  }
  return engine;
}

export function logGeneration(engine, entry) {
  return { ...engine, genLog: [...engine.genLog, entry].slice(-50) };
}
