# 🔐 Idempotência em Webhooks - Implementação RepVendas

## O Problema: Webhooks Duplicados

```
Mercado Pago envia webhook → Sistema processa ✅
Sistema demora a responder → MP acha que falhou
MP reenviae o MESMO webhook → Sistema processa NOVAMENTE ❌
```

**Resultado:**

- ❌ Pedido marcado como pago 2x
- ❌ Comissão do representante duplicada
- ❌ Estoque decrementa 2x
- ❌ Cliente recebe 2 confirmações

---

## ✅ A Solução: Query Atômica Idempotente

### Antes (❌ NÃO É IDEMPOTENTE)

```typescript
const { error } = await supabaseAdmin
  .from('orders')
  .update({ status: 'Pagamento Confirmado' })
  .eq('id', orderId); // ← Atualiza SEMPRE
```

**Problema:** Se webhook chegar 2x, query atualiza 2x.

---

### Depois (✅ IDEMPOTENTE)

```typescript
const { error, count } = await supabaseAdmin
  .from('orders')
  .update({ status: 'Pagamento Confirmado' })
  .eq('id', orderId)
  .neq('status', 'Pagamento Confirmado') // ← Só atualiza se NÃO está pago
  .select('id', { count: 'exact' });
```

**Fluxo:**

1. **Primeira vez:** `status` é 'Pendente' → atualiza → `count = 1` ✅
2. **Segunda vez:** `status` já é 'Pagamento Confirmado' → `.neq()` falha → `count = 0` ✅

---

## 🧮 Comparação: Antes vs. Depois

| Cenário              | Antes ❌       | Depois ✅            |
| -------------------- | -------------- | -------------------- |
| **Webhook chega 1x** | ✅ Atualiza    | ✅ Atualiza          |
| **Webhook chega 2x** | ❌ Atualiza 2x | ✅ Atualiza 1x       |
| **Webhook chega 5x** | ❌ Atualiza 5x | ✅ Atualiza 1x       |
| **Performance**      | Rápido         | Rápido (mesma query) |

---

## 🎯 Como Funciona Tecnicamente

### SQL Gerado pelo Supabase

```sql
-- ANTES (sem idempotência)
UPDATE orders
SET status = 'Pagamento Confirmado', updated_at = NOW()
WHERE id = 'order-123-uuid';
-- Executa sempre, independente do status anterior

-- DEPOIS (com idempotência)
UPDATE orders
SET status = 'Pagamento Confirmado', updated_at = NOW()
WHERE id = 'order-123-uuid'
  AND status != 'Pagamento Confirmado';
-- Só executa se status for diferente
```

---

## 🔄 Caso de Uso Real

### Cenário: Webhook Duplicado

```
[MP Webhook] Payment ID: 12345678

Tentativa 1:
  ├─ POST /webhook?id=12345678
  ├─ Validar assinatura ✅
  ├─ Enfileirar ✅
  └─ Retornar 200 OK ✅

[Inngest Job] Processa fila
  ├─ Buscar payment no MP ✅
  ├─ UPDATE orders WHERE id='order-abc' AND status != 'Pagamento Confirmado' ✅
  ├─ count = 1 (atualizado!)
  └─ Log: "✅ Payment processed successfully"

Tentativa 2 (webhook duplicado, 5 segundos depois):
  ├─ POST /webhook?id=12345678 (mesmo ID)
  ├─ Validar assinatura ✅
  ├─ Verificar replay attack → Encontra x-signature anterior ✅
  └─ Retornar 200 OK { reason: 'duplicate_signature' } ✅ (nem enfileira)

[Se por algum motivo enfileirar novamente]
[Inngest Job] Processa fila
  ├─ Buscar payment no MP ✅
  ├─ UPDATE orders WHERE id='order-abc' AND status != 'Pagamento Confirmado'
  ├─ count = 0 (não atualiza, pois já está 'Pagamento Confirmado')
  └─ Log: "⚠️ Order order-abc foi atualizado anteriormente (webhook duplicado)"
```

---

## 📊 Níveis de Proteção Implementados

```
Camada 1: Replay Attack Detection
├─ webhook_signatures table com UNIQUE x_signature
└─ Primeira linha de defesa: nem enfileira

Camada 2: Idempotência de Query
├─ UPDATE ... WHERE status != 'paid'
└─ Segunda linha de defesa: se enfileirar novamente, não duplica

Camada 3: Validação de Count
├─ Verificar count === 0 significa já foi processado
└─ Terceira linha de defesa: logging e alertas
```

---

## 🚨 Quando Usar `.neq()`

### ✅ Use `.neq()` Aqui

```typescript
// Marcar como pago (só 1x)
.update({ status: 'Pagamento Confirmado' })
.neq('status', 'Pagamento Confirmado')

// Marcar como cancelado (só 1x)
.update({ status: 'Cancelado' })
.neq('status', 'Cancelado')

// Decrementar estoque (só 1x)
.update({ quantity: quantity - 1 })
.neq('status', 'Completo')  // Se já completou, não decrementa novamente
```

### ❌ Evite `.neq()` Aqui

```typescript
// Status TEMPORÁRIO (pode flutuar)
.update({ status: 'Em Processamento' })
// ← Sem .neq() - deixa atualizar múltiplas vezes

// Campos que aumentam/diminuem sempre
.update({ attempt_count: attempt_count + 1 })
// ← Sem .neq() - precisa incrementar sempre
```

---

## 🔍 Debugging: Como Verificar Se Está Idempotente

### 1️⃣ Test Webhook Duplicado

```bash
# Terminal 1: Send webhook
curl -X POST "http://localhost:3000/api/webhooks/payment/mercadopago?id=12345678&type=payment&topic=payment" \
  -H "x-signature: YOUR-SIG" \
  -H "x-request-id: YOUR-ID"

# ✅ Response 1: { ok: true, queue_id: "queue-1" }

# Terminal 2: Send SAME webhook (duplicated)
curl -X POST "http://localhost:3000/api/webhooks/payment/mercadopago?id=12345678&type=payment&topic=payment" \
  -H "x-signature: YOUR-SIG" \
  -H "x-request-id: YOUR-ID"

# ✅ Response 2: { ok: true, reason: "duplicate_signature" }
```

### 2️⃣ Verificar na Database

```sql
-- Verificar quantas vezes foi atualizado
SELECT * FROM payment_transactions
WHERE provider_transaction_id = '12345678'
ORDER BY created_at DESC;

-- Deve retornar 1 linha com status 'approved'

-- Verificar orders
SELECT id, status, updated_at FROM orders
WHERE id = 'order-abc'
ORDER BY updated_at DESC LIMIT 1;

-- Deve mostrar updated_at da PRIMEIRA tentativa, não da segunda
```

### 3️⃣ Verificar Logs

```bash
# Deve ver:
[MP Webhook] ✅ Enqueued for processing
[PaymentWebhookProcessor] ✅ Payment processed successfully

# Se webhook duplicar:
[MP Webhook] Replay attack detected! x-signature already processed
# E NÃO deve enfileirar novamente
```

---

## 🎓 Conceito de Idempotência

**Definição:** Uma operação é idempotente se pode ser executada múltiplas vezes e o resultado é o mesmo que se tivesse sido executada uma única vez.

**Exemplo:**

```
Idempotente: SET status = 'Paid' (resultado igual, 1x ou 100x)
Não-idempotente: INCREMENT attempt_count (resultado diferente cada vez)
```

---

## 🚀 Implementação no RepVendas

### Todos os Webhooks Seguem Este Padrão

```typescript
// 1. Replay attack detection (webhook_signatures table)
if (already_processed_signature) {
  return 200 OK { reason: 'duplicate_signature' };
}

// 2. Enfileirar (não processar sync)
insert into webhook_queue { payment_id, status: 'pending' }
return 200 OK immediately;

// 3. Background job processa com idempotência
UPDATE payment_transactions SET status = 'approved'
WHERE provider_transaction_id = payment_id AND status != 'approved';

UPDATE orders SET status = 'Pagamento Confirmado'
WHERE id = order_id AND status != 'Pagamento Confirmado';

// 4. Retry com exponential backoff se falhar
if error: schedule retry in 2^attempts seconds (max 5 vezes);
```

---

## 📋 Checklist de Idempotência

- [x] Replay attack detection com webhook_signatures
- [x] Enfileiramento rápido (não processar sync)
- [x] UPDATE com `.neq()` para status final
- [x] Verificação de count para logging
- [x] Logs claros: "Já processado" vs "Primeira vez"
- [x] Teste com webhook duplicado
- [x] Teste com crash + retry
- [x] Teste com múltiplos webhooks simultâneos

---

## 🎯 Resultado Final

**Garantia:** Não importa quantas vezes o webhook chegar:

- ✅ Pedido marcado como pago **exatamente 1x**
- ✅ Estoque decrementado **exatamente 1x**
- ✅ Comissão registrada **exatamente 1x**
- ✅ Log audit trail **completo**

---

**Criado:** 20 de junho de 2026  
**Status:** ✅ Implementado e Testado  
**Crítico:** Sim - Sem isso você terá pedidos duplicados!
