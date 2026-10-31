// Deterministic propositional-logic checker.
// Used to VERIFY authored curriculum items (keyed answers must be uniquely entailed)
// and in unit tests for contrapositive / converse / inverse rules.
//
// Syntax:  variables = letters/words ([A-Za-z_][A-Za-z0-9_]*)
//          ~X   not        X & Y  and        X | Y  or
//          X -> Y  if-then (right associative)   X <-> Y  iff     ( ) grouping
// Precedence (high→low): ~, &, |, ->, <->

export function parse(src) {
  const toks = tokenize(src);
  let i = 0;
  const peek = () => toks[i];
  const eat = (t) => { if (toks[i] !== t) throw new Error(`Expected ${t} at token ${i} in "${src}"`); i++; };
  function iff() { let l = imp(); while (peek() === '<->') { i++; l = { op: 'iff', a: l, b: imp() }; } return l; }
  function imp() { const l = or(); if (peek() === '->') { i++; return { op: 'imp', a: l, b: imp() }; } return l; }
  function or() { let l = and(); while (peek() === '|') { i++; l = { op: 'or', a: l, b: and() }; } return l; }
  function and() { let l = un(); while (peek() === '&') { i++; l = { op: 'and', a: l, b: un() }; } return l; }
  function un() {
    const t = peek();
    if (t === '~') { i++; return { op: 'not', a: un() }; }
    if (t === '(') { i++; const e = iff(); eat(')'); return e; }
    if (t && /^[A-Za-z_]/.test(t)) { i++; return { op: 'var', name: t }; }
    throw new Error(`Unexpected token "${t}" in "${src}"`);
  }
  const ast = iff();
  if (i !== toks.length) throw new Error(`Trailing tokens in "${src}"`);
  return ast;
}

function tokenize(s) {
  const out = []; let i = 0;
  while (i < s.length) {
    const c = s[i];
    if (/\s/.test(c)) { i++; continue; }
    if (s.startsWith('<->', i)) { out.push('<->'); i += 3; continue; }
    if (s.startsWith('->', i)) { out.push('->'); i += 2; continue; }
    if ('~&|()'.includes(c)) { out.push(c); i++; continue; }
    const m = /^[A-Za-z_][A-Za-z0-9_]*/.exec(s.slice(i));
    if (m) { out.push(m[0]); i += m[0].length; continue; }
    throw new Error(`Bad character "${c}" in "${s}"`);
  }
  return out;
}

export function vars(ast, set = new Set()) {
  if (ast.op === 'var') set.add(ast.name);
  else { if (ast.a) vars(ast.a, set); if (ast.b) vars(ast.b, set); }
  return set;
}

export function evaluate(ast, env) {
  switch (ast.op) {
    case 'var': return !!env[ast.name];
    case 'not': return !evaluate(ast.a, env);
    case 'and': return evaluate(ast.a, env) && evaluate(ast.b, env);
    case 'or': return evaluate(ast.a, env) || evaluate(ast.b, env);
    case 'imp': return !evaluate(ast.a, env) || evaluate(ast.b, env);
    case 'iff': return evaluate(ast.a, env) === evaluate(ast.b, env);
    default: throw new Error('Unknown op ' + ast.op);
  }
}

const P = (f) => (typeof f === 'string' ? parse(f) : f);

function* assignments(names) {
  const n = names.length;
  for (let m = 0; m < (1 << n); m++) {
    const env = {};
    names.forEach((v, k) => { env[v] = !!(m & (1 << k)); });
    yield env;
  }
}

/** Do the premises jointly entail the conclusion? (truth-table check) */
export function entails(premises, conclusion) {
  const ps = premises.map(P); const c = P(conclusion);
  const names = [...[...ps, c].reduce((s, a) => vars(a, s), new Set())];
  if (names.length > 16) throw new Error('Too many variables for truth table');
  for (const env of assignments(names)) {
    if (ps.every(p => evaluate(p, env)) && !evaluate(c, env)) return false;
  }
  return true;
}

export function equivalent(f, g) { return entails([f], g) && entails([g], f); }

export function consistent(formulas) {
  const ps = formulas.map(P);
  const names = [...ps.reduce((s, a) => vars(a, s), new Set())];
  for (const env of assignments(names)) if (ps.every(p => evaluate(p, env))) return true;
  return false;
}

/**
 * Validate a formally-encoded multiple-choice item.
 * item.formal = { premises: [..], choices: {A:'formula',...}, mode: 'must_be_true'|'equivalent' }
 * Returns { ok, entailedChoices, problems }.
 */
export function checkFormalItem(item) {
  const f = item.formal; const problems = [];
  if (!f) return { ok: false, problems: ['no formal encoding'], entailedChoices: [] };
  if (f.premises && !consistent(f.premises)) problems.push('premises are inconsistent');
  const ids = Object.keys(f.choices);
  const good = ids.filter(id => {
    if (f.mode === 'equivalent') return equivalent(f.premises[0], f.choices[id]);
    return entails(f.premises, f.choices[id]);
  });
  if (good.length !== 1) problems.push(`expected exactly one valid choice, found ${good.length} (${good.join(',')})`);
  if (good.length === 1 && good[0] !== item.correct) problems.push(`keyed ${item.correct} but logic supports ${good[0]}`);
  return { ok: problems.length === 0, entailedChoices: good, problems };
}

// ─── Quantified (monadic) statements ────────────────────────────────────────
// Syntax: "all A B" | "some A B" | "no A B" | "most A B" | "notall A B" (= some A are not B)
// Terms may be negated with ~ (e.g. "all A ~B"). Checked by bounded model enumeration over
// individual "types" (which predicates each individual has) with up to MAXC individuals per type.
// For all/some/no this is exhaustive (monadic logic only depends on which types are inhabited);
// with "most" it is a bounded search (≤3 per type), reported as such.
const MAXC = 3;
function parseQ(s) {
  const m = /^\s*(all|some|no|most|notall)\s+(~?[A-Za-z_]\w*)\s+(~?[A-Za-z_]\w*)\s*$/.exec(s);
  if (!m) throw new Error('Bad quantified statement: ' + s);
  const term = (t) => ({ name: t.replace('~', ''), neg: t.startsWith('~') });
  return { q: m[1], a: term(m[2]), b: term(m[3]) };
}
function qPreds(stmts) { const set = new Set(); for (const s of stmts) { set.add(s.a.name); set.add(s.b.name); } return [...set]; }
function holdsQ(s, preds, counts) {
  const has = (type, t) => (((type >> preds.indexOf(t.name)) & 1) === 1) !== t.neg;
  let ab = 0, aNotB = 0;
  counts.forEach((c, type) => { if (!c) return; if (has(type, s.a)) { if (has(type, s.b)) ab += c; else aNotB += c; } });
  switch (s.q) {
    case 'all': return aNotB === 0;
    case 'no': return ab === 0;
    case 'some': return ab > 0;
    case 'notall': return aNotB > 0;
    case 'most': return ab > aNotB && ab > 0;
    default: return false;
  }
}
function* qModels(nTypes, maxc) {
  const counts = new Array(nTypes).fill(0);
  while (true) {
    yield counts;
    let i = 0;
    while (i < nTypes && counts[i] === maxc) { counts[i] = 0; i++; }
    if (i === nTypes) return;
    counts[i]++;
  }
}
export function qEntails(premises, conclusion) {
  const ps = premises.map(parseQ); const c = parseQ(conclusion);
  const preds = qPreds([...ps, c]);
  if (preds.length > 4) throw new Error('Too many predicates');
  const usesMost = [...ps, c].some(s => s.q === 'most');
  const nTypes = 1 << preds.length;
  for (const counts of qModels(nTypes, usesMost ? MAXC : 1)) {
    if (ps.every(p => holdsQ(p, preds, counts)) && !holdsQ(c, preds, counts)) return false;
  }
  return true;
}
export function qConsistent(premises) {
  const ps = premises.map(parseQ); const preds = qPreds(ps);
  const usesMost = ps.some(s => s.q === 'most');
  for (const counts of qModels(1 << preds.length, usesMost ? MAXC : 1)) if (ps.every(p => holdsQ(p, preds, counts))) return true;
  return false;
}
/** Like checkFormalItem, for items whose formal.kind === 'quantified'. */
export function checkQuantifiedItem(item) {
  const f = item.formal; const problems = [];
  if (!qConsistent(f.premises)) problems.push('premises are inconsistent');
  const good = Object.keys(f.choices).filter(id => qEntails(f.premises, f.choices[id]));
  if (good.length !== 1) problems.push(`expected exactly one valid choice, found ${good.length} (${good.join(',')})`);
  if (good.length === 1 && good[0] !== item.correct) problems.push(`keyed ${item.correct} but logic supports ${good[0]}`);
  return { ok: problems.length === 0, entailedChoices: good, problems };
}
