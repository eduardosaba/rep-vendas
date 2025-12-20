# ⚠️ AÇÃO NECESSÁRIA: Aplicar Migração da Tabela Plans

## Erro Atual

```
Erro ao buscar planos: Falha ao buscar planos
/api/admin/plans:1 Failed to load resource: the server responded with a status of 500 ()
```

## Causa

A tabela `plans` ainda não existe no banco de dados Supabase.

## Solução - Aplicar Migração

### Opção 1: Via Supabase Dashboard (RECOMENDADO)

1. Acesse: https://supabase.com/dashboard
2. Selecione seu projeto
3. Vá em **SQL Editor** no menu lateral
4. Clique em **New Query**
5. Cole o conteúdo do arquivo: `supabase/migrations/20251220000001_create_plans_table.sql`
6. Clique em **Run** (ou pressione Ctrl+Enter)
7. Verifique se apareceu "Success. No rows returned"

### Opção 2: Via CLI (se tiver Supabase CLI instalado)

```bash
# No diretório do projeto
supabase db push
```

## Verificação

Após aplicar a migração, execute esta query no SQL Editor para confirmar:

```sql
SELECT * FROM plans;
```

Você deve ver 3 planos:

- Básico (R$ 29,90) - 50 produtos
- Profissional (R$ 49,90) - 200 produtos
- Premium (R$ 99,90) - 1000 produtos

## Próximas Migrações Pendentes

Após corrigir a tabela `plans`, você também precisará aplicar:

1. **Subscriptions**: `supabase/migrations/20251220000002_create_subscriptions_table.sql`
2. **Orders**: `supabase/migrations/20251127094500_add_orders_display_and_guest_fields.sql`

---

**Status**: ⏳ Aguardando aplicação manual no Supabase Dashboard
