// Practice: every optional practice mode in one place (moved off the Home screen).
import { useState } from 'react';
import { fz } from '../ui/scale.js';
import { Page, Panel, Button, Chip, Row, SectionTitle, Tabs, UI_CSS } from '../ui/kit.jsx';

export const PRACTICE_MODES = [
  { id: 'practice', icon: '🎯', title: 'Question generator', desc: 'Fresh questions by type and difficulty. Adapts to your weak spots.' },
  { id: 'quick5', icon: '⚡', title: 'Quick 5', desc: 'Five mixed questions, about 7 minutes.' },
  { id: 'daily', icon: '📅', title: 'Daily challenge', desc: 'The same challenge for everyone today, double XP.' },
  { id: 'fullsection', icon: '⏱', title: 'Timed section', desc: 'A full 35-minute section under test conditions.' },
  { id: 'flaw', icon: '⚖', title: 'Flaw Lab', desc: 'Find the hidden flaw in legal-style arguments.' },
  { id: 'writing', icon: '✍', title: 'LSAT Writing', desc: 'Argumentative writing practice with feedback.' },
];
const REVIEW_TOOLS = [
  { id: 'mistakes', icon: '❌', title: 'Practice mistakes', desc: 'Wrong answers from practice sessions, with Teach It Back.' },
  { id: 'srs', icon: '🔁', title: 'Question-type review', desc: 'Spaced review of the question types you practice.' },
];

export function PracticeHub({ theme: C, fonts: T, onNavigate, drillTypes = {}, onOpenDrill, isPro, drillProgress = {} }) {
  const sections = Object.keys(drillTypes);
  const [sec, setSec] = useState(sections[0]);
  const [showDrills, setShowDrills] = useState(false);
  const tile = (m) => (
    <button key={m.id} className="lp-focus lm-row" onClick={() => onNavigate(m.id)} aria-label={m.title}
      style={{ display: 'flex', gap: 12, alignItems: 'flex-start', textAlign: 'left', background: C.surface, border: `1px solid ${C.border}`, borderRadius: 14, padding: 16, cursor: 'pointer', font: 'inherit', width: '100%' }}>
      <span aria-hidden="true" style={{ fontSize: 22, lineHeight: 1 }}>{m.icon}</span>
      <span><span style={{ display: 'block', color: C.text, fontWeight: 700, fontSize: fz(16), marginBottom: 3 }}>{m.title}</span>
        <span style={{ display: 'block', color: C.textSub, fontSize: fz(14), lineHeight: 1.5 }}>{m.desc}</span></span>
    </button>
  );
  return (
    <Page C={C} T={T} title="Practice" subtitle="Optional extra practice. Your lessons and reviews come first — this is where you build speed and stamina.">
      <style>{UI_CSS(C)}</style>
      <div className="lm-grid-2" style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 12 }}>{PRACTICE_MODES.map(tile)}</div>

      {sections.length > 0 && <>
        <SectionTitle C={C} action={<Button C={C} T={T} variant="ghost" size="sm" aria-expanded={showDrills} onClick={() => setShowDrills(v => !v)}>{showDrills ? 'Hide' : 'Show all'}</Button>}>Question-type drills</SectionTitle>
        <p style={{ color: C.textSub, fontSize: fz(14), margin: '-4px 0 10px' }}>A walkthrough of each LSAT question type with four levels of drills.</p>
        {showDrills && <Panel C={C} style={{ padding: 10 }}>
          <Tabs C={C} T={T} label="Section" tabs={sections.map(s => ({ id: s, label: s }))} value={sec} onChange={setSec} />
          <ul style={{ listStyle: 'none', margin: 0, padding: 0 }} role="tabpanel" id={'panel-' + sec} aria-labelledby={'tab-' + sec}>
            {(drillTypes[sec] || []).map((t, i) => {
              const locked = !isPro && i > 0; const lvl = drillProgress[t.type] || 0;
              return <li key={t.type}><Row C={C} title={t.type} subtitle={t.tagline}
                onClick={() => onOpenDrill(sec, t.type)} ariaLabel={`${t.type} drills${locked ? ' (Pro)' : ''}`}
                mark={<span aria-hidden="true" style={{ width: 22, textAlign: 'center', color: C.textSub }}>{lvl >= 4 ? '✓' : '•'}</span>}
                trailing={locked ? <Chip C={C} color={C.gold}>Pro</Chip> : lvl > 0 ? <span style={{ fontSize: fz(13), color: C.textSub, whiteSpace: 'nowrap' }}>Level {Math.min(lvl, 4)} of 4</span> : null} /></li>;
            })}
          </ul>
        </Panel>}
      </>}

      <SectionTitle C={C}>Review your practice</SectionTitle>
      <div className="lm-grid-2" style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 12 }}>{REVIEW_TOOLS.map(tile)}</div>
    </Page>
  );
}
