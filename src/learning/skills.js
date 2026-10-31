// Curriculum skill graph. Stable IDs — never rename an ID once shipped (attempts reference it).
// `lesson`: 'full' = complete lesson in the guided engine (Curriculum v2.0: every node is full).
// `classic`: Classic (original) lessons that now route to this node — see content/classicMap.js.
export const CURRICULUM_VERSION = '2026.10-v2';

export const BRANCHES = [
  { id: 'foundations', title: 'Foundations' },
  { id: 'formal', title: 'Formal Logic' },
  { id: 'analysis', title: 'Argument Analysis' },
  { id: 'evaluation', title: 'Argument Evaluation' },
  { id: 'inference', title: 'Inference & Flaws' },
  { id: 'advanced', title: 'Advanced LR' },
  { id: 'rc', title: 'Reading Comprehension' },
  { id: 'transfer', title: 'Transfer & Real-World Logic' },
];

const S = (id, branch, title, prerequisites = [], lesson = null, summary = '') => ({ id, branch, title, prerequisites, lesson, summary });

export const SKILLS = [
  S('found.argument_parts', 'foundations', 'Premises & Conclusions', [], 'full', 'Identify what an argument claims and what it offers as support.'),
  S('found.validity', 'foundations', 'Truth vs. Logical Support', ['found.argument_parts'], 'full', 'Separate whether claims are true from whether they support the conclusion.'),
  S('found.deductive_inductive', 'foundations', 'Deductive vs. Inductive Reasoning', ['found.validity'], 'full', 'Certainty versus probability.'),

  S('formal.necessary_sufficient', 'formal', 'Necessary & Sufficient Conditions', ['found.argument_parts'], 'full', 'Translate conditional language and draw only valid conclusions.'),
  S('formal.negation_or', 'formal', 'Negation, "And" & "Or"', ['formal.necessary_sufficient'], 'full', 'Negate compound statements correctly; inclusive vs. exclusive or.'),
  S('formal.quantifiers', 'formal', 'Quantifiers: All, Most, Some, None', ['formal.necessary_sufficient'], 'full', 'Scope words and what they do and do not allow you to infer.'),
  S('formal.chains', 'formal', 'Conditional Chains', ['formal.necessary_sufficient'], 'full', 'Link conditionals and spot broken links.'),

  S('analysis.main_conclusion', 'analysis', 'Main Conclusion', ['found.argument_parts'], 'full', 'Find the claim everything else supports.'),
  S('analysis.role', 'analysis', 'Role of a Statement', ['analysis.main_conclusion'], 'full', 'Describe what a claim does in the argument.'),
  S('analysis.method', 'analysis', 'Method of Reasoning', ['analysis.role'], 'full', 'Describe how an argument proceeds.'),

  S('evaluation.necessary_assumption', 'evaluation', 'Necessary Assumptions', ['analysis.main_conclusion', 'formal.necessary_sufficient'], 'full', 'What the argument requires.'),
  S('evaluation.sufficient_assumption', 'evaluation', 'Sufficient Assumptions', ['evaluation.necessary_assumption', 'formal.chains'], 'full', 'What would guarantee the conclusion.'),
  S('evaluation.strengthen', 'evaluation', 'Strengthen', ['evaluation.necessary_assumption'], 'full', 'Add support to the gap.'),
  S('evaluation.weaken', 'evaluation', 'Weaken', ['evaluation.necessary_assumption'], 'full', 'Undermine the gap.'),
  S('evaluation.causal', 'evaluation', 'Causal Reasoning', ['found.deductive_inductive'], 'full', 'Correlation, alternative causes, mechanisms.'),
  S('evaluation.evaluate', 'evaluation', 'Evaluate the Argument', ['evaluation.strengthen', 'evaluation.weaken'], 'full', 'Which question would matter most.'),
  S('evaluation.paradox', 'evaluation', 'Resolve / Explain', ['evaluation.causal'], 'full', 'Reconcile apparently conflicting facts.'),

  S('inference.must_be_true', 'inference', 'Must Be True', ['formal.necessary_sufficient', 'formal.quantifiers'], 'full', 'Draw only what the facts guarantee.'),
  S('inference.flaws', 'inference', 'Common Reasoning Flaws', ['evaluation.necessary_assumption'], 'full', 'Name the unsupported inference.'),

  S('advanced.parallel', 'advanced', 'Parallel Reasoning & Parallel Flaw', ['analysis.method', 'formal.chains'], 'full', 'Match logical structure, not topic.'),
  S('advanced.principles', 'advanced', 'Principles', ['formal.necessary_sufficient', 'evaluation.strengthen'], 'full', 'Apply and justify with general rules.'),

  S('rc.structure', 'rc', 'Passage Structure', ['found.argument_parts'], 'full', 'Map paragraphs by function.'),
  S('rc.author', 'rc', 'Author Perspective & Tone', ['rc.structure'], 'full', 'Separate the author’s view from others’.'),
  S('rc.inference', 'rc', 'RC Inference & Detail', ['rc.structure'], 'full', 'Answer from the text, not outside knowledge.'),
  S('rc.comparative', 'rc', 'Comparative Passages', ['rc.author'], 'full', 'Agreement, disagreement, relationship.'),

  S('transfer.statistics', 'transfer', 'Statistics & Base Rates', ['evaluation.causal', 'found.deductive_inductive'], 'full', 'Percentages, samples, and risk in everyday claims.'),
  S('transfer.media', 'transfer', 'Evaluating Claims in the Media', ['evaluation.causal', 'inference.flaws'], 'full', 'Apply LSAT reasoning to news and ads.'),
];

export const SKILL_BY_ID = Object.fromEntries(SKILLS.map(s => [s.id, s]));

/** Validate the graph: unknown prerequisites and cycles. Returns array of problems (empty = valid). */
export function validateSkillGraph(skills = SKILLS) {
  const problems = []; const ids = new Set();
  for (const s of skills) { if (ids.has(s.id)) problems.push(`duplicate id ${s.id}`); ids.add(s.id); }
  for (const s of skills) for (const p of s.prerequisites) if (!ids.has(p)) problems.push(`${s.id} has unknown prerequisite ${p}`);
  const byId = Object.fromEntries(skills.map(s => [s.id, s]));
  const state = {}; // 1 = visiting, 2 = done
  const visit = (id, path) => {
    if (state[id] === 2) return; if (state[id] === 1) { problems.push('cycle: ' + [...path, id].join(' -> ')); return; }
    state[id] = 1; for (const p of byId[id]?.prerequisites || []) visit(p, [...path, id]); state[id] = 2;
  };
  for (const s of skills) visit(s.id, []);
  return problems;
}
