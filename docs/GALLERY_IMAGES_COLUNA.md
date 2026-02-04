# 🖼️ Guia: Nova Coluna `gallery_images` em `products`

**Data:** 04/02/2026  
**Versão:** 1.3

---

## 🎯 **Objetivo**

Separar as **imagens da galeria** (otimizadas) em uma coluna dedicada, facilitando queries e renderização no frontend.

---

## 📊 **Estrutura Antiga vs Nova**

### ❌ **ANTES (Misturado)**

```sql
-- products.images (capa + galeria misturados)
[
  {"url": ".../TH2345SZJ-main-1200w.webp", "path": "..."},  -- Capa
  {"url": ".../TH2345SZJ-01-1200w.webp", "path": "..."},    -- Galeria
  {"url": ".../TH2345SZJ-02-1200w.webp", "path": "..."}     -- Galeria
]
```

**Problema:** Frontend precisa filtrar para separar capa de galeria.

---

### ✅ **AGORA (Separado)**

```sql
-- products.image_url (capa)
"https://.../TH2345SZJ-main-1200w.webp"

-- products.image_path (capa path)
"public/brands/tommy/TH2345SZJ-main-1200w.webp"

-- products.gallery_images (SÓ galeria)
[
  {"url": ".../TH2345SZJ-01-1200w.webp", "path": "public/brands/tommy/TH2345SZJ-01-1200w.webp"},
  {"url": ".../TH2345SZJ-02-1200w.webp", "path": "public/brands/tommy/TH2345SZJ-02-1200w.webp"}
]
```

**Vantagens:**

- ✅ Não precisa filtrar capa
- ✅ Query mais rápida
- ✅ Código frontend mais limpo

---

## 🔧 **Instalação**

### 1️⃣ **Execute a Migration**

```sql
-- Arquivo: SQL/add_gallery_images_column.sql

-- Adicionar coluna
ALTER TABLE products
ADD COLUMN IF NOT EXISTS gallery_images JSONB DEFAULT '[]'::jsonb;

-- Migrar dados existentes
UPDATE products p
SET gallery_images = (
  SELECT COALESCE(jsonb_agg(
    jsonb_build_object(
      'url', pi.optimized_url,
      'path', pi.storage_path
    ) ORDER BY pi.position
  ), '[]'::jsonb)
  FROM product_images pi
  WHERE pi.product_id = p.id
    AND pi.sync_status = 'synced'
    AND pi.is_primary = false  -- ⚠️ Exclui capa
)
WHERE EXISTS (
  SELECT 1 FROM product_images pi2
  WHERE pi2.product_id = p.id AND pi2.sync_status = 'synced'
);
```

### 2️⃣ **Script de Sync Atualizado**

O script `local-sync-full.mjs` agora popula automaticamente a nova coluna:

```javascript
// Separar galeria (sem capa)
const galleryOnly =
  finalImgs
    ?.filter((i) => !i.is_primary)
    .map((i) => ({ url: i.optimized_url, path: i.storage_path })) || [];

// Salvar
await supabase.from('products').update({
  gallery_images: galleryOnly, // ✅ NOVA COLUNA
});
```

---

## 💻 **Como Usar no Frontend**

### **Antes (Filtrar manualmente)**

```tsx
// ❌ ANTIGO: precisava filtrar capa
const gallery = product.images?.filter((img, idx) => idx > 0);
```

### **Agora (Direto)**

```tsx
// ✅ NOVO: usa diretamente
const gallery = product.gallery_images || [];

// Renderizar galeria
{
  gallery.map((img, idx) => (
    <img
      key={idx}
      src={`/api/storage-image?path=${img.path}`}
      alt={`Galeria ${idx + 1}`}
    />
  ));
}
```

---

## 📋 **Queries Úteis**

### **Ver produtos com galeria**

```sql
SELECT
  id,
  reference_code,
  -- Capa
  image_url as capa,
  -- Galeria
  jsonb_array_length(gallery_images) as total_galeria,
  gallery_images
FROM products
WHERE jsonb_array_length(gallery_images) > 0
LIMIT 10;
```

### **Contar imagens por produto**

```sql
SELECT
  reference_code,
  CASE WHEN image_url IS NOT NULL THEN 1 ELSE 0 END as tem_capa,
  jsonb_array_length(gallery_images) as total_galeria,
  (CASE WHEN image_url IS NOT NULL THEN 1 ELSE 0 END) +
  COALESCE(jsonb_array_length(gallery_images), 0) as total_imagens
FROM products
WHERE sync_status = 'synced'
ORDER BY total_imagens DESC
LIMIT 20;
```

### **Produtos sem galeria (só capa)**

```sql
SELECT id, reference_code, image_url
FROM products
WHERE image_url IS NOT NULL
  AND (gallery_images IS NULL OR jsonb_array_length(gallery_images) = 0);
```

---

## 🔄 **Sincronização**

A coluna `gallery_images` é **atualizada automaticamente** toda vez que o script `pnpm run sincronizar` roda.

**Fluxo:**

1. Script processa imagens da galeria
2. Atualiza `product_images` com `sync_status = 'synced'`
3. Busca todas imagens com `is_primary = false`
4. Salva em `products.gallery_images`

---

## ✅ **Checklist de Validação**

Após migration e sync:

- [ ] Coluna `gallery_images` existe em `products`
- [ ] Produtos sincronizados têm `gallery_images` populado
- [ ] `gallery_images` **NÃO** contém a capa
- [ ] Quantidade de itens em `gallery_images` = total de `product_images` com `is_primary=false`
- [ ] Frontend renderiza galeria usando `gallery_images`

---

## 🐛 **Troubleshooting**

### **`gallery_images` está vazio após sync**

**Possível causa:** Nenhuma imagem marcada como `is_primary = false`.

**Solução:**

```sql
-- Verificar se há imagens na tabela product_images
SELECT
  product_id,
  COUNT(*) as total,
  COUNT(*) FILTER (WHERE is_primary = true) as capas,
  COUNT(*) FILTER (WHERE is_primary = false) as galeria
FROM product_images
GROUP BY product_id;

-- Se todas estiverem como is_primary=true, corrigir:
UPDATE product_images pi
SET is_primary = false
WHERE position > 0  -- Primeira posição é capa
  AND is_primary = true;
```

---

## 📚 **Referências**

- [MANUAL_FLUXO_IMAGENS.md](../MANUAL_FLUXO_IMAGENS.md) - Manual completo
- [SQL/add_gallery_images_column.sql](../SQL/add_gallery_images_column.sql) - Migration
- [scripts/local-sync-full.mjs](../scripts/local-sync-full.mjs) - Script de sync

---

**Versão:** 1.3 | **Data:** 2026-02-04
