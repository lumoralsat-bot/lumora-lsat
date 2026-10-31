// Practice engine: wraps the EXISTING generator (callClaude + PRACTICE_SYSTEM from App.jsx) behind a
// stable interface. Pipeline: build request → generate → schema check → logic check (blind second-pass
// solve) → skill check → originality screen → approve | provisional | regenerate → authored fallback.
import { GENERATION_POLICY } from './config.js';
import { validateGeneratedQuestion, fingerprintQuestion, screenDuplicate, conditionalLanguageScore } from './questionValidation.js';

export const PROMPT_VERSION = 'skillgen-ns-v1';
const LETTERS = ['A', 'B', 'C', 'D', 'E'];

const SKILL_SPECS = {
  'formal.necessary_sufficient': {
    questionType: 'Must Be True (conditional reasoning)',
    objective: 'translate conditional language and draw only conclusions supported by the rule or its contrapositive; reject converse and inverse errors',
    requirements: 'The stimulus must state at least two conditional rules using varied indicators (e.g., "only if", "unless", "every", "no", "requires", "whenever") plus one fact. The correct answer must follow by applying a contrapositive and/or chaining rules. Distractors must include at least one converse error and one inverse error, plus one plausible but unsupported claim. Every rule applies to the individual named in the fact. Avoid quantifier words like "some" or "most".',
    domains: ['municipal permitting', 'a university course policy', 'a hospital staffing rule', 'a museum loan agreement', 'a farm irrigation schedule', 'a software release process', 'a sports league eligibility rule', 'a library archive policy', 'a shipping and customs procedure', 'a theater production schedule', 'a wildlife survey protocol', 'a court filing rule'],
  },
};

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
      if (conditionalLanguageScore(q.content.stimulus) < 2) { outcomes.push({ attempt, reason: 'skill_alignment', detail: 'stimulus lacks conditional rules' }); continue; }
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
