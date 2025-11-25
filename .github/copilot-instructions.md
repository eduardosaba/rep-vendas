<!-- Arquivo gerado automaticamente por copiloto; por favor revise. -->

# Instruções rápidas para agentes de IA (Copilot / agents)

Resumo rápido

- Projeto: `rep-vendas` — aplicação Next.js (app router) + Supabase (Auth/DB/Storage).
- Objetivo: catálogo público + dashboard administrativo. Autenticação via Supabase.

Arquitetura e fluxo importante

- Frontend: `src/app` (app-router). Componentes e hooks em `src/components` e `src/hooks`.
- Estado e lógica de catálogo: `src/hooks/useCatalog.ts` — exemplo principal de como o catálogo, filtros, paginação, favoritos e carrinho são gerenciados (usa `supabase` e `localStorage`).
- Client Supabase: `src/lib/supabaseClient.ts` — único cliente Supabase usado por frontend e APIs.
- Middleware de autenticação/roles: `src/middleware.ts` — protege rotas `/dashboard` e `/admin`, checa `profiles.role` (`master` ou `rep`) e validade de licença (`license_expires_at`).
- Endpoints importantes: `src/app/api/save-cart/route.ts` e `src/app/api/load-cart/route.ts` — lógica para salvar/carregar pedidos por `short_id`.
- Banco de dados: scripts SQL em `SQL/` e migrações em `supabase/migrations/` (checar `SQL/supabase_schema.sql` para esquema principal).

Comandos de desenvolvedor (úteis para automações)

- Instalar dependências: `pnpm install` (o projeto usa `pnpm`).
- Dev: `pnpm dev` (script `dev` usa `next dev --webpack`).
- Build: `pnpm build`; Start: `pnpm start`.
- Linter/format: `pnpm run lint` e `pnpm run format`.
- Typecheck: `pnpm run typecheck` (usa `tsc --noEmit`).
- Tests: `pnpm test` (Jest). Pode rodar `pnpm test --watch` conforme preferir.
- Scripts auxiliares: `pnpm run env-check` (valida `.env.local`), `pnpm run dependency-check` (depcheck).

Variáveis de ambiente críticas

- `NEXT_PUBLIC_SUPABASE_URL` e `NEXT_PUBLIC_SUPABASE_ANON_KEY` — obrigatórias para dev e APIs.
- `.env.local` é verificado pelo script `env-check` (veja `package.json`).

Padrões e convenções específicos do projeto

- Autenticação: Supabase Auth + tabela `profiles` que contém `role`, `status` e `license_expires_at`. Roles usadas: `master` (admin), `rep` (representante).
  -- Salvamento de Pedido (Saved Carts): tabela `saved_carts` com `short_id` (6-8 chars), `items` (JSON) e `expires_at` (padrão 30 dias). Lógica de criação em `src/app/api/save-cart/route.ts`.
- LocalStorage keys usados pelo frontend:
  - `cart` — objeto `{ [productId]: quantity }`.
  - `favorites` — array de ids.
  - `itemsPerPage` — preferência do usuário.
  - `priceAccessGranted`, `priceAccessExpiresAt` — controle temporário para mostrar preços.
- Formato de busca: uso de `ilike` em `useCatalog.ts` para pesquisa parcial no `name`.
- Paginação: controlada em `useCatalog.ts` via `range(from,to)` no Supabase. `DEFAULT_ITEMS_PER_PAGE = 20`.

Integrações e pontos de atenção

- Supabase: usado tanto em páginas cliente quanto em rotas de API; não há uma camada de proxy separada — evite duplicar a lógica do cliente.
- Migrations: confira `supabase/migrations/` para alterações recentes; use `SQL/` para scripts ad-hoc (por exemplo `SQL/supabase_schema.sql`).
- Rotas protegidas: `src/middleware.ts` já redireciona quem não tem sessão e valida roles/licenças — ao modificar fluxo de autenticação, verifique esse arquivo.

Onde ler para entender rapidamente

- Comece por: `src/hooks/useCatalog.ts` (lógica de catálogo/carrinho), `src/lib/supabaseClient.ts` (cliente), `src/middleware.ts` (autenticação/roles), `src/app/api/save-cart/route.ts` e `src/app/api/load-cart/route.ts` (salvar/carregar pedido).
- Banco: `SQL/supabase_schema.sql` e `supabase/migrations/` para ver colunas, nomes de tabelas e constraints.

Regras para gerar mudanças seguras (para agentes)

- Ao tocar na autenticação/roles, rode pelo menos os fluxos manualmente: login de `master`, login de `rep` e acesso às rotas `/admin` e `/dashboard`.
- Quando alterar APIs de pedidos, preserve/compatibilize o formato JSON esperado por `useCatalog.saveCart` e `useCatalog.loadCart`.
- Nunca expor chaves sensíveis no repositório; use `.env.local` durante dev e valide com `pnpm run env-check`.

Dica rápida de debugging

- Logs: os endpoints `save-cart` e `load-cart` usam `console.log/console.error` — veja a saída do servidor (`pnpm dev`) para rastrear problemas.
- Verifique requests do cliente em `Network` devtools: endpoints são `/api/save-cart` e `/api/load-cart?code=...`.

Se precisar de mais contexto
-- Pergunte sobre: 1) convenções de roles/licenças, 2) formato exato de `saved_carts.items`, 3) políticas de expiração/limpeza de `saved_carts`.

Arquivo criado com base em leitura de:

- `package.json`, `README.md`, `src/lib/supabaseClient.ts`, `src/middleware.ts`, `src/hooks/useCatalog.ts`, `src/app/api/save-cart/route.ts`, `src/app/api/load-cart/route.ts`, `SQL/`, `supabase/migrations/`.

-- Fim --
