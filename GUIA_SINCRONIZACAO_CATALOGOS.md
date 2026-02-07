# Sincronização Incremental de Catálogos - Guia de Uso

## 📋 Resumo

Quando você adiciona novos produtos ao catálogo master e precisa replicá-los para representantes que já receberam clone anteriormente.

## 🎯 Onde funciona?

- **Banco de dados**: Funções PostgreSQL criadas via migração
- **SQL Editor do Supabase**: Execute diretamente as queries
- **Futuro**: Pode ser integrado em botão no Dashboard

## 🚀 Passo a Passo

### 1️⃣ Aplicar Migração (uma vez)

Abra o **SQL Editor** do Supabase e execute:

```sql
-- Cole o conteúdo de: supabase/migrations/20260207_sync_catalog_updates.sql
-- Ou use o arquivo: supabase/sql/APPLY_SYNC_MIGRATION.sql
```

### 2️⃣ Cenário Real - Chegou Remessa Nova

**Situação:**

- Você é o master com catálogo da marca Nike
- Tem 3 representantes que já receberam clone do catálogo
- Chegaram 15 novos produtos Nike

**O que fazer:**

#### Opção A - Sincronizar TUDO para TODOS os representantes:

```sql
SELECT * FROM sync_catalog_updates_to_all_clones(
  'SEU_USER_ID_MASTER'::uuid
);
```

**Resultado:**

```
target_user_id              | target_email           | products_added
----------------------------|------------------------|---------------
rep1-uuid                   | rep1@example.com       | 15
rep2-uuid                   | rep2@example.com       | 15
rep3-uuid                   | rep3@example.com       | 15
```

#### Opção B - Sincronizar apenas produtos NIKE:

```sql
SELECT * FROM sync_catalog_updates_by_brand(
  'SEU_USER_ID_MASTER'::uuid,
  ARRAY['Nike']
);
```

**Resultado:**

```
target_user_id | target_email     | products_added | brands_synced
---------------|------------------|----------------|---------------
rep1-uuid      | rep1@example.com | 15             | {Nike}
rep2-uuid      | rep2@example.com | 15             | {Nike}
```

### 3️⃣ Ver Resumo de Clones (dashboard insights)

```sql
SELECT * FROM get_clone_summary('SEU_USER_ID_MASTER'::uuid);
```

**Resultado:**

```
target_user_id | target_email     | total_cloned_products | brands                    | last_clone_date
---------------|------------------|-----------------------|---------------------------|-------------------
rep1-uuid      | rep1@example.com | 250                   | {Nike,Adidas}             | 2026-02-07 10:30
rep2-uuid      | rep2@example.com | 180                   | {Nike}                    | 2026-02-06 15:20
rep3-uuid      | rep3@example.com | 320                   | {Nike,Puma,New Balance}   | 2026-02-05 09:45
```

## 🔄 Fluxo Completo - Exemplo Real

### Hoje (7/fev)

1. Master adiciona 10 novos produtos Nike no dashboard
2. Abre SQL Editor do Supabase
3. Executa:

```sql
SELECT * FROM sync_catalog_updates_to_all_clones(
  'fe7ea2fc-afd4-4310-a080-266fca8186a7'::uuid
);
```

4. ✅ Todos os 3 representantes recebem os 10 produtos instantaneamente

### Amanhã (8/fev)

1. Master adiciona mais 5 produtos Nike
2. Executa novamente a mesma query
3. ✅ Apenas os 5 novos produtos são adicionados (não duplica os 10 anteriores)

## 🎨 Integração Futura - Dashboard (opcional)

Você pode criar um botão no Dashboard que chama uma API route:

```typescript
// src/app/api/admin/sync-catalog-updates/route.ts
export async function POST(request: Request) {
  const { masterUserId } = await request.json();

  const { data, error } = await supabase.rpc(
    'sync_catalog_updates_to_all_clones',
    {
      source_user_id: masterUserId,
    }
  );

  return NextResponse.json({ data });
}
```

**UI no Dashboard:**

```tsx
<Button onClick={handleSyncUpdates}>
  📤 Sincronizar Lançamentos para Representantes
</Button>
```

## ⚙️ Funções Disponíveis

| Função                               | Uso                                  | Quando usar                    |
| ------------------------------------ | ------------------------------------ | ------------------------------ |
| `sync_catalog_updates_to_all_clones` | Sincroniza para TODOS                | Lançamento geral de produtos   |
| `sync_catalog_updates_by_brand`      | Sincroniza apenas marcas específicas | Lançamento de marca específica |
| `get_clone_summary`                  | Visualizar estatísticas              | Dashboard, relatórios          |

## 🛡️ Segurança

- ✅ **Idempotente**: Pode executar múltiplas vezes sem duplicar
- ✅ **Incremental**: Adiciona apenas produtos novos (verifica por `reference_code`)
- ✅ **Rastreável**: Registra em `catalog_clones` cada produto copiado
- ✅ **Isolado**: Cada representante recebe sua própria cópia

## 📝 Notas Importantes

1. **Sempre use `reference_code` único** nos produtos para evitar duplicação
2. As funções pulam automaticamente produtos que já existem no catálogo do representante
3. Marcas (logos/banners) NÃO são clonadas - cada usuário configura as suas
4. Imagens são marcadas com `image_is_shared=true` para Copy-on-Write

## 🐛 Troubleshooting

### "Função não encontrada"

→ Execute a migração `20260207_sync_catalog_updates.sql`

### "Nenhum produto foi adicionado"

→ Verifique se os produtos novos têm `reference_code` único e são `is_active = true`

### "Produtos foram duplicados"

→ Certifique-se de que cada produto tem `reference_code` preenchido
