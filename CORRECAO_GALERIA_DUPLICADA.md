# Correção: Galeria Duplicada em Catálogos Clonados

## 🐛 Problema Identificado

Quando clona um catálogo para novos usuários, a galeria de imagens mostra **imagens duplicadas** porque:

- `clone_catalog_smart` copia **todos** os campos de imagem (incluindo `external_image_url`)
- `getProductImages` adiciona `image_path` + `external_image_url` → duplicação

## ✅ Solução Aplicada

Modificação em `clone_catalog_smart` para **limpar automaticamente** `external_image_url` e `image_url` quando `image_path` existir (prioriza storage do Supabase).

---

## 📋 Passo a Passo para Aplicar Correção

### 1️⃣ Aplicar Migração (NECESSÁRIO)

Abra o **SQL Editor do Supabase** e execute:

```sql
-- Cole o conteúdo de: supabase/migrations/20260207_fix_clone_catalog_image_fields.sql
```

Isso atualiza a função `clone_catalog_smart` para **não copiar** URLs externas quando houver `image_path`.

### 2️⃣ Limpar Produtos Já Clonados (RECOMENDADO)

Execute este SQL para **corrigir** produtos que já foram clonados com duplicação:

```sql
-- Limpa external_image_url e image_url de produtos clonados que já têm image_path
UPDATE products
SET
  external_image_url = NULL,
  image_url = NULL,
  updated_at = now()
WHERE image_is_shared = true
  AND image_path IS NOT NULL
  AND (external_image_url IS NOT NULL OR image_url IS NOT NULL);
```

**Resultado esperado:**

```
UPDATE 150  -- Quantidade de produtos corrigidos
```

### 3️⃣ Verificar Resultado

Execute para confirmar a limpeza:

```sql
-- Ver produtos clonados que ainda têm external_image_url
SELECT
  id,
  name,
  brand,
  image_path,
  external_image_url,
  image_url
FROM products
WHERE image_is_shared = true
  AND image_path IS NOT NULL
  AND (external_image_url IS NOT NULL OR image_url IS NOT NULL)
LIMIT 10;
```

**Resultado esperado:** `0 rows` (nenhum produto duplicado)

---

## 🔄 Testando Novo Clone

Após aplicar a migração, teste clonando um catálogo novo:

```sql
SELECT * FROM clone_catalog_smart(
  'USER_ID_TEMPLATE'::uuid,
  'USER_ID_NOVO_REP'::uuid,
  ARRAY['Nike']
);
```

Agora os produtos clonados terão:

- ✅ `image_path` (preservado)
- ✅ `images` (preservado)
- ❌ `external_image_url` = NULL (limpo automaticamente)
- ❌ `image_url` = NULL (limpo automaticamente)

---

## 🎯 Comportamento Esperado

### Antes (problema):

```json
{
  "image_path": "public/product-images/123/image.webp",
  "external_image_url": "https://example.com/old-image.jpg",  // ❌ DUPLICADO
  "images": [...]
}
```

**Galeria:** 3 imagens (image_path + external + images[0])

### Depois (corrigido):

```json
{
  "image_path": "public/product-images/123/image.webp",
  "external_image_url": null,  // ✅ LIMPO
  "images": [...]
}
```

**Galeria:** 2 imagens (image_path + images[0])

---

## 📝 Notas Técnicas

1. **Produtos do template** continuam intocados (mantêm `external_image_url` se tiverem)
2. **Novos clones** limpam automaticamente campos legados
3. **Copy-on-Write** continua funcionando (via `image_is_shared = true`)
4. **Fallback** preservado: se o produto NÃO tiver `image_path`, mantém `external_image_url`

---

## ⚠️ Troubleshooting

### Galeria ainda mostra duplicadas após aplicar fix

→ Execute o script de cleanup (passo 2) para corrigir produtos existentes

### Produtos sem imagem após cleanup

→ Verifique se `image_path` está correto:

```sql
SELECT id, name, image_path
FROM products
WHERE image_is_shared = true
  AND image_path IS NULL
  AND external_image_url IS NULL
LIMIT 10;
```

### Novo clone ainda duplica

→ Confirme que a migração foi aplicada:

```sql
SELECT routine_name, routine_definition
FROM information_schema.routines
WHERE routine_name = 'clone_catalog_smart'
  AND routine_definition LIKE '%final_external_image_url%';
```

Deve retornar 1 linha mostrando a função atualizada.
