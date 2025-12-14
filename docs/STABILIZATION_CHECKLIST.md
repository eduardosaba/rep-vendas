# 🩺 Checklist de Estabilização — RepVendas v1.0

> Objetivo: estabilizar o sistema antes de novas features. Marcar cada item conforme validação.

---

**Prioridade Zero: Infraestrutura e Banco de Dados**

- [ ] 1. Tabelas Criadas: verificar no Supabase se TODAS as tabelas existem e têm colunas esperadas:
  - `profiles` (colunas: `plan`, `subscription_status`, `onboarding_completed`)
  - `settings` (colunas: `banners`, `price_password`, `footer_message`)
  - `products` (colunas: `images` array, `category`, `brand`, `is_launch`, `is_best_seller`)
  - `orders` (coluna: `item_count`)
  - `order_items`
  - `saved_carts`
  - `staging_images`

  Testes rápidos (SQL editor do Supabase):

  ```sql
  -- Listar colunas das tabelas críticas
  SELECT table_name, column_name, data_type
  FROM information_schema.columns
  WHERE table_name IN ('profiles','settings','products','orders','order_items','saved_carts','staging_images')
  ORDER BY table_name, column_name;
  ```

- [ ] 2. Policies (RLS) críticas:
  - `saved_carts`: INSERT permitido para anon (público) — verificar policy no Supabase (SQL: `SELECT * FROM pg_policies WHERE tablename='saved_carts';`).
  - `products`: SELECT permitido para anon (público).
  - `settings`: SELECT permitido para anon (público).

  Como checar:

  ```sql
  SELECT policyname, permissive, cmd, qual, with_check
  FROM pg_policies
  WHERE tablename IN ('saved_carts','products','settings');
  ```

- [ ] 3. Triggers:
  - Verificar se o trigger `handle_new_user` está ativo (cria `profiles` ao registrar).

  ```sql
  SELECT tgname, tgrelid::regclass::text AS table_name
  FROM pg_trigger
  WHERE tgname ILIKE 'handle_new_user%';
  ```

- [ ] 4. Storage:
  - O bucket `product-images` existe e permissões públicas estão corretas? Verificar no painel Storage do Supabase.

---

**Fase 1: Acesso e Identidade**

- [ ] 5.  Login Tradicional:
  - Objetivo: usuário com email/senha consegue autenticar e é redirecionado para `/dashboard`.
  - Passos:
    1.  Iniciar o servidor de dev: `pnpm dev`.
    2.  Abrir `http://localhost:3000/login` (ou a rota correspondente do projeto).
    3.  Inserir email/senha de um usuário existente e submeter.
  - Critérios de aceitação:
    - Redireciona automaticamente para `/dashboard`.
    - Há uma sessão criada em `auth.sessions` e existe entrada em `public.profiles` para esse `auth.users`.
  - SQL de verificação (executar no SQL editor do Supabase):

    ```sql
    -- Verifica existência do usuário
    SELECT id, email FROM auth.users WHERE email = '<email_do_teste>';

    -- Verifica profile
    SELECT id, email, onboarding_completed FROM public.profiles WHERE email = '<email_do_teste>' OR id = '<user_id_retorno_auth>';
    ```

- [ ] 6.  Login Google (OAuth):
  - Objetivo: o botão de login via Google inicia o fluxo OAuth e retorna ao app autenticado.
  - Passos:
    1.  No ambiente dev, clique no botão de login Google na UI pública (`/login`).
    2.  Confirmar redirecionamento para a página de autorização do Google e concluir fluxo.
  - Critérios de aceitação:
    - Após aprovação, usuário é redirecionado para `/dashboard` e `auth.users` contém a conta.
  - Observações:
    - Se estiver testando localmente, confirme `NEXT_PUBLIC_SUPABASE_URL` e `NEXT_PUBLIC_SUPABASE_ANON_KEY` estão corretos.

- [ ] 7.  Cadastro (Register):
  - Objetivo: criar uma nova conta cria entradas em `auth.users` e `public.profiles`.
  - Passos:
    1.  Abrir `/register` e preencher o formulário com email/senha e dados obrigatórios.
    2.  Submeter e confirmar email (se aplicável) ou verificar login automático.
  - Critérios de aceitação:
    - Linha criada em `auth.users` com o email usado.
    - Linha criada em `public.profiles` (trigger `handle_new_user` deve inserir `profiles`).
  - SQL de verificação:
    ```sql
    SELECT id, email FROM auth.users WHERE email = '<email_novo>';
    SELECT id, email, onboarding_completed FROM public.profiles WHERE email = '<email_novo>' OR id = '<user_id_retorno_auth>';
    ```

- [ ] 8.  Onboarding (o loop):
  - Objetivo: novo usuário é redirecionado para `/onboarding` até completar; ao salvar, `onboarding_completed` vira `true` e redireciona para `/dashboard`.
  - Passos:
    1.  Logar com um usuário recém-criado (ou após cadastro automático) e confirmar redirecionamento para `/onboarding`.
    2.  Preencher formulário de onboarding e submeter.
  - Critérios de aceitação:
    - Antes de submeter: `public.profiles.onboarding_completed` = false.
    - Após submeter: `public.profiles.onboarding_completed` = true.
    - Usuário é redirecionado para `/dashboard` e não volta ao onboarding em novas sessões.
  - SQL de verificação:
    ```sql
    SELECT id, onboarding_completed FROM public.profiles WHERE email = '<email_do_teste>';
    ```

- Dicas e comandos úteis para teste manual:
  - Rodar dev server:
    ```powershell
    pnpm install
    pnpm dev
    ```
  - Rodar script de verificação automatizada (se existir) apontando `BASE_URL`:
    ```powershell
    $env:BASE_URL = 'http://localhost:3000'
    node scripts/test-create-order.js
    ```
  - Se precisar extrair token para testar endpoints autenticados, abra DevTools → Application → cookies/sessionStorage ou use a API do Supabase para obter token no fluxo de teste.

- Critérios de sucesso da Fase 1 (marcar como concluída):
  - Login tradicional: OK (redireciona + session/profile criados).
  - Login Google: OK (fluxo OAuth funcional).
  - Cadastro: OK (entradas em `auth.users` e `public.profiles`).
  - Onboarding: OK (campo `onboarding_completed` atualizado e redirecionamento correto).

---

**Fase 2: Gestão de Produtos**

- [ ] 9. Listagem (`/dashboard/products`):
  - Produtos aparecem e botão Editar é funcional (link correto).

- [ ] 10. Criação (`/products/new`):
  - Upload múltiplas fotos funciona; salvamento persiste `images[]`, `brand`, `category`.

- [ ] 11. Edição (`/products/[id]`):
  - Página carrega; fotos existentes aparecem; é possível adicionar novas fotos e salvar.

---

**Fase 3: A Loja (Cliente Final)**

- [ ] 12. Acesso Público:
  - `/catalogo/<slug>` abre sem login.

- [ ] 13. Visualização:
  - Banners aparecem; preços estão ocultos até senha (se configurado).

- [ ] 14. Carrinho:
  - Adicionar/Remover itens funciona; Salvar orçamento gera código; Carregar orçamento em sessão anônima recupera itens.

- [ ] 15. Checkout:
  - Preencher nome/telefone e "Finalizar" cria linha em `orders` com `order_items` relacionados e redireciona para WhatsApp.
  - Teste: rodar `node scripts/test-create-order.js` ou usar a UI.

---

**Fase 4: Gestão de Pedidos**

- [ ] 16. Dashboard (`/dashboard`):
  - Cards mostram números reais (consultas no DB correspondem aos números mostrados).

- [ ] 17. Lista de Pedidos (`/dashboard/orders`):
  - Pedido recém-criado aparece; status correto.

- [ ] 18. Detalhes do Pedido (`/dashboard/orders/[id]`):
  - Abrir detalhe funciona; é possível alterar status (ex.: marcar como Entregue).

---

**Fase 5: Torre de Controle (Master)**

- [ ] 19. Acesso Admin:
  - Login com usuário `role: master` direciona para `/admin`.

- [ ] 20. Gestão de Usuários:
  - Ver lista de representantes; editar plano de um representante funciona.

---

## Como usar este checklist

- Abra este arquivo em `docs/STABILIZATION_CHECKLIST.md` e marque manualmente os itens conforme forem validados.
- Para cada item que falhar, registre:
  - Passo reproduzido (URL, payload, usuário), logs relevantes (console/server), e SQL de verificação.
  - Se for um problema de DB, capture o resultado do `SELECT` e crie uma migração idempotente em `supabase/migrations/`.

## Comandos úteis

- Iniciar dev:

```powershell
pnpm install
pnpm dev
```

- Checar tipos:

```powershell
pnpm run typecheck
```

- Testar create-order via script local (exemplo já presente):

```powershell
node scripts/test-create-order.js
```

- Executar migrations manualmente no Supabase:
  - Cole o SQL do arquivo em `supabase/migrations/*.sql` no SQL editor do dashboard e execute.
  - Ou, com `psql` (PowerShell example):

```powershell
$env:CONNECTION_STRING = "postgresql://<user>:<pass>@<host>:5432/<db>?sslmode=require"
psql $env:CONNECTION_STRING -f supabase\migrations\20251127113000_add_order_items_fields_and_orders_updated_at.sql
psql $env:CONNECTION_STRING -f supabase\migrations\20251127123000_remove_update_triggers.sql
```

## Prioridade de ações corretivas

1. Corrigir DB (migrations) — obrigatório.
2. Corrigir RLS (policies) — obrigatório.
3. Corrigir Server Actions e rotas de API.
4. Corrigir tipos/erros TS.
5. Testes end-to-end manuais e ajustes UI.

---

Se quiser, eu posso:

- Rodar cada verificação automaticamente (executando os `SELECT` e reunindo resultados) se você fornecer a connection string temporária, ou
- Guiar passo-a-passo pela execução e correção (eu crio as migrations necessárias e as aplico localmente se você confirmar).

Marque o que quer que eu execute primeiro.
