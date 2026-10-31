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
