# Módulo de Comunicação, Eventos e Outbox (04_NOTIFICATIONS_OUTBOX.md)

Este documento descreve as regras e componentes do Bounded Context **Comunicação e Outbox** do RepVendas.

---

## 1. Visão Geral do Domínio

Este módulo garante a entrega confiável e assíncrona de eventos e notificações acionadas por mudanças no ciclo de vida dos pedidos:
- **Transactional Outbox**: Padrão de mensageria para envio resiliente de eventos sem perder mensagens;
- **Order Events Metadata**: Registro de histórico e auditoria de cada evento ocorrido com o pedido;
- **Notificações Automáticas**: Notificação via WhatsApp, E-mail ou Push FCM;
- **FCM Tokens**: Gerenciamento de tokens para push mobile.

---

## 2. Fontes de Dados e Migrations Confirmadas

- **Outbox de Notificações**: `notifications_outbox` (`20240520_create_notifications_outbox.sql`)
- **Eventos e Metadados de Pedidos**: `order_events` (`20260719100000_outbox_and_events_metadata.sql`)
- **Notificação Automática de Pedidos**: `auto_notify_orders.sql`
- **Gatilho de Novo Pedido**: `trigger_notify_on_new_order.sql`
- **Tokens de Push FCM**: `user_fcm_tokens` (`create_user_fcm_tokens.sql`)

---

## 3. Padrão de Funcionamento (Outbox Pattern)

1. Quando um evento relevante ocorre (ex: pedido alterado para `invoiced` ou `shipped`), a transação do banco insere um registro na tabela de outbox (`notifications_outbox` / `order_events`).
2. O dispatcher lê assincronamente a fila de outbox.
3. Se a notificação for entregue com sucesso, o status é atualizado para `processed`.
4. Em caso de falha transitória, o sistema re-tenta com backoff até atingir o limite estipulado de tentativas.
