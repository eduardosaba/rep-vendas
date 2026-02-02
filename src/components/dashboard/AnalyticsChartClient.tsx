import React, { useEffect, useState } from 'react';

type DayPoint = { day: string; clicks: number; links_created: number };

export default function AnalyticsChartClient({
  range = 30,
}: {
  range?: number;
}) {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<DayPoint[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;
    setLoading(true);
    fetch(`/api/short-links/stats?range=${range}`)
      .then((r) => r.json())
      .then((json) => {
        if (!mounted) return;
        if (json?.error) {
          setError(json.error);
        } else {
          setData(json.series || []);
        }
      })
      .catch((err) => setError(String(err)))
      .finally(() => mounted && setLoading(false));
    return () => {
      mounted = false;
    };
  }, [range]);

  if (loading)
    return (
      <div className="h-40 bg-white dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-700 p-4">
        <p className="text-sm font-bold text-slate-700 dark:text-slate-200">
          Gráfico de Engajamento
        </p>
        <p className="text-xs text-slate-500">Carregando...</p>
      </div>
    );

  if (error)
    return (
      <div className="h-40 bg-white dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-700 p-4">
        <p className="text-sm font-bold text-slate-700 dark:text-slate-200">
          Gráfico de Engajamento
        </p>
        <p className="text-xs text-red-500">{error}</p>
      </div>
    );

  // Build simple SVG line for clicks
  const clicks = data.map((d) => d.clicks);
  const linksCreated = data.map((d) => d.links_created);
  const max = Math.max(1, ...clicks);
  const maxLinks = Math.max(1, ...linksCreated);
  const width = 600;
  const height = 120;
  const padding = 20;
  const stepX = data.length > 1 ? (width - padding * 2) / (data.length - 1) : 0;

  const points = data
    .map((d, i) => {
      const x = padding + i * stepX;
      const y = padding + (1 - d.clicks / max) * (height - padding * 2);
      return `${x},${y}`;
    })
    .join(' ');

  return (
    <div className="h-auto bg-white dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-700 p-4">
      <div className="flex items-center justify-between mb-3">
        <p className="text-sm font-bold text-slate-700 dark:text-slate-200">
          Gráfico de Engajamento
        </p>
        <div className="text-xs text-slate-500">Últimos {range} dias</div>
      </div>

      <div className="overflow-auto">
        <svg
          width="100%"
          viewBox={`0 0 ${width} ${height}`}
          preserveAspectRatio="none"
        >
          {/* Bars: links created (blue) */}
          {data.map((d, i) => {
            const x = padding + i * stepX;
            const barWidth = Math.max(2, stepX * 0.6);
            const barHeight =
              (d.links_created / maxLinks) * (height - padding * 2);
            const y = height - padding - barHeight;
            return (
              <rect
                key={`bar-${d.day}`}
                x={x - barWidth / 2}
                y={y}
                width={barWidth}
                height={barHeight}
                fill="#3b82f6"
                opacity={0.85}
              />
            );
          })}

          <polyline
            fill="none"
            stroke="#10b981"
            strokeWidth={2}
            points={points}
          />
          {/* X labels: show 5 ticks */}
          {data.map((d, i) => {
            const x = padding + i * stepX;
            if (i % Math.ceil(data.length / 5) !== 0) return null;
            return (
              <text
                key={d.day}
                x={x}
                y={height - 2}
                fontSize={10}
                fill="#6b7280"
                textAnchor="middle"
              >
                {d.day.slice(5)}
              </text>
            );
          })}
        </svg>
      </div>

      <div className="mt-3 text-xs text-slate-500">
        Cliques por dia (linha verde)
      </div>
    </div>
  );
}
