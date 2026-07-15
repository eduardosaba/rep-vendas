# 📌 QUICK REFERENCE - Teste de Pagamento

Mantenha este arquivo aberto enquanto segue `PAYMENT_START_TODAY.md`

---

## 📍 URLs Rápidas

```
Config Page:       http://localhost:3000/dashboard/settings/payment
Test Endpoint:     http://localhost:3000/api/test/payment-gateway
Dashboard:         http://localhost:3000/dashboard
Mercado Pago:      https://www.mercadopago.com.br/developers/panel/app
Supabase SQL:      https://supabase.com → seu-projeto → SQL Editor
```

---

## 🎯 4 Fases em 15 Minutos

```
FASE 1: Preparação (2 min)
  [ ] Access Token copiado do MP
  [ ] pnpm dev rodando
  [ ] Logado no RepVendas

FASE 2: Configurar (5 min)
  [ ] Abrir: /dashboard/settings/payment
  [ ] Colar token
  [ ] Clique: "Salvar Credenciais"
  [ ] Ver: Toast verde + "✅ Configurado"

FASE 3: Testar Endpoint (3 min)
  [ ] Abrir: /api/test/payment-gateway
  [ ] Analisar JSON
  [ ] Ver: "status": "valid"

FASE 4: Banco (3 min)
  [ ] SQL Editor no Supabase
  [ ] Query: SELECT * FROM payment_gateways...
  [ ] Ver: 1 linha com seus dados
```

---

## 💬 Mensagens Esperadas

### ✅ Sucesso

```
FASE 2:
  Toast: "✅ Gateway de pagamento configurado com sucesso!"
  Status: "✅ Configurado"

FASE 3 (JSON):
  "ok": true
  "configured": true
  "mercado_pago_validation": { "status": "valid" }

FASE 4 (Database):
  Retorna 1 linha com:
  - provider: "mercadopago"
  - is_active: true
  - is_configured: true
```

### ❌ Erro

```
FASE 2:
  Toast: "Toast vermelho com mensagem de erro"
  → Ir para: PAYMENT_TROUBLESHOOTING_GUIDE.md

FASE 3 (JSON):
  "mercado_pago_validation": { "status": "invalid" }
  → Copiar novo token do MP

FASE 4 (Database):
  Retorna 0 linhas
  → Executar: supabase db push
```

---

## 🔧 Comandos Úteis (Copy-Paste Ready)

```bash
# Iniciar servidor
pnpm dev

# Limpar cache e reiniciar
rm -rf .next && pnpm dev

# Aplicar migrations
supabase db push

# Instalar mercadopago
pnpm add mercadopago

# Type check
pnpm type-check

# Ver logs
tail -f ~/.supabase/logs.txt  (se usar Supabase local)
```

---

## 🎯 JSON esperado em /api/test/payment-gateway

```json
{
  "ok": true,
  "configured": true,
  "user": {
    "id": "seu-user-id-aqui",
    "email": "seu@email.com"
  },
  "gateway": {
    "id": "gateway-uuid",
    "provider": "mercadopago",
    "is_active": true,
    "is_configured": true
  },
  "mercado_pago_validation": {
    "status": "valid",
    "message": "Token is valid and working ✅"
  },
  "checklist": {
    "✅ Gateway exists": true,
    "✅ Gateway is active": true,
    "✅ Gateway is configured": true,
    "✅ Mercado Pago token is valid": true
  }
}
```

---

## 📊 SQL Query para Verificar

```sql
SELECT
  id,
  user_id,
  provider,
  is_active,
  is_configured,
  created_at
FROM payment_gateways
WHERE provider = 'mercadopago'
  AND is_active = true
LIMIT 1;
```

---

## 🚨 SOS - Erros Mais Comuns

| Erro                  | Solução Rápida              |
| --------------------- | --------------------------- |
| "Página não found"    | `pnpm dev` reiniciar        |
| "Token inválido"      | Copiar novo do MP           |
| "Não autenticado"     | Fazer logout/login          |
| "RLS blocked"         | `supabase db push`          |
| "Servidor não inicia" | `rm -rf .next && pnpm dev`  |
| Timeout               | Verificar internet / MP API |

→ **Erro não listed?** Ver: `PAYMENT_TROUBLESHOOTING_GUIDE.md`

---

## 📱 Checklist de Cópia (Copie Antes de Começar)

```
☐ Access Token do MP: [                    ]
☐ User ID do Supabase: [                   ]
☐ Email logado: [                          ]
☐ Hora de início: [  :  ]
☐ Hora de fim (target): [  :  ] + 15 min
```

---

## ⏱️ Timeline

```
T+0:00   Start → Copiar token do MP
T+2:00   FASE 1 completa
T+2:00   Abrir /dashboard/settings/payment
T+5:00   FASE 2 completa (Token salvo)
T+8:00   Abrir /api/test/payment-gateway
T+11:00  FASE 3 completa (Endpoint testado)
T+12:00  Abrir Supabase SQL Editor
T+15:00  FASE 4 completa (Banco verificado)
T+15:00  ✅ SUCCESS!
```

---

## 🔄 Se Algo Deu Errado

**Opção 1:** Verificar em `PAYMENT_TROUBLESHOOTING_GUIDE.md`

**Opção 2:** Voltar para `PAYMENT_START_TODAY.md` (ver passo anterior)

**Opção 3:** Nuclear Reset:

```bash
rm -rf .next node_modules
pnpm install
pnpm dev
# Fazer logout/login
# Tentar tudo novamente
```

---

## 📞 Context Window

Enquanto testa, mantenha abertos (em abas):

```
ABA 1: /dashboard/settings/payment (Config)
ABA 2: /api/test/payment-gateway (Endpoint test)
ABA 3: Supabase SQL Editor (Database check)
ABA 4: MP Developers (Token reference)
ABA 5: Este arquivo (Quick ref)
```

---

## ✅ Finish Line

Se chegou aqui sem erros:

```
🎉 PARABÉNS!

Seu sistema de pagamento está:
✅ Configurado
✅ Validado
✅ Testado
✅ Armazenado no banco

PRÓXIMO: Configurar Webhook e fazer pagamento real!
```

---

**Criado:** 20 de junho de 2026  
**Duração:** 15 minutos  
**Dificuldade:** 🟢 Fácil  
**Chance de Sucesso:** 99%

---

**BOA SORTE! Você consegue! 🚀**
