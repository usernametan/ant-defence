import React, { useRef, useState } from 'react';
import { playUiClick, playUiConfirm, playUiHover } from './uiSound';

export type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger';
export type ButtonSize = 'sm' | 'md' | 'lg';

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  magnetic?: boolean;
  soundType?: 'click' | 'confirm';
}

export const Button: React.FC<ButtonProps> = ({
  variant = 'secondary',
  size = 'md',
  magnetic = variant === 'primary',
  soundType = variant === 'primary' ? 'confirm' : 'click',
  className = '',
  style,
  onMouseMove,
  onMouseLeave,
  onMouseEnter,
  onClick,
  children,
  ...rest
}) => {
  const btnRef = useRef<HTMLButtonElement | null>(null);
  const [mag, setMag] = useState<{ x: number; y: number }>({ x: 0, y: 0 });

  const handleMouseMove = (e: React.MouseEvent<HTMLButtonElement>) => {
    if (magnetic && !rest.disabled && btnRef.current) {
      const rect = btnRef.current.getBoundingClientRect();
      const dx = (e.clientX - (rect.left + rect.width / 2)) * 0.14;
      const dy = (e.clientY - (rect.top + rect.height / 2)) * 0.14;
      const clampedX = Math.max(-6, Math.min(6, dx));
      const clampedY = Math.max(-4, Math.min(4, dy));
      setMag({ x: clampedX, y: clampedY });
    }
    onMouseMove?.(e);
  };

  const handleMouseLeave = (e: React.MouseEvent<HTMLButtonElement>) => {
    if (mag.x !== 0 || mag.y !== 0) {
      setMag({ x: 0, y: 0 });
    }
    onMouseLeave?.(e);
  };

  const handleMouseEnter = (e: React.MouseEvent<HTMLButtonElement>) => {
    if (!rest.disabled) {
      playUiHover();
    }
    onMouseEnter?.(e);
  };

  const handleClick = (e: React.MouseEvent<HTMLButtonElement>) => {
    if (!rest.disabled) {
      if (soundType === 'confirm') playUiConfirm();
      else playUiClick();
    }
    onClick?.(e);
  };

  const sizeClass = size === 'md' ? '' : `ht-btn--${size}`;
  const combinedStyle = {
    ...style,
    '--mag-x': `${mag.x.toFixed(1)}px`,
    '--mag-y': `${mag.y.toFixed(1)}px`,
  } as React.CSSProperties;

  return (
    <button
      ref={btnRef}
      type={rest.type ?? 'button'}
      className={`ht-btn ht-btn--${variant} ${sizeClass} ${className}`.trim()}
      style={combinedStyle}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      onMouseEnter={handleMouseEnter}
      onClick={handleClick}
      {...rest}
    >
      {children}
    </button>
  );
};
