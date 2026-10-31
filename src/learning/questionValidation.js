// Question schema validation, normalization, fingerprinting and duplicate screening.
// Works with the EXISTING generator output shape:
//   { stimulus, question, choices:{A..E}, correct, explanation }
// and returns the normalized contract from the spec (content / answer / metadata / validation).
import { GENERATION_POLICY } from './config.js';

const LETTERS = ['A', 'B', 'C', 'D', 'E'];

/** Parse "CORRECT (B): ... WRONG (A): ..." explanations into per-choice rationales. */
export function parseExplanation(explanation = '') {
  const out = { correctLetters: [], rationale: '', distractors: {} };
  const re = /(CORRECT|WRONG)\s*\(([A-E])\)\s*:?\s*/g;
  const marks = []; let m;
  while ((m = re.exec(explanation))) marks.push({ kind: m[1], letter: m[2], start: m.index, bodyStart: re.lastIndex });
  marks.forEach((mk, i) => {
    const body = explanation.slice(mk.bodyStart, i + 1 < marks.length ? marks[i + 1].start : undefined).trim();
    if (mk.kind === 'CORRECT') { out.correctLetters.push(mk.letter); out.rationale = body; }
    else out.distractors[mk.letter] = body;
  });
  return out;
}

/**
 * Validate a raw generated question. Never throws.
 * @returns {{ok:boolean, errors:string[], warnings:string[], question?:object}}
 */
export function validateGeneratedQuestion(raw, { choiceCount = 5 } = {}) {
  const errors = []; const warnings = [];
  if (!raw || typeof raw !== 'object') return { ok: false, errors: ['not an object'], warnings };
  const str = (v) => typeof v === 'string' && v.trim().length > 0;
  if (!str(raw.stimulus)) errors.push('missing stimulus');
  if (!str(raw.question)) errors.push('missing question stem');
  const letters = LETTERS.slice(0, choiceCount);
  if (!raw.choices || typeof raw.choices !== 'object') errors.push('missing choices');
  else {
    for (const L of letters) if (!str(raw.choices[L])) errors.push(`missing choice ${L}`);
    const extra = Object.keys(raw.choices).filter(k => !letters.includes(k));
    if (extra.length) errors.push('unexpected choice ids: ' + extra.join(','));
    const texts = letters.map(L => norm(raw.choices[L] || ''));
    if (new Set(texts).size !== texts.length) errors.push('duplicate answer choices');
  }
  if (!letters.includes(raw.correct)) errors.push('answer key does not reference an existing choice');
  if (!str(raw.explanation)) errors.push('missing explanation');

  let parsed = { correctLetters: [], rationale: '', distractors: {} };
  if (str(raw.explanation)) {
    parsed = parseExplanation(raw.explanation);
    if (parsed.correctLetters.length > 1) errors.push('explanation marks more than one choice correct');
    if (parsed.correctLetters.length === 1 && parsed.correctLetters[0] !== raw.correct) errors.push(`explanation contradicts answer key (explains ${parsed.correctLetters[0]}, key ${raw.correct})`);
    if (parsed.distractors[raw.correct]) errors.push('explanation calls the keyed answer wrong');
    const missing = letters.filter(L => L !== raw.correct && !parsed.distractors[L]);
    if (missing.length) warnings.push('no distractor rationale for ' + missing.join(','));
    if (parsed.correctLetters.length === 0) warnings.push('explanation has no CORRECT (X) marker');
  }
  if (errors.length) return { ok: false, errors, warnings };

  const question = {
    content: { stimulus: raw.stimulus.trim(), stem: raw.question.trim(), choices: letters.map(L => ({ id: L, text: raw.choices[L].trim() })) },
    answer: { correct_choice_id: raw.correct, rationale: parsed.rationale || raw.explanation, distractor_rationales: parsed.distractors, explanation: raw.explanation },
  };
  return { ok: true, errors, warnings, question };
}

// ── Fingerprints & similarity ─────────────────────────────────────────────────
export function norm(t) {
  return String(t || '').toLowerCase().replace(/[‘’]/g, "'").replace(/[^a-z0-9%' ]+/g, ' ').replace(/\s+/g, ' ').trim();
}
/** Mask surface details so "same structure, different nouns/names/numbers" collide. */
export function maskSurface(t) {
  const KEEP = 'if|only|unless|not|no|all|every|any|some|most|none|therefore|thus|so|because|since|but|however|whenever|without|requires?|must|never|always|and|or|then|the|a|an|of|to|is|are|was|were|will|be|in';
  return String(t || '')
    .replace(/\b\d[\d,.]*%?/g, ' NUM ')
    .toLowerCase()
    .replace(new RegExp('\\b(?!(?:' + KEEP + ')\\b)[a-z\']{3,}\\b', 'g'), 'w')
    .replace(/[^a-z ]+/g, ' ').replace(/\s+/g, ' ').trim();
}
export function fnv1a(str) {
  let h = 0x811c9dc5;
  for (let i = 0; i < str.length; i++) { h ^= str.charCodeAt(i); h = Math.imul(h, 0x01000193) >>> 0; }
  return h.toString(16).padStart(8, '0');
}
function trigrams(t) {
  const w = t.split(' ').filter(Boolean); const s = new Set();
  for (let i = 0; i + 2 < w.length; i++) s.add(w[i] + ' ' + w[i + 1] + ' ' + w[i + 2]);
  if (w.length < 3 && w.length) s.add(w.join(' '));
  return s;
}
export function jaccard(a, b) {
  if (!a.size && !b.size) return 1;
  let inter = 0; for (const x of a) if (b.has(x)) inter++;
  return inter / (a.size + b.size - inter);
}

/** Compact, storable fingerprint for exposure tracking. */
export function fingerprintQuestion(q) {
  const stim = q.content?.stimulus ?? q.stimulus ?? '';
  const stem = q.content?.stem ?? q.question ?? '';
  const n = norm(stim + ' ' + stem);
  const sample = (set, k) => [...set].map(x => fnv1a(x)).sort().slice(0, k); // min-hash style sketch
  return {
    id: fnv1a(n),
    text: sample(trigrams(n), 64),
    structure: sample(trigrams(maskSurface(stim)), 64),
  };
}

function sketchJaccard(a = [], b = []) { return jaccard(new Set(a), new Set(b)); }

/**
 * Compare a candidate fingerprint against prior fingerprints.
 * Returns { duplicate: boolean, kind: 'exact'|'near'|'structural'|null, score }.
 * Limitation: no embedding model is available client-side, so semantic paraphrase that
 * changes most wording AND structure will not be caught (documented in the audit).
 */
export function screenDuplicate(fp, priorFps = [], policy = GENERATION_POLICY) {
  let best = { duplicate: false, kind: null, score: 0 };
  for (const p of priorFps) {
    if (!p) continue;
    if (p.id === fp.id) return { duplicate: true, kind: 'exact', score: 1 };
    const t = sketchJaccard(fp.text, p.text);
    if (t >= policy.nearDuplicateJaccard) return { duplicate: true, kind: 'near', score: t };
    const s = sketchJaccard(fp.structure, p.structure);
    if (s >= policy.structuralDuplicateJaccard) return { duplicate: true, kind: 'structural', score: s };
    best.score = Math.max(best.score, t, s);
  }
  return best;
}

/** Heuristic skill-alignment check for conditional-reasoning items. */
export function conditionalLanguageScore(text) {
  const t = ' ' + norm(text) + ' ';
  const cues = [' if ', ' only if ', ' unless ', ' without ', ' requires ', ' required ', ' necessary ', ' sufficient ', ' every ', ' all ', ' any ', ' no ', ' only ', ' whenever ', ' must '];
  return cues.filter(c => t.includes(c)).length;
}
