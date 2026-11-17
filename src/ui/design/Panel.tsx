import React from 'react';
import { playUiClick, playUiHover } from './uiSound';

export interface PanelProps extends React.HTMLAttributes<HTMLDivElement> {
  tone?: 'default' | 'subtle' | 'enemy' | 'gold';
  bracketed?: boolean;
  scanlines?: boolean;
}

export const Panel: React.FC<PanelProps> = ({
  tone = 'default',
  bracketed = false,
  scanlines = true,
  className = '',
  children,
  ...rest
}) => {
  const toneClass = tone === 'default' ? '' : `ht-panel--${tone}`;
  const bracketClass = bracketed ? 'ht-panel--bracketed' : '';
  const scanClass = scanlines ? 'ht-scanlines' : '';

  return (
    <div
      className={`ht-panel ${toneClass} ${bracketClass} ${scanClass} ${className}`.trim()}
      {...rest}
    >
      {children}
    </div>
  );
};

export interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  selected?: boolean;
  interactive?: boolean;
}

export const Card: React.FC<CardProps> = ({
  selected = false,
  interactive = false,
  className = '',
  onClick,
  onKeyDown,
  onMouseEnter,
  children,
  ...rest
}) => {
  const handleKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    if (interactive && (e.key === 'Enter' || e.key === ' ')) {
      e.preventDefault();
      playUiClick();
      onClick?.(e as unknown as React.MouseEvent<HTMLDivElement>);
    }
    onKeyDown?.(e);
  };

  return (
    <div
      role={interactive ? 'button' : rest.role}
      tabIndex={interactive ? 0 : rest.tabIndex}
      aria-pressed={interactive ? selected : undefined}
      className={`ht-card ${interactive ? 'ht-card--interactive' : ''} ${selected ? 'ht-card--selected' : ''} ${className}`.trim()}
      onMouseEnter={(e) => {
        if (interactive) playUiHover();
        onMouseEnter?.(e);
      }}
      onClick={(e) => {
        if (interactive) playUiClick();
        onClick?.(e);
      }}
      onKeyDown={handleKeyDown}
      {...rest}
    >
      {children}
    </div>
  );
};
