// Utilitários para normalizar e mapear status de pedido entre UI (chaves em inglês)
// e o valor persistido no banco (pt-BR), que é restrito por CHECK constraint.

export const DB_STATUSES = [
  'Pendente',
  'Confirmado',
  'Em Preparação',
  'Enviado',
  'Entregue',
  'Cancelado',
  'Completo',
];

export type UIStatusKey =
  | 'pending'
  | 'confirmed'
  | 'preparing'
  | 'delivered'
  | 'cancelled'
  | 'complete';

const statusMapToDb: Record<string, string> = {
  // English keys
  pending: 'Pendente',
  confirmed: 'Confirmado',
  preparing: 'Em Preparação',
  delivered: 'Entregue',
  cancelled: 'Cancelado',
  complete: 'Completo',
  // common variants
  shipped: 'Enviado',
  sent: 'Enviado',
  canceled: 'Cancelado',
};

const dbToUiKey: Record<string, UIStatusKey> = {
  Pendente: 'pending',
  Confirmado: 'confirmed',
  'Em Preparação': 'preparing',
  Enviado: 'delivered',
  Entregue: 'delivered',
  Cancelado: 'cancelled',
  Completo: 'complete',
};

export function mapToDbStatus(input: string): string {
  if (!input) throw new Error('Status vazio');
  const trimmed = input.trim();
  // Already a DB value?
  if (DB_STATUSES.includes(trimmed)) return trimmed;

  const key = trimmed.toLowerCase();
  if (statusMapToDb[key]) return statusMapToDb[key];

  // Try capitalizing
  const cap = trimmed.charAt(0).toUpperCase() + trimmed.slice(1);
  if (DB_STATUSES.includes(cap)) return cap;

  throw new Error(`Status inválido: ${input}`);
}

export function getUiStatusKey(input: string): UIStatusKey {
  if (!input) return 'pending';
  const trimmed = input.trim();
  // If it's a DB value
  if (dbToUiKey[trimmed]) return dbToUiKey[trimmed];

  // If it's a UI key already
  const lower = trimmed.toLowerCase();
  if (statusMapToDb[lower]) {
    // map to DB then to UI key
    const db = statusMapToDb[lower];
    return dbToUiKey[db] || 'pending';
  }

  // fallback: return lower if it matches expected keys
  if (
    lower === 'pending' ||
    lower === 'confirmed' ||
    lower === 'preparing' ||
    lower === 'delivered' ||
    lower === 'cancelled' ||
    lower === 'complete'
  ) {
    return lower as UIStatusKey;
  }

  return 'pending';
}

export function getStatusLabelFromKey(key: UIStatusKey): string {
  const map: Record<UIStatusKey, string> = {
    pending: 'Pendente',
    confirmed: 'Confirmado',
    preparing: 'Em Preparação',
    delivered: 'Entregue',
    cancelled: 'Cancelado',
    complete: 'Completo',
  };
  return map[key];
}

export default {
  mapToDbStatus,
  getUiStatusKey,
  getStatusLabelFromKey,
};
