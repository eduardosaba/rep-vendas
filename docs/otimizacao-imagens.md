# 🎨 Guia de Otimização de Imagens

## 📋 Sumário

1. [Script de Otimização](#script-de-otimização)
2. [Componentes Otimizados](#componentes-otimizados)
3. [Boas Práticas](#boas-práticas)
4. [Troubleshooting](#troubleshooting)

---

## 🚀 Script de Otimização

### Passo 1: Executar o Script

```bash
# Via npm/pnpm
pnpm run optimize-images

# Ou via PowerShell
.\scripts\optimize-images.ps1

# Ou diretamente com Node
node scripts/optimize-images.mjs
```

### O que o script faz:

✅ **Varre recursivamente** `/public/images`  
✅ **Redimensiona** imagens maiores que 1920px  
✅ **Converte para WebP** (qualidade 80%)  
✅ **Gera versões responsivas**: 320px, 640px, 1024px, 1920px  
✅ **Relatório detalhado** com espaço economizado

### Estrutura de Saída:

```
public/
  images/
    optimized/          ← Nova pasta criada
      produto.webp      ← Versão principal (max 1920px)
      produto-320w.webp ← Mobile
      produto-640w.webp ← Tablet
      produto-1024w.webp← Desktop
      produto-1920w.webp← Full HD
    produto.jpg         ← Original preservado
```

---

## 🖼️ Componentes Otimizados

### 1. OptimizedImage (Recomendado)

Use para **qualquer imagem** no projeto:

```tsx
import OptimizedImage from '@/components/ui/OptimizedImage';

<OptimizedImage
  src="/images/produto.jpg"
  alt="Nome do Produto"
  width={400}
  height={300}
  priority={false} // ← true APENAS para hero/banner
  quality={80} // ← 1-100 (padrão: 80)
/>;
```

**Recursos automáticos:**

- ✅ Lazy loading (exceto se `priority={true}`)
- ✅ Placeholder blur
- ✅ Responsive sizes
- ✅ WebP automático (Next.js)

---

### 2. ResponsivePicture (Máximo Controle)

Use quando precisa de **breakpoints específicos**:

```tsx
import { ResponsivePicture } from '@/components/ui/OptimizedImage';

<ResponsivePicture
  src="/images/banner.jpg"
  alt="Banner Principal"
  width={1920}
  height={600}
  priority={true}
  breakpoints={[
    { width: 640, src: '/images/optimized/banner-640w.webp' },
    { width: 1024, src: '/images/optimized/banner-1024w.webp' },
  ]}
/>;
```

**Gera HTML:**

```html
<picture>
  <!-- WebP para mobile -->
  <source
    media="(max-width: 640px)"
    srcset="banner-640w.webp"
    type="image/webp"
  />

  <!-- Fallback JPEG -->
  <img src="banner.jpg" alt="..." loading="lazy" width="1920" height="600" />
</picture>
```

---

## ✅ Boas Práticas

### 🎯 Quando usar `priority={true}`

**SIM** ✅ (Above the fold):

- Hero/Banner principal
- Logo no header
- Imagem destaque do produto (página de detalhe)

**NÃO** ❌ (Below the fold):

- Produtos em lista/grid
- Imagens no footer
- Thumbnails de galeria
- Ícones decorativos

### 📐 Sempre especifique `width` e `height`

```tsx
// ❌ EVITE (causa Layout Shift)
<Image src="/produto.jpg" alt="Produto" />

// ✅ CORRETO
<Image src="/produto.jpg" alt="Produto" width={400} height={300} />
```

**Dica:** Use as dimensões **reais** da imagem. O Next.js redimensiona automaticamente para mobile.

---

### 📱 Sizes Hint (Responsive)

```tsx
// Para imagens que ocupam larguras diferentes por tela:
<OptimizedImage
  src="/produto.jpg"
  alt="Produto"
  width={800}
  height={600}
  sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 400px"
/>
```

**Tradução:**

- Mobile (<640px): 100% da viewport
- Tablet (640-1024px): 50% da viewport
- Desktop (>1024px): 400px fixos

---

## 🔧 Aplicação Prática

### Componente ProductCard

**Antes:**

```tsx
<Image
  src={product.image_url}
  alt={product.name}
  fill
  style={{ objectFit: 'cover' }}
/>
```

**Depois (Otimizado):**

```tsx
<OptimizedImage
  src={product.image_url}
  alt={product.name}
  width={300}
  height={300}
  priority={false} // Lazy load em listas
  quality={80}
  sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 300px"
  className="rounded-lg"
  objectFit="cover"
/>
```

---

### Catálogo (Hero Banner)

```tsx
<OptimizedImage
  src="/images/banner-catalogo.jpg"
  alt="Catálogo Principal"
  width={1920}
  height={600}
  priority={true} // ← Carrega imediatamente
  quality={90} // ← Qualidade maior para hero
  sizes="100vw"
/>
```

---

## 🐛 Troubleshooting

### Erro: "Module not found: sharp"

```bash
pnpm install -D sharp
# ou
npm install --save-dev sharp
```

---

### Imagens não aparecem após otimização

1. **Verifique o caminho:**

   ```tsx
   // ❌ Errado
   src = 'images/produto.webp';

   // ✅ Correto
   src = '/images/optimized/produto.webp';
   ```

2. **Reinicie o servidor Next.js:**
   ```bash
   pnpm dev
   ```

---

### WebP não funciona em navegadores antigos

Use `ResponsivePicture` com fallback automático:

```tsx
<ResponsivePicture
  src="/images/produto.jpg" // ← Fallback JPEG
  alt="Produto"
  width={400}
  height={300}
/>
```

O navegador escolhe automaticamente:

- **WebP** se suportado (Chrome, Edge, Firefox)
- **JPEG** em fallback (IE11, Safari antigo)

---

## 📊 Métricas de Sucesso

Após implementar as otimizações, verifique:

### Google PageSpeed Insights

- **LCP (Largest Contentful Paint):** < 2.5s ✅
- **CLS (Cumulative Layout Shift):** < 0.1 ✅
- **FID (First Input Delay):** < 100ms ✅

### Lighthouse

- **Performance:** 90+ ✅
- **Best Practices:** 95+ ✅

---

## 🎯 Checklist de Implementação

- [ ] Executar script de otimização (`pnpm run optimize-images`)
- [ ] Substituir `<Image>` por `<OptimizedImage>` em componentes críticos
- [ ] Adicionar `priority={true}` apenas em imagens above-the-fold
- [ ] Especificar `width` e `height` em todas as imagens
- [ ] Configurar `sizes` para imagens responsivas
- [ ] Testar em mobile, tablet e desktop
- [ ] Medir performance no Lighthouse
- [ ] Verificar CLS no PageSpeed Insights

---

## 📚 Recursos Adicionais

- [Next.js Image Optimization](https://nextjs.org/docs/pages/building-your-application/optimizing/images)
- [WebP Browser Support](https://caniuse.com/webp)
- [Sharp Documentation](https://sharp.pixelplumbing.com/)
- [Google Web Vitals](https://web.dev/vitals/)
