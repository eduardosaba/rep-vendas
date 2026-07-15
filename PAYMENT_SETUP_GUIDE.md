# Configuração de Environment Variables para Sistema de Pagamento

## 📌 Variáveis Necessárias

### 1. **Mercado Pago - Credenciais Públicas** (Safe to expose)

```bash
NEXT_PUBLIC_MERCADO_PAGO_PUBLIC_KEY=YOUR_PUBLIC_KEY_HERE
```

- Obtém em: https://www.mercadopago.com.br/developers/panel/app
- Exemplo: `APP_USR-1234567890abcdef1234567890abcdef`

### 2. **Mercado Pago - Credenciais Privadas** (⚠️ SECRETO - Server-only)

```bash
MERCADO_PAGO_ACCESS_TOKEN=YOUR_ACCESS_TOKEN_HERE
MERCADO_PAGO_WEBHOOK_SECRET=YOUR_WEBHOOK_SECRET_HERE
```

- Access Token: Obtém no painel do MP (Credenciais da API)
- Webhook Secret: Configurar em Settings > Webhooks (ou gerar novo endpoint)

### 3. **Configuração de Webhook**

```bash
NEXT_PUBLIC_WEBHOOK_URL=https://seu-dominio.com/api/webhooks/payment/mercadopago
```

- Usar em: Configurações > Webhooks do Mercado Pago
- Produção: `https://repvendas.vercel.app/api/webhooks/payment/mercadopago`
- Development: `http://localhost:3000/api/webhooks/payment/mercadopago` + ngrok

### 4. **Supabase Vault (Opcional mas Recomendado)**

```bash
SUPABASE_VAULT_KEY=your_vault_key_from_supabase
```

- Necessário se usar Supabase Vault para criptografar chaves no banco

## 🔐 Como Obter as Credenciais do Mercado Pago

### Passo 1: Criar Conta de Desenvolvedor

1. Acesse: https://www.mercadopago.com.br/developers/
2. Faça login (ou crie conta)
3. Vá para: Dashboard > Credenciais

### Passo 2: Copiar as Chaves

- **Public Key**: Copie a chave pública (começa com `APP_USR`)
- **Access Token**: Copie o token de acesso

### Passo 3: Configurar Webhook

1. No Dashboard, vá para: Notificações > Webhooks
2. Adicione novo endpoint:
   - URL: `https://seu-dominio.com/api/webhooks/payment/mercadopago`
   - Selecione eventos: `payment.created`, `payment.updated`
3. Salve o **Webhook Secret** que será fornecido

## 📝 Arquivo `.env.local` (Desenvolvimento)

```bash
# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://xxxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJxxxxx
SUPABASE_SERVICE_ROLE_KEY=eyJxxxxx

# Mercado Pago
NEXT_PUBLIC_MERCADO_PAGO_PUBLIC_KEY=APP_USR-1234567890abcdef
MERCADO_PAGO_ACCESS_TOKEN=APP_USR-1234567890abcdef
MERCADO_PAGO_WEBHOOK_SECRET=webhook_secret_12345
NEXT_PUBLIC_WEBHOOK_URL=http://localhost:3000/api/webhooks/payment/mercadopago

# Sentry (opcional)
NEXT_PUBLIC_SENTRY_AUTH_TOKEN=xxxxx
```

## 🚀 Deploy no Vercel

### No Vercel Dashboard:

1. Acesse: Project Settings > Environment Variables
2. Adicione:

```
NEXT_PUBLIC_MERCADO_PAGO_PUBLIC_KEY = APP_USR-xxxxx
MERCADO_PAGO_ACCESS_TOKEN = APP_USR-xxxxx
MERCADO_PAGO_WEBHOOK_SECRET = webhook_secret_xxxxx
NEXT_PUBLIC_WEBHOOK_URL = https://seu-dominio.com/api/webhooks/payment/mercadopago
```

3. Clique em "Add All" para aplicar a todos os ambientes (Production, Preview, Development)

## ✅ Teste de Validação

Depois de configurar, execute:

```bash
npm run dev
```

E verifique no console:

```bash
✅ Mercado Pago Access Token loaded
✅ Webhook URL configured: https://seu-dominio.com/api/webhooks/payment/mercadopago
```

## 🔍 Troubleshooting

### Erro: "MERCADO_PAGO_ACCESS_TOKEN is undefined"

- Verifique se a variável está em `.env.local` (desenvolvimento)
- Ou em Environment Variables no Vercel (produção)
- Reinicie o servidor com `npm run dev`

### Erro ao criar preferência no MP

- Valide o Access Token em: https://www.mercadopago.com.br/developers/panel/credentials
- Verifique se a conta está em ambiente de **produção** (não sandbox)

### Webhook não recebe notificações

- Teste o endpoint manualmente: `curl -X POST https://seu-dominio.com/api/webhooks/payment/mercadopago -H "Content-Type: application/json" -d '{"action":"payment.updated"}'`
- Verifique os logs no Vercel Dashboard > Functions > Logs

## 📚 Referências

- [Docs Mercado Pago - Integração](https://www.mercadopago.com.br/developers/pt/docs/checkout-pro/checkout-pro-web-integration)
- [Webhooks IPN](https://www.mercadopago.com.br/developers/pt/docs/webhooks)
- [Supabase Vault](https://supabase.com/docs/guides/database/vault)
