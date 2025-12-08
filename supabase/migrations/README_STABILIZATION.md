# Stabilization Migrations — RepVendas

Este README resume as migrations criadas durante a estabilização e fornece comandos de aplicação, rollback e testes rápidos.

Migrations criadas (neste branch):

- `20251127113000_add_order_items_fields_and_orders_updated_at.sql`
  - Adiciona `product_name`, `product_reference`, `total_price` em `order_items` e `updated_at` em `orders`.
  - Backfill de `total_price` quando possível.
  - Cria/atualiza função `update_updated_at_column()` e trigger `update_orders_updated_at` (idempotente).

- `20251127123000_remove_update_triggers.sql`
  - Remove triggers `update_*_updated_at` em tabelas conhecidas (opcional, caso triggers estejam causando erros).

- `20251127133000_create_staging_images_table.sql`
  - Cria a tabela `staging_images` (idempotente) e política RLS básica.

- `20251127143000_restrict_orders_inserts.sql`
  - Remove políticas públicas de `INSERT` conhecidas em `orders`/`order_items` e cria políticas que exigem `auth.uid() = user_id`.

- `20251127150000_consolidated_stabilization.sql`
  - Arquivo consolidado com os blocos acima (colunas, trigger, staging_images, restrição de INSERTs, e consolidação de `saved_carts`).

Aplicação (recomendada via psql ou SQL Editor do Supabase)

PowerShell + psql (exemplo):

```powershell
$env:CONNECTION_STRING = "postgresql://<user>:<pass>@<host>:5432/<db>?sslmode=require"
psql $env:CONNECTION_STRING -f supabase\migrations\20251127113000_add_order_items_fields_and_orders_updated_at.sql
psql $env:CONNECTION_STRING -f supabase\migrations\20251127123000_remove_update_triggers.sql   # opcional
psql $env:CONNECTION_STRING -f supabase\migrations\20251127133000_create_staging_images_table.sql
psql $env:CONNECTION_STRING -f supabase\migrations\20251127143000_restrict_orders_inserts.sql
# ou rodar o consolidado
psql $env:CONNECTION_STRING -f supabase\migrations\20251127150000_consolidated_stabilization.sql
```

Rollback (manual)

- Essas migrations fazem operações idempotentes e geralmente adicionam colunas/policies. O rollback será manual:
  - Para remover colunas: `ALTER TABLE ... DROP COLUMN IF EXISTS ...;`
  - Para recriar policies públicas removidas: insira as políticas desejadas novamente.

Testes rápidos pós-migração

1. Verificar colunas:

```sql
SELECT table_name, column_name, data_type
FROM information_schema.columns
WHERE table_name IN ('profiles','settings','products','orders','order_items','saved_carts','staging_images')
ORDER BY table_name, column_name;
```

2. Verificar policies críticas:

```sql
SELECT
  c.relname AS table_name,
  p.polname AS policyname,
  p.polcmd AS cmd,
  CASE WHEN p.polqual IS NULL THEN NULL ELSE pg_get_expr(p.polqual, p.polrelid) END AS qual,
  CASE WHEN p.polwithcheck IS NULL THEN NULL ELSE pg_get_expr(p.polwithcheck, p.polrelid) END AS with_check
FROM pg_policy p
JOIN pg_class c ON p.polrelid = c.oid
WHERE c.relname IN ('saved_carts','products','settings','orders','order_items')
ORDER BY c.relname, p.polname;
```

3. Testar fluxo de pedido:

- Teste anônimo: `node scripts/test-create-order.js` (deve ser bloqueado se você aplicou `restrict_orders_inserts`).
- Teste autenticado: criar sessão e criar pedido via UI ou via rota autenticada: deve funcionar.

Observação importante (baseado no seu SELECT de colunas)

- Seu resultado mostrou as colunas das tabelas `orders`, `order_items`, `products`, `profiles`, `saved_carts` e `settings`.
- Não vi entradas para `staging_images` no resultado do SELECT — verifique se a migration para `staging_images` foi realmente aplicada. Se não foi, rode:

```sql
-- Criar staging_images (se necessário)
CREATE TABLE IF NOT EXISTS staging_images (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  product_id UUID REFERENCES products(id) ON DELETE SET NULL,
  file_name TEXT,
  url TEXT,
  mime_type TEXT,
  size_bytes INTEGER,
  processed BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE staging_images ENABLE ROW LEVEL SECURITY;
```

Se precisar, posso:

- Gerar um script de rollback automático (com cuidado),
- Executar verificações adicionais (policies/triggers) se você colar as saídas, ou
- Criar instruções para forçar o checkout anônimo a usar um endpoint server-side com `service_role` para gravação segura.

---

Arquivo gerado automaticamente por tarefa de estabilização. Mantenha histórico das migrations no Git e aplique em ambientes de teste antes de produção.
