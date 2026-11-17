import type {
  MissionObjectiveSnapshot,
  MissionSnapshot,
} from '../../game/systems/MissionSystem';

export function MissionTracker({ mission }: { mission: MissionSnapshot }) {
  return (
    <aside className="mf-mission-tracker" aria-label="Active mission">
      <p className="mf-mission-kicker">
        Field order <span>{mission.status}</span>
      </p>
      <h2>{mission.title}</h2>
      <p className="mf-mission-copy">{mission.description}</p>
      <ul className="mf-mission-objectives">
        {mission.objectives.map((objective) => (
          <MissionObjective key={objective.id} objective={objective} />
        ))}
      </ul>
    </aside>
  );
}

function MissionObjective({
  objective,
}: {
  objective: MissionObjectiveSnapshot;
}) {
  const complete = objective.status === 'completed';
  const locked = objective.status === 'locked';
  const progress =
    objective.count > 1
      ? `${objective.progress} / ${objective.count}`
      : complete
        ? 'Done'
        : locked
          ? 'Locked'
          : 'Open';

  return (
    <li
      className={`mf-mission-objective is-${objective.status}${objective.optional ? ' is-optional' : ''}`}
    >
      <span className="mf-mission-objective-signal" aria-hidden="true" />
      <span>
        <strong>
          {objective.title}
          {objective.optional && <em>Optional</em>}
        </strong>
        <small>{objective.description}</small>
      </span>
      <span className="mf-mission-objective-progress">{progress}</span>
    </li>
  );
}
