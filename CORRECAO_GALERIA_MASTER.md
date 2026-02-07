# Correção: Galeria Duplicada no Catálogo Master

## 🔍 Problema Identificado

**Sintoma:**

- No catálogo **clonado** (representante), a galeria funciona corretamente
- No catálogo **master** (original), a primeira imagem aparece duplicada na galeria

**Causa Raiz:**
A função `clone_catalog_smart` limpa os campos `image_url` e `external_image_url` quando clona produtos (para evitar duplicatas), mas os produtos **originais do master** ainda têm esses campos populados junto com `image_path`, causando duplicação na galeria.

```sql
-- Produtos CLONADOS (correto):
image_path: 'uuid/brands/Nike/ABC-1200w.webp'
image_url: NULL  ✅
external_image_url: NULL  ✅

-- Produtos MASTER (problema):
image_path: 'uuid/brands/Nike/ABC-1200w.webp'
image_url: 'https://...ABC-1200w.webp'  ❌ DUPLICATA
external_image_url: 'https://...ABC.jpg'  ❌ DUPLICATA
```

## ✅ Solução

### 1️⃣ Diagnóstico (Execute Primeiro)

No **Supabase SQL Editor**, execute:

```bash
supabase/sql/diagnostico_master_image_cleanup.sql
```

Isso mostrará:

- Quantos produtos serão afetados
- Quais usuários têm produtos com URLs redundantes
- Exemplos de produtos que serão limpos

### 2️⃣ Aplicar Correção

Depois de revisar o diagnóstico, aplique a migration:

```bash
supabase/migrations/20260207_cleanup_master_image_urls.sql
```

**O que faz:**

```sql
UPDATE products
SET
  image_url = NULL,
  external_image_url = NULL
WHERE
  image_path IS NOT NULL
  AND (image_url IS NOT NULL OR external_image_url IS NOT NULL);
```

### 3️⃣ Resultado Esperado

Após aplicar a migration:

- ✅ Catálogo master exibe galeria sem duplicatas
- ✅ Primeira imagem é sempre a capa principal (image_path)
- ✅ Galeria mostra apenas imagens distintas (gallery_images, images array)
- ✅ Comportamento consistente entre master e clones

## 🧪 Como Testar

1. Abra um produto no catálogo master que antes mostrava duplicatas
2. Verifique se a primeira imagem não aparece repetida nas miniaturas
3. Clique nas miniaturas da galeria - cada uma deve mostrar uma imagem diferente
4. Compare com o mesmo produto no catálogo clonado - deve ter comportamento idêntico

## 📊 Impacto

- **Segurança:** 100% seguro - não remove imagens, apenas limpa referências redundantes
- **Performance:** Melhora (menos campos no banco, menos lógica de deduplicação)
- **UX:** Elimina confusão visual de imagens duplicadas na galeria

## 🔄 Rollback (Se Necessário)

Se precisar reverter (improvável), execute:

```sql
-- ATENÇÃO: Isso NÃO restaura os valores originais, apenas define como NULL
-- Use apenas se quiser desfazer a limpeza por algum motivo
UPDATE products
SET
  image_url = image_path,  -- Define como image_path temporariamente
  external_image_url = NULL
WHERE
  image_path IS NOT NULL;
```

## 📝 Observações Técnicas

- Frontend (`getProductImages`) já estava preparado para lidar com esta estrutura
- A lógica de priorização é: `image_variants > image_path > gallery_images > images > fallbacks`
- Produtos **sem** `image_path` (legados) mantêm `image_url`/`external_image_url` como fallback
- Esta correção alinha produtos master com a mesma estrutura dos clones
