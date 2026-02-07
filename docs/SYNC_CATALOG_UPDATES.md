# Sincronização Incremental de Catálogos

## Problema Resolvido

Quando um usuário master adiciona **novos produtos** (lançamentos) ao catálogo, precisa replicá-los automaticamente para todos os representantes que já receberam clones anteriores.

## Funções Criadas

### 1. `sync_catalog_updates_to_all_clones`

Sincroniza novos produtos para **TODOS** os representantes que já receberam clone do catálogo master.

**Uso:**

```sql
-- Sincronizar todas as marcas
SELECT * FROM sync_catalog_updates_to_all_clones('USER_ID_MASTER'::uuid);

-- Sincronizar apenas marcas específicas
SELECT * FROM sync_catalog_updates_to_all_clones(
  'USER_ID_MASTER'::uuid,
  ARRAY['Nike', 'Adidas', 'Puma']
);
```

**Retorno:**

```
target_user_id | target_email           | products_added
---------------|------------------------|---------------
uuid-1         | rep1@email.com         | 5
uuid-2         | rep2@email.com         | 5
uuid-3         | rep3@email.com         | 0 (já tinha)
```

### 2. `sync_catalog_updates_by_brand`

Sincroniza apenas para representantes que trabalham com **marcas específicas**.

**Uso:**

```sql
SELECT * FROM sync_catalog_updates_by_brand(
  'USER_ID_MASTER'::uuid,
  ARRAY['Nike']
);
```

**Retorno:**

```
target_user_id | target_email    | products_added | brands_synced
---------------|-----------------|----------------|---------------
uuid-1         | rep1@email.com  | 3              | {Nike}
uuid-2         | rep2@email.com  | 3              | {Nike}
```

### 3. `get_clone_summary`

Visualiza resumo de quem recebeu clones do catálogo master.

**Uso:**

```sql
SELECT * FROM get_clone_summary('USER_ID_MASTER'::uuid);
```

**Retorno:**

```
target_user_id | target_email    | total_cloned_products | brands              | last_clone_date
---------------|-----------------|----------------------|---------------------|------------------
uuid-1         | rep1@email.com  | 150                  | {Nike,Adidas}       | 2026-02-01 10:00
uuid-2         | rep2@email.com  | 80                   | {Nike}              | 2026-01-28 14:30
```

## Fluxo de Trabalho Recomendado

### Cenário: Chegou remessa de 10 novos produtos Nike

1. **Admin adiciona os 10 produtos** no catálogo master (via dashboard ou import)

2. **Visualizar quem vai receber** (opcional):

   ```sql
   SELECT * FROM get_clone_summary('MEU_USER_ID'::uuid);
   ```

3. **Sincronizar para todos** que trabalham com Nike:

   ```sql
   SELECT * FROM sync_catalog_updates_by_brand(
     'MEU_USER_ID'::uuid,
     ARRAY['Nike']
   );
   ```

4. **Resultado:** Os 10 produtos novos são copiados automaticamente para todos os representantes que já tinham Nike. Produtos existentes não são duplicados (idempotência por `reference_code`).

## Características Importantes

✅ **Idempotente:** Pode rodar múltiplas vezes sem duplicar produtos  
✅ **Incremental:** Copia apenas produtos novos (verifica `reference_code`)  
✅ **Seletivo:** Pode filtrar por marcas específicas  
✅ **Rastreável:** Alimenta tabela `catalog_clones` para auditoria  
✅ **Seguro:** Não sobrescreve customizações do representante (apenas adiciona)

## Notas Técnicas

- Produtos são comparados por `reference_code` (se nulo, compara `name + brand`)
- Produtos clonados ficam marcados com `image_is_shared = true` para Copy-on-Write
- A sincronização NÃO sobrescreve produtos já existentes no destino
- Imagens são compartilhadas inicialmente (economiza storage)

## API Endpoint (Opcional)

Se preferir chamar via HTTP do dashboard:

```bash
POST /api/admin/sync-catalog-updates
Content-Type: application/json

{
  "source_user_id": "uuid-master",
  "brands": ["Nike", "Adidas"]  // opcional
}
```

## Exemplo Prático Completo

```sql
-- 1. Ver resumo atual
SELECT * FROM get_clone_summary('fe7ea2fc-afd4-4310-a080-266fca8186a7'::uuid);

-- 2. Adicionar novos produtos no catálogo master (via dashboard)

-- 3. Sincronizar tudo para todos
SELECT * FROM sync_catalog_updates_to_all_clones(
  'fe7ea2fc-afd4-4310-a080-266fca8186a7'::uuid
);

-- OU sincronizar apenas marcas específicas
SELECT * FROM sync_catalog_updates_by_brand(
  'fe7ea2fc-afd4-4310-a080-266fca8186a7'::uuid,
  ARRAY['Boss', 'TOMMY HILFIGER']
);
```

## Troubleshooting

**Q: E se eu quiser forçar atualização de um produto existente?**  
A: A função atual não sobrescreve produtos existentes. Se precisar, delete o produto no destino primeiro e rode novamente a sincronização.

**Q: Como desfazer uma sincronização?**  
A: Use a tabela `catalog_clones` para encontrar os IDs clonados:

```sql
DELETE FROM products
WHERE id IN (
  SELECT cloned_product_id
  FROM catalog_clones
  WHERE source_user_id = 'MASTER_ID'
    AND target_user_id = 'REP_ID'
    AND created_at > '2026-02-07'  -- somente os de hoje
);
```

**Q: Posso ver quais produtos foram adicionados na última sincronização?**  
A: Sim:

```sql
SELECT p.*, cc.created_at AS cloned_at
FROM catalog_clones cc
JOIN products p ON p.id = cc.cloned_product_id
WHERE cc.source_user_id = 'MASTER_ID'
  AND cc.target_user_id = 'REP_ID'
ORDER BY cc.created_at DESC
LIMIT 20;
```
