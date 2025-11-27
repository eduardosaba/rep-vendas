import type { DashboardTotals } from './types';

export function isDashboardTotals(obj: any): obj is DashboardTotals {
  if (!obj || typeof obj !== 'object') return false;
  const rev = obj.total_revenue;
  const items = obj.total_items_sold;

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
