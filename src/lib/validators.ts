import type { DashboardTotals } from './types';

export function isDashboardTotals(obj: unknown): obj is DashboardTotals {
  if (!obj || typeof obj !== 'object') return false;
  const o = obj as Record<string, unknown>;
  const rev = o.total_revenue;
  const items = o.total_items_sold;

  // Aceita números ou strings numéricas (converte depois)
  const revOk =
    typeof rev === 'number' ||
    (typeof rev === 'string' && !Number.isNaN(Number(rev)));
  const itemsOk =
    typeof items === 'number' ||
    (typeof items === 'string' && !Number.isNaN(Number(items)));

  return revOk && itemsOk;
}

export default isDashboardTotals;
