export const ROUTE_TITLE_MAP: Array<[string, string]> = [
  ['/dashboard/products/sync', '🛒 Ferramentas'],
  ['/dashboard/products/import-massa', '🛒 Ferramentas'],
  ['/dashboard/products/import-visual', '🛒 Ferramentas'],
  ['/dashboard/products/import-history', '🛒 Ferramentas'],
  ['/dashboard/products/matcher', '🛒 Ferramentas'],
  ['/dashboard/products/update-prices', '🛒 Ferramentas'],
  ['/dashboard/products', '📦 Produtos'],
  ['/dashboard/categories', '📦 Produtos'],
  ['/dashboard/brands', '📦 Produtos'],
  ['/dashboard/orders', '🛒 Pedidos'],
  ['/dashboard/marketing', '📢 Marketing'],
  ['/dashboard/clients', '👥 Clientes'],
  ['/dashboard/settings', '⚙️ Configurações'],
  ['/dashboard/user', '👤 Minha Conta'],
  ['/dashboard/analytics', '📊 Analytics'],
  ['/dashboard/notifications', '🔔 Notificações'],
  ['/dashboard/help', '❓ Ajuda'],
];

export function getPageTitle(path: string) {
  if (!path) return 'Painel';
  if (path === '/dashboard') return '📈 Dashboard';

  for (const [prefix, title] of ROUTE_TITLE_MAP) {
    if (typeof path === 'string' && path.startsWith(prefix)) return title;
  }

  return '📈 Dashboard';
}

export default getPageTitle;
