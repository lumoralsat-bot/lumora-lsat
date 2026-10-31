// Practice engine: wraps the EXISTING generator (callClaude + PRACTICE_SYSTEM from App.jsx) behind a
// stable interface. Pipeline: build request → generate → schema check → logic check (blind second-pass
// solve) → skill check → originality screen → approve | provisional | regenerate → authored fallback.
import { GENERATION_POLICY } from './config.js';
import { validateGeneratedQuestion, fingerprintQuestion, screenDuplicate, conditionalLanguageScore } from './questionValidation.js';

export const PROMPT_VERSION = 'skillgen-v2';
const LETTERS = ['A', 'B', 'C', 'D', 'E'];

const DOMAINS = ['municipal permitting', 'a university course policy', 'a hospital staffing rule', 'a museum loan agreement', 'a farm irrigation schedule', 'a software release process', 'a sports league eligibility rule', 'a library archive policy', 'a shipping and customs procedure', 'a theater production schedule', 'a wildlife survey protocol', 'a court filing rule', 'a public transit budget', 'an archaeological dig', 'a newsroom fact-checking process'];

export const SKILL_SPECS = {
  'formal.necessary_sufficient': {
    questionType: 'Must Be True (conditional reasoning)',
    objective: 'translate conditional language and draw only conclusions supported by the rule or its contrapositive; reject converse and inverse errors',
    requirements: 'The stimulus must state at least two conditional rules using varied indicators (e.g., "only if", "unless", "every", "no", "requires", "whenever") plus one fact. The correct answer must follow by applying a contrapositive and/or chaining rules. Distractors must include at least one converse error and one inverse error, plus one plausible but unsupported claim. Every rule applies to the individual named in the fact. Avoid quantifier words like "some" or "most".',
    domains: DOMAINS,
  },
  'formal.chains': {
    questionType: 'Must Be True (conditional chain)',
    objective: 'link two or three conditional rules head-to-tail and apply the chain or its contrapositive to a fact',
    requirements: 'The stimulus must state two or three conditional rules that link into one chain (at least one link should require a contrapositive or a negated term), plus one fact about a named individual at the start or end of the chain. Distractors must include a broken link (two arrows into the same term), a converse of the chain, and an inverse of the chain. Avoid "some" and "most".',
    domains: DOMAINS,
  },
  'formal.negation_or': {
    questionType: 'Must Be True (compound conditions with and/or/neither)',
    objective: 'negate "and"/"or" statements correctly and reason by elimination from an inclusive "or"',
    requirements: 'The stimulus must use at least one "and" or "or" inside a rule (e.g., "only if both…", "if either…", "neither…nor", "or…"), plus one fact. The correct answer must require correctly negating a compound or eliminating one option of an "or". Distractors must include treating "or" as exclusive and negating "and" as "neither". Treat "or" as inclusive unless the stimulus says "but not both".',
    domains: DOMAINS,
  },
  'formal.quantifiers': {
    questionType: 'Must Be True (quantifiers)',
    objective: 'combine quantified statements (all, most, some, none) and reject conclusions that overstate or reverse them',
    requirements: 'The stimulus must contain two quantified statements about groups (using all/most/some/none) that validly combine. Use the LSAT conventions: "some" = at least one, "most" = more than half. Distractors must include upgrading "some" to "most" or "most" to "all", reversing an "all" or "most" statement, and reading "some" as "some but not all".',
    domains: DOMAINS,
    align: (t) => /\b(all|most|some|none|no|every|each)\b/i.test(t) && (String(t).match(/\b(all|most|some|none|no|every|each|many)\b/gi) || []).length >= 2,
  },
  'found.argument_parts': {
    questionType: 'Main Conclusion',
    objective: 'identify the main conclusion of a short argument, distinguishing it from premises, intermediate conclusions, and opposing views',
    requirements: 'The stimulus must be a short argument (3–4 sentences) with at least one premise and ideally an intermediate conclusion or an opposing view that the author rejects. Do not always put the conclusion last. Distractors must include a premise, an intermediate conclusion (if present), an opposing view, and an overstatement of the conclusion.',
    domains: DOMAINS,
    align: (t) => /\b(so|therefore|thus|hence|consequently|because|since|but|however|should|must|clearly)\b/i.test(t),
  },
};

// Curriculum v2.0 specs for the remaining nodes. G(type, objective, requirements[, align]).
const G = (questionType, objective, requirements, align) => ({ questionType, objective, requirements, domains: DOMAINS, ...(align ? { align } : {}) });
const ARG = 'The stimulus must be a short original argument (3–5 sentences) with a clear conclusion and at least one premise.';
const RC_P = 'The stimulus must be an original expository passage of 150–220 words with a clear structure (e.g., a view, evidence, and the author’s qualification), introduced by "Passage:".';
Object.assign(SKILL_SPECS, {
  'found.validity': G('Validity vs. truth', 'separate whether premises are true from whether they support the conclusion; recognize valid arguments with false premises and invalid arguments with true premises', ARG + ' Ask about validity, soundness, or support. Distractors must include confusing true premises with validity and judging by the conclusion’s truth.'),
  'found.deductive_inductive': G('Deductive vs. inductive strength', 'distinguish arguments that guarantee their conclusion from arguments that make it probable, and judge inductive strength by sample and relevance', ARG + ' Distractors must include calling a strong inductive argument illogical and treating a probable conclusion as certain.'),
  'analysis.main_conclusion': SKILL_SPECS['found.argument_parts'],
  'analysis.role': G('Role of a statement', 'describe the function of a quoted claim (premise, conclusion, intermediate conclusion, concession, opposing view, example)', ARG + ' Quote one claim in the stem. Distractors must include confusing a concession with a premise and an intermediate with the main conclusion.'),
  'analysis.method': G('Method of reasoning', 'describe abstractly how an argument proceeds (counterexample, analogy, elimination, alternative explanation, undermining evidence)', ARG + ' Answer choices must be abstract descriptions; distractors must include one inaccurate element, a topic description, and an overstatement.'),
  'evaluation.necessary_assumption': G('Necessary assumption', 'identify an assumption the argument requires, confirmed by the negation test', ARG + ' The argument must have one clear gap. Distractors must include a sufficient-but-not-necessary claim, a restated premise, an out-of-scope claim, and an overly strong claim.'),
  'evaluation.sufficient_assumption': G('Sufficient assumption', 'identify the claim that, added to the premises, guarantees the conclusion (bridge the new term)', ARG + ' Use conditional or quantified premises so that exactly one choice completes a valid argument. Distractors must include the converse of the bridge and a necessary-but-insufficient claim.'),
  'evaluation.strengthen': G('Strengthen', 'choose new information that makes the conclusion more likely by supporting the gap or ruling out an alternative', ARG + ' Distractors must include a weakener, a topic match with no effect, and support for a different conclusion.'),
  'evaluation.weaken': G('Weaken', 'choose new information that makes the conclusion less likely by attacking the gap', ARG + ' Distractors must include a strengthener, a topic match with no effect, and an attack on a different claim.'),
  'evaluation.evaluate': G('Evaluate the argument', 'choose the question whose answer would most help evaluate the argument (different answers push in different directions)', ARG + ' Answer choices are questions or "whether" clauses. Distractors must be questions whose answers would not affect the conclusion.'),
  'evaluation.paradox': G('Resolve / explain', 'choose the fact that allows two apparently conflicting facts to both be true', 'The stimulus must present two facts in apparent tension and no conclusion. Distractors must include one that explains only one side, one that deepens the conflict, and one that denies a stated fact.'),
  'evaluation.causal': G('Causal reasoning', 'evaluate a causal conclusion drawn from a correlation: alternative causes, reverse causation, comparison groups', 'The stimulus must draw a causal conclusion from a correlation or sequence. Ask to weaken, strengthen, or identify the flaw. Distractors must include a mechanism that supports when the task is to weaken, and irrelevant facts.', (t) => /caus|because|led to|result|reduc|increas|improv/i.test(t)),
  'inference.must_be_true': G('Must be true / most strongly supported', 'draw only what the facts guarantee or most strongly support; reject outside knowledge and overstatement', 'The stimulus must be a set of facts with no conclusion. Distractors must include an overstatement, a reversed conditional, an outside-knowledge claim, and a merely possible claim.'),
  'inference.flaws': G('Flaw', 'name the specific way the evidence fails to support the conclusion (conditional, causal, sampling, ad hominem, authority, equivocation, false choice, part/whole, circular, absence of evidence)', ARG + ' The argument must commit exactly one recognizable flaw. Answer choices are abstract flaw descriptions; distractors must be real flaw types the argument does not commit.'),
  'advanced.parallel': G('Parallel reasoning / parallel flaw', 'match the logical form of an argument (including its flaw), not its topic', ARG + ' Use a clear form (e.g., A → B; B; so A). Each choice is a full argument on a different topic; distractors must change one element of the form (quantifier, direction, certainty) or commit a different flaw.'),
  'advanced.principles': G('Principles', 'apply a general principle to a case or identify the principle that justifies a judgment', 'The stimulus must state a principle with explicit conditions, or a judgment with its reasons. Distractors must include a case where a condition is not met, a reversed principle, and a principle that supports the opposite judgment.'),
  'rc.structure': G('Passage structure (main idea / purpose)', 'map a passage by function and identify its main idea or the purpose of a part', RC_P + ' Ask for the main idea, the organization, or why a detail is included. Distractors must include a detail, a too-broad claim, and a misdescribed function.'),
  'rc.author': G('Author perspective and tone', 'separate the author’s view from reported views and describe the author’s attitude with calibrated wording', RC_P + ' Include at least one reported view the author qualifies. Distractors must include extreme tones and attributing a reported view to the author.'),
  'rc.inference': G('RC detail / inference / application', 'locate stated details, draw supported inferences, and apply the passage’s idea to an analogous case', RC_P + ' Distractors must include outside knowledge, overstated inferences, wrong viewpoint, and topic-only analogies.'),
  'rc.comparative': G('Comparative passages', 'identify agreement, disagreement, and the relationship between two short passages', 'The stimulus must contain two original passages labeled "Passage A:" and "Passage B:" (80–130 words each) on the same question with partly opposed views. Distractors must include claims only one passage supports and shared-topic traps.'),
  'transfer.statistics': G('Statistics and base rates', 'separate percentages from numbers, account for base rates, and judge whether a sample supports a conclusion', ARG + ' Include invented numbers that create a percent-vs-number, base-rate, or sampling problem. Rationales must state any arithmetic.', (t) => /\d/.test(t)),
  'transfer.media': G('Evaluating claims in the media', 'apply LSAT reasoning to headlines, ads, and reports: causal overreach, scope shifts, sampling, and source incentives', 'The stimulus must be an invented headline, ad, or report with the underlying finding stated. Do not name real people, brands, or outlets. Distractors must include dismissing a claim because of its source and irrelevant details.'),
});

export function buildGenerationRequest({ skillId, stage, difficulty = 2, recentErrorTags = [], usedDomains = [] }, rng = Math.random) {
  const spec = SKILL_SPECS[skillId];
  if (!spec) throw new Error('No generation spec for skill ' + skillId);
  if (![1, 2, 3, 4].includes(difficulty)) throw new Error('difficulty must be 1-4');
  const pool = spec.domains.filter(d => !usedDomains.includes(d));
  const domain = (pool.length ? pool : spec.domains)[Math.floor(rng() * (pool.length || spec.domains.length))];
  const correctLetter = LETTERS[Math.floor(rng() * 5)];
  return {
    request_id: 'gen_' + Math.floor(rng() * 1e9).toString(36) + Date.now().toString(36),
    context: { skill_id: skillId, lesson_stage: stage, question_family: 'logical_reasoning', difficulty, target_objective: spec.objective },
    constraints: { count: 1, originality_required: true, avoid_prior_exposure: true, exclude_official_test_reproduction: true, include_explanation: true, include_distractor_rationales: true },
    student_context: { recent_error_tags: recentErrorTags.slice(0, 5) },
    domain, correctLetter, promptVersion: PROMPT_VERSION,
  };
}

export function requestToPrompt(req) {
  const spec = SKILL_SPECS[req.context.skill_id];
  const errs = req.student_context.recent_error_tags.length ? ` The student recently made these errors: ${req.student_context.recent_error_tags.join(', ')}; include a distractor that tests each.` : '';
  return 'Generate a Level ' + req.context.difficulty + ' (1=easiest, 4=hardest) LSAT Logical Reasoning question.' +
    ' QUESTION TYPE: ' + spec.questionType + '.' +
    ' LESSON STAGE: ' + req.context.lesson_stage + ' (independent practice — no hints will be shown).' +
    ' LEARNING OBJECTIVE: the student must ' + spec.objective + '.' +
    ' REQUIREMENTS: ' + spec.requirements + errs +
    ' CORRECT ANSWER: Make choice ' + req.correctLetter + ' the correct answer; it must be the only choice that is guaranteed true.' +
    ' DOMAIN: ' + req.domain + '. Original scenario only — never reproduce or imitate a published LSAT question.' +
    ' The explanation must use the format: CORRECT (' + req.correctLetter + '): ... WRONG (X): ... for every other letter.';
}

const VERIFY_SYSTEM = 'You are an independent LSAT answer checker. Solve the question yourself from the stimulus alone. ' +
  'Do not assume any choice is intended to be correct. Respond ONLY with JSON: ' +
  '{"answer":"A|B|C|D|E","confidence":"high|medium|low","ambiguous":true|false,"second_defensible":"A-E or null","issue":"short note or empty"}';

function verifyPrompt(q) {
  return 'Stimulus: ' + q.content.stimulus + '\nQuestion: ' + q.content.stem + '\n' + q.content.choices.map(c => `(${c.id}) ${c.text}`).join('\n');
}

export function authoredToServable(item, fingerprint = fingerprintQuestion({ stimulus: item.stimulus, question: item.stem })) {
  return {
    key: item.id, itemId: item.id, source: 'authored', difficulty: item.difficulty || 1, scorable: true,
    content: { stimulus: item.stimulus, stem: item.stem, choices: Object.entries(item.choices).map(([id, text]) => ({ id, text })) },
    answer: { correct_choice_id: item.correct, rationale: item.rationale, distractor_rationales: item.distractorRationales || {} },
    hints: item.hints || [], distractorTags: item.distractorTags || {}, fingerprint,
    validation: { status: 'approved', method: item.formal ? 'formal_truth_table' : 'manual', reviewStatus: 'in_review' },
  };
}

/** Pick an authored item for a stage, preferring ones the student has not seen. */
export function pickAuthored(lesson, stage, seenIds = new Set(), excludeIds = new Set()) {
  const pool = lesson.items.filter(i => i.stage === stage && !excludeIds.has(i.id));
  const unseen = pool.filter(i => !seenIds.has(i.id));
  const item = unseen[0] || pool[0] || null;
  return item ? { item, reused: !unseen.length } : null;
}

/**
 * Generate one validated question for a skill + stage.
 * deps: { callModel(system,user,maxTokens) -> Promise<string>, practiceSystem, parseJSON, lesson, seenIds, exposure, now }
 * Returns { status: 'approved'|'provisional'|'fallback'|'failed', question, log, message }
 */
export async function generateSkillQuestion(ctx, deps, policy = GENERATION_POLICY) {
  const started = Date.now();
  const outcomes = [];
  const req = buildGenerationRequest(ctx, deps.rng);
  const exposure = deps.exposure || [];
  let lastErr = null;

  if (deps.callModel) {
    for (let attempt = 1; attempt <= policy.maxAttempts; attempt++) {
      let raw;
      try { raw = deps.parseJSON(await deps.callModel(deps.practiceSystem, requestToPrompt(req), 1300)); }
      catch (e) { lastErr = e; outcomes.push({ attempt, reason: 'provider_or_parse_error', detail: String(e?.message || e).slice(0, 120) }); if (isFatal(e)) break; continue; }

      const v = validateGeneratedQuestion(raw);
      if (!v.ok) { outcomes.push({ attempt, reason: 'schema', detail: v.errors.join('; ').slice(0, 200) }); continue; }
      const q = v.question;
      const spec = SKILL_SPECS[ctx.skillId];
      const aligned = spec.align ? spec.align(q.content.stimulus) : conditionalLanguageScore(q.content.stimulus) >= 2;
      if (!aligned) { outcomes.push({ attempt, reason: 'skill_alignment', detail: 'stimulus does not exercise the target skill' }); continue; }
      const fp = fingerprintQuestion(q);
      const dup = screenDuplicate(fp, exposure, policy);
      if (dup.duplicate) { outcomes.push({ attempt, reason: 'duplicate_' + dup.kind, detail: dup.score.toFixed(2) }); continue; }

      let status = 'approved'; let verify = null;
      if (policy.verifyWithSecondPass) {
        try {
          verify = deps.parseJSON(await deps.callModel(VERIFY_SYSTEM, verifyPrompt(q), 300));
          if (!LETTERS.includes(verify?.answer)) throw new Error('verifier returned no answer');
          if (verify.answer !== q.answer.correct_choice_id) { outcomes.push({ attempt, reason: 'logic_mismatch', detail: `verifier chose ${verify.answer}, key ${q.answer.correct_choice_id}` }); continue; }
          if (verify.ambiguous || (verify.second_defensible && LETTERS.includes(verify.second_defensible))) { outcomes.push({ attempt, reason: 'ambiguous', detail: String(verify.issue || '').slice(0, 120) }); continue; }
          if (verify.confidence === 'low') status = 'provisional';
        } catch (e) {
          status = 'provisional'; // could not independently verify → servable, but excluded from mastery scoring
          outcomes.push({ attempt, reason: 'verifier_unavailable', detail: String(e?.message || e).slice(0, 120) });
        }
      }
      if (v.warnings.length) status = status === 'approved' && v.warnings.some(w => w.startsWith('no distractor')) ? 'provisional' : status;
      outcomes.push({ attempt, reason: status });
      const question = {
        key: fp.id, itemId: 'gen:' + fp.id, source: 'generated', difficulty: ctx.difficulty, scorable: status === 'approved',
        ...q, hints: [], distractorTags: {}, fingerprint: fp,
        metadata: { skill_ids: [ctx.skillId], difficulty: ctx.difficulty, lesson_stage: ctx.stage, generation_version: PROMPT_VERSION, request_id: req.request_id, domain: req.domain },
        validation: { schema_valid: true, answer_uniqueness_checked: !!verify, skill_alignment_checked: true, originality_screened: true, status, warnings: v.warnings },
      };
      return { status, question, log: logEntry(req, ctx, outcomes, status, started) };
    }
  }

  // Fallback: approved authored practice, labeled as such. Never fabricate, never award for failure.
  const pick = deps.lesson ? pickAuthored(deps.lesson, ctx.fallbackStage || ctx.stage, deps.seenIds, deps.excludeIds) : null;
  const msg = !deps.callModel ? 'AI generation is not available.' : (lastErr ? 'AI generation is temporarily unavailable.' : 'Generated questions did not pass quality checks.');
  if (pick) {
    const q = authoredToServable(pick.item);
    q.source = 'fallback';
    return { status: 'fallback', question: q, reused: pick.reused, message: msg, log: logEntry(req, ctx, outcomes, 'fallback', started) };
  }
  return { status: 'failed', question: null, message: msg, log: logEntry(req, ctx, outcomes, 'failed', started) };
}

function isFatal(e) { return /not configured|rate|429|too many/i.test(String(e?.message || '')); }

function logEntry(req, ctx, outcomes, disposition, started) {
  return { requestId: req.request_id, at: Date.now(), skillId: ctx.skillId, stage: ctx.stage, difficulty: ctx.difficulty, promptVersion: PROMPT_VERSION, attempts: outcomes.length, outcomes, disposition, ms: Date.now() - started };
}

/**
 * Approximate "question structure" for the mastery gate (≥3 distinct structures): the reasoning
 * pattern in the stimulus × the task in the stem. Deterministic and explainable; not a full parse.
 */
export function structureKey(content) {
  const stim = String(content?.stimulus || '').toLowerCase();
  const stem = String(content?.stem || '').toLowerCase();
  const pattern =
    /\b(percent|%|survey|poll|sample|rate|study|studies)\b/.test(stim) ? 'statistical'
    : /\b(caus|led to|result|because of|reduc|increas|improv|declin|rose|fell)/.test(stim) ? 'causal'
    : /\b(if|only|unless|every|all|no one|none|whenever|any)\b/.test(stim) ? 'conditional'
    : /\b(similar|like|unlike|than|compared)\b/.test(stim) ? 'comparative'
    : /\b(should|ought|must)\b/.test(stim) ? 'recommendation' : 'other';
  const task =
    /must (also )?be true|must be false|properly drawn|follows/.test(stem) ? 'deduce'
    : /strengthen|support/.test(stem) ? 'support'
    : /weaken|undermine|vulnerable|flaw|criticism/.test(stem) ? 'attack'
    : /assum|depends|requires/.test(stem) ? 'assume'
    : /similar|parallel/.test(stem) ? 'match'
    : /role|function|serves|proceeds|method|describes|organization/.test(stem) ? 'describe'
    : 'identify';
  return `${pattern}:${task}`;
}
