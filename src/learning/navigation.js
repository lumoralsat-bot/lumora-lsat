// Pure view-model helpers for the learning-first screens (Home, Learn). No React, no side effects.
// They only READ engine state; mastery and recommendations still come from mastery.js / recommend.js.
import { SKILLS, BRANCHES, SKILL_BY_ID } from './skills.js';
import { LESSONS_BY_SKILL } from './content/index.js';
import { PLAYABLE_STAGES, STAGE_LABELS } from './lessonEngine.js';
import { recommendNext } from './recommend.js';
import { dueReviews } from './review.js';
import { STATE_LABELS, stateRank } from './mastery.js';

/** Lesson status used by every list: 'done' | 'current' | 'started' | 'review' | 'todo'. */
export function lessonStatus(engine, skillId, currentSkillId = null) {
  const L = LESSONS_BY_SKILL[skillId];
  const lp = L ? engine.lessons?.[L.id] : null;
  const due = engine.reviews?.[skillId] && engine.reviews[skillId].due <= Date.now();
  if (skillId === currentSkillId) return 'current';
  if (lp?.stage === 'completed' || lp?.placement === 'tested_out') return due ? 'review' : 'done';
  if (lp && lp.stage !== 'not_started') return 'started';
  return 'todo';
}

export function lessonStageProgress(engine, skillId) {
  const L = LESSONS_BY_SKILL[skillId];
  const lp = L ? engine.lessons?.[L.id] : null;
  const done = (lp?.completedStages || []).filter(s => PLAYABLE_STAGES.includes(s)).length;
  const stage = !lp || lp.stage === 'not_started' ? null : lp.stage;
  return { done, total: PLAYABLE_STAGES.length, stage, stageLabel: stage ? (STAGE_LABELS[stage] || stage) : null, completed: lp?.stage === 'completed' };
}

/**
 * The lesson the student should work on now (reviews are shown separately, so they never
 * hide the lesson). Returns null only if there is nothing left to learn.
 */
export function currentLearning(engine, now = Date.now()) {
  // 1. the most recently touched unfinished lesson
  const open = Object.values(engine.lessons || {})
    .filter(p => p.stage && p.stage !== 'completed' && p.stage !== 'not_started')
    .sort((a, b) => (b.updatedAt || 0) - (a.updatedAt || 0))[0];
  let skillId = open ? Object.values(LESSONS_BY_SKILL).find(l => l.id === open.lessonId)?.skillId : null;
  let reason = null, kind = 'continue';
  if (!skillId) {
    const rec = recommendNext({ ...engine, reviews: {} }, { now, lessonsById: LESSONS_BY_SKILL });
    if (rec.skillId) { skillId = rec.skillId; reason = rec.reason; kind = rec.kind === 'practice' ? 'practice' : 'start'; }
  }
  if (!skillId) return null;
  const skill = SKILL_BY_ID[skillId];
  const lesson = LESSONS_BY_SKILL[skillId];
  const prog = lessonStageProgress(engine, skillId);
  const isNewStudent = Object.keys(engine.lessons || {}).length === 0 && (engine.attempts || []).length === 0;
  return {
    kind: prog.stage ? 'continue' : kind, skill, lesson, progress: prog, isNewStudent,
    module: BRANCHES.find(b => b.id === skill.branch),
    reason: reason || (prog.stageLabel ? `You stopped at ${prog.stageLabel}.` : skill.summary),
    mastery: STATE_LABELS[engine.mastery?.[skillId]?.state || 'not_started'],
  };
}

/** Modules (curriculum branches) with their lessons and summary progress. */
export function curriculumModules(engine, currentSkillId = null) {
  return BRANCHES.map(b => {
    const skills = SKILLS.filter(s => s.branch === b.id && LESSONS_BY_SKILL[s.id]);
    const lessons = skills.map(s => ({
      skill: s, lesson: LESSONS_BY_SKILL[s.id], status: lessonStatus(engine, s.id, currentSkillId),
      mastery: engine.mastery?.[s.id]?.state || 'not_started', progress: lessonStageProgress(engine, s.id),
    }));
    const completed = lessons.filter(l => l.progress.completed || engine.lessons?.[l.lesson.id]?.placement === 'tested_out').length;
    const proficient = lessons.filter(l => stateRank(l.mastery) >= stateRank('proficient')).length;
    return { id: b.id, title: b.title, lessons, completed, proficient, total: lessons.length, hasCurrent: lessons.some(l => l.skill.id === currentSkillId) };
  }).filter(m => m.total > 0);
}

export function reviewSummary(engine, now = Date.now()) {
  const d = dueReviews(engine.reviews || {}, now);
  const first = d.items[0] ? SKILL_BY_ID[d.items[0].skillId] : null;
  const upcoming = Object.values(engine.reviews || {}).filter(r => r.due > now).sort((a, b) => a.due - b.due)[0] || null;
  return { due: d.totalDue, firstSkill: first, nextDue: upcoming ? upcoming.due : null };
}
