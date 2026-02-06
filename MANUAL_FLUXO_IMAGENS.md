# Manual de Funcionamento: Fluxo de Imagens de Produtos

**Data de Criação:** 3 de fevereiro de 2026  
**Última Atualização:** 5 de fevereiro de 2026  
**Versão:** 1.4 (Gallery Images + Editor & Store Modals)

---

## 📋 Índice

1. [Visão Geral da Arquitetura](#visão-geral-da-arquitetura)
2. [Estrutura de Dados](#estrutura-de-dados)
3. [Fluxo de Importação (Excel)](#fluxo-de-importação-excel)
4. [Processamento e Otimização](#processamento-e-otimização)
5. [Renderização no Frontend](#renderização-no-frontend)
6. [Fluxo Completo por Contexto](#fluxo-completo-por-contexto) ← **✨ NOVO**
7. [Troubleshooting](#troubleshooting)
8. [Scripts de Manutenção](#scripts-de-manutenção)

---

## 🏗️ Visão Geral da Arquitetura

### Conceito Multi-Tenant

Cada usuário (lojista/representante) possui:

- Seus próprios produtos isolados por `user_id`
- Bucket de storage específico (ou pasta no bucket compartilhado)
- URLs de imagens otimizadas e internalizadas no Supabase Storage

### Estados de Sincronização

As imagens passam por 3 estados:

```
pending → processing → synced (ou failed)
```

- **`pending`**: URL externa ainda não processada
- **`processing`**: Em processo de download/otimização
- **`synced`**: Imagem otimizada e armazenada no storage
- **`failed`**: Falha no processamento (registra erro)

---

## 📊 Estrutura de Dados

### Tabela `products`

| Campo                | Tipo    | Descrição                                           | Exemplo                                         |
| -------------------- | ------- | --------------------------------------------------- | ----------------------------------------------- |
| `id`                 | UUID    | ID único do produto                                 | `abc123...`                                     |
| `user_id`            | UUID    | ID do lojista (multi-tenant)                        | `user456...`                                    |
| `name`               | TEXT    | Nome do produto                                     | `Óculos Tommy TH 2345`                          |
| `reference_code`     | TEXT    | Código de referência único                          | `TH2345SZJ`                                     |
| `image_url`          | TEXT    | URL pública da capa otimizada                       | `https://.../TH2345SZJ-main-1200w.webp`         |
| `image_path`         | TEXT    | Path no storage da capa                             | `public/brands/tommy/TH2345SZJ-main-1200w.webp` |
| `external_image_url` | TEXT    | URL externa original da capa                        | `https://safilo.com/P00.JPG`                    |
| `images`             | JSONB   | Array com galeria (antes: strings, depois: objetos) | Ver detalhes abaixo                             |
| `gallery_images`     | JSONB   | **✨ NOVO:** Array só com galeria (sem capa)        | `[{url, path}, {url, path}]`                    |
| `image_optimized`    | BOOLEAN | Flag se imagem principal está otimizada             | `true` / `false`                                |
| `image_variants`     | JSONB   | Variantes responsivas da capa (480w, 1200w)         | `[{size, url, path}]`                           |
| `sync_status`        | TEXT    | Estado da sincronização                             | `pending` / `synced`                            |
| `sync_error`         | TEXT    | Mensagem de erro (se houver)                        | `null` ou erro                                  |

#### Estrutura do campo `images` (JSONB)

**ANTES da otimização:**

```json
[
  "https://commportal-images.safilo.com/11/17/00/1117000SZJ00_P00.JPG",
  "https://commportal-images.safilo.com/11/17/00/1117000SZJ00_P01.JPG",
  "https://commportal-images.safilo.com/11/17/00/1117000SZJ00_P02.JPG"
]
```

**DEPOIS da otimização:**

```json
[
  {
    "url": "https://aawghxjbipcqefmikwby.supabase.co/storage/v1/object/public/.../TH2345SZJ-01-1200w.webp",
    "path": "public/brands/tommy/TH2345SZJ-01-1200w.webp"
  },
  {
    "url": "https://aawghxjbipcqefmikwby.supabase.co/storage/v1/object/public/.../TH2345SZJ-02-1200w.webp",
    "path": "public/brands/tommy/TH2345SZJ-02-1200w.webp"
  }
]
```

**⚠️ IMPORTANTE:** A imagem de capa (P00) fica em `image_url` + `image_path`, **NÃO em `images`**.

#### Campo `gallery_images` (JSONB) - ✨ NOVO v1.3

**Contém APENAS as imagens da galeria (sem capa):**

```json
[
  {
    "url": "https://.../TH2345SZJ-01-1200w.webp",
    "path": "public/brands/tommy/TH2345SZJ-01-1200w.webp"
  },
  {
    "url": "https://.../TH2345SZJ-02-1200w.webp",
    "path": "public/brands/tommy/TH2345SZJ-02-1200w.webp"
  }
]
```

**Vantagens:**

- ✅ Separação clara entre capa e galeria
- ✅ Queries mais eficientes (não precisa filtrar capa)
- ✅ Frontend pode usar diretamente sem processamento

### Tabela `product_images` (Galeria)

| Campo                | Tipo    | Descrição                                |
| -------------------- | ------- | ---------------------------------------- |
| `id`                 | UUID    | ID único da imagem                       |
| `product_id`         | UUID    | FK para `products.id`                    |
| `url`                | TEXT    | URL externa original                     |
| `optimized_url`      | TEXT    | URL pública otimizada                    |
| `storage_path`       | TEXT    | Path no storage                          |
| `optimized_variants` | JSONB   | Array de variantes `[{size, url, path}]` |
| `sync_status`        | TEXT    | Estado da sincronização                  |
| `is_primary`         | BOOLEAN | Define se é capa (normalmente `false`)   |
| `position`           | INTEGER | Ordem de exibição                        |

---

## 📥 Fluxo de Importação (Excel)

### Arquivo: `src/app/dashboard/products/import-massa/page.tsx`

### 1. Leitura do Excel

O usuário faz upload de um arquivo `.xlsx` contendo:

**Exemplo de linha:**
| Nome | Referência | Preço | Imagem |
|------|------------|-------|--------|
| Óculos Tommy TH 2345 | TH2345SZJ | 450 | `https://.../P00.JPG;https://.../P01.JPG;https://.../P02.JPG` |

### 2. Processamento das URLs

**Função:** `processSafiloImages(rawString)`  
**Arquivo:** `src/lib/utils/image-logic.ts`

```javascript
// Input do Excel
const rawString = "https://.../P00.JPG;https://.../P01.JPG;https://.../P02.JPG";

// Processamento
const result = processSafiloImages(rawString);

// Output
{
  image_url: "https://.../P00.JPG",  // Prioriza P00
  images: ["https://.../P01.JPG", "https://.../P02.JPG"],  // Resto da galeria
  sync_status: "pending"
}
```

**Regras aplicadas:**

1. ✅ Split por `;`, `,`, espaço ou quebra de linha
2. ✅ Remove P13 e P14 (fotos técnicas inúteis da Safilo)
3. ✅ Prioriza P00 como capa
4. ✅ Se não houver P00, primeira URL vira capa
5. ✅ Valida se são URLs HTTP/HTTPS válidas

### 3. Preparação para Inserção

**Montagem do objeto produto:**

```javascript
const productObj = {
  user_id: user.id,
  name: 'Óculos Tommy TH 2345',
  reference_code: 'TH2345SZJ',
  // Capa
  image_url: 'https://.../P00.JPG',
  external_image_url: 'https://.../P00.JPG',
  image_path: null, // Ainda não otimizada
  image_optimized: false,

  // Galeria completa (INCLUI CAPA)
  images: [
    'https://.../P00.JPG', // ← CRÍTICO: Inclui capa também
    'https://.../P01.JPG',
    'https://.../P02.JPG',
  ],

  sync_status: 'pending',
  sync_error: null,
};
```

**⚠️ IMPORTANTE:** O array `images` deve conter **TODAS** as URLs (capa + galeria). O script `local-sync-full.mjs` usa esse campo para encontrar imagens a processar.

### 4. Inserção no Banco

**Upsert em `products`:**

```sql
INSERT INTO products (...) VALUES (...)
ON CONFLICT (user_id, reference_code) DO UPDATE SET ...
```

**Criação da galeria em `product_images`:**

Função `prepareProductGallery(productId, allImages)` cria registros:

```javascript
// Para cada URL da galeria
{
  product_id: "abc123",
  url: "https://.../P01.JPG",
  is_primary: false,
  sync_status: "pending",
  position: 1
}
```

---

## ⚙️ Processamento e Otimização

### Script: `scripts/local-sync-full.mjs`

Executado manualmente ou via CRON job diário (plano Hobby):

```bash
node scripts/local-sync-full.mjs
```

### Fluxo de Processamento

#### 1. Busca Produtos Pendentes

```javascript
// Busca produtos com sync_status != 'synced'
const { data: products } = await supabase
  .from('products')
  .select('id, name, image_url, images, brand, user_id')
  .in('sync_status', ['pending', 'failed']);
```

#### 2. Processamento da Capa

```javascript
// Extrai URL da capa (prioriza P00 se estiver em images)
const coverUrl = pickCoverFromImages() || product.image_url;

// Processa e cria variantes
const res = await processAndUploadVariants(
  coverUrl,
  `public/brands/tommy/products/TH2345SZJ/main`,
  agent,
  [480, 1200], // Tamanhos responsivos otimizados
  targetBucket
);

// Atualiza produto
await supabase.from('products').update({
  image_url: res.variants[2].url, // Maior variante (1000w)
  image_path: res.variants[2].path,
  image_optimized: true,
  image_variants: res.variants, // Array [{size, url, path}]
});
```

#### 3. Processamento da Galeria

```javascript
// Busca imagens não sincronizadas
const { data: gallery } = await supabase
  .from('product_images')
  .select('id, url')
  .eq('product_id', productId)
  .neq('sync_status', 'synced');

// Para cada imagem
for (const img of gallery) {
  // Split se tiver URLs concatenadas (proteção)
  const parts = img.url
    .split(/[;,]/)
    .map((s) => s.trim())
    .filter(Boolean);

  for (const partUrl of parts) {
    const res = await processAndUploadVariants(
      partUrl,
      `public/brands/tommy/products/TH2345SZJ/gallery/${img.id}`,
      agent,
      [480, 1200],
      targetBucket
    );

    // Atualiza registro
    await supabase
      .from('product_images')
      .update({
        optimized_url: res.variants[2].url,
        storage_path: res.variants[2].path,
        optimized_variants: res.variants,
        sync_status: 'synced',
      })
      .eq('id', img.id);
  }
}
```

#### 4. Atualização Final do Produto

```javascript
// Busca galeria completa sincronizada
const { data: finalImgs } = await supabase
  .from('product_images')
  .select('optimized_url, storage_path')
  .eq('product_id', productId)
  .eq('sync_status', 'synced');

// Atualiza products.images com objetos {url, path}
const imageObjects = finalImgs.map((i) => ({
  url: i.optimized_url,
  path: i.storage_path,
}));

await supabase.from('products').update({
  sync_status: 'synced',
  images: imageObjects, // Agora são objetos, não strings
  sync_error: null,
});
```

### Função `processAndUploadVariants`

```javascript
// Input: URL externa
// Output: { variants: [{size, url, path}], originalSize, optimizedTotal }

async function processAndUploadVariants(
  url,
  storageBase,
  agent,
  sizes,
  bucket
) {
  // 1. Download da imagem original
  const response = await fetch(url, { agent, timeout: 15000 });
  const buffer = Buffer.from(await response.arrayBuffer());

  // 2. Cria variantes com Sharp
  const variants = [];
  for (const size of [480, 1200]) {
    const webpBuffer = await sharp(buffer)
      .resize(size, size, { fit: 'inside', withoutEnlargement: true })
      .webp({ quality: 75 })
      .toBuffer();

    const path = `${storageBase}-${size}w.webp`;

    // 3. Upload para storage
    await supabase.storage.from(bucket).upload(path, webpBuffer, {
      upsert: true,
      contentType: 'image/webp',
    });

    // 4. Gera URL pública
    const { data } = supabase.storage.from(bucket).getPublicUrl(path);

    variants.push({ size, path, url: data.publicUrl });
  }

  return { variants, originalSize: buffer.length, optimizedTotal };
}
```

---

## 🎨 Renderização no Frontend

### Função: `getProductImageUrl(product)`

**Arquivo:** `src/lib/imageUtils.ts`

#### Ordem de Prioridade (Cascata)

```
1. products.image_path (capa otimizada no storage)
   ↓ se não houver
2. products.images[0].path (primeira imagem da galeria otimizada)
   ↓ se não houver
3. products.images[0].url (URL do storage se for supabase.co)
   ↓ se não houver
4. products.external_image_url (URL externa original)
   ↓ se não houver
5. products.image_url (URL qualquer)
   ↓ se não houver
6. Placeholder (/images/product-placeholder.svg)
```

#### Código Simplificado

```typescript
export function getProductImageUrl(product: Partial<Product>) {
  // 1. Capa otimizada
  if (product.image_path) {
    return {
      src: `/api/storage-image?path=${encodeURIComponent(product.image_path)}`,
      isExternal: false,
      isStorage: true,
    };
  }

  // 2. Galeria otimizada (objetos {url, path})
  if (Array.isArray(product.images) && product.images.length > 0) {
    const firstImg = product.images[0];

    if (typeof firstImg === 'object') {
      // Prioriza 'path' (storage) sobre 'url'
      const path = firstImg.path || firstImg.storage_path;
      if (path) {
        return {
          src: `/api/storage-image?path=${encodeURIComponent(path)}`,
          isExternal: false,
          isStorage: true,
        };
      }

      const url = firstImg.url;
      if (url?.includes('supabase.co/storage')) {
        return {
          src: `/api/storage-image?path=${encodeURIComponent(url)}`,
          isExternal: false,
          isStorage: true,
        };
      }
    }
  }

  // 3. URLs externas (fallback)
  const external = product.external_image_url || product.image_url;
  if (external?.startsWith('http')) {
    return { src: external, isExternal: true, isStorage: false };
  }

  // 4. Placeholder
  return { src: null, isExternal: false, isStorage: false };
}
```

### Como as Variantes São Usadas no Frontend

#### 1. **Sistema Atual (Simplificado)**

**⚠️ IMPORTANTE:** Atualmente o frontend **NÃO usa** diretamente o campo `image_variants` do banco. Ele usa apenas o caminho da maior variante (1200w).

**Fluxo de Renderização:**

```tsx
// ProductCard.tsx
const displayImage = product.image_path
  ? `/api/storage-image?path=${encodeURIComponent(product.image_path)}&format=webp&q=75&w=600`
  : product.external_image_url;

<SmartImage product={product} sizes="(max-width: 768px) 100vw, 200px" />;
```

**O que acontece:**

1. Frontend solicita: `/api/storage-image?path=public/brands/tommy/products/TH2345SZJ/main-1200w.webp`
2. API (`/api/storage-image`) busca o arquivo no Supabase Storage
3. Retorna a imagem com cache de 1 dia

**Limitação:** Sempre carrega a variante 1200w, mesmo em mobile (320px). Desperdiça ~70% de banda.

#### 2. **Sistema Otimizado (Recomendado para Futuro)**

Para aproveitar **totalmente** as variantes (480w, 1200w), seria ideal usar:

**Opção A: Responsive Images com `srcset`**

```tsx
// ProductCard.tsx (FUTURO)
const variants = product.image_variants; // [{size: 480, path: '...', url: '...'}, {size: 1200, ...}]

if (variants && variants.length > 0) {
  const srcset = variants
    .map((v) => `/api/storage-image?path=${v.path} ${v.size}w`)
    .join(', ');

  return (
    <img
      src={`/api/storage-image?path=${variants[variants.length - 1].path}`} // fallback
      srcSet={srcset}
      sizes="(max-width: 768px) 100vw, 200px"
      alt={product.name}
    />
  );
}
```

**HTML gerado:**

```html
<img
  src="/api/storage-image?path=.../main-1200w.webp"
  srcset="
    /api/storage-image?path=.../main-480w.webp   480w,
    /api/storage-image?path=.../main-1200w.webp 1200w
  "
  sizes="(max-width: 768px) 100vw, 200px"
/>
```

**Como o navegador escolhe:**

- Mobile 320px viewport → carrega **480w** (~40KB)
- Desktop 1920px viewport → carrega **1200w** (~120KB)
- Economia: ~66% de banda em mobile!

**Opção B: Next.js Image com Loader Customizado**

```tsx
// next.config.ts
images: {
  loader: 'custom',
  loaderFile: './lib/supabase-image-loader.ts',
}

// lib/supabase-image-loader.ts
export default function supabaseLoader({ src, width, quality }) {
  // Escolhe variante mais próxima do width solicitado
  const variant = width <= 480 ? '480w' : '1200w';
  return `/api/storage-image?path=${src.replace(/-\d+w\.webp$/, `-${variant}.webp`)}`;
}

// ProductCard.tsx
<Image
  src={product.image_path}
  width={200}
  height={200}
  sizes="(max-width: 768px) 100vw, 200px"
  alt={product.name}
/>
```

#### 3. **API Storage Proxy**

**Arquivo:** `/api/storage-image/route.ts`

**Responsabilidades:**

- ✅ Busca arquivo no Supabase Storage (com service role key)
- ✅ Aplica cache agressivo (1 dia no browser, 7 dias CDN)
- ✅ Retorna placeholder SVG se falhar
- ❌ **NÃO redimensiona** (usa variante já criada pelo sync)

**Query Params Suportados:**

- `path` (obrigatório): Caminho no storage
- `bucket`: Bucket customizado (padrão: `product-images`)
- `debug`: Retorna JSON com metadados

**Exemplo:**

```
GET /api/storage-image?path=public/brands/tommy/products/TH2345SZJ/main-480w.webp
```

**Resposta:**

- Headers: `Content-Type: image/webp`, `Cache-Control: max-age=86400`
- Body: Buffer da imagem

### Componentes que Usam Imagens

| Componente           | Arquivo                                                | Método                                               | Variantes Usadas?                     |
| -------------------- | ------------------------------------------------------ | ---------------------------------------------------- | ------------------------------------- |
| ProductsTable        | `src/components/dashboard/ProductsTable.tsx`           | Lógica inline                                        | ✅ Força 480w (thumbnails)            |
| ProductCard          | `src/components/catalogo/ProductCard.tsx`              | SmartImage                                           | ✅ srcset (480w/1200w)                |
| SmartImage           | `src/components/catalogo/SmartImage.tsx`               | `<img>` nativo                                       | ✅ srcset quando tem variants         |
| StoreModalsContainer | `src/components/catalogo/store-modals-container.tsx`   | Modal/gallery (unifica lógica com `EditProductForm`) | ✅ usa gallery_normalization & srcset |
| ProductDetail        | `src/app/catalogo/[slug]/product/[productId]/page.tsx` | JOIN `product_images`                                | ⏳ Pendente (usa 1200w)               |

\* _Na galeria de detalhes, cada imagem em `product_images` tem `optimized_variants` disponível, mas ainda não está sendo usado com `srcset`._

### Roadmap de Otimização

~~**Fase 1: Atual** ✅~~  
~~- Sync cria 2 variantes (480w, 1200w)~~  
~~- Frontend usa apenas a maior (1200w)~~  
~~- API serve com cache~~

~~**Fase 2: Responsive Images (Futuro)**~~  
~~- Modificar `SmartImage` para gerar `srcset` a partir de `image_variants`~~  
~~- Economia estimada: 60-70% de banda em mobile~~

**✨ FASE 2 COMPLETA (v1.3)** ✅

- SmartImage gera `srcset` automaticamente
- ProductCard usa variant="thumbnail" (480w)
- Zoom usa variant="large" (1200w)
- Economia real: ~70-80% de banda em mobile

**Fase 3: CDN Integration (Futuro)**

- Usar Cloudflare Images ou Vercel Blob
- Transformação on-the-fly com parâmetros de URL

---

## 🎨 Fluxo Completo por Contexto (v1.3)

### 📊 Otimização de Qualidade por Contexto

O sistema agora carrega automaticamente a **melhor imagem para cada contexto**:

#### 🚀 Diagrama de Fluxo

```
┌─────────────────────┐
│  CATÁLOGO VIRTUAL   │ ← 480w (thumbnail) ~30KB
│   (Listagem Grid)   │   Carrega rápido em mobile
└──────────┬──────────┘
           │ [Usuário clica no produto]
           ▼
┌─────────────────────┐
│ DETALHES DO PRODUTO │ ← 600px (medium) ~80KB
│  (Página Completa)  │   Qualidade balanceada
└──────────┬──────────┘
           │ [Usuário clica para ampliar]
           ▼
┌─────────────────────┐
│   ZOOM MODAL (MAX)  │ ← 1200w (large) ~150KB
│  (Tela Inteira)     │   Máxima qualidade
└─────────────────────┘
```

#### 📈 Tabela de Mapeamento

| **Contexto**          | **Componente**  | **Variant** | **Width** | **Peso Médio** | **Performance**     |
| --------------------- | --------------- | ----------- | --------- | -------------- | ------------------- |
| 🗂️ Listagem Catálogo  | ProductCard     | `thumbnail` | 480w      | ~30KB          | ⚡ Muito Rápido     |
| 📄 Detalhes (Preview) | Product Detail  | `medium`    | 600px     | ~80KB          | ⚡ Rápido           |
| 🔍 Zoom (Full Screen) | ZoomModal       | `large`     | 1200w     | ~150KB         | 🎯 Qualidade Máxima |
| ✏️ Editor (Dashboard) | EditProductForm | `card`      | 480w      | ~30KB          | ⚡ Rápido           |
| 📋 Tabela (Dashboard) | ProductsTable   | `thumbnail` | 480w      | ~30KB          | ⚡ Muito Rápido     |

#### 💡 Benefícios da Otimização

**Economia de Banda:**

- Mobile 4G: ~70-80% menos dados (480w vs 1200w no grid)
- Desktop: ~40% menos dados (srcset escolhe resolução ideal)

**Experiência do Usuário:**

- ✅ Listagem carrega instantaneamente (480w)
- ✅ Produto abre rápido com qualidade boa (600px)
- ✅ Zoom mostra detalhes nítidos (1200w)
- ✅ Sem lag ou "carregando..." desnecessário

**SEO & Core Web Vitals:**

- ✅ LCP melhorado (Largest Contentful Paint)
- ✅ CLS estável (Cumulative Layout Shift)
- ✅ Lighthouse Score >90

#### 🛠️ Implementação Técnica

**1. ProductCard (Catálogo Virtual)**

```tsx
// src/components/catalogo/ProductCard.tsx
<SmartImage
  variant="thumbnail" // ← Força 480w
  sizes="(max-width: 768px) 50vw, 25vw"
  src={product.image_url}
  alt={product.name}
/>
```

**2. Product Detail Page**

```tsx
// src/app/catalogo/[slug]/product/[productId]/page.tsx
const galleryData = product.gallery_images?.map((img) => ({
  url: getProductImage(img.url, 'large'), // ← 1200w para zoom
  original: getProductImage(img.url, 'large'),
}));
```

**3. ZoomModal**

```tsx
// src/components/catalogo/modals/ZoomModal.tsx
<SmartImage
  src={getProductImage(imageSrc, 'large')} // ← Sempre 1200w
  variant="full"
  alt="Zoom"
/>
```

**4. SmartImage (Lógica de Variantes)**

```tsx
// src/components/catalogo/SmartImage.tsx
const getVariantUrl = (variant: 'thumbnail' | 'card' | 'full') => {
  if (variant === 'thumbnail') return variants[0]; // 480w
  if (variant === 'full') return variants[variants.length - 1]; // 1200w
  return variants.find((v) => v.size >= 480) || variants[0];
};
```

#### ✅ Verificação (DevTools)

**Como Testar:**

1. Abra o Catálogo Virtual (`/catalogo/sua-loja`)
2. Abra DevTools → Network → Img
3. Verifique que **ProductCard carrega 480w**:
   ```
   TH2345SZJ-main-480w.webp (30KB)
   ```
4. Clique em um produto
5. Verifique que **Galeria carrega 1200w**:
   ```
   TH2345SZJ-01-1200w.webp (150KB)
   ```
6. Clique para ampliar (Zoom)
7. Confirme que **Zoom usa mesma 1200w** (já em cache!)

**Validação SQL:**

```sql
-- Verificar se produtos têm ambas variantes
SELECT
  p.reference_code,
  p.image_variants,
  jsonb_array_length(p.image_variants) as variant_count
FROM products p
WHERE p.sync_status = 'synced'
LIMIT 5;

-- Resultado esperado: variant_count = 2 (480w + 1200w)
```

---

## 🔧 Troubleshooting

### Problema 1: Imagens não aparecem após importação

**Sintomas:**

- Produto importado mas sem imagem
- `products.images = []`
- `products.sync_status = 'pending'`

**Causa:**

- URLs concatenadas não foram separadas corretamente
- `processSafiloImages` não encontrou URLs válidas

**Solução:**

1. Verificar se URLs no Excel estão separadas por `;` ou `,`
2. Executar SQL para inspecionar:

```sql
SELECT id, name, reference_code, images, sync_status
FROM products
WHERE sync_status = 'pending'
AND images IS NULL OR images = '[]';
```

3. Re-importar ou atualizar manualmente:

```sql
UPDATE products
SET images = '["https://url1.jpg", "https://url2.jpg"]'
WHERE id = 'abc123';
```

### Problema 2: Sync falha repetidamente

**Sintomas:**

- `sync_status = 'failed'`
- `sync_error` contém mensagem de erro

**Causas Comuns:**

- URL externa inacessível (CORS, timeout, 404)
- Imagem muito grande (>10MB)
- Formato inválido (não é JPG/PNG)

**Solução:**

1. Verificar erro:

```sql
SELECT name, sync_error, external_image_url
FROM products
WHERE sync_status = 'failed';
```

2. Testar URL manualmente no navegador

3. Se URL estiver quebrada, atualizar:

```sql
UPDATE products
SET external_image_url = 'https://nova-url.jpg',
    sync_status = 'pending'
WHERE id = 'abc123';
```

### Problema 3: Frontend carrega URL externa ao invés da otimizada

**Sintomas:**

- Produto com `sync_status = 'synced'`
- `image_path` populado
- Mas frontend carrega `external_image_url`

**Causa:**

- `getProductImageUrl` com lógica de prioridade errada
- Cache do navegador

**Solução:**

1. Limpar cache do navegador (Ctrl+Shift+R)
2. Verificar se `getProductImageUrl` está priorizando `path` sobre `url`
3. Inspecionar `products.images` no banco:

```sql
SELECT images FROM products WHERE id = 'abc123';
```

Deve retornar objetos `{url, path}`, não strings.

### Problema 4: Galeria com imagens duplicadas

**Sintomas:**

- `product_images` tem múltiplas linhas com mesma URL

**Causa:**

- Import executou múltiplas vezes sem limpeza
- URLs concatenadas geraram múltiplos registros

**Solução:**

```sql
-- Deletar duplicatas (mantém apenas a primeira)
DELETE FROM product_images
WHERE id IN (
  SELECT id FROM (
    SELECT id, ROW_NUMBER() OVER (PARTITION BY product_id, url ORDER BY created_at) as rn
    FROM product_images
  ) t WHERE rn > 1
);
```

---

## 🛠️ Scripts de Manutenção

### 1. Sincronização Manual

```bash
# Variáveis de ambiente obrigatórias
$env:SUPABASE_URL = 'https://aawghxjbipcqefmikwby.supabase.co'
$env:SUPABASE_SERVICE_ROLE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...'

# Executar sync
node scripts/local-sync-full.mjs

# Opções avançadas (editar no arquivo .mjs)
# - CHUNK_SIZE: quantidade de produtos por lote (padrão: 20)
# - DELAY_BETWEEN_CHUNKS: pausa entre lotes em ms (padrão: 1500)
# - PRODUCT_CONCURRENCY: produtos processados em paralelo (padrão: 4)
# - IMAGE_CONCURRENCY: imagens processadas em paralelo por produto (padrão: 3)
```

### 2. Limpeza de Imagens Órfãs (Staging)

```bash
# Dry-run (apenas lista, não deleta)
node scripts/cleanup-missing-staging-images.mjs --dry-run

# Executar limpeza
node scripts/cleanup-missing-staging-images.mjs

# Para usuário específico
node scripts/cleanup-missing-staging-images.mjs --user-email=user@example.com
```

### 3. Limpeza de Imagens Órfãs (Storage)

```bash
# Dry-run
node scripts/cleanup-missing-storage-images.mjs --dry-run

# Executar limpeza
node scripts/cleanup-missing-storage-images.mjs
```

### 4. Verificar Status de Sincronização

```sql
-- Contagem por status
SELECT sync_status, COUNT(*)
FROM products
GROUP BY sync_status;

-- Produtos com erro
SELECT id, name, sync_error, external_image_url
FROM products
WHERE sync_status = 'failed'
ORDER BY updated_at DESC
LIMIT 20;

-- Produtos pendentes há mais de 24h
SELECT id, name, created_at
FROM products
WHERE sync_status = 'pending'
AND created_at < NOW() - INTERVAL '24 hours';
```

### 5. Resetar Sincronização

```sql
-- Resetar produto específico para re-processar
UPDATE products
SET sync_status = 'pending',
    sync_error = NULL,
    image_path = NULL,
    image_optimized = false
WHERE id = 'abc123';

-- Resetar galeria
UPDATE product_images
SET sync_status = 'pending',
    optimized_url = NULL,
    storage_path = NULL
WHERE product_id = 'abc123';
```

---

## 📈 Monitoramento e Performance

### KPIs a Monitorar

1. **Taxa de Sucesso de Sync:**

```sql
SELECT
  COUNT(*) FILTER (WHERE sync_status = 'synced') * 100.0 / COUNT(*) as success_rate
FROM products
WHERE created_at > NOW() - INTERVAL '7 days';
```

2. **Tempo Médio de Sync:**

```sql
SELECT
  AVG(EXTRACT(EPOCH FROM (updated_at - created_at))) / 60 as avg_minutes
FROM products
WHERE sync_status = 'synced'
AND created_at > NOW() - INTERVAL '7 days';
```

3. **Economia de Banda (GB):**

```sql
SELECT
  SUM(original_size_kb - optimized_size_kb) / 1024 / 1024 as saved_gb
FROM products
WHERE sync_status = 'synced';
```

### Otimizações de Performance

1. **Ajustar concorrência:**
   - Aumentar `PRODUCT_CONCURRENCY` para processar mais produtos em paralelo
   - Cuidado: muito paralelismo pode causar rate limits

2. **Reduzir tamanho de chunks:**
   - Se houver timeouts, diminuir `CHUNK_SIZE`

3. **Aumentar delay entre chunks:**
   - Se houver throttling, aumentar `DELAY_BETWEEN_CHUNKS`

### Otimizações de Storage (v1.1 - Fevereiro 2026)

**1. Variantes Reduzidas:**

- **Antes:** 3 variantes (320w, 640w, 1000w) + arquivo main.webp duplicado = **4 arquivos**
- **Agora:** 2 variantes (480w, 1200w) = **2 arquivos**
- **Economia:** 50% menos arquivos, ~40% menos storage

**Tamanhos otimizados:**

- **480w**: Mobile e tablets (cobre até 960px com retina)
- **1200w**: Desktop e HD (cobre até 2400px com retina)

**2. Pastas com Reference Code:**

- **Antes:** `products/abc-123-uuid-456/main-1200w.webp`
- **Agora:** `products/TH2345SZJ/main-1200w.webp`
- **Vantagens:**
  - URLs legíveis e SEO-friendly
  - Facilita debug e manutenção manual
  - Menor risco de conflitos (reference_code é único por user)

**3. Eliminação de Duplicação:**

- **Removido:** Arquivo `main.webp` (cópia do 1200w)
- **Motivo:** Desnecessário - usamos diretamente a variante maior

---

## 🔐 Segurança e Multi-Tenancy

### Isolamento de Dados

**Todas** as queries devem incluir `user_id`:

```javascript
// ✅ CORRETO
const { data } = await supabase
  .from('products')
  .select('*')
  .eq('user_id', userId);

// ❌ ERRADO (vazamento de dados)
const { data } = await supabase.from('products').select('*');
```

### RLS (Row Level Security)

Políticas no Supabase garantem isolamento:

```sql
CREATE POLICY "Users see only their products"
ON products FOR SELECT
USING (auth.uid() = user_id);
```

### Storage Buckets

**Opção 1: Flat Structure por Marca (RECOMENDADO - v1.3)**

```
product-images/
  public/
    brands/
      tommy/
        TH2345SZJ-main-480w.webp
        TH2345SZJ-main-1200w.webp
        TH2345SZJ-01-480w.webp      ← Galeria: ref-{index}-{size}w.webp
        TH2345SZJ-01-1200w.webp
        TH2345SZJ-02-480w.webp
        TH2345SZJ-02-1200w.webp
```

**Vantagens:**

- ✅ URLs curtas e legíveis
- ✅ Fácil buscar/deletar por reference_code
- ✅ Menos hierarquia (mais rápido)
- ✅ SEO-friendly

**Opção 2: Bucket por Marca (CREATE_BUCKETS=true)**

```
product-images-tommy/
  TH2345SZJ-main-480w.webp
  TH2345SZJ-main-1200w.webp
  TH2345SZJ-01-480w.webp
```

---

## 📝 Checklist de Validação

Use este checklist após importação ou sync:

- [ ] `products.images` contém array (não está vazio)
- [ ] `products.sync_status = 'synced'` (se processado)
- [ ] `products.image_path` está populado (capa)
- [ ] `products.image_optimized = true`
- [ ] `product_images` possui registros (galeria)
- [ ] `product_images.sync_status = 'synced'`
- [ ] Frontend carrega imagens do storage (não URLs externas)
- [ ] Galeria exibe todas as fotos (não apenas a capa)
- [ ] Imagens responsivas carregam (480w, 1200w)
- [ ] Pasta usa reference_code ao invés de UUID
- [ ] Não há duplicatas em `product_images`

---

## 🆘 Contatos e Referências

### Arquivos-Chave

| Arquivo                                              | Descrição                  |
| ---------------------------------------------------- | -------------------------- |
| `src/app/dashboard/products/import-massa/page.tsx`   | Importação Excel           |
| `src/lib/utils/image-logic.ts`                       | Helpers de processamento   |
| `scripts/local-sync-full.mjs`                        | Script de sincronização    |
| `src/lib/imageUtils.ts`                              | Frontend image utils       |
| `src/components/catalogo/ProductCard.tsx`            | Renderização catálogo      |
| `src/components/catalogo/store-modals-container.tsx` | Modal/galeria e thumbnails |
| `src/components/dashboard/EditProductForm.tsx`       | Editor produto (galeria)   |

### Variáveis de Ambiente

```env
NEXT_PUBLIC_SUPABASE_URL=https://aawghxjbipcqefmikwby.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...  # Admin scripts
CRON_SECRET=seu_secret_aleatorio_aqui  # Protege APIs /api/admin/*
PRODUCT_IMAGES_BUCKET=product-images
CREATE_BUCKETS=false  # true para bucket por marca
```

### Interface Web de Sincronização

**Acesso:** `/dashboard/settings/sync` (apenas para usuários Master/Admin)

**Funcionalidades:**

- 📊 Estatísticas em tempo real (pendentes, processando, sincronizados, falhados)
- 🎮 Controle manual de sincronização com logs em tempo real
- 🔍 Filtros por marca e limite de produtos
- 🔄 Opção de forçar re-processamento
- 📈 Barra de progresso visual
- ❌ Listagem de erros recentes
- 💾 Estatísticas de storage (variantes, economia de banda)

**Como usar:**

1. Acesse Dashboard → Ajustes → Aba "Sincronização"
2. Clique em "Abrir Torre de Controle"
3. Visualize estatísticas e produtos pendentes
4. Configure filtros (marca, limite) se necessário
5. Clique em "Iniciar Sincronização"
6. Acompanhe logs em tempo real
7. Aguarde conclusão ou cancele se necessário

### Logs Importantes

- **Import logs:** Console do navegador durante upload Excel
- **Sync logs:** Terminal durante execução de `local-sync-full.mjs`
- **Frontend logs:** Network tab (DevTools) para verificar URLs carregadas

### Documentação Adicional

- **[Guia Visual de Variantes](./docs/VARIANTES_IMAGENS_GUIA.md)** - Diagrama completo do fluxo com exemplos práticos
- **[Resumo Simples](./docs/VARIANTES_RESUMO_SIMPLES.md)** - Explicação não-técnica do sistema
- **[Implementação srcset](./docs/IMPLEMENTACAO_SRCSET.md)** - ✅ **NOVO:** Como funciona o srcset (v1.2)
- **[Teste Fluxo Completo](./TESTE_FLUXO_COMPLETO.md)** - Passo a passo para validação end-to-end
- **[Implementação](./RESUMO_IMPLEMENTACAO.md)** - Status das features e próximos passos

---

**Fim do Manual** | Versão 1.4 | 2026-02-05
