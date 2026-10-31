// Lesson stage state machine. Pure functions over a serializable progress object.
// Transitions are idempotent: replaying the same event (refresh, double-click) is a no-op.
import { LESSON_POLICY } from './config.js';

export const STAGES = ['not_started', 'learn', 'recognize', 'apply', 'challenge', 'mastery_check', 'completed'];
export const STAGE_LABELS = { learn: 'Learn', recognize: 'Recognize', apply: 'Apply', challenge: 'Challenge', mastery_check: 'Mastery check', completed: 'Completed' };
export const PLAYABLE_STAGES = ['learn', 'recognize', 'apply', 'challenge', 'mastery_check'];

export function newLessonProgress(lessonId, version, now = Date.now()) {
  return { lessonId, version, stage: 'not_started', completedStages: [], startedAt: null, updatedAt: now, completedAt: null, placement: null, remediation: null, stageEpoch: {}, events: [] };
}

function nextStage(stage) { const i = STAGES.indexOf(stage); return STAGES[Math.min(STAGES.length - 1, i + 1)]; }

/**
 * Apply an event. Returns { progress, changed, awarded: [{key, kind, stage}] }.
 * Events: {type:'start'} | {type:'complete_stage', stage} | {type:'remediate', toStage, reason}
 *         | {type:'goto', stage} (replay/review without resetting evidence)
 *         | {type:'tested_out'}
 */
export function applyLessonEvent(progress, event, now = Date.now()) {
  const p = { ...progress, completedStages: [...(progress.completedStages || [])], events: [...(progress.events || [])] };
  const awarded = [];
  switch (event.type) {
    case 'start':
      if (p.stage !== 'not_started') return { progress, changed: false, awarded };
      p.stage = 'learn'; p.startedAt = now; break;
    case 'complete_stage': {
      const st = event.stage;
      if (!PLAYABLE_STAGES.includes(st)) return { progress, changed: false, awarded };
      if (p.completedStages.includes(st)) {
        // Idempotent: already completed. Still allow moving the pointer forward if it lags.
        if (p.stage === st) { p.stage = nextStage(st); p.updatedAt = now; return { progress: p, changed: true, awarded }; }
        return { progress, changed: false, awarded };
      }
      p.completedStages.push(st);
      awarded.push({ key: `stage:${p.lessonId}:${st}`, kind: 'stage_complete', stage: st });
      if (p.stage === st || STAGES.indexOf(p.stage) < STAGES.indexOf(st)) p.stage = nextStage(st);
      if (p.remediation && p.remediation.toStage === st) p.remediation = null;
      if (p.stage === 'completed' && !p.completedAt) p.completedAt = now;
      break;
    }
    case 'remediate':
      // Return to an earlier stage WITHOUT erasing completion history or attempts.
      if (!PLAYABLE_STAGES.includes(event.toStage)) return { progress, changed: false, awarded };
      p.remediation = { toStage: event.toStage, reason: event.reason || null, from: p.stage, at: now };
      // Stages from the remediation point onward restart their checkpoints (old attempts stay in history).
      p.stageEpoch = { ...(p.stageEpoch || {}) };
      for (const s of PLAYABLE_STAGES.slice(PLAYABLE_STAGES.indexOf(event.toStage))) p.stageEpoch[s] = now;
      p.stage = event.toStage;
      p.completedStages = p.completedStages.filter(s => STAGES.indexOf(s) < STAGES.indexOf(event.toStage) || s === 'learn');
      break;
    case 'goto':
      if (!PLAYABLE_STAGES.includes(event.stage) && event.stage !== 'completed') return { progress, changed: false, awarded };
      if (p.stage === event.stage) return { progress, changed: false, awarded };
      p.stage = event.stage; break;
    case 'tested_out':
      if (p.placement === 'tested_out') return { progress, changed: false, awarded };
      p.placement = 'tested_out';
      for (const s of ['learn', 'recognize', 'apply', 'challenge']) if (!p.completedStages.includes(s)) p.completedStages.push(s);
      if (STAGES.indexOf(p.stage) < STAGES.indexOf('mastery_check')) p.stage = 'mastery_check';
      if (!p.startedAt) p.startedAt = now;
      awarded.push({ key: `placement:${p.lessonId}`, kind: 'placement_passed' });
      break;
    default:
      return { progress, changed: false, awarded };
  }
  p.updatedAt = now;
  p.events.push({ type: event.type, stage: event.stage || event.toStage || null, at: now });
  if (p.events.length > 100) p.events = p.events.slice(-100);
  return { progress: p, changed: true, awarded };
}

// ── Stage exit criteria (evaluated from this lesson's attempts in a stage) ───
export function recognizeCheckpoint(stageAttempts, policy = LESSON_POLICY) {
  const r = stageAttempts.slice(-policy.recognize.window);
  const c = r.filter(a => a.correct).length;
  return { passed: c >= policy.recognize.correctNeeded, correct: c, window: r.length, needed: policy.recognize.correctNeeded };
}
export function applyCheckpoint(stageAttempts, policy = LESSON_POLICY) {
  const c = stageAttempts.filter(a => a.correct).length;
  return { passed: c >= policy.apply.correctNeeded, correct: c, needed: policy.apply.correctNeeded, hintsUsed: stageAttempts.reduce((s, a) => s + (a.hintsUsed || 0), 0) };
}
export function challengeOutcome(stageAttempts, policy = LESSON_POLICY) {
  const n = stageAttempts.length; const c = stageAttempts.filter(a => a.correct).length;
  const done = n >= policy.challenge.itemCount;
  return { done, correct: c, total: n, remediate: done && c / n < policy.challenge.remediateBelow };
}
export function placementOutcome(stageAttempts, policy = LESSON_POLICY) {
  const indepCorrect = stageAttempts.filter(a => a.correct && !a.revealed && !(a.hintsUsed > 0) && a.confidence !== 'guess').length;
  const done = stageAttempts.length >= policy.placement.itemCount;
  return { done, independentCorrect: indepCorrect, passed: done && indepCorrect >= policy.placement.passIndependentCorrect, needed: policy.placement.passIndependentCorrect };
}
