interface MetricCaveatsProps {
  caveats: string[];
}

/** Data-quality notes attached to a MetricResponse — backend-verified
 * against the live DB (see backend/app/routes/metrics.py's docstring),
 * not generic boilerplate, so shown right under the chart they apply to
 * instead of dropped on the floor. */
export function MetricCaveats({ caveats }: MetricCaveatsProps) {
  if (caveats.length === 0) return null;
  return (
    <div className="metric-caveats">
      {caveats.map((c) => (
        <div key={c}>{c}</div>
      ))}
    </div>
  );
}
