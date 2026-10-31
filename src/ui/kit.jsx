// Lumora design system: shared layout and control primitives for the main screens.
// Presentation only — no educational state. Every component takes the active theme (C) and fonts (T)
// so light/dark mode and the A+/A- text scale apply consistently.
import { fz } from './scale.js';

export const LAYOUT = { page: 880, reading: 760, gutter: 20, gap: 12, radius: 14 };
const scaled = (n) => Math.round(n * (globalThis.__LUMORA_FONT_SCALE__ || 1));

/** Page shell: one width, one padding, one heading style for every top-level screen. */
export function Page({ C, T, title, subtitle, actions, children, width = LAYOUT.page, labelledBy }) {
  const id = labelledBy || (title ? 'pg-' + String(title).toLowerCase().replace(/[^a-z]+/g, '-') : undefined);
  return (
    <main aria-labelledby={id} className="lm-page" style={{ maxWidth: width, margin: '0 auto', padding: `28px ${LAYOUT.gutter}px 48px` }}>
      {(title || actions) && (
        <header style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap', marginBottom: 18 }}>
          <div>
            {title && <h1 className="lm-h" id={id} style={{ fontFamily: T.serif, fontSize: scaled(28), color: C.text, margin: 0, lineHeight: 1.2 }}>{title}</h1>}
            {subtitle && <p style={{ color: C.textSub, fontSize: fz(15), lineHeight: 1.55, margin: '6px 0 0' }}>{subtitle}</p>}
          </div>
          {actions}
        </header>
      )}
      {children}
    </main>
  );
}

/** Flat panel. `tone` = 'default' | 'accent' (the one primary panel on a screen) | 'quiet'. */
export function Panel({ C, tone = 'default', children, style, as: As = 'section', ...rest }) {
  const tones = {
    default: { background: C.surface, border: `1px solid ${C.border}` },
    accent: { background: `linear-gradient(135deg, ${C.accentSoft}, ${C.surface} 70%)`, border: `1px solid ${C.accent}66` },
    quiet: { background: 'transparent', border: `1px solid ${C.border}` },
  };
  return <As {...rest} style={{ ...tones[tone], borderRadius: LAYOUT.radius, padding: 18, marginBottom: LAYOUT.gap, ...style }}>{children}</As>;
}

export function SectionTitle({ C, children, action, id }) {
  return (
    <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: 10, margin: '22px 0 10px' }}>
      <h2 className="lm-h" id={id} style={{ fontSize: fz(13), fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: C.textSub, margin: 0 }}>{children}</h2>
      {action}
    </div>
  );
}

export function Eyebrow({ C, children, color }) {
  return <div style={{ fontSize: fz(12), fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: color || C.accent, marginBottom: 6 }}>{children}</div>;
}

/** Buttons: exactly one `primary` per view. */
export function Button({ C, T, variant = 'primary', size = 'md', children, style, ...rest }) {
  const pad = size === 'sm' ? '7px 14px' : size === 'lg' ? '13px 26px' : '10px 20px';
  const fs = size === 'sm' ? fz(14) : size === 'lg' ? fz(16) : fz(15);
  const v = {
    primary: { background: C.accent, color: '#fff', border: `1px solid ${C.accent}` },
    secondary: { background: 'transparent', color: C.text, border: `1px solid ${C.border}` },
    ghost: { background: 'transparent', color: C.accent, border: '1px solid transparent' },
  }[variant];
  return <button className="lp-focus lm-btn" {...rest} style={{ ...v, padding: pad, fontSize: fs, fontWeight: 700, borderRadius: 10, cursor: rest.disabled ? 'not-allowed' : 'pointer', opacity: rest.disabled ? 0.5 : 1, fontFamily: T?.sans, lineHeight: 1.2, ...style }}>{children}</button>;
}

export function ProgressBar({ C, value, max = 1, label, height = 6, color }) {
  const pct = Math.max(0, Math.min(100, max ? (value / max) * 100 : 0));
  return (
    <div role="progressbar" aria-label={label} aria-valuemin={0} aria-valuemax={max} aria-valuenow={value} style={{ height, background: C.surfaceHigh, borderRadius: height, overflow: 'hidden' }}>
      <div style={{ width: pct + '%', height: '100%', background: color || C.accent, borderRadius: height, transition: 'width .4s' }} />
    </div>
  );
}

/** Status: 'done' | 'current' | 'review' | 'started' | 'todo'. Shape + text, never color alone. */
export function StatusMark({ C, status, size = 22 }) {
  const map = {
    done: { ch: '✓', bg: C.success, fg: '#04140e', label: 'Completed' },
    current: { ch: '▶', bg: C.accent, fg: '#fff', label: 'Current' },
    review: { ch: '↻', bg: C.gold, fg: '#231a00', label: 'Review due' },
    started: { ch: '◐', bg: C.surfaceHigh, fg: C.accent, label: 'In progress' },
    todo: { ch: '', bg: 'transparent', fg: C.textSub, label: 'Not started' },
  }[status] || {};
  return <span role="img" aria-label={map.label} style={{ width: size, height: size, flex: `0 0 ${size}px`, borderRadius: '50%', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontSize: Math.round(size * 0.5), fontWeight: 800, background: map.bg, color: map.fg, border: status === 'todo' ? `2px solid ${C.border}` : 'none' }}>{map.ch}</span>;
}

export function Chip({ C, children, color }) {
  const c = color || C.textSub;
  return <span style={{ display: 'inline-block', fontSize: fz(12), fontWeight: 700, color: c, background: c + '1f', border: `1px solid ${c}44`, padding: '2px 9px', borderRadius: 999, whiteSpace: 'nowrap' }}>{children}</span>;
}

/** Accessible tab bar (roving buttons; content rendered by caller). */
export function Tabs({ C, T, tabs, value, onChange, label }) {
  return (
    <div role="tablist" aria-label={label} className="lm-tabs" style={{ display: 'flex', gap: 4, borderBottom: `1px solid ${C.border}`, marginBottom: 18, overflowX: 'auto' }}>
      {tabs.map(t => (
        <button key={t.id} role="tab" id={'tab-' + t.id} aria-selected={value === t.id} aria-controls={'panel-' + t.id} className="lp-focus"
          onClick={() => onChange(t.id)}
          style={{ background: 'none', border: 'none', borderBottom: `2px solid ${value === t.id ? C.accent : 'transparent'}`, color: value === t.id ? C.text : C.textSub, fontWeight: value === t.id ? 700 : 500, fontSize: fz(15), padding: '10px 12px', cursor: 'pointer', whiteSpace: 'nowrap', fontFamily: T?.sans, marginBottom: -1 }}>
          {t.label}
        </button>
      ))}
    </div>
  );
}

/** Stat tile for small numeric summaries. Shows a dash with a reason when data is too thin. */
export function Stat({ C, T, label, value, note }) {
  return (
    <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 12, padding: '12px 14px', minWidth: 0 }}>
      <div style={{ fontSize: fz(13), color: C.textSub, marginBottom: 4 }}>{label}</div>
      <div style={{ fontSize: scaled(22), fontWeight: 800, color: C.text, fontFamily: T?.serif, lineHeight: 1.1 }}>{value}</div>
      {note && <div style={{ fontSize: fz(12), color: C.textSub, marginTop: 4 }}>{note}</div>}
    </div>
  );
}

/** A compact list row with a leading mark, title/subtitle, and one trailing action. */
export function Row({ C, mark, title, subtitle, trailing, onClick, current, ariaLabel }) {
  const Inner = (
    <>
      {mark}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ color: C.text, fontWeight: current ? 700 : 600, fontSize: fz(15), lineHeight: 1.35 }}>{title}</div>
        {subtitle && <div style={{ color: C.textSub, fontSize: fz(13), marginTop: 2 }}>{subtitle}</div>}
      </div>
      {trailing}
    </>
  );
  const style = { display: 'flex', alignItems: 'center', gap: 12, padding: '11px 12px', borderRadius: 10, background: current ? C.accentSoft : 'transparent', border: `1px solid ${current ? C.accent + '55' : 'transparent'}`, width: '100%', textAlign: 'left' };
  return onClick
    ? <button className="lp-focus lm-row" aria-label={ariaLabel} onClick={onClick} style={{ ...style, cursor: 'pointer', font: 'inherit' }}>{Inner}</button>
    : <div style={style}>{Inner}</div>;
}

export const UI_CSS = (C) => `
.lm-row:hover{background:${C.surfaceHigh}!important}
.lm-btn:hover:not(:disabled){filter:brightness(1.08)}
.lp-focus:focus-visible{outline:2px solid ${C.accent};outline-offset:2px}
@media(max-width:640px){.lm-page{padding:20px 16px 96px!important}.lm-grid-2,.lm-grid-3,.lm-grid-4{grid-template-columns:1fr!important}}
@media(min-width:641px) and (max-width:900px){.lm-grid-4{grid-template-columns:repeat(2,1fr)!important}.lm-grid-3{grid-template-columns:repeat(2,1fr)!important}}
`;
