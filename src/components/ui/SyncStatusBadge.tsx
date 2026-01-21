import React from 'react';
import { ShieldCheck, AlertTriangle, Clock } from 'lucide-react';

export default function SyncStatusBadge({
  status,
  className,
}: {
  status?: string | null;
  className?: string;
}) {
  const s = status || 'no_image';
  const label =
    s === 'synced'
      ? 'Sincronizado'
      : s === 'pending'
        ? 'Pendente'
        : s === 'failed'
          ? 'Falha'
          : s;

  const base = `inline-flex items-center gap-1 px-2 py-1 rounded-lg text-[10px] font-bold uppercase ${className || ''}`;

  if (s === 'synced')
    return (
      <span
        className={`${base} bg-emerald-50 dark:bg-emerald-950/30 text-emerald-700 dark:text-emerald-400`}
      >
        <ShieldCheck size={12} /> {label}
      </span>
    );

  if (s === 'pending')
    return (
      <span
        className={`${base} bg-amber-50 dark:bg-amber-950/30 text-amber-700 dark:text-amber-400`}
      >
        <Clock size={12} /> {label}
      </span>
    );

  return (
    <span
      className={`${base} bg-red-50 dark:bg-red-950/30 text-red-700 dark:text-red-400`}
    >
      <AlertTriangle size={12} /> {label}
    </span>
  );
}
