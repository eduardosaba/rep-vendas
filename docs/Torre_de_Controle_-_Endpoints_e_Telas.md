# Torre de Controle — Endpoints e Telas (Resumo)

Este documento descreve os endpoints e telas iniciais para a nova Torre de Controle (Distribuidoras + Representantes).

## Endpoints API (server-side)

- `POST /api/webhooks/payment` (implementado esqueleto)
  - Recebe notificações de provedores de pagamento.
  - Verifica header `x-webhook-secret` == `WEBHOOK_SECRET`.
  - Atualiza `invoices` e, em caso de pagamento, marca empresa/profiles como `active`.

- `POST /api/catalog/status` (já existente) — verifica se loja está bloqueada para pedidos.
- `GET /api/profile/status` (já existente) — retorna profile do usuário autenticado.

- Futuro (sugestões):
  - `GET /api/companies/:id` — detalhes da distribuidora (branding, contatos, reps)
  - `POST /api/companies` — criar atual / (admin SaaS)
  - `PUT /api/companies/:id` — atualizar branding / quotas
  - `GET /api/companies/:id/orders` — pedidos consolidados da distribuidora
  - `GET /api/representatives/:id/orders` — pedidos por representante
  - `POST /api/invoices` — criar fatura manual
  - `GET /api/invoices/:id` — status da fatura

## Estrutura de Banco de Dados (já criada por migrations)

- `companies` — tabela de distribuidoras (branding, contatos, metadata)
- `invoices` — faturas / cobranças por empresa
- `profiles.company_id` — referência para `companies.id` (nullable)

## Telas / Fluxos (prioridade)

1) Dashboard da Distribuidora (`/dashboard/empresa`)
   - Branding centralizado (logo, cores, banners)
   - Gestão de Representantes: listar, convidar, ativar/desativar
   - Painel de Pedidos Global: lista, filtros por representante, export
   - Faturamento: lista de invoices, criar / marcar como paga
   - Configurações: limites do plano, integração de pagamento

2) Dashboard do Representante (`/dashboard/vendedor`)
   - Visão dos pedidos do próprio representante
   - Status de faturamento (recebido / separação / faturado / entregue)
   - Histórico de comissões (calculo por pedido)

3) Admin SaaS (sua Torre, `/admin/companies`)
   - Gestão de todas as empresas (ativar/desativar, ver usage)
   - Gestão de planos (plan_feature_matrix): limites e preços
   - Métricas: total pedidos, armazenamento por empresa, número de reps

4) Catálogo público dos representantes
   - Herança de branding: usar `company` branding se existir, senão `profile` branding
   - Pedidos marcados com `company_id` para consolidação

## Observações de Retrocompatibilidade

- `company_id` é `nullable`. Usuários individuais continuam funcionando sem alterações.
- Todas as alterações são idempotentes (usar `ADD COLUMN IF NOT EXISTS`).

## Próximos passos sugeridos (técnicos)

1. Aplicar migrations em staging (backup antes).
2. Implementar API administrativa para `companies` + telas básicas CRUD.
3. Criar fluxo de convite para representantes (email/token).
4. Integrar gateway de pagamento e configurar webhooks no `WEBHOOK_SECRET`.
5. Adicionar cálculo de comissões e endpoint para gerar relatórios.

---
Se quiser, eu gero os esboços de telas (componentes React) e os endpoints server-side adicionais automaticamente agora.
