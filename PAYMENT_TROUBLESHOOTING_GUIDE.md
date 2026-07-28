# 🐛 TROUBLESHOOTING - Se Algo Não Funcionar

Guia de debug rápido para os problemas mais comuns durante `PAYMENT_START_TODAY.md`.

---

## ❌ FASE 1: Preparação

### Erro: "npm ERR! code E404 - mercadopago@latest not found"

**Causa:** Pacote não está no npm

**Solução:**

```bash
# Tentar versão anterior:
pnpm add mercadopago@2.1.0
# Ou usar a forma exata:
pnpm add mercadopago --exact
```

---

### Erro: "Cannot find module @supabase/supabase-js"

**Causa:** Dependência não instalada

**Solução:**

```bash
pnpm add @supabase/supabase-js
# Depois:
pnpm dev
```

---

### Erro: "Next.js server won't start / Port 3000 in use"

**Causa:** Outro processo usando porta 3000

**Solução:**

```bash
# Opção 1: Liberar porta
lsof -ti:3000 | xargs kill -9
pnpm dev

# Opção 2: Usar porta diferente
pnpm dev -p 3001
# Depois acesse: http://localhost:3001
```

---

## ❌ FASE 2: Configurar Pagamento

### Erro: "Página não carrega / 404"

**Causa:** Page não existe ou servidor não reiniciou

**Solução:**

```bash
# Terminal:
# 1. CTRL+C para parar servidor
# 2. Esperar 2 segundos
# 3. Executar novamente:
pnpm dev

# 4. Abrir browser em aba NOVA (limpar cache):
# Chrome: CTRL+SHIFT+Delete e limpar
# Depois: http://localhost:3000/dashboard/settings/payment
```

---

### Erro: "Preciso fazer login"

**Causa:** Sessão expirou ou cookie deletado

**Solução:**

```
1. Ir para: http://localhost:3000
2. Fazer login novamente
3. Depois: http://localhost:3000/dashboard/settings/payment
```

---

### Erro: "Toast vermelho: Cannot read property 'createClient'"

**Causa:** Servidor action não consegue conectar ao Supabase

**Solução:**

```bash
# Verificar .env.local tem:
# - NEXT_PUBLIC_SUPABASE_URL=https://...
# - SUPABASE_SERVICE_ROLE_KEY=eyJa...

# Se não tem, adicionar
# Se tem, verificar se estão corretos (copiar exatamente do Supabase)

# Depois: Fazer logout/login
```

---

### Erro: "Toast vermelho: Invalid Mercado Pago access token"

**Causa:** Token errado, expirado ou incompleto

**Solução:**

```
1. Ir para: https://www.mercadopago.com.br/developers/panel/app
2. Settings > Credenciais
3. Verificar Environment: "Production" (NÃO Sandbox)
4. Clique no ícone de copiar (não selecionar manualmente)
5. Ir para: http://localhost:3000/dashboard/settings/payment
6. CTRL+A na input → Delete (limpar)
7. CTRL+V (colar novo token)
8. Clicar "Salvar Credenciais"
```

---

### Erro: "Form não responde quando clica em Salvar"

**Causa:** Server action travada ou erro de rede

**Solução:**

```
1. Abrir DevTools: F12
2. Ir para: Console tab
3. Procurar por erro em vermelho
4. Se houver erro, anote e procure neste guide

Se não houver erro e continuar travado:
5. Abrir Network tab (F12)
6. Clicar "Salvar Credenciais" novamente
7. Procurar por request "registerPaymentGateway"
8. Se estiver com status 500: Erro no servidor
9. Se estiver pendente: Timeout de rede
```

---

## ❌ FASE 3: Testar Endpoint

### Erro: "Cannot find file - /api/test/payment-gateway"

**Causa:** Arquivo não existe ou servidor não compilou

**Solução:**

```bash
# 1. Parar servidor (CTRL+C)
# 2. Limpar cache:
rm -rf .next

# 3. Reiniciar:
pnpm dev

# 4. Esperar compilar (pode levar 30s)
# 5. Depois tentar novamente endpoint
```

---

### Erro: "Endpoint retorna 401 - Não autenticado"

**Causa:** Cookie de autenticação não foi enviado

**Solução:**

```
1. Verificar se está logado: http://localhost:3000/dashboard
2. Se sim, fazer logout (perfil > Logout)
3. Fazer login novamente
4. Depois tentar endpoint novamente

OU

1. Abrir endpoint em MESMA ABA (não nova)
2. Isso preserva cookie da sessão
```

---

### Erro: "Endpoint retorna 500 - Internal server error"

**Causa:** Erro no código do endpoint

**Solução:**

```bash
# 1. Verificar console do servidor (terminal onde pnpm dev roda)
# 2. Procurar por erro em vermelho
# 3. Se erro é sobre Supabase: Verificar .env.local
# 4. Se erro é sobre Mercado Pago: Token incorreto

# Exemplo de erro:
# [PaymentGatewayTest] Error: SUPABASE_URL is not set
# → Adicionar em .env.local: NEXT_PUBLIC_SUPABASE_URL=...
```

---

### Erro: JSON retorna "configured": false

**Causa:** Gateway não salvo no banco ainda

**Solução:**

```
1. Voltar para: http://localhost:3000/dashboard/settings/payment
2. Verificar se "✅ Configurado" aparece
3. Se não aparecer: Tentar salvar credenciais novamente
4. Se erro: Ver Troubleshooting FASE 2
5. Se sucesso: Testar endpoint novamente
```

---

### Erro: JSON retorna "status": "invalid"

**Causa:** Token é inválido no Mercado Pago

**Solução:**

```
1. Ir para: https://www.mercadopago.com.br/developers/panel/app
2. Verificar se token não expirou
3. Se expirou: Regenerar credenciais
4. Copiar novo token
5. Salvar em http://localhost:3000/dashboard/settings/payment
6. Testar novamente endpoint
```

---

## ❌ FASE 4: Verificar Banco

### Erro: "Supabase Dashboard não conecta"

**Causa:** Problema de rede ou account

**Solução:**

```
1. Verificar internet
2. Acessar: https://supabase.com
3. Se não consegue: Problema de rede
4. Se consegue mas não abre projeto: Logout/Login
```

---

### Erro: Query retorna vazio (0 linhas)

**Causa:** RLS está bloqueando ou dados não foram salvos

**Solução:**

```sql
-- 1. Verificar se usuário está correto:
SELECT auth.uid();
-- Deve retornar seu user_id (UUID)

-- 2. Verificar se dados foram salvos (como admin):
SELECT * FROM payment_gateways LIMIT 10;
-- Sem WHERE - deve retornar dados

-- 3. Se tem dados mas não vê via auth.uid():
-- RLS está muito restritivo
-- Verificar policies em: Supabase > Auth > Policies
```

---

### Erro: "permission denied for schema public"

**Causa:** RLS policies quebradas ou permissões insuficientes

**Solução:**

```bash
# 1. Dentro do Supabase > Authentication
# 2. Verificar se suas policies têm SELECT privilege

# Se não tem, restaurar:
supabase db push

# Confirmar com "y" quando pedir
```

---

## 🆘 Erro Não Listado Aqui?

### Passo 1: Gather Information

```
1. Qual foi o erro EXATO? (copiar msg inteira)
2. Quando apareceu? (qual fase?)
3. O que você fez antes? (último ação)
4. Console do browser (F12) mostra erro?
5. Terminal do servidor mostra erro?
```

### Passo 2: Check Common Causes

```bash
# Verificar cada item:

# 1. Servidor rodando?
curl http://localhost:3000

# 2. Banco conecta?
# Supabase > SQL Editor > SELECT 1;

# 3. Token do MP é válido?
# Abrir: http://localhost:3000/api/test/payment-gateway
# Se "status": "invalid" → token errado

# 4. Autenticação funciona?
# http://localhost:3000/dashboard
# Se não consegue logar → problema de auth
```

### Passo 3: Nuclear Option

```bash
# Se nada funciona, limpar tudo:
rm -rf .next node_modules pnpm-lock.yaml
pnpm install
pnpm dev

# Depois:
# - Fazer logout/login
# - Tentar tudo novamente
```

---

## 📞 Logs Importantes

### Onde Procurar Erros?

```
1. BROWSER (F12 > Console):
   ✓ Erros de client-side
   ✓ Toast messages
   ✓ Network requests

2. TERMINAL (onde pnpm dev):
   ✓ Erros de servidor
   ✓ Server action errors
   ✓ Warnings de TypeScript

3. SUPABASE DASHBOARD:
   ✓ Logs de query (SQL Editor)
   ✓ Auth logs (Authentication)
   ✓ Real-time logs (Logs)

4. Mercado Pago Dashboard:
   ✓ API activity
   ✓ Webhook history
   ✓ Error logs
```

---

## ✅ Sucesso Após Resolver?

1. **Document it:** Anote qual era o erro e como resolveu
2. **Share it:** Se for erro recorrente, avisar
3. **Move on:** Continue com próxima fase

---

## 📋 Quick Reference

| Sintoma             | Arquivo       | Check              |
| ------------------- | ------------- | ------------------ |
| Servidor não inicia | Terminal      | `pnpm dev`         |
| Page não renderiza  | .next folder  | `rm -rf .next`     |
| DB vazio            | Supabase      | `supabase db push` |
| Toast vermelho      | Browser F12   | Error message      |
| Endpoint 500        | Terminal      | Server logs        |
| RLS blocked         | Supabase Auth | Policies           |
| Token invalid       | MP Dashboard  | Regenerate         |

---

**Tempo de Debug:** ~5-10 min por erro  
**Chance de Sucesso:** 99% com este guide  
**Próximo Passo:** Voltar para [PAYMENT_START_TODAY.md](PAYMENT_START_TODAY.md)

---

**Criado:** 20 de junho de 2026  
**Categoria:** Debugging  
**Prioridade:** Alta  
**Status:** Use quando precisar
