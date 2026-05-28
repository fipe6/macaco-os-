import { MACACO } from '../theme.js';

export function Card({ children, style, accent, onClick, padding = 16, glow }) {
  return (
    <div
      onClick={onClick}
      style={{
        background: MACACO.card,
        border: `1px solid ${accent || MACACO.border}`,
        borderRadius: 16,
        padding,
        boxShadow: glow
          ? `0 2px 12px rgba(0,0,0,0.4), 0 0 0 1px ${accent}33, 0 0 28px ${accent}22`
          : '0 2px 12px rgba(0,0,0,0.4)',
        cursor: onClick ? 'pointer' : 'default',
        position: 'relative',
        ...style,
      }}
    >
      {children}
    </div>
  );
}

export function SectionTitle({ children, right, style }) {
  return (
    <div style={{
      display: 'flex', alignItems: 'baseline', justifyContent: 'space-between',
      padding: '0 4px', marginBottom: 10, ...style,
    }}>
      <div style={{
        fontSize: 11, fontWeight: 700, letterSpacing: '0.14em',
        textTransform: 'uppercase', color: MACACO.textDim,
      }}>{children}</div>
      {right && <div style={{ fontSize: 12, color: MACACO.textMuted, fontWeight: 500 }}>{right}</div>}
    </div>
  );
}

export function Progress({ value, color = MACACO.primary, height = 8, track = 'rgba(255,255,255,0.07)', glow = true, animate = true }) {
  return (
    <div style={{
      height, background: track, borderRadius: 999, overflow: 'hidden', position: 'relative',
    }}>
      <div style={{
        width: `${Math.min(100, Math.max(0, value))}%`,
        height: '100%',
        background: color,
        borderRadius: 999,
        boxShadow: glow ? `0 0 12px ${color}88` : undefined,
        transition: animate ? 'width 800ms cubic-bezier(.2,.7,.2,1)' : undefined,
      }} />
    </div>
  );
}

export function Trend({ value, suffix = '%', good }) {
  const up = value > 0;
  const isGood = good === undefined ? up : good;
  const color = isGood ? MACACO.success : MACACO.danger;
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: 3,
      color, fontSize: 12, fontWeight: 600, fontVariantNumeric: 'tabular-nums',
    }}>
      <svg width="10" height="10" viewBox="0 0 10 10" style={{ transform: up ? 'none' : 'rotate(180deg)' }}>
        <path d="M5 1L9 7H1z" fill={color} />
      </svg>
      {up ? '+' : ''}{value}{suffix}
    </span>
  );
}

export function Dot({ color, size = 8, glow = true }) {
  return (
    <span style={{
      display: 'inline-block', width: size, height: size, borderRadius: 999,
      background: color, boxShadow: glow ? `0 0 8px ${color}` : undefined,
      verticalAlign: 'middle',
    }} />
  );
}

export const Icon = {
  home: (p={}) => <svg viewBox="0 0 24 24" width={p.size||22} height={p.size||22} fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M3 11l9-8 9 8" /><path d="M5 10v10h14V10" /><path d="M10 20v-6h4v6" /></svg>,
  plus: (p={}) => <svg viewBox="0 0 24 24" width={p.size||22} height={p.size||22} fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M12 5v14M5 12h14"/></svg>,
  wallet: (p={}) => <svg viewBox="0 0 24 24" width={p.size||22} height={p.size||22} fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round"><rect x="3" y="6" width="18" height="14" rx="2.5"/><path d="M3 10h18"/><circle cx="17" cy="15" r="1.3" fill="currentColor" stroke="none"/></svg>,
  box: (p={}) => <svg viewBox="0 0 24 24" width={p.size||22} height={p.size||22} fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round"><path d="M3 7l9-4 9 4-9 4-9-4z"/><path d="M3 7v10l9 4 9-4V7"/><path d="M12 11v10"/></svg>,
  chart: (p={}) => <svg viewBox="0 0 24 24" width={p.size||22} height={p.size||22} fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"><path d="M4 20V10M10 20V4M16 20v-8M22 20H2"/></svg>,
  settings: (p={}) => <svg viewBox="0 0 24 24" width={p.size||22} height={p.size||22} fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinejoin="round"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z"/></svg>,
  search: (p={}) => <svg viewBox="0 0 24 24" width={p.size||18} height={p.size||18} fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><circle cx="11" cy="11" r="7"/><path d="M21 21l-4.3-4.3"/></svg>,
  arrowRight: (p={}) => <svg viewBox="0 0 24 24" width={p.size||14} height={p.size||14} fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14M13 5l7 7-7 7"/></svg>,
  warn: (p={}) => <svg viewBox="0 0 24 24" width={p.size||16} height={p.size||16} fill="none" stroke="currentColor" strokeWidth="2" strokeLinejoin="round"><path d="M12 3L1 21h22z"/><path d="M12 10v5" strokeLinecap="round"/><circle cx="12" cy="18" r="1" fill="currentColor" stroke="none"/></svg>,
  send: (p={}) => <svg viewBox="0 0 24 24" width={p.size||16} height={p.size||16} fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round"><path d="M22 2L11 13"/><path d="M22 2l-7 20-4-9-9-4z"/></svg>,
  check: (p={}) => <svg viewBox="0 0 24 24" width={p.size||14} height={p.size||14} fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"><path d="M4 12l5 5L20 6"/></svg>,
  refresh: (p={}) => <svg viewBox="0 0 24 24" width={p.size||16} height={p.size||16} fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M21 12a9 9 0 1 1-3-6.7"/><path d="M21 3v6h-6"/></svg>,
  whatsapp: (p={}) => <svg viewBox="0 0 24 24" width={p.size||16} height={p.size||16} fill="currentColor"><path d="M17.6 14.2c-.3-.1-1.7-.8-2-.9-.3-.1-.5-.1-.7.1-.2.3-.7.9-.9 1.1-.2.2-.3.2-.6.1-.3-.1-1.2-.4-2.3-1.4-.9-.7-1.4-1.7-1.6-2-.2-.3 0-.4.1-.6.1-.1.3-.3.4-.5.1-.2.2-.3.3-.5.1-.2 0-.4 0-.5 0-.1-.7-1.7-.9-2.3-.2-.6-.5-.5-.7-.5h-.5c-.2 0-.5.1-.8.4-.3.3-1 1-1 2.4 0 1.4 1 2.8 1.2 3 .1.2 2 3.1 4.9 4.3.7.3 1.2.5 1.6.6.7.2 1.3.2 1.8.1.5-.1 1.7-.7 1.9-1.4.2-.7.2-1.2.2-1.4-.1-.1-.3-.2-.6-.3zM12 2C6.5 2 2 6.5 2 12c0 1.8.5 3.5 1.3 5L2 22l5.1-1.3c1.5.8 3.2 1.3 4.9 1.3 5.5 0 10-4.5 10-10S17.5 2 12 2z"/></svg>,
  monkey: (p={}) => <svg viewBox="0 0 32 32" width={p.size||22} height={p.size||22} fill="none">
    <circle cx="16" cy="17" r="10" fill="#F5C518"/>
    <circle cx="9" cy="13" r="4" fill="#F5C518"/>
    <circle cx="23" cy="13" r="4" fill="#F5C518"/>
    <circle cx="9" cy="13" r="2" fill="#0A0A0F"/>
    <circle cx="23" cy="13" r="2" fill="#0A0A0F"/>
    <ellipse cx="16" cy="20" rx="6" ry="5" fill="#1a1306"/>
    <circle cx="13" cy="17" r="1.1" fill="#0A0A0F"/>
    <circle cx="19" cy="17" r="1.1" fill="#0A0A0F"/>
    <path d="M14 21q2 1.5 4 0" stroke="#0A0A0F" strokeWidth="1.2" strokeLinecap="round" fill="none"/>
  </svg>,
};
