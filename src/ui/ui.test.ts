import { createElement } from 'react';
import { renderToString } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { ActionBar } from './hud/ActionBar';
import { CrosshairGlyph } from './hud/Crosshair';
import { WeaponCard } from './hud/WeaponCard';
import { MainMenu } from './screens/MainMenu';
import { MatchSetup } from './screens/MatchSetup';
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
});
