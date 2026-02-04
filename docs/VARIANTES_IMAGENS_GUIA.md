# Guia Visual: Sistema de Variantes de Imagens

**Data:** 3 de fevereiro de 2026  
**Versão:** 1.0

---

## 📸 O que são Variantes?

Variantes são **versões redimensionadas** da mesma imagem, otimizadas para diferentes dispositivos.

### Exemplo Prático:

**Imagem Original:** `https://safilo.com/product_P00.JPG` (2000x2000px, 800KB)

**Após Sincronização:**

```
📁 public/brands/tommy/products/TH2345SZJ/
├── main-480w.webp   → 480x480px,  ~45KB  (Mobile)
└── main-1200w.webp  → 1200x1200px, ~120KB (Desktop)
```

**Economia:** De 800KB para 45KB em mobile = **94% menos banda!**

---

## 🎯 Por que 480w e 1200w?

### Cobertura de Dispositivos:

| Dispositivo   | Viewport | Retina? | Precisa de  | Usa Variante |
| ------------- | -------- | ------- | ----------- | ------------ |
| iPhone SE     | 375px    | 2x      | 750px real  | **480w** ✅  |
| iPhone 14 Pro | 393px    | 3x      | 1179px real | **1200w** ✅ |
| iPad          | 768px    | 2x      | 1536px real | **1200w** ✅ |
| Desktop HD    | 1920px   | 1x      | 1920px real | **1200w** ✅ |
| Desktop 4K    | 2560px   | 2x      | 5120px real | **1200w** ⚠️ |

⚠️ _Desktop 4K usa upscale, mas raramente imagens de produto ocupam tela toda_

### Comparação com Sistema Antigo:

| Sistema  | Variantes                     | Total Arquivos | Duplicação?                |
| -------- | ----------------------------- | -------------- | -------------------------- |
| **v1.0** | 320w, 640w, 1000w + main.webp | 4 por imagem   | ✅ Sim (main.webp = 1000w) |
| **v1.1** | 480w, 1200w                   | 2 por imagem   | ❌ Não                     |

**Benefício:** 50% menos arquivos = 50% menos storage = menores custos

---

## 🔄 Fluxo Completo: Do Excel até o Navegador

```
┌─────────────────────────────────────────────────────────────────┐
│ FASE 1: IMPORTAÇÃO (Excel → Banco)                             │
└─────────────────────────────────────────────────────────────────┘

Excel Row:
┌──────────────────────────────────────────────────────────────┐
│ Referência | Imagem                                          │
│ TH2345SZJ  | https://safilo.com/P00.JPG;...P01.JPG;...P02.JPG│
└──────────────────────────────────────────────────────────────┘
                           ↓
            processSafiloImages() split por ";"
                           ↓
┌──────────────────────────────────────────────────────────────┐
│ products (Banco)                                             │
├──────────────────────────────────────────────────────────────┤
│ reference_code: "TH2345SZJ"                                  │
│ external_image_url: "https://safilo.com/P00.JPG"             │
│ images: ["...P00.JPG", "...P01.JPG", "...P02.JPG"]          │
│ sync_status: "pending"   ← Aguardando processamento          │
│ image_path: NULL                                             │
│ image_variants: NULL                                         │
└──────────────────────────────────────────────────────────────┘


┌─────────────────────────────────────────────────────────────────┐
│ FASE 2: SINCRONIZAÇÃO (Script Node.js ou Torre de Controle)    │
└─────────────────────────────────────────────────────────────────┘

Script: local-sync-full.mjs
                           ↓
1. Busca produtos onde sync_status = 'pending'
                           ↓
2. Para cada produto:
   - Baixa URL externa: https://safilo.com/P00.JPG
   - Buffer original: 2000x2000px, 800KB
                           ↓
3. Sharp cria variantes:
   ┌────────────────────────────────────────┐
   │ sharp(buffer)                          │
   │   .resize(480, 480)                    │
   │   .webp({ quality: 75 })               │
   │   → Buffer 480px, ~45KB                │
   └────────────────────────────────────────┘

   ┌────────────────────────────────────────┐
   │ sharp(buffer)                          │
   │   .resize(1200, 1200)                  │
   │   .webp({ quality: 75 })               │
   │   → Buffer 1200px, ~120KB              │
   └────────────────────────────────────────┘
                           ↓
4. Upload para Supabase Storage:
   📁 product-images/public/brands/tommy/products/TH2345SZJ/
   ├── main-480w.webp   (45KB)
   └── main-1200w.webp  (120KB)
                           ↓
5. Atualiza banco:
┌──────────────────────────────────────────────────────────────┐
│ products (Banco)                                             │
├──────────────────────────────────────────────────────────────┤
│ reference_code: "TH2345SZJ"                                  │
│ sync_status: "synced"   ← Processado!                        │
│ image_path: "public/.../TH2345SZJ/main-1200w.webp"          │
│ image_variants: [                                            │
│   {size: 480, path: ".../main-480w.webp", url: "https://..."│
│   {size: 1200, path: ".../main-1200w.webp", url: "https://..│
│ ]                                                            │
└──────────────────────────────────────────────────────────────┘


┌─────────────────────────────────────────────────────────────────┐
│ FASE 3: RENDERIZAÇÃO (Frontend)                                │
└─────────────────────────────────────────────────────────────────┘

ProductCard.tsx:
┌────────────────────────────────────────────────────────────┐
│ const path = product.image_path;                           │
│ const src = `/api/storage-image?path=${path}`;             │
│                                                            │
│ <img src={src} alt={product.name} />                      │
└────────────────────────────────────────────────────────────┘
                           ↓
Navegador faz request:
GET /api/storage-image?path=public/.../TH2345SZJ/main-1200w.webp
                           ↓
API Route (route.ts):
┌────────────────────────────────────────────────────────────┐
│ 1. Parse path do query param                              │
│ 2. supabase.storage.from('product-images')                │
│      .download(path)                                       │
│ 3. Retorna Buffer com headers:                            │
│    - Content-Type: image/webp                             │
│    - Cache-Control: max-age=86400 (1 dia)                 │
└────────────────────────────────────────────────────────────┘
                           ↓
                    Navegador renderiza
                    (+ cache de 1 dia)
```

---

## 📊 Estado Atual vs Futuro Otimizado

### **ATUAL (v1.1):**

```tsx
// ProductCard.tsx
<img src="/api/storage-image?path=.../main-1200w.webp" alt="Produto" />
```

**Problema:**

- Mobile (320px viewport) baixa imagem de 1200px
- Desperdiça ~70% de banda

**Como funciona:**

1. ✅ Sync cria 2 variantes (480w, 1200w)
2. ❌ Frontend **sempre** usa 1200w
3. ✅ API serve com cache

---

### **FUTURO (Responsive Images):**

```tsx
// ProductCard.tsx (após implementação)
const variants = product.image_variants;
const srcset = variants
  .map((v) => `/api/storage-image?path=${v.path} ${v.size}w`)
  .join(', ');

<img
  src="/api/storage-image?path=.../main-1200w.webp"
  srcset="
    /api/storage-image?path=.../main-480w.webp 480w,
    /api/storage-image?path=.../main-1200w.webp 1200w
  "
  sizes="(max-width: 768px) 100vw, 200px"
  alt="Produto"
/>;
```

**Benefício:**

- Mobile (320px) → navegador escolhe **480w** (45KB)
- Desktop (1920px) → navegador escolhe **1200w** (120KB)
- Economia: **60-70% de banda** em mobile!

**Como funciona:**

1. ✅ Sync cria 2 variantes
2. ✅ Frontend gera `srcset` com ambas
3. ✅ Navegador escolhe automaticamente a melhor
4. ✅ API serve com cache

---

## 🛠️ Como as Variantes São Armazenadas

### Estrutura de Storage:

```
product-images (bucket)
└── public/
    └── brands/
        └── tommy/
            └── products/
                ├── TH2345SZJ/              ← Reference code (SEO-friendly)
                │   ├── main-480w.webp      ← Capa mobile
                │   ├── main-1200w.webp     ← Capa desktop
                │   └── gallery/
                │       ├── {uuid-1}-480w.webp
                │       ├── {uuid-1}-1200w.webp
                │       ├── {uuid-2}-480w.webp
                │       └── {uuid-2}-1200w.webp
                │
                └── TH6789ABC/
                    ├── main-480w.webp
                    └── main-1200w.webp
```

### Estrutura no Banco:

```sql
-- Tabela products
SELECT
  reference_code,
  image_path,
  image_variants
FROM products
WHERE reference_code = 'TH2345SZJ';

-- Resultado:
┌───────────────┬───────────────────────────────────────┬──────────────────────────────────┐
│ reference_code│ image_path                            │ image_variants                   │
├───────────────┼───────────────────────────────────────┼──────────────────────────────────┤
│ TH2345SZJ     │ public/.../TH2345SZJ/main-1200w.webp  │ [                                │
│               │                                       │   {                              │
│               │                                       │     "size": 480,                 │
│               │                                       │     "path": ".../main-480w.webp",│
│               │                                       │     "url": "https://..."         │
│               │                                       │   },                             │
│               │                                       │   {                              │
│               │                                       │     "size": 1200,                │
│               │                                       │     "path": ".../main-1200w.webp"│
│               │                                       │     "url": "https://..."         │
│               │                                       │   }                              │
│               │                                       │ ]                                │
└───────────────┴───────────────────────────────────────┴──────────────────────────────────┘
```

---

## 🎯 Checklist de Implementação (Para Desenvolvedores)

### ✅ FASE 1: Sync (Completa)

- [x] Criar 2 variantes (480w, 1200w) ao invés de 4
- [x] Usar reference_code na pasta ao invés de UUID
- [x] Remover criação de main.webp duplicado
- [x] Salvar array `image_variants` no banco
- [x] Torre de Controle funcionando com novas variantes

### ⏳ FASE 2: Frontend (Pendente)

- [ ] Modificar `SmartImage.tsx` para usar `srcset`
- [ ] Gerar srcset a partir de `product.image_variants`
- [ ] Adicionar `sizes` corretos por componente
- [ ] Testar economia de banda (DevTools → Network)

### 📈 FASE 3: Monitoramento (Futuro)

- [ ] Dashboard de uso de storage (variantes x banda)
- [ ] Métrica de economia de banda (antes/depois)
- [ ] Alerta de imagens sem variantes sincronizadas

---

## 🔍 FAQ Técnico

**Q: Por que não usar CDN com transformação on-the-fly (tipo Cloudflare Images)?**  
R: Custo. Cloudflare Images cobra $5/mês por 100k imagens + $1 por 100k requests. Nosso sistema gera variantes 1x e serve infinitamente com cache.

**Q: Por que WebP e não AVIF?**  
R: Compatibilidade. WebP tem ~97% de suporte (incluindo iOS 14+). AVIF tem ~85% (iOS 16+ apenas).

**Q: Por que quality: 75?**  
R: Ponto ótimo para WebP. Qualidade 75 = imperceptível ao olho humano + 30-40% menor que quality 90.

**Q: O que acontece se adicionar mais variantes (ex: 800w)?**  
R: Editar `RESPONSIVE_SIZES` em `local-sync-full.mjs`:

```js
const RESPONSIVE_SIZES = [480, 800, 1200];
```

Produtos já sincronizados NÃO serão re-processados. Resetar com:

```sql
UPDATE products SET sync_status = 'pending' WHERE sync_status = 'synced';
```

**Q: Como saber se variantes estão sendo usadas?**  
R: DevTools → Network → clique na imagem → Headers → Request URL deve conter `-480w` ou `-1200w`.

---

## 📚 Referências

- [Responsive Images MDN](https://developer.mozilla.org/en-US/docs/Learn/HTML/Multimedia_and_embedding/Responsive_images)
- [WebP Compression Study](https://developers.google.com/speed/webp/docs/webp_study)
- [Supabase Storage Best Practices](https://supabase.com/docs/guides/storage/best-practices)
- Sharp Library: https://sharp.pixelplumbing.com/

---

**Fim do Guia** | v1.0 | 2026-02-03
