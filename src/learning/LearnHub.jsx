// Learn: a guided curriculum view. Current objective + one Continue action at the top, then the
// path as modules (one expanded by default) of compact lesson rows. Descriptions, prerequisites,
// placement and extra drills live in the lesson detail view, not in the list.
import { useState } from 'react';
import { fz } from '../ui/scale.js';
import { Page, Panel, Eyebrow, Button, ProgressBar, StatusMark, Chip, Row, SectionTitle, UI_CSS } from '../ui/kit.jsx';
import { getEngine } from './store.js';
import { currentLearning, curriculumModules, reviewSummary, lessonStageProgress } from './navigation.js';
import { SKILL_BY_ID } from './skills.js';
import { LESSONS_BY_SKILL, CLASSIC_ROUTES } from './content/index.js';
import { STATE_LABELS } from './mastery.js';
import { prerequisitesMet } from './recommend.js';

const scaled = (n) => Math.round(n * (globalThis.__LUMORA_FONT_SCALE__ || 1));
const STATUS_TEXT = { done: 'Completed', review: 'Review due', started: 'In progress', todo: 'Not started', current: 'Up next' };

export function LearnHub({ user, theme: C, fonts: T, setOpen, canMix, onMixed }) {
  const engine = getEngine(user);
  const cur = currentLearning(engine);
  const modules = curriculumModules(engine, cur?.skill.id);
  const curMod = modules.find(m => m.hasCurrent) || modules[0];
  const [expanded, setExpanded] = useState(() => new Set(curMod ? [curMod.id] : []));
  const rev = reviewSummary(engine);
  const toggle = (id) => setExpanded(s => { const n = new Set(s); n.has(id) ? n.delete(id) : n.add(id); return n; });
  const openLesson = (skillId) => setOpen({ skillId, mode: 'lesson' });
  const openDetail = (skillId) => setOpen({ skillId, mode: 'detail' });

  return (
    <Page C={C} T={T} title="Learn" subtitle="A guided path from logic foundations to full LSAT reasoning.">
      <style>{UI_CSS(C)}</style>
      {cur && (
        <Panel C={C} tone="accent" aria-label="Current learning objective" style={{ padding: 22 }}>
          <Eyebrow C={C}>Current objective · {cur.module.title}</Eyebrow>
          <h2 className="lm-h" style={{ fontFamily: T.serif, fontSize: scaled(24), color: C.text, margin: '2px 0 6px' }}>{cur.lesson.title}</h2>
          <p style={{ color: C.textSub, fontSize: fz(16), lineHeight: 1.55, margin: '0 0 14px', maxWidth: 640 }}>{cur.lesson.objective}</p>
          <div style={{ display: 'flex', gap: 12, alignItems: 'center', flexWrap: 'wrap', marginBottom: 14 }}>
            <Button C={C} T={T} size="lg" onClick={() => openLesson(cur.skill.id)}>{cur.kind === 'continue' ? 'Continue learning' : 'Start lesson'} →</Button>
            {cur.progress.stage && <span style={{ fontSize: fz(14), color: C.textSub }}>Stage {Math.min(cur.progress.done + 1, cur.progress.total)} of {cur.progress.total}: {cur.progress.stageLabel}</span>}
          </div>
          {curMod && <div style={{ maxWidth: 460 }}>
            <div style={{ fontSize: fz(14), color: C.textSub, marginBottom: 6 }}>{curMod.title}: {curMod.completed} of {curMod.total} lessons complete</div>
            <ProgressBar C={C} value={curMod.completed} max={curMod.total} label={`${curMod.title} module progress`} />
          </div>}
        </Panel>
      )}

      {(rev.due > 0 || canMix) && (
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', margin: '4px 0 6px' }}>
          {rev.due > 0 && <Button C={C} T={T} variant="secondary" size="sm" onClick={() => setOpen({ skillId: rev.firstSkill?.id, mode: 'review' })}>↻ {rev.due} review{rev.due > 1 ? 's' : ''} due</Button>}
          {canMix && <Button C={C} T={T} variant="secondary" size="sm" onClick={onMixed}>Mixed review</Button>}
        </div>
      )}

      <SectionTitle C={C}>Learning path</SectionTitle>
      {modules.map((m, i) => {
        const open = expanded.has(m.id);
        return (
          <Panel key={m.id} C={C} style={{ padding: 0, overflow: 'hidden' }}>
            <h3 className="lm-h" style={{ margin: 0 }}>
              <button className="lp-focus" aria-expanded={open} aria-controls={'mod-' + m.id} onClick={() => toggle(m.id)}
                style={{ display: 'flex', alignItems: 'center', gap: 12, width: '100%', padding: '14px 16px', background: 'none', border: 'none', cursor: 'pointer', textAlign: 'left', font: 'inherit' }}>
                <span style={{ fontSize: fz(13), fontWeight: 800, color: C.textSub, minWidth: 22 }}>{i + 1}</span>
                <span style={{ flex: 1 }}>
                  <span style={{ display: 'block', color: C.text, fontWeight: 700, fontSize: fz(16) }}>{m.title}</span>
                  <span style={{ display: 'block', color: C.textSub, fontSize: fz(13), marginTop: 2, fontWeight: 400 }}>{m.completed} of {m.total} complete{m.hasCurrent ? ' · current module' : ''}</span>
                </span>
                <span style={{ width: 90 }} aria-hidden="true"><ProgressBar C={C} value={m.completed} max={m.total} height={4} /></span>
                <span aria-hidden="true" style={{ color: C.textSub, transform: open ? 'rotate(90deg)' : 'none', transition: 'transform .2s' }}>›</span>
              </button>
            </h3>
            {open && (
              <ol id={'mod-' + m.id} style={{ listStyle: 'none', margin: 0, padding: '0 8px 8px' }}>
                {m.lessons.map(l => {
                  const isCur = l.status === 'current';
                  return (
                    <li key={l.skill.id} style={{ display: 'flex', alignItems: 'center', gap: 8, borderRadius: 10, background: isCur ? C.accentSoft : 'transparent', border: `1px solid ${isCur ? C.accent + '55' : 'transparent'}` }}>
                      <Row C={C} current={false} mark={<StatusMark C={C} status={l.status} />}
                        title={l.lesson.title}
                        subtitle={isCur && l.progress.stageLabel ? `In progress · ${l.progress.stageLabel}` : l.status === 'todo' || isCur ? STATUS_TEXT[l.status] : `${STATUS_TEXT[l.status]} · ${STATE_LABELS[l.mastery]}`}
                        onClick={() => openDetail(l.skill.id)} ariaLabel={`${l.lesson.title} — ${STATUS_TEXT[l.status]}. Open details`}
                        trailing={isCur ? null : <span aria-hidden="true" style={{ color: C.textSub, fontSize: fz(18) }}>›</span>} />
                      {isCur && <Button C={C} T={T} size="sm" style={{ marginRight: 10, flex: '0 0 auto' }} onClick={() => openLesson(l.skill.id)} aria-label={`${l.progress.stage ? 'Resume' : 'Start'} ${l.lesson.title}`}>{l.progress.stage ? 'Resume' : 'Start'}</Button>}
                    </li>
                  );
                })}
              </ol>
            )}
          </Panel>
        );
      })}
    </Page>
  );
}

/** Lesson detail: description, objective, prerequisites, tracks, placement, related drills. */
export function LessonDetail({ user, theme: C, fonts: T, skillId, setOpen, onOpenDrill }) {
  const engine = getEngine(user);
  const skill = SKILL_BY_ID[skillId];
  const lesson = LESSONS_BY_SKILL[skillId];
  if (!skill || !lesson) return null;
  const prog = lessonStageProgress(engine, skillId);
  const m = engine.mastery?.[skillId];
  const lp = engine.lessons?.[lesson.id];
  const prereqs = skill.prerequisites.map(p => SKILL_BY_ID[p]).filter(Boolean);
  const ready = prerequisitesMet(skillId, engine.mastery || {});
  const drills = CLASSIC_ROUTES.filter(r => r.skillId === skillId);
  return (
    <Page C={C} T={T} width={760}>
      <style>{UI_CSS(C)}</style>
      <Button C={C} T={T} variant="ghost" size="sm" style={{ paddingLeft: 0, marginBottom: 8 }} onClick={() => setOpen(null)}>← Learning path</Button>
      <Eyebrow C={C}>Lesson · about {lesson.estMinutes || 20} min</Eyebrow>
      <h1 className="lm-h" style={{ fontFamily: T.serif, fontSize: scaled(28), color: C.text, margin: '0 0 8px' }}>{lesson.title}</h1>
      <p style={{ color: C.textSub, fontSize: fz(16), lineHeight: 1.6, margin: '0 0 6px' }}>{lesson.objective}</p>
      <p style={{ color: C.textSub, fontSize: fz(15), lineHeight: 1.6, margin: '0 0 16px' }}>{lesson.why}</p>
      <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'center', marginBottom: 18 }}>
        <Button C={C} T={T} size="lg" onClick={() => setOpen({ skillId, mode: 'lesson' })}>{prog.completed ? 'Open lesson' : prog.stage ? 'Resume lesson' : 'Start lesson'} →</Button>
        {lesson.placementItemIds?.length > 0 && lp?.placement !== 'tested_out' && !prog.completed &&
          <Button C={C} T={T} variant="secondary" onClick={() => setOpen({ skillId, mode: 'placement' })}>Take a placement check</Button>}
        {engine.reviews?.[skillId] && <Button C={C} T={T} variant="secondary" onClick={() => setOpen({ skillId, mode: 'review' })}>Review this skill</Button>}
      </div>
      <Panel C={C}>
        <dl style={{ display: 'grid', gridTemplateColumns: 'max-content 1fr', gap: '8px 16px', margin: 0, fontSize: fz(15) }}>
          <dt style={{ color: C.textSub }}>Status</dt><dd style={{ margin: 0, color: C.text }}>{prog.completed ? 'Completed' : prog.stage ? `In progress · ${prog.stageLabel} (${prog.done} of ${prog.total} stages)` : 'Not started'}</dd>
          <dt style={{ color: C.textSub }}>Mastery</dt><dd style={{ margin: 0, color: C.text }}>{STATE_LABELS[m?.state || 'not_started']}{m?.needsReview ? ' · needs review' : ''}</dd>
          {prereqs.length > 0 && <><dt style={{ color: C.textSub }}>Builds on</dt><dd style={{ margin: 0, color: C.text }}>{prereqs.map((p, i) => <span key={p.id}>{i ? ', ' : ''}<button className="lp-focus" onClick={() => setOpen({ skillId: p.id, mode: 'detail' })} style={{ background: 'none', border: 'none', color: C.accent, cursor: 'pointer', padding: 0, font: 'inherit' }}>{p.title}</button></span>)}{!ready && <span style={{ color: C.textSub }}> — recommended first, not required</span>}</dd></>}
          {lesson.tracks && <><dt style={{ color: C.textSub }}>Tracks</dt><dd style={{ margin: 0, display: 'flex', gap: 6, flexWrap: 'wrap' }}>{lesson.tracks.map(t => <button key={t.id} className="lp-focus" onClick={() => setOpen({ skillId, mode: 'lesson', track: t.id })} style={{ background: 'none', border: 'none', padding: 0, cursor: 'pointer' }}><Chip C={C} color={C.accent}>{t.title}</Chip></button>)}</dd></>}
        </dl>
        {m?.reasons?.length > 0 && <ul style={{ margin: '12px 0 0', paddingLeft: 18 }}>{m.reasons.map((r, i) => <li key={i} style={{ color: C.textSub, fontSize: fz(14), lineHeight: 1.55 }}>{r}</li>)}</ul>}
      </Panel>
      {drills.length > 0 && onOpenDrill && <Panel C={C} tone="quiet">
        <div style={{ color: C.text, fontWeight: 700, fontSize: fz(15), marginBottom: 4 }}>Extra practice</div>
        <p style={{ color: C.textSub, fontSize: fz(14), margin: '0 0 10px' }}>Question-type walkthroughs with four levels of drills.</p>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>{drills.map(d => <Button key={d.section + d.label} C={C} T={T} variant="secondary" size="sm" onClick={() => onOpenDrill(d.section, d.label)}>{d.label} drills{d.section === 'RC' && drills.some(x => x.section === 'LR') ? ' (RC)' : ''}</Button>)}</div>
      </Panel>}
    </Page>
  );
}
