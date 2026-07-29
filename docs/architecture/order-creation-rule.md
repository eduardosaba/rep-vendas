# Regra de Criação de Pedidos (Order Creation Rule)

> **Status:** Ativa e Obrigatória  
> **Escopo:** Todo o ecossistema RepVendas (Catálogo B2C, Painel B2B, App de Representante)

## A Regra de Ouro

**Toda e qualquer criação de pedidos deve obrigatoriamente passar pela função orquestradora `checkoutCommercialOrder`**.

É terminantemente proibido realizar inserções diretas na tabela `orders` utilizando a SDK do Supabase fora da camada comercial (`src/actions/commercial/orders`).

### ❌ Incorreto (Proibido)
```typescript
// NUNCA FAÇA ISSO EM NENHUM ARQUIVO!
const { data, error } = await supabase.from('orders').insert([orderPayload])
```

### ✅ Correto (Padrão Exigido)
```typescript
import { checkoutCommercialOrder } from '@/actions/commercial/orders/create'

// O orquestrador cuidará do pricing, do crédito e da persistência atômica.
const result = await checkoutCommercialOrder({
  clientId,
  items,
  paymentMethod
})
```

## Por que essa regra existe?

O RepVendas evoluiu para um **ERP de nível transacional e bancário**. A inserção direta (bypass) quebra a consistência de negócios, porque pula etapas críticas:

1. **Inteligência de Pricing (`pricing/resolver.ts`)**: O preço precisa ser computado com base na tabela do cliente e política da marca, e então **congelado**.
2. **Auditoria de Crédito (`credit/validator.ts`)**: É necessário medir o risco financeiro do cliente em tempo real para decidir se o pedido entra como `PENDING` ou `WAITING_FINANCE`.
3. **Persistência Atômica Segura (`commit_commercial_order` RPC)**: A RPC do PostgreSQL realiza validações matemáticas em nível de banco (ex: `Qtd * Preço Unitário = Total`) e valida restrições de idempotência usando um UUID v4 gerado no cliente, garantindo que o pedido não seja duplicado no caso de um duplo-clique ou instabilidade de rede.

Qualquer "atalho" para inserir em `orders` compromete a saúde financeira do sistema. 

**Respeite o pipeline.** Se precisar criar um pedido a partir de uma interface nova, crie um **Adaptador** (como em `store-actions.ts`) que mapeia seus dados de entrada para o formato exigido pelo `checkoutCommercialOrder`.
