# AGENTS.md - Regras Arquiteturais do Rep Vendas

## 🖼️ Regra de Arquitetura Permanente: Padrão Resiliente de Imagens (Proxy Fallback)

> **DIRETIVA CRÍTICA**: O padrão de funcionamento da resolução de imagens do projeto Rep Vendas é imutável e preserva a resiliência visual no Catálogo Virtual, Dashboard e Edição de Produtos.

### 1. Resolução Resiliente em Cascata (`/api/storage-image`)
- A rota `/api/storage-image` (função `buildImageCandidates`) é o único ponto responsável por resolver o arquivo físico correto no Supabase Storage.
- Quando qualquer componente solicita uma imagem (ex: `public/brands/.../TH_2365_F_9RQ-main-480w.webp`), o proxy tenta as seguintes alternativas no servidor:
  1. Caminho exato solicitado (ex: `-480w.webp`)
  2. Variante de alta resolução (ex: `-1200w.webp`)
  3. Troca de índice primário (`-main-` $\leftrightarrow$ `-00-` apenas; os ângulos `-01-`, `-02-` NUNCA devem ser alterados)
  4. Imagem original sem sufixo de resolução (ex: `.jpg`, `.jpeg`, `.webp`, `.png`)
  5. Todas as opções acima com e sem o prefixo `public/`

### 2. Resposta de Arquivo Inexistente (HTTP 404 JSON)
- Se a imagem for totalmente inexistente em todos os candidatos no Storage, o proxy **NUNCA** deve retornar um corpo SVG 404.
- Deve retornar **`HTTP 404` com `Content-Type: application/json`**, garantindo que a tag `<img>` no navegador dispare o evento `onError` para que o componente React exiba o placeholder nativo do cliente (`SmartImage`).

### 3. Proibição de Fabricação de Sufixos Inexistentes
- As funções `normalizeImageForDB` (`imageHelpers.ts`) e `ensure480w` (`imageUtils.ts`) **NUNCA** devem injetar ou inventar o sufixo `-480w.webp` em arquivos que originalmente são `.jpg`, `.png` ou `.webp` e não possuem variantes físicas geradas.
- Componentes visuais (`ProductCard`, `ProductVariants`, `store-modals-container`) não devem forçar o parâmetro `&w=480` em caminhos diretos de imagens originais.

### 4. Mapeamento de Buckets e Estrutura Multitenant
- O bucket padrão para imagens de produtos é **`product-images`**.
- A palavra `brands` em caminhos como `public/brands/boss/...` faz parte da estrutura de diretórios do objeto e **NUNCA** deve ser tratada como nome de bucket.
