// Progress: mastery by skill (with reasons), independent vs assisted, confidence vs correctness,
// timing (separate from accuracy), retention — plus learning achievements. No false precision.
import { getEngine } from './store.js';
import { SKILLS, BRANCHES } from './skills.js';
import { STATE_LABELS, isIndependentCorrect } from './mastery.js';
import { ACHIEVEMENTS, learningLevel } from './achievements.js';
import { styles, FocusStyles } from './LearnPath.jsx';

const DAY = 86400000;
const pct = (n, d) => (d >= 5 ? Math.round((n / d) * 100) + '%' : '—');
const median = (xs) => { if (!xs.length) return null; const s = [...xs].sort((a, b) => a - b); return s[Math.floor(s.length / 2)]; };

export function progressStats(engine) {
  const sc = engine.attempts.filter(a => a.scorable !== false && !['learn', 'recognize'].includes(a.stage));
  const indep = sc.filter(a => !(a.hintsUsed > 0) && !a.revealed);
  const assisted = sc.filter(a => a.hintsUsed > 0 || a.revealed);
  const conf = (c) => { const xs = sc.filter(a => a.confidence === c); return { n: xs.length, correct: xs.filter(a => a.correct).length }; };
  const reviews = sc.filter(a => a.stage === 'review');
  const times = sc.filter(a => a.timeMs > 0 && a.timeMs < 30 * 60000);
  return {
    total: sc.length,
    independent: { n: indep.length, correct: indep.filter(isIndependentCorrect).length },
    assisted: { n: assisted.length, correct: assisted.filter(a => a.correct).length },
    sure: conf('sure'), think: conf('think'), guess: conf('guess'),
    reviews: { n: reviews.length, correct: reviews.filter(isIndependentCorrect).length },
    medianSeconds: { challenge: median(times.filter(a => ['challenge', 'mastery_check', 'review'].includes(a.stage)).map(a => a.timeMs / 1000)) },
  };
}

export function ProgressPanel({ user, theme: C, fonts: T }) {
  const S = styles(C, T);
  const engine = getEngine(user);
  const st = progressStats(engine);
  const lvl = learningLevel(engine);
  const earned = new Map((engine.achievements || []).map(a => [a.id, a.at]));
  const started = SKILLS.filter(s => engine.mastery[s.id] && engine.mastery[s.id].state !== 'not_started');
  const row = (label, value, note) => <tr><th scope="row" style={{ textAlign: 'left', padding: '6px 8px', color: C.textSub, fontWeight: 500 }}>{label}</th><td style={{ padding: '6px 8px', color: C.text, fontWeight: 700 }}>{value}</td><td style={{ padding: '6px 8px', ...S.small }}>{note}</td></tr>;

  return (
    <section aria-labelledby="pp-h" style={{ marginBottom: 28 }}>
      <FocusStyles C={C} />
      <h2 id="pp-h" style={{ ...S.h1, fontSize: 22 }}>Learning progress</h2>
      <p style={S.small}>Measured by what you can do on your own and remember later — not by how many questions you answered.</p>

      <div style={{ ...S.card, marginTop: 12 }}>
        <h3 style={{ ...S.h2, fontSize: 17 }}>Skills</h3>
        {started.length === 0 ? <p style={S.p}>No guided skills started yet. Your first lesson is waiting in Learn.</p> :
          BRANCHES.map(b => {
            const list = started.filter(s => s.branch === b.id); if (!list.length) return null;
            return <div key={b.id} style={{ marginBottom: 10 }}>
              <div style={{ ...S.small, textTransform: 'uppercase', letterSpacing: '0.06em', fontWeight: 700 }}>{b.title}</div>
              {list.map(s => { const m = engine.mastery[s.id]; return (
                <details key={s.id} style={{ padding: '6px 0', borderBottom: `1px solid ${C.border}` }}>
                  <summary className="lp-focus" style={{ cursor: 'pointer', color: C.text, fontSize: 14 }}>
                    <strong>{s.title}</strong> — {STATE_LABELS[m.state]}{m.needsReview ? ' · needs review' : ''}
                  </summary>
                  <ul style={{ paddingLeft: 18, margin: '6px 0' }}>{m.reasons.map((r, i) => <li key={i} style={S.small}>{r}</li>)}</ul>
                  <div style={S.small}>Evidence: {m.evidence.independentCorrect} independent correct · {m.evidence.assistedCorrect} assisted · {m.evidence.delayedCorrect} delayed reviews correct · {m.evidence.distinctItems} different questions.</div>
                </details>
              ); })}
            </div>;
          })}
      </div>

      <div style={{ ...S.card, marginTop: 12, overflowX: 'auto' }}>
        <h3 style={{ ...S.h2, fontSize: 17 }}>How you answer</h3>
        {st.total < 5 ? <p style={S.p}>A few more answers are needed before these numbers mean anything.</p> :
          <table style={{ borderCollapse: 'collapse', fontSize: 14, width: '100%' }}>
            <caption style={{ ...S.small, textAlign: 'left', marginBottom: 6 }}>Percentages appear once there are at least 5 answers in a group.</caption>
            <tbody>
              {row('On your own', pct(st.independent.correct, st.independent.n), `${st.independent.n} answers without hints`)}
              {row('With help', pct(st.assisted.correct, st.assisted.n), `${st.assisted.n} answers after hints — great for learning, counted separately`)}
              {row('When “Sure”', pct(st.sure.correct, st.sure.n), 'Should be high. If not, slow down on answers that feel obvious.')}
              {row('When “Guessing”', pct(st.guess.correct, st.guess.n), 'Lucky guesses are not counted as mastery.')}
              {row('Spaced reviews', pct(st.reviews.correct, st.reviews.n), `${st.reviews.n} retention checks`)}
              {row('Typical time (independent questions)', st.medianSeconds.challenge != null ? `${Math.round(st.medianSeconds.challenge)}s` : '—', 'Shown separately from accuracy. About 80–85s per question is LSAT pace.')}
            </tbody>
          </table>}
      </div>

      <div style={{ ...S.card, marginTop: 12 }}>
        <h3 style={{ ...S.h2, fontSize: 17 }}>Learning level {lvl.level}</h3>
        <div role="progressbar" aria-valuemin={0} aria-valuemax={lvl.forNext} aria-valuenow={lvl.intoLevel} aria-label="Progress to next learning level" style={{ height: 6, background: C.surfaceHigh, borderRadius: 3, margin: '4px 0 6px' }}>
          <div style={{ width: `${Math.min(100, (lvl.intoLevel / lvl.forNext) * 100)}%`, height: '100%', background: C.accent, borderRadius: 3 }} />
        </div>
        <p style={S.small}>{lvl.intoLevel} / {lvl.forNext} learning XP to level {lvl.level + 1}. Learning XP comes from finishing stages, independent answers, fixing mistakes, and passing reviews.</p>
        <ul style={{ listStyle: 'none', padding: 0, display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(220px,1fr))', gap: 8, marginTop: 10 }}>
          {ACHIEVEMENTS.map(a => { const at = earned.get(a.id); return (
            <li key={a.id} style={{ border: `1px solid ${at ? C.gold + '66' : C.border}`, borderRadius: 12, padding: 10, opacity: at ? 1 : 0.6 }}>
              <div style={{ fontSize: 14, color: C.text, fontWeight: 700 }}><span aria-hidden="true">{a.icon}</span> {a.title}{at && Date.now() - at < DAY ? <span style={{ ...S.tag(C.gold), marginLeft: 6 }}>New</span> : null}</div>
              <div style={S.small}>{a.desc}</div>
              <div style={{ ...S.small, marginTop: 4 }}>{at ? `Earned ${new Date(at).toLocaleDateString()}` : 'Not yet'}</div>
            </li>
          ); })}
        </ul>
      </div>
    </section>
  );
}
