import React from 'react';

const ICON_COLORS: Record<string, string> = {
  'icon:turmeric': '#e9b44c',
  'icon:lime': '#e8e4d8',
  'icon:tamarind': '#7f4f24',
  'icon:camphor': '#d8f3dc',
  'icon:sulfur': '#f4d35e',
  'icon:salt': '#edf2f4',
  'icon:alum': '#a8dadc',
  'icon:copper': '#c86d51',
  'icon:iron': '#8d99ae',
  'icon:neem': '#52b788',
  'icon:ash': '#adb5bd',
  'icon:honey': '#f4a261',
  'icon:mercury': '#c0c7d1',
  'icon:suryakanti': '#ffd166',
};

export interface MaterialBadgeProps {
  icon: string;
  name: string;
}

export const MaterialBadge: React.FC<MaterialBadgeProps> = ({ icon, name }) => {
  const bg = ICON_COLORS[icon] ?? '#b68a3a';
  const glyph = name.slice(0, 2).toUpperCase();

  return (
    <span
      className="aoa-material-badge"
      style={{ backgroundColor: bg }}
      aria-hidden="true"
    >
      {glyph}
    </span>
  );
};
