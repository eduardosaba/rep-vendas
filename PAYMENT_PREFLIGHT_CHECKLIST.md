# ✈️ PRE-FLIGHT CHECKLIST - Antes de Começar

Antes de executar `PAYMENT_START_TODAY.md`, rode este checklist para garantir que tudo está em ordem.

---

## 🔧 Verificações Técnicas (2 min)

### 1️⃣ Arquivo `.env.local` Existe?

```bash
# Terminal
ls -la .env.local

# Deve existir e conter:
NEXT_PUBLIC_SUPABASE_URL=https://...
SUPABASE_SERVICE_ROLE_KEY=eyJa...
NEXT_PUBLIC_MERCADO_PAGO_PUBLIC_KEY=APP_USR-...  (opcional agora)
MERCADO_PAGO_ACCESS_TOKEN=APP_USR-...             (vazio por enquanto)
```

### 2️⃣ `.gitignore` Protege `.env.local`?

```bash
# Terminal
grep "\.env\.local" .gitignore

# Deve retornar:
# .env.local
```

✅ **Se não contem:**

```bash
echo ".env.local" >> .gitignore
```

### 3️⃣ Branch Correta?

```bash
# Terminal
git branch

# Deve mostrar:
# * feature/checkout-online  ← Com asterisco (branch ativa)
```

### 4️⃣ TypeScript Sem Erros?

```bash
# Terminal
pnpm type-check

# Deve retornar: ✓ No errors found
```

✅ **Se houver erros:**

```bash
# Tentar compilar mesmo assim:
pnpm build --no-lint
```

### 5️⃣ Dependências Instaladas?

```bash
# Terminal
pnpm list mercadopago

# Se não contem:
pnpm add mercadopago
```

### 6️⃣ Servidor Inicia Sem Erro?

```bash
# Terminal 1
pnpm dev

# Deve mostrar:
# ▲ Next.js 14.x
# - Local: http://localhost:3000
# - Ready in XXXms
```

✅ **Se houver erro:**

```bash
# Limpar cache e tentar novamente:
rm -rf .next node_modules
pnpm install
pnpm dev
```

---

## 🗄️ Verificações de Banco de Dados (3 min)

### 7️⃣ Migrations Aplicadas?

```bash
# Terminal
supabase db pull

# Ou verifique no Supabase Dashboard:
# SQL Editor > Ver migrations aplicadas
```

✅ **Se não estão aplicadas:**

```bash
supabase db push
# Confirma com "y" se solicitar
```

### 8️⃣ Tabelas Existem?

```sql
-- Supabase > SQL Editor
SELECT table_name
FROM information_schema.tables
WHERE table_schema = 'public'
  AND table_name IN ('payment_gateways', 'payment_transactions', 'webhook_queue');

-- Deve retornar 3 linhas
```

### 9️⃣ RLS Ativado?

```sql
-- Supabase > SQL Editor
SELECT
  schemaname,
  tablename,
  rowsecurity
FROM pg_tables
WHERE tablename IN ('payment_gateways', 'payment_transactions', 'webhook_queue');

-- Coluna 'rowsecurity' deve ser TRUE para todas
```

### 🔟 Consegue Logar no Dashboard?

```
1. Acesse: http://localhost:3000
2. Login com sua conta
3. Deve aparecer: Dashboard principal
4. Navegue para: Settings (engrenagem)
```

✅ **Se não consegue:**

- [ ] Verificar se está registrado
- [ ] Testar com conta de teste
- [ ] Verificar console do browser (F12)

---

## 📋 Verificações de Mercado Pago (2 min)

### 1️⃣ Tem Conta do Mercado Pago?

```
1. Acesse: https://www.mercadopago.com.br
2. Se não tem: Crie (gratuito, apenas email + senha)
3. Confirme email
```

### 2️⃣ Tem Acesso ao Developer Panel?

```
1. Acesse: https://www.mercadopago.com.br/developers/panel/app
2. Se não aparece: Clique em "Criar aplicação"
3. Nome: "RepVendas - Checkout Online"
4. Tipo: "E-commerce"
```

### 3️⃣ Consegue Copiar Access Token?

```
1. Dashboard > Settings > Credenciais
2. Environment: "Production" (NÃO Sandbox!)
3. Access Token: Clique no ícone de copiar
4. Cole em um notepad temporário
```

✅ **Se não consegue:**

- [ ] Verificar se conta é validada (email confirmado)
- [ ] Regenerar credenciais se necessário
- [ ] Usar Sandbox para testes iniciais

---

## ✅ Checklist Pré-Voo Final

```
AMBIENTE:
  [ ] .env.local existe e protegido
  [ ] Branch: feature/checkout-online
  [ ] Sem erros TypeScript (pnpm type-check)
  [ ] mercadopago package instalado

SERVIDOR:
  [ ] pnpm dev inicia sem erros
  [ ] Dashboard abre sem erros
  [ ] Consegue fazer login

BANCO:
  [ ] payment_gateways table existe
  [ ] payment_transactions table existe
  [ ] webhook_queue table existe
  [ ] RLS ativado em todas as 3

MERCADO PAGO:
  [ ] Conta criada e validada
  [ ] Developer Panel acessível
  [ ] Access Token copiado (production)
  [ ] Salvo em local seguro

DOCUMENTAÇÃO:
  [ ] PAYMENT_START_TODAY.md lido
  [ ] PAYMENT_QUICK_TEST_5MIN.md à mão
  [ ] PAYMENT_READY_TO_START.md como referência
```

---

## 🚨 "Preciso de Ajuda!" - Comandos Rápidos

### Se TypeScript está com erro:

```bash
pnpm type-check
# Se houver erro:
pnpm build --no-lint
```

### Se servidor não inicia:

```bash
rm -rf .next node_modules pnpm-lock.yaml
pnpm install
pnpm dev
```

### Se banco não tem tabelas:

```bash
supabase db push
# Confirme as perguntas com "y"
```

### Se não consegue fazer login:

```bash
# Limpar cookies do browser (F12 > Application > Cookies > Delete All)
# Fazer logout completo
# Fazer login novamente
```

### Se RLS está bloqueando:

```bash
# No Supabase Dashboard, verificar:
# SQL Editor > Execute:
SELECT * FROM payment_gateways WHERE user_id = auth.uid();
# Deve retornar dados do usuário logado
```

---

## 📞 Troubleshooting Antes de Começar

| Sintoma                                          | Causa Provável        | Solução                                               |
| ------------------------------------------------ | --------------------- | ----------------------------------------------------- |
| "404 Not Found" em `/dashboard/settings/payment` | Page não renderiza    | `pnpm dev` reiniciar                                  |
| "TypeError: Cannot read 'user' of undefined"     | Não está autenticado  | Login novamente                                       |
| "RLS policy violation"                           | Tabela sem RLS        | `supabase db push`                                    |
| "Invalid token" ao salvar                        | Banco não conecta     | Verificar `SUPABASE_SERVICE_ROLE_KEY` em `.env.local` |
| Página fica "loading"                            | Server action travado | Verificar console (F12) para erro real                |

---

## ✨ Se Tudo Passar no Checklist

```
VOCÊ ESTÁ 100% PRONTO PARA:

✅ Executar PAYMENT_START_TODAY.md
✅ Configurar seu Access Token
✅ Ver status "✅ Configurado" no dashboard
✅ Validar com endpoint de teste
✅ Verificar dados no banco
```

---

## 🎯 Próximo Passo

Se passou em TODOS os checks acima:

**Abra: [PAYMENT_START_TODAY.md](PAYMENT_START_TODAY.md)**

E execute com confiança! ✈️

---

**Tempo:** 5 minutos  
**Impacto:** 100% de chance de sucesso  
**Risco:** Praticamente zero

---

**Você está pronto! 🚀**
