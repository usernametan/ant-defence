import React, { useEffect } from 'react';
import { AnimatedNumber } from './AnimatedNumber';
import { Icon } from './Icon';
import { Panel } from './Panel';
import { playUiBack } from './uiSound';

export type BadgeTone =
  | 'neutral'
  | 'player'
  | 'enemy'
  | 'gold'
  | 'common'
  | 'rare'
  | 'epic'
  | 'success'
  | 'danger';

export interface BadgeProps {
  tone?: BadgeTone;
  children: React.ReactNode;
  className?: string;
}

export const Badge: React.FC<BadgeProps> = ({
  tone = 'neutral',
  children,
  className = '',
}) => {
  const toneClass = tone === 'neutral' ? '' : `ht-badge--${tone}`;
  return (
    <span className={`ht-badge ${toneClass} ${className}`.trim()}>
      {children}
    </span>
  );
};

export interface TooltipProps {
  content: string;
  children: React.ReactNode;
}

export const Tooltip: React.FC<TooltipProps> = ({ content, children }) => (
  <span className="ht-tooltip-host">
    {children}
    <span className="ht-tooltip" role="tooltip">
      {content}
    </span>
  </span>
);

export interface KeyCapProps {
  label: string;
  active?: boolean;
}

export const KeyCap: React.FC<KeyCapProps> = ({ label, active = false }) => (
  <kbd className={`ht-keycap ${active ? 'is-active' : ''}`}>{label}</kbd>
);

export interface ProgressBarProps {
  value: number;
  max?: number;
  color?: string;
  height?: number;
  className?: string;
}

export const ProgressBar: React.FC<ProgressBarProps> = ({
  value,
  max = 100,
  color,
  height = 8,
  className = '',
}) => {
  const ratio = max > 0 ? Math.max(0, Math.min(1, value / max)) : 0;
  return (
    <div
      className={`ht-progress ${className}`.trim()}
      style={{ height }}
      role="progressbar"
      aria-valuenow={Math.round(value)}
      aria-valuemin={0}
      aria-valuemax={max}
    >
      <div
        className="ht-progress-fill"
        style={{
          transform: `scaleX(${ratio})`,
          background: color ?? undefined,
        }}
      />
    </div>
  );
};

export interface StatBarProps {
  label: string;
  value: number;
  max: number;
  decimals?: number;
  suffix?: string;
  color?: string;
}

export const StatBar: React.FC<StatBarProps> = ({
  label,
  value,
  max,
  decimals = 0,
  suffix = '',
  color,
}) => (
  <div className="ht-statbar">
    <span className="ht-statbar-label">{label}</span>
    <ProgressBar value={value} max={max} color={color} height={6} />
    <AnimatedNumber value={value} decimals={decimals} suffix={suffix} className="ht-statbar-val" />
  </div>
);

export interface ModalProps {
  open: boolean;
  title: string;
  onClose: () => void;
  children: React.ReactNode;
}

export const Modal: React.FC<ModalProps> = ({
  open,
  title,
  onClose,
  children,
}) => {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        playUiBack();
        onClose();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div
      className="ht-root ht-modal-backdrop"
      role="dialog"
      aria-modal="true"
      aria-label={title}
      onClick={onClose}
    >
      <Panel
        bracketed
        className="ht-modal-body"
        style={{ padding: 24 }}
        onClick={(e) => e.stopPropagation()}
      >
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            marginBottom: 16,
            paddingBottom: 12,
            borderBottom: '1px solid var(--line)',
          }}
        >
          <h2 className="ht-display" style={{ fontSize: 18 }}>
            {title}
          </h2>
          <button
            type="button"
            className="ht-btn ht-btn--ghost ht-btn--sm"
            aria-label="Close"
            onClick={() => {
              playUiBack();
              onClose();
            }}
          >
            <Icon name="close" size={16} />
          </button>
        </div>
        {children}
      </Panel>
    </div>
  );
};
