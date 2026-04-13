import React, { useEffect, useState } from 'react';

type DayPoint = { day: string; views: number };

export default function AnalyticsChartClient({
  range = 30,
}: {
  range?: number;
}) {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<DayPoint[]>([]);
  const [totalViews, setTotalViews] = useState(0);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;
    setLoading(true);
    fetch(`/api/marketing/catalog-engagement?range=${range}`)
      .then((r) => r.json())
      .then((json) => {
        if (!mounted) return;
        if (json?.error) {
          setError(json.error);
        } else {
          setData(json.series || []);
          setTotalViews(Number(json.total_views || 0));
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

  // Build simple SVG line for views
  const views = data.map((d) => d.views);
  const max = Math.max(1, ...views);
  const width = 600;
  const height = 120;
  const padding = 20;
  const stepX = data.length > 1 ? (width - padding * 2) / (data.length - 1) : 0;

  const points = data
    .map((d, i) => {
      const x = padding + i * stepX;
      const y = padding + (1 - d.views / max) * (height - padding * 2);
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

      <div className="mb-3 text-xs text-slate-600 dark:text-slate-300">
        Visualizações totais do catálogo: <span className="font-black text-slate-900 dark:text-white">{totalViews}</span>
      </div>

      <div className="overflow-auto">
        <svg
          width="100%"
          viewBox={`0 0 ${width} ${height}`}
          preserveAspectRatio="none"
        >
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
        Visualizações do catálogo por dia (linha verde)
      </div>
    </div>
  );
}
