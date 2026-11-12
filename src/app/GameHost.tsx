import { useEffect, useRef, useState } from 'react';
import { GAME_IDENTITY, PROTOTYPE_CHECKS } from '../game/content';
import { Game } from '../game/Game';
import {
  selectArmorPercent,
  selectCameraReadout,
  selectDodgeLabel,
  selectDodgeReady,
  selectEnemiesReadout,
  selectEnergyPercent,
  selectEquipmentUsed,
  selectFireFailureLabel,
  selectHealthPercent,
  selectPhaseLabel,
  selectPlayerReadout,
  selectStaminaPercent,
  selectTargetsReadout,
  selectWeaponStatus,
  type UiSnapshot,
} from '../game/ui/UiSnapshot';
import { useGameSnapshot } from './useGameSnapshot';

export function GameHost() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [game, setGame] = useState<Game | null>(null);
  const snapshot = useGameSnapshot(game?.snapshots ?? null);

  useEffect(() => {
    const canvas = canvasRef.current;

    if (!canvas) {
      return undefined;
    }

    const instance = new Game(canvas);
    setGame(instance);
    instance.start();

    return () => {
      instance.destroy();
      setGame(null);
    };
  }, []);

  return (
    <div className="game-shell" data-game="monster-frontier">
      <div className="game-frame">
        <canvas
          ref={canvasRef}
          className="game-canvas"
          aria-label="Monster Frontier Greenreach world"
        />
        {snapshot.phase === 'menu' && (
          <MenuScreen snapshot={snapshot} game={game} />
        )}
        {snapshot.phase !== 'menu' && (
          <Hud snapshot={snapshot} game={game} />
        )}
        {snapshot.phase === 'paused' && (
          <PauseScreen snapshot={snapshot} game={game} />
        )}
        <div className="frame-edge" aria-hidden="true" />
      </div>
    </div>
  );
}

interface ScreenProps {
  snapshot: UiSnapshot;
  game: Game | null;
}

function MenuScreen({ snapshot, game }: ScreenProps) {
  return (
    <section className="mf-screen mf-menu" aria-labelledby="mf-menu-title">
      <div className="mf-menu-panel">
        <header className="mf-menu-header">
          <p className="mf-kicker">
            {snapshot.kicker}
            <span className="mf-kicker-divider" />
            {snapshot.stage}
          </p>
          <h1 className="mf-wordmark" id="mf-menu-title">
            {snapshot.title}
          </h1>
          <p className="mf-tagline">{GAME_IDENTITY.tagline}</p>
        </header>

        <div className="mf-actions">
          <button
            type="button"
            className="mf-button mf-button-primary"
            onClick={() => game?.enterPreview()}
            disabled={!game}
          >
            Enter Greenreach
            <kbd>Enter</kbd>
          </button>
          <p className="mf-action-note">
            Stage 7 arms the expedition. Tune three blaster lines with field
            modules, recover salvage from duplicates, and make every trip beyond
            Waystation Echo count.
          </p>
        </div>

        <ul className="mf-checks" aria-label="World and map systems">
          {PROTOTYPE_CHECKS.map((check) => (
            <li key={check.label} className="mf-check">
              <span className="mf-check-signal" aria-hidden="true" />
              <span>
                <strong>{check.label}</strong>
                <small>{check.detail}</small>
              </span>
            </li>
          ))}
        </ul>
      </div>

      <aside className="mf-briefing" aria-label="Greenreach expedition briefing">
        <p className="mf-briefing-label">Contact expected</p>
        <p className="mf-briefing-region">{snapshot.region}</p>
        <p className="mf-briefing-copy">
          Waystation Echo is the last safe landmark in Greenreach. Broken
          roads run east through the watchpost ruins and across the ford, while
          the woods and rocky approach stay creature-held.
        </p>
        <dl className="mf-specs">
          <div>
            <dt>Build</dt>
            <dd>{snapshot.version}</dd>
          </div>
          <div>
            <dt>Step</dt>
            <dd>60 Hz</dd>
          </div>
          <div>
            <dt>Weapons</dt>
            <dd>3 blasters · 3 modules</dd>
          </div>
          <div>
            <dt>Region</dt>
            <dd>Greenreach</dd>
          </div>
          <div>
            <dt>Landmarks</dt>
            <dd>6 mapped</dd>
          </div>
          <div>
            <dt>World</dt>
            <dd>
              {snapshot.world.width} × {snapshot.world.height}
            </dd>
          </div>
        </dl>
        <p className="mf-briefing-footnote">
          WASD move · Shift sprint · Space dodge · LMB fire · 1–3 weapons ·
          I inventory · F3 diagnostics
        </p>
      </aside>
    </section>
  );
}

function Hud({
  snapshot,
  game,
}: {
  snapshot: UiSnapshot;
  game: Game | null;
}) {
  const stamina = selectStaminaPercent(snapshot);
  const health = selectHealthPercent(snapshot);
  const armor = selectArmorPercent(snapshot);
  const dodgeReady = selectDodgeReady(snapshot);
  const notice = snapshot.survival.notice;
  const fireFailure = selectFireFailureLabel(snapshot);

  return (
    <div className="mf-hud" aria-live="polite">
      <div className="mf-hud-top">
        <div className="mf-locator">
          <span className="mf-locator-dot" aria-hidden="true" />
          <span>
            <small>{snapshot.region}</small>
            <strong>{selectPhaseLabel(snapshot)}</strong>
          </span>
        </div>
        <div className="mf-readout">
          <span>
            CAM <strong>{selectCameraReadout(snapshot)}</strong>
          </span>
          <span>
            POS <strong>{selectPlayerReadout(snapshot)}</strong>
          </span>
          <span>
            WPN <strong>{snapshot.combat.weaponSlot + 1}</strong>
          </span>
          <span>
            TGT <strong>{selectTargetsReadout(snapshot)}</strong>
          </span>
          <span>
            ENEMY <strong>{selectEnemiesReadout(snapshot)}</strong>
          </span>
          <span>
            KILLS <strong>{snapshot.combat.kills}</strong>
          </span>
          <span>
            MOD <strong>{selectEquipmentUsed(snapshot)}</strong>
          </span>
          <span>
            FPS <strong>{Math.round(snapshot.fps || 60)}</strong>
          </span>
        </div>
      </div>

      {snapshot.debug && (
        <div className="mf-debug-panel">
          <span>FRAME {snapshot.frame}</span>
          <span>SIM {snapshot.elapsed.toFixed(1)}s</span>
          <span>VEL {snapshot.player.speed.toFixed(0)}</span>
          <span>WEAPON {snapshot.combat.weaponName.toUpperCase()}</span>
          <span>CELL {snapshot.combat.energy.toFixed(0)}</span>
          <span>CD {snapshot.combat.cooldown.toFixed(2)}s</span>
          <span>PROJ {snapshot.combat.projectilesActive}</span>
          <span>TGT {selectTargetsReadout(snapshot)}</span>
          <span>ENEMY {selectEnemiesReadout(snapshot)}</span>
          <span>KILLS {snapshot.combat.kills}</span>
          <span>HP {health}%</span>
          <span>ARM {armor}%</span>
          <span>
            PICKUP {snapshot.survival.pickupsActive}/
            {snapshot.survival.pickupsTotal}
          </span>
          <span>MODULES {selectEquipmentUsed(snapshot)}</span>
          <span>FIRE {fireFailure ?? 'READY'}</span>
          <span>DODGE {snapshot.player.dodgeCooldown.toFixed(2)}s</span>
          <span>STAM {stamina}%</span>
          <span>FPS {snapshot.fps.toFixed(0)}</span>
        </div>
      )}

      <div className="mf-hud-bottom">
        <div className="mf-status-stack">
          <span className="mf-stage-stamp">
            {snapshot.stage} // loadout online
          </span>
          <div className="mf-player-meters">
            <div
              className={`mf-meter-row mf-health-row${snapshot.player.alive ? '' : ' is-downed'}`}
            >
              <span>
                HEALTH <strong>{health}%</strong>
              </span>
              <span className="mf-meter" aria-hidden="true">
                <span
                  className="mf-meter-fill mf-health-fill"
                  style={{ width: `${health}%` }}
                />
              </span>
              {!snapshot.player.alive && (
                <strong className="mf-downed-label">
                  DOWN {snapshot.player.respawnRemaining.toFixed(1)}s
                </strong>
              )}
            </div>
            <div className="mf-meter-row mf-armor-row">
              <span>
                ARMOR <strong>{armor}%</strong>
              </span>
              <span className="mf-meter" aria-hidden="true">
                <span
                  className="mf-meter-fill mf-armor-fill"
                  style={{ width: `${armor}%` }}
                />
              </span>
            </div>
            <div className="mf-meter-row">
              <span>
                STAMINA <strong>{stamina}%</strong>
              </span>
              <span className="mf-meter" aria-hidden="true">
                <span
                  className="mf-meter-fill"
                  style={{ width: `${stamina}%` }}
                />
              </span>
            </div>
            <div
              className={`mf-dodge-chip${dodgeReady ? ' is-ready' : ''}`}
            >
              <span>DODGE</span>
              <strong>{selectDodgeLabel(snapshot)}</strong>
            </div>
          </div>
        </div>

        <WeaponPanel snapshot={snapshot} />

        <LoadoutPanel snapshot={snapshot} />

        {notice && snapshot.player.alive && (
          <div
            className={`mf-survival-notice is-${notice.tone}`}
            role="status"
          >
            <span className="mf-survival-notice-pulse" aria-hidden="true" />
            <strong>{notice.text}</strong>
            <small>{Math.max(0, notice.remaining).toFixed(1)}s</small>
          </div>
        )}

        <span className="mf-hud-controls">
          <kbd>WASD</kbd> move <span aria-hidden="true">·</span>{' '}
          <kbd>Shift</kbd> sprint <span aria-hidden="true">·</span>{' '}
          <kbd>Space</kbd> dodge <span aria-hidden="true">·</span>{' '}
          <kbd>LMB</kbd> fire <span aria-hidden="true">·</span>{' '}
          <kbd>1–3</kbd> weapon <span aria-hidden="true">·</span>{' '}
          <kbd>I</kbd> inventory <span aria-hidden="true">·</span>{' '}
          <kbd>Esc</kbd> pause <span aria-hidden="true">·</span>{' '}
          <kbd>F3</kbd> debug
        </span>
      </div>

      {snapshot.inventory.open && (
        <InventoryScreen snapshot={snapshot} game={game} />
      )}

      {!snapshot.player.alive && (
        <div className="mf-death-overlay" role="status" aria-live="assertive">
          <span className="mf-death-kicker">Signal lost</span>
          <strong>Redeploying in {snapshot.player.respawnRemaining.toFixed(1)}s</strong>
          <span className="mf-death-detail">
            Waystation Echo uplink · health and plating restored
          </span>
        </div>
      )}
    </div>
  );
}

const EQUIPMENT_SLOTS = [
  { id: 'plating', label: 'Plating' },
  { id: 'mobility', label: 'Mobility' },
  { id: 'regulator', label: 'Regulator' },
] as const;

function LoadoutPanel({ snapshot }: { snapshot: UiSnapshot }) {
  const equippedBySlot = new Map(
    snapshot.inventory.equipped.map((item) => [item.slot, item]),
  );

  return (
    <div className="mf-loadout-panel" aria-label="Equipped modules">
      <div className="mf-loadout-heading">
        <span>LOADOUT</span>
        <strong>{selectEquipmentUsed(snapshot)}</strong>
      </div>
      <div className="mf-loadout-slots">
        {EQUIPMENT_SLOTS.map((slot) => {
          const equipped = equippedBySlot.get(slot.id);

          return (
            <span
              key={slot.id}
              className={`mf-loadout-slot${equipped ? ' is-filled' : ''}`}
              title={equipped?.description}
            >
              <small>{slot.label}</small>
              <strong>{equipped?.name ?? 'Empty'}</strong>
            </span>
          );
        })}
      </div>
      <span className="mf-loadout-hint">
        <kbd>I</kbd> manage inventory
      </span>
    </div>
  );
}

function InventoryScreen({
  snapshot,
  game,
}: {
  snapshot: UiSnapshot;
  game: Game | null;
}) {
  const equippedBySlot = new Map(
    snapshot.inventory.equipped.map((item) => [item.slot, item]),
  );

  return (
    <div className="mf-inventory" role="dialog" aria-modal="true" aria-labelledby="mf-inventory-title">
      <div className="mf-inventory-card">
        <header className="mf-inventory-header">
          <div>
            <p className="mf-kicker">Field loadout</p>
            <h2 id="mf-inventory-title">Inventory</h2>
          </div>
          <button
            type="button"
            className="mf-inventory-close"
            onClick={() => game?.toggleInventory()}
          >
            Close <kbd>I</kbd>
          </button>
        </header>

        <div className="mf-inventory-grid">
          <section aria-labelledby="mf-inventory-weapons">
            <div className="mf-inventory-section-heading">
              <h3 id="mf-inventory-weapons">Weapons</h3>
              <span>{snapshot.combat.weaponCount} lines</span>
            </div>
            <ul className="mf-inventory-list">
              {snapshot.inventory.weapons.map((weapon) => (
                <li
                  key={weapon.id}
                  className={`mf-inventory-item${weapon.selected ? ' is-selected' : ''}`}
                >
                  <span className="mf-inventory-item-main">
                    <span className="mf-inventory-item-title">
                      <kbd>{weapon.slot + 1}</kbd>
                      <strong>{weapon.name}</strong>
                      {weapon.selected && <em>Active</em>}
                      {!weapon.owned && <em>Offline</em>}
                    </span>
                    <small>{weapon.description}</small>
                  </span>
                  <span className="mf-inventory-stat">
                    {Math.round(weapon.range)} R
                    <small>{weapon.energyCost} cell</small>
                  </span>
                </li>
              ))}
            </ul>
          </section>

          <section aria-labelledby="mf-inventory-equipment">
            <div className="mf-inventory-section-heading">
              <h3 id="mf-inventory-equipment">Modules</h3>
              <span>{selectEquipmentUsed(snapshot)} stored</span>
            </div>
            <div className="mf-inventory-equipped">
              {EQUIPMENT_SLOTS.map((slot) => {
                const equipped = equippedBySlot.get(slot.id);

                return (
                  <div
                    key={slot.id}
                    className={`mf-inventory-slot${equipped ? ' is-filled' : ''}`}
                  >
                    <span>
                      <small>{slot.label}</small>
                      <strong>{equipped?.name ?? 'Empty socket'}</strong>
                    </span>
                    {equipped && (
                      <button
                        type="button"
                        className="mf-inventory-action"
                        onClick={() => game?.unequipInventorySlot(slot.id)}
                      >
                        Unequip
                      </button>
                    )}
                  </div>
                );
              })}
            </div>

            <div className="mf-inventory-section-heading mf-inventory-stored-heading">
              <h3>Stored</h3>
              <span>{snapshot.inventory.stored.length}</span>
            </div>
            {snapshot.inventory.stored.length === 0 ? (
              <p className="mf-inventory-empty">
                No spare modules. Recover frontier equipment to expand the
                loadout.
              </p>
            ) : (
              <ul className="mf-inventory-list">
                {snapshot.inventory.stored.map((item) => (
                  <li key={item.id} className="mf-inventory-item">
                    <span className="mf-inventory-item-main">
                      <span className="mf-inventory-item-title">
                        <strong>{item.name}</strong>
                        <em>{item.slot}</em>
                      </span>
                      <small>{item.description}</small>
                    </span>
                    <button
                      type="button"
                      className="mf-inventory-action"
                      onClick={() => game?.equipInventoryItem(item.id)}
                    >
                      Equip
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </div>

        <footer className="mf-inventory-footer">
          <span>One module per socket · equipped effects are live</span>
          <span>
            Capacity <strong>{selectEquipmentUsed(snapshot)}</strong>
          </span>
        </footer>
      </div>
    </div>
  );
}

function WeaponPanel({ snapshot }: { snapshot: UiSnapshot }) {
  const energy = selectEnergyPercent(snapshot);
  const status = selectWeaponStatus(snapshot);
  const { combat } = snapshot;

  return (
    <div
      className={`mf-weapon-panel${combat.ready ? ' is-ready' : ''}`}
      aria-label="Current weapon"
    >
      <div className="mf-weapon-heading">
        <span className="mf-weapon-index">
          WPN {combat.weaponSlot + 1}/{combat.weaponCount}
        </span>
        <strong>{combat.weaponName}</strong>
        <span className="mf-weapon-status">{status}</span>
      </div>
      <div className="mf-weapon-energy">
        <span>
          CELL <strong>{Math.round(combat.energy)}</strong> / {combat.maxEnergy}
        </span>
        <span className="mf-meter mf-weapon-meter" aria-hidden="true">
          <span
            className="mf-meter-fill"
            style={{ width: `${energy}%` }}
          />
        </span>
      </div>
      <div className="mf-weapon-slots">
        {combat.weapons.map((weapon) => (
          <span
            key={weapon.id}
            className={`mf-weapon-slot${weapon.selected ? ' is-selected' : ''}`}
          >
            <kbd>{weapon.slot + 1}</kbd>
            {weapon.name}
          </span>
        ))}
      </div>
    </div>
  );
}

function PauseScreen({ snapshot, game }: ScreenProps) {
  return (
    <div className="mf-screen mf-pause">
      <div className="mf-pause-card">
        <p className="mf-kicker">Signal held</p>
        <h2>Expedition paused</h2>
        <p>
          The {snapshot.region} expedition is suspended. Resume when you are
          ready to continue exploring the wilds.
        </p>
        <div className="mf-pause-actions">
          <button
            type="button"
            className="mf-button mf-button-primary"
            onClick={() => game?.resume()}
          >
            Resume
            <kbd>Esc</kbd>
          </button>
          <button
            type="button"
            className="mf-button mf-button-quiet"
            onClick={() => game?.returnToMenu()}
          >
            Return to menu
          </button>
        </div>
        <p className="mf-pause-footnote">
          Stage 7 / Equipment & Inventory · build {snapshot.version}
        </p>
      </div>
    </div>
  );
}
