// Single authoritative source for (1) LSAT format by effective date and (2) learning policy thresholds.
// Policies are versioned: every derived mastery result records the policy version that produced it.

// ── LSAT FORMAT (verified against LSAC, 2026-10-30) ──────────────────────────
// Source: https://www.lsac.org/lsat-will-look-little-different-starting-august-2027
// Re-verify against LSAC before each test cycle. Do not hardcode these numbers elsewhere.
export const LSAT_FORMATS = [
  {
    id: 'lsat-2024-08',
    effectiveFrom: '2024-08-01',
    effectiveUntil: '2027-07-31', // last administration in this format: June 2027
    summary: 'Four 35-minute sections: two Logical Reasoning, one Reading Comprehension, one unscored variable section. LSAT Argumentative Writing is completed separately.',
    sections: [
      { kind: 'LR', minutes: 35, scored: true },
      { kind: 'LR', minutes: 35, scored: true },
      { kind: 'RC', minutes: 35, scored: true },
      { kind: 'variable', minutes: 35, scored: false },
    ],
    scoredQuestions: { LR: 50, RC: 27 },
    notes: 'Section order varies; the unscored section is indistinguishable from scored ones.',
  },
  {
    id: 'lsat-2027-08',
    effectiveFrom: '2027-08-01',
    effectiveUntil: null,
    summary: 'Embedded pretesting: Reading Comprehension (52 min, 40 questions, 27 scored) then two Logical Reasoning sections (45 min, 32 questions each, 25 scored). Two 10-minute breaks.',
    sections: [
      { kind: 'RC', minutes: 52, questions: 40, scoredQuestions: 27, scored: true },
      { kind: 'LR', minutes: 45, questions: 32, scoredQuestions: 25, scored: true },
      { kind: 'LR', minutes: 45, questions: 32, scoredQuestions: 25, scored: true },
    ],
    scoredQuestions: { LR: 50, RC: 27 },
    notes: 'Announced by LSAC; question types and scored-question counts unchanged.',
  },
];

export function formatForDate(dateLike) {
  const d = dateLike ? new Date(dateLike) : new Date();
  const iso = isNaN(d) ? new Date().toISOString().slice(0, 10) : d.toISOString().slice(0, 10);
  return LSAT_FORMATS.find(f => iso >= f.effectiveFrom && (!f.effectiveUntil || iso <= f.effectiveUntil)) || LSAT_FORMATS[LSAT_FORMATS.length - 1];
}

// ── MASTERY POLICY ────────────────────────────────────────────────────────────
// Starting values chosen by judgment, NOT yet calibrated on student data.
// Tune these here (bump the version) — never in components or prompts.
export const MASTERY_POLICY = {
  version: 'mastery-v2', // Curriculum v2.0 gate
  // Proficient (spec gate): ≥8 distinct validated items answered correctly on your own, across ≥3 distinct
  // question structures, ≥80% recent unassisted accuracy, an acceptable explanation, and no unresolved
  // misconception. Mastered additionally needs a delayed retention check AND a correct answer in mixed review.
  practicing: { minScorable: 2, minCorrect: 1 },
  developing: { minScorable: 4, minIndependentCorrect: 3, recentWindow: 6, recentAccuracy: 0.6 },
  proficient: { minIndependent: 8, recentWindow: 10, recentIndependentAccuracy: 0.8, minHarderCorrect: 2, harderDifficulty: 2, minDistinctItems: 8, minDistinctStructures: 3, requireExplanation: true, unresolvedRepeat: 2 },
  mastered: { retentionDelayDays: 3, minDelayedCorrect: 1, minMixedCorrect: 1 },
  needsReview: { failedDelayedInARow: 2 },
  // An answer counts as INDEPENDENT only if: no hints, answer not revealed, not marked as a guess.
  scorableStages: ['apply', 'challenge', 'mastery_check', 'review', 'placement'],
};

// ── LESSON FLOW POLICY ───────────────────────────────────────────────────────
export const LESSON_POLICY = {
  version: 'lesson-v2',
  explain: { checksNeeded: 2, minWords: 12 },
  recognize: { window: 4, correctNeeded: 3 },
  apply: { correctNeeded: 2 },
  challenge: { itemCount: 2, remediateBelow: 0.5 },
  masteryCheck: { itemCount: 3 },
  placement: { itemCount: 5, passIndependentCorrect: 4 },
};

// ── REVIEW (spaced retrieval) ────────────────────────────────────────────────
export const REVIEW_POLICY = {
  version: 'review-v1',
  intervalsDays: [1, 3, 7, 14, 30, 60],
  maxDuePerSession: 5,
};

// ── XP (rewards learning events, never raw volume) ──────────────────────────
export const XP_POLICY = {
  version: 'xp-v1',
  stage_complete: 10,
  independent_correct: 5,
  misconception_corrected: 10, // later independent success on a skill after an error
  placement_passed: 25,
  state_reached: { developing: 15, proficient: 40, mastered: 75 },
  review_success: 10,
};

// ── QUESTION GENERATION ──────────────────────────────────────────────────────
export const GENERATION_POLICY = {
  version: 'gen-v1',
  maxAttempts: 3,
  nearDuplicateJaccard: 0.6,     // word-trigram overlap on normalized text
  structuralDuplicateJaccard: 0.7, // trigram overlap after masking names/numbers/nouns-in-caps
  exposureMemory: 400,
  verifyWithSecondPass: true,     // blind re-solve; mismatch = reject
};
