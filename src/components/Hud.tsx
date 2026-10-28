import type { CSSProperties } from 'react';
import type { GameEngine } from '../game/engine';
import type { AbilityId, HudSnapshot } from '../game/types';
import { formatScore, formatTime, pad2 } from '../utils/format';
import {
  AntIcon,
  BoltIcon,
  CrosshairIcon,
  FocusIcon,
  ShieldIcon,
  SoundIcon,
  StickmanPortrait,
} from './Icons';

type HudProps = {
  hud: HudSnapshot;
  engine: GameEngine;
};

const ABILITY_ICONS: Record<AbilityId, JSX.Element> = {
  focus: <FocusIcon className="ability-icon" />,
  aegis: <ShieldIcon className="ability-icon" />,
  power: <BoltIcon className="ability-icon" />,
};

function abilityStatus(id: AbilityId, cooldown: number, active: number, charges: number): string {
  if (id === 'power' && charges > 0) return `${charges} RND`;
  if (cooldown > 0) return `${Math.ceil(cooldown)}S`;
  if (active > 0) return `${Math.ceil(active)}S`;
  return 'READY';
}

export function Hud({ hud, engine }: HudProps) {
  const healthPct = Math.max(0, Math.min(100, (hud.health / hud.maxHealth) * 100));
  const critical = hud.health <= 30;
  const word = hud.targetWord;
  const typed = hud.typed;
  const progress = word.length > 0 ? Math.min(1, typed.length / word.length) : 0;
  const playing = hud.phase === 'playing' || hud.phase === 'paused';

  if (hud.phase === 'menu') return null;

  return (
    <div className={`hud-layer ${critical && playing ? 'is-critical' : ''}`}>
      <div className="hud-top">
        <section className="hud-left">
          <div className="health-panel">
            <div className="portrait-wrap">
              <StickmanPortrait className="portrait" />
              <span className="portrait-tick" />
            </div>
            <div className="health-body">
              <div className="health-heading">
                <span className="micro-label">VITALITY</span>
                <span className="health-number">
                  {Math.ceil(hud.health)}
                  <small>/{hud.maxHealth}</small>
                </span>
              </div>
              <div className={`health-track ${critical ? 'health-critical' : ''}`}>
                <div className="health-fill" style={{ width: `${healthPct}%` }} />
                <div className="health-ticks" />
              </div>
              <div className="health-note">
                {critical ? 'CRITICAL — HOLD THE LINE' : 'LAST DEFENDER OF THE PASS'}
              </div>
            </div>
          </div>
        </section>

        <section className="hud-center">
          <div className="wave-panel">
            <span className="micro-label center-label">SURVIVAL PROTOCOL</span>
            <div className="wave-line">
              <span className="wave-word">WAVE</span>
              <span className="wave-number">{pad2(hud.wave)}</span>
              <span className="wave-divider" />
              <span className="wave-time">{formatTime(hud.elapsed)}</span>
            </div>
            <div className="wave-track">
              <div className="wave-fill" style={{ width: `${hud.waveProgress * 100}%` }} />
            </div>
            <div className="wave-sub">
              {hud.wave % 5 === 0 ? 'ROYAL ASSAULT' : 'THE COLONY ADVANCES'}
            </div>
          </div>
        </section>

        <section className="hud-right">
          <div className="stat-panel">
            <div className="stat-row">
              <AntIcon className="stat-icon" />
              <div>
                <span className="micro-label">ELIMINATED</span>
                <span className="stat-value">{String(hud.eliminated).padStart(3, '0')}</span>
              </div>
            </div>
            <span className="stat-rule" />
            <div className="stat-row">
              <div>
                <span className="micro-label">SCORE</span>
                <span className="stat-value score-value">{formatScore(hud.score)}</span>
              </div>
            </div>
            {hud.combo > 1 && (
              <span className="combo-chip">STREAK {hud.combo}</span>
            )}
          </div>
          <button
            type="button"
            className="icon-button mute-button"
            aria-label={hud.muted ? 'Unmute audio' : 'Mute audio'}
            onClick={() => engine.toggleMute()}
            onMouseDown={(event) => event.preventDefault()}
          >
            <SoundIcon muted={hud.muted} className="mute-icon" />
          </button>
        </section>
      </div>

      {hud.banner && (
        <div key={hud.banner.key} className="wave-banner" aria-live="polite">
          <span className="banner-rule" />
          <h2>{hud.banner.title}</h2>
          <p>{hud.banner.subtitle}</p>
          <span className="banner-rule" />
        </div>
      )}

      {playing && (
        <div className="hud-bottom">
          <section className="hint-panel">
            <span className="micro-label">FIELD MANUAL</span>
            <div className="hint-row">
              <kbd>A–Z</kbd>
              <span>TYPE THE WORD</span>
            </div>
            <div className="hint-row">
              <kbd>BKSP</kbd>
              <span>ERASE</span>
              <kbd>ESC</kbd>
              <span>PAUSE</span>
            </div>
            <div className="hint-row">
              <kbd>1</kbd>
              <kbd>2</kbd>
              <kbd>3</kbd>
              <span>ABILITIES</span>
            </div>
          </section>

          <section
            key={hud.mistakes}
            className={`typing-panel ${hud.targetSelected ? 'has-target' : ''} ${
              hud.inputError ? 'is-error' : ''
            }`}
          >
            <div className="typing-head">
              <span className="typing-mode">
                {hud.targetSelected ? (
                  <>
                    <CrosshairIcon className="typing-crosshair" />
                    TARGET LOCKED
                  </>
                ) : (
                  'TYPE TO FIRE'
                )}
              </span>
              <span className="typing-meta">
                ACC {Math.round(hud.accuracy)}% <i /> {hud.wpm} WPM
              </span>
            </div>

            <div className="typing-word">
              {hud.targetSelected ? (
                <span className="word-chars" aria-label={`Target word ${word}`}>
                  {word.split('').map((char, index) => {
                    const className =
                      index < typed.length
                        ? 'word-char is-typed'
                        : index === typed.length
                          ? 'word-char is-next'
                          : 'word-char';
                    return (
                      <span className={className} key={`${char}-${index}`}>
                        {char}
                      </span>
                    );
                  })}
                </span>
              ) : (
                <span className="typing-placeholder">
                  AWAITING A WORD
                  <i className="blink-caret" />
                </span>
              )}
            </div>

            <div className="typing-foot">
              {hud.inputError ? (
                <span className="typing-alert">MISFIRE — RECOVER AND KEEP TYPING</span>
              ) : (
                <>
                  <span>BACKSPACE ERASE</span>
                  <span>ESC PAUSE</span>
                  <span>1–3 ABILITIES</span>
                </>
              )}
            </div>

            <div className="typing-progress" aria-hidden="true">
              <div
                className="typing-progress-fill"
                style={{ width: `${progress * 100}%` }}
              />
            </div>
          </section>

          <section className="ability-dock">
            {hud.abilities.map((ability) => {
              const cooling = ability.cooldown > 0;
              const active = ability.active > 0;
              return (
                <button
                  key={ability.id}
                  type="button"
                  className={`ability ${cooling ? 'is-cooling' : ''} ${
                    active ? 'is-active' : ''
                  }`}
                  onClick={() => engine.activateAbility(ability.id)}
                  onMouseDown={(event) => event.preventDefault()}
                  title={ability.description}
                >
                  <span className="ability-key">{ability.key}</span>
                  <span className="ability-glyph">{ABILITY_ICONS[ability.id]}</span>
                  <span className="ability-copy">
                    <span className="ability-name">{ability.name}</span>
                    <span className="ability-state">
                      {abilityStatus(
                        ability.id,
                        ability.cooldown,
                        ability.active,
                        ability.charges,
                      )}
                    </span>
                  </span>
                  {active && ability.id !== 'power' && (
                    <span
                      className="ability-timer"
                      style={
                        {
                          '--active-ratio': `${Math.min(
                            1,
                            ability.active /
                              (ability.id === 'focus' ? 6 : 8),
                          )}`,
                        } as CSSProperties
                      }
                    />
                  )}
                </button>
              );
            })}
          </section>
        </div>
      )}
    </div>
  );
}
