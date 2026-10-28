import React, { useId } from 'react';
import { Icon, type IconName } from './Icon';

interface MetricCardProps {
  label: string;
  value: number;
  onClick?: () => void;
  cue?: string; // short text cue shown under the value (never color only)
  highlight?: boolean;
  icon?: IconName;
  accent?: string; // border/icon colour
  accentBg?: string;
}

// Dashboard metric card (ui-spec 1.3): one focusable control whose accessible name is
// "<label>: <value>, view list" when it drills down.
export const MetricCard: React.FC<MetricCardProps> = ({ label, value, onClick, cue, highlight, icon, accent = '#0B7A46', accentBg = '#EAF6EF' }) => {
  const cueId = useId();
  const body = (
    <>
      {icon && <span className="metric-icon" aria-hidden="true" style={{ color: highlight ? '#D97706' : accent }}><Icon name={icon} size={20} /></span>}
      <span style={{ minWidth: 0 }}>
        <span className="d-block text-muted" style={{ fontSize: '0.8rem', fontWeight: 500 }}>{label}</span>
        <span className="d-block fw-bold" style={{ fontSize: '1.9rem', color: '#14532D', lineHeight: 1.15 }}>{value}</span>
        {cue && <span id={cueId} className="d-block fw-semibold" style={{ fontSize: '0.75rem', color: '#B45309' }}><Icon name="alert" size={13} /> {cue}</span>}
      </span>
    </>
  );
  const style: React.CSSProperties = {
    backgroundColor: highlight ? '#FFFBEB' : '#FFFFFF',
    border: `1px solid ${highlight ? '#FCD34D' : '#D1E7DA'}`,
    borderRadius: '14px',
    padding: '14px 16px',
    ['--accent' as string]: highlight ? '#D97706' : accent,
    ['--accent-bg' as string]: highlight ? '#FEF3C7' : accentBg,
    minHeight: '88px',
    width: '100%',
    height: '100%',
    textAlign: 'left',
    boxShadow: '0 1px 2px rgba(0,0,0,0.04)',
  };
  if (!onClick) {
    return <div className="metric-card" style={style}>{body}</div>;
  }
  return (
    <button
      type="button"
      className="metric-card"
      style={{ ...style, cursor: 'pointer' }}
      onClick={onClick}
      aria-label={`${label}: ${value}, view list`}
      aria-describedby={cue ? cueId : undefined}
    >
      {body}
    </button>
  );
};
