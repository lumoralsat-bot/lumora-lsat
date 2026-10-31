// Review: Due today · Error journal · Weak skills · Flagged questions (spec Master §11, Expanded Journey C).
import { useState } from 'react';
import { SKILL_BY_ID } from './skills.js';
import { LESSONS_BY_SKILL, LESSON_BY_ID } from './content/index.js';
import { STATE_LABELS } from './mastery.js';
import { dueReviews } from './review.js';
import { getEngine, engineUpdate, updateErrorRecord } from './store.js';
import { ERROR_CATEGORY_LABELS, weakSkills } from './journal.js';
import { styles, FocusStyles, AIContext, LessonPlayer, ReviewSession } from './LearnPath.jsx';

export function ReviewHub({ user, onUpdateUser, theme: C, fonts: T, callModel, practiceSystem, parseJSON, onNavigate }) {
  const S = styles(C, T);
  const engine = getEngine(user);
  const deps = { callModel, practiceSystem, parseJSON };
  const [open, setOpen] = useState(null); // {mode:'review'|'lesson', skillId}
  const [tab, setTab] = useState('due');
  const [filter, setFilter] = useState('open');
  const commit = (op) => onUpdateUser(prev => { const r = op(getEngine(prev)); return engineUpdate(prev, r.engine, 0); });

  if (open) {
    const lesson = LESSONS_BY_SKILL[open.skillId];
    const back = () => setOpen(null);
    return <AIContext.Provider value={deps}>
      {open.mode === 'review' ? <ReviewSession {...{ user, onUpdateUser, C, T, lesson, deps, onDone: back }} />
        : <LessonPlayer {...{ user, onUpdateUser, C, T, lesson, deps, onBack: back }} />}
    </AIContext.Provider>;
  }

  const due = dueReviews(engine.reviews);
  const upcoming = Object.values(engine.reviews || {}).filter(r => r.due > Date.now()).sort((a, b) => a.due - b.due);
  const errors = [...engine.errors].reverse().filter(e => filter === 'all' ? true : filter === 'open' ? !e.resolvedBy && !e.archived : !!e.resolvedBy);
  const weak = weakSkills(engine);
  const flags = [...(engine.flags || [])].reverse();
  const tabs = [['due', `Due today${due.totalDue ? ` (${due.totalDue})` : ''}`], ['journal', 'Error journal'], ['weak', 'Weak skills'], ['flagged', 'Flagged']];
  const skillTitle = (sid) => SKILL_BY_ID[sid]?.title || sid;

  return (
    <main style={{ maxWidth: 820, margin: '0 auto', padding: '28px 18px' }}>
      <FocusStyles C={C} />
      <h1 style={{ ...S.h1, fontSize: 26 }}>Review</h1>
      <p style={S.small}>Turn mistakes into progress: retrieval checks with fresh questions, a journal of what went wrong, and the skills that need attention.</p>
      <div role="tablist" aria-label="Review sections" style={{ display: 'flex', gap: 6, flexWrap: 'wrap', margin: '16px 0' }}>
        {tabs.map(([id, label]) => (
          <button key={id} role="tab" aria-selected={tab === id} className="lp-focus" onClick={() => setTab(id)}
            style={{ ...S.btnGhost, borderColor: tab === id ? C.accent : C.border, color: tab === id ? C.accent : C.textSub, background: tab === id ? C.accentSoft : 'transparent' }}>{label}</button>
        ))}
      </div>

      {tab === 'due' && <section role="tabpanel">
        {due.totalDue === 0 ? (
          <div style={S.card}>
            <p style={{ ...S.p, color: C.text }}>Nothing due today. 🎉</p>
            {upcoming.length > 0 ? <p style={S.p}>Next review: <strong style={{ color: C.text }}>{skillTitle(upcoming[0].skillId)}</strong> on {new Date(upcoming[0].due).toLocaleDateString(undefined, { weekday: 'long', month: 'short', day: 'numeric' })}.</p>
              : <p style={S.p}>Reviews are scheduled automatically when you finish a lesson’s mastery check.</p>}
          </div>
        ) : due.items.map(r => (
          <div key={r.skillId} style={{ ...S.card, marginBottom: 10, display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
            <div><div style={{ fontWeight: 700, color: C.text }}>{skillTitle(r.skillId)}</div>
              <div style={S.small}>Status: {STATE_LABELS[engine.mastery[r.skillId]?.state || 'learning']} · one fresh question, about 3 minutes</div></div>
            <button className="lp-focus" style={S.btn} onClick={() => setOpen({ mode: 'review', skillId: r.skillId })} disabled={!LESSONS_BY_SKILL[r.skillId]}>Start review</button>
          </div>
        ))}
        {due.totalDue > due.items.length && <p style={S.small}>Showing {due.items.length} of {due.totalDue}. The rest will wait — no need to clear everything at once.</p>}
      </section>}

      {tab === 'journal' && <section role="tabpanel">
        <div style={{ display: 'flex', gap: 6, marginBottom: 12, flexWrap: 'wrap' }} role="group" aria-label="Filter mistakes">
          {[['open', 'Still open'], ['resolved', 'Resolved'], ['all', 'All']].map(([v, l]) => (
            <button key={v} className="lp-focus" aria-pressed={filter === v} onClick={() => setFilter(v)} style={{ ...S.btnGhost, padding: '5px 12px', color: filter === v ? C.accent : C.textSub, borderColor: filter === v ? C.accent : C.border }}>{l}</button>
          ))}
        </div>
        {errors.length === 0 && <div style={S.card}><p style={S.p}>{filter === 'open' ? 'No open mistakes. Every miss you make in a lesson lands here with an explanation and a link to the right lesson section.' : 'Nothing here yet.'}</p></div>}
        {errors.slice(0, 50).map(e => <ErrorEntry key={e.id} {...{ e, C, S, commit, skillTitle, onOpenLesson: (sid) => setOpen({ mode: 'lesson', skillId: sid }) }} />)}
        <p style={{ ...S.small, marginTop: 10 }}>Older practice mistakes from the question generator are in the <button className="lp-focus" onClick={() => onNavigate && onNavigate('mistakes')} style={{ background: 'none', border: 'none', color: C.accent, cursor: 'pointer', padding: 0, fontSize: 13 }}>classic Mistake Journal</button>.</p>
      </section>}

      {tab === 'weak' && <section role="tabpanel">
        {weak.length === 0 ? <div style={S.card}><p style={S.p}>No skill shows a repeated pattern of mistakes right now.</p></div> : weak.map(w => (
          <div key={w.skillId} style={{ ...S.card, marginBottom: 10 }}>
            <div style={{ fontWeight: 700, color: C.text }}>{skillTitle(w.skillId)}</div>
            <p style={S.p}>{w.reason}</p>
            {LESSONS_BY_SKILL[w.skillId] && <button className="lp-focus" style={S.btnGhost} onClick={() => setOpen({ mode: 'lesson', skillId: w.skillId })}>Revisit the lesson</button>}
          </div>
        ))}
      </section>}

      {tab === 'flagged' && <section role="tabpanel">
        {flags.length === 0 ? <div style={S.card}><p style={S.p}>No reported questions. If a question ever seems ambiguous or wrong, use “Report a problem” — it stops counting toward your mastery until reviewed.</p></div> : flags.map((f, i) => (
          <div key={i} style={{ ...S.card, marginBottom: 8, padding: 14 }}>
            <div style={S.small}><strong style={{ color: C.text }}>{skillTitle(f.skillId)}</strong> · {f.reason === 'tutor_ambiguity' ? 'Flagged by the tutor as possibly ambiguous' : 'Reported by you'} · {new Date(f.at).toLocaleDateString()}</div>
            <div style={S.small}>Excluded from mastery scoring pending review.</div>
          </div>
        ))}
      </section>}
    </main>
  );
}

function ErrorEntry({ e, C, S, commit, skillTitle, onOpenLesson }) {
  const [note, setNote] = useState(e.note || '');
  const [saved, setSaved] = useState(false);
  const lesson = LESSON_BY_ID[e.lessonId] || LESSONS_BY_SKILL[e.skillId];
  const section = lesson?.sections.find(s => s.id === e.remediationSection);
  return (
    <article style={{ ...S.card, marginBottom: 10 }} aria-label={`Mistake in ${skillTitle(e.skillId)}`}>
      <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8, flexWrap: 'wrap', marginBottom: 6 }}>
        <span style={{ ...S.small, fontWeight: 700, color: C.text }}>{skillTitle(e.skillId)}</span>
        <span style={{ ...S.small }}>{new Date(e.at).toLocaleDateString()} · {e.resolvedBy ? '✓ Resolved by a later correct answer' : 'Open'}</span>
      </div>
      {e.snapshot?.stimulus && <p style={{ ...S.p, fontSize: 14 }}>{e.snapshot.stimulus}{e.snapshot.stimulus.length >= 220 ? '…' : ''}</p>}
      <p style={{ ...S.small }}>You chose ({e.selected}){e.snapshot?.selectedText ? ` “${e.snapshot.selectedText}”` : ''}. Correct: ({e.correctChoice}){e.snapshot?.correctText ? ` “${e.snapshot.correctText}”` : ''}.{e.confidence ? ` Confidence: ${e.confidence}.` : ''}</p>
      <label style={{ ...S.small, display: 'block', margin: '8px 0' }}>What went wrong?{e.categorySource === 'provisional' ? ' (our guess — change it if it doesn’t fit)' : ''}<br />
        <select className="lp-focus" value={e.category} onChange={ev => commit(en => ({ engine: updateErrorRecord(en, e.id, { category: ev.target.value }) }))}
          style={{ marginTop: 4, padding: '6px 8px', borderRadius: 8, background: C.surface, color: C.text, border: `1px solid ${C.border}`, maxWidth: '100%' }}>
          {Object.entries(ERROR_CATEGORY_LABELS).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
        </select>
      </label>
      <label style={{ ...S.small, display: 'block' }}>Your note
        <textarea className="lp-focus" rows={2} maxLength={1000} value={note} onChange={ev => { setNote(ev.target.value); setSaved(false); }}
          style={{ display: 'block', width: '100%', marginTop: 4, padding: 8, borderRadius: 8, border: `1px solid ${C.border}`, background: C.surface, color: C.text, fontFamily: 'inherit', fontSize: 14 }} />
      </label>
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 8, alignItems: 'center' }}>
        <button className="lp-focus" style={{ ...S.btnGhost, padding: '6px 12px' }} disabled={note === (e.note || '')} onClick={() => { commit(en => ({ engine: updateErrorRecord(en, e.id, { note }) })); setSaved(true); }}>Save note</button>
        {saved && <span role="status" style={S.small}>Saved</span>}
        {lesson && <button className="lp-focus" style={{ ...S.btnGhost, padding: '6px 12px', color: C.accent }} onClick={() => onOpenLesson(e.skillId)}>{section ? `Review “${section.title}”` : 'Open the lesson'}</button>}
        {!e.resolvedBy && <button className="lp-focus" style={{ ...S.btnGhost, padding: '6px 12px' }} onClick={() => commit(en => ({ engine: updateErrorRecord(en, e.id, { archived: !e.archived }) }))}>{e.archived ? 'Unarchive' : 'Archive'}</button>}
      </div>
    </article>
  );
}
