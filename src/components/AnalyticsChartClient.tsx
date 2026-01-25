'use client';

import React, { useEffect, useState } from 'react';
import AnalyticsChart from './AnalyticsChart';
import { Loader2 } from 'lucide-react';

export default function AnalyticsChartClient() {
  const [data, setData] = useState<{ date: string; clicks: number }[] | null>(
    null
  );
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const res = await fetch('/api/short-links/analytics');
        const json = await res.json();
        if (mounted && json?.data) {
          setData(
            json.data.map((r: any) => ({
              date: r.date,
              clicks: Number(r.clicks || 0),
            }))
          );
        }
      } catch (e) {
        // ignore
      } finally {
        if (mounted) setLoading(false);
      }
    })();
    return () => {
      mounted = false;
    };
  }, []);

  if (loading)
    return (
      <div className="p-6 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm mt-6 flex items-center justify-center">
        <Loader2 className="animate-spin mr-2" /> Carregando analytics...
      </div>
    );

  if (!data || data.length === 0)
    return (
      <div className="p-6 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm mt-6">
        <p className="text-sm text-slate-500">
          Sem dados de cliques nos últimos 7 dias.
        </p>
      </div>
    );

  return <AnalyticsChart data={data} />;
}
