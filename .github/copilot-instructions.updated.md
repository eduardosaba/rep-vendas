<!-- Arquivo para agentes IA: mantenha curto, preciso e atualizado -->

# Copilot / Agentes — Resumo Rápido

Projeto: `rep-vendas` — frontend Next.js (app router) + Supabase (Auth, DB, Storage).
Objetivo: catálogo público + dashboard administrativo; autenticação e autorização via Supabase.

**Arquitetura (onde olhar primeiro)**

- `src/app` — páginas e rotas (app-router).
- `src/hooks/useCatalog.ts` — lógica principal do catálogo, filtros, paginação, favoritos e carrinho (usa Supabase + `localStorage`).
  -- `src/lib/supabaseClient.ts` — DEPRECADO. Use `src/lib/supabase/client` (componentes cliente) ou `src/lib/supabase/server` (rotas/server actions).
- `src/middleware.ts` — proteção de rotas, valida `profiles.role` (`master` | `rep`) e `license_expires_at`.
- `src/app/api/save-cart/route.ts` e `src/app/api/load-cart/route.ts` — salvar/carregar pedidos por `short_id` (contrato JSON consumido por `useCatalog`).

**Comandos essenciais (PowerShell)**

```powershell
pnpm install
pnpm dev        # desenvolvimento (Next.js)
pnpm build
pnpm start
pnpm run typecheck
pnpm test
pnpm run env-check    # valida .env.local
```

**Padrões e convenções do projeto**

- Autenticação: Supabase Auth + tabela `profiles` com `role`, `status`, `license_expires_at`.
- Saved carts: tabela `saved_carts` (veja `SQL/create_saved_carts_table.sql`); `short_id` é o identificador curto usado por URLs.
- LocalStorage keys: `cart` (objeto id->qty), `favorites` (array), `itemsPerPage`, `priceAccessGranted`, `priceAccessExpiresAt`.
- Busca: usa `ilike` em `useCatalog.ts` para pesquisas parciais; paginação via `range(from,to)` (Supabase).

**Integrações & pontos sensíveis**

-- Supabase é usado diretamente no cliente e nas rotas API; use as factories `src/lib/supabase/client` e `src/lib/supabase/server` conforme o contexto.

- Migrations em `supabase/migrations/`; SQL ad-hoc em `SQL/` (ex.: `SQL/supabase_schema.sql`).
- Middleware (`src/middleware.ts`) aplica regras de acesso; qualquer mudança aqui afeta todas as rotas protegidas.

**Ao editar APIs ou autenticação**

- Preserve o contrato JSON esperado por `useCatalog.saveCart`/`loadCart` (ver `src/hooks/useCatalog.ts` e `src/app/api/*`).
- Teste manualmente: login como `master` e `rep`, ver acesso a `/admin` e `/dashboard`.
- Rode `pnpm run typecheck` e `pnpm test` antes de abrir PR.

**Arquivos-chave para referência rápida**

- `src/hooks/useCatalog.ts` — catálogo / carrinho.
  -- `src/lib/supabase/client` e `src/lib/supabase/server` — factories cookie-aware para uso correto em client/server.
- `src/middleware.ts` — checagens de sessão/role/licença.
- `src/app/api/save-cart/route.ts`, `src/app/api/load-cart/route.ts` — salvar/carregar pedido.
- `SQL/` e `supabase/migrations/` — esquema e migrações.

Se algo estiver faltando ou ambíguo aqui, diga qual parte você quer que eu detalhe (ex.: formato JSON de `saved_carts.items`, fluxo de autenticação, ou testes automatizados específicos).
