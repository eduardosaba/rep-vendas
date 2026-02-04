# 🖼️ Atualização: Página de Detalhes Usa `gallery_images`

**Data:** 04/02/2026  
**Versão:** 1.3

---

## 🎯 **Mudanças Implementadas**

### ✅ **1. Query Atualizada**

```typescript
// ANTES
.select('*, product_images(*)')

// AGORA
.select('*, product_images(*), gallery_images')
       //                       ^^^^^^^^^^^^^^^ NOVO campo
```

---

### ✅ **2. Lógica de Prioridade de Galeria**

```
┌─────────────────────────────────────────────────────────┐
│ ORDEM DE PRIORIDADE (galleryData)                      │
├─────────────────────────────────────────────────────────┤
│ 1️⃣ products.gallery_images  (✨ NOVO - v1.3)           │
│    ├─ Campo dedicado só para galeria                   │
│    ├─ Já vem otimizado (1200w)                         │
│    └─ Mais rápido (sem JOIN)                           │
│                                                         │
│ 2️⃣ product_images table (Fallback - v1.2)              │
│    ├─ Tabela relacional completa                       │
│    ├─ Suporta sync_status individual                   │
│    └─ Usado se gallery_images vazio                    │
│                                                         │
│ 3️⃣ products.images / external_url (Legado)             │
│    └─ URLs externas quando nada otimizado              │
└─────────────────────────────────────────────────────────┘
```

---

### ✅ **3. Variantes de Imagem (Sempre 1200w no Zoom)**

```typescript
// Para cada imagem da galeria:
const items = galleryImagesField.map((img) => {
  const optimizedUrl = img.url; // https://.../TH2345-01-1200w.webp
  const storagePath = img.path; // public/brands/tommy/TH2345-01-1200w.webp

  return {
    thumbnailUrl: getProductImage(optimizedUrl, 'small'), // 480w
    url: getProductImage(optimizedUrl, 'medium'), // 600px
    zoomUrl: getProductImage(optimizedUrl, 'large'), // ✅ 1200w (ALTA QUALIDADE)
  };
});
```

**Resultado:**

- 📱 **Thumbnail:** Carrega 480w (~30KB)
- 👁️ **Visualização:** Carrega 600px (~60KB)
- 🔍 **Zoom:** Carrega **1200w** (~150KB) - **SEMPRE ALTA QUALIDADE**

---

### ✅ **4. Fallback Inteligente**

```typescript
// Se gallery_images estiver vazio, usa product_images
if (!galleryImagesField || galleryImagesField.length === 0) {
  // Fallback para product_images
  if (product.product_images && product.product_images.length > 0) {
    // Mesmo comportamento: 1200w para zoom
    const largeUrl = isSynced
      ? getProductImage(baseUrl, 'large') // ✅ 1200w
      : baseUrl; // ✅ URL externa se não otimizada
  }
}
```

---

## 📊 **Exemplo Prático**

### **Produto: TH2345SZJ**

#### **Banco de Dados:**

```sql
-- products.gallery_images
[
  {"url": "https://.../TH2345SZJ-01-1200w.webp", "path": "public/brands/tommy/TH2345SZJ-01-1200w.webp"},
  {"url": "https://.../TH2345SZJ-02-1200w.webp", "path": "public/brands/tommy/TH2345SZJ-02-1200w.webp"}
]
```

#### **Frontend Renderiza:**

```tsx
// galleryData gerado
[
  {
    id: 'gallery-0',
    thumbnailUrl: '/api/storage-image?path=.../TH2345SZJ-01-480w.webp',
    url: '/api/storage-image?path=.../TH2345SZJ-01-600px.webp',
    zoomUrl: '/api/storage-image?path=.../TH2345SZJ-01-1200w.webp', // ⭐ ALTA QUALIDADE
  },
  {
    id: 'gallery-1',
    thumbnailUrl: '/api/storage-image?path=.../TH2345SZJ-02-480w.webp',
    url: '/api/storage-image?path=.../TH2345SZJ-02-600px.webp',
    zoomUrl: '/api/storage-image?path=.../TH2345SZJ-02-1200w.webp', // ⭐ ALTA QUALIDADE
  },
];
```

---

## 🎨 **Experiência do Usuário**

### **Antes (Problema)**

- ❌ Zoom carregava imagem de baixa qualidade (600px)
- ❌ Imagens borradas ao ampliar
- ❌ Galeria misturada com capa

### **Agora (Solução)**

- ✅ Zoom carrega **1200w** (alta qualidade)
- ✅ Imagens nítidas mesmo ampliadas
- ✅ Galeria separada da capa
- ✅ Performance: só carrega 1200w quando usuário clica para ampliar

---

## 🚀 **Performance**

| Ação                   | Antes         | Agora              | Economia         |
| ---------------------- | ------------- | ------------------ | ---------------- |
| Thumbnail (lista)      | 600px (~60KB) | 480w (~30KB)       | **50%**          |
| Visualização principal | 600px (~60KB) | 600px (~60KB)      | -                |
| Zoom (modal)           | 600px (~60KB) | **1200w (~150KB)** | Melhor qualidade |

**Impacto:**

- ✅ 50% menos banda em thumbnails
- ✅ Qualidade superior no zoom
- ✅ UX melhor (imagens nítidas)

---

## 🧪 **Como Testar**

### 1️⃣ **Execute a Migration**

```sql
-- Arquivo: SQL/add_gallery_images_column.sql
ALTER TABLE products
ADD COLUMN IF NOT EXISTS gallery_images JSONB DEFAULT '[]'::jsonb;
```

### 2️⃣ **Execute o Sync**

```powershell
pnpm run sincronizar
```

### 3️⃣ **Abra o Catálogo Virtual**

```
https://seu-dominio.com/catalogo/seu-slug/product/PRODUCT_ID
```

### 4️⃣ **Clique em uma Imagem da Galeria**

**Comportamento esperado:**

- ✅ Modal de zoom abre
- ✅ Imagem carregada é a **1200w** (alta qualidade)
- ✅ URL da imagem contém `-1200w.webp`

### 5️⃣ **Inspecionar Network Tab**

```
DevTools → Network → Filter: images
Buscar por: 1200w.webp
```

Você deve ver requisições tipo:

```
/api/storage-image?path=public/brands/tommy/TH2345SZJ-01-1200w.webp
```

---

## 📝 **Checklist de Validação**

- [ ] Migration `gallery_images` executada
- [ ] Sync rodou e populou `gallery_images`
- [ ] Página de detalhes carrega sem erros
- [ ] Galeria exibe todas as imagens
- [ ] Ao clicar em imagem, zoom abre com 1200w
- [ ] Se imagem não otimizada, mostra URL externa
- [ ] Network tab confirma carregamento de 1200w

---

## 🐛 **Troubleshooting**

### **Galeria não aparece**

```sql
-- Verificar se gallery_images está populado
SELECT
  reference_code,
  jsonb_array_length(gallery_images) as total_galeria,
  gallery_images
FROM products
WHERE id = 'PRODUCT_ID';
```

Se retornar `0` ou `null`, execute o sync novamente.

### **Zoom carrega imagem pequena**

Verifique se `getProductImage('large')` está retornando `-1200w.webp`:

```typescript
console.log(getProductImage(url, 'large'));
// Deve retornar: .../TH2345-01-1200w.webp
```

Se retornar diferente, verificar implementação em `src/lib/utils/image-logic.ts`.

---

## 📚 **Arquivos Modificados**

✅ [src/app/catalogo/[slug]/product/[productId]/page.tsx](../../src/app/catalogo/[slug]/product/[productId]/page.tsx)  
✅ Interface `Product` atualizada com `gallery_images`  
✅ Query atualizada para buscar `gallery_images`  
✅ Lógica `galleryData` prioriza `gallery_images`  
✅ Zoom sempre usa 1200w (alta qualidade)

---

**Versão:** 1.3 | **Data:** 2026-02-04
