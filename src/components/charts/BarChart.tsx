import { useState } from 'react';
import { niceMax, ticksFor } from './chart-utils';

export interface BarSeries {
  key: string;
  label: string;
  color: string;
  values: number[]; // aligned with `groups`
}

interface BarChartProps {
  groups: string[]; // x-axis category labels
  series: BarSeries[];
  height?: number;
  valueFormatter?: (v: number) => string;
}

const W = 640;

/** Generic grouped bar chart, hand-rolled with SVG (no recharts — no npm
 * access in this environment). Used for both category price and SKU
 * count charts. */
export function BarChart({ groups, series, height = 260, valueFormatter = String }: BarChartProps) {
  const [hover, setHover] = useState<{ group: number; s: number } | null>(null);

  if (groups.length === 0 || series.length === 0) {
    return <div className="chart-empty">No data for the selected filters.</div>;
  }

  const padLeft = 46;
  const padRight = 8;
  const padTop = 10;
  const padBottom = 26;
  const innerW = W - padLeft - padRight;
  const innerH = height - padTop - padBottom;

  const maxVal = niceMax(Math.max(1, ...series.flatMap((s) => s.values)));
  const ticks = ticksFor(maxVal, 4);

  const groupWidth = innerW / groups.length;
  const barGap = 3;
  const barWidth = Math.max(3, (groupWidth - barGap * (series.length + 1)) / series.length);

  const yFor = (v: number) => padTop + innerH - (v / maxVal) * innerH;

  return (
    <div style={{ position: 'relative' }}>
      <svg viewBox={`0 0 ${W} ${height}`} width="100%" height={height} role="img">
        {/* gridlines + y labels */}
        {ticks.map((t) => (
          <g key={t}>
            <line
              x1={padLeft}
              x2={W - padRight}
              y1={yFor(t)}
              y2={yFor(t)}
              stroke="var(--border)"
              strokeWidth={1}
            />
            <text x={padLeft - 8} y={yFor(t) + 3} fontSize={9.5} fill="var(--muted-foreground)" textAnchor="end">
              {valueFormatter(t)}
            </text>
          </g>
        ))}

        {/* bars */}
        {groups.map((group, gi) => {
          const groupX = padLeft + gi * groupWidth;
          return (
            <g key={group}>
              {series.map((s, si) => {
                const v = s.values[gi] ?? 0;
                const x = groupX + barGap + si * (barWidth + barGap);
                const y = yFor(v);
                const isHover = hover?.group === gi && hover.s === si;
                return (
                  <rect
                    key={s.key}
                    x={x}
                    y={y}
                    width={barWidth}
                    height={Math.max(0, padTop + innerH - y)}
                    fill={s.color}
                    opacity={hover && !isHover ? 0.45 : 1}
                    rx={2}
                    onMouseEnter={() => setHover({ group: gi, s: si })}
                    onMouseLeave={() => setHover(null)}
                  />
                );
              })}
              <text
                x={groupX + groupWidth / 2}
                y={height - padBottom + 14}
                fontSize={10}
                fill="var(--muted-foreground)"
                textAnchor="middle"
              >
                {group}
              </text>
            </g>
          );
        })}
      </svg>

      {hover && (
        <div
          className="chart-tooltip"
          style={{
            left: `${((padLeft + hover.group * groupWidth + groupWidth / 2) / W) * 100}%`,
            top: 6,
          }}
        >
          <div style={{ fontWeight: 600, marginBottom: 4 }}>{groups[hover.group]}</div>
          <div className="row">
            <span style={{ color: series[hover.s].color }}>● {series[hover.s].label}</span>
            <strong>{valueFormatter(series[hover.s].values[hover.group] ?? 0)}</strong>
          </div>
        </div>
      )}
    </div>
  );
}
