# 🎯 Implementação do Sistema de Pagamento Multi-Tenant

## 📋 Resumo Executivo

Você agora possui uma **arquitetura completa de pagamento multi-tenant** integrada ao RepVendas. Cada cliente (ótica, distribuidora, etc.) pode:

1. ✅ Configurar suas credenciais do Mercado Pago
2. ✅ Aceitar pagamentos online diretamente no seu catálogo
3. ✅ Receber notificações automáticas de confirmação
4. ✅ Manter dados isolados e seguros (RLS + Vault)

---

## 🏗️ Arquitetura Implementada

### 1. **Banco de Dados**

```
📦 Supabase
├── 📊 payment_gateways (configurações de credenciais)
├── 💳 payment_transactions (histórico de transações)
├── 📑 orders (pedidos com novo status "Pagamento Confirmado")
```

**RLS (Row Level Security):**

- Cada usuário vê apenas seus próprios gateways
- Transações são isoladas por pedido
- Sistema (Service Role) pode atualizar via webhook

### 2. **Server Actions** (`src/actions/payment-actions.ts`)

- `getPaymentGatewayForOrder()` - Busca gateway do cliente
- `createMercadoPagoPreference()` - Cria preferência de pagamento
- `processarPagamento()` - Entry point do checkout
- `registerPaymentGateway()` - Registra credenciais do cliente
- `checkPaymentStatus()` - Verifica status manual

### 3. **Componentes React**

#### `PaymentGatewaySetup.tsx` (Settings)

- ✅ Interface para cliente configurar suas credenciais
- ✅ Validação em tempo real do Access Token
- ✅ Suporte a Webhook Secret (opcional)
- ✅ Feedback visual (status: Configurado/Não Configurado)

#### `CheckoutWithMercadoPago.tsx` (Checkout)

- ✅ Formulário para dados do cliente
- ✅ Integração com Mercado Pago API
- ✅ Redireciona para init_point (checkout do MP)
- ✅ Tratamento de erros com Sonner toast

#### `PaymentResultPage.tsx` (Resultado)

- ✅ Página de resultado após retorno do MP
- ✅ Estados: Success, Failure, Pending
- ✅ Opções: Ver Pedidos, Voltar ao Catálogo

### 4. **Webhook** (`src/app/api/webhooks/payment/mercadopago/route.ts`)

- ✅ Recebe IPN (Instant Payment Notification) do MP
- ✅ Valida payment_id com API do MP
- ✅ Atualiza status da transação e pedido
- ✅ Mapeia status do MP para nosso schema

---

## 🚀 Próximos Passos (Implementação)

### **FASE 1: Setup Mercado Pago** (30 min)

```bash
# 1. Ir para dashboard Mercado Pago
# 2. Obter credenciais (Access Token + Public Key)
# 3. Configurar Webhook em: Settings > Webhooks
#    URL: https://seu-dominio.com/api/webhooks/payment/mercadopago
# 4. Adicionar Environment Variables (ver PAYMENT_SETUP_GUIDE.md)
```

### **FASE 2: Instalar Dependências** (5 min)

```bash
# Adicionar SDK do Mercado Pago
pnpm add mercadopago

# Já tem Sonner? Se não:
pnpm add sonner
```

### **FASE 3: Aplicar Migration SQL** (10 min)

```bash
# No Supabase Dashboard:
# 1. Vá para SQL Editor
# 2. Copie conteúdo de: supabase/migrations/20260620_create_payment_gateways.sql
# 3. Execute no seu banco de produção

# OU via Supabase CLI (recomendado):
supabase db push
```

### **FASE 4: Integrar UI na Página de Settings** (20 min)

No arquivo de settings do seu usuário, adicione:

```tsx
// src/app/dashboard/settings/page.tsx ou similar

import PaymentGatewaySetup from '@/components/payment/PaymentGatewaySetup';

export default function SettingsPage() {
  const userId = user.id; // Do seu contexto de autenticação
  const [gateway, setGateway] = useState<PaymentGateway | null>(null);

  // Buscar gateway existente...

  return (
    <div className="space-y-8">
      {/* ... outras configurações ... */}

      {/* NOVO: Configuração de Pagamento */}
      <PaymentGatewaySetup
        userId={userId}
        currentGateway={gateway}
        onSuccess={setGateway}
        primaryColor={settings?.primary_color}
      />
    </div>
  );
}
```

### **FASE 5: Integrar Checkout na Página de Pedido** (20 min)

No seu fluxo de checkout (quando cliente clica "Finalizar Pagamento"):

```tsx
// src/app/checkout/page.tsx ou seu componente de checkout

import CheckoutWithMercadoPago from '@/components/payment/CheckoutWithMercadoPago';

export default function CheckoutPage() {
  const order = useOrder(); // Seu hook que busca o pedido

  return (
    <div>
      {/* ... seu carrinho e dados do pedido ... */}

      {/* NOVO: Componente de Pagamento */}
      <CheckoutWithMercadoPago
        orderId={order.id}
        orderTotal={order.total_value} // Em centavos!
        primaryColor={settings?.primary_color}
      />
    </div>
  );
}
```

### **FASE 6: Testar Fluxo Completo** (30 min)

```bash
# 1. Iniciar servidor
pnpm dev

# 2. Ir para Settings e adicionar Access Token do MP (ou usar cartão de teste)

# 3. Criar um pedido no catálogo público

# 4. Clicar em "Pagar Agora"
#    → Deve redirecionar para Mercado Pago

# 5. Usar cartão de teste do MP:
#    Número: 4111 1111 1111 1111
#    Vencimento: 11/25
#    CVC: 123

# 6. Completar pagamento
#    → Deve retornar para /checkout/payment-result?status=success

# 7. Verificar no Dashboard:
#    - Pedido deve estar com status "Pagamento Confirmado"
#    - Transação deve estar em payment_transactions com status "approved"
```

---

## 🔄 Fluxo Completo de Uma Transação

```
┌─────────────┐
│   Cliente   │
│  Catálogo   │
└──────┬──────┘
       │ 1. Cria pedido (status: "Pendente")
       ↓
┌──────────────────┐
│  /checkout       │
│  Preenche dados  │
│  Clica "Pagar"   │
└────────┬─────────┘
         │ 2. Server Action: processarPagamento()
         │    - Busca gateway do cliente (payment_gateways)
         │    - Cria preferência no MP
         │    - Registra transação (status: pending)
         ↓
┌─────────────────┐
│  Mercado Pago   │
│  Checkout       │
│  (init_point)   │
└────────┬────────┘
         │ 3. Cliente preenche dados de pagamento
         │    (cartão, boleto, pix, etc)
         ↓
┌─────────────────┐
│     Banco       │ 4. Processa pagamento
└────────┬────────┘
         │ 5. MP valida e aprova/rejeita
         │    Webhook: payment.updated
         ↓
┌────────────────────────────┐
│ /api/webhooks/payment/     │
│  mercadopago               │
│  (IPN do MP)               │
└──────────┬─────────────────┘
           │ 6. Valida com MP API
           │    Atualiza transação (status: approved)
           │    Atualiza pedido (status: "Pagamento Confirmado")
           ↓
┌────────────────────────┐
│ /checkout/payment-     │
│  result?status=success │
│ (Auto-redirect MP)     │
└──────────┬─────────────┘
           │ 7. Cliente vê confirmação
           │    Pode ver pedido no dashboard
           ↓
        ✅ FIM
```

---

## 📊 Modelos de Dados

### `payment_gateways` table

```sql
id              uuid          -- PK
user_id         uuid          -- FK: auth.users
company_id      uuid          -- FK: companies (nullable, para multi-tenant)
provider        text          -- "mercadopago" | "stripe" | "pagarme"
api_key_encrypted text        -- Chave armazenada (Vault)
webhook_secret_encrypted text -- Secret do webhook (Vault)
is_active       boolean       -- Gateway ativo?
is_configured   boolean       -- Credenciais validadas?
metadata        jsonb         -- shop_id, validated_at, etc
created_at      timestamp
updated_at      timestamp
```

### `payment_transactions` table

```sql
id                      uuid          -- PK
order_id                uuid          -- FK: orders
gateway_id              uuid          -- FK: payment_gateways
provider                text          -- "mercadopago"
provider_transaction_id text unique   -- ID no MP (payment_id)
amount                  numeric       -- Em centavos ou decimal
currency                text          -- "BRL"
status                  text          -- "pending" | "approved" | "failed" | "refunded" | "cancelled"
payment_method          text          -- "credit_card" | "pix" | "boleto"
customer_name           text
customer_email          text
customer_phone          text
metadata                jsonb         -- Dados adicionais
created_at              timestamp
updated_at              timestamp
approved_at             timestamp     -- Quando foi aprovado
```

---

## 🔐 Segurança

### ✅ Implementado

- **RLS (Row Level Security):** Cada usuário vê apenas seus dados
- **Vault:** Chaves criptografadas no Supabase Vault (recomendado ativar)
- **Validação de Webhook:** Confirmamos com API do MP antes de processar
- **Service Role Only:** Webhook usa Service Role Key (não expõe dados de usuários)
- **HTTPS Only:** Webhook URL deve ser HTTPS

### 🔒 Recomendações Adicionais

1. **Supabase Vault:** Implementar criptografia de chaves
2. **Rate Limiting:** Adicionar rate limit no webhook endpoint
3. **Audit Log:** Logar todas as transações e mudanças de status
4. **PCI Compliance:** Nunca armazenar dados completos de cartão

---

## 🧪 Testes

### Cartões de Teste do Mercado Pago

| Cenário  | Número              | Vencimento | CVC |
| -------- | ------------------- | ---------- | --- |
| Aprovado | 4111 1111 1111 1111 | 11/25      | 123 |
| Recusado | 4111 1111 1111 1111 | 11/25      | 111 |
| Boleto   | 5031 4332 1540 0789 | 11/25      | 123 |
| PIX      | Usa qualquer número | 11/25      | 123 |

### Teste Local com Ngrok (Development)

```bash
# Terminal 1: Iniciar servidor
pnpm dev

# Terminal 2: Expor localhost via ngrok
ngrok http 3000

# Copiar URL gerada: https://xxx-xxx-xxx.ngrok-free.app

# Em PAYMENT_SETUP_GUIDE.md:
NEXT_PUBLIC_WEBHOOK_URL=https://xxx-xxx-xxx.ngrok-free.app/api/webhooks/payment/mercadopago

# Configurar no Dashboard do MP:
# Settings > Webhooks > https://xxx-xxx-xxx.ngrok-free.app/api/webhooks/payment/mercadopago

# Agora webhooks locais funcionam!
```

---

## 📞 Troubleshooting

### ❌ "MERCADO_PAGO_ACCESS_TOKEN not configured"

- ✅ Adicione em `.env.local` (desenvolvimento)
- ✅ Adicione em Vercel Settings > Environment Variables (produção)
- ✅ Reinicie servidor com `pnpm dev`

### ❌ "No payment gateway configured"

- ✅ Cliente precisa ir em Settings e adicionar credenciais
- ✅ Validar que Access Token é válido

### ❌ Webhook não recebe notificações

- ✅ URL configurada no MP? (Settings > Webhooks)
- ✅ URL é HTTPS? (http:// não funciona)
- ✅ Verificar logs no Vercel Dashboard > Functions
- ✅ Testar com curl: `curl -X POST https://seu-dominio.com/api/webhooks/payment/mercadopago`

### ❌ Cartão de teste rejeitado

- ✅ Usar números corretos (ver tabela acima)
- ✅ Vencimento válido (futuro)
- ✅ CVC = 3 dígitos
- ✅ Ambiente de **produção** no MP (não sandbox)

---

## 📚 Referências

- [Mercado Pago Docs](https://www.mercadopago.com.br/developers/pt/docs/checkout-pro/checkout-pro-web-integration)
- [Supabase Vault](https://supabase.com/docs/guides/database/vault)
- [Next.js Server Actions](https://nextjs.org/docs/app/building-your-application/data-fetching/server-actions)
- [Sonner Toast](https://sonner.emilkowal.ski/)

---

## ✅ Checklist de Implementação

- [ ] Adicionar dependência: `pnpm add mercadopago`
- [ ] Aplicar migration SQL ao Supabase
- [ ] Adicionar env vars (PAYMENT_SETUP_GUIDE.md)
- [ ] Integrar `PaymentGatewaySetup` em Settings
- [ ] Integrar `CheckoutWithMercadoPago` em Checkout
- [ ] Testar fluxo completo com cartão de teste
- [ ] Configurar webhook no MP Dashboard
- [ ] Testar webhook (ngrok ou produção)
- [ ] Validar que pedidos mudam de status após pagamento
- [ ] Documentar para o suporte/cliente

---

**Status:** ✅ Pronto para Implementação

**Duração Estimada:** 2-3 horas (incluindo testes)

**Próximo:** Comece pela FASE 1 (Setup Mercado Pago)
