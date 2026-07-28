# 🚀 Teste Rápido - Sistema de Pagamento

## Objetivo

Validar que seu sistema de pagamento está funcional em **5 minutos**.

---

## ✅ Checklist Pré-Requisitos

Antes de começar, certifique-se que você tem:

- [ ] Login no Mercado Pago Developer (https://www.mercadopago.com.br/developers/panel/app)
- [ ] Access Token do MP copiado (Settings > Credenciais > Production > Access Token)
- [ ] Servidor Next.js rodando localmente: `pnpm dev`
- [ ] Autenticado no RepVendas (login no dashboard)
- [ ] VS Code aberto com console

---

## 🧪 Teste 1: Configurar Gateway (2 min)

### Passo 1: Abrir página de configuração

```
1. Vá para: http://localhost:3000/dashboard/settings/payment
2. Você deve ver a página "🏦 Configuração de Pagamento"
```

### Passo 2: Adicionar credenciais

```
1. Clique em: "📍 Adicionar / Atualizar Credenciais"
2. Cole seu Access Token do MP no campo
3. Deixe "Webhook Secret" em branco (por enquanto)
4. Clique em: "Salvar Credenciais"
```

### Passo 3: Validar

```
✅ Se sucesso: Toast verde aparece "✅ Gateway configurado com sucesso!"
❌ Se erro: Toast vermelho com mensagem de erro
```

**Esperado:** Status muda para "✅ Configurado"

---

## 🧪 Teste 2: Validar Token (1 min)

### Passo 1: Testar endpoint

```
1. Abra em nova aba: http://localhost:3000/api/test/payment-gateway
2. Você deve ver um JSON com status de configuração
```

### Passo 2: Analisar resposta

```json
{
  "ok": true,
  "configured": true,
  "user": {
    "id": "seu-user-id",
    "email": "seu-email@example.com"
  },
  "gateway": {
    "provider": "mercadopago",
    "is_active": true,
    "is_configured": true
  },
  "mercado_pago_validation": {
    "status": "valid",
    "message": "Token is valid and working ✅"
  }
}
```

**Esperado:**

- `"ok": true`
- `"configured": true`
- `"mercado_pago_validation.status": "valid"`

---

## 🧪 Teste 3: Verificar Banco de Dados (1 min)

### Passo 1: Abrir Supabase

```
1. Vá para: https://supabase.com > Seu projeto
2. Menu > SQL Editor
3. Execute esta query:
```

```sql
-- Verificar gateway configurado
SELECT
  id,
  user_id,
  provider,
  is_active,
  is_configured,
  created_at,
  updated_at
FROM payment_gateways
WHERE provider = 'mercadopago'
  AND is_active = true
ORDER BY updated_at DESC
LIMIT 5;
```

**Esperado:** Deve retornar 1 linha com sua configuração

---

## 🧪 Teste 4: Verificar Logs (1 min)

### Passo 1: Abrir console do servidor

```bash
# Terminal onde `pnpm dev` está rodando
# Procure por estas linhas após salvar credenciais:

[registerPaymentGateway] Validating token with Mercado Pago...
[registerPaymentGateway] ✅ Token is valid
[registerPaymentGateway] ✅ Gateway created successfully
```

**Esperado:** Logs mostram que token foi validado ✅

---

## 🎯 Resultado Final

Se passou em todos os testes:

✅ **Sua configuração de pagamento está funcional!**

```
Status do Sistema:
├─ ✅ Componente UI funciona
├─ ✅ Server Action salva dados
├─ ✅ Token validado com MP
├─ ✅ Banco de dados registra config
└─ ✅ Logs confirmam sucesso
```

---

## 🐛 Troubleshooting

### ❌ "Invalid Mercado Pago access token"

**Solução:**

1. Copie o token COMPLETO (sem espaços)
2. Certifique-se que é do ambiente **Production** (não Sandbox)
3. Regenere o token em Mercado Pago se necessário

---

### ❌ "Network error" / "Connection refused"

**Solução:**

1. Verificar se você tem acesso à internet
2. Verificar se Mercado Pago API não está em manutenção
3. Tentar novamente em alguns segundos

---

### ❌ "Não autenticado" no endpoint de teste

**Solução:**

1. Faça logout: Clique na foto de perfil > Logout
2. Faça login novamente
3. Tente acessar o endpoint novamente

---

### ❌ Banco de dados não mostra configuração

**Solução:**

1. Verificar se RLS está habilitado corretamente
2. Executar migration: `supabase db push`
3. Verificar que você está consultando como o usuário correto

---

## 📊 Próximos Testes (Depois de Passar)

Depois que confirmar que tudo acima funciona, você pode:

1. **Teste de Webhook** - Configure webhook no MP e receba notificações
2. **Teste de Pagamento Real** - Use cartão de teste do MP
3. **Teste de Retry** - Simule webhook duplicado
4. **Teste de Segurança** - Valide assinatura de webhook

---

## 💡 Dicas para Sucesso

1. **Use o console.log:** Abra DevTools (F12) e veja os logs do navegador
2. **Guarde o JSON:** Se um teste falhar, copie o JSON da resposta para debugging
3. **Logs do servidor:** Monitore o terminal onde `pnpm dev` está rodando
4. **Supabase Studio:** Mantenha aberto para verificar dados em tempo real

---

## ✨ Congrats! 🎉

Se chegou aqui e todos os testes passaram:

**Você tem um sistema de pagamento funcional!**

Próximo passo: Integrar `CheckoutWithMercadoPago` component em seu catálogo público.

---

**Criado:** 20 de junho de 2026  
**Tempo de teste:** ~5 minutos  
**Dificuldade:** 🟢 Fácil
