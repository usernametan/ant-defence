import { createElement } from 'react';
import { renderToString } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { GameApp } from './GameApp';

describe('GameApp', () => {
  it('renders the game shell, canvas and HUD without crashing', () => {
    const html = renderToString(createElement(GameApp));
    expect(html).toContain('game-shell');
    expect(html).toContain('game-canvas');
    expect(html).toContain('SCORE');
    expect(html).toContain('HEALTH');
    expect(html).toContain('WASD move');
  });
});
