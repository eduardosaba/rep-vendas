# Guia de Variáveis de Ambiente — RepVendas (V1.0)

Este arquivo lista as variáveis essenciais para rodar funcionalidades críticas (Supabase, Inngest, impersonation, RPCs administrativas).

> Observações de segurança
>
> - Valores `NEXT_PUBLIC_*` são expostos ao cliente — não coloque chaves sensíveis aqui.
> - Chaves de serviço (ex.: `SUPABASE_SERVICE_ROLE_KEY`) devem ficar apenas no servidor (.env.local) e nunca em variáveis públicas.

## Variáveis Supabase (mínimo)

- `NEXT_PUBLIC_SUPABASE_URL` — URL pública do projeto Supabase.
- `NEXT_PUBLIC_SUPABASE_ANON_KEY` — Chave anônima pública (apenas leitura/respeita RLS no cliente).
- `SUPABASE_SERVICE_ROLE_KEY` — Chave server-side com privilégios (inserir/atualizar sem RLS). Só no servidor.

## Autenticação / Sessão

- `NEXT_PUBLIC_APP_URL` — URL pública do app (ex: https://app.example.com).
- `NEXTAUTH_URL` (se usar NextAuth) — URL para callbacks.

## Impersonation / Cookies

- `IMPERSONATE_COOKIE_NAME` — (opcional) Nome do cookie de impersonation. Padrão usado no código: `impersonate_user_id`.
- `IMPERSONATE_COOKIE_TTL` — Tempo em segundos do cookie de impersonation. Recomendado: `7200` (2 horas).
- `COOKIE_SECURE` — `true` recomendado em produção (apenas HTTPS).
- `COOKIE_SAMESITE` — `Lax` ou `Strict` (recomendo `Lax`).

> Nota: a implementação do `getActiveUserId()` depende do cookie httpOnly `impersonate_user_id` para decidir o usuário ativo — garanta `httpOnly` e `secure` em produção.

## Inngest (ou Webhooks / Workers)

- `INNGEST_API_KEY` — Chave para chamadas autenticadas à API Inngest (server-side).
- `INNGEST_SIGNING_SECRET` — Segredo para validar webhooks recebidos (server-side).
- `INNGEST_PROJECT` — Identificador do projeto (opcional conforme integração).

## Armazenamento / CDN

- `NEXT_PUBLIC_SUPABASE_STORAGE_URL` — (opcional) URL do bucket público, se usado diretamente.

## Integrações de Pagamento / Email (exemplos)

- `ASAAS_API_KEY` ou `PAGARME_KEY` — chaves de gateway (server-only).
- `SENDGRID_API_KEY` — para envios de email (server-only).

## Variáveis operacionais / recomendadas

- `NODE_ENV` — `development`/`production`.
- `LOG_LEVEL` — `info`/`debug`/`warn`.
- `MAX_IMAGE_UPLOAD_MB` — limite de upload (ex: `10`).

## Exemplo mínimo de `.env.local`

```env
NEXT_PUBLIC_SUPABASE_URL=https://xyz.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=public-anon-key-here
SUPABASE_SERVICE_ROLE_KEY=service-role-key-keep-secret
NEXT_PUBLIC_APP_URL=http://localhost:3000
IMPERSONATE_COOKIE_NAME=impersonate_user_id
IMPERSONATE_COOKIE_TTL=7200
COOKIE_SECURE=false # true em produção
INNGEST_API_KEY=inngest_api_key_here
INNGEST_SIGNING_SECRET=inngest_signing_secret_here
ASAAS_API_KEY=xxxxx
SENDGRID_API_KEY=xxxxx
NODE_ENV=development
```

## Checklist antes do deploy

- [ ] `SUPABASE_SERVICE_ROLE_KEY` em variável **server-only** (verifique `process.env` no servidor).
- [ ] Políticas RLS válidas para `activity_logs`, `products`, `profiles`.
- [ ] Rotina de rotação de chaves e acesso responsável (não deixar chaves long-lived sem controle).
- [ ] Cookies de impersonation marcados `httpOnly`, `secure` e com TTL razoável.
- [ ] Webhooks configurados com `INNGEST_SIGNING_SECRET` e verificados no servidor.

Se quiser, eu gerei também um `scripts/check-env.js` simples (`/scripts/check-env.js`) para validar localmente que as variáveis mínimas existem antes de rodar o servidor.

## Opção B — Como preencher as variáveis faltantes (guia prático)

Se o `scripts/check-env.js` identificou variáveis faltando, aqui estão valores e exemplos práticos que você pode usar em desenvolvimento.

- `NEXT_PUBLIC_APP_URL`:
  - O que é: URL base do app.
  - Exemplo (local): `http://localhost:3000`

- `IMPERSONATE_COOKIE_NAME`:
  - O que é: nome do cookie httpOnly usado para impersonation.
  - Sugestão: `repvendas_impersonate_token` (ou `impersonate_user_id` para compatibilidade imediata).

- `INNGEST_API_KEY` e `INNGEST_SIGNING_SECRET`:
  - O que são: chaves usadas para autenticação com o Inngest (workers / webhooks).
  - Onde pegar: painel do Inngest (Settings → API Keys). Em dev, se não houver Inngest, você pode usar valores falsos temporários apenas para passar no check (ex: `dev_inngest_key`), porém em produção esses valores devem ser reais.

### Exemplo `.env.local` rápido (com valores de desenvolvimento)

```env
NEXT_PUBLIC_SUPABASE_URL=https://xyz.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=public-anon-key-here
SUPABASE_SERVICE_ROLE_KEY=service-role-key-keep-secret
NEXT_PUBLIC_APP_URL=http://localhost:3000
IMPERSONATE_COOKIE_NAME=repvendas_impersonate_token
IMPERSONATE_COOKIE_TTL=7200
COOKIE_SECURE=false # true em produção
INNGEST_API_KEY=dev_inngest_key
INNGEST_SIGNING_SECRET=dev_inngest_secret
NODE_ENV=development
```

> Atenção: nunca comitar chaves reais. Use `.env.local` ou variáveis de ambiente seguras no servidor.
