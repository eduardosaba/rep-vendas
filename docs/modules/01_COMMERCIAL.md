# Módulo Comercial (01_COMMERCIAL.md)

Este documento descreve as regras e componentes do Bounded Context **Comercial** do RepVendas.

---

## 1. Visão Geral do Domínio

O módulo Comercial é responsável por toda a esteira que transforma o interesse do cliente em um pedido confirmado, englobando:
- **Catálogo Virtual & Vitrine** (Exibição de produtos, filtros, preços e fotos);
- **Orçamentos B2B & Fila da Distribuidora** (`orders` com status de negociação e `seller_id`);
- **Draft Orders & Carrinho Salvo** (`create_draft_orders.sql`, `saved_carts`);
- **Precificação & Tabelas de Preço** (`b2b_price_tables.sql`, `bulk_update_prices_by_brand.sql`);
- **Motor Universal de Atualização** (`product-update-engine`, `UPDATE_FIELD_REGISTRY`);
- **Checkout & Confirmação** (Formas de pagamento, frete e dados de entrega).

---

## 2. Componentes e Código Confirmados

### Catálogo e Exibição de Produtos
- **Motor de Tipos e Filtros**: [src/components/product-components.tsx](file:///f:/repvendas/rep-vendas/src/components/product-components.tsx)
  - `Confirmado no código`: Suporte aos filtros de Destaque, Lançamento, Best Seller, Polarizado, Tipo de Montagem (Aro Total, Nylon, Balgriff/Parafusado) e filtros por marca/categoria.
- **Contexto da Loja**: [src/components/catalogo/store-context.tsx](file:///f:/repvendas/rep-vendas/src/components/catalogo/store-context.tsx)

### Orçamentos B2B e Fila de Negociação
- **Página da Fila B2B**: [src/app/dashboard/distribuidora/page.tsx](file:///f:/repvendas/rep-vendas/src/app/dashboard/distribuidora/page.tsx)
  - `Confirmado no código`: Filtra orçamentos por `company_id` e `seller_id`. Separação em abas "Pendentes" (`pending_review`) e "Aprovados".
- **Geração de PDF do Pedido**: [src/lib/generateOrderPDF.ts](file:///f:/repvendas/rep-vendas/src/lib/generateOrderPDF.ts)

### Checkout e Carrinho
- **Carrinho Lateral**: [src/features/cart/components/CartDrawer.tsx](file:///f:/repvendas/rep-vendas/src/features/cart/components/CartDrawer.tsx)
  - `Confirmado no código`: Redirecionamento automático pós-pedido para `/distribuidora/pedidos` quando no fluxo de distribuidora.
- **Página Única de Checkout**: [src/components/catalogo/pages/CheckoutUnifiedPage.tsx](file:///f:/repvendas/rep-vendas/src/components/catalogo/pages/CheckoutUnifiedPage.tsx)

---

## 3. Fontes de Dados e Migrations

- **Pedidos & Itens**: `orders`, `order_items` (`20251127094500_add_orders_display_and_guest_fields.sql`)
- **Draft Orders**: `draft_orders` (`20260718193000_create_draft_orders.sql`)
- **Tabelas de Preço B2B**: `b2b_price_tables` (`20260717_03_b2b_price_tables.sql`)
- **Comprometimento de Pedido**: RPC `commit_commercial_order_rpc` (`20260718163000_commit_commercial_order_rpc.sql`)

---

## 4. Status Comerciais (`commercial_status`)

Os pedidos comerciais transitam entre os seguintes estados padronizados (`getUiStatusKey` em `src/lib/orderStatus.ts`):
- `pending_review` (Aguardando Revisão / Orçamento)
- `awaiting_billing` (Aprovado / Aguardando Faturamento)
- `confirmed` (Confirmado)
- `cancelled` (Cancelado)
