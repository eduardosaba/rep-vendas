O walkthrough está bem estruturado e a transição para a Fase 3 faz sentido. Antes de iniciar a implementação, eu fecharia alguns pontos para evitar retrabalho e proteger os **170 pedidos legados**.

## Ajustes arquiteturais importantes

### 1. “Histórico auditável” não é necessariamente Event Sourcing

Se `orders` continuar sendo a fonte atual do estado e `order_status_history` apenas registrar as mudanças, o termo correto é:

```text
Histórico imutável de transições de status
```

Event Sourcing verdadeiro exigiria reconstruir o pedido a partir dos eventos. Para esta fase, manter o estado atual em `orders` e o histórico append-only é mais simples e seguro.

### 2. Definir a matriz oficial de transições

Não permita alterar status livremente.

```text
commercial_status

draft
  → submitted
  → cancelled

submitted
  → approved
  → rejected
  → cancelled

approved
  → cancelled apenas com regra administrativa
```

```text
operational_status

pending_fulfillment
  → processing
  → shipped
  → delivered

processing
  → pending_fulfillment, apenas rollback operacional autorizado
```

O status operacional só deve avançar quando o comercial estiver `approved`.

### 3. Definir quem pode executar cada transição

| Ação                | Ótica |      Representante |          Distribuidora |
| ------------------- | ----: | -----------------: | ---------------------: |
| Criar rascunho      |     ✅ | ✅ em nome da ótica | ✅ em nome do comprador |
| Enviar pedido       |     ✅ |                  ✅ |                      ✅ |
| Aprovar/rejeitar    |     ❌ |                  ❌ |                      ✅ |
| Iniciar separação   |     ❌ |                  ❌ |                      ✅ |
| Marcar como enviado |     ❌ |                  ❌ |                      ✅ |
| Cancelar rascunho   |     ✅ |                  ✅ |                      ✅ |
| Cancelar aprovado   |     ❌ |                  ❌ |            owner/admin |

Essas regras precisam ser verificadas no servidor, não apenas na interface.

## Schema recomendado de `orders`

Além dos campos mencionados:

```sql
seller_organization_id uuid null,
buyer_organization_id uuid null,
rep_user_id uuid null,
created_by_user_id uuid null,

commercial_status text not null default 'draft',
operational_status text not null default 'pending_fulfillment',

version integer not null default 1,

submitted_at timestamptz null,
approved_at timestamptz null,
rejected_at timestamptz null,
cancelled_at timestamptz null,
shipped_at timestamptz null,
delivered_at timestamptz null
```

Mantenha temporariamente:

```text
user_id
company_id
organization_id
status
```

para compatibilidade com o módulo atual. Não remova nem reinterprete esses campos na mesma migration.

## OCC: controle de concorrência

O update deve exigir a versão conhecida pelo cliente:

```sql
update public.orders
set
  commercial_status = 'approved',
  version = version + 1,
  updated_at = now()
where id = :order_id
  and version = :expected_version
returning *;
```

Se retornar zero linhas:

```text
CONFLICT_VERSION
```

A interface deve recarregar o pedido e informar que ele foi alterado por outro usuário.

## Histórico de status

Sugestão:

```sql
create table public.order_status_history (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders(id) on delete cascade,
  status_domain text not null,
  from_status text null,
  to_status text not null,
  changed_by_user_id uuid not null references auth.users(id),
  organization_id uuid null references public.organizations(id),
  order_version integer not null,
  reason text null,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);
```

`status_domain`:

```text
commercial
operational
```

A tabela deve ser append-only:

```text
INSERT permitido
UPDATE proibido
DELETE proibido, exceto manutenção master muito controlada
```

## Ponto crítico: pedidos legados

Antes da migration, audite:

```sql
select
  count(*) as total,
  count(organization_id) as com_organization_id,
  count(company_id) as com_company_id,
  count(user_id) as com_user_id
from public.orders;
```

O backfill deve ser conservador:

```text
seller_organization_id
→ organização dona do pedido legado

buyer_organization_id
→ NULL até que o comprador B2B seja identificado com segurança

rep_user_id
→ user_id legado, quando esse usuário for o representante responsável
```

Não invente óticas compradoras para os pedidos antigos.

Enquanto `buyer_organization_id` estiver nulo, o pedido continua visível pelo fallback legado.

## `order_items` também precisa evoluir

Cada item deve manter um snapshot comercial:

```text
product_id
product_name_snapshot
reference_code_snapshot
brand_snapshot
unit_price
quantity
discount
total
seller_organization_id
```

O preço do pedido não deve mudar se o preço atual do produto for atualizado depois.

Também vale registrar:

```text
barcode_snapshot
color_snapshot
size_snapshot
```

quando disponíveis.

## Relação com a Fase 4

Embora os vínculos Distribuidora–Ótica sejam formalizados na Fase 4, a Fase 3 deve nascer preparada para isso.

Nesta fase:

```text
relationship_id pode ser NULL
```

Na Fase 4:

```text
novos pedidos exigirão relacionamento approved
```

Assim, a Fase 3 não fica bloqueada, mas também não exige uma refatoração estrutural depois.

## Sequência segura da Fase 3

1. Migration aditiva e nullable.
2. Backfill dos vendedores e representantes legados.
3. Serviço central de transição de status.
4. OCC com `version`.
5. Histórico imutável.
6. RLS híbrida.
7. Leitura das telas atuais com fallback.
8. Nova interface atrás da feature flag `dual_order_status_enabled`.
9. Homologação com uma distribuidora e uma ótica piloto.
10. Somente depois, converter criação e edição de pedidos.

## Critérios de aceite

```text
✅ pedidos antigos continuam acessíveis
✅ nenhum pedido legado é reatribuído incorretamente
✅ comprador não vê pedidos de outra ótica
✅ vendedor não vê pedidos de outra distribuidora
✅ representante vê apenas sua carteira
✅ status inválido é bloqueado no servidor
✅ conflito de versão é detectado
✅ histórico registra todas as transições
✅ valores dos itens permanecem como snapshot
✅ feature flag permite rollback imediato da interface
✅ catálogo público permanece intocado
```

A Fase 3 está bem encaminhada. O próximo artefato ideal é uma especificação curta contendo: schema aditivo, matriz de transições, matriz de permissões, estratégia de backfill dos 170 pedidos e plano de rollback.
