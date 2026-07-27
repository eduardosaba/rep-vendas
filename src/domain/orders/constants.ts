export const OrderStatus = {
  PENDING: 'Pendente',
  APPROVED: 'Aprovado',
  WAITING_FINANCE: 'Aguardando Aprovação Financeira',
  BILLED: 'Faturado',
  SHIPPED: 'Despachado',
  DELIVERED: 'Entregue',
  CANCELLED: 'Cancelado'
} as const;

export type OrderStatusType = typeof OrderStatus[keyof typeof OrderStatus];
