// Spaced retrieval per skill. One active schedule per user+skill. Updates are idempotent per attempt id.
import { REVIEW_POLICY } from './config.js';
const DAY = 86400000;

export function scheduleInitial(existing, skillId, now = Date.now(), policy = REVIEW_POLICY) {
  if (existing) return existing; // never create a second active schedule
  return { skillId, step: 0, due: now + policy.intervalsDays[0] * DAY, lastOutcome: null, history: [], policyVersion: policy.version };
}

/** Record a review outcome. Re-applying the same attemptId is a no-op. */
export function recordReview(schedule, { attemptId, correct, independent }, now = Date.now(), policy = REVIEW_POLICY) {
  if (!schedule) return schedule;
  if (schedule.history.some(h => h.attemptId === attemptId)) return schedule;
  const success = correct && independent;
  const max = policy.intervalsDays.length - 1;
  const step = success ? Math.min(max, schedule.step + 1) : 0;
  return {
    ...schedule, step, lastOutcome: success ? 'success' : 'miss',
    due: now + policy.intervalsDays[step] * DAY,
    history: [...schedule.history, { attemptId, at: now, success }].slice(-30),
  };
}

export function dueReviews(schedules = {}, now = Date.now(), policy = REVIEW_POLICY) {
  const due = Object.values(schedules).filter(s => s && s.due <= now).sort((a, b) => a.due - b.due);
  return { items: due.slice(0, policy.maxDuePerSession), totalDue: due.length };
}
