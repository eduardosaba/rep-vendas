# 🎯 COMEÇAR HOJE - Checklist de Ação

## ⏱️ Tempo Total: ~15 minutos

Este é o caminho MAIS RÁPIDO para ver seu sistema de pagamento funcional.

---

## 🔵 FASE 1: Preparação (2 min)

### Passo 1: Copiar Access Token do Mercado Pago

```
1. Vá para: https://www.mercadopago.com.br/developers/panel/app
2. Se não tem conta: Criar conta (gratuito)
3. Dashboard > Settings > Credenciais
4. Copie: Access Token (Production)
5. Cole em um notepad temporário
```

### Passo 2: Verificar servidor rodando

```bash
# Terminal
pnpm dev

# Deve aparecer:
# ▲ Next.js 14.x
# - Local: http://localhost:3000
```

### Passo 3: Fazer login no RepVendas

```
1. Acesse: http://localhost:3000
2. Login com sua conta
3. Deve aparecer: Dashboard
```

---

## 🟢 FASE 2: Configurar Pagamento (5 min)

### Passo 1: Abrir página de pagamento

```
1. URL: http://localhost:3000/dashboard/settings/payment
2. Você verá a página com 3 cards informativos
```

### Passo 2: Colar Access Token

```
1. Clique em: "📍 Adicionar / Atualizar Credenciais"
2. Cole seu Access Token do MP
3. Deixe "Webhook Secret" em branco
4. Clique: "Salvar Credenciais"
```

### Passo 3: Validar Resposta

```
✅ Se sucesso:
   - Toast verde aparece
   - Status muda para "✅ Configurado"
   - Você vê "Última atualização: hoje"

❌ Se erro:
   - Toast vermelho
   - Verifique se token está correto
   - Tente copiar novamente do MP
```

---

## 🟠 FASE 3: Testar Endpoint (3 min)

### Passo 1: Abrir URL de teste

```
http://localhost:3000/api/test/payment-gateway
```

### Passo 2: Analisar JSON

```json
{
  "ok": true,
  "configured": true,
  "gateway": {
    "is_active": true,
    "is_configured": true
  },
  "mercado_pago_validation": {
    "status": "valid", // ← IMPORTANTE: deve ser "valid"
    "message": "Token is valid and working ✅"
  }
}
```

### Passo 3: Checklist

```
✅ "ok": true
✅ "configured": true
✅ "mercado_pago_validation.status": "valid"

Se tudo ✅ → Você passou!
Se ❌ → Verifique o token novamente
```

---

## 🟡 FASE 4: Verificar Banco de Dados (3 min)

### Passo 1: Abrir Supabase Studio

```
https://supabase.com → Seu Projeto → SQL Editor
```

### Passo 2: Executar query

```sql
SELECT * FROM payment_gateways
WHERE provider = 'mercadopago'
  AND is_active = true
LIMIT 1;
```

### Passo 3: Resultado esperado

```
Deve retornar 1 linha com:
- id: (seu UUID)
- provider: "mercadopago"
- is_active: true
- is_configured: true
- created_at: (hoje)
- updated_at: (hoje)
```

---

## 🎉 SUCESSO!

Se chegou aqui, você tem:

```
✅ Página de configuração funcional
✅ Token validado com Mercado Pago
✅ Dados salvos no banco de dados
✅ Endpoint de teste respondendo
✅ Sistema pronto para aceitar pagamentos!
```

---

## 📋 Próximos Passos (Fazer Depois)

1. **Configurar Webhook** (30 min)
   - Dashboard MP > Webhooks
   - URL: `https://seu-dominio.com/api/webhooks/payment/mercadopago`
   - Selecionar: `payment.updated`, `payment.created`

2. **Integrar no Checkout** (20 min)
   - Adicionar `<CheckoutWithMercadoPago />` no seu catálogo

3. **Testar Pagamento Real** (10 min)
   - Fazer compra de teste com cartão 4111 1111 1111 1111
   - Verificar que pedido muda de status

---

## 🆘 Se Algo Não Funcionar

### ❌ "Invalid Mercado Pago access token"

- [ ] Copie COMPLETO (sem espaços extras)
- [ ] Certifique que é do ambiente **Production** (não Sandbox)
- [ ] Tente gerar novo token no MP

### ❌ "Network error" / "Connection refused"

- [ ] Verificar internet
- [ ] Verificar se MP está online (site deles)
- [ ] Tentar novamente

### ❌ Página não carrega / "Página não encontrada"

- [ ] Certificar que `pnpm dev` está rodando
- [ ] Recarregar página (F5)
- [ ] Verificar se está logado

### ❌ Banco de dados vazio

- [ ] Executar migration: `supabase db push`
- [ ] Verificar RLS policies
- [ ] Fazer logout/login

---

## 📞 Recursos

- **Documentação Completa:** [PAYMENT_IMPLEMENTATION_GUIDE.md](PAYMENT_IMPLEMENTATION_GUIDE.md)
- **Guia de Testes:** [PAYMENT_QUICK_TEST_5MIN.md](PAYMENT_QUICK_TEST_5MIN.md)
- **Webhook Security:** [WEBHOOK_SECURITY_GUIDE.md](WEBHOOK_SECURITY_GUIDE.md)
- **Mercado Pago API:** https://www.mercadopago.com.br/developers/pt/docs

---

**Tempo Total:** 15 minutos  
**Dificuldade:** 🟢 Fácil  
**Resultado:** ✅ Sistema de pagamento funcional

**Você consegue fazer isso HOJE! 🚀**

---

**Criado:** 20 de junho de 2026  
**Última atualização:** 20 de junho de 2026
