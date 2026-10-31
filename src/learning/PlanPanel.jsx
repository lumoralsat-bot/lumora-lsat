// Adaptive study plan UI: Today card (Home), full plan + study profile editor (Study Plan screen).
import { useState } from 'react';
import { getEngine, engineUpdate, setStudyProfile } from './store.js';
import { LESSONS_BY_SKILL } from './content/index.js';
import { buildDailyPlan, weeklyCheckpoint, validateProfile, explainProfileChange, profileFromLegacyDiagnostic, daysUntil, PLAN_MODES } from './planner.js';
import { styles, FocusStyles } from './LearnPath.jsx';

export function studyProfile(user) {
  const e = getEngine(user);
  return e.profile || profileFromLegacyDiagnostic(user?.diagnostic || {});
}

function goTask(t, onNavigate) {
  if (!onNavigate) return;
  if (t.kind === 'review') return onNavigate('review');
  if (t.kind === 'lesson') return onNavigate('learn', t.skillId ? { skillId: t.skillId, mode: 'lesson' } : null);
  if (t.kind === 'timed') return onNavigate('fullsection');
  return onNavigate('practice');
}

function TaskList({ tasks, C, S, onNavigate }) {
  return (
    <ol style={{ listStyle: 'none', padding: 0, margin: '8px 0' }}>
      {tasks.map((t, i) => (
        <li key={i} style={{ display: 'flex', gap: 10, alignItems: 'flex-start', padding: '8px 0', borderTop: i ? `1px solid ${C.border}` : 'none' }}>
          <span aria-hidden="true" style={{ minWidth: 44, fontSize: 12, fontWeight: 700, color: t.primary ? C.accent : C.textSub }}>{t.minutes} min</span>
          <div style={{ flex: 1 }}>
            <div style={{ fontWeight: t.primary ? 700 : 600, color: C.text, fontSize: 14 }}>{t.title}{t.primary && <span style={{ ...S.tag(C.accent), marginLeft: 8 }}>Main goal</span>}</div>
            <div style={{ ...S.small }}>{t.reason}</div>
          </div>
          <button className="lp-focus" style={{ ...S.btnGhost, padding: '5px 10px' }} onClick={() => goTask(t, onNavigate)} aria-label={`Start: ${t.title}`}>Start</button>
        </li>
      ))}
    </ol>
  );
}

/** Home: Where am I? What should I do next? Why? */
export function TodayPlanCard({ user, theme: C, fonts: T, onNavigate }) {
  const S = styles(C, T);
  const engine = getEngine(user);
  const profile = studyProfile(user);
  const plan = buildDailyPlan(engine, profile, { lessonsById: LESSONS_BY_SKILL });
  const [short, setShort] = useState(false);
  const header = plan.daysLeft != null && plan.daysLeft >= 0 ? `${plan.daysLeft} days to your LSAT` : (PLAN_MODES[plan.mode]?.label || 'Today');
  return (
    <section aria-label="Today’s plan" style={{ ...S.card, marginBottom: 16, borderColor: C.accent + '66', background: `linear-gradient(135deg, ${C.accentSoft}, ${C.surface})` }}>
      <FocusStyles C={C} />
      <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8, flexWrap: 'wrap' }}>
        <div style={{ fontSize: 12, fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase', color: C.accent }}>Your next step · {header}</div>
        {plan.provisional && <span style={S.tag(C.gold)} title="Sharpens as you answer more questions">Provisional plan</span>}
      </div>
      {plan.needsDateUpdate ? <>
        <p style={{ ...S.p, color: C.text, marginTop: 8 }}>Your test date has passed. Update it, or mark the exam as taken, and we will adjust your plan.</p>
        <button className="lp-focus" style={S.btn} onClick={() => onNavigate && onNavigate('plan')}>Update test date</button>
      </> : plan.rest ? <>
        <p style={{ ...S.p, color: C.text, marginTop: 8 }}>Today is a rest day based on your settings. Nothing is owed.</p>
        {plan.shorter && <button className="lp-focus" style={S.btnGhost} onClick={() => onNavigate && onNavigate('review')}>Optional: one 4-minute review</button>}
      </> : <>
        <div style={{ fontSize: 18, fontWeight: 700, color: C.text, margin: '6px 0 2px' }}>{plan.primary.title}</div>
        <p style={{ ...S.small, margin: '0 0 8px' }}><strong style={{ color: C.text }}>Why: </strong>{plan.primary.reason}</p>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
          <button className="lp-focus" style={S.btn} onClick={() => goTask(plan.primary, onNavigate)}>Continue learning →</button>
          <span style={S.small}>Today: about {short ? plan.shorter.minutes : plan.minutes} of your {plan.budget} min</span>
        </div>
        <details style={{ marginTop: 10 }}>
          <summary className="lp-focus" style={{ ...S.small, cursor: 'pointer', color: C.accent }}>See today’s full plan</summary>
          <div role="group" aria-label="Session length" style={{ display: 'flex', gap: 6, margin: '8px 0' }}>
            <button className="lp-focus" aria-pressed={!short} onClick={() => setShort(false)} style={{ ...S.btnGhost, padding: '4px 10px', color: !short ? C.accent : C.textSub }}>Full ({plan.minutes} min)</button>
            <button className="lp-focus" aria-pressed={short} onClick={() => setShort(true)} style={{ ...S.btnGhost, padding: '4px 10px', color: short ? C.accent : C.textSub }}>Short on time ({plan.shorter.minutes} min)</button>
          </div>
          <TaskList tasks={short ? plan.shorter.tasks : plan.tasks} C={C} S={S} onNavigate={onNavigate} />
        </details>
      </>}
      {plan.notes.length > 0 && <ul style={{ margin: '8px 0 0', paddingLeft: 18 }}>{plan.notes.map((n, i) => <li key={i} style={S.small}>{n}</li>)}</ul>}
    </section>
  );
}

/** Study Plan screen: profile editor, today, weekly checkpoint, plan history. */
export function AdaptivePlanPanel({ user, onUpdateUser, theme: C, fonts: T, onNavigate }) {
  const S = styles(C, T);
  const engine = getEngine(user);
  const profile = studyProfile(user);
  const [editing, setEditing] = useState(!engine.profile);
  const [form, setForm] = useState(() => ({ ...profile, confidence: { ...(profile.confidence || {}) } }));
  const [errors, setErrors] = useState([]);
  const [changes, setChanges] = useState(null);
  const plan = buildDailyPlan(engine, profile, { lessonsById: LESSONS_BY_SKILL });
  const week = weeklyCheckpoint(engine, profile);
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const save = (e) => {
    e.preventDefault();
    const res = validateProfile(form);
    if (!res.ok) { setErrors(res.errors); return; }
    const dateChanged = (profile.testDate || null) !== (res.value.testDate || null) || profile.testStatus !== res.value.testStatus;
    if (dateChanged && engine.profile && !window.confirm(`Update your test plan${res.value.testDate ? ` to ${res.value.testDate}` : ''}? Your progress is kept; your daily plan will be recalculated.`)) return;
    const why = explainProfileChange(profile, res.value);
    onUpdateUser(prev => engineUpdate(prev, setStudyProfile(getEngine(prev), res.value, why), 0));
    setErrors([]); setChanges(why); setEditing(false);
  };

  const field = { display: 'block', width: '100%', marginTop: 4, padding: '8px 10px', borderRadius: 8, border: `1px solid ${C.border}`, background: C.surface, color: C.text, fontSize: 14, fontFamily: 'inherit' };
  const help = (t) => <span style={{ ...S.small, display: 'block', marginTop: 2 }}>{t}</span>;

  return (
    <section aria-labelledby="ap-h" style={{ marginBottom: 28 }}>
      <FocusStyles C={C} />
      <h2 id="ap-h" style={{ ...S.h1, fontSize: 22 }}>Your adaptive plan</h2>
      <p style={S.small}>Built from your test date, available time, and actual performance. It updates itself — missed days never pile up.</p>

      {changes && <div role="status" style={{ ...S.card, marginTop: 12, borderColor: C.success + '66' }}>
        <strong style={{ color: C.text }}>Plan updated</strong>
        <ul style={{ margin: '6px 0 0', paddingLeft: 18 }}>{changes.map((c, i) => <li key={i} style={S.small}>{c}</li>)}</ul>
      </div>}

      {editing ? (
        <form onSubmit={save} style={{ ...S.card, marginTop: 12 }} noValidate>
          <h3 style={{ ...S.h2, fontSize: 17 }}>Study profile</h3>
          {profile.estimatedFrom === 'onboarding' && !engine.profile && <p style={S.small}>We pre-filled some fields from your onboarding answers as estimates. Adjust anything that is off.</p>}
          {errors.length > 0 && <div role="alert" style={{ color: C.danger, fontSize: 13, marginBottom: 8 }}>{errors.map((x, i) => <div key={i}>{x}</div>)}</div>}
          <fieldset style={{ border: 'none', padding: 0, margin: '0 0 12px' }}>
            <legend style={{ ...S.small, fontWeight: 700, color: C.text }}>Test date</legend>
            {help('Sets how the plan balances new learning, review, and timed practice.')}
            {[['scheduled', 'I have a date'], ['undecided', 'Not scheduled yet'], ['completed', 'I already took the LSAT']].map(([v, l]) => (
              <label key={v} style={{ ...S.small, marginRight: 14, display: 'inline-flex', gap: 4, alignItems: 'center', marginTop: 6 }}>
                <input type="radio" name="ts" checked={form.testStatus === v} onChange={() => set('testStatus', v)} /> {l}</label>
            ))}
            {form.testStatus === 'scheduled' && <label style={{ ...S.small, display: 'block', marginTop: 8 }}>Date<input className="lp-focus" type="date" value={form.testDate || ''} onChange={e => set('testDate', e.target.value)} style={field} /></label>}
          </fieldset>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(180px,1fr))', gap: 12 }}>
            <label style={S.small}>Minutes per study day<input className="lp-focus" type="number" min="0" max="300" inputMode="numeric" value={form.minutesPerDay ?? ''} onChange={e => set('minutesPerDay', e.target.value)} style={field} />{help('Plans never exceed this.')}</label>
            <label style={S.small}>Study days per week<input className="lp-focus" type="number" min="0" max="7" inputMode="numeric" value={form.daysPerWeek ?? ''} onChange={e => set('daysPerWeek', e.target.value)} style={field} />{help('Used for your weekly check-in, not for streak pressure.')}</label>
            <label style={S.small}>Target score (optional)<input className="lp-focus" type="number" min="120" max="180" inputMode="numeric" value={form.targetScore ?? ''} onChange={e => set('targetScore', e.target.value)} style={field} />{help('Helps prioritize high-impact skills.')}</label>
            <label style={S.small}>Latest LSAT or practice score (optional)<input className="lp-focus" type="number" min="120" max="180" inputMode="numeric" value={form.baselineScore ?? ''} onChange={e => set('baselineScore', e.target.value)} style={field} placeholder="Leave blank if none yet" />{help('Leave blank if you haven’t taken one — we won’t guess.')}</label>
          </div>
          <div style={{ display: 'flex', gap: 8, marginTop: 14, flexWrap: 'wrap' }}>
            <button className="lp-focus" type="submit" style={S.btn}>Save &amp; update plan</button>
            {engine.profile && <button className="lp-focus" type="button" style={S.btnGhost} onClick={() => { setEditing(false); setErrors([]); }}>Cancel</button>}
          </div>
        </form>
      ) : (
        <div style={{ ...S.card, marginTop: 12, display: 'flex', justifyContent: 'space-between', gap: 10, flexWrap: 'wrap' }}>
          <div style={S.small}>
            <div><strong style={{ color: C.text }}>Test:</strong> {profile.testStatus === 'completed' ? 'Taken' : profile.testDate ? `${profile.testDate} (${daysUntil(profile.testDate)} days)` : 'Not scheduled'}</div>
            <div><strong style={{ color: C.text }}>Time:</strong> {profile.minutesPerDay != null ? `${profile.minutesPerDay} min/day` : 'not set'}{profile.daysPerWeek != null ? `, ${profile.daysPerWeek} days/week` : ''}</div>
            {profile.targetScore && <div><strong style={{ color: C.text }}>Target:</strong> {profile.targetScore}</div>}
            {plan.format && <div style={{ marginTop: 4 }}><strong style={{ color: C.text }}>Your test format:</strong> {plan.format.summary}</div>}
          </div>
          <button className="lp-focus" style={S.btnGhost} onClick={() => { setForm({ ...profile, confidence: { ...(profile.confidence || {}) } }); setEditing(true); setChanges(null); }}>Edit</button>
        </div>
      )}

      {!plan.needsDateUpdate && !plan.rest && <div style={{ ...S.card, marginTop: 12 }}>
        <h3 style={{ ...S.h2, fontSize: 17 }}>Today · {plan.modeLabel}</h3>
        <p style={S.small}>{plan.emphasis}</p>
        <TaskList tasks={plan.tasks} C={C} S={S} onNavigate={onNavigate} />
        <p style={S.small}>Short on time? Do just: {plan.shorter.tasks.map(t => t.title).join(' + ')} (~{plan.shorter.minutes} min).</p>
      </div>}

      <div style={{ ...S.card, marginTop: 12 }}>
        <h3 style={{ ...S.h2, fontSize: 17 }}>This week</h3>
        <ul style={{ paddingLeft: 18, margin: 0 }}>
          {week.adherence && <li style={S.small}>{week.adherence}</li>}
          <li style={S.small}>{week.answered} practice answers{week.independentAccuracy != null ? ` · ${week.independentAccuracy}% correct without help` : ''}</li>
          {week.highlights.map((h, i) => <li key={i} style={S.small}>{h}</li>)}
          {week.priorities.length > 0 && <li style={S.small}>Next week’s priorities: {week.priorities.join(' · ')}</li>}
          {!week.answered && <li style={S.small}>No practice yet this week — today’s first task is a good place to start.</li>}
        </ul>
      </div>

      {(engine.planLog || []).length > 0 && <details style={{ marginTop: 10 }}>
        <summary className="lp-focus" style={{ ...S.small, cursor: 'pointer' }}>Plan history ({engine.planLog.length} version{engine.planLog.length > 1 ? 's' : ''})</summary>
        <ul style={{ paddingLeft: 18 }}>{[...engine.planLog].reverse().map(p => <li key={p.version} style={S.small}>v{p.version} · {new Date(p.at).toLocaleDateString()} — {(p.changes || []).slice(0, 2).join(' ')}</li>)}</ul>
      </details>}
    </section>
  );
}
