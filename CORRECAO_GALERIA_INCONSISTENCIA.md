# 🖼️ Correção: Galeria de Imagens - Porque Funcionava em Uns Catálogos e Não em Outros

## 📋 **O Problema**

### Sintomas

- ✅ **Catálogos clonados:** Galeria funcionava perfeitamente
- ❌ **Catálogo master (template):** Miniaturas não trocavam imagem, mostravam "sem imagem"
- ❌ **Inconsistência:** Mesmo produto se comportava diferente em catálogos diferentes
- ❌ **Erro oculto:** "tentando buscar imagem de coluna que foi excluída"

### Por Que Acontecia?

O sistema tem **3 fontes** de imagens para a galeria:

| Fonte            | Tipo  | Quando Usar                            | Status          |
| ---------------- | ----- | -------------------------------------- | --------------- |
| `gallery_images` | JSONB | ✅ **PRIORITÁRIA** - Produtos migrados | Moderna (v1.3+) |
| `images`         | JSONB | ⚠️ Legado - URLs antigas/Safilo        | Deprecated      |
| `image_variants` | JSONB | Variantes da capa (480w, 1200w)        | Moderna (v1.3+) |

**PROBLEMA RAIZ:**

Produtos **master (template)** tinham:

```json
{
  "image_path": "public/brands/tommy/TH123-main.webp",    // ✅ Nova
  "gallery_images": [{...}, {...}],                       // ✅ Nova
  "images": [                                              // ❌ LEGADO (POLUINDO)
    "https://safilo.com/OLD_URL_DELETED.jpg",              // URL quebrada!
    "https://cdn.com/IMAGE_NOT_FOUND.jpg",                 // URL quebrada!
    "null",                                                // String inválida!
    "undefined"                                            // String inválida!
  ]
}
```

Produtos **clonados** eram limpos automaticamente:

```json
{
  "image_path": "public/brands/tommy/TH123-main.webp",    // ✅ Nova
  "gallery_images": [{...}, {...}],                       // ✅ Nova
  "images": null                                           // ✅ LIMPO!
}
```

**Resultado:**

- **Master:** Sistema tentava carregar `images` (URLs antigas → ERRO)
- **Clone:** Sistema ignorava `images` (NULL → funcionava)

---

## 🛠️ **O Que Determina a Quantidade de Imagens na Galeria?**

### Ordem de Prioridade (Nova Lógica)

A função `getProductImages()` agora segue esta ordem:

```typescript
1. CAPA (Imagem Principal)
   ├─ Prioridade 1: image_variants (otimizada)
   └─ Prioridade 2: image_path (storage)

2. GALERIA (Imagens Adicionais)
   ├─ ✅ PRIORITÁRIA: gallery_images (JSONB)
   │                  → Produtos migrados (v1.3+)
   │
   ├─ ⚠️ LEGADO: images (JSONB)
   │              → APENAS se produto NÃO tiver gallery_images
   │              → Validação rigorosa (rejeita URLs < 10 chars, 'null', 'undefined')
   │
   └─ 🆘 FALLBACK: image_url / external_image_url
                   → APENAS se produto não tiver nenhuma das anteriores
```

### Detecção de Produtos Migrados

O sistema detecta automaticamente se o produto foi migrado:

```typescript
const isMigratedProduct = Boolean(
  product.image_path ||
  (Array.isArray(product.gallery_images) && product.gallery_images.length > 0)
);
```

**Se migrado:** Ignora `product.images` (evita URLs antigas/quebradas)  
**Se legado:** Usa `product.images` com validação rigorosa

---

## ✅ **Correções Aplicadas**

### 1️⃣ **Código: Função `getProductImages()`**

**Arquivo:** `src/components/catalogo/store-modals-container.tsx`

**Mudanças:**

- ✅ **Priorização inteligente:** `gallery_images` > `images`
- ✅ **Detecção de produtos migrados:** Ignora `images` se produto tiver `gallery_images`
- ✅ **Validação rigorosa:** Rejeita URLs com menos de 10 caracteres
- ✅ **Filtros de segurança:** Remove strings `'null'`, `'undefined'`, `'none'`
- ✅ **Deduplicação aprimorada:** Base keys + paths

**Exemplo de validação:**

```typescript
// ❌ ANTES: Aceitava qualquer URL
if (img && img.trim().length > 6) { ... }

// ✅ DEPOIS: Validação rigorosa
if (img && img.trim().length > 10 && !/null|undefined|none/i.test(img)) { ... }
```

### 2️⃣ **Banco de Dados: Cleanup de `images`**

**Arquivo:** `supabase/migrations/20260207_cleanup_product_images_migrated.sql`

**O Que Faz:**

1. **Diagnóstico:** Conta quantos produtos estão afetados
2. **Backup:** Cria tabela temporária com dados antes da limpeza
3. **Limpeza Inteligente:**
   - Remove `images` de produtos com `gallery_images` populado
   - Remove `images` de produtos com `image_path` (capa) se `images` tiver apenas 1 item (duplicata)
4. **Relatório:** Mostra quantos produtos foram limpos

**Segurança:**

- ✅ Idempotente (pode rodar múltiplas vezes sem causar dano)
- ✅ Backup automático antes de modificar
- ✅ Logs detalhados (RAISE NOTICE)

---

## 🚀 **Como Aplicar a Correção**

### Passo 1: Migração SQL (Obrigatório)

No **Supabase SQL Editor**:

```sql
-- Copiar e executar o conteúdo de:
-- supabase/migrations/20260207_cleanup_product_images_migrated.sql
```

**Saída esperada:**

```
📊 Diagnóstico:
   - Produtos migrados: 1500
   - Produtos a limpar: 340

✅ Limpeza concluída!
   - Produtos com images=NULL: 340
   - Backup salvo em: _backup_product_images_20260207
```

### Passo 2: Verificação

Execute no SQL Editor:

```sql
-- Ver quantos produtos ainda têm images populado
SELECT
  COUNT(*) FILTER (WHERE images IS NOT NULL) as com_images,
  COUNT(*) FILTER (WHERE images IS NULL) as sem_images,
  COUNT(*) FILTER (WHERE gallery_images IS NOT NULL AND jsonb_array_length(gallery_images) > 0) as com_gallery
FROM products
WHERE image_path IS NOT NULL OR (gallery_images IS NOT NULL AND jsonb_array_length(gallery_images) > 0);
```

**Resultado esperado:**

```
com_images | sem_images | com_gallery
-----------+------------+------------
    0      |    1500    |     450
```

### Passo 3: Teste no Catálogo

1. Acesse o **catálogo master (template)**: `https://www.repvendas.com.br/catalogo/template`
2. Abra um produto com **galeria** (ex: Tommy Hilfiger, Boss, Moschino)
3. **Clique nas miniaturas** → Deve trocar a imagem principal ✅
4. **Verifique a quantidade de imagens** → Não deve mostrar duplicatas ✅
5. **Compare com catálogo clonado** → Comportamento deve ser idêntico ✅

---

## 📊 **Estrutura de Dados (Referência)**

### Produto Migrado (v1.3+) - RECOMENDADO

```json
{
  "id": "abc123...",
  "reference_code": "TH2345SZJ",
  "name": "Óculos Tommy Hilfiger TH 2345",

  // 🖼️ CAPA
  "image_url": "https://.../TH2345SZJ-main-1200w.webp",
  "image_path": "public/brands/tommy/TH2345SZJ-main-1200w.webp",
  "image_variants": [
    { "size": 480, "url": "...", "path": "..." },
    { "size": 1200, "url": "...", "path": "..." }
  ],

  // 🎞️ GALERIA
  "gallery_images": [
    {
      "url": "https://.../TH2345SZJ-01-1200w.webp",
      "path": "public/.../01.webp"
    },
    {
      "url": "https://.../TH2345SZJ-02-1200w.webp",
      "path": "public/.../02.webp"
    }
  ],

  // ❌ LEGADO (Deve ser NULL após migração)
  "images": null,
  "external_image_url": null
}
```

### Produto Legado (Pré v1.3) - DEPRECATED

```json
{
  "id": "xyz789...",
  "reference_code": "OLD123",

  // ⚠️ URLs antigas (CDN/Safilo)
  "image_url": "https://safilo.com/OLD123_P00.JPG",
  "images": [
    "https://safilo.com/OLD123_P01.JPG",
    "https://safilo.com/OLD123_P02.JPG"
  ],

  // ❌ Campos novos vazios
  "image_path": null,
  "gallery_images": null,
  "image_variants": null
}
```

---

## 🔍 **Diagnóstico: Identificar Produtos com Problema**

### Query 1: Produtos com `images` e `gallery_images` (conflito)

```sql
SELECT
  reference_code,
  name,
  brand,
  jsonb_array_length(gallery_images) as qtd_gallery,
  CASE
    WHEN jsonb_typeof(images) = 'array' THEN jsonb_array_length(images)
    ELSE array_length(images::text[], 1)
  END as qtd_images_antigo
FROM products
WHERE gallery_images IS NOT NULL
  AND jsonb_array_length(gallery_images) > 0
  AND images IS NOT NULL
ORDER BY brand, reference_code
LIMIT 50;
```

### Query 2: Ver conteúdo de `images` (URLs antigas)

```sql
SELECT
  reference_code,
  name,
  brand,
  images
FROM products
WHERE images IS NOT NULL
  AND (gallery_images IS NOT NULL AND jsonb_array_length(gallery_images) > 0)
LIMIT 10;
```

**Saída esperada (ANTES da limpeza):**

```json
images: [
  "https://commportal-images.safilo.com/11/17/00/1117000SZJ00_P01.JPG",  // ❌ URL antiga
  "https://cdn.example.com/DELETED_IMAGE.jpg",                          // ❌ URL quebrada
  "null",                                                                // ❌ String inválida
  "undefined"                                                            // ❌ String inválida
]
```

**Saída esperada (DEPOIS da limpeza):**

```json
images: null  // ✅ Limpo!
```

---

## ❓ **FAQ**

### Por que alguns catálogos funcionavam e outros não?

**Resposta:** A função `clone_all_products_to_user()` do Supabase **limpava** a coluna `images` ao clonar, mas o catálogo master (template) mantinha os dados antigos.

### A coluna `images` vai ser removida do schema?

**Resposta:** Não imediatamente. Ela ainda é necessária para produtos legados (pré-migração). Após 100% dos produtos serem migrados, ela pode ser removida em uma migração futura.

### E se eu quiser reverter a limpeza?

**Resposta:** O backup está salvo na tabela temporária `_backup_product_images_20260207`. Execute:

```sql
-- RESTAURAR (use com cuidado!)
UPDATE products p
SET images = b.images
FROM _backup_product_images_20260207 b
WHERE p.id = b.id;
```

### Como migrar produtos legados para a nova estrutura?

**Resposta:** Use o endpoint `/api/admin/optimize-images` ou execute a migração:

```sql
-- Ver: supabase/migrations/20260207_cleanup_master_image_urls.sql
```

---

## 📝 **Checklist de Verificação**

Após aplicar as correções:

- [ ] Migração SQL executada com sucesso
- [ ] Verificação SQL mostra `com_images = 0` para produtos migrados
- [ ] Catálogo master: miniaturas trocam imagem ao clicar
- [ ] Catálogo master: não mostra imagens duplicadas
- [ ] Catálogo clonado: comportamento idêntico ao master
- [ ] Nenhum erro no console do navegador (F12)
- [ ] Zoom de imagem funciona normalmente
- [ ] Produtos legados ainda mostram galeria (se tiverem)

---

## 🎯 **Resumo**

### Antes

```
Master:  image_path ✅ + gallery_images ✅ + images (URLs antigas) ❌  → ERRO
Clone:   image_path ✅ + gallery_images ✅ + images (NULL) ✅        → OK
```

### Depois

```
Master:  image_path ✅ + gallery_images ✅ + images (NULL) ✅        → OK
Clone:   image_path ✅ + gallery_images ✅ + images (NULL) ✅        → OK
```

✅ **Comportamento consistente em todos os catálogos!**
