// Adaptive study planner (spec Master §9, Expanded §7 safeguards). Deterministic and testable.
// The plan is RECOMPUTED from current state each day — missed days never pile up into a backlog.
import { recommendNext } from './recommend.js';
import { dueReviews } from './review.js';
import { formatForDate } from './config.js';
import { SKILL_BY_ID } from './skills.js';
import { weakSkills } from './journal.js';

const DAY = 86400000;
export const PLANNER_VERSION = 'planner-v1';
export const DEFAULT_MINUTES = 30; // used only when the student hasn't said; always labeled as a default

export const PLAN_MODES = {
  no_date: { label: 'Building foundations (no test date yet)', emphasis: 'Learn core skills and establish a routine. Add a test date any time to tailor the plan.' },
  foundations: { label: '12+ weeks out: build foundations', emphasis: 'Structured lessons, broad skill development, and steady review. Timed work is introduced gradually.' },
  strengthen: { label: '8–12 weeks out: strengthen', emphasis: 'Balance new lessons with targeted drills on weak areas and regular mixed practice.' },
  focus: { label: '4–8 weeks out: focus', emphasis: 'Prioritize your highest-impact weaknesses and build test execution with timed sets.' },
  consolidate: { label: '2–4 weeks out: consolidate', emphasis: 'Targeted practice, review, and realistic timed sections. Avoid broad new detours.' },
  final: { label: 'Final 2 weeks', emphasis: 'Short focused sessions, review of recurring errors, timing calibration — and rest. Confirm test-day logistics.' },
  past: { label: 'Test date has passed', emphasis: 'Update your test date, or mark the exam as taken.' },
};

/** Days from today (local date) to the test date; null if no valid date. */
export function daysUntil(testDate, now = Date.now()) {
  if (!testDate || !/^\d{4}-\d{2}-\d{2}$/.test(testDate)) return null;
  const [y, m, d] = testDate.split('-').map(Number);
  const t = new Date(y, m - 1, d); if (isNaN(t) || t.getMonth() !== m - 1) return null;
  const today = new Date(now); today.setHours(0, 0, 0, 0);
  return Math.round((t - today) / DAY);
}

export function planMode(profile, now = Date.now()) {
  if (profile?.testStatus === 'completed') return 'no_date';
  const d = daysUntil(profile?.testDate, now);
  if (d === null) return 'no_date';
  if (d < 0) return 'past';
  if (d > 84) return 'foundations';
  if (d > 56) return 'strengthen';
  if (d > 28) return 'focus';
  if (d > 14) return 'consolidate';
  return 'final';
}

/** Validate a profile edit. Returns {ok, errors[], value}. Unknown/skipped values stay null (never fabricated). */
export function validateProfile(input, now = Date.now()) {
  const errors = []; const v = {};
  const num = (x, lo, hi, name) => { if (x === '' || x == null) return null; const n = Number(x); if (!Number.isFinite(n) || n < lo || n > hi) { errors.push(`${name} must be between ${lo} and ${hi}.`); return null; } return Math.round(n); };
  v.testStatus = ['scheduled', 'undecided', 'completed'].includes(input.testStatus) ? input.testStatus : (input.testDate ? 'scheduled' : 'undecided');
  v.testDate = null;
  if (v.testStatus === 'scheduled') {
    const d = daysUntil(input.testDate, now);
    if (d === null) errors.push('Please choose a valid test date.');
    else if (d < 0) errors.push('That date is in the past. Pick an upcoming date, or choose “I already took the LSAT”.');
    else v.testDate = input.testDate;
  }
  v.targetScore = num(input.targetScore, 120, 180, 'Target score');
  v.baselineScore = num(input.baselineScore, 120, 180, 'Latest score');
  v.daysPerWeek = num(input.daysPerWeek, 0, 7, 'Days per week');
  v.minutesPerDay = num(input.minutesPerDay, 0, 300, 'Minutes per day');
  v.experience = ['none', 'some', 'lots'].includes(input.experience) ? input.experience : null;
  v.confidence = {};
  for (const k of ['lr', 'rc', 'logic']) { const c = num(input.confidence?.[k], 1, 5, 'Confidence'); if (c != null) v.confidence[k] = c; }
  return { ok: errors.length === 0, errors, value: v };
}

/** Explain what changed between two profiles, in plain language (spec Journey D). */
export function explainProfileChange(before = {}, after = {}, now = Date.now()) {
  const out = [];
  const mb = planMode(before, now), ma = planMode(after, now);
  if (before.testDate !== after.testDate || before.testStatus !== after.testStatus) {
    if (after.testStatus === 'completed') out.push('Marked the exam as taken. Your plan now focuses on keeping skills sharp; all your progress is kept.');
    else if (after.testDate) out.push(`Test date set to ${after.testDate} (${daysUntil(after.testDate, now)} days away).`);
    else out.push('Test date cleared. The plan will focus on foundations until you add one.');
    if (mb !== ma) out.push(`Planning mode changed: ${PLAN_MODES[mb].label} → ${PLAN_MODES[ma].label}. ${PLAN_MODES[ma].emphasis}`);
    const fb = formatForDate(before.testDate || undefined).id, fa = formatForDate(after.testDate || undefined).id;
    if (after.testDate && fb !== fa) out.push(`Your new date uses a different LSAT format: ${formatForDate(after.testDate).summary}`);
  }
  if (before.minutesPerDay !== after.minutesPerDay && after.minutesPerDay != null) out.push(`Daily sessions now fit ${after.minutesPerDay} minutes.`);
  if (before.daysPerWeek !== after.daysPerWeek && after.daysPerWeek != null) out.push(`Weekly target: ${after.daysPerWeek} study day${after.daysPerWeek === 1 ? '' : 's'}.`);
  if (!out.length) out.push('No change to your plan.');
  out.push('Completed lessons, answers, mastery, and review history are unchanged.');
  return out;
}

/**
 * Today's plan. Never exceeds the stated minutes (extra work is marked optional), keeps reviews to a manageable share,
 * and always offers a shorter version.
 */
export function buildDailyPlan(engine, profile = {}, { now = Date.now(), lessonsById = {} } = {}) {
  const mode = planMode(profile, now);
  const budgetKnown = profile?.minutesPerDay != null;
  const budget = budgetKnown ? profile.minutesPerDay : DEFAULT_MINUTES;
  const evidence = engine.attempts.filter(a => a.scorable !== false && a.stage !== 'learn').length;
  const provisional = evidence < 10;
  const notes = [];
  if (!budgetKnown) notes.push(`Using a default ${DEFAULT_MINUTES}-minute session. Set your daily time in your study profile.`);
  if (provisional) notes.push('This plan is provisional: it will sharpen as you answer more questions.');
  if (mode === 'past') return { mode, needsDateUpdate: true, tasks: [], shorter: null, minutes: 0, budget, provisional, notes: ['Your test date has passed. Update it or mark the exam as taken.'] };
  if (budget === 0) {
    const due = dueReviews(engine.reviews, now).totalDue;
    return { mode, rest: true, budget, minutes: 0, provisional, notes, tasks: [], shorter: due ? { minutes: 4, tasks: [reviewTask(1)] } : null };
  }

  const tasks = [];
  let left = budget;
  const add = (t) => { if (t.minutes <= left) { tasks.push(t); left -= t.minutes; return true; } return false; };

  // 1 — Reviews: bounded share of the session (never the whole plan).
  const due = dueReviews(engine.reviews, now);
  const reviewShare = mode === 'final' || mode === 'consolidate' ? 0.5 : 0.35;
  const reviewCount = Math.min(due.items.length, Math.max(due.totalDue ? 1 : 0, Math.floor((budget * reviewShare) / 4)));
  if (reviewCount) add(reviewTask(reviewCount, due.totalDue));

  // 2 — Primary objective: next learning step (prerequisite gaps, remediation, continue, next lesson).
  const rec = recommendNext({ ...engine, reviews: {} }, { lessonsById, now });
  const weak = weakSkills(engine, now)[0];
  let primary;
  if (weak && ['focus', 'consolidate', 'final'].includes(mode) && lessonsById[weak.skillId]) {
    primary = { kind: 'lesson', skillId: weak.skillId, title: `Targeted work: ${SKILL_BY_ID[weak.skillId]?.title}`, minutes: 15, reason: weak.reason };
  } else if (rec.kind === 'mixed') {
    primary = { kind: 'practice', title: 'Mixed practice', minutes: 15, reason: rec.reason };
  } else {
    primary = { kind: rec.kind === 'practice' ? 'lesson' : rec.kind, skillId: rec.skillId, title: rec.title, minutes: Math.min(rec.minutes || 15, 20), reason: rec.reason };
  }
  if (primary.minutes > left) primary.minutes = Math.max(5, left);
  primary.primary = true;
  add(primary);

  // 3 — Mode-specific additions.
  if (['focus', 'consolidate'].includes(mode)) add({ kind: 'timed', title: 'Timed set (10 questions)', minutes: 15, reason: 'Builds pacing under realistic time pressure. Timing is tracked separately from accuracy.' });
  if (mode === 'final') add({ kind: 'timed', title: 'Short timed set (5 questions)', minutes: 8, reason: 'Keeps timing calibrated without fatigue.' });
  if (mode === 'strengthen') add({ kind: 'practice', title: 'Mixed practice (5 questions)', minutes: 10, reason: 'Checks that skills transfer when the question type is not named.' });
  if (left >= 10 && mode !== 'final') add({ kind: 'practice', title: 'Fresh practice questions', minutes: Math.min(left, 15), reason: 'Extra application at your level.' });
  if (mode === 'final') notes.push('Rest matters now. Confirm your test-day logistics (ID, check-in time, testing setup).');

  const minutes = tasks.reduce((s, t) => s + t.minutes, 0);
  const shorterTasks = [];
  if (reviewCount) shorterTasks.push(reviewTask(1, due.totalDue));
  shorterTasks.push({ ...primary, minutes: Math.min(primary.minutes, 8), title: primary.title + ' (short)' });
  return {
    mode, modeLabel: PLAN_MODES[mode].label, emphasis: PLAN_MODES[mode].emphasis, budget, minutes, tasks, provisional, notes,
    primary, shorter: { minutes: shorterTasks.reduce((s, t) => s + t.minutes, 0), tasks: shorterTasks },
    daysLeft: daysUntil(profile?.testDate, now), format: profile?.testDate ? formatForDate(profile.testDate) : null, version: PLANNER_VERSION,
  };
}

function reviewTask(n, total = n) {
  return { kind: 'review', title: `Review ${n} skill${n > 1 ? 's' : ''}`, minutes: 4 * n, reason: total > n ? `${total} reviews are due; ${n} fit today. The rest wait — no backlog pressure.` : 'Retrieval with a fresh question makes skills stick.' };
}

/** Weekly checkpoint (non-punitive). */
export function weeklyCheckpoint(engine, profile = {}, now = Date.now()) {
  const since = now - 7 * DAY;
  const week = engine.attempts.filter(a => a.ts >= since);
  const scorable = week.filter(a => a.scorable !== false && a.stage !== 'learn');
  const indep = scorable.filter(a => !(a.hintsUsed > 0) && !a.revealed);
  const indepCorrect = indep.filter(a => a.correct && a.confidence !== 'guess');
  const days = new Set(week.map(a => new Date(a.ts).toDateString())).size;
  const resolved = engine.errors.filter(e => e.resolvedAt && e.resolvedAt >= since).length;
  const open = engine.errors.filter(e => !e.resolvedBy && !e.archived).length;
  const improved = Object.entries(engine.mastery || {}).filter(([, m]) => m.assessedAt >= since && ['developing', 'proficient', 'mastered'].includes(m.state)).map(([sid, m]) => `${SKILL_BY_ID[sid]?.title}: ${m.state}`);
  const highlights = [];
  if (resolved) highlights.push(`You corrected ${resolved} earlier mistake${resolved > 1 ? 's' : ''} with later independent answers.`);
  if (improved.length) highlights.push('Skills moving forward: ' + improved.join('; ') + '.');
  if (!highlights.length && week.length) highlights.push(`You practiced on ${days} day${days > 1 ? 's' : ''} this week.`);
  const priorities = weakSkills(engine, now).slice(0, 2).map(w => `${SKILL_BY_ID[w.skillId]?.title}: ${w.reason}`);
  return {
    daysStudied: days, targetDays: profile?.daysPerWeek ?? null, answered: scorable.length,
    independentAccuracy: indep.length >= 5 ? Math.round((indepCorrect.length / indep.length) * 100) : null,
    openMistakes: open, highlights, priorities,
    adherence: profile?.daysPerWeek ? `${Math.min(days, profile.daysPerWeek)} of ${profile.daysPerWeek} planned study days` : null,
  };
}

/** Initialise a study profile from the legacy onboarding answers, clearly labeled as estimates. */
export function profileFromLegacyDiagnostic(d = {}) {
  const hrs = { 'Less than 5 hrs': 3, '5–10 hrs': 5, '10–15 hrs': 10, '15–20 hrs': 15, '20+ hrs': 20 }[d.study_hours];
  const target = { '140–149': 145, '150–154': 152, '155–159': 157, '160–164': 162, '165–170': 167, '171–180': 173 }[d.target_score];
  return {
    testStatus: 'undecided', testDate: null, targetScore: target ?? null, baselineScore: null,
    daysPerWeek: hrs ? 5 : null, minutesPerDay: hrs ? Math.round((hrs * 60) / 5 / 5) * 5 : null,
    experience: null, confidence: {}, estimatedFrom: hrs || target ? 'onboarding' : null,
  };
}
