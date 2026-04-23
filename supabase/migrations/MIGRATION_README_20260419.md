Guia rápido para aplicar as migrations adicionadas em 2026-04-19

1) Objetivo
- `20260419_fix_profiles_settings_rls.sql`: cria funções SECURITY DEFINER e policies para evitar recursão RLS.
- `20260419_add_companies_font_columns.sql`: adiciona `font_family` e `font_url` em `companies`.

2) Recomendações antes de aplicar
- Sempre rodar em staging antes de produção.
- Verificar valores atuais do enum `user_role`:

```sql
SELECT enum_range(NULL::user_role);
```

- Confirmar que o usuário que vai aplicar a migration tem privilégios de owner (criador das funções SECURITY DEFINER).

3) Aplicação (exemplo com `psql`)

```bash
# Staging
psql "$DATABASE_URL" -f supabase/migrations/20260419_fix_profiles_settings_rls.sql
psql "$DATABASE_URL" -f supabase/migrations/20260419_add_companies_font_columns.sql

# Se quiser aplicar em transação manualmente
psql "$DATABASE_URL" <<'SQL'
BEGIN;
\i supabase/migrations/20260419_fix_profiles_settings_rls.sql
\i supabase/migrations/20260419_add_companies_font_columns.sql
COMMIT;
SQL
```

4) Como reverter (se necessário)
- Para reverter as alterações de RLS e funções:

```bash
psql "$DATABASE_URL" -f supabase/migrations/20260419_rollback_fix_profiles_settings_rls.sql
```

- Para remover as colunas de font:

```bash
psql "$DATABASE_URL" -f supabase/migrations/20260419_rollback_add_companies_font_columns.sql
```

5) Testes pós-aplicação
- Testar endpoints públicos e privados que leem `profiles` e `settings`.
- Verificar criação/edição de perfis via UI com contas `admin_company`.
- Testar páginas públicas dos catálogos para garantir que não há 500s.

6) Observações de segurança
- As funções usam `SECURITY DEFINER` — cuidado com quem aplica as migrations; o dono das funções deve ser um role seguro.
