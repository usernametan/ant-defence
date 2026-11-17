import { createElement } from 'react';
import { renderToString } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { GameApp } from './GameApp';

describe('GameApp', () => {
  it('renders the real-game shell with the main menu (no stub sim in the live flow)', () => {
    const html = renderToString(createElement(GameApp));
    expect(html).toContain('ZONE CONTROL');
    expect(html).toContain('DEPLOY');
    expect(html).toContain('<canvas');
    expect(html).not.toContain('foundation in progress');
  });
});
