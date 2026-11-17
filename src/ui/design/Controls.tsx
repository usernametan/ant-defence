import React from 'react';
import { playUiClick, playUiHover } from './uiSound';
import { AnimatedNumber } from './AnimatedNumber';

export interface TabItem<T extends string> {
  id: T;
  label: string;
}

export interface TabsProps<T extends string> {
  items: TabItem<T>[];
  active: T;
  onChange: (id: T) => void;
}

export function Tabs<T extends string>({
  items,
  active,
  onChange,
}: TabsProps<T>): React.ReactElement {
  return (
    <div className="ht-tabs" role="tablist">
      {items.map((item, idx) => {
        const isActive = item.id === active;
        return (
          <button
            key={item.id}
            type="button"
            role="tab"
            aria-selected={isActive}
            className={`ht-tab ${isActive ? 'is-active' : ''}`}
            onMouseEnter={() => playUiHover()}
            onClick={() => {
              playUiClick();
              onChange(item.id);
            }}
            onKeyDown={(e) => {
              if (e.key === 'ArrowRight') {
                e.preventDefault();
                const next = items[(idx + 1) % items.length];
                playUiClick();
                onChange(next.id);
              } else if (e.key === 'ArrowLeft') {
                e.preventDefault();
                const prev = items[(idx - 1 + items.length) % items.length];
                playUiClick();
                onChange(prev.id);
              }
            }}
          >
            {item.label}
          </button>
        );
      })}
    </div>
  );
}

export interface SliderProps {
  label: string;
  value: number;
  min: number;
  max: number;
  step?: number;
  suffix?: string;
  decimals?: number;
  onChange: (value: number) => void;
}

export const Slider: React.FC<SliderProps> = ({
  label,
  value,
  min,
  max,
  step = 1,
  suffix = '',
  decimals = 0,
  onChange,
}) => {
  const pct = max > min ? ((value - min) / (max - min)) * 100 : 0;

  return (
    <label className="ht-slider-wrap">
      <div className="ht-slider-header">
        <span>{label}</span>
        <AnimatedNumber
          value={value}
          decimals={decimals}
          suffix={suffix}
          durationMs={120}
          className="ht-slider-val"
        />
      </div>
      <input
        type="range"
        className="ht-slider"
        min={min}
        max={max}
        step={step}
        value={value}
        style={{
          background: `linear-gradient(90deg, var(--player) ${pct}%, var(--bg-0) ${pct}%)`,
        }}
        onChange={(e) => {
          playUiClick();
          onChange(Number(e.target.value));
        }}
      />
    </label>
  );
};

export interface ToggleProps {
  label: string;
  description?: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
}

export const Toggle: React.FC<ToggleProps> = ({
  label,
  description,
  checked,
  onChange,
}) => {
  return (
    <div className="ht-toggle-row">
      <div>
        <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-hi)' }}>
          {label}
        </div>
        {description && (
          <div style={{ fontSize: 11, color: 'var(--text-mid)', marginTop: 2 }}>
            {description}
          </div>
        )}
      </div>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        aria-label={label}
        className={`ht-toggle ${checked ? 'is-on' : ''}`}
        onMouseEnter={() => playUiHover()}
        onClick={() => {
          playUiClick();
          onChange(!checked);
        }}
      >
        <span className="ht-toggle-thumb" />
      </button>
    </div>
  );
};

export interface SelectOption<T extends string> {
  value: T;
  label: string;
}

export interface SelectProps<T extends string> {
  label: string;
  value: T;
  options: SelectOption<T>[];
  onChange: (value: T) => void;
}

export function Select<T extends string>({
  label,
  value,
  options,
  onChange,
}: SelectProps<T>): React.ReactElement {
  return (
    <label className="ht-select-wrap">
      <span
        style={{
          fontSize: 12,
          color: 'var(--text-mid)',
          textTransform: 'uppercase',
          letterSpacing: '0.06em',
        }}
      >
        {label}
      </span>
      <select
        className="ht-select"
        value={value}
        onChange={(e) => {
          playUiClick();
          onChange(e.target.value as T);
        }}
      >
        {options.map((opt) => (
          <option key={opt.value} value={opt.value}>
            {opt.label}
          </option>
        ))}
      </select>
    </label>
  );
}
