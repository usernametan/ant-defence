import type { WpmSample } from '../game/types';
import { formatTime } from '../utils/format';

type WpmGraphProps = {
  samples: WpmSample[];
};

const VIEW_W = 600;
const VIEW_H = 168;
const PAD_LEFT = 44;
const PAD_RIGHT = 16;
const PAD_TOP = 16;
const PAD_BOTTOM = 30;

const TICK_STEPS = [15, 30, 60, 120, 300, 600];

export function WpmGraph({ samples }: WpmGraphProps) {
  if (samples.length < 2) {
    return (
      <div className="wpm-graph">
        <div className="wpm-graph-head">
          <span className="wpm-graph-title">TYPING SPEED — WPM OVER TIME</span>
        </div>
        <p className="wpm-graph-empty">TOO BRIEF A STAND — NO SPEED TRACE</p>
      </div>
    );
  }

  const plotW = VIEW_W - PAD_LEFT - PAD_RIGHT;
  const plotH = VIEW_H - PAD_TOP - PAD_BOTTOM;
  const baseY = VIEW_H - PAD_BOTTOM;
  const maxT = Math.max(samples[samples.length - 1].t, 1);

  let peak = 0;
  let peakIndex = 0;
  samples.forEach((sample, index) => {
    if (sample.wpm > peak) {
      peak = sample.wpm;
      peakIndex = index;
    }
  });
  const maxWpm = Math.max(40, Math.ceil((peak + 4) / 20) * 20);

  const xAt = (t: number) => PAD_LEFT + (t / maxT) * plotW;
  const yAt = (wpm: number) => baseY - (wpm / maxWpm) * plotH;

  const lineD = samples
    .map(
      (sample, index) =>
        `${index === 0 ? 'M' : 'L'} ${xAt(sample.t).toFixed(1)} ${yAt(sample.wpm).toFixed(1)}`,
    )
    .join(' ');
  const areaD = `${lineD} L ${xAt(maxT).toFixed(1)} ${baseY} L ${xAt(samples[0].t).toFixed(1)} ${baseY} Z`;

  const tickStep = TICK_STEPS.find((step) => maxT / step <= 6) ?? 600;
  const timeTicks: number[] = [0];
  for (let t = tickStep; t < maxT - tickStep * 0.4; t += tickStep) {
    timeTicks.push(t);
  }
  timeTicks.push(maxT);

  const yGrid = [0.25, 0.5, 0.75];

  const peakSample = samples[peakIndex];
  const peakX = xAt(peakSample.t);
  const peakY = yAt(peakSample.wpm);
  const peakLabelX = Math.min(
    VIEW_W - PAD_RIGHT - 26,
    Math.max(PAD_LEFT + 26, peakX),
  );

  return (
    <div className="wpm-graph">
      <div className="wpm-graph-head">
        <span className="wpm-graph-title">TYPING SPEED — WPM OVER TIME</span>
        <span className="wpm-graph-meta">
          PEAK {peak} — FINAL {samples[samples.length - 1].wpm} WPM
        </span>
      </div>
      <svg
        className="wpm-graph-svg"
        viewBox={`0 0 ${VIEW_W} ${VIEW_H}`}
        role="img"
        aria-label={`Words per minute over time, peak ${peak}`}
      >
        {yGrid.map((ratio) => (
          <line
            key={`grid-${ratio}`}
            className="wpm-grid"
            x1={PAD_LEFT}
            x2={VIEW_W - PAD_RIGHT}
            y1={baseY - ratio * plotH}
            y2={baseY - ratio * plotH}
          />
        ))}
        {timeTicks.map((t) => (
          <line
            key={`tick-${t}`}
            className="wpm-grid wpm-grid-vertical"
            x1={xAt(t)}
            x2={xAt(t)}
            y1={PAD_TOP}
            y2={baseY}
          />
        ))}
        <line
          className="wpm-axis"
          x1={PAD_LEFT}
          x2={VIEW_W - PAD_RIGHT}
          y1={baseY}
          y2={baseY}
        />
        <text className="wpm-y-label" x={PAD_LEFT - 6} y={baseY + 3} textAnchor="end">
          0
        </text>
        <text
          className="wpm-y-label"
          x={PAD_LEFT - 6}
          y={yAt(maxWpm / 2) + 3}
          textAnchor="end"
        >
          {Math.round(maxWpm / 2)}
        </text>
        <text className="wpm-y-label" x={PAD_LEFT - 6} y={PAD_TOP + 3} textAnchor="end">
          {maxWpm}
        </text>
        {timeTicks.map((t) => (
          <text
            key={`tick-label-${t}`}
            className="wpm-tick-label"
            x={xAt(t)}
            y={VIEW_H - 10}
            textAnchor="middle"
          >
            {formatTime(t)}
          </text>
        ))}
        <path className="wpm-area" d={areaD} />
        <path className="wpm-line" d={lineD} />
        <circle className="wpm-peak-dot" cx={peakX} cy={peakY} r={4} />
        <text
          className="wpm-peak-label"
          x={peakLabelX}
          y={Math.max(11, peakY - 9)}
          textAnchor="middle"
        >
          PEAK {peak}
        </text>
      </svg>
    </div>
  );
}
