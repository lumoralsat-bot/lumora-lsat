// Home: a learning-first dashboard. One dominant action (continue / start learning), then a compact
// path preview and a small review card. Practice tools, analytics and notes live on their own screens.
import { fz } from '../ui/scale.js';
import { Page, Panel, Eyebrow, Button, ProgressBar, StatusMark, Chip, Row, SectionTitle, UI_CSS } from '../ui/kit.jsx';
import { getEngine } from './store.js';
import { currentLearning, curriculumModules, reviewSummary } from './navigation.js';
import { buildDailyPlan } from './planner.js';
import { studyProfile } from './PlanPanel.jsx';
import { LESSONS_BY_SKILL } from './content/index.js';
import { STATE_LABELS } from './mastery.js';

const scaled = (n) => Math.round(n * (globalThis.__LUMORA_FONT_SCALE__ || 1));

export function HomeDashboard({ user, theme: C, fonts: T, onNavigate }) {
  const engine = getEngine(user);
  const cur = currentLearning(engine);
  const modules = curriculumModules(engine, cur?.skill.id);
  const mod = modules.find(m => m.hasCurrent) || modules[0];
  const rev = reviewSummary(engine);
  let plan = null; try { plan = buildDailyPlan(engine, studyProfile(user), { lessonsById: LESSONS_BY_SKILL }); } catch { plan = null; }
  const hour = new Date().getHours();
  const greeting = hour < 12 ? 'Good morning' : hour < 18 ? 'Good afternoon' : 'Good evening';
  const first = (user.name || '').split(' ')[0];
  const openLesson = (skillId, mode = 'lesson') => onNavigate('learn', { skillId, mode });
  // New students have nothing to review yet: keep the screen about starting.
  const showReview = rev.due > 0 || !!rev.nextDue || !(cur && cur.isNewStudent);

  // Preview: last finished lesson in the module, the current one, and the next two.
  const idx = mod ? Math.max(0, mod.lessons.findIndex(l => l.skill.id === cur?.skill.id)) : 0;
  const preview = mod ? mod.lessons.slice(Math.max(0, idx - 1), idx + 3) : [];

  return (
    <Page C={C} T={T} labelledBy="home-h">
      <style>{UI_CSS(C)}</style>
      <p style={{ color: C.textSub, fontSize: fz(15), margin: '0 0 14px' }}>{greeting}{first ? `, ${first}` : ''}.</p>

      {cur ? (
        <Panel C={C} tone="accent" aria-labelledby="home-h" style={{ padding: 22 }}>
          <Eyebrow C={C}>{cur.isNewStudent ? 'Start learning' : cur.kind === 'continue' ? 'Continue learning' : 'Up next'} · {cur.module.title}</Eyebrow>
          <h1 className="lm-h" id="home-h" style={{ fontFamily: T.serif, fontSize: scaled(28), color: C.text, margin: '2px 0 6px', lineHeight: 1.2 }}>{cur.lesson.title}</h1>
          <p style={{ color: C.textSub, fontSize: fz(16), lineHeight: 1.55, margin: '0 0 14px', maxWidth: 620 }}>{cur.isNewStudent ? cur.lesson.objective : cur.skill.summary}</p>
          {cur.progress.stage && <div style={{ maxWidth: 420, marginBottom: 14 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: fz(14), color: C.textSub, marginBottom: 6 }}>
              <span>Stage {Math.min(cur.progress.done + 1, cur.progress.total)} of {cur.progress.total}: <strong style={{ color: C.text }}>{cur.progress.stageLabel}</strong></span>
            </div>
            <ProgressBar C={C} value={cur.progress.done} max={cur.progress.total} label="Lesson progress" />
          </div>}
          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'center' }}>
            <Button C={C} T={T} size="lg" onClick={() => openLesson(cur.skill.id)}>
              {cur.kind === 'continue' ? 'Resume lesson' : cur.kind === 'practice' ? 'Practice this skill' : 'Start lesson'} →
            </Button>
            {cur.isNewStudent && cur.lesson.placementItemIds?.length > 0 &&
              <Button C={C} T={T} variant="secondary" onClick={() => openLesson(cur.skill.id, 'placement')}>Already know this? Take a placement check</Button>}
            <span style={{ fontSize: fz(14), color: C.textSub }}>About {cur.lesson.estMinutes || 20} min{!cur.isNewStudent ? ` · ${cur.mastery}` : ''}</span>
          </div>
        </Panel>
      ) : (
        <Panel C={C} tone="accent">
          <Eyebrow C={C}>Learning path complete</Eyebrow>
          <h1 className="lm-h" id="home-h" style={{ fontFamily: T.serif, fontSize: scaled(26), color: C.text, margin: '2px 0 8px' }}>Every lesson is finished</h1>
          <p style={{ color: C.textSub, fontSize: fz(16), margin: '0 0 14px' }}>Keep skills sharp with mixed review and timed practice.</p>
          <Button C={C} T={T} onClick={() => onNavigate('review')}>Go to review →</Button>
        </Panel>
      )}

      <div className="lm-grid-2" style={{ display: 'grid', gridTemplateColumns: showReview ? '1fr 1fr' : '1fr', gap: 12 }}>
        {showReview && <Panel C={C} style={{ marginBottom: 0 }} aria-label="Review">
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6 }}>
            <StatusMark C={C} status={rev.due ? 'review' : 'done'} size={20} />
            <strong style={{ color: C.text, fontSize: fz(16) }}>{rev.due ? `${rev.due} review${rev.due > 1 ? 's' : ''} due` : 'Reviews up to date'}</strong>
          </div>
          <p style={{ color: C.textSub, fontSize: fz(14), margin: '0 0 10px', lineHeight: 1.5 }}>
            {rev.due ? `A few minutes on ${rev.firstSkill?.title || 'earlier skills'} keeps it from fading.` : rev.nextDue ? `Next review ${new Date(rev.nextDue).toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' })}.` : 'Reviews are scheduled after you finish a lesson.'}
          </p>
          {rev.due > 0 && <Button C={C} T={T} variant="secondary" size="sm" onClick={() => onNavigate('review')}>Start review</Button>}
        </Panel>}
        <Panel C={C} style={{ marginBottom: 0 }} aria-label="Today’s plan">
          <div style={{ fontSize: fz(14), color: C.textSub, marginBottom: 4 }}>Today’s plan{plan && !plan.rest && plan.minutes ? ` · about ${plan.minutes} min` : ''}</div>
          <strong style={{ color: C.text, fontSize: fz(16), display: 'block', marginBottom: 10 }}>
            {!plan ? 'Set up your study plan' : plan.needsDateUpdate ? 'Update your test date' : plan.rest ? 'Rest day — nothing owed' : plan.primary?.title}
          </strong>
          <Button C={C} T={T} variant="ghost" size="sm" style={{ padding: 0 }} onClick={() => onNavigate('plan')}>Open study plan →</Button>
        </Panel>
      </div>

      {mod && <>
        <SectionTitle C={C} action={<Button C={C} T={T} variant="ghost" size="sm" onClick={() => onNavigate('learn')}>Full learning path →</Button>}>
          {mod.title} · {mod.completed} of {mod.total} lessons
        </SectionTitle>
        <Panel C={C} style={{ padding: 8 }}>
          {preview.map(l => (
            <Row key={l.skill.id} C={C} current={l.status === 'current'} mark={<StatusMark C={C} status={l.status} />}
              title={l.lesson.title}
              subtitle={l.status === 'current' ? (l.progress.stageLabel ? `In progress · ${l.progress.stageLabel}` : 'Next up') : l.status === 'todo' ? 'Not started' : STATE_LABELS[l.mastery]}
              onClick={() => openLesson(l.skill.id)} ariaLabel={`Open lesson: ${l.lesson.title}`}
              trailing={<span aria-hidden="true" style={{ color: C.textSub }}>›</span>} />
          ))}
        </Panel>
      </>}

      <Panel C={C} tone="quiet" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10, flexWrap: 'wrap', marginTop: 18 }}>
        <span style={{ color: C.textSub, fontSize: fz(14) }}>Extra practice — Quick 5, the daily challenge, timed sections, Flaw Lab and Writing — lives in Practice.</span>
        <Button C={C} T={T} variant="secondary" size="sm" onClick={() => onNavigate('practiceHub')}>Go to Practice</Button>
      </Panel>
    </Page>
  );
}
