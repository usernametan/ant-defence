import { createElement } from 'react';
import { renderToString } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { ActionBar } from './hud/ActionBar';
import { CrosshairGlyph, CrosshairOverlay } from './hud/Crosshair';
import { MinimapTerrainCache } from './hud/Minimap';
import { WeaponCard } from './hud/WeaponCard';
import { CountdownOverlay } from './screens/CountdownOverlay';
import { MainMenu } from './screens/MainMenu';
import { MatchSetup } from './screens/MatchSetup';
import { PauseMenu } from './screens/PauseMenu';
import { generatePreviewMap } from './previewMap';
import { DEFAULT_SETTINGS, loadSettings } from './settingsStore';
import { StubSim } from './stubSim';

describe('UI StubSim and settings', () => {
  it('StubSim implements SimApi lifecycle and advances deterministic state', () => {
    const sim = new StubSim();
    const initial = sim.getState();
    expect(initial.status).toBe('playing');
    expect(initial.units.length).toBeGreaterThanOrEqual(4);
    expect(initial.map.zones).toHaveLength(3);

    sim.step(1 / 60);
    const stepped = sim.getState();
    expect(stepped.tick).toBe(1);
    expect(stepped.time).toBeGreaterThan(0);

    sim.pause();
    expect(sim.getState().status).toBe('paused');
    sim.resume();
    expect(sim.getState().status).toBe('playing');
  });

  it('loadSettings falls back cleanly to DEFAULT_SETTINGS in Node', () => {
    const loaded = loadSettings();
    expect(loaded).toEqual(DEFAULT_SETTINGS);
  });

  it('generatePreviewMap moves capture zones across map themes and seeds', () => {
    const jungle = generatePreviewMap(4242, 'jungle');
    const temple = generatePreviewMap(4242, 'temple');
    const fortress = generatePreviewMap(4242, 'fortress');
    const slumside = generatePreviewMap(4242, 'slumside');

    expect(jungle.theme).toBe('jungle');
    expect(temple.theme).toBe('temple');
    expect(slumside.theme).toBe('slumside');
    expect(JSON.stringify(jungle.zones)).not.toBe(JSON.stringify(temple.zones));
    expect(JSON.stringify(jungle.zones)).not.toBe(JSON.stringify(fortress.zones));
    expect(JSON.stringify(slumside.zones)).not.toBe(JSON.stringify(fortress.zones));
    expect(JSON.stringify(slumside.zones)).not.toBe(JSON.stringify(temple.zones));
  });

  it('displays rifle fire rate as 6.5/s in MatchSetup rather than 65/s', () => {
    const html = renderToString(
      createElement(MatchSetup, {
        initialConfig: {
          seed: 4242,
          mode: 'zoneControl',
          difficulty: 'normal',
          scoreToWin: 120,
          enemyCount: 4,
          startingWeapon: 'rifle',
          mapTheme: 'fortress',
        },
        onDeploy: () => {},
        onBack: () => {},
      }),
    );
    expect(html).toContain('6.5');
    expect(html).toContain('Slumside');
    expect(html).not.toContain('65<!-- -->/s');
    expect(html).not.toContain('65/s');
  });

  it('renders scope reticle ring on CrosshairGlyph when scoped', () => {
    const unscopedHtml = renderToString(
      createElement(CrosshairGlyph, {
        style: 'tactical',
        gap: 8,
        hitFlash: null,
        scoped: false,
      }),
    );
    const scopedHtml = renderToString(
      createElement(CrosshairGlyph, {
        style: 'tactical',
        gap: 8,
        hitFlash: null,
        scoped: true,
      }),
    );
    expect(unscopedHtml).not.toContain('r="24"');
    expect(scopedHtml).toContain('r="24"');
  });

  it('displays dash and grenade cooldown timers on ActionBar and WeaponCard', () => {
    const actionHtml = renderToString(
      createElement(ActionBar, {
        hasNearbyPickup: false,
        reloading: false,
        lowAmmo: false,
        dashReady: false,
        dashCooldown: 2.4,
        dashMaxCooldown: 3.2,
        grenades: 1,
        grenadeCooldown: 1.7,
        grenadeMaxCooldown: 3.0,
      }),
    );
    expect(actionHtml).toContain('2.4s');
    expect(actionHtml).toContain('1.7s');
    expect(actionHtml).toContain('ht-action-cooldown-fill');

    const weaponHtml = renderToString(
      createElement(WeaponCard, {
        weaponId: 'rifle',
        ammoInMag: 24,
        reserveAmmo: 120,
        grenades: 1,
        grenadeCooldown: 1.7,
        reloading: false,
        reloadProgress: 0,
        flipKey: 0,
      }),
    );
    expect(weaponHtml).toContain('1.7s');
  });

  it('renders redesigned MainMenu with restrained tactical hierarchy and PLAY NOW action', () => {
    const html = renderToString(
      createElement(MainMenu, {
        onPlay: () => {},
        onSettings: () => {},
        onHowToPlay: () => {},
      }),
    );
    expect(html).toContain('ZONE CONTROL');
    expect(html).toContain('PLAY NOW');
    expect(html).toContain('Home');
    expect(html).toContain('About');
    expect(html).toContain('How to Play');
    expect(html).toContain('Patch Notes');
    expect(html).toContain('THREE CAPTURE ZONES');
    expect(html).toContain('SQUAD-BASED COMBAT');
    expect(html).toContain('TARGET SCORE: 600');
  });

  it('MinimapTerrainCache reuses offscreen layer until wallRevision or theme changes', () => {
    const map = generatePreviewMap(4242, 'slumside');
    let fillRects = 0;
    const makeCanvas = (w: number, h: number) =>
      ({
        width: w,
        height: h,
        getContext: () => ({
          fillStyle: '',
          fillRect: () => {
            fillRects += 1;
          },
        }),
      }) as unknown as HTMLCanvasElement;

    const cache = new MinimapTerrainCache();
    const first = cache.ensureTerrain(196, 130, map, makeCanvas);
    expect(first).not.toBeNull();
    expect(cache.fullRebuilds).toBe(1);
    const firstRects = fillRects;
    expect(firstRects).toBeGreaterThan(50);

    const second = cache.ensureTerrain(196, 130, map, makeCanvas);
    expect(second).toBe(first);
    expect(cache.fullRebuilds).toBe(1);
    expect(fillRects).toBe(firstRects);

    const updated = { ...map, wallRevision: (map.wallRevision ?? 0) + 1 };
    cache.ensureTerrain(196, 130, updated, makeCanvas);
    expect(cache.fullRebuilds).toBe(2);
    expect(fillRects).toBe(firstRects * 2);
  });

  it('CrosshairOverlay renders cleanly with subscribeScreenPos omitted or provided', () => {
    const html = renderToString(
      createElement(CrosshairOverlay, {
        subscribeScreenPos: () => () => {},
        style: 'tactical',
        gap: 8,
        hitFlash: null,
        damageIndicators: [],
      }),
    );
    expect(html).toContain('translate3d');
  });

  it('renders MatchSetup, CountdownOverlay, and PauseMenu with the studio landing palette classes', () => {
    const setupHtml = renderToString(
      createElement(MatchSetup, {
        initialConfig: {
          seed: 4242,
          mode: 'hellcell',
          difficulty: 'easy',
          scoreToWin: 1000,
          enemyCount: 4,
          startingWeapon: 'rifle',
          mapTheme: 'fortress',
        },
        onDeploy: () => {},
        onBack: () => {},
      }),
    );
    expect(setupHtml).toContain('zc-landing');
    expect(setupHtml).toContain('START MATCH');
    expect(setupHtml).toContain('Hellcell');

    const countdownHtml = renderToString(
      createElement(CountdownOverlay, {
        seconds: 3,
        mode: 'hellcell',
        mapTheme: 'fortress',
        difficulty: 'easy',
        scoreToWin: 1000,
        onComplete: () => {},
      }),
    );
    expect(countdownHtml).toContain('zc-overlay-backdrop');
    expect(countdownHtml).toContain('zc-countdown-card');
    expect(countdownHtml).toContain('Hellcell');
    expect(countdownHtml).toContain('1000 score to win');

    const pauseHtml = renderToString(
      createElement(PauseMenu, {
        mode: 'zoneControl',
        score: { player: 120, enemy: 95 },
        elapsedSeconds: 47,
        mapTheme: 'fortress',
        onResume: () => {},
        onSettings: () => {},
        onRestart: () => {},
        onQuit: () => {},
      }),
    );
    expect(pauseHtml).toContain('zc-overlay-backdrop');
    expect(pauseHtml).toContain('zc-pause-card');
    expect(pauseHtml).toContain('Paused');
    expect(pauseHtml).toContain('Resume');
    expect(pauseHtml).toContain('Restart Match');
    expect(pauseHtml).toContain('Exit to Menu');
  });
});
