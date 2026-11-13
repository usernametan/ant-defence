import type { TerritoriesSnapshot } from '../../game/systems/TerritorySystem';

export function TerritoryPanel({
  territories,
}: {
  territories: TerritoriesSnapshot;
}) {
  const territory =
    territories.territories.find(
      (entry) =>
        entry.id === territories.activeTerritoryId &&
        entry.state !== 'secured',
    ) ??
    territories.territories.find((entry) => entry.state !== 'secured') ??
    territories.territories.find(
      (entry) => entry.id === territories.activeTerritoryId,
    );

  if (!territory) {
    return null;
  }

  const nests = territories.nests.filter((nest) =>
    territory.requiredNestIds.includes(nest.id),
  );
  const nodesTotal = nests.reduce((total, nest) => total + nest.nodeCount, 0);
  const nodesDestroyed = nests.reduce(
    (total, nest) => total + nest.destroyedNodes,
    0,
  );
  const capture = Math.round(territory.captureProgress * 100);

  return (
    <aside
      className={`mf-territory-panel is-${territory.state}`}
      aria-label="Territory control"
    >
      <p className="mf-territory-kicker">
        Territory <span>{territory.state}</span>
      </p>
      <h2>{territory.name}</h2>
      <div className="mf-territory-signals">
        <span>
          Nests <strong>{territory.clearedNestCount}/{territory.requiredNestIds.length}</strong>
        </span>
        <span>
          Nodes <strong>{nodesDestroyed}/{nodesTotal}</strong>
        </span>
        <span>
          Haven <strong>{territory.safeZone.active ? 'Online' : 'Locked'}</strong>
        </span>
      </div>
      <div className="mf-territory-meter-row">
        <span>{territory.state === 'secured' ? 'Secured' : 'Capture'}</span>
        <span className="mf-territory-meter" aria-hidden="true">
          <span
            className="mf-territory-meter-fill"
            style={{ width: `${territory.state === 'secured' ? 100 : capture}%` }}
          />
        </span>
        <strong>{territory.state === 'secured' ? '100%' : `${capture}%`}</strong>
      </div>
      <small className="mf-territory-note">
        {territory.state === 'hostile'
          ? 'Clear the Bloom Nest to open the capture window.'
          : territory.state === 'contested'
            ? 'Destroy every Bloom Node to break the nest.'
            : territory.state === 'securing'
              ? 'Hold the watchpost until the territory is secured.'
              : `${territory.safeZone.name} is online. Ambient spawns suppressed.`}
      </small>
    </aside>
  );
}
