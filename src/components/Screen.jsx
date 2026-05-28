import { MACACO } from '../theme.js';
import { Icon } from './ui.jsx';

export function Screen({ children, padBottom = 100 }) {
  return (
    <div style={{
      minHeight: '100%',
      background: MACACO.bg,
      color: MACACO.text,
      padding: '8px 16px ' + padBottom + 'px',
      boxSizing: 'border-box',
    }}>
      {children}
    </div>
  );
}

export function GreetingHeader({ title, subtitle, right }) {
  return (
    <div style={{
      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      padding: '6px 4px 16px',
    }}>
      <div>
        <div style={{
          display: 'flex', alignItems: 'center', gap: 8,
          fontSize: 17, fontWeight: 700, letterSpacing: '-0.01em',
        }}>
          <Icon.monkey size={26} />
          <span>{title}</span>
        </div>
        {subtitle && <div style={{
          fontSize: 12.5, color: MACACO.textDim, marginTop: 4, marginLeft: 34,
        }}>{subtitle}</div>}
      </div>
      <div style={{ textAlign: 'right' }}>{right}</div>
    </div>
  );
}
