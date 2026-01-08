# ESTRUTURA_DO_PROJETO

> Mapa de referência rápida do repositório RepVendas — objetivo: ajudar desenvolvedores e IAs a se orientarem no código, convenções e fluxos principais.

---

## 1. Visão Geral

- Projeto: SaaS Multi-Tenant (Catálogo Virtual)
- Tech stack: Next.js (App Router), React, TypeScript, Tailwind CSS, Supabase, Sonner (toasts), Zustand (local layout store)
- Prioridades: isolamento de dados por `user_id` (RLS), branding dinâmico por loja, resiliência em Server Components

## 2. Quick Start (comandos)

- Instalar dependências: `pnpm install`
- Rodar dev: `pnpm run dev`
- Checar tipos: `pnpm run typecheck` (executa `tsc --noEmit`)
- Rodar lint: `pnpm run lint`
- Executar testes: `pnpm test`

## 3. Estrutura principal (resumo)

- `src/` — código da aplicação
  - `app/` — rotas do Next.js (App Router)
  - `components/` — componentes React reutilizáveis e domínio (catalogo, dashboard, ui)
  - `lib/` — integrações (Supabase clients, utilitários, geração de PDF)
  - `hooks/` — hooks customizados (toasts, catalog)
  - `utils/` — utilitários e geradores (PDFs, imagens)
  - `supabase/` — scripts e configurações de migração / storage
- `public/` — assets públicos (imagens, logos)
- `SQL/`, `scripts/` — migrações e utilitários DB
- `next.config.*`, `tailwind.config.*`, `tsconfig.json`, `package.json` — configs de build

## 4. Arquivos-chave e propósito rápido

- [src/lib/supabaseServer.ts](src/lib/supabaseServer.ts) — helpers para criar clientes Supabase no server e em Route Handlers (atenção ao cookie factory).
- [src/components/catalogo/store-context.tsx](src/components/catalogo/store-context.tsx) — Context que expõe o catálogo: produtos, filtros, carrinho, modais e ações (fonte da verdade business-side).
- [src/components/catalogo/store-layout.tsx](src/components/catalogo/store-layout.tsx) — Layout do catálogo; também exporta um pequeno `useLayoutStore` (Zustand) para estados de UI (sidebar, mobile).
- [src/components/catalogo/Storefront.tsx] — Composição do catálogo público (usa partes do layout/context).
- [src/lib/generateOrderPDF.ts] & [src/utils/generateCatalogPDF.ts] — geração de PDFs (pedidos, catálogo).
- `next.config.*` / `tailwind.config.*` — ajustes de imagens, classes, cores dinâmicas.

## 5. Convenções e regras importantes

- Multi-tenant: todas as queries devem ser escopadas por `user_id` (RLS configurado). Não confiar em dados globais.
- Storage: uploads devem usar prefixo por usuário: `/${userId}/products/...` (ver scripts `migrate-storage-to-user-prefix.mjs`).
- Branding: estrutura visual base é fixa (fundo, cards, texto) — somente elementos de branding (botões, links ativos, ícones) devem receber `primary_color`/`secondary_color` do banco.
  - Aplicar cores dinâmicas com CSS variables ou inline styles: `style={{ backgroundColor: config.primary_color }}`.
  - Fallbacks: sempre garantir cor padrão (ex.: `#2563eb` — blue-600) caso usuário não tenha config.
- Componentes: usar Server Components para fetch, Client Components para interatividade. Evitar misturar responsabilidades.
- Erros e resiliência: ao buscar `configs` usar `.maybeSingle()` e aplicar fallbacks na UI quando result for `null`.

## 6. Padrões de código úteis

- Hooks/top-level: chamar hooks no topo; `useToast` fornece fallback se Sonner não estiver disponível.
- Tipagem: preferir tipos explícitos para `Product`, `Settings` e respostas do Supabase. Quando usar acessos dinâmicos, usar casts seguros `(x as any)[k]` para evitar `@ts-expect-error` espalhados.

## 7. Fluxos comuns e onde olhar ao debugar

- 500 em Route Handlers: checar `createRouteSupabase` e como a factory `cookies()` é passada (deve ser `() => nextCookies` com `const nextCookies = await cookies()` no handler).
- Problemas de imagens Next: ajustar `next.config.*` (qualidades e `unoptimized` em dev) e caminhos de storage (ver `SQL/create_imported_images_bucket.sql` e `scripts/migrate-storage-*`).
- Erros TypeScript: rodar `pnpm run typecheck` e focar em arquivos listados — frequentemente são `@ts-expect-error` pendentes ou acessos dinâmicos.
- Branding falhando: ver `store` config fetch e uso em componentes — sempre aplicar fallback se `primary_color` for `null`.

## 8. Checklist rápido para PR/ alteração

- [ ] Executar `pnpm run typecheck` e corrigir erros.
- [ ] Testar `pnpm run dev` e reproduzir telas (catálogo desktop e mobile).
- [ ] Validar uploads e rotas de imagens (se aplicável).
- [ ] Confirmar que mudanças não alteram isolamento multi-tenant.
- [ ] Atualizar `ESTRUTURA_DO_PROJETO.md` caso novos diretórios/fluxos sejam adicionados.

## 9. Onboarding rápido (primeiros arquivos a checar)

1. `src/components/catalogo/store-context.tsx` — lógica de filtros/carrinho
2. `src/lib/supabaseServer.ts` — criação de clients e cookie handling
3. `src/components/catalogo/store-layout.tsx` — layout e exports consumidos por Storefront
4. `next.config.*`, `tailwind.config.*` — configs de build e estilos

## 10. Branching / commits / contatos

- Branches: usar padrão `fix/*`, `feat/*`, `chore/*`. Para debugging crie `fix/hydration` (seguimos essa branch).
- Commits: mensagens curtas com prefixo (fix, feat, chore) e referência ao ticket/issue quando houver.

## 11. Tarefas conhecidas (curto prazo)

- Corrigir os erros TypeScript listados por `pnpm run typecheck` (ajustes de tipagem e remoção de `@ts-expect-error` desnecessários).
- Validar `createRouteSupabase` e factories de cookies nas APIs.
- Rever `BrandCarousel`, `ProductGrid`, `StoreLayout` para alinhar tipos do `useStore`.

## 12. Como atualizar este mapa

- Atualize `ESTRUTURA_DO_PROJETO.md` sempre que adicionar pastas, mudar fluxo de autenticação, ou alterar convenções centrais.
- Inclua a data e seu nome no topo das mudanças.

---

> Arquivo gerado automaticamente pelo assistente. Atualize manualmente com observações de time.
