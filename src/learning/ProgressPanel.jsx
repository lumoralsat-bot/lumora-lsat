// Progress sections for the learning system. Measured by what the student can do on their own and
// remember later — never by raw volume. Summaries are withheld (shown as "—") when data is too thin.
import { useState } from 'react';
import { fz } from '../ui/scale.js';
import { Panel, Stat, ProgressBar, StatusMark, Chip, SectionTitle } from '../ui/kit.jsx';
import { getEngine } from './store.js';
import { SKILLS, BRANCHES } from './skills.js';
import { STATE_LABELS, isIndependentCorrect, stateRank } from './mastery.js';
import { ACHIEVEMENTS, learningLevel } from './achievements.js';
import { LESSONS_BY_SKILL } from './content/index.js';
import { reviewSummary, curriculumModules } from './navigation.js';
import { FocusStyles } from './LearnPath.jsx';

const DAY = 86400000;
export const MIN_SAMPLE = 5;
const pct = (n, d) => (d >= MIN_SAMPLE ? Math.round((n / d) * 100) + '%' : '—');
const median = (xs) => { if (!xs.length) return null; const s = [...xs].sort((a, b) => a - b); return s[Math.floor(s.length / 2)]; };

export function progressStats(engine) {
  const sc = engine.attempts.filter(a => a.scorable !== false && !['orient', 'learn', 'recognize'].includes(a.stage));
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

/** Overview: skills mastered, learning level, review due, recent activity. */
export function ProgressOverview({ user, theme: C, fonts: T, onOpenTab }) {
  const engine = getEngine(user);
  const lvl = learningLevel(engine);
  const rev = reviewSummary(engine);
  const proficient = SKILLS.filter(s => stateRank(engine.mastery[s.id]?.state || 'not_started') >= stateRank('proficient')).length;
  const mastered = SKILLS.filter(s => engine.mastery[s.id]?.state === 'mastered').length;
  const done = Object.values(engine.lessons || {}).filter(l => l.stage === 'completed').length;
  const week = engine.attempts.filter(a => a.ts > Date.now() - 7 * DAY);
  const recent = Object.values(engine.lessons || {}).filter(l => l.updatedAt).sort((a, b) => b.updatedAt - a.updatedAt).slice(0, 4)
    .map(l => ({ l, lesson: Object.values(LESSONS_BY_SKILL).find(x => x.id === l.lessonId) })).filter(x => x.lesson);
  return (
    <div>
      <div className="lm-grid-4" style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 10, marginBottom: 14 }}>
        <Stat C={C} T={T} label="Skills proficient" value={`${proficient} / ${SKILLS.length}`} note={mastered ? `${mastered} mastered` : 'Mastered needs a delayed review'} />
        <Stat C={C} T={T} label="Lessons completed" value={done} />
        <Stat C={C} T={T} label="Learning level" value={lvl.level} note={`${lvl.intoLevel} / ${lvl.forNext} XP to next`} />
        <Stat C={C} T={T} label="Reviews due" value={rev.due} note={rev.due ? 'Do these first' : rev.nextDue ? `Next ${new Date(rev.nextDue).toLocaleDateString()}` : 'None scheduled yet'} />
      </div>
      <Panel C={C}>
        <h3 className="lm-h" style={{ color: C.text, fontSize: fz(16), margin: '0 0 8px' }}>Recent learning</h3>
        {recent.length === 0 ? <p style={{ color: C.textSub, fontSize: fz(15), margin: 0 }}>No lessons started yet. Your first lesson is waiting in Learn.</p> :
          <ul style={{ listStyle: 'none', margin: 0, padding: 0 }}>{recent.map(({ l, lesson }) => (
            <li key={l.lessonId} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 0', borderTop: `1px solid ${C.border}` }}>
              <StatusMark C={C} status={l.stage === 'completed' ? 'done' : 'started'} size={20} />
              <span style={{ flex: 1, color: C.text, fontSize: fz(15) }}>{lesson.title}</span>
              <span style={{ color: C.textSub, fontSize: fz(13) }}>{new Date(l.updatedAt).toLocaleDateString()}</span>
            </li>))}</ul>}
        <p style={{ color: C.textSub, fontSize: fz(14), margin: '10px 0 0' }}>{week.length} answer{week.length === 1 ? '' : 's'} in lessons and reviews this week.</p>
      </Panel>
    </div>
  );
}

/** Skill mastery by module, with evidence, retention status, and how-you-answer habits. */
export function SkillMasterySection({ user, theme: C, fonts: T }) {
  const engine = getEngine(user);
  const st = progressStats(engine);
  const modules = curriculumModules(engine);
  const row = (label, value, note) => <tr><th scope="row" style={{ textAlign: 'left', padding: '8px', color: C.textSub, fontWeight: 500, fontSize: fz(14) }}>{label}</th><td style={{ padding: '8px', color: C.text, fontWeight: 700, fontSize: fz(15) }}>{value}</td><td style={{ padding: '8px', color: C.textSub, fontSize: fz(13) }}>{note}</td></tr>;
  return (
    <div>
      <FocusStyles C={C} />
      {modules.map(m => (
        <Panel key={m.id} C={C} style={{ padding: '12px 16px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 10, marginBottom: 8 }}>
            <h3 className="lm-h" style={{ color: C.text, fontSize: fz(16), margin: 0 }}>{m.title}</h3>
            <span style={{ color: C.textSub, fontSize: fz(13) }}>{m.proficient} of {m.total} proficient</span>
          </div>
          <ProgressBar C={C} value={m.proficient} max={m.total} height={4} label={`${m.title} proficiency`} />
          <ul style={{ listStyle: 'none', margin: '8px 0 0', padding: 0 }}>
            {m.lessons.map(l => { const ms = engine.mastery[l.skill.id]; const r = engine.reviews[l.skill.id]; return (
              <li key={l.skill.id} style={{ borderTop: `1px solid ${C.border}` }}>
                <details>
                  <summary className="lp-focus" style={{ cursor: 'pointer', padding: '9px 0', display: 'flex', gap: 10, alignItems: 'center', listStyle: 'none' }}>
                    <span style={{ flex: 1, color: C.text, fontSize: fz(15) }}>{l.skill.title}</span>
                    {ms?.needsReview && <Chip C={C} color={C.gold}>Needs review</Chip>}
                    <span style={{ color: l.mastery === 'not_started' ? C.textSub : C.text, fontSize: fz(14), fontWeight: 600 }}>{STATE_LABELS[l.mastery]}</span>
                  </summary>
                  {ms ? <div style={{ padding: '0 0 10px' }}>
                    <ul style={{ paddingLeft: 18, margin: '0 0 6px' }}>{ms.reasons.map((x, i) => <li key={i} style={{ color: C.textSub, fontSize: fz(14), lineHeight: 1.55 }}>{x}</li>)}</ul>
                    <div style={{ color: C.textSub, fontSize: fz(13) }}>Evidence: {ms.evidence.independentCorrect} correct on your own · {ms.evidence.assistedCorrect} with help · {ms.evidence.distinctItems} different questions · {ms.evidence.delayedCorrect} delayed reviews correct{r ? ` · next review ${new Date(r.due).toLocaleDateString()}` : ''}</div>
                  </div> : <p style={{ color: C.textSub, fontSize: fz(14), margin: '0 0 10px' }}>Not started.</p>}
                </details>
              </li>); })}
          </ul>
        </Panel>
      ))}
      <SectionTitle C={C}>How you answer</SectionTitle>
      <Panel C={C} style={{ overflowX: 'auto' }}>
        {st.total < MIN_SAMPLE ? <p style={{ color: C.textSub, fontSize: fz(15), margin: 0 }}>After {MIN_SAMPLE} scored answers in lessons or reviews, this shows how often you are right on your own, with help, and when you feel sure.</p> :
          <table style={{ borderCollapse: 'collapse', width: '100%' }}>
            <caption style={{ textAlign: 'left', color: C.textSub, fontSize: fz(13), marginBottom: 6 }}>Percentages appear once a group has at least {MIN_SAMPLE} answers.</caption>
            <tbody>
              {row('On your own', pct(st.independent.correct, st.independent.n), `${st.independent.n} answers without hints`)}
              {row('With help', pct(st.assisted.correct, st.assisted.n), `${st.assisted.n} answers after hints — counted separately`)}
              {row('When “Sure”', pct(st.sure.correct, st.sure.n), 'Should be high. If not, slow down on answers that feel obvious.')}
              {row('When “Guessing”', pct(st.guess.correct, st.guess.n), 'Lucky guesses are not counted as mastery.')}
              {row('Spaced reviews', pct(st.reviews.correct, st.reviews.n), `${st.reviews.n} retention checks`)}
              {row('Typical time', st.medianSeconds.challenge != null ? `${Math.round(st.medianSeconds.challenge)}s` : '—', 'Independent questions. About 80–85s per question is LSAT pace.')}
            </tbody>
          </table>}
      </Panel>
    </div>
  );
}

/** Achievements: earned first; the rest stay collapsed until asked for. */
export function AchievementsSection({ user, theme: C, fonts: T, extra }) {
  const engine = getEngine(user);
  const lvl = learningLevel(engine);
  const earnedAt = new Map((engine.achievements || []).map(a => [a.id, a.at]));
  const earned = ACHIEVEMENTS.filter(a => earnedAt.has(a.id));
  const locked = ACHIEVEMENTS.filter(a => !earnedAt.has(a.id));
  const [showLocked, setShowLocked] = useState(false);
  const card = (a, at) => (
    <li key={a.id} style={{ border: `1px solid ${at ? C.gold + '66' : C.border}`, borderRadius: 12, padding: 12 }}>
      <div style={{ fontSize: fz(15), color: C.text, fontWeight: 700 }}><span aria-hidden="true">{a.icon}</span> {a.title}{at && Date.now() - at < DAY ? <span style={{ marginLeft: 6 }}><Chip C={C} color={C.gold}>New</Chip></span> : null}</div>
      <div style={{ fontSize: fz(14), color: C.textSub, marginTop: 2 }}>{a.desc}</div>
      {at && <div style={{ fontSize: fz(13), color: C.textSub, marginTop: 4 }}>Earned {new Date(at).toLocaleDateString()}</div>}
    </li>
  );
  return (
    <div>
      <Panel C={C}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 8 }}>
          <h3 className="lm-h" style={{ color: C.text, fontSize: fz(17), margin: 0 }}>Learning level {lvl.level}</h3>
          <span style={{ color: C.textSub, fontSize: fz(14) }}>{lvl.intoLevel} / {lvl.forNext} XP</span>
        </div>
        <ProgressBar C={C} value={lvl.intoLevel} max={lvl.forNext} label="Progress to next learning level" />
        <p style={{ color: C.textSub, fontSize: fz(14), margin: '8px 0 0' }}>Learning XP comes from finishing stages, answering on your own, fixing mistakes, and passing reviews.</p>
      </Panel>
      {extra}
      <SectionTitle C={C}>Earned ({earned.length})</SectionTitle>
      {earned.length === 0 ? <p style={{ color: C.textSub, fontSize: fz(15) }}>None yet — finishing your first lesson earns one.</p> :
        <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(220px,1fr))', gap: 8 }}>{earned.map(a => card(a, earnedAt.get(a.id)))}</ul>}
      {locked.length > 0 && <div style={{ marginTop: 14 }}>
        <button className="lp-focus" aria-expanded={showLocked} onClick={() => setShowLocked(v => !v)} style={{ background: 'none', border: 'none', color: C.accent, cursor: 'pointer', padding: 0, fontSize: fz(14), fontWeight: 600 }}>
          {showLocked ? 'Hide' : 'Show'} {locked.length} more to earn
        </button>
        {showLocked && <ul style={{ listStyle: 'none', padding: 0, margin: '10px 0 0', display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(220px,1fr))', gap: 8, opacity: 0.85 }}>{locked.map(a => card(a, null))}</ul>}
      </div>}
    </div>
  );
}

/** Back-compat: the combined panel (overview + mastery + achievements). */
export function ProgressPanel(props) {
  return <section aria-label="Learning progress"><ProgressOverview {...props} /><SkillMasterySection {...props} /><AchievementsSection {...props} /></section>;
}
// BRANCHES re-exported for callers that grouped by branch before.
export { BRANCHES };
