// Learning achievements: reward durable learning, correction, transfer, and calibration — never raw volume or speed.
// Awarded deterministically from recorded evidence; XP uses idempotency keys so nothing can be earned twice.
import { awardXP } from './xp.js';
import { isIndependentCorrect } from './mastery.js';

const DAY = 86400000;
const count = (arr, f) => arr.reduce((n, x) => n + (f(x) ? 1 : 0), 0);

export const ACHIEVEMENTS = [
  { id: 'first_lesson', icon: '📘', title: 'First Lesson Complete', desc: 'Finished every stage of a guided lesson.', xp: 25,
    check: (e) => Object.values(e.lessons || {}).some(l => l.stage === 'completed') },
  { id: 'tested_out', icon: '🚀', title: 'Already Knew It', desc: 'Tested out of a lesson with independent answers.', xp: 20,
    check: (e) => Object.values(e.lessons || {}).some(l => l.placement === 'tested_out') },
  { id: 'independent_10', icon: '🧭', title: 'On Your Own', desc: '10 correct answers with no hints and no guessing.', xp: 20,
    check: (e) => count(e.attempts, a => a.scorable !== false && !['orient', 'learn', 'recognize'].includes(a.stage) && isIndependentCorrect(a)) >= 10 },
  { id: 'misconception_fixed', icon: '🔧', title: 'Mistake → Mastery', desc: 'Got a skill right on your own after missing it earlier.', xp: 20,
    check: (e) => e.errors.some(x => x.resolvedBy) },
  { id: 'five_fixed', icon: '🛠️', title: 'Error Hunter', desc: 'Resolved 5 earlier mistakes with later independent success.', xp: 40,
    check: (e) => count(e.errors, x => x.resolvedBy) >= 5 },
  { id: 'proficient_1', icon: '🎯', title: 'Proficient', desc: 'Reached Proficient on a skill: reliable, unassisted, at challenge level.', xp: 30,
    check: (e) => Object.values(e.mastery || {}).some(m => ['proficient', 'mastered'].includes(m.state) || m.peakState === 'mastered') },
  { id: 'mastered_1', icon: '⭐', title: 'It Stuck', desc: 'Mastered a skill, including a delayed retention check.', xp: 60,
    check: (e) => Object.values(e.mastery || {}).some(m => m.state === 'mastered' || m.peakState === 'mastered') },
  { id: 'retained_3', icon: '🧠', title: 'Long-Term Memory', desc: '3 successful spaced reviews.', xp: 30,
    check: (e) => count(e.attempts, a => a.stage === 'review' && isIndependentCorrect(a)) >= 3 },
  { id: 'transfer_3', icon: '🌉', title: 'Transfer', desc: 'Solved 3 brand-new, verified questions on your own.', xp: 30,
    check: (e) => count(e.attempts, a => a.source === 'generated' && a.scorable !== false && isIndependentCorrect(a)) >= 3 },
  { id: 'calibrated', icon: '⚖️', title: 'Well Calibrated', desc: 'When you said “Sure,” you were right at least 90% of the time (10+ answers).', xp: 30,
    check: (e) => { const s = e.attempts.filter(a => a.confidence === 'sure' && !['orient', 'learn'].includes(a.stage) && !(a.hintsUsed > 0) && !a.revealed).slice(-20); return s.length >= 10 && count(s, a => a.correct) / s.length >= 0.9; } },
  { id: 'routine_week', icon: '📅', title: 'Steady Routine', desc: 'Studied on 3 different days within a week. (Missing days never takes this away.)', xp: 20,
    check: (e, now) => { const days = [...new Set(e.attempts.map(a => Math.floor(a.ts / DAY)))].sort((a, b) => a - b); for (let i = 2; i < days.length; i++) if (days[i] - days[i - 2] <= 6) return true; return false; } },
];

/** Award any newly earned achievements. Returns {engine, xpGranted, newly:[ids]}. Idempotent. */
export function evaluateAchievements(engine0, now = Date.now()) {
  const have = new Set((engine0.achievements || []).map(a => a.id));
  let engine = engine0; let xpGranted = 0; const newly = [];
  for (const a of ACHIEVEMENTS) {
    if (have.has(a.id)) continue;
    let ok = false; try { ok = !!a.check(engine, now); } catch { ok = false; }
    if (!ok) continue;
    const { ledger, granted } = awardXP(engine.xp, `ach:${a.id}`, a.xp, 'achievement', now);
    engine = { ...engine, xp: ledger, achievements: [...(engine.achievements || []), { id: a.id, at: now }] };
    xpGranted += granted; newly.push(a.id);
  }
  return { engine, xpGranted, newly };
}

/** Learning level from learning-event XP (engine ledger), not from question volume. */
export function learningLevel(engine) {
  const xp = engine?.xp?.total || 0;
  let level = 1, need = 100, acc = 0;
  while (xp >= acc + need) { acc += need; level += 1; need = Math.round(need * 1.25); }
  return { level, xp, intoLevel: xp - acc, forNext: need };
}
