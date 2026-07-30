# ORDER_LIFECYCLE.md - Ciclo de Vida do Pedido B2B e Reserva de Estoque

## 1. Ciclo de Vida do Pedido (`order_status`)

```typescript
export type OrderStatus =
  | 'draft'                 // Rascunho da ótica/representante
  | 'submitted'             // Enviado para a distribuidora
  | 'under_review'          // Em análise pela distribuidora
  | 'awaiting_confirmation' // Alterado pela distribuidora, aguardando aceite da ótica
  | 'approved'              // Aprovado comercialmente
  | 'in_picking'            // Em separação no estoque
  | 'invoiced'              // Faturado (NF emitida)
  | 'shipped'               // Despachado / Enviado
  | 'delivered'             // Entregue na ótica
  | 'cancelled';            // Cancelado (reserva liberada)
```

---

## 2. Regras de Reserva de Estoque

1. **Envio do Pedido (`submitted`)**:
   - O sistema valida a disponibilidade (`available_stock >= requested_quantity`).
   - Move a quantidade de `available_stock` para `reserved_stock`.
2. **Aprovação / Faturamento (`approved` / `invoiced`)**:
   - Deduz definitivamente o `reserved_stock`.
3. **Cancelamento (`cancelled`)**:
   - Devolve a quantidade de `reserved_stock` para `available_stock`.
