# Módulo de Fulfillment e Logística (02_FULFILLMENT.md)

Este documento descreve as regras e componentes do Bounded Context **Fulfillment** (Operacional, Estoque e Logística) do RepVendas.

---

## 1. Visão Geral do Domínio

O módulo de Fulfillment é responsável pelas operações pós-confirmação comercial:
- **Controle de Estoque & Movimentações** (Entradas, saídas, reservas B2B);
- **Sessões de Separação (Picking)** (Pick lists, validação por código de barras, picking cego);
- **Faturamento & Notas Fiscais (Invoice Engine)** (Emissão e controle de NFe/invoices);
- **Expedição & Entregas (Shipment Engine)** (Geração de remessas e rastreamento);
- **Métricas Operacionais** (Tempo de ciclo de separação e expedição).

---

## 2. Componentes e Código Confirmados

### Domínio e Serviços
- **Domínio de Fulfillment**:
  - `Confirmado no código`: Código localizado sob [src/domain/fulfillment/](file:///f:/repvendas/rep-vendas/src/domain/fulfillment/)
- **Configuração de Automações Operacionais**:
  - `Confirmado no código`: `FeatureService` em [src/domain/settings/feature-service.ts](file:///f:/repvendas/rep-vendas/src/domain/settings/feature-service.ts)
  - Métodos: `isAutoCreateInvoiceEnabled` e `isAutoCreateShipmentEnabled`.

---

## 3. Fontes de Dados e Migrations

- **Controle de Estoque B2B**: `b2b_stock_control` (`20260717_02_b2b_stock_control.sql`)
- **Movimentações de Estoque**: `inventory_movements` (`20260718130000_inventory_movements.sql`)
- **Processamento de Faturamento (RPC)**: `process_order_billing_rpc` (`20260718143000_process_order_billing_rpc.sql`)
- **Operações de Separação e Expedição**: `20260720000000_fulfillment_operations.sql`
- **Sessões de Separação (Picking)**: `picking_sessions` (`20260720110000_picking_sessions.sql`)
- **Métricas Operacionais**: `20260720150000_operational_metrics.sql`
- **Motor de Notas Fiscais e Envio**: `20260721000000_invoice_shipping_engine.sql`

---

## 4. Status Operacionais (`operational_status`)

Os pedidos operacionais transitam entre os seguintes estados:
- `pending_picking` (Aguardando Separação)
- `picking_in_progress` (Em Separação)
- `picking_completed` (Separação Concluída)
- `invoiced` (Faturado / Nota Fiscal Emitida)
- `shipped` (Despachado / Em Trânsito)
- `delivered` (Entregue)
