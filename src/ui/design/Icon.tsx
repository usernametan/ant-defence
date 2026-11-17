import React from 'react';

export type IconName =
  | 'pistol'
  | 'smg'
  | 'shotgun'
  | 'rifle'
  | 'sniper'
  | 'rocket'
  | 'zone'
  | 'health'
  | 'ammo'
  | 'skull'
  | 'trophy'
  | 'settings'
  | 'play'
  | 'pause'
  | 'dice'
  | 'shield'
  | 'crosshair'
  | 'warning'
  | 'close'
  | 'volume'
  | 'keyboard'
  | 'gamepad';

export interface IconProps {
  name: IconName;
  size?: number;
  color?: string;
  className?: string;
}

export const Icon: React.FC<IconProps> = ({
  name,
  size = 18,
  color = 'currentColor',
  className,
}) => {
  const common = {
    width: size,
    height: size,
    viewBox: '0 0 24 24',
    fill: 'none',
    stroke: color,
    strokeWidth: 2,
    strokeLinecap: 'round' as const,
    strokeLinejoin: 'round' as const,
    className,
    'aria-hidden': true,
  };

  switch (name) {
    case 'play':
      return (
        <svg {...common}>
          <polygon points="6,4 20,12 6,20" fill={color} />
        </svg>
      );
    case 'pause':
      return (
        <svg {...common}>
          <rect x="6" y="4" width="4" height="16" fill={color} />
          <rect x="14" y="4" width="4" height="16" fill={color} />
        </svg>
      );
    case 'settings':
      return (
        <svg {...common}>
          <circle cx="12" cy="12" r="3" />
          <path d="M12 2v3M12 19v3M4.9 4.9l2.1 2.1M17 17l2.1 2.1M2 12h3M19 12h3M4.9 19.1L7 17M17 7l2.1-2.1" />
        </svg>
      );
    case 'zone':
      return (
        <svg {...common}>
          <circle cx="12" cy="12" r="8" strokeDasharray="4 3" />
          <circle cx="12" cy="12" r="3" fill={color} />
        </svg>
      );
    case 'health':
      return (
        <svg {...common}>
          <path d="M12 5v14M5 12h14" strokeWidth={3} />
          <rect x="3" y="3" width="18" height="18" rx="3" />
        </svg>
      );
    case 'ammo':
      return (
        <svg {...common}>
          <path d="M8 19V9l2-4 2 4v10H8zM15 19V11l1.5-3 1.5 3v8h-3z" />
          <path d="M6 20h14" />
        </svg>
      );
    case 'skull':
      return (
        <svg {...common}>
          <path d="M6 14v-3a6 6 0 1 1 12 0v3l-2 2v3H8v-3l-2-2z" />
          <circle cx="9.5" cy="11.5" r="1" fill={color} />
          <circle cx="14.5" cy="11.5" r="1" fill={color} />
        </svg>
      );
    case 'trophy':
      return (
        <svg {...common}>
          <path d="M7 4h10v5a5 5 0 0 1-10 0V4z" />
          <path d="M7 6H4v2a3 3 0 0 0 3 3M17 6h3v2a3 3 0 0 1-3 3M12 14v5M8 20h8" />
        </svg>
      );
    case 'dice':
      return (
        <svg {...common}>
          <rect x="4" y="4" width="16" height="16" rx="2" />
          <circle cx="9" cy="9" r="1" fill={color} />
          <circle cx="15" cy="9" r="1" fill={color} />
          <circle cx="12" cy="12" r="1" fill={color} />
          <circle cx="9" cy="15" r="1" fill={color} />
          <circle cx="15" cy="15" r="1" fill={color} />
        </svg>
      );
    case 'shield':
      return (
        <svg {...common}>
          <path d="M12 3l7 3v6c0 4.5-3 7.8-7 9-4-1.2-7-4.5-7-9V6l7-3z" />
        </svg>
      );
    case 'crosshair':
      return (
        <svg {...common}>
          <circle cx="12" cy="12" r="6" />
          <path d="M12 2v4M12 18v4M2 12h4M18 12h4" />
        </svg>
      );
    case 'warning':
      return (
        <svg {...common}>
          <path d="M12 3L2 20h20L12 3z" />
          <path d="M12 10v4M12 17h.01" />
        </svg>
      );
    case 'close':
      return (
        <svg {...common}>
          <path d="M6 6l12 12M18 6L6 18" />
        </svg>
      );
    case 'volume':
      return (
        <svg {...common}>
          <polygon points="4,9 9,9 14,5 14,19 9,15 4,15" fill={color} />
          <path d="M17.5 8.5a5 5 0 0 1 0 7M20 6a8.5 8.5 0 0 1 0 12" />
        </svg>
      );
    case 'keyboard':
      return (
        <svg {...common}>
          <rect x="2" y="6" width="20" height="12" rx="2" />
          <path d="M6 10h2M10 10h2M14 10h2M18 10h0M7 14h10" />
        </svg>
      );
    case 'gamepad':
      return (
        <svg {...common}>
          <rect x="3" y="7" width="18" height="10" rx="4" />
          <path d="M7 12h4M9 10v4M15.5 11h.01M17.5 13h.01" />
        </svg>
      );
    case 'pistol':
      return (
        <svg {...common}>
          <path d="M4 8h13v4H9l-2 6H4l1-6H4V8z" />
          <path d="M17 9h3" />
        </svg>
      );
    case 'smg':
      return (
        <svg {...common}>
          <path d="M3 9h14v4H12l-1 5H8l1-5H5l-1 4H2l1-8z" />
          <path d="M17 10h4M9 6h4" />
        </svg>
      );
    case 'shotgun':
      return (
        <svg {...common}>
          <path d="M2 12l4-2h14v2H9l-4 4H2v-4z" />
          <path d="M10 13h6" />
        </svg>
      );
    case 'rifle':
      return (
        <svg {...common}>
          <path d="M2 11h16v3h-6l-1 4H9l1-4H5l-2 3H2v-6z" />
          <path d="M18 12h4M9 8h5" />
        </svg>
      );
    case 'sniper':
      return (
        <svg {...common}>
          <path d="M2 12h18v2H10l-2 4H6l1-4H3l-1 2v-4z" />
          <path d="M8 8h7M11 8v4M20 13h2" />
        </svg>
      );
    case 'rocket':
      return (
        <svg {...common}>
          <rect x="3" y="8" width="15" height="7" rx="1" />
          <path d="M18 9l3 2.5L18 14M6 15l-2 3M13 15l1 3" />
        </svg>
      );
  }
};
