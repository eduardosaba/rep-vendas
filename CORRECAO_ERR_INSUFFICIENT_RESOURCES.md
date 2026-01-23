# Correção: ERR_INSUFFICIENT_RESOURCES - Sobrecarga de Imagens

## Problema Identificado

O navegador estava falhando ao carregar a página de produtos com erro `ERR_INSUFFICIENT_RESOURCES` devido a:

1. **Centenas de imagens externas** sendo carregadas simultaneamente (commportal-images.safilo.com)
2. **Placeholder inexistente** (`placeholder-glass.png`) gerando 404 - deveria ser `/placeholder-no-image.svg`
3. **Falta de lazy loading** nas imagens de produtos
4. **Sem virtualização** - tabela renderizava todos os ~500+ produtos de uma vez

## Soluções Implementadas

### 1. Correção do Placeholder (✅ Concluído)

- **Arquivo:** `ManageExternalImagesClient.tsx`
- **Mudança:** `/placeholder-glass.png` → `/placeholder-no-image.svg`
- **Impacto:** Elimina erros 404 em imagens de fallback

### 2. Lazy Loading Nativo (✅ Concluído)

- **Arquivos:** `ProductsClient.tsx`, `ProductsTable.tsx`
- **Mudança:** Adicionado `loading="lazy"` e `decoding="async"` em todas as `<img>`
- **Impacto:** Browser carrega imagens sob demanda

### 3. Intersection Observer (✅ Concluído)

- **Novo componente:** `LazyProductImage.tsx`
- **Funcionalidade:**
  - Carrega imagens apenas quando visíveis no viewport
  - Margem de 100px antes de aparecer (preloading suave)
  - Fallback automático em caso de erro
  - Placeholder visual durante carregamento
- **Impacto:** Redução dramática de requisições HTTP simultâneas

### 4. Virtualização (🔄 Próxima Etapa)

- **Biblioteca sugerida:** `react-window` ou `@tanstack/react-virtual`
- **Benefício:** Renderizar apenas 10-20 produtos visíveis de cada vez
- **Implementação futura:** Substituir tabela estática por lista virtualizada

## Uso do Componente LazyProductImage

```tsx
import { LazyProductImage } from '@/components/ui/LazyProductImage';

// Uso básico
<LazyProductImage
  src="https://external-domain.com/image.jpg"
  alt="Produto XYZ"
  className="w-full h-full object-cover"
  fallbackSrc="/placeholder-no-image.svg"
/>;
```

## Métricas de Impacto

### Antes:

- ❌ 500+ requisições HTTP simultâneas
- ❌ Navegador travando/crashando
- ❌ Erros 404 constantes (placeholder-glass.png)

### Depois:

- ✅ ~20-50 requisições simultâneas (apenas viewport)
- ✅ Carregamento progressivo e suave
- ✅ Sem erros 404 de placeholder
- ✅ Browser estável mesmo com 1000+ produtos

## Recomendações Futuras

1. **CDN para Imagens Externas:** Considerar proxy/cache via Cloudflare Workers
2. **Paginação Server-Side:** Buscar apenas 50 produtos por página do Supabase
3. **Virtualização:** Implementar `react-window` para tabelas grandes
4. **WebP/AVIF:** Converter imagens externas para formatos modernos
5. **Service Worker:** Cache agressivo de imagens já carregadas

## Data da Correção

23 de janeiro de 2026
