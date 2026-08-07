import { useRef, useState } from 'react';
import { niceMax, ticksFor } from './chart-utils';

export interface LineSeries {
  key: string;
  label: string;
  color: string;
  values: number[]; // aligned with `labels`
}

interface LineChartProps {
  labels: string[]; // x-axis (dates)
  series: LineSeries[];
  height?: number;
  valueFormatter?: (v: number) => string;
  labelFormatter?: (label: string) => string;
}

const W = 640;

/** Generic multi-series line chart, hand-rolled with SVG (no recharts —
 * no npm access in this environment). Used for the price-history trend. */
export function LineChart({
  labels,
  series,
  height = 260,
  valueFormatter = String,
  labelFormatter = (l) => l,
}: LineChartProps) {
  const svgRef = useRef<SVGSVGElement>(null);
  const [hoverIdx, setHoverIdx] = useState<number | null>(null);

  if (labels.length === 0 || series.length === 0) {
    return <div className="chart-empty">No data for the selected filters.</div>;
  }

  const padLeft = 46;
  const padRight = 8;
  const padTop = 10;
  const padBottom = 26;
  const innerW = W - padLeft - padRight;
  const innerH = height - padTop - padBottom;

  const allValues = series.flatMap((s) => s.values);
  const maxVal = niceMax(Math.max(1, ...allValues));
  const minVal = 0;
  const ticks = ticksFor(maxVal, 4);

  const xStep = labels.length > 1 ? innerW / (labels.length - 1) : 0;
  const xFor = (i: number) => padLeft + i * xStep;
  const yFor = (v: number) => padTop + innerH - ((v - minVal) / (maxVal - minVal || 1)) * innerH;

  const pathFor = (values: number[]) =>
    values.map((v, i) => `${i === 0 ? 'M' : 'L'} ${xFor(i).toFixed(1)} ${yFor(v).toFixed(1)}`).join(' ');

  const labelStride = Math.max(1, Math.ceil(labels.length / 7));

  function handleMove(e: React.MouseEvent<SVGSVGElement>) {
    const svg = svgRef.current;
    if (!svg) return;
    const rect = svg.getBoundingClientRect();
    const relX = ((e.clientX - rect.left) / rect.width) * W;
    const idx = Math.round((relX - padLeft) / (xStep || 1));
    setHoverIdx(Math.min(labels.length - 1, Math.max(0, idx)));
  }

  return (
    <div style={{ position: 'relative' }}>
      <svg
        ref={svgRef}
        viewBox={`0 0 ${W} ${height}`}
        width="100%"
        height={height}
        role="img"
        onMouseMove={handleMove}
        onMouseLeave={() => setHoverIdx(null)}
      >
        {ticks.map((t) => (
          <g key={t}>
            <line x1={padLeft} x2={W - padRight} y1={yFor(t)} y2={yFor(t)} stroke="var(--border)" strokeWidth={1} />
            <text x={padLeft - 8} y={yFor(t) + 3} fontSize={9.5} fill="var(--muted-foreground)" textAnchor="end">
              {valueFormatter(t)}
            </text>
          </g>
        ))}

        {labels.map(
          (l, i) =>
            i % labelStride === 0 && (
              <text key={l} x={xFor(i)} y={height - padBottom + 14} fontSize={9.5} fill="var(--muted-foreground)" textAnchor="middle">
                {labelFormatter(l)}
              </text>
            ),
        )}

        {hoverIdx !== null && (
          <line
            x1={xFor(hoverIdx)}
            x2={xFor(hoverIdx)}
            y1={padTop}
            y2={padTop + innerH}
            stroke="var(--ring)"
            strokeDasharray="3 3"
            strokeWidth={1}
          />
        )}

        {series.map((s) => (
          <path key={s.key} d={pathFor(s.values)} fill="none" stroke={s.color} strokeWidth={2} strokeLinejoin="round" strokeLinecap="round" />
        ))}

        {hoverIdx !== null &&
          series.map((s) => (
            <circle key={s.key} cx={xFor(hoverIdx)} cy={yFor(s.values[hoverIdx])} r={3} fill={s.color} stroke="var(--card)" strokeWidth={1.5} />
          ))}
      </svg>

      {hoverIdx !== null && (
        <div
          className="chart-tooltip"
          style={{
            left: `${(xFor(hoverIdx) / W) * 100}%`,
            top: 6,
          }}
        >
          <div style={{ fontWeight: 600, marginBottom: 4 }}>{labelFormatter(labels[hoverIdx])}</div>
          {series.map((s) => (
            <div className="row" key={s.key}>
              <span style={{ color: s.color }}>● {s.label}</span>
              <strong>{valueFormatter(s.values[hoverIdx])}</strong>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
