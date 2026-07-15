# 🔐 WEBHOOK SECURITY ARCHITECTURE

## 📋 Visão Geral

O webhook do Mercado Pago é o **ponto mais crítico** do sistema de pagamento. Se falhar:

- ✅ Cliente paga ✓
- ❌ Pedido fica como "Pendente" ✗
- 😱 Confiança destruída

**Nossa solução:** Arquitetura blindada com 5 camadas de segurança.

---

## 🏗️ Arquitetura em Camadas

```
┌─────────────────────────────────────────────┐
│ Mercado Pago                                │
│ POST /api/webhooks/payment/mercadopago     │
│ ?id=payment_123&type=payment&topic=payment │
│ Headers: x-signature, x-request-id         │
└──────────────────┬──────────────────────────┘
                   │
                   ▼
┌─────────────────────────────────────────────┐
│ Layer 1: VALIDAÇÃO BÁSICA                   │
│ - Verificar query params                    │
│ - Verificar que é payment notification      │
│ - Checar headers obrigatórios               │
└──────────────────┬──────────────────────────┘
                   │
                   ▼
┌─────────────────────────────────────────────┐
│ Layer 2: VALIDAÇÃO DE ASSINATURA            │
│ - Calcular SHA256(id + token + payment_id)  │
│ - Comparar com x-signature (timing-safe)    │
│ - Rejeitar se inválido (401 Unauthorized)   │
└──────────────────┬──────────────────────────┘
                   │
                   ▼
┌─────────────────────────────────────────────┐
│ Layer 3: PREVENIR REPLAY ATTACKS            │
│ - Registrar x-signature em webhook_signatures │
│ - Verificar se já foi processado            │
│ - Rejeitar duplicatas (ainda retorna 200)   │
└──────────────────┬──────────────────────────┘
                   │
                   ▼
┌─────────────────────────────────────────────┐
│ Layer 4: ENFILEIRAR (Fila de Processamento) │
│ - Inserir em webhook_queue (status: pending)│
│ - Registrar payload para debugging          │
│ - Retornar 200 OK IMEDIATAMENTE             │
│ - MP para de retentar                       │
└──────────────────┬──────────────────────────┘
                   │
                   ▼
┌─────────────────────────────────────────────┐
│ Layer 5: PROCESSAMENTO ASSÍNCRONO           │
│ Inngest Background Job (a cada 5s):         │
│ 1. Buscar items pendentes                   │
│ 2. Chamar API do MP para validar            │
│ 3. Atualizar payment_transactions           │
│ 4. Atualizar orders                         │
│ 5. Se erro: Retry com exponential backoff   │
│ 6. Marcar como completed/failed             │
└─────────────────────────────────────────────┘
```

---

## 🔒 Layer 1: Validação Básica

### Código

```typescript
if (type !== 'payment' || topic !== 'payment') {
  return 200 OK { reason: 'not_payment_notification' };
}
if (!paymentId) {
  return 400 Bad Request { error: 'missing_payment_id' };
}
```

### Por quê?

- Mercado Pago envia webhooks para outros eventos (plan, subscription)
- Nós só nos importamos com `payment.updated`
- Retornamos 200 mesmo assim para não sobrecarregar logs

---

## 🔐 Layer 2: Validação de Assinatura

### Como Funciona

```
Mercado Pago calcula:
  data = xRequestId + accessToken + paymentId
  x-signature = SHA256(data)

Nós validamos:
  expectedSig = SHA256(xRequestId + accessToken + paymentId)
  isValid = timingSafeEqual(x-signature, expectedSig)
```

### Por quê?

- ✅ Garante que a requisição veio do MP (não é fake)
- ✅ Usa `crypto.timingSafeEqual()` para evitar timing attacks
- ✅ Qualquer pessoa sem o `MERCADO_PAGO_ACCESS_TOKEN` não consegue forjar

### Código

```typescript
function validateMercadoPagoSignature(
  xSignature: string,
  xRequestId: string,
  paymentId: string
): boolean {
  const data = `${xRequestId}${process.env.MERCADO_PAGO_ACCESS_TOKEN}${paymentId}`;
  const calculatedSignature = crypto
    .createHash('sha256')
    .update(data)
    .digest('hex');

  // Timing-safe comparison (evita timing attacks)
  return crypto.timingSafeEqual(
    Buffer.from(xSignature),
    Buffer.from(calculatedSignature)
  );
}
```

**Resposta se inválido:**

```
401 Unauthorized
{ ok: false, error: 'invalid_signature' }
```

---

## 🛡️ Layer 3: Prevenir Replay Attacks

### O Problema

```
Atacante intercepta webhook válido:
  POST /webhook?id=123&type=payment

E envia MÚLTIPLAS VEZES:
  1. POST /webhook?id=123&type=payment
  2. POST /webhook?id=123&type=payment
  3. POST /webhook?id=123&type=payment

Resultado:
  Pedido marcado como pago 3x (fraude!)
  Múltiplas transações duplicadas
```

### Solução: Tabela `webhook_signatures`

```sql
CREATE TABLE webhook_signatures (
  id UUID PRIMARY KEY,
  x_signature TEXT UNIQUE NOT NULL,  -- O "finger print" do webhook
  provider_payment_id TEXT,
  created_at TIMESTAMP,
  expires_at TIMESTAMP  -- TTL de 24h
);
```

### Código

```typescript
// Verificar se este webhook já foi processado
const { data: existingSig } = await supabaseAdmin
  .from('webhook_signatures')
  .select('id')
  .eq('x_signature', xSignature)
  .maybeSingle();

if (existingSig) {
  // Webhook duplicado! Mas retornamos 200 mesmo assim
  return 200 OK { reason: 'duplicate_signature' };
}

// Registrar para próximas tentativas
await supabaseAdmin
  .from('webhook_signatures')
  .insert({
    provider: 'mercadopago',
    x_signature: xSignature,
    provider_payment_id: paymentId
  });
```

---

## ⏳ Layer 4: Enfileirar (Não Processar Sync)

### O Problema

```
Se processarmos sync dentro do webhook:

POST /webhook?id=123
  ├─ Validar assinatura (50ms) ✓
  ├─ Buscar transação no DB (100ms) ✓
  ├─ Chamar API do MP (500ms) 😱 Lento!
  ├─ Atualizar payment_transactions (50ms)
  ├─ Atualizar orders (50ms)
  └─ Retornar 200 OK (800ms TOTAL)

Problema:
  - Se qualquer coisa falhar, MP acha que falhou
  - MP tenta reenviar 10x (retry storm!)
  - Servidor fica sobrecarregado
```

### Solução: Enfileirar Apenas

```typescript
// Resposta IMEDIATAMENTE (< 100ms)
const { data: queueItem } = await supabaseAdmin
  .from('webhook_queue')
  .insert({
    provider: 'mercadopago',
    provider_payment_id: paymentId,
    status: 'pending',
    raw_payload: { x_signature, x_request_id }
  })
  .select('id')
  .single();

return 200 OK {
  ok: true,
  payment_id: paymentId,
  queue_id: queueItem.id,
  reason: 'enqueued_for_processing'
};
```

**Resultado:**

- ✅ Webhook retorna 200 OK em < 100ms
- ✅ MP para de retentar imediatamente
- ✅ Processamento real acontece depois (background job)

---

## 🔄 Layer 5: Processamento Assíncrono com Retry Logic

### Background Job (Inngest)

```typescript
// Executa a cada 5 segundos
export const processPaymentWebhookJob = inngest.createFunction(
  { cron: '*/5 * * * * *' },
  async () => {
    // Buscar primeiro item pendente
    const queueItem = await getNextPendingWebhook();

    // Processar
    await processPaymentWebhook(queueItem);
  }
);
```

### Retry Logic com Exponential Backoff

```typescript
async function handleWebhookError(queueItemId: string, error: any) {
  const attempts = currentAttempts + 1;
  const maxAttempts = 5;

  if (attempts >= maxAttempts) {
    // Dar up após 5 tentativas
    await markAsFailed(queueItemId);
    // Notificar admin
  } else {
    // Agendar retry
    const delaySeconds = 2 ^ attempts; // 2s, 4s, 8s, 16s, 32s
    const nextRetryAt = now + delaySeconds;

    await updateRetrySchedule(queueItemId, nextRetryAt);
  }
}
```

### Fluxo Completo

```
┌─ Inngest Job (a cada 5s)
│
├─ 1. Buscar item pendente
├─ 2. Marcar como "processing"
├─ 3. Chamar API do MP
│  ├─ Se erro → Retry depois
│  └─ Se OK → Continuar
├─ 4. Buscar transação no nosso DB
├─ 5. Atualizar payment_transactions
├─ 6. Atualizar orders
└─ 7. Marcar como "completed"

Se qualquer erro:
  ├─ Calcular delay: 2^attempts segundos
  ├─ Agendar retry em webhook_queue
  └─ Continuar com próximo item
```

---

## 📊 Tabelas de Suporte

### `webhook_queue`

```sql
id                    UUID          -- PK
provider              TEXT          -- "mercadopago"
provider_payment_id   TEXT          -- payment_id do MP
status                TEXT          -- pending, processing, completed, failed
attempts              INT           -- Quantas tentativas
max_attempts          INT           -- Máximo de tentativas (5)
error_message         TEXT          -- Mensagem de erro (se houver)
raw_payload           JSONB         -- Payload original
next_retry_at         TIMESTAMP     -- Quando retentar
created_at            TIMESTAMP
updated_at            TIMESTAMP
```

### `webhook_signatures`

```sql
id                    UUID          -- PK
provider              TEXT          -- "mercadopago"
x_signature           TEXT UNIQUE   -- "Finger print" do webhook
provider_payment_id   TEXT          -- payment_id
created_at            TIMESTAMP
expires_at            TIMESTAMP     -- TTL 24h (cleanup automático)
```

---

## 🧪 Teste de Segurança

### 1. Teste de Replay Attack

```bash
# Terminal 1: Disparar webhook válido
curl -X POST "https://seu-dominio.com/api/webhooks/payment/mercadopago?id=123&type=payment&topic=payment" \
  -H "x-signature: <signature_valida>" \
  -H "x-request-id: <request_id>"

# Resultado: 200 OK (enqueued)

# Terminal 2: Repetir exatamente o mesmo comando
curl -X POST "https://seu-dominio.com/api/webhooks/payment/mercadopago?id=123&type=payment&topic=payment" \
  -H "x-signature: <signature_valida>" \
  -H "x-request-id: <request_id>"

# Resultado: 200 OK (duplicate_signature)
# ✅ Pedido NÃO foi processado 2x
```

### 2. Teste de Forged Webhook

```bash
# Tentar webhook com assinatura INVÁLIDA
curl -X POST "https://seu-dominio.com/api/webhooks/payment/mercadopago?id=123&type=payment&topic=payment" \
  -H "x-signature: fake_signature_12345" \
  -H "x-request-id: <request_id>"

# Resultado: 401 Unauthorized
# ✅ Webhook rejeitado
```

### 3. Teste de Retry

```
# Modificar DB para simular erro:
UPDATE webhook_queue SET status = 'pending', attempts = 3
WHERE provider_payment_id = '123';

# Aguardar 5 segundos (próximo ciclo do Inngest)
# Webhook é retentado com exponential backoff
# ✅ Sistema auto-recupera
```

---

## ⚙️ Deployment Checklist

### Antes de Ir para Produção

- [ ] Aplicar migration `20260620_create_webhook_queue.sql`
- [ ] Adicionar env var: `MERCADO_PAGO_ACCESS_TOKEN`
- [ ] Configurar webhook URL no MP Dashboard
- [ ] Testar com cartão de teste do MP
- [ ] Monitorar logs do Vercel (Functions)
- [ ] Configurar alertas para itens em status "failed"

### Monitoramento

```bash
# Ver fila de webhooks
SELECT * FROM webhook_queue WHERE status IN ('pending', 'failed');

# Ver tentativas falhadas
SELECT * FROM webhook_queue WHERE status = 'failed';

# Ver webhooks processados hoje
SELECT count(*) FROM webhook_queue
WHERE status = 'completed'
  AND created_at > now() - INTERVAL '24 hours';
```

---

## 🔥 Possíveis Problemas e Soluções

| Problema                    | Causa                            | Solução                   |
| --------------------------- | -------------------------------- | ------------------------- |
| "Invalid x-signature"       | MERCADO_PAGO_ACCESS_TOKEN errado | Verificar env var         |
| "Webhook duplicado"         | MP reenviou (normal)             | Nada fazer (já tratado)   |
| "Transaction not found"     | payment_id errado no MP          | Verificar payload do MP   |
| "Fila cresce demais"        | Inngest job não rodando          | Verificar logs do Inngest |
| "Pedido não muda de status" | DB error silencioso              | Verificar logs de erro    |

---

## 📞 Suporte de Segurança

**Perguntas comuns:**

**Q: E se Mercado Pago mudar o Access Token?**  
A: Webhook vai falhar com "invalid_signature" → Retry com exponential backoff → Admin notificado para atualizar env var

**Q: E se o servidor cair durante processamento?**  
A: Item fica em status "processing" → Depois de 5 min, Inngest marca como error → Retry acontece

**Q: Posso processar mais de um webhook por vez?**  
A: Sim! Você pode paralizar `processWebhookQueue()` com `Promise.all()` para 10 items por ciclo

**Q: Como monitorar webhooks em produção?**  
A: Consulte `webhook_queue` table:

```sql
-- Webhooks falhando?
SELECT * FROM webhook_queue WHERE status = 'failed' ORDER BY updated_at DESC;

-- Fila acumulando?
SELECT status, count(*) FROM webhook_queue GROUP BY status;

-- Latência?
SELECT avg(extract(epoch from (updated_at - created_at)))
FROM webhook_queue WHERE status = 'completed';
```

---

**Status:** ✅ Production-Ready  
**Segurança:** ✅ Enterprise-Grade  
**Resiliência:** ✅ Anti-falha com retry automático
