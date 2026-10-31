// Guided learning path UI: skill tree, recommendation, lesson player (Orient → Learn → Recognize →
// Guided apply → Challenge → Explain & reflect → Mastery check → Retention review), placement
// (test-out), spaced review, and mixed review.
// Business rules live in the pure modules next to this file; this component only renders state and
// dispatches events. Mastery is never decided here.
import { fz } from '../ui/scale.js';
import { useState, useRef, useMemo, useEffect, createContext, useContext } from 'react';
import { BRANCHES, SKILLS, SKILL_BY_ID } from './skills.js';
import { LESSONS_BY_SKILL, TAG_TO_ERROR_CATEGORY, sectionForTag, orderForTrack, CLASSIC_ROUTES } from './content/index.js';
import { STATE_LABELS } from './mastery.js';
import { STAGE_LABELS, PLAYABLE_STAGES, UNSCORED_STAGES, recognizeCheckpoint, applyCheckpoint, challengeOutcome, placementOutcome, explanationOutcome } from './lessonEngine.js';
import { getEngine, engineUpdate, recordAttempt, lessonEvent, newId, flagItem, updateErrorRecord, logGeneration, recordExplanation } from './store.js';
import { recommendNext, prerequisitesMet } from './recommend.js';
import { dueReviews } from './review.js';
import { generateSkillQuestion, authoredToServable, pickAuthored, structureKey } from './practiceEngine.js';
import { LESSON_POLICY } from './config.js';
import { TUTOR_MODES, tutorAvailable, buildTutorRequest, askTutor } from './tutor.js';

// AI dependencies (existing callClaude/parseJSON from App.jsx) shared with deep components.
export const AIContext = createContext(null);

export { LESSONS_BY_SKILL };

const STATE_ICON = { not_started: '○', learning: '◔', practicing: '◑', developing: '◕', proficient: '●', mastered: '★' };
const ERROR_CATEGORIES = [
  ['conceptual', 'Conceptual misunderstanding'], ['structure', 'Misidentified conclusion or structure'],
  ['conditional_translation', 'Conditional translation error'], ['scope_quantifier', 'Scope or quantifier misread'],
  ['causal', 'Causal reasoning error'], ['unsupported_inference', 'Unsupported inference / overstatement'],
  ['distractor_attraction', 'Attracted to a wrong answer without comparing'], ['misread_stem', 'Misread the question stem'],
  ['misread_passage', 'Misread the passage or whose view it is'], ['statistical', 'Statistics, sampling, or base-rate error'],
  ['timing', 'Rushed / time pressure'], ['careless', 'Careless selection'], ['guess', 'Guess or low confidence'],
];

// Commit a pure engine operation through a functional user update (attempt + derived state written together).
function useEngineCommit(onUpdateUser) {
  return (op) => onUpdateUser(prev => {
    const res = op(getEngine(prev));
    if (!res || res.engine === undefined) return {};
    return engineUpdate(prev, res.engine, res.xpGranted || 0);
  });
}

export function styles(C, T) {
  // Readable defaults (body 16px, captions 15px) that follow the user's A+/A- setting.
  return {
    card: { background: C.surface, border: `1px solid ${C.border}`, borderRadius: 16, padding: 20 },
    h1: { fontFamily: T.serif, color: C.text, margin: '0 0 6px' },
    h2: { fontFamily: T.serif, color: C.text, margin: '0 0 10px', fontSize: fz(20) },
    p: { color: C.textSub, lineHeight: 1.65, margin: '0 0 10px', fontSize: fz(16) },
    small: { color: C.textSub, fontSize: fz(15), lineHeight: 1.55 },
    btn: { background: 'linear-gradient(135deg,#3a6bff,#6a9fff)', color: '#fff', border: 'none', borderRadius: 12, padding: '11px 20px', fontSize: fz(15), fontWeight: 700, cursor: 'pointer', fontFamily: T.sans },
    btnGhost: { background: 'transparent', color: C.textSub, border: `1px solid ${C.border}`, borderRadius: 10, padding: '9px 16px', fontSize: fz(14), cursor: 'pointer', fontFamily: T.sans },
    tag: (color) => ({ display: 'inline-block', fontSize: fz(13), fontWeight: 700, color, background: color + '1f', border: `1px solid ${color}44`, borderRadius: 8, padding: '2px 8px' }),
  };
}

export function FocusStyles({ C }) {
  return <style>{`.lp-focus:focus-visible{outline:3px solid ${C.accent};outline-offset:2px}.lp-choice:hover{border-color:${C.accent}88}`}</style>;
}

// ═════════════════════════════════════════════════════════════════════════════
// GUIDED PATH (entry point rendered at the top of the Learn screen)
// ═════════════════════════════════════════════════════════════════════════════
export function GuidedPath({ user, onUpdateUser, theme: C, fonts: T, callModel, practiceSystem, parseJSON, onOpenLegacy, onMixedPractice, open: openProp, setOpen: setOpenProp }) {
  const [openLocal, setOpenLocal] = useState(null); // {skillId, mode:'lesson'|'placement'|'review'}
  const open = openProp !== undefined ? openProp : openLocal;
  const setOpen = setOpenProp || setOpenLocal;
  const engine = getEngine(user);
  const S = styles(C, T);
  const rec = recommendNext(engine, { lessonsById: LESSONS_BY_SKILL });
  const due = dueReviews(engine.reviews);
  const deps = { callModel, practiceSystem, parseJSON };

  if (open) {
    const lesson = LESSONS_BY_SKILL[open.skillId];
    const back = () => setOpen(null);
    const wrap = (el) => <AIContext.Provider value={deps}>{el}</AIContext.Provider>;
    if (open.mode === 'placement') return wrap(<PlacementSession {...{ user, onUpdateUser, C, T, lesson, onDone: back }} />);
    if (open.mode === 'mixed') return wrap(<MixedReviewSession {...{ user, onUpdateUser, C, T, deps, onDone: back }} />);
    if (!lesson) return null;
    if (open.mode === 'review') return wrap(<ReviewSession {...{ user, onUpdateUser, C, T, lesson, deps, onDone: back }} />);
    return wrap(<LessonPlayer {...{ user, onUpdateUser, C, T, lesson, deps, onBack: back, track: open.track || null, fromClassic: open.fromClassic || null, onOpenLegacy }} />);
  }

  const act = (r) => {
    if (r.kind === 'review') setOpen({ skillId: r.skillId, mode: 'review' });
    else if (r.kind === 'mixed') { if (mixedSkills(engine).length >= 2) setOpen({ mode: 'mixed' }); else if (onMixedPractice) onMixedPractice(); }
    else if (r.skillId) setOpen({ skillId: r.skillId, mode: 'lesson' });
  };

  return (
    <section aria-labelledby="gp-title" style={{ marginBottom: 28 }}>
      <FocusStyles C={C} />
      <h2 id="gp-title" style={{ ...S.h1, fontSize: Math.round(22 * (globalThis.__LUMORA_FONT_SCALE__ || 1)) }}>Your learning path</h2>
      <p style={S.small}>Learn a skill, recognize it, apply it with support, then prove it on your own. New questions are generated for you along the way.</p>

      <div style={{ ...S.card, marginTop: 14, borderColor: C.accent + '66', background: `linear-gradient(135deg, ${C.accentSoft}, ${C.surface})` }}>
        <div style={{ fontSize: fz(12), fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase', color: C.accent, marginBottom: 6 }}>Recommended next · about {rec.minutes} min</div>
        <div style={{ fontSize: Math.round(18 * (globalThis.__LUMORA_FONT_SCALE__ || 1)), fontWeight: 700, color: C.text, marginBottom: 6 }}>{rec.title}</div>
        <p style={{ ...S.p, fontSize: fz(14) }}><strong style={{ color: C.text }}>Why: </strong>{rec.reason}</p>
        <button className="lp-focus" style={S.btn} onClick={() => act(rec)}>{rec.kind === 'review' ? 'Start review' : rec.title.startsWith('Continue') ? 'Continue learning' : 'Start'}</button>
      </div>

      {mixedSkills(engine).length >= 2 && rec.kind !== 'mixed' && (
        <div style={{ ...S.card, marginTop: 10, padding: 14, display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10, flexWrap: 'wrap' }}>
          <span style={S.small}>🔀 Mixed review: questions from different skills, type not named — the transfer check Mastered needs.</span>
          <button className="lp-focus" style={S.btnGhost} onClick={() => setOpen({ mode: 'mixed' })}>Start mixed review</button>
        </div>
      )}
      {due.totalDue > 0 && rec.kind !== 'review' && (
        <div role="status" style={{ ...S.card, marginTop: 10, padding: 14, display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10, flexWrap: 'wrap' }}>
          <span style={S.small}>🔁 {due.totalDue} review{due.totalDue > 1 ? 's' : ''} due today</span>
          <button className="lp-focus" style={S.btnGhost} onClick={() => setOpen({ skillId: due.items[0].skillId, mode: 'review' })}>Review now</button>
        </div>
      )}

      <div style={{ marginTop: 18 }}>
        {BRANCHES.map(b => {
          const skills = SKILLS.filter(s => s.branch === b.id);
          return (
            <div key={b.id} style={{ marginBottom: 14 }}>
              <h3 style={{ fontSize: fz(13), color: C.textSub, textTransform: 'uppercase', letterSpacing: '0.08em', margin: '0 0 8px' }}>{b.title}</h3>
              <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(230px,1fr))', gap: 8 }}>
                {skills.map(s => <SkillNode key={s.id} {...{ s, engine, C, S, onOpen: setOpen, onOpenLegacy }} />)}
              </ul>
            </div>
          );
        })}
      </div>
    </section>
  );
}

function SkillNode({ s, engine, C, S, onOpen, onOpenLegacy }) {
  const m = engine.mastery[s.id];
  const st = m?.state || 'not_started';
  const full = s.lesson === 'full' && !!LESSONS_BY_SKILL[s.id];
  const classics = CLASSIC_ROUTES.filter(r => r.skillId === s.id);
  const prereqOk = prerequisitesMet(s.id, engine.mastery);
  const prereqNames = s.prerequisites.map(p => SKILL_BY_ID[p]?.title).filter(Boolean);
  const label = full ? `${STATE_ICON[st]} ${STATE_LABELS[st]}${m?.needsReview ? ' · needs review' : ''}` : 'Coming soon';
  const color = !full ? C.textSub : st === 'mastered' ? C.gold : st === 'proficient' ? C.success : st === 'not_started' ? C.textSub : C.accent;
  return (
    <li style={{ ...S.card, padding: 14, borderRadius: 12, opacity: s.lesson ? 1 : 0.65 }}>
      <div style={{ fontWeight: 700, color: C.text, fontSize: fz(14), marginBottom: 4 }}>{s.title}</div>
      <div style={{ ...S.small, marginBottom: 8 }}>{s.summary}</div>
      <div style={{ fontSize: fz(12), color, fontWeight: 600, marginBottom: 8 }} aria-label={`Status: ${label}`}>{label}</div>
      {prereqNames.length > 0 && <div style={{ fontSize: fz(12), color: C.textSub, marginBottom: 8 }}>{prereqOk ? 'Builds on' : 'Recommended first'}: {prereqNames.join(', ')}</div>}
      {full && (
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
          <button className="lp-focus" style={{ ...S.btnGhost, padding: '6px 12px', color: C.accent, borderColor: C.accent + '66' }} onClick={() => onOpen({ skillId: s.id, mode: 'lesson' })} aria-label={`Open lesson: ${s.title}`}>Open</button>
          {LESSONS_BY_SKILL[s.id]?.placementItemIds?.length > 0 && engine.lessons[LESSONS_BY_SKILL[s.id]?.id]?.placement !== 'tested_out' && <button className="lp-focus" style={{ ...S.btnGhost, padding: '6px 12px' }} onClick={() => onOpen({ skillId: s.id, mode: 'placement' })} aria-label={`Test out of ${s.title}`}>Test out</button>}
        </div>
      )}
      {classics.length > 0 && <div style={{ fontSize: fz(12), color: C.textSub, marginTop: 8 }}>Replaces Classic: {classics.map(r => (r.section === 'RC' ? 'RC ' : '') + r.label).join(', ')}</div>}
      {!full && <span style={{ fontSize: fz(12), color: C.textSub }}>Lesson in development</span>}
    </li>
  );
}

// ═════════════════════════════════════════════════════════════════════════════
// LESSON PLAYER
// ═════════════════════════════════════════════════════════════════════════════
export function LessonPlayer({ user, onUpdateUser, C, T, lesson, deps, onBack, track = null, fromClassic = null, onOpenLegacy }) {
  const S = styles(C, T);
  const commit = useEngineCommit(onUpdateUser);
  const engine = getEngine(user);
  const progress = engine.lessons[lesson.id];
  const current = progress?.stage || 'not_started';
  const [view, setView] = useState(null); // stage being viewed (replay) — null = current
  const topRef = useRef(null);

  useEffect(() => { if (current === 'not_started') commit(e => lessonEvent(e, lesson, { type: 'start' })); }, []); // eslint-disable-line
  const shown = view || (current === 'not_started' ? 'learn' : current);
  useEffect(() => { topRef.current?.focus(); }, [shown]);

  const completeStage = (stage) => { commit(e => lessonEvent(e, lesson, { type: 'complete_stage', stage })); setView(null); window.scrollTo?.(0, 0); };
  const remediate = (toStage, reason) => { commit(e => lessonEvent(e, lesson, { type: 'remediate', toStage, reason })); setView(null); };
  // Attempts that count toward this stage's checkpoint (attempts before a remediation reset stay in history but don't count here).
  const stageAttempts = (stage) => engine.attempts.filter(a => a.lessonId === lesson.id && a.stage === stage && a.ts >= (progress?.stageEpoch?.[stage] || 0));
  const completed = progress?.completedStages || [];

  return (
    <main style={{ maxWidth: 780, margin: '0 auto', padding: '24px 18px' }}>
      <FocusStyles C={C} />
      <nav aria-label="Breadcrumb" style={{ ...S.small, marginBottom: 12 }}>
        <button className="lp-focus" onClick={onBack} style={{ background: 'none', border: 'none', color: C.accent, cursor: 'pointer', padding: 0, fontSize: fz(13) }}>Learn</button>
        <span aria-hidden="true"> › </span>{BRANCHES.find(b => b.id === SKILL_BY_ID[lesson.skillId].branch)?.title}<span aria-hidden="true"> › </span><span aria-current="page">{lesson.title}</span>
      </nav>
      <h1 ref={topRef} tabIndex={-1} style={{ ...S.h1, fontSize: Math.round(26 * (globalThis.__LUMORA_FONT_SCALE__ || 1)), outline: 'none' }}>{lesson.title}</h1>
      <p style={S.small}>{lesson.objective}</p>
      {fromClassic && <div role="note" style={{ ...S.card, padding: 12, marginTop: 10, borderColor: C.accent + '55' }}>
        <p style={{ ...S.small, margin: 0 }}>You opened the Classic <strong style={{ color: C.text }}>{fromClassic.label}</strong> lesson. It has been rebuilt here{track && lesson.tracks ? ` — you're on the ${lesson.tracks.find(t => t.id === track)?.title || track} track` : ''}. Your Classic progress is kept and shown as legacy; only this lesson counts toward mastery.</p>
        {onOpenLegacy && <button className="lp-focus" style={{ ...S.btnGhost, padding: '4px 10px', marginTop: 8 }} onClick={() => onOpenLegacy(fromClassic.section === 'RC' ? 'Reading Comprehension' : 'Logical Reasoning', fromClassic.label, { reference: true })}>View the original Classic lesson (reference)</button>}
      </div>}
      {!fromClassic && lesson.tracks && <p style={{ ...S.small, marginTop: 6 }}>Tracks in this lesson: {lesson.tracks.map(t => t.title).join(' · ')}{track ? ` — starting with ${lesson.tracks.find(t => t.id === track)?.title}` : ''}.</p>}

      <ol aria-label="Lesson stages" style={{ display: 'flex', gap: 6, listStyle: 'none', padding: 0, margin: '16px 0 20px', flexWrap: 'wrap' }}>
        {PLAYABLE_STAGES.map((st, i) => {
          const done = completed.includes(st); const isCur = current === st || (current === 'not_started' && st === 'learn'); const reachable = done || isCur;
          return (
            <li key={st} style={{ flex: '1 1 120px' }}>
              <button className="lp-focus" disabled={!reachable} onClick={() => setView(isCur ? null : st)} aria-current={shown === st ? 'step' : undefined}
                style={{ width: '100%', textAlign: 'left', padding: '8px 10px', borderRadius: 10, cursor: reachable ? 'pointer' : 'not-allowed', fontFamily: T.sans, fontSize: fz(13),
                  border: `1.5px solid ${shown === st ? C.accent : C.border}`, background: shown === st ? C.accentSoft : 'transparent', color: reachable ? C.text : C.textSub, opacity: reachable ? 1 : 0.6 }}>
                <span aria-hidden="true">{done ? '✓' : i + 1}</span> {STAGE_LABELS[st]}<span className="sr-only" style={{ position: 'absolute', left: -9999 }}>{done ? ' (completed)' : isCur ? ' (current)' : ' (locked until earlier stages are done)'}</span>
              </button>
            </li>
          );
        })}
        <li style={{ flex: '1 1 120px' }}>
          <div style={{ padding: '8px 10px', borderRadius: 10, fontSize: fz(13), border: `1.5px dashed ${C.border}`, color: C.textSub }}>
            <span aria-hidden="true">{engine.reviews[lesson.skillId] ? '🔁' : PLAYABLE_STAGES.length + 1}</span> {STAGE_LABELS.review}
            <span style={{ display: 'block', fontSize: fz(12) }}>{engine.reviews[lesson.skillId] ? `Due ${new Date(engine.reviews[lesson.skillId].due).toLocaleDateString()}` : 'Scheduled after the mastery check'}</span>
          </div>
        </li>
      </ol>

      {progress?.remediation && !view && <div role="status" style={{ ...S.card, padding: 12, marginBottom: 14, borderColor: C.gold + '88' }}><span style={S.small}>↩ Revisiting {STAGE_LABELS[progress.remediation.toStage]}: {progress.remediation.reason}</span></div>}

      {current === 'completed' && !view && <LessonComplete {...{ engine, lesson, C, S, onBack, onReplay: (st) => setView(st) }} />}
      {shown === 'learn' && (current !== 'completed' || view) && <LearnStage {...{ lesson, C, S, T, engine, commit, replay: completed.includes('learn'), onComplete: () => completeStage('learn') }} />}
      {shown === 'recognize' && (current !== 'completed' || view) && <ItemStage key={'rec' + (progress?.stageEpoch?.recognize || '')} {...{ lesson, C, S, T, commit, engine, stage: 'recognize', track, attempts: stageAttempts('recognize'), allowHints: false, replay: completed.includes('recognize'),
        intro: 'Spot the idea before solving full questions. Short items; these do not count toward mastery.',
        evaluate: (atts) => { const r = recognizeCheckpoint(atts); return { passed: r.passed, msg: `${r.correct} of your last ${r.window} correct (need ${r.needed} of ${LESSON_POLICY.recognize.window}).` }; },
        onComplete: () => completeStage('recognize') }} />}
      {shown === 'apply' && (current !== 'completed' || view) && <ItemStage key={'app' + (progress?.stageEpoch?.apply || '')} {...{ lesson, C, S, T, commit, engine, stage: 'apply', track, attempts: stageAttempts('apply'), allowHints: true, replay: completed.includes('apply'),
        intro: 'Guided practice. Hints are available — using one is fine, and it is recorded so we know which wins were independent.',
        evaluate: (atts) => { const r = applyCheckpoint(atts); return { passed: r.passed, msg: `${r.correct} correct (need ${r.needed}). Hints used: ${r.hintsUsed}.` }; },
        onComplete: () => completeStage('apply') }} />}
      {shown === 'challenge' && (current !== 'completed' || view) && <ChallengeStage key={'ch' + (progress?.stageEpoch?.challenge || '')} {...{ lesson, C, S, T, commit, engine, deps, attempts: stageAttempts('challenge'), replay: completed.includes('challenge'), onComplete: () => completeStage('challenge'), onRemediate: () => remediate('apply', `Your independent challenge answers suggest “${lesson.misconceptions[0]?.label || lesson.title}” needs another guided pass.`) }} />}
      {shown === 'explain' && (current !== 'completed' || view) && <ExplainStage {...{ lesson, C, S, T, commit, engine, replay: completed.includes('explain'), onComplete: () => completeStage('explain') }} />}
      {shown === 'mastery_check' && (current !== 'completed' || view) && <MasteryCheckStage {...{ lesson, C, S, T, commit, engine, deps, attempts: stageAttempts('mastery_check'), replay: completed.includes('mastery_check'), onComplete: () => completeStage('mastery_check') }} />}
    </main>
  );
}

function LearnStage({ lesson, C, S, T, engine, commit, replay, onComplete }) {
  // ORIENT: one unscored diagnostic question BEFORE instruction (what do you already see?).
  const checkpoint = lesson.items.find(i => i.stage === 'orient' || i.stage === 'learn');
  const answered = engine.attempts.some(a => a.lessonId === lesson.id && (a.stage === 'orient' || a.stage === 'learn'));
  const [oriented, setOriented] = useState(answered || replay);
  if (!oriented && checkpoint) return (
    <section aria-labelledby="or-h">
      <div style={{ ...S.card, marginBottom: 14 }}>
        <h2 id="or-h" style={S.h2}>Orient: try one first</h2>
        <p style={S.p}>Before the lesson, answer one question with what you already know. It is not scored — it shows you what the lesson will sharpen.</p>
      </div>
      <QuestionCard {...{ C, S, T, item: authoredToServable(checkpoint), stage: 'orient', lesson, commit, engine, allowHints: false, onNext: () => setOriented(true), nextLabel: 'Start the lesson →' }} />
      <p style={{ ...S.small, marginTop: 8 }}><button className="lp-focus" style={{ ...S.btnGhost, padding: '4px 10px' }} onClick={() => setOriented(true)}>Skip to the lesson</button></p>
    </section>
  );
  return (
    <div>
      <div style={{ ...S.card, marginBottom: 14 }}>
        <h2 style={S.h2}>Why this matters</h2>
        <p style={S.p}>{lesson.why}</p>
      </div>
      {lesson.sections.map(sec => (
        <section key={sec.id} id={'sec-' + sec.id} style={{ ...S.card, marginBottom: 14 }} aria-labelledby={'h-' + sec.id}>
          <h2 id={'h-' + sec.id} style={S.h2}>{sec.title}</h2>
          {sec.body.map((b, i) => <p key={i} style={S.p}>{b}</p>)}
          {sec.diagram && <pre style={{ background: C.surfaceHigh, color: C.text, padding: '10px 14px', borderRadius: 10, fontSize: fz(15), overflowX: 'auto', margin: '6px 0' }}>{sec.diagram}</pre>}
          {sec.table && (
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: fz(14), color: C.text }}>
                <thead><tr><th scope="col" style={{ textAlign: 'left', padding: 8, borderBottom: `1px solid ${C.border}`, color: C.textSub }}>Statement</th><th scope="col" style={{ textAlign: 'left', padding: 8, borderBottom: `1px solid ${C.border}`, color: C.textSub }}>Rule</th></tr></thead>
                <tbody>{sec.table.map(([a, b], i) => <tr key={i}><td style={{ padding: 8, borderBottom: `1px solid ${C.border}` }}>{a}</td><td style={{ padding: 8, borderBottom: `1px solid ${C.border}`, fontFamily: 'ui-monospace,monospace' }}>{b}</td></tr>)}</tbody>
              </table>
            </div>
          )}
          {sec.note && <p style={{ ...S.p, marginTop: 10, fontSize: fz(14) }}><strong style={{ color: C.text }}>Key: </strong>{sec.note}</p>}
        </section>
      ))}
      <section style={{ ...S.card, marginBottom: 14 }}>
        <h2 style={S.h2}>Worked examples</h2>
        {lesson.workedExamples.map(w => (
          <div key={w.id} style={{ marginBottom: 14 }}>
            <p style={{ ...S.p, color: C.text, fontWeight: 600 }}>{w.prompt}</p>
            <ol style={{ color: C.textSub, lineHeight: 1.7, paddingLeft: 22, margin: '0 0 6px' }}>{w.steps.map((s, i) => <li key={i}>{s}</li>)}</ol>
            <p style={{ ...S.p, color: C.success }}>✓ {w.conclusion}</p>
          </div>
        ))}
        <p style={{ ...S.p, color: C.text, fontWeight: 600 }}>Counterexample: {lesson.counterexample.claim}</p>
        <p style={S.p}>✗ {lesson.counterexample.whyInvalid}</p>
      </section>
      <section style={{ ...S.card, marginBottom: 14 }}>
        <h2 style={S.h2}>Common mistakes</h2>
        <ul style={{ paddingLeft: 20, margin: 0 }}>{lesson.misconceptions.map(m => <li key={m.tag} style={{ ...S.p }}><strong style={{ color: C.text }}>{m.label}.</strong> {m.fix}</li>)}</ul>
      </section>
      <section aria-labelledby="cp-h" style={S.card}>
        <h2 id="cp-h" style={S.h2}>Ready to practice?</h2>
        <p style={S.p}>{replay ? 'You can re-read anything above.' : 'Next you will recognize the idea in short items, then apply it with hints available.'}</p>
        {!replay && <button className="lp-focus" style={S.btn} onClick={onComplete}>Continue to Recognize →</button>}
      </section>
    </div>
  );
}

function ItemStage({ lesson, C, S, T, commit, engine, stage, track, attempts, allowHints, intro, evaluate, onComplete, replay }) {
  const seen = new Set(attempts.map(a => a.itemId));
  const pool = orderForTrack(lesson.items.filter(i => i.stage === stage), track);
  const [sessionIdx, setSessionIdx] = useState(0);
  const pick = () => { const unseen = pool.filter(i => !seen.has(i.id)); return unseen[0] || pool[(attempts.length + sessionIdx) % pool.length]; };
  const [item, setItem] = useState(pick);
  const ev = evaluate(attempts);
  const exhausted = pool.every(i => seen.has(i.id));
  return (
    <div>
      <p style={S.p}>{intro}</p>
      {attempts.length > 0 && <p role="status" style={{ ...S.small, marginBottom: 10 }}>Progress: {ev.msg}</p>}
      <QuestionCard key={item.id + ':' + sessionIdx} {...{ C, S, T, item: authoredToServable(item), stage, lesson, commit, engine, allowHints,
        onNext: () => { setSessionIdx(i => i + 1); setItem(pick()); },
        nextLabel: 'Next question', hideNext: false }} />
      {ev.passed && <div style={{ ...S.card, marginTop: 12, borderColor: C.success + '66' }}>
        <p style={{ ...S.p, color: C.text }}>✓ Checkpoint met. {replay ? 'This stage is already complete.' : 'You can keep practicing or move on.'}</p>
        {!replay && <button className="lp-focus" style={S.btn} onClick={onComplete}>Continue to {STAGE_LABELS[stage === 'recognize' ? 'apply' : 'challenge']} →</button>}
      </div>}
      {!ev.passed && exhausted && attempts.length >= pool.length && <div style={{ ...S.card, marginTop: 12, borderColor: C.gold + '66' }}>
        <p style={S.p}>You have seen every {STAGE_LABELS[stage].toLowerCase()} item once. Re-read {lesson.sections.slice(0, 2).map((sec, i) => <span key={sec.id}>{i ? ' and ' : ''}<a href={'#sec-' + sec.id} style={{ color: C.accent }}>{sec.title}</a></span>)} in the lesson, then try the items again — they come back in a new order.</p>
      </div>}
    </div>
  );
}

function useGeneratedQuestion({ lesson, stage, difficulty, engine, deps, commit, excludeIds }) {
  const [state, setState] = useState({ status: 'idle', question: null, message: null });
  const reqRef = useRef(0);
  const load = async () => {
    const my = ++reqRef.current;
    setState({ status: 'loading', question: null, message: null });
    const seenIds = new Set(engine.attempts.filter(a => a.lessonId === lesson.id).map(a => a.itemId));
    const recentErrorTags = engine.errors.filter(e => e.skillId === lesson.skillId && !e.resolvedBy).slice(-3).map(e => e.category);
    const r = await generateSkillQuestion(
      { skillId: lesson.skillId, stage, difficulty, recentErrorTags, fallbackStage: stage === 'review' ? 'mastery_check' : stage },
      { ...deps, lesson, seenIds, excludeIds, exposure: engine.exposure });
    if (my !== reqRef.current) return; // a newer request superseded this one (refresh / double click)
    commit(e => ({ engine: logGeneration(e, r.log) }));
    setState({ status: r.status, question: r.question, message: r.message, reused: r.reused });
  };
  return [state, load];
}

function SourceBadge({ q, C, S, message, reused }) {
  if (!q) return null;
  if (q.source === 'generated') return <div style={{ marginBottom: 8 }}><span style={S.tag(C.purple)}>Fresh AI-generated question</span>{q.validation?.status === 'provisional' && <span style={{ ...S.small, marginLeft: 8 }}>Could not be independently verified — practice only, not counted toward mastery.</span>}</div>;
  if (q.source === 'fallback') return <div role="status" style={{ marginBottom: 8 }}><span style={S.tag(C.gold)}>Authored practice question</span><span style={{ ...S.small, marginLeft: 8 }}>{message} Using a reviewed question from the lesson bank instead{reused ? ' (you have seen this one before)' : ''}.</span></div>;
  return null;
}

function ChallengeStage({ lesson, C, S, T, commit, engine, deps, attempts, onComplete, onRemediate, replay }) {
  const n = LESSON_POLICY.challenge.itemCount;
  const difficulty = attempts.length === 0 ? 2 : 3;
  const [gen, load] = useGeneratedQuestion({ lesson, stage: 'challenge', difficulty, engine, deps, commit });
  const out = challengeOutcome(attempts);
  const [finished, setFinished] = useState(out.done); // keep the last question's feedback visible until the student moves on
  useEffect(() => { if (!out.done && gen.status === 'idle') load(); }, []); // eslint-disable-line
  return (
    <div>
      <p style={S.p}>Independent challenge: no hints. Each question is new and LSAT-style. Question {Math.min(attempts.length + 1, n)} of {n}.</p>
      {!finished && gen.status === 'loading' && <div role="status" aria-live="polite" style={{ ...S.card, textAlign: 'center' }}><p style={S.p}>Building a fresh question and checking it…</p></div>}
      {!finished && gen.status === 'failed' && <div role="alert" style={{ ...S.card, borderColor: C.danger + '66' }}><p style={S.p}>{gen.message} Your progress is saved.</p><button className="lp-focus" style={S.btn} onClick={load}>Try again</button></div>}
      {!finished && gen.question && <>
        <SourceBadge q={gen.question} C={C} S={S} message={gen.message} reused={gen.reused} />
        <QuestionCard key={gen.question.key} {...{ C, S, T, item: gen.question, stage: 'challenge', lesson, commit, engine, allowHints: false, onNext: () => { if (attempts.length < n) load(); else setFinished(true); }, nextLabel: attempts.length >= n ? 'See results' : 'Next challenge' }} />
      </>}
      {finished && out.done && <div style={{ ...S.card, borderColor: (out.remediate ? C.gold : C.success) + '66' }}>
        <p style={{ ...S.p, color: C.text }}>Challenge results: {out.correct} of {out.total} correct.</p>
        {out.remediate ? <>
          <p style={S.p}>That is below the level where moving on usually helps. One more guided pass is the smallest useful step.</p>
          {!replay && <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}><button className="lp-focus" style={S.btn} onClick={onRemediate}>Back to guided practice</button><button className="lp-focus" style={S.btnGhost} onClick={onComplete}>Continue anyway</button></div>}
        </> : !replay && <button className="lp-focus" style={S.btn} onClick={onComplete}>Continue to Explain &amp; reflect →</button>}
      </div>}
    </div>
  );
}

function MasteryCheckStage({ lesson, C, S, T, commit, engine, attempts, onComplete, replay }) {
  const n = LESSON_POLICY.masteryCheck.itemCount;
  const seenIds = new Set(engine.attempts.filter(a => a.lessonId === lesson.id).map(a => a.itemId));
  const mine = new Set(attempts.map(a => a.itemId));
  const [k, setK] = useState(0);
  const item = useMemo(() => { const p = pickAuthored(lesson, 'mastery_check', seenIds, mine); return p ? p.item : null; }, [k]); // eslint-disable-line
  const [finished, setFinished] = useState(attempts.length >= n);
  const done = finished || !item;
  return (
    <div>
      <p style={S.p}>Mastery check: {n} mixed questions, no hints, answer on your own. This sets your first review date.</p>
      {!done && <QuestionCard key={item.id} {...{ C, S, T, item: authoredToServable(item), stage: 'mastery_check', lesson, commit, engine, allowHints: false, onNext: () => { if (attempts.length >= n) setFinished(true); else setK(x => x + 1); }, nextLabel: attempts.length >= n ? 'Finish' : 'Next question' }} />}
      {done && !replay && <div style={S.card}><p style={S.p}>Mastery check complete: {attempts.filter(a => a.correct).length} of {attempts.length} correct.</p><button className="lp-focus" style={S.btn} onClick={onComplete}>See my progress →</button></div>}
      {done && replay && <div style={S.card}><p style={S.p}>You completed this check. Future checks happen in Review with fresh questions.</p></div>}
    </div>
  );
}

function LessonComplete({ engine, lesson, C, S, onBack, onReplay }) {
  const m = engine.mastery[lesson.skillId];
  const r = engine.reviews[lesson.skillId];
  return (
    <div style={{ ...S.card, borderColor: C.success + '66' }}>
      <h2 style={S.h2}>Lesson complete</h2>
      <p style={{ ...S.p, color: C.text }}>Status: <strong>{STATE_ICON[m?.state || 'learning']} {STATE_LABELS[m?.state || 'learning']}</strong></p>
      <ul style={{ paddingLeft: 20 }}>{(m?.reasons || []).map((x, i) => <li key={i} style={S.p}>{x}</li>)}</ul>
      {r && <p style={S.p}>Next review: <strong style={{ color: C.text }}>{new Date(r.due).toLocaleDateString(undefined, { weekday: 'long', month: 'short', day: 'numeric' })}</strong>. You will get a fresh question, not a repeat.</p>}
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
        <button className="lp-focus" style={S.btn} onClick={onBack}>Back to path</button>
        <button className="lp-focus" style={S.btnGhost} onClick={() => onReplay('learn')}>Re-read the lesson</button>
        <button className="lp-focus" style={S.btnGhost} onClick={() => onReplay('apply')}>More guided practice</button>
      </div>
    </div>
  );
}

// ═════════════════════════════════════════════════════════════════════════════
// PLACEMENT (test out) and REVIEW
// ═════════════════════════════════════════════════════════════════════════════
function PlacementSession({ user, onUpdateUser, C, T, lesson, onDone }) {
  const S = styles(C, T);
  const commit = useEngineCommit(onUpdateUser);
  const engine = getEngine(user);
  const [runId] = useState(() => newId('pl'));
  const ids = lesson.placementItemIds;
  const atts = engine.attempts.filter(a => a.placementRun === runId);
  const out = placementOutcome(atts);
  const item = lesson.items.find(i => i.id === ids[atts.length]);
  const appliedRef = useRef(false);
  useEffect(() => {
    if (out.done && out.passed && !appliedRef.current) { appliedRef.current = true; commit(e => lessonEvent(e, lesson, { type: 'tested_out' })); }
  }, [out.done, out.passed]); // eslint-disable-line
  const missedTags = atts.filter(a => !a.correct).map(a => a.errorTag).filter(Boolean);
  return (
    <main style={{ maxWidth: 780, margin: '0 auto', padding: '24px 18px' }}>
      <FocusStyles C={C} />
      <button className="lp-focus" onClick={onDone} style={{ ...S.btnGhost, marginBottom: 14 }}>← Back to path</button>
      <h1 style={{ ...S.h1, fontSize: Math.round(24 * (globalThis.__LUMORA_FONT_SCALE__ || 1)) }}>Test out: {lesson.title}</h1>
      <p style={S.small}>{ids.length} varied questions, no hints. Pass with {out.needed} independent correct answers to skip ahead. You can always open the lesson later.</p>
      {!out.done && item && <div style={{ marginTop: 14 }}><p style={S.small}>Question {atts.length + 1} of {ids.length}</p>
        <QuestionCard key={item.id} {...{ C, S, T, item: authoredToServable(item), stage: 'placement', lesson, commit, engine, allowHints: false, extra: { placementRun: runId }, showFeedback: false, onNext: () => {}, nextLabel: 'Next' }} /></div>}
      {out.done && <div role="status" style={{ ...S.card, marginTop: 14, borderColor: (out.passed ? C.success : C.gold) + '66' }}>
        {out.passed ? <>
          <p style={{ ...S.p, color: C.text }}>✓ {out.independentCorrect} of {ids.length} correct without help. You have tested out of the introductory stages.</p>
          <p style={S.p}>This counts as evidence, not as mastery. A short mastery check now and a review in a few days will confirm it.</p>
        </> : <>
          <p style={{ ...S.p, color: C.text }}>{out.independentCorrect} of {ids.length} correct without help. The lesson will be worth your time.</p>
          {missedTags.length > 0 && <p style={S.p}>Focus areas: {[...new Set(missedTags)].map(t => lesson.misconceptions.find(m => m.tag === t)?.label || t).join('; ')}.</p>}
        </>}
        <button className="lp-focus" style={S.btn} onClick={onDone}>Back to path</button>
      </div>}
    </main>
  );
}

// ═════════════════════════════════════════════════════════════════════════════
// EXPLAIN & REFLECT — the learner explains a solved question in their own words, compares with the
// model explanation, and self-checks. Only the self-check result is stored; the text is never saved.
// ═════════════════════════════════════════════════════════════════════════════
const EXPLAIN_CHECKS = [
  'I named the logical relationship that makes the answer right — not just the topic.',
  'I said why a tempting wrong answer fails.',
  'I kept the claim at the right strength — no stronger or weaker than the evidence allows.',
];
function ExplainStage({ lesson, C, S, T, commit, engine, replay, onComplete }) {
  // The challenge/apply item with the fullest worked rationale makes the best model explanation.
  const richness = (i) => (i.rationale || '').length + Math.max(0, ...Object.values(i.distractorRationales || {}).map(x => x.length));
  const item = lesson.items.filter(i => i.stage === 'challenge' || i.stage === 'apply').sort((a, b) => richness(b) - richness(a))[0];
  const prior = engine.explanations?.[lesson.id];
  const [text, setText] = useState('');
  const [revealed, setRevealed] = useState(false);
  const [checks, setChecks] = useState(EXPLAIN_CHECKS.map(() => false));
  const [reflection, setReflection] = useState('');
  const [saved, setSaved] = useState(null);
  if (!item) return null;
  const words = text.trim().split(/\s+/).filter(Boolean).length;
  const minWords = LESSON_POLICY.explain.minWords;
  // Most tempting distractor: the one matching this learner's most frequent error tag in this lesson.
  const tagCounts = {}; for (const a of engine.attempts) if (a.lessonId === lesson.id && a.errorTag) tagCounts[a.errorTag] = (tagCounts[a.errorTag] || 0) + 1;
  const dEntries = Object.entries(item.distractorTags || {});
  const tempting = dEntries.sort((a, b) => (tagCounts[b[1]] || 0) - (tagCounts[a[1]] || 0))[0]?.[0];
  const submit = () => {
    const out = explanationOutcome(checks);
    commit(e => ({ engine: recordExplanation(e, { lessonId: lesson.id, skillId: lesson.skillId, itemId: item.id, checks, acceptable: out.acceptable, reflectionTag: reflection || null }) }));
    setSaved(out);
  };
  return (
    <div>
      <p style={S.p}>Explaining an answer is the fastest way to find out whether you really understand it. Write a short explanation, then compare it with ours.</p>
      {prior && !saved && <p role="status" style={S.small}>You did this before ({prior.acceptable ? 'self-check passed' : 'self-check not yet passed'}). You can do it again.</p>}
      <div style={S.card}>
        <p style={{ ...S.p, color: C.text, fontFamily: T.serif, whiteSpace: 'pre-line' }}>{item.stimulus}</p>
        <p style={{ ...S.p, color: C.text, fontWeight: 700 }}>{item.stem}</p>
        <p style={{ ...S.p, color: C.success }}>Correct answer ({item.correct}): {item.choices[item.correct]}</p>
        {tempting && <p style={S.p}>Tempting wrong answer ({tempting}): {item.choices[tempting]}</p>}
        <label htmlFor="ex-text" style={{ ...S.small, display: 'block', marginTop: 8 }}>Your explanation — why is ({item.correct}) right{tempting ? ` and (${tempting}) wrong` : ''}? <em>Not saved; only your self-check is recorded.</em></label>
        <textarea id="ex-text" className="lp-focus" value={text} onChange={e => setText(e.target.value.slice(0, 1200))} rows={5} disabled={revealed}
          style={{ width: '100%', boxSizing: 'border-box', marginTop: 6, padding: 10, borderRadius: 10, border: `1.5px solid ${C.border}`, background: C.surfaceHigh, color: C.text, fontSize: fz(15), fontFamily: T.sans, lineHeight: 1.5 }} />
        {!revealed && <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginTop: 8, flexWrap: 'wrap' }}>
          <button className="lp-focus" style={{ ...S.btn, opacity: words >= minWords ? 1 : 0.5 }} disabled={words < minWords} onClick={() => setRevealed(true)}>Compare with the model explanation</button>
          <span style={S.small} aria-live="polite">{words < minWords ? `${minWords - words} more word${minWords - words === 1 ? '' : 's'} to compare` : 'Ready'}</span>
        </div>}
      </div>
      {revealed && <div style={{ ...S.card, marginTop: 12 }}>
        <h2 style={S.h2}>Model explanation</h2>
        <p style={S.p}><strong style={{ color: C.text }}>Why ({item.correct}) is right: </strong>{item.rationale}</p>
        {tempting && <p style={S.p}><strong style={{ color: C.text }}>Why ({tempting}) is wrong: </strong>{item.distractorRationales?.[tempting]}</p>}
        <fieldset style={{ border: 'none', padding: 0, margin: '10px 0' }}>
          <legend style={{ ...S.small, fontWeight: 700, marginBottom: 6 }}>Check your explanation honestly</legend>
          {EXPLAIN_CHECKS.map((c, i) => <label key={i} style={{ display: 'flex', gap: 8, alignItems: 'flex-start', ...S.p, marginBottom: 6, cursor: 'pointer' }}>
            <input type="checkbox" checked={checks[i]} disabled={!!saved} onChange={() => setChecks(cs => cs.map((x, j) => j === i ? !x : x))} style={{ marginTop: 5 }} />{c}</label>)}
        </fieldset>
        <label htmlFor="ex-refl" style={{ ...S.small, display: 'block' }}>Reflect: which mistake are you most likely to make on this skill?</label>
        <select id="ex-refl" className="lp-focus" value={reflection} disabled={!!saved} onChange={e => setReflection(e.target.value)} style={{ marginTop: 6, padding: 8, borderRadius: 8, fontSize: fz(14), background: C.surfaceHigh, color: C.text, border: `1px solid ${C.border}`, maxWidth: '100%' }}>
          <option value="">Choose one (optional)</option>
          {lesson.misconceptions.map(m => <option key={m.tag} value={m.tag}>{m.label}</option>)}
        </select>
        {reflection && <p style={{ ...S.small, marginTop: 6 }}>Remedy: {lesson.misconceptions.find(m => m.tag === reflection)?.fix}</p>}
        {!saved && <div style={{ marginTop: 10 }}><button className="lp-focus" style={S.btn} onClick={submit}>Save my self-check</button></div>}
        {saved && <div role="status" style={{ marginTop: 10 }}>
          <p style={{ ...S.p, color: saved.acceptable ? C.success : C.text }}>{saved.acceptable ? '✓ Your explanation covers the key points. That counts toward Proficient.' : `Your self-check found gaps (${saved.checked} of ${EXPLAIN_CHECKS.length}). Re-read the model explanation; you can redo this stage any time from the stage list. Proficient needs an explanation that covers at least ${saved.needed} points.`}</p>
          {!replay && <button className="lp-focus" style={S.btn} onClick={onComplete}>Continue to Mastery check →</button>}
        </div>}
      </div>}
    </div>
  );
}

// ═════════════════════════════════════════════════════════════════════════════
// MIXED REVIEW — fresh questions from several completed skills, type NOT named until you answer.
// Required (with a delayed review) for Mastered: it checks transfer, not just recall of one lesson.
// ═════════════════════════════════════════════════════════════════════════════
export function mixedSkills(engine) {
  return Object.values(engine.lessons || {}).filter(p => p.stage === 'completed' || p.placement === 'tested_out')
    .map(p => Object.values(LESSONS_BY_SKILL).find(l => l.id === p.lessonId)?.skillId).filter(Boolean);
}
function pickMixed(engine, n = 3) {
  const skills = mixedSkills(engine);
  const lastMixed = (sid) => Math.max(0, ...engine.attempts.filter(a => a.skillId === sid && a.mixed).map(a => a.ts));
  const dueFirst = (sid) => (engine.reviews[sid]?.due || Infinity);
  const ordered = [...skills].sort((a, b) => dueFirst(a) - dueFirst(b) || lastMixed(a) - lastMixed(b));
  const pick = ordered.slice(0, n);
  for (let i = pick.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [pick[i], pick[j]] = [pick[j], pick[i]]; }
  return pick;
}
function MixedItem({ lesson, engine, deps, commit, C, S, T, onNext, last }) {
  const [gen, load] = useGeneratedQuestion({ lesson, stage: 'review', difficulty: 2, engine, deps, commit });
  const [answered, setAnswered] = useState(false);
  useEffect(() => { load(); }, []); // eslint-disable-line
  return <>
    {gen.status === 'loading' && <div role="status" style={S.card}><p style={S.p}>Preparing a fresh question…</p></div>}
    {gen.status === 'failed' && <div role="alert" style={S.card}><p style={S.p}>{gen.message}</p><button className="lp-focus" style={S.btn} onClick={load}>Try again</button> <button className="lp-focus" style={S.btnGhost} onClick={onNext}>Skip</button></div>}
    {gen.question && <>
      <SourceBadge q={gen.question} C={C} S={S} message={gen.message} reused={gen.reused} />
      <QuestionCard key={gen.question.key} {...{ C, S, T, item: gen.question, stage: 'review', lesson, commit, engine, allowHints: false, extra: { mixed: true }, onNext, nextLabel: last ? 'Finish' : 'Next question' }} />
    </>}
  </>;
}
export function MixedReviewSession({ user, onUpdateUser, C, T, deps, onDone }) {
  const S = styles(C, T);
  const commit = useEngineCommit(onUpdateUser);
  const engine = getEngine(user);
  const [skills] = useState(() => pickMixed(engine));
  const [i, setI] = useState(0);
  const done = i >= skills.length;
  return (
    <main style={{ maxWidth: 780, margin: '0 auto', padding: '24px 18px' }}>
      <FocusStyles C={C} />
      <button className="lp-focus" onClick={onDone} style={{ ...S.btnGhost, marginBottom: 14 }}>← Back to path</button>
      <h1 style={{ ...S.h1, fontSize: Math.round(24 * (globalThis.__LUMORA_FONT_SCALE__ || 1)) }}>Mixed review</h1>
      <p style={S.small}>Questions from different skills you have learned. The question type is not named — deciding what kind of question it is, is part of the skill. No hints.</p>
      {skills.length < 2 && <div style={S.card}><p style={S.p}>Finish at least two lessons to unlock mixed review.</p></div>}
      {skills.length >= 2 && !done && <><p style={S.small}>Question {i + 1} of {skills.length}</p>
        <MixedItem key={i} {...{ lesson: LESSONS_BY_SKILL[skills[i]], engine, deps, commit, C, S, T, last: i === skills.length - 1, onNext: () => setI(x => x + 1) }} /></>}
      {skills.length >= 2 && done && <div role="status" style={S.card}><p style={S.p}>Mixed review saved. Correct, unassisted answers here count as transfer evidence toward Mastered.</p><button className="lp-focus" style={S.btn} onClick={onDone}>Back to path</button></div>}
    </main>
  );
}

export function ReviewSession({ user, onUpdateUser, C, T, lesson, deps, onDone }) {
  const S = styles(C, T);
  const commit = useEngineCommit(onUpdateUser);
  const engine = getEngine(user);
  const [gen, load] = useGeneratedQuestion({ lesson, stage: 'review', difficulty: 2, engine, deps, commit });
  const [answered, setAnswered] = useState(false);
  useEffect(() => { load(); }, []); // eslint-disable-line
  const r = engine.reviews[lesson.skillId];
  return (
    <main style={{ maxWidth: 780, margin: '0 auto', padding: '24px 18px' }}>
      <FocusStyles C={C} />
      <button className="lp-focus" onClick={onDone} style={{ ...S.btnGhost, marginBottom: 14 }}>← Back to path</button>
      <h1 style={{ ...S.h1, fontSize: Math.round(24 * (globalThis.__LUMORA_FONT_SCALE__ || 1)) }}>Review: {lesson.title}</h1>
      <p style={S.small}>A retrieval check with a question you have not seen. No hints.</p>
      {gen.status === 'loading' && <div role="status" style={S.card}><p style={S.p}>Preparing a fresh question…</p></div>}
      {gen.status === 'failed' && <div role="alert" style={S.card}><p style={S.p}>{gen.message}</p><button className="lp-focus" style={S.btn} onClick={load}>Try again</button></div>}
      {gen.question && !answered && <><SourceBadge q={gen.question} C={C} S={S} message={gen.message} reused={gen.reused} />
        <QuestionCard key={gen.question.key} {...{ C, S, T, item: gen.question, stage: 'review', lesson, commit, engine, allowHints: false, onNext: () => setAnswered(true), nextLabel: 'Done' }} /></>}
      {answered && <div style={S.card}><p style={S.p}>Saved. Next review: {r ? new Date(r.due).toLocaleDateString() : 'scheduled'}.</p><button className="lp-focus" style={S.btn} onClick={onDone}>Back to path</button></div>}
    </main>
  );
}

// ═════════════════════════════════════════════════════════════════════════════
// QUESTION CARD — answer, confidence, graduated hints, feedback, error journal, flag
// ═════════════════════════════════════════════════════════════════════════════
function QuestionCard({ C, S, T, item, stage, lesson, commit, engine, allowHints, onNext, nextLabel = 'Next', extra = {}, showFeedback = true }) {
  const attemptId = useRef(newId('att')).current; // stable per question → idempotent submit
  const startedAt = useRef(Date.now()).current;
  const [selected, setSelected] = useState(null);
  const [confidence, setConfidence] = useState(null);
  const [hints, setHints] = useState(0);
  const [submitted, setSubmitted] = useState(false);
  const [showAll, setShowAll] = useState(false);
  const [flagged, setFlagged] = useState(false);
  const key = item.answer.correct_choice_id;
  const correct = selected === key;
  const tag = selected && !correct ? item.distractorTags?.[selected] : null;
  const misconception = tag ? lesson.misconceptions.find(m => m.tag === tag) : null;
  const section = tag ? lesson.sections.find(s => s.id === sectionForTag(lesson, tag)) : null;
  const errorRec = submitted && !correct ? engine.errors.find(e => e.attemptId === attemptId) : null;

  const submit = () => {
    if (!selected || submitted) return;
    setSubmitted(true);
    const attempt = {
      id: attemptId, ts: Date.now(), skillId: lesson.skillId, lessonId: lesson.id, lessonVersion: lesson.version, stage,
      itemId: item.itemId, source: item.source, fingerprint: item.fingerprint, difficulty: item.difficulty,
      selected, correctChoice: key, correct: selected === key, confidence, hintsUsed: hints, revealed: false,
      timeMs: Date.now() - startedAt, scorable: item.scorable !== false && !UNSCORED_STAGES.includes(stage), structure: structureKey(item.content),
      errorTag: tag || null, errorCategory: tag ? TAG_TO_ERROR_CATEGORY[tag] : (selected !== key && confidence === 'guess' ? 'guess' : null),
      remediationSection: section?.id || null, ...extra,
      itemSnapshot: { stimulus: item.content.stimulus.slice(0, 220), stem: item.content.stem.slice(0, 160), selectedText: (item.content.choices.find(c => c.id === selected)?.text || '').slice(0, 160), correctText: (item.content.choices.find(c => c.id === key)?.text || '').slice(0, 160) },
    };
    commit(e => recordAttempt(e, attempt));
    if (!showFeedback) setTimeout(onNext, 0);
  };

  const choiceState = (id) => !submitted || !showFeedback ? (selected === id ? 'sel' : 'def') : id === key ? 'ok' : id === selected ? 'bad' : 'def';
  const border = { def: C.border, sel: C.accent, ok: C.success, bad: C.danger };
  const bg = { def: 'transparent', sel: C.accentSoft, ok: C.success + '18', bad: C.danger + '14' };

  return (
    <div style={{ ...S.card }}>
      <p style={{ ...S.p, color: C.text, fontSize: Math.round(16 * (globalThis.__LUMORA_FONT_SCALE__ || 1)), fontFamily: T.serif, whiteSpace: 'pre-line' }}>{item.content.stimulus}</p>
      <p style={{ ...S.p, color: C.text, fontWeight: 700 }} id={'stem-' + attemptId}>{item.content.stem}</p>
      <div role="radiogroup" aria-labelledby={'stem-' + attemptId}>
        {item.content.choices.map(ch => {
          const st = choiceState(ch.id);
          return (
            <button key={ch.id} role="radio" aria-checked={selected === ch.id} disabled={submitted} className="lp-focus lp-choice"
              onClick={() => setSelected(ch.id)}
              style={{ display: 'flex', gap: 10, width: '100%', textAlign: 'left', border: `1.5px solid ${border[st]}`, background: bg[st], color: C.text, borderRadius: 12, padding: '11px 14px', marginBottom: 8, cursor: submitted ? 'default' : 'pointer', fontSize: fz(15), lineHeight: 1.5, fontFamily: T.sans }}>
              <strong style={{ minWidth: 22 }}>({ch.id})</strong>
              <span style={{ flex: 1 }}>{ch.text}</span>
              {st === 'ok' && <span aria-label="correct answer">✓ Correct answer</span>}
              {st === 'bad' && <span aria-label="your answer, incorrect">✗ Your answer</span>}
              {submitted && showFeedback && st === 'ok' && selected === ch.id && <span className="sr-only" style={{ position: 'absolute', left: -9999 }}> (your answer)</span>}
            </button>
          );
        })}
      </div>

      {!submitted && <>
        <fieldset style={{ border: 'none', padding: 0, margin: '10px 0' }}>
          <legend style={{ ...S.small, marginBottom: 6 }}>How sure are you? (optional — helps separate lucky guesses from real understanding)</legend>
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
            {[['sure', 'Sure'], ['think', 'Think so'], ['guess', 'Guessing']].map(([v, l]) => (
              <button key={v} className="lp-focus" aria-pressed={confidence === v} onClick={() => setConfidence(confidence === v ? null : v)}
                style={{ ...S.btnGhost, padding: '6px 12px', borderColor: confidence === v ? C.accent : C.border, color: confidence === v ? C.accent : C.textSub }}>{l}</button>
            ))}
          </div>
        </fieldset>
        {allowHints && item.hints?.length > 0 && (
          <div style={{ margin: '8px 0' }} aria-live="polite">
            {item.hints.slice(0, hints).map((h, i) => <p key={i} style={{ ...S.p, fontSize: fz(14), background: C.surfaceHigh, padding: '8px 12px', borderRadius: 10 }}>💡 Hint {i + 1}: {h}</p>)}
            {hints < item.hints.length && <button className="lp-focus" style={S.btnGhost} onClick={() => setHints(h => h + 1)}>{hints === 0 ? 'Get a hint' : 'Another hint'} ({hints}/{item.hints.length})</button>}
          </div>
        )}
        {tutorAvailable('hint', { stage, submitted }) && (!item.hints?.length || hints >= item.hints.length) &&
          <TutorPanel {...{ C, S, item, lesson, engine, commit, stage, selected, confidence, hints, submitted: false, onHintUsed: () => setHints(h => h + 1) }} />}
        <button className="lp-focus" style={{ ...S.btn, marginTop: 6, opacity: selected ? 1 : 0.5, cursor: selected ? 'pointer' : 'not-allowed' }} disabled={!selected} onClick={submit} aria-disabled={!selected}>Submit answer</button>
        {!selected && <span style={{ ...S.small, marginLeft: 10 }}>Choose an answer to submit.</span>}
      </>}

      {submitted && showFeedback && (
        <div role="status" aria-live="polite" style={{ marginTop: 12, padding: 14, borderRadius: 12, border: `1px solid ${(correct ? C.success : C.danger)}55`, background: C.surfaceHigh }}>
          <p style={{ ...S.p, color: C.text, fontWeight: 700 }}>{correct ? '✓ Correct.' : `✗ Not quite. You chose (${selected}); the correct answer is (${key}).`}{correct && hints > 0 ? ' (with hints — counted as assisted)' : ''}{correct && confidence === 'guess' ? ' You marked this as a guess, so it does not count as independent evidence yet.' : ''}</p>
          <p style={S.p}><strong style={{ color: C.text }}>Why ({key}) works: </strong>{item.answer.rationale}</p>
          {!correct && item.answer.distractor_rationales?.[selected] && <p style={S.p}><strong style={{ color: C.text }}>Why ({selected}) fails: </strong>{item.answer.distractor_rationales[selected]}</p>}
          {misconception && <p style={S.p}><strong style={{ color: C.text }}>Likely pattern — {misconception.label}: </strong>{misconception.fix} {section && <a href={'#sec-' + section.id} style={{ color: C.accent }}>Review “{section.title}”</a>}</p>}
          <button className="lp-focus" style={{ ...S.btnGhost, padding: '6px 12px', marginBottom: 8 }} aria-expanded={showAll} onClick={() => setShowAll(v => !v)}>{showAll ? 'Hide' : 'Show'} every choice explained</button>
          {showAll && <ul style={{ paddingLeft: 18 }}>{item.content.choices.map(c => <li key={c.id} style={{ ...S.p, fontSize: fz(14) }}><strong style={{ color: C.text }}>({c.id})</strong> {c.id === key ? item.answer.rationale : (item.answer.distractor_rationales?.[c.id] || 'No explanation available for this choice.')}</li>)}</ul>}
          {errorRec && (
            <label style={{ display: 'block', ...S.small, margin: '6px 0 10px' }}>What went wrong? <span style={{ color: C.textSub }}>(our guess is pre-selected — change it if it does not fit)</span><br />
              <select className="lp-focus" value={errorRec.category} onChange={e => commit(en => ({ engine: updateErrorRecord(en, errorRec.id, { category: e.target.value }) }))}
                style={{ marginTop: 6, padding: '6px 8px', borderRadius: 8, background: C.surface, color: C.text, border: `1px solid ${C.border}`, maxWidth: '100%' }}>
                <option value="unclassified">Not sure</option>
                {ERROR_CATEGORIES.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
              </select>
            </label>
          )}
          <TutorPanel {...{ C, S, item, lesson, engine, commit, stage, selected, confidence, hints, submitted: true, correct }} />
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
            <button className="lp-focus" style={S.btn} onClick={onNext}>{nextLabel}</button>
            <button className="lp-focus" style={{ ...S.btnGhost, padding: '6px 12px' }} disabled={flagged} onClick={() => { setFlagged(true); commit(en => ({ engine: flagItem(en, { itemKey: item.itemId, skillId: lesson.skillId, source: item.source, reason: 'student_report' }) })); }}>{flagged ? 'Reported — thanks' : 'Report a problem with this question'}</button>
          </div>
        </div>
      )}
    </div>
  );
}

// Compact "Where am I / what next / why" card for the Home dashboard.
export function ContinueLearningCard({ user, theme: C, fonts: T, onGo }) {
  const S = styles(C, T);
  const engine = getEngine(user);
  const rec = recommendNext(engine, { lessonsById: LESSONS_BY_SKILL });
  const due = dueReviews(engine.reviews).totalDue;
  return (
    <section aria-label="Continue learning" style={{ ...S.card, marginBottom: 16, borderColor: C.accent + '66', background: `linear-gradient(135deg, ${C.accentSoft}, ${C.surface})` }}>
      <FocusStyles C={C} />
      <div style={{ fontSize: fz(12), fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase', color: C.accent, marginBottom: 4 }}>Your next step · about {rec.minutes} min{due ? ` · ${due} review${due > 1 ? 's' : ''} due` : ''}</div>
      <div style={{ fontSize: Math.round(18 * (globalThis.__LUMORA_FONT_SCALE__ || 1)), fontWeight: 700, color: C.text, marginBottom: 4 }}>{rec.title}</div>
      <p style={{ ...S.small, margin: '0 0 12px' }}>{rec.reason}</p>
      <button className="lp-focus" style={S.btn} onClick={onGo}>Continue learning →</button>
    </section>
  );
}

// ═════════════════════════════════════════════════════════════════════════════
// TUTOR PANEL — grounded explanations; never changes scores
// ═════════════════════════════════════════════════════════════════════════════
const MAX_TUTOR_CALLS_PER_QUESTION = 6;
function TutorPanel({ C, S, item, lesson, engine, commit, stage, selected, confidence, hints, submitted, correct, onHintUsed }) {
  const deps = useContext(AIContext);
  const [busy, setBusy] = useState(null);
  const [turns, setTurns] = useState([]);
  const [text, setText] = useState('');
  const [textMode, setTextMode] = useState(null);
  const calls = useRef(0);
  const modes = Object.keys(TUTOR_MODES).filter(m => tutorAvailable(m, { stage, submitted, correct }));
  if (!modes.length) return null;
  const recentErrorCategories = engine.errors.filter(e => e.skillId === lesson.skillId && !e.resolvedBy).slice(-3).map(e => e.category);

  const run = async (mode, studentText) => {
    if (busy || calls.current >= MAX_TUTOR_CALLS_PER_QUESTION) return;
    calls.current += 1; setBusy(mode);
    if (mode === 'hint') onHintUsed && onHintUsed(); // an AI hint is a hint: recorded on the attempt as assistance
    const req = buildTutorRequest({ mode, lesson, item, selected: submitted ? selected : null, confidence, hintsUsed: hints, studentText, recentErrorCategories });
    const r = await askTutor(req, { item, lesson, selected }, deps);
    commit(e => ({ engine: { ...e, genLog: [...(e.genLog || []), { kind: 'tutor', ...r.log }].slice(-50) } }));
    if (r.flagAmbiguous) commit(e => ({ engine: flagItem(e, { itemKey: item.itemId, skillId: lesson.skillId, source: item.source, reason: 'tutor_ambiguity' }) }));
    setTurns(t => [...t, { mode, studentText, ...r }]);
    setBusy(null); setText(''); setTextMode(null);
  };

  return (
    <div style={{ margin: '10px 0', padding: 12, borderRadius: 12, border: `1px dashed ${C.border}` }} aria-live="polite">
      <div style={{ ...S.small, fontWeight: 700, color: C.text, marginBottom: 6 }}>🐵 Ask Lex</div>
      {turns.map((t, i) => (
        <div key={i} style={{ marginBottom: 8 }}>
          {t.studentText && <p style={{ ...S.small, fontStyle: 'italic' }}>You: {t.studentText}</p>}
          <p style={{ ...S.p, fontSize: fz(14), background: C.surfaceHigh, padding: '8px 12px', borderRadius: 10, margin: 0 }}>
            {t.mode === 'hint' ? '💡 ' : ''}{t.reply}
          </p>
          {t.diagnosis && <p style={{ ...S.small, marginTop: 4 }}>Possible cause (a guess, not a verdict): {t.diagnosis}</p>}
          {t.sectionId && <a href={'#sec-' + t.sectionId} style={{ ...S.small, color: C.accent }}>Review “{lesson.sections.find(s => s.id === t.sectionId)?.title}”</a>}
          {t.flagAmbiguous && <p role="status" style={{ ...S.small, color: C.gold }}>Lex thinks this question may be ambiguous. It has been flagged for review and won’t count toward your mastery.</p>}
          {t.source === 'fallback' && <p style={{ ...S.small }}>(Lex is offline — showing the reviewed explanation.)</p>}
        </div>
      ))}
      {textMode ? (
        <form onSubmit={e => { e.preventDefault(); if (text.trim()) run(textMode, text.trim()); }}>
          <label style={{ ...S.small, display: 'block', marginBottom: 4 }}>{textMode === 'check_reasoning' ? 'Write your reasoning in a sentence or two:' : 'Your question:'}
            <textarea className="lp-focus" value={text} onChange={e => setText(e.target.value)} maxLength={800} rows={3}
              style={{ display: 'block', width: '100%', marginTop: 4, padding: 8, borderRadius: 8, border: `1px solid ${C.border}`, background: C.surface, color: C.text, fontFamily: 'inherit', fontSize: fz(14) }} />
          </label>
          <div style={{ display: 'flex', gap: 6 }}>
            <button className="lp-focus" type="submit" style={{ ...S.btnGhost, padding: '6px 12px', color: C.accent }} disabled={!!busy || !text.trim()}>{busy ? 'Thinking…' : 'Send'}</button>
            <button className="lp-focus" type="button" style={{ ...S.btnGhost, padding: '6px 12px' }} onClick={() => setTextMode(null)}>Cancel</button>
          </div>
        </form>
      ) : (
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
          {modes.map(m => (
            <button key={m} className="lp-focus" style={{ ...S.btnGhost, padding: '6px 12px' }} disabled={!!busy || calls.current >= MAX_TUTOR_CALLS_PER_QUESTION}
              onClick={() => TUTOR_MODES[m].needsText ? setTextMode(m) : run(m)}>
              {busy === m ? 'Thinking…' : TUTOR_MODES[m].label}
            </button>
          ))}
        </div>
      )}
      {calls.current >= MAX_TUTOR_CALLS_PER_QUESTION && <p style={S.small}>That’s the limit for this question — try the next one, or revisit the lesson section.</p>}
    </div>
  );
}
