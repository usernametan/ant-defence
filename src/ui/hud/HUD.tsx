import React, { useEffect, useRef, useState } from 'react';
import type { ViewTransform } from '../../render';
import { WEAPON_DEFS } from '../../shared/api';
import { bus } from '../../shared/events';
import type { GameState, Pickup, Team, WeaponId } from '../../shared/types';
import { AnimatedNumber, Badge, Icon, KeyCap, Panel } from '../design';
import type { CrosshairStyle } from '../settingsStore';
import { ActionBar } from './ActionBar';
import { CrosshairOverlay } from './Crosshair';
import type { DamageIndicator } from './Crosshair';
import { KillFeed } from './KillFeed';
import type { KillFeedEntry } from './KillFeed';
import { MatchHints } from './MatchHints';
import { Minimap } from './Minimap';
import type { ZonePing } from './Minimap';
import { ObjectivesCard } from './ObjectivesCard';
import { OperatorCard } from './OperatorCard';
import { WeaponCard } from './WeaponCard';
import '../ui.css';

export interface HUDProps {
  state: Readonly<GameState>;
  viewTransform?: ViewTransform | null;
  aimScreenPos?: { x: number; y: number } | null;
  crosshairStyle?: CrosshairStyle;
  colorblindAssist?: boolean;
  showHints?: boolean;
  initialKillFeed?: KillFeedEntry[];
  onStreak?: (count: number) => void;
}

function unitLabel(state: Readonly<GameState>, id: string): { name: string; team: Team } {
  if (id === state.playerId) return { name: 'YOU', team: 'player' };
  const u = state.units.find((unit) => unit.id === id);
  if (!u) return { name: 'RogueBot', team: 'enemy' };
  const idx = state.units.filter((x) => x.team === u.team).indexOf(u) + 1;
  return {
    name: u.team === 'player' ? `Alpha-${idx}` : `Rogue-${idx}`,
    team: u.team,
  };
}

function streakTitle(count: number): string | null {
  if (count === 2) return 'DOUBLE KILL';
  if (count === 3) return 'TRIPLE KILL';
  if (count === 4) return 'MEGA KILL';
  if (count >= 5) return 'RAMPAGE';
  return null;
}

function formatClock(sec: number): string {
  const total = Math.max(0, Math.floor(sec));
  const m = Math.floor(total / 60);
  const s = total % 60;
  return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
}

export const HUD: React.FC<HUDProps> = ({
  state,
  viewTransform = null,
  aimScreenPos = null,
  crosshairStyle = 'tactical',
  colorblindAssist = false,
  showHints = true,
  initialKillFeed = [],
  onStreak,
}) => {
  const player = state.units.find((u) => u.id === state.playerId);
  const prevHpRef = useRef<number>(player?.hp ?? 100);
  const prevWeaponRef = useRef<WeaponId | undefined>(player?.weaponId);

  const [damageFlash, setDamageFlash] = useState(false);
  const [regenGlow, setRegenGlow] = useState(false);
  const [weaponFlipKey, setWeaponFlipKey] = useState(0);
  const [shotKick, setShotKick] = useState(0);
  const [hitFlash, setHitFlash] = useState<'hit' | 'kill' | null>(null);
  const [damageIndicators, setDamageIndicators] = useState<DamageIndicator[]>([]);
  const [captureBanner, setCaptureBanner] = useState<{
    id: number;
    zoneId: string;
    team: Team;
  } | null>(null);
  const [killFeed, setKillFeed] = useState<KillFeedEntry[]>(initialKillFeed);
  const [streakText, setStreakText] = useState<string | null>(null);
  const [zonePings, setZonePings] = useState<ZonePing[]>([]);
  const [lastKiller, setLastKiller] = useState<{ name: string; weaponId: WeaponId } | null>(
    null,
  );

  const streakRef = useRef<{ count: number; expiresAt: number }>({
    count: 0,
    expiresAt: 0,
  });

  useEffect(() => {
    if (!player) return;
    const prev = prevHpRef.current;
    if (player.hp < prev - 0.5) {
      setDamageFlash(true);
      const t = window.setTimeout(() => setDamageFlash(false), 220);
      prevHpRef.current = player.hp;
      return () => window.clearTimeout(t);
    }
    if (player.hp > prev + 0.2 && !player.dead) {
      setRegenGlow(true);
      const t = window.setTimeout(() => setRegenGlow(false), 380);
      prevHpRef.current = player.hp;
      return () => window.clearTimeout(t);
    }
    prevHpRef.current = player.hp;
  }, [player?.hp, player?.dead]);

  useEffect(() => {
    if (player && prevWeaponRef.current && prevWeaponRef.current !== player.weaponId) {
      setWeaponFlipKey((k) => k + 1);
    }
    prevWeaponRef.current = player?.weaponId;
  }, [player?.weaponId]);

  useEffect(() => {
    const id = window.setInterval(() => {
      const now = performance.now();
      setShotKick((k) => Math.max(0, k - 2.2));
      setDamageIndicators((list) =>
        list
          .map((d) => ({ ...d, ttl: d.ttl - 0.08 }))
          .filter((d) => d.ttl > 0),
      );
      setZonePings((list) => list.filter((p) => p.until > now));
    }, 60);
    return () => window.clearInterval(id);
  }, []);

  useEffect(() => {
    let seq = 100;
    const offShot = bus.on('shot', ({ unitId }) => {
      if (unitId === state.playerId) {
        setShotKick((k) => Math.min(14, k + 5));
      }
    });

    const offHit = bus.on('hit', ({ targetId, pos, killed }) => {
      if (targetId === state.playerId && player) {
        const angle = Math.atan2(pos.y - player.pos.y, pos.x - player.pos.x);
        const indId = seq++;
        setDamageIndicators((prev) => [...prev.slice(-3), { id: indId, angleRad: angle, ttl: 0.9 }]);
      } else if (targetId !== state.playerId) {
        setHitFlash(killed ? 'kill' : 'hit');
        window.setTimeout(() => setHitFlash(null), killed ? 240 : 120);
      }
    });

    const offKill = bus.on('kill', ({ killerId, victimId, weaponId }) => {
      const k = unitLabel(state, killerId);
      const v = unitLabel(state, victimId);
      const entryId = seq++;
      setKillFeed((prev) => [
        {
          id: entryId,
          killerName: k.name,
          killerTeam: k.team,
          victimName: v.name,
          victimTeam: v.team,
          weaponId,
        },
        ...prev.slice(0, 3),
      ]);
      window.setTimeout(() => {
        setKillFeed((prev) => prev.filter((item) => item.id !== entryId));
      }, 5500);

      if (victimId === state.playerId) {
        setLastKiller({ name: k.name, weaponId });
        streakRef.current = { count: 0, expiresAt: 0 };
      }

      if (killerId === state.playerId) {
        const now = performance.now();
        const nextCount =
          now < streakRef.current.expiresAt ? streakRef.current.count + 1 : 1;
        streakRef.current = { count: nextCount, expiresAt: now + 5000 };
        const label = streakTitle(nextCount);
        if (label) {
          setStreakText(label);
          onStreak?.(nextCount);
          window.setTimeout(() => setStreakText(null), 2200);
        }
      }
    });

    const offCap = bus.on('zone:captured', ({ zoneId, team }) => {
      const bid = seq++;
      setCaptureBanner({ id: bid, zoneId, team });
      window.setTimeout(() => {
        setCaptureBanner((cur) => (cur?.id === bid ? null : cur));
      }, 2400);
    });

    const offContested = bus.on('zone:contested', ({ zoneId }) => {
      const until = performance.now() + 2600;
      setZonePings((prev) => [
        ...prev.filter((p) => p.zoneId !== zoneId),
        { zoneId, until },
      ]);
    });

    return () => {
      offShot();
      offHit();
      offKill();
      offCap();
      offContested();
    };
  }, [state.playerId, state.units, player, onStreak]);

  const hp = player?.hp ?? 0;
  const maxHp = player?.maxHp ?? 100;
  const hpRatio = maxHp > 0 ? hp / maxHp : 0;
  const isLowHp = Boolean(player && !player.dead && hpRatio > 0 && hpRatio < 0.3);

  const weaponDef = player ? WEAPON_DEFS[player.weaponId] : WEAPON_DEFS.pistol;
  const isLowAmmo = Boolean(
    player && player.ammoInMag <= Math.max(1, Math.floor(weaponDef.magSize * 0.25)),
  );

  let nearbyPickup: Pickup | null = null;
  if (player && !player.dead) {
    let bestDist = 56;
    for (const p of state.pickups) {
      const d = Math.hypot(p.pos.x - player.pos.x, p.pos.y - player.pos.y);
      if (d < bestDist) {
        bestDist = d;
        nearbyPickup = p;
      }
    }
  }

  const speed = player ? Math.hypot(player.vel.x, player.vel.y) : 0;
  const crosshairGap = 5 + weaponDef.spread * 36 + speed * 0.02 + shotKick;

  const contestedZones = state.map.zones.filter((def) => {
    const zs = state.zones.find((z) => z.id === def.id);
    return zs?.contested && player;
  });

  const safeZone = state.zones.find((z) => z.owner === 'player')?.id ?? 'HQ';

  // Shield / tactical capacitor bar derived cleanly from player vitality & base integrity
  const shieldMax = 50;
  const shieldVal = player?.dead ? 0 : Math.min(shieldMax, Math.round((state.baseHp.player / 500) * 50));

  return (
    <div className="ht-root">
      {isLowHp && <div className="ht-heartbeat-vignette" aria-hidden="true" />}

      {!player?.dead && (
        <CrosshairOverlay
          screenPos={aimScreenPos}
          style={crosshairStyle}
          gap={crosshairGap}
          hitFlash={hitFlash}
          damageIndicators={damageIndicators}
        />
      )}

      {/* Edge-of-screen directional indicators to contested zones */}
      {player &&
        contestedZones.map((def) => {
          const angle = Math.atan2(
            def.center.y - player.pos.y,
            def.center.x - player.pos.x,
          );
          const rx = Math.cos(angle) * 240;
          const ry = Math.sin(angle) * 155;
          return (
            <div
              key={`arrow-${def.id}`}
              style={{
                position: 'fixed',
                left: '50%',
                top: '50%',
                transform: `translate(${rx - 18}px, ${ry - 18}px)`,
                zIndex: 'var(--z-hud)',
                pointerEvents: 'none',
              }}
            >
              <Badge tone="gold">
                <Icon name="warning" size={12} /> {def.id}
              </Badge>
            </div>
          );
        })}

      {/* Zone Capture Banner */}
      {captureBanner && (
        <div key={captureBanner.id} className="ht-capture-banner">
          <Panel
            bracketed
            tone={captureBanner.team === 'player' ? 'default' : 'enemy'}
            style={{
              padding: '10px 28px',
              boxShadow:
                captureBanner.team === 'player'
                  ? 'var(--glow-player)'
                  : 'var(--glow-enemy)',
            }}
          >
            <span
              className="ht-display"
              style={{
                fontSize: 16,
                color:
                  captureBanner.team === 'player'
                    ? 'var(--player-glow)'
                    : 'var(--enemy-glow)',
              }}
            >
              ZONE {captureBanner.zoneId} CAPTURED
            </span>
          </Panel>
        </div>
      )}

      <div className="ht-hud-layer">
        {/* Top Left: Kill Feed Panel + First-Match Hints */}
        <div className="ht-hud-top-left ht-hud-scaled">
          <KillFeed entries={killFeed} streakText={streakText} />
          <MatchHints enabled={showHints} />
        </div>

        {/* Top Center: Winged Scoreboard + Timer */}
        <div className="ht-hud-top-center ht-hud-scaled">
          <div className="ht-scoreboard-shell">
            <div className="ht-score-wing ht-score-wing--player">
              <svg width={20} height={20} viewBox="0 0 24 24" fill="var(--player)" aria-hidden="true">
                <path d="M12 2L4 5v6.5c0 5 3.4 9.5 8 10.5 4.6-1 8-5.5 8-10.5V5l-8-3z" />
              </svg>
              <span className="ht-display ht-score-val" style={{ color: 'var(--player-glow)' }}>
                <AnimatedNumber value={state.score.player} />
              </span>
            </div>

            <div className="ht-score-center">
              <div className="ht-display ht-score-clock">
                {formatClock(state.time)}
              </div>
              <div className="ht-score-goal">
                Score to Win: {state.matchConfig.scoreToWin}
              </div>
            </div>

            <div className="ht-score-wing ht-score-wing--enemy">
              <span className="ht-display ht-score-val" style={{ color: 'var(--enemy-glow)' }}>
                <AnimatedNumber value={state.score.enemy} />
              </span>
              <Icon name="skull" size={20} color="var(--enemy)" />
            </div>
          </div>
        </div>

        {/* Top Right: Minimap + Objectives Checklist */}
        <div className="ht-hud-top-right ht-hud-scaled">
          <Minimap
            state={state}
            pings={zonePings}
            colorblindAssist={colorblindAssist}
          />
          <ObjectivesCard state={state} />
        </div>

        {/* Bottom Left: Operator Portrait + HP & Shield Bars */}
        <div className="ht-hud-bottom-left ht-hud-scaled">
          <OperatorCard
            hp={hp}
            maxHp={maxHp}
            shield={shieldVal}
            maxShield={shieldMax}
            level={1 + Math.floor((player?.kills ?? 0) / 3)}
            isLowHp={isLowHp}
            damageFlash={damageFlash}
            regenGlow={regenGlow}
          />
        </div>

        {/* Bottom Center: 4 Tactical Action Slots */}
        <div className="ht-hud-bottom-center ht-hud-scaled">
          <ActionBar
            hasNearbyPickup={Boolean(nearbyPickup)}
            reloading={Boolean(player?.reloading)}
            lowAmmo={isLowAmmo}
          />
        </div>

        {/* Bottom Right: Weapon Silhouette & Ammo Card */}
        <div className="ht-hud-bottom-right ht-hud-scaled">
          {player && (
            <WeaponCard
              weaponId={player.weaponId}
              ammoInMag={player.ammoInMag}
              reserveAmmo={player.reserveAmmo}
              reloading={player.reloading}
              reloadProgress={player.reloadProgress}
              flipKey={weaponFlipKey}
            />
          )}
        </div>
      </div>

      {/* Contextual Pickup Prompt */}
      {nearbyPickup && player && (
        <PickupPrompt
          pickup={nearbyPickup}
          currentWeapon={player.weaponId}
          viewTransform={viewTransform}
        />
      )}

      {/* Respawn Overlay */}
      {player?.dead && (
        <div className="ht-blur-backdrop">
          <Panel
            bracketed
            tone="enemy"
            style={{
              padding: 28,
              width: 'min(380px, 100%)',
              textAlign: 'center',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: 12,
            }}
          >
            <Badge tone="enemy">OPERATOR DOWN</Badge>
            <svg width={88} height={88} viewBox="0 0 88 88">
              <circle
                cx={44}
                cy={44}
                r={36}
                fill="none"
                stroke="var(--line)"
                strokeWidth={5}
              />
              <circle
                cx={44}
                cy={44}
                r={36}
                fill="none"
                stroke="var(--player)"
                strokeWidth={5}
                strokeDasharray={226}
                strokeDashoffset={226 * (1 - Math.min(1, player.respawnIn / 4))}
                transform="rotate(-90 44 44)"
              />
              <text
                x={44}
                y={49}
                textAnchor="middle"
                fill="var(--text-hi)"
                fontSize={22}
                fontWeight={800}
              >
                {Math.ceil(player.respawnIn)}
              </text>
            </svg>
            <div className="ht-display" style={{ fontSize: 15, color: 'var(--player-glow)' }}>
              Respawning at Zone {safeZone}
            </div>
            {lastKiller && (
              <div style={{ fontSize: 12, color: 'var(--text-mid)' }}>
                Eliminated by{' '}
                <strong style={{ color: 'var(--enemy-glow)' }}>{lastKiller.name}</strong>{' '}
                ({WEAPON_DEFS[lastKiller.weaponId].name})
              </div>
            )}
          </Panel>
        </div>
      )}
    </div>
  );
};

interface PickupPromptProps {
  pickup: Pickup;
  currentWeapon: WeaponId;
  viewTransform: ViewTransform | null;
}

const PickupPrompt: React.FC<PickupPromptProps> = ({
  pickup,
  currentWeapon,
  viewTransform,
}) => {
  const newDef = WEAPON_DEFS[pickup.weaponId];
  const curDef = WEAPON_DEFS[currentWeapon];
  const dmgDiff = newDef.damage * newDef.pellets - curDef.damage * curDef.pellets;
  const rofDiff = newDef.fireRate - curDef.fireRate;
  const rngDiff = newDef.range - curDef.range;

  const screen = viewTransform?.worldToScreen(pickup.pos.x, pickup.pos.y);

  const style: React.CSSProperties = screen
    ? {
        position: 'fixed',
        left: screen.x,
        top: screen.y - 54,
        transform: 'translate(-50%, -100%)',
        zIndex: 'var(--z-toast)',
        pointerEvents: 'none',
      }
    : {
        position: 'fixed',
        left: '50%',
        bottom: 108,
        transform: 'translateX(-50%)',
        zIndex: 'var(--z-toast)',
        pointerEvents: 'none',
      };

  const renderDelta = (label: string, diff: number) => {
    const arrow = diff > 0 ? '▲' : diff < 0 ? '▼' : '•';
    const color =
      diff > 0 ? 'var(--success)' : diff < 0 ? 'var(--danger)' : 'var(--text-mid)';
    return (
      <span style={{ fontSize: 10, color, fontWeight: 700 }}>
        {arrow} {label}
      </span>
    );
  };

  return (
    <div style={style}>
      <Panel
        style={{
          padding: '8px 12px',
          borderColor: `var(--${pickup.rarity})`,
          display: 'flex',
          flexDirection: 'column',
          gap: 4,
          boxShadow: 'var(--shadow-lg)',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12 }}>
          <KeyCap label="E" />
          <span>
            Swap for{' '}
            <strong style={{ color: `var(--${pickup.rarity})` }}>
              {newDef.name} ({newDef.rarity})
            </strong>
          </span>
        </div>
        <div style={{ display: 'flex', gap: 10, justifyContent: 'center' }}>
          {renderDelta('DMG', dmgDiff)}
          {renderDelta('ROF', rofDiff)}
          {renderDelta('RNG', rngDiff)}
        </div>
      </Panel>
    </div>
  );
};
