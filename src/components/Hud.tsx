import type { CSSProperties } from 'react';
import { LEECH, POWERUPS, UPGRADE_DEFS } from '../game/config';
import type { GameEngine } from '../game/engine';
import { MODE_META, MUTATOR_META } from '../game/modes';
import type { AbilityId, BiomeId, HudSnapshot } from '../game/types';
import { formatScore, formatTime, pad2 } from '../utils/format';
import {
  AntIcon,
  BoltIcon,
  CrosshairIcon,
  FocusIcon,
  MortarIcon,
  PauseIcon,
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
  mortar: <MortarIcon className="ability-icon" />,
};

const BIOME_LABELS: Record<BiomeId, string> = {
  dusk: 'DUSK PINE PASS',
  night: 'BIOLUMINESCENT NIGHT',
  ash: 'ASH & EMBER WASTE',
};

function weaponTierName(combo: number, powered: boolean): string {
  if (powered || combo >= 10) return 'TIER III • RAIL-RIFLE';
  if (combo >= 5) return 'TIER II • CARBINE';
  return 'TIER I • SERVICE PISTOL';
}

function abilityStatus(
  id: AbilityId,
  cooldown: number,
  active: number,
  charges: number,
): string {
  if (id === 'power' && charges > 0) return `${charges} RND`;
  if (active > 0 && id === 'mortar') return 'INBOUND';
  if (active > 0 && id !== 'power') return `${Math.ceil(active)}S`;
  if (cooldown > 0) return `${Math.ceil(cooldown)}S`;
  return 'READY';
}

export function Hud({ hud, engine }: HudProps) {
  const healthPct = Math.max(
    0,
    Math.min(100, (hud.health / hud.maxHealth) * 100),
  );
  const critical = hud.health <= 30 && hud.mode !== 'zen';
  const word = hud.targetWord;
  const typed = hud.typed;
  const progress =
    word.length > 0 ? Math.min(1, typed.length / word.length) : 0;
  const playing = hud.phase === 'playing' || hud.phase === 'paused';
  const overdriveActive = hud.overdriveSeconds > 0;
  const overdrivePct = Math.round(Math.min(1, hud.overdrive) * 100);

  if (hud.phase === 'menu') return null;

  return (
    <div
      className={`hud-layer ${critical && playing ? 'is-critical' : ''} ${
        overdriveActive ? 'is-overdrive' : ''
      }`}
    >
      <div className="hud-top">
        <section className="hud-left">
          <div className="health-panel">
            <div className="portrait-wrap">
              <StickmanPortrait className="portrait" />
              <span className="portrait-tick" />
            </div>
            <div className="health-body">
              <div className="health-heading">
                <span className="micro-label">
                  {hud.mode === 'zen' ? 'ZEN DRILL • IMMORTAL' : 'VITALITY'}
                </span>
                <span className="health-number">
                  {hud.mode === 'zen' ? (
                    '∞'
                  ) : (
                    <>
                      {Math.ceil(hud.health)}
                      <small>/{hud.maxHealth}</small>
                    </>
                  )}
                </span>
              </div>
              <div
                className={`health-track ${critical ? 'health-critical' : ''}`}
              >
                <div
                  className="health-fill"
                  style={{
                    width: `${hud.mode === 'zen' ? 100 : healthPct}%`,
                  }}
                />
                <div className="health-ticks" />
              </div>
              <div className="health-meta-row">
                <span className="weapon-tier-pill">
                  {weaponTierName(
                    hud.combo,
                    hud.powerCharges > 0 || overdriveActive,
                  )}
                </span>
                {hud.hasDrone && <span className="drone-pill">DRONE ONLINE</span>}
              </div>
              {hud.activeUpgrades.length > 0 && (
                <div className="upgrade-strip" aria-label="Equipped upgrades">
                  {hud.activeUpgrades.map((id) => (
                    <span
                      key={id}
                      className="upgrade-chip"
                      title={UPGRADE_DEFS[id].description}
                    >
                      {UPGRADE_DEFS[id].name.split(' ')[0]}
                    </span>
                  ))}
                </div>
              )}
            </div>
          </div>
        </section>

        <section className="hud-center">
          <div className={`wave-panel ${hud.bossWave ? 'is-boss-wave' : ''}`}>
            <span className="micro-label center-label">
              {MODE_META[hud.mode].icon} {MODE_META[hud.mode].label} •{' '}
              {BIOME_LABELS[hud.biome]}
            </span>
            <div className="wave-line">
              <span className="wave-word">WAVE</span>
              <span className="wave-number">{pad2(hud.wave)}</span>
              <span className="wave-divider" />
              <span className="wave-time">{formatTime(hud.elapsed)}</span>
            </div>
            <div className="wave-track">
              <div
                className="wave-fill"
                style={{ width: `${hud.waveProgress * 100}%` }}
              />
            </div>
            <div className="wave-sub">
              {hud.bossWave
                ? 'ROYAL ASSAULT — QUEEN ON FIELD'
                : hud.mutators.length > 0
                  ? hud.mutators
                      .map((m) => `${MUTATOR_META[m].icon} ${MUTATOR_META[m].label}`)
                      .join(' • ')
                  : 'THE COLONY ADVANCES'}
            </div>
          </div>
        </section>

        <section className="hud-right">
          <div className="stat-panel">
            <div className="stat-row">
              <AntIcon className="stat-icon" />
              <div>
                <span className="micro-label">ELIMINATED</span>
                <span className="stat-value">
                  {String(hud.eliminated).padStart(3, '0')}
                </span>
              </div>
            </div>
            <span className="stat-rule" />
            <div className="stat-row">
              <div>
                <span className="micro-label">
                  SCORE{' '}
                  {hud.scoreMultiplier > 1
                    ? `×${hud.scoreMultiplier.toFixed(2)}`
                    : ''}
                </span>
                <span className="stat-value score-value">
                  {formatScore(hud.score)}
                </span>
              </div>
            </div>
            {(hud.combo > 1 ||
              overdriveActive ||
              hud.scoreSurgeSeconds > 0 ||
              hud.leechDraining) && (
              <div className="status-chips">
                {hud.combo > 1 && (
                  <span className="combo-chip">STREAK {hud.combo}</span>
                )}
                {overdriveActive && (
                  <span className="status-chip overdrive-chip">
                    OVERDRIVE {Math.ceil(hud.overdriveSeconds)}S
                  </span>
                )}
                {hud.scoreSurgeSeconds > 0 && (
                  <span className="status-chip surge-chip">
                    SCORE x{POWERUPS.surgeMultiplier}{' '}
                    {Math.ceil(hud.scoreSurgeSeconds)}S
                  </span>
                )}
                {hud.leechDraining && (
                  <span className="status-chip leech-chip">
                    LEECH -{LEECH.drainPerTick}/S
                  </span>
                )}
              </div>
            )}
          </div>
          {hud.phase === 'playing' && (
            <button
              type="button"
              className="icon-button pause-button"
              aria-label="Pause game"
              onClick={() => engine.togglePause()}
              onMouseDown={(event) => event.preventDefault()}
            >
              <PauseIcon className="pause-icon" />
            </button>
          )}
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

      {hud.toasts.length > 0 && (
        <div className="toast-stack" aria-live="polite">
          {hud.toasts.map((toast) => (
            <div key={toast.key} className="achievement-toast">
              <span className="toast-icon">{toast.icon}</span>
              <div className="toast-copy">
                <span className="toast-kicker">MEDAL UNLOCKED</span>
                <strong>{toast.title}</strong>
                <span>{toast.subtitle}</span>
              </div>
            </div>
          ))}
        </div>
      )}

      {hud.streakPop && (
        <div
          key={hud.streakPop.key}
          className="streak-callout"
          aria-hidden="true"
        >
          <span>{hud.streakPop.value}× STREAK</span>
        </div>
      )}

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
            <span className="micro-label">TACTICAL TELEMETRY</span>
            <div className="hint-row">
              <kbd>A–Z</kbd>
              <span>LOCK &amp; FIRE</span>
              <kbd>CRIT ★</kbd>
              <span>CLEAN BLAST</span>
            </div>
            <div className="hint-row">
              <kbd>1</kbd>
              <span>FOCUS</span>
              <kbd>2</kbd>
              <span>AEGIS</span>
              <kbd>3</kbd>
              <span>POWER</span>
              <kbd>4</kbd>
              <span>MORTAR</span>
            </div>
            <div className="overdrive-bar-wrap">
              <div className="overdrive-bar-head">
                <span className="micro-label">
                  {overdriveActive ? 'OVERDRIVE ENGAGED' : 'OVERDRIVE CAPACITOR'}
                </span>
                <span className="overdrive-pct">
                  {overdriveActive
                    ? `2× SCORE • +1 DMG (${Math.ceil(hud.overdriveSeconds)}S)`
                    : `${overdrivePct}%`}
                </span>
              </div>
              <div
                className={`overdrive-track ${
                  overdriveActive ? 'is-active' : ''
                }`}
              >
                <div
                  className="overdrive-fill"
                  style={{ width: `${overdrivePct}%` }}
                />
              </div>
            </div>
          </section>

          <section
            key={hud.mistakes}
            className={`typing-panel ${hud.targetSelected ? 'has-target' : ''} ${
              hud.targetIsPickup || hud.targetIsAcid ? 'is-pickup' : ''
            } ${hud.inputError ? 'is-error' : ''} ${
              overdriveActive ? 'is-overdrive' : ''
            }`}
          >
            <div className="typing-head">
              <span className="typing-mode">
                {hud.targetSelected ? (
                  <>
                    <CrosshairIcon className="typing-crosshair" />
                    {hud.targetIsPickup
                      ? 'SUPPLY DROP — TYPE TO CLAIM'
                      : hud.targetIsAcid
                        ? 'ACID GLOB — TYPE TO INTERCEPT'
                        : hud.targetCritical
                          ? 'CRITICAL TARGET ★ — CLEAN KILL FOR AOE BLAST'
                          : overdriveActive
                            ? 'OVERDRIVE LOCK — 2× SCORE & +1 DMG'
                            : 'TARGET LOCKED'}
                  </>
                ) : overdriveActive ? (
                  'OVERDRIVE ACTIVE — TYPE ANY WORD'
                ) : (
                  'TYPE TO FIRE'
                )}
              </span>
              <span className="typing-meta">
                <span className="live-stat">
                  <strong className="live-stat-value">{hud.grade}</strong>
                  <span className="live-stat-label">GRADE</span>
                </span>
                <span className="live-stat">
                  <strong className="live-stat-value">
                    {Math.round(hud.accuracy)}
                    <i>%</i>
                  </strong>
                  <span className="live-stat-label">ACCURACY</span>
                </span>
                <span className="live-stat">
                  <strong className="live-stat-value">
                    {hud.wpm}
                    <i>WPM</i>
                  </strong>
                  <span className="live-stat-label">SPEED</span>
                </span>
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
                <span className="typing-alert">
                  {hud.mutators.includes('nobackspace') && hud.typed.length > 0
                    ? 'NO RETREAT ACTIVE — BACKSPACE LOCKED'
                    : 'MISFIRE — RECOVER AND KEEP TYPING'}
                </span>
              ) : (
                <>
                  <span>
                    {hud.mutators.includes('nobackspace')
                      ? 'NO BACKSPACE'
                      : 'BACKSPACE ERASE'}
                  </span>
                  <span>ESC PAUSE</span>
                  <span>1–4 TACTICAL ABILITIES</span>
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
              const cdRatio =
                cooling && ability.maxCooldown > 0
                  ? Math.min(1, ability.cooldown / ability.maxCooldown)
                  : 0;
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
                  {cooling && (
                    <span
                      className="ability-cd-sweep"
                      style={{ height: `${cdRatio * 100}%` }}
                    />
                  )}
                  <span className="ability-key">{ability.key}</span>
                  <span className="ability-glyph">
                    {ABILITY_ICONS[ability.id]}
                  </span>
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
                  {active && ability.id !== 'power' && ability.maxActive > 0 && (
                    <span
                      className="ability-timer"
                      style={
                        {
                          '--active-ratio': `${Math.min(
                            1,
                            ability.active / ability.maxActive,
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
