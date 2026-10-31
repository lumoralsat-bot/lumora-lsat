// Classic lesson → rebuilt lesson routing (Curriculum v2.1 addendum). Every Classic entry point
// opens the rebuilt lesson (and track) that teaches the same skill. Classic content stays
// available as reference, but progress from it is shown as "legacy" and never promoted to mastery.
export const CLASSIC_ROUTES = [
  { section: 'LR', label: 'Assumption', skillId: 'evaluation.necessary_assumption', track: null },
  { section: 'LR', label: 'Weaken', skillId: 'evaluation.weaken', track: null },
  { section: 'LR', label: 'Strengthen', skillId: 'evaluation.strengthen', track: null },
  { section: 'LR', label: 'Flaw', skillId: 'inference.flaws', track: null },
  { section: 'LR', label: 'Inference', skillId: 'inference.must_be_true', track: 'must_be_true' },
  { section: 'LR', label: 'Main Point', skillId: 'analysis.main_conclusion', track: null },
  { section: 'LR', label: 'Paradox', skillId: 'evaluation.paradox', track: null },
  { section: 'LR', label: 'Method of Reasoning', skillId: 'analysis.method', track: null },
  { section: 'LR', label: 'Parallel Reasoning', skillId: 'advanced.parallel', track: 'parallel_reasoning' },
  { section: 'LR', label: 'Evaluate', skillId: 'evaluation.evaluate', track: null },
  { section: 'RC', label: 'Main Idea', skillId: 'rc.structure', track: 'main_idea' },
  { section: 'RC', label: 'Purpose', skillId: 'rc.structure', track: 'purpose' },
  { section: 'RC', label: "Author's Tone", skillId: 'rc.author', track: null },
  { section: 'RC', label: 'Detail', skillId: 'rc.inference', track: 'detail' },
  { section: 'RC', label: 'Inference', skillId: 'rc.inference', track: 'inference' },
  { section: 'RC', label: 'Analogy', skillId: 'rc.inference', track: 'analogy' },
  { section: 'RC', label: 'Comparative Passage', skillId: 'rc.comparative', track: null },
];
const KEY = (section, label) => `${section}:${label}`;
const BY_KEY = Object.fromEntries(CLASSIC_ROUTES.map(r => [KEY(r.section, r.label), r]));
/** section: 'LR' | 'RC' | 'Logical Reasoning' | 'Reading Comprehension' */
export function classicRoute(section, label) {
  const s = /^R/i.test(section) ? 'RC' : 'LR';
  return BY_KEY[KEY(s, label)] || null;
}

// ── Hash deep links ─────────────────────────────────────────────────────────
// #learn/<skillId>[/<track>]   and   #classic/<LR|RC>/<Label>  (label URI-encoded)
export function routeToHash(route) {
  if (!route) return '';
  if (route.kind === 'classic') return `#classic/${route.section}/${encodeURIComponent(route.label)}`;
  return `#learn/${route.skillId}${route.track ? '/' + route.track : ''}`;
}
export function parseHash(hash) {
  const h = String(hash || '').replace(/^#/, '');
  let m = /^learn\/([a-z_]+\.[a-z_]+)(?:\/([a-z_]+))?$/.exec(h);
  if (m) return { kind: 'learn', skillId: m[1], track: m[2] || null };
  m = /^classic\/(LR|RC)\/(.+)$/.exec(h);
  if (m) {
    let label; try { label = decodeURIComponent(m[2]); } catch { return null; }
    const r = classicRoute(m[1], label);
    return r ? { kind: 'learn', skillId: r.skillId, track: r.track, fromClassic: { section: r.section, label: r.label } } : null;
  }
  return null;
}
