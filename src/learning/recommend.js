// Explainable next-action recommendation (spec Expanded §7 decision order).
import { SKILLS, SKILL_BY_ID } from './skills.js';
import { stateRank, STATE_LABELS } from './mastery.js';
import { dueReviews } from './review.js';
import { STAGE_LABELS } from './lessonEngine.js';

const READY = stateRank('developing');

export function prerequisitesMet(skillId, mastery, lessons = {}) {
  const s = SKILL_BY_ID[skillId];
  return (s?.prerequisites || []).every(p => {
    if (stateRank(mastery[p]?.state || 'not_started') >= READY) return true;
    // Prereqs without a full lesson in the engine yet cannot block anyone.
    return SKILL_BY_ID[p]?.lesson !== 'full';
  });
}

/**
 * @returns {{kind, skillId?, lessonId?, title, reason, minutes}}
 */
export function recommendNext(engine, { now = Date.now(), lessonsById = {}, minutesAvailable = null } = {}) {
  const mastery = engine.mastery || {};
  // 1 — feasibility: only skills with content that exists
  const playable = SKILLS.filter(s => s.lesson === 'full' && lessonsById[s.id]);

  // 2 — urgent retention (bounded)
  const due = dueReviews(engine.reviews, now);
  if (due.totalDue > 0) {
    const s = SKILL_BY_ID[due.items[0].skillId];
    return { kind: 'review', skillId: s.id, title: `Review: ${s.title}`, minutes: 5, reason: `${due.totalDue} review${due.totalDue > 1 ? 's are' : ' is'} due. A quick retrieval check with a fresh question is the best way to make this skill stick.` };
  }

  // 3 — remediation / prerequisite gap
  for (const s of playable) {
    const lp = engine.lessons[lessonsById[s.id].id];
    if (lp?.remediation) return { kind: 'lesson', skillId: s.id, lessonId: lp.lessonId, title: `Revisit ${STAGE_LABELS[lp.remediation.toStage]}: ${s.title}`, minutes: 8, reason: lp.remediation.reason || 'Your challenge answers suggest one idea needs another look before moving on.' };
  }
  // 3b — weak skill flagged by retention decay
  for (const s of playable) {
    if (mastery[s.id]?.needsReview) return { kind: 'lesson', skillId: s.id, lessonId: lessonsById[s.id].id, title: `Refresh: ${s.title}`, minutes: 10, reason: 'Recent delayed reviews on this skill were missed. A short refresh now prevents a bigger gap later.' };
  }

  // 4/5 — continue an in-progress lesson, else start the next unlocked one
  for (const s of playable) {
    const lp = engine.lessons[lessonsById[s.id].id];
    if (lp && lp.stage !== 'completed' && lp.stage !== 'not_started') {
      return { kind: 'lesson', skillId: s.id, lessonId: lp.lessonId, title: `Continue: ${s.title}`, minutes: 10, reason: `You stopped at the ${STAGE_LABELS[lp.stage]} stage. Picking up where you left off keeps the idea fresh.` };
    }
  }
  for (const s of playable) {
    const st = mastery[s.id]?.state || 'not_started';
    const lp = engine.lessons[lessonsById[s.id].id];
    if (!lp || lp.stage === 'not_started') {
      const ok = prerequisitesMet(s.id, mastery);
      return { kind: 'lesson', skillId: s.id, lessonId: lessonsById[s.id].id, title: `Start: ${s.title}`, minutes: lessonsById[s.id].estMinutes || 20, reason: ok ? `${s.title} is a building block for assumptions, inferences, and principle questions. It is the next unlocked skill on your path.` : 'Recommended prerequisites are not finished yet, but you can start now or test out.' };
    }
    if (stateRank(st) < stateRank('proficient')) {
      return { kind: 'practice', skillId: s.id, lessonId: lessonsById[s.id].id, title: `Practice: ${s.title}`, minutes: 10, reason: `Current status: ${STATE_LABELS[st]}. ${mastery[s.id]?.reasons?.slice(-1)[0] || ''}`.trim() };
    }
  }
  // 6 — everything authored is stable: transfer to mixed practice using the existing generator
  return { kind: 'mixed', title: 'Mixed practice', minutes: minutesAvailable ? Math.min(minutesAvailable, 20) : 15, reason: 'You have finished every guided lesson available so far. Mixed practice checks whether those skills transfer when the question type is not named.' };
}
