// Error-journal helpers (pure, testable).
export const ERROR_CATEGORY_LABELS = {
  unclassified: 'Not sure yet', conceptual: 'Conceptual misunderstanding', structure: 'Misidentified conclusion or structure',
  conditional_translation: 'Conditional translation error', scope_quantifier: 'Scope or quantifier misread', causal: 'Causal reasoning error',
  unsupported_inference: 'Unsupported inference / overstatement', distractor_attraction: 'Attracted to a wrong answer', misread_stem: 'Misread the question stem',
  misread_passage: 'Misread the passage or whose view it is', statistical: 'Statistics, sampling, or base-rate error',
  timing: 'Rushed / time pressure', careless: 'Careless selection', guess: 'Guess or low confidence',
};
const DAY = 86400000;

/** Pure: skills that need attention, with an evidence-based reason. */
export function weakSkills(engine, now = Date.now()) {
  const out = [];
  const bySkill = {};
  for (const e of engine.errors) if (!e.resolvedBy && !e.archived && now - e.at < 30 * DAY) (bySkill[e.skillId] ||= []).push(e);
  for (const [sid, errs] of Object.entries(bySkill)) {
    if (errs.length < 2) continue;
    const cats = {}; errs.forEach(e => { cats[e.category] = (cats[e.category] || 0) + 1; });
    const top = Object.entries(cats).sort((a, b) => b[1] - a[1])[0];
    out.push({ skillId: sid, reason: `${errs.length} unresolved mistakes in the last 30 days${top && top[0] !== 'unclassified' ? `, most often: ${ERROR_CATEGORY_LABELS[top[0]] || top[0]}` : ''}.`, score: errs.length });
  }
  for (const [sid, m] of Object.entries(engine.mastery || {})) {
    if (m?.needsReview && !out.some(o => o.skillId === sid)) out.push({ skillId: sid, reason: 'Recent delayed reviews were missed.', score: 1 });
  }
  return out.sort((a, b) => b.score - a.score);
}

