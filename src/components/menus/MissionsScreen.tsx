import type { MissionSnapshot } from '../../game/systems/MissionSystem';

export function MissionsScreen({
  mission,
}: {
  mission: MissionSnapshot | null;
}) {
  if (!mission) {
    return null;
  }

  return (
    <section className="mf-mission-brief" aria-label="Mission briefing">
      <p className="mf-briefing-label">Field order</p>
      <h2>{mission.title}</h2>
      <p className="mf-mission-brief-copy">{mission.briefing}</p>
      <ol className="mf-mission-brief-objectives">
        {mission.objectives
          .filter((objective) => !objective.optional)
          .map((objective) => (
            <li key={objective.id}>{objective.title}</li>
          ))}
      </ol>
      <p className="mf-mission-brief-optional">
        {mission.objectives.filter((objective) => objective.optional).length}{' '}
        optional objectives · relay activation requires <kbd>E</kbd>
      </p>
    </section>
  );
}
