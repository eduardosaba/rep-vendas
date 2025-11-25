# Relatório da Estrutura do Sistema — Rep-Vendas

Data: 25/11/2025

Resumo rápido

- Repositório: `rep-vendas`
- Branch atual: `Feature/salvarpedido`
- Stack: Next.js 16 (webpack), React 19, TypeScript, TailwindCSS, Supabase

1. Estrutura de pastas principais

- `src/`
  - `app/` - rotas e páginas do Next.js (app router)
    - `admin/` - (Torre de Controle) — local para administração/global (contém rota `src/app/admin`)
    - `dashboard/` - área dos representantes
    - `catalog/` - exibição pública/slug do catálogo dos representantes
    - `settings/` - página de configurações do representante
    - `login/`, `register/`, `orders/`, `checkout/`, `cart/`, `favorites/` e APIs em `src/app/api/`
  - `components/` - componentes reutilizáveis (StatCard, SalesBarChart, RecentOrdersTable, ToastContainer, etc.)
  - `hooks/` - hooks personalizados (`useCatalog`, `useToast`, `useSecureCheckout`, `useNotifications`)
  - `lib/` - clientes e helpers (`supabaseClient.ts`, `storage.ts`, `pdfGenerator.ts`, `types.ts`)
  - `middleware.ts` - middleware de autenticação/autorização (protege `/dashboard` e `/admin`)

2. Arquivos de configuração importantes

- `package.json` — scripts e dependências
- `tsconfig.json` — configuração TypeScript e caminhos (`@/*` → `src/*`)
- `next.config.mjs` — configuração Next.js (images.remotePatterns permitido)
- `tailwind.config.cjs` — configuração Tailwind
- `jest.config.mjs`, `jest.setup.js` — testes
- `.env.local` — variáveis de ambiente (NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY)

3. Integração com Supabase

- Cliente supabase em `src/lib/supabaseClient.ts` usando `NEXT_PUBLIC_*` vars
- Pastas `supabase/migrations/` contêm SQL de migrações aplicadas (várias migrações recentes para `settings`, `products`, `orders`, etc.)
- Scripts utilitários em `scripts/` para verificar/alterar esquema (ex.: `create-tables.js`, `check-column.js`)

4. Funcionalidades chave implementadas

- Autenticação via Supabase Auth
- Middleware `src/middleware.ts` protege rotas e aplica regras:
  - redireciona não-autenticados de `/dashboard` e `/admin` para `/login`
  - impede que usuários que não sejam `master` acessem `/admin`
  - impede representantes (`role: 'rep'`) com licença expirada ou status inválido acessarem `/dashboard` (redireciona para `/dashboard/subscription/expired`)
- Catálogo com suporte a `catalog_slug` nas `settings` (rota pública `/catalog/:slug` carregando `user_id` via `settings.catalog_slug`)
- Painel Admin (Torre de Controle) planejado para listar usuários e gerenciar licenças/status (página `src/app/admin/page.tsx` sugerida — ainda verificar se arquivo existe/está populado)
- Salvamento e carregamento de Pedidos (API em `src/app/api/save-cart`, `load-cart`)

5. Scripts e execução local

- Iniciar dev: `pnpm dev` (script `next dev --webpack`)
- Checar env: `pnpm run env-check` (verifica `.env.local` e chaves do Supabase)
- Rodar migrações: preferir o SQL Editor do Supabase para aplicar `add_catalog_slug_migration.sql` se necessário

6. Observações / Pontos de atenção

- Alguns scripts JS usam `dotenv` para carregar `.env.local` quando executados isoladamente (ex.: `scripts/create-tables.js`). O projeto tem `dotenv` instalado.
- `package.json` usa `type: "module"`, então scripts devem usar ESM (`.mjs` ou `import`) ou checar `require` vs `import`.
- Middleware implementado (`src/middleware.ts`) já existe e segue a lógica descrita; validar cobertura de rotas e exceções (ex.: `/dashboard/subscription` liberado)
- Verificar se `src/app/admin/page.tsx` foi criado; caso não esteja presente, usar o código admin sugerido para criar a "Torre de Controle".

7. Locais úteis no repositório

- `src/lib/types.ts` — definicoes de `UserProfile`, roles e statuses
- `supabase/migrations/` — histórico de migrations aplicadas
- `scripts/` — utilitários para schema (consultas e migrações de suporte)
- `add_catalog_slug_migration.sql` — SQL pronto para adicionar `catalog_slug` em `settings`

8. Como proceder (passos recomendados)

- Rodar localmente: `pnpm install` (se ainda não instalado) e `pnpm dev`.
- Confirmar `.env.local` com `NEXT_PUBLIC_SUPABASE_URL` e `NEXT_PUBLIC_SUPABASE_ANON_KEY` preenchidos.
- Se a coluna `catalog_slug` ainda faltar, executar o arquivo `add_catalog_slug_migration.sql` no SQL Editor do Supabase.
- Testar fluxo de login, teste de middleware (acessar `/admin` com conta não-master), e página de renovação `/dashboard/subscription/expired`.

---

Arquivo gerado automaticamente pelo assistente em: `docs/relatorio_estrutura_sistema_2025-11-25.md`

Se quiser, posso também:

- adicionar esse relatório ao `README.md` como seção
- criar a página `src/app/admin/page.tsx` com o código que você passou
- commitar as mudanças no git

Diga qual próximo passo prefere.
