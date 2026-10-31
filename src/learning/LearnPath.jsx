// Guided learning path UI: skill tree, recommendation, lesson player (Learn → Recognize → Apply →
// Challenge → Mastery check), placement (test-out), and spaced review.
// Business rules live in the pure modules next to this file; this component only renders state and
// dispatches events. Mastery is never decided here.
import { useState, useRef, useMemo, useEffect } from 'react';
import { BRANCHES, SKILLS, SKILL_BY_ID } from './skills.js';
import { LESSON_NS, TAG_TO_ERROR_CATEGORY, TAG_TO_SECTION } from './content/necessarySufficient.js';
import { STATE_LABELS } from './mastery.js';
import { STAGE_LABELS, PLAYABLE_STAGES, recognizeCheckpoint, applyCheckpoint, challengeOutcome, placementOutcome } from './lessonEngine.js';
import { getEngine, engineUpdate, recordAttempt, lessonEvent, newId, flagItem, updateErrorRecord, logGeneration } from './store.js';
import { recommendNext, prerequisitesMet } from './recommend.js';
import { dueReviews } from './review.js';
import { generateSkillQuestion, authoredToServable, pickAuthored } from './practiceEngine.js';
import { LESSON_POLICY } from './config.js';

export const LESSONS_BY_SKILL = { [LESSON_NS.skillId]: LESSON_NS };

const STATE_ICON = { not_started: '○', learning: '◔', practicing: '◑', developing: '◕', proficient: '●', mastered: '★' };
const ERROR_CATEGORIES = [
  ['conceptual', 'Conceptual misunderstanding'], ['structure', 'Misidentified conclusion or structure'],
  ['conditional_translation', 'Conditional translation error'], ['scope_quantifier', 'Scope or quantifier misread'],
  ['causal', 'Causal reasoning error'], ['unsupported_inference', 'Unsupported inference / overstatement'],
  ['distractor_attraction', 'Attracted to a wrong answer without comparing'], ['misread_stem', 'Misread the question stem'],
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

function styles(C, T) {
  return {
    card: { background: C.surface, border: `1px solid ${C.border}`, borderRadius: 16, padding: 20 },
    h1: { fontFamily: T.serif, color: C.text, margin: '0 0 6px' },
    h2: { fontFamily: T.serif, color: C.text, margin: '0 0 10px', fontSize: 19 },
    p: { color: C.textSub, lineHeight: 1.65, margin: '0 0 10px', fontSize: 15 },
    small: { color: C.textSub, fontSize: 13, lineHeight: 1.5 },
    btn: { background: 'linear-gradient(135deg,#3a6bff,#6a9fff)', color: '#fff', border: 'none', borderRadius: 12, padding: '11px 20px', fontSize: 14, fontWeight: 700, cursor: 'pointer', fontFamily: T.sans },
    btnGhost: { background: 'transparent', color: C.textSub, border: `1px solid ${C.border}`, borderRadius: 10, padding: '9px 16px', fontSize: 13, cursor: 'pointer', fontFamily: T.sans },
    tag: (color) => ({ display: 'inline-block', fontSize: 12, fontWeight: 700, color, background: color + '1f', border: `1px solid ${color}44`, borderRadius: 8, padding: '2px 8px' }),
  };
}

function FocusStyles({ C }) {
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
    if (open.mode === 'placement') return <PlacementSession {...{ user, onUpdateUser, C, T, lesson, onDone: back }} />;
    if (open.mode === 'review') return <ReviewSession {...{ user, onUpdateUser, C, T, lesson, deps, onDone: back }} />;
    return <LessonPlayer {...{ user, onUpdateUser, C, T, lesson, deps, onBack: back }} />;
  }

  const act = (r) => {
    if (r.kind === 'review') setOpen({ skillId: r.skillId, mode: 'review' });
    else if (r.kind === 'mixed') onMixedPractice && onMixedPractice();
    else if (r.skillId) setOpen({ skillId: r.skillId, mode: 'lesson' });
  };

  return (
    <section aria-labelledby="gp-title" style={{ marginBottom: 28 }}>
      <FocusStyles C={C} />
      <h2 id="gp-title" style={{ ...S.h1, fontSize: 22 }}>Your learning path</h2>
      <p style={S.small}>Learn a skill, recognize it, apply it with support, then prove it on your own. New questions are generated for you along the way.</p>

      <div style={{ ...S.card, marginTop: 14, borderColor: C.accent + '66', background: `linear-gradient(135deg, ${C.accentSoft}, ${C.surface})` }}>
        <div style={{ fontSize: 12, fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase', color: C.accent, marginBottom: 6 }}>Recommended next · about {rec.minutes} min</div>
        <div style={{ fontSize: 18, fontWeight: 700, color: C.text, marginBottom: 6 }}>{rec.title}</div>
        <p style={{ ...S.p, fontSize: 14 }}><strong style={{ color: C.text }}>Why: </strong>{rec.reason}</p>
        <button className="lp-focus" style={S.btn} onClick={() => act(rec)}>{rec.kind === 'review' ? 'Start review' : rec.title.startsWith('Continue') ? 'Continue learning' : 'Start'}</button>
      </div>

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
              <h3 style={{ fontSize: 13, color: C.textSub, textTransform: 'uppercase', letterSpacing: '0.08em', margin: '0 0 8px' }}>{b.title}</h3>
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
  const full = s.lesson === 'full';
  const legacy = s.lesson && s.lesson.startsWith('legacy:') ? s.lesson.split(':') : null;
  const prereqOk = prerequisitesMet(s.id, engine.mastery);
  const prereqNames = s.prerequisites.map(p => SKILL_BY_ID[p]?.title).filter(Boolean);
  const label = full ? `${STATE_ICON[st]} ${STATE_LABELS[st]}${m?.needsReview ? ' · needs review' : ''}` : legacy ? 'Classic lesson' : 'Coming soon';
  const color = !full ? C.textSub : st === 'mastered' ? C.gold : st === 'proficient' ? C.success : st === 'not_started' ? C.textSub : C.accent;
  return (
    <li style={{ ...S.card, padding: 14, borderRadius: 12, opacity: s.lesson ? 1 : 0.65 }}>
      <div style={{ fontWeight: 700, color: C.text, fontSize: 14, marginBottom: 4 }}>{s.title}</div>
      <div style={{ ...S.small, marginBottom: 8 }}>{s.summary}</div>
      <div style={{ fontSize: 12, color, fontWeight: 600, marginBottom: 8 }} aria-label={`Status: ${label}`}>{label}</div>
      {prereqNames.length > 0 && <div style={{ fontSize: 12, color: C.textSub, marginBottom: 8 }}>{prereqOk ? 'Builds on' : 'Recommended first'}: {prereqNames.join(', ')}</div>}
      {full && (
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
          <button className="lp-focus" style={{ ...S.btnGhost, padding: '6px 12px', color: C.accent, borderColor: C.accent + '66' }} onClick={() => onOpen({ skillId: s.id, mode: 'lesson' })} aria-label={`Open lesson: ${s.title}`}>Open</button>
          {engine.lessons[LESSON_NS.id]?.placement !== 'tested_out' && <button className="lp-focus" style={{ ...S.btnGhost, padding: '6px 12px' }} onClick={() => onOpen({ skillId: s.id, mode: 'placement' })} aria-label={`Test out of ${s.title}`}>Test out</button>}
        </div>
      )}
      {legacy && <button className="lp-focus" style={{ ...S.btnGhost, padding: '6px 12px' }} onClick={() => onOpenLegacy && onOpenLegacy(legacy[1] === 'RC' ? 'Reading Comprehension' : 'Logical Reasoning', legacy.slice(2).join(':'))}>Open classic lesson</button>}
      {!s.lesson && <span style={{ fontSize: 12, color: C.textSub }}>Lesson in development</span>}
    </li>
  );
}

// ═════════════════════════════════════════════════════════════════════════════
// LESSON PLAYER
// ═════════════════════════════════════════════════════════════════════════════
function LessonPlayer({ user, onUpdateUser, C, T, lesson, deps, onBack }) {
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
        <button className="lp-focus" onClick={onBack} style={{ background: 'none', border: 'none', color: C.accent, cursor: 'pointer', padding: 0, fontSize: 13 }}>Learn</button>
        <span aria-hidden="true"> › </span>{BRANCHES.find(b => b.id === SKILL_BY_ID[lesson.skillId].branch)?.title}<span aria-hidden="true"> › </span><span aria-current="page">{lesson.title}</span>
      </nav>
      <h1 ref={topRef} tabIndex={-1} style={{ ...S.h1, fontSize: 26, outline: 'none' }}>{lesson.title}</h1>
      <p style={S.small}>{lesson.objective}</p>

      <ol aria-label="Lesson stages" style={{ display: 'flex', gap: 6, listStyle: 'none', padding: 0, margin: '16px 0 20px', flexWrap: 'wrap' }}>
        {PLAYABLE_STAGES.map((st, i) => {
          const done = completed.includes(st); const isCur = current === st || (current === 'not_started' && st === 'learn'); const reachable = done || isCur;
          return (
            <li key={st} style={{ flex: '1 1 120px' }}>
              <button className="lp-focus" disabled={!reachable} onClick={() => setView(isCur ? null : st)} aria-current={shown === st ? 'step' : undefined}
                style={{ width: '100%', textAlign: 'left', padding: '8px 10px', borderRadius: 10, cursor: reachable ? 'pointer' : 'not-allowed', fontFamily: T.sans, fontSize: 13,
                  border: `1.5px solid ${shown === st ? C.accent : C.border}`, background: shown === st ? C.accentSoft : 'transparent', color: reachable ? C.text : C.textSub, opacity: reachable ? 1 : 0.6 }}>
                <span aria-hidden="true">{done ? '✓' : i + 1}</span> {STAGE_LABELS[st]}<span className="sr-only" style={{ position: 'absolute', left: -9999 }}>{done ? ' (completed)' : isCur ? ' (current)' : ' (locked until earlier stages are done)'}</span>
              </button>
            </li>
          );
        })}
      </ol>

      {progress?.remediation && !view && <div role="status" style={{ ...S.card, padding: 12, marginBottom: 14, borderColor: C.gold + '88' }}><span style={S.small}>↩ Revisiting {STAGE_LABELS[progress.remediation.toStage]}: {progress.remediation.reason}</span></div>}

      {current === 'completed' && !view && <LessonComplete {...{ engine, lesson, C, S, onBack, onReplay: (st) => setView(st) }} />}
      {shown === 'learn' && (current !== 'completed' || view) && <LearnStage {...{ lesson, C, S, T, engine, commit, replay: completed.includes('learn'), onComplete: () => completeStage('learn') }} />}
      {shown === 'recognize' && (current !== 'completed' || view) && <ItemStage key={'rec' + (progress?.stageEpoch?.recognize || '')} {...{ lesson, C, S, T, commit, engine, stage: 'recognize', attempts: stageAttempts('recognize'), allowHints: false, replay: completed.includes('recognize'),
        intro: 'Spot the rule before solving full questions. Translate each statement into a one-way rule.',
        evaluate: (atts) => { const r = recognizeCheckpoint(atts); return { passed: r.passed, msg: `${r.correct} of your last ${r.window} correct (need ${r.needed} of ${LESSON_POLICY.recognize.window}).` }; },
        onComplete: () => completeStage('recognize') }} />}
      {shown === 'apply' && (current !== 'completed' || view) && <ItemStage key={'app' + (progress?.stageEpoch?.apply || '')} {...{ lesson, C, S, T, commit, engine, stage: 'apply', attempts: stageAttempts('apply'), allowHints: true, replay: completed.includes('apply'),
        intro: 'Guided practice. Hints are available — using one is fine, and it is recorded so we know which wins were independent.',
        evaluate: (atts) => { const r = applyCheckpoint(atts); return { passed: r.passed, msg: `${r.correct} correct (need ${r.needed}). Hints used: ${r.hintsUsed}.` }; },
        onComplete: () => completeStage('apply') }} />}
      {shown === 'challenge' && (current !== 'completed' || view) && <ChallengeStage key={'ch' + (progress?.stageEpoch?.challenge || '')} {...{ lesson, C, S, T, commit, engine, deps, attempts: stageAttempts('challenge'), replay: completed.includes('challenge'), onComplete: () => completeStage('challenge'), onRemediate: () => remediate('apply', 'Your independent challenge answers suggest the contrapositive needs another guided pass.') }} />}
      {shown === 'mastery_check' && (current !== 'completed' || view) && <MasteryCheckStage {...{ lesson, C, S, T, commit, engine, deps, attempts: stageAttempts('mastery_check'), replay: completed.includes('mastery_check'), onComplete: () => completeStage('mastery_check') }} />}
    </main>
  );
}

function LearnStage({ lesson, C, S, T, engine, commit, replay, onComplete }) {
  const checkpoint = lesson.items.find(i => i.stage === 'learn');
  const answered = engine.attempts.some(a => a.lessonId === lesson.id && a.stage === 'learn');
  const [done, setDone] = useState(false);
  useEffect(() => { if (done && !replay) onComplete(); }, [done]); // eslint-disable-line
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
          {sec.diagram && <pre style={{ background: C.surfaceHigh, color: C.text, padding: '10px 14px', borderRadius: 10, fontSize: 15, overflowX: 'auto', margin: '6px 0' }}>{sec.diagram}</pre>}
          {sec.table && (
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 14, color: C.text }}>
                <thead><tr><th scope="col" style={{ textAlign: 'left', padding: 8, borderBottom: `1px solid ${C.border}`, color: C.textSub }}>Statement</th><th scope="col" style={{ textAlign: 'left', padding: 8, borderBottom: `1px solid ${C.border}`, color: C.textSub }}>Rule</th></tr></thead>
                <tbody>{sec.table.map(([a, b], i) => <tr key={i}><td style={{ padding: 8, borderBottom: `1px solid ${C.border}` }}>{a}</td><td style={{ padding: 8, borderBottom: `1px solid ${C.border}`, fontFamily: 'ui-monospace,monospace' }}>{b}</td></tr>)}</tbody>
              </table>
            </div>
          )}
          {sec.note && <p style={{ ...S.p, marginTop: 10, fontSize: 14 }}><strong style={{ color: C.text }}>Key: </strong>{sec.note}</p>}
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
      <section aria-labelledby="cp-h">
        <h2 id="cp-h" style={S.h2}>Quick check</h2>
        {!done && !(replay && answered) && (
          <QuestionCard {...{ C, S, T, item: authoredToServable(checkpoint), stage: 'learn', lesson, commit, engine, allowHints: false, onNext: () => setDone(true), nextLabel: replay ? 'Done' : 'Continue to Recognize →' }} />
        )}
        {(done || (replay && answered)) && <div style={S.card}><p style={S.p}>Checkpoint answered.{replay ? ' You can re-read anything above.' : ''}</p></div>}
        {!replay && answered && !done && <p style={{ ...S.small, marginTop: 8 }}>You answered this checkpoint last time. <button className="lp-focus" style={{ ...S.btnGhost, padding: '4px 10px' }} onClick={onComplete}>Skip to Recognize →</button></p>}
      </section>
    </div>
  );
}

function ItemStage({ lesson, C, S, T, commit, engine, stage, attempts, allowHints, intro, evaluate, onComplete, replay }) {
  const seen = new Set(attempts.map(a => a.itemId));
  const pool = lesson.items.filter(i => i.stage === stage);
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
        <p style={S.p}>You have seen every {STAGE_LABELS[stage].toLowerCase()} item once. Re-read <a href="#sec-translate" style={{ color: C.accent }}>Translating everyday language</a> and <a href="#sec-errors" style={{ color: C.accent }}>Two tempting errors</a> in the Learn stage, then try the items again — they come back in a new order.</p>
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
          <p style={S.p}>That is below the level where moving on usually helps. One more guided pass on applying the contrapositive is the smallest useful step.</p>
          {!replay && <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}><button className="lp-focus" style={S.btn} onClick={onRemediate}>Back to guided practice</button><button className="lp-focus" style={S.btnGhost} onClick={onComplete}>Continue to mastery check anyway</button></div>}
        </> : !replay && <button className="lp-focus" style={S.btn} onClick={onComplete}>Continue to Mastery check →</button>}
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
      <h1 style={{ ...S.h1, fontSize: 24 }}>Test out: {lesson.title}</h1>
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

function ReviewSession({ user, onUpdateUser, C, T, lesson, deps, onDone }) {
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
      <h1 style={{ ...S.h1, fontSize: 24 }}>Review: {lesson.title}</h1>
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
  const section = tag ? lesson.sections.find(s => s.id === TAG_TO_SECTION[tag]) : null;
  const errorRec = submitted && !correct ? engine.errors.find(e => e.attemptId === attemptId) : null;

  const submit = () => {
    if (!selected || submitted) return;
    setSubmitted(true);
    const attempt = {
      id: attemptId, ts: Date.now(), skillId: lesson.skillId, lessonId: lesson.id, lessonVersion: lesson.version, stage,
      itemId: item.itemId, source: item.source, fingerprint: item.fingerprint, difficulty: item.difficulty,
      selected, correctChoice: key, correct: selected === key, confidence, hintsUsed: hints, revealed: false,
      timeMs: Date.now() - startedAt, scorable: item.scorable !== false && stage !== 'learn' && stage !== 'recognize',
      errorTag: tag || null, errorCategory: tag ? TAG_TO_ERROR_CATEGORY[tag] : (selected !== key && confidence === 'guess' ? 'guess' : null),
      remediationSection: section?.id || null, ...extra,
    };
    commit(e => recordAttempt(e, attempt));
    if (!showFeedback) setTimeout(onNext, 0);
  };

  const choiceState = (id) => !submitted || !showFeedback ? (selected === id ? 'sel' : 'def') : id === key ? 'ok' : id === selected ? 'bad' : 'def';
  const border = { def: C.border, sel: C.accent, ok: C.success, bad: C.danger };
  const bg = { def: 'transparent', sel: C.accentSoft, ok: C.success + '18', bad: C.danger + '14' };

  return (
    <div style={{ ...S.card }}>
      <p style={{ ...S.p, color: C.text, fontSize: 16, fontFamily: T.serif }}>{item.content.stimulus}</p>
      <p style={{ ...S.p, color: C.text, fontWeight: 700 }} id={'stem-' + attemptId}>{item.content.stem}</p>
      <div role="radiogroup" aria-labelledby={'stem-' + attemptId}>
        {item.content.choices.map(ch => {
          const st = choiceState(ch.id);
          return (
            <button key={ch.id} role="radio" aria-checked={selected === ch.id} disabled={submitted} className="lp-focus lp-choice"
              onClick={() => setSelected(ch.id)}
              style={{ display: 'flex', gap: 10, width: '100%', textAlign: 'left', border: `1.5px solid ${border[st]}`, background: bg[st], color: C.text, borderRadius: 12, padding: '11px 14px', marginBottom: 8, cursor: submitted ? 'default' : 'pointer', fontSize: 15, lineHeight: 1.5, fontFamily: T.sans }}>
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
            {item.hints.slice(0, hints).map((h, i) => <p key={i} style={{ ...S.p, fontSize: 14, background: C.surfaceHigh, padding: '8px 12px', borderRadius: 10 }}>💡 Hint {i + 1}: {h}</p>)}
            {hints < item.hints.length && <button className="lp-focus" style={S.btnGhost} onClick={() => setHints(h => h + 1)}>{hints === 0 ? 'Get a hint' : 'Another hint'} ({hints}/{item.hints.length})</button>}
          </div>
        )}
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
          {showAll && <ul style={{ paddingLeft: 18 }}>{item.content.choices.map(c => <li key={c.id} style={{ ...S.p, fontSize: 14 }}><strong style={{ color: C.text }}>({c.id})</strong> {c.id === key ? item.answer.rationale : (item.answer.distractor_rationales?.[c.id] || 'No explanation available for this choice.')}</li>)}</ul>}
          {errorRec && (
            <label style={{ display: 'block', ...S.small, margin: '6px 0 10px' }}>What went wrong? <span style={{ color: C.textSub }}>(our guess is pre-selected — change it if it does not fit)</span><br />
              <select className="lp-focus" value={errorRec.category} onChange={e => commit(en => ({ engine: updateErrorRecord(en, errorRec.id, { category: e.target.value }) }))}
                style={{ marginTop: 6, padding: '6px 8px', borderRadius: 8, background: C.surface, color: C.text, border: `1px solid ${C.border}`, maxWidth: '100%' }}>
                <option value="unclassified">Not sure</option>
                {ERROR_CATEGORIES.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
              </select>
            </label>
          )}
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
      <div style={{ fontSize: 12, fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase', color: C.accent, marginBottom: 4 }}>Your next step · about {rec.minutes} min{due ? ` · ${due} review${due > 1 ? 's' : ''} due` : ''}</div>
      <div style={{ fontSize: 18, fontWeight: 700, color: C.text, marginBottom: 4 }}>{rec.title}</div>
      <p style={{ ...S.small, margin: '0 0 12px' }}>{rec.reason}</p>
      <button className="lp-focus" style={S.btn} onClick={onGo}>Continue learning →</button>
    </section>
  );
}
