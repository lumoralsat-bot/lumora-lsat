// Compact authoring helpers. Content stays explicit; these only assign letters and shape records.
const L = ['A', 'B', 'C', 'D', 'E'];

/**
 * item(id, stage, difficulty, stimulus, stem, options, extra)
 * options: [[text, tag, why], ...] — exactly one option has tag 'KEY' (its `why` is the rationale).
 * extra: { hints, track, formal: {mode|kind, premises, choices:[...aligned to options]}, verifiedBy }
 */
export function item(id, stage, difficulty, stimulus, stem, options, extra = {}) {
  const keys = options.map((o, i) => (o[1] === 'KEY' ? i : -1)).filter(i => i >= 0);
  if (keys.length !== 1) throw new Error(`${id}: exactly one KEY option required`);
  const choices = {}, distractorRationales = {}, distractorTags = {};
  options.forEach(([text, tag, why], i) => {
    choices[L[i]] = text;
    if (tag !== 'KEY') { distractorRationales[L[i]] = why; distractorTags[L[i]] = tag; }
  });
  const out = {
    id, stage, difficulty, stimulus, stem, choices, correct: L[keys[0]],
    rationale: options[keys[0]][2], distractorRationales, distractorTags,
  };
  if (extra.hints) out.hints = extra.hints;
  if (extra.track) out.track = extra.track;
  if (extra.formal) {
    const f = extra.formal;
    out.formal = { ...f, choices: Object.fromEntries(f.choices.map((c, i) => [L[i], c])) };
  } else {
    out.formal = null;
    out.verifiedBy = extra.verifiedBy || 'author';
  }
  return out;
}

/** Shared review metadata: honest status until a qualified human reviews the content. */
export const REVIEW = (machineChecked, limitations = []) => ({ status: 'in_review', machineChecked, reviewer: null, lastReviewed: null, knownLimitations: limitations });
