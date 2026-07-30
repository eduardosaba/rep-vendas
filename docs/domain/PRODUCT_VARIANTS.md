# PRODUCT_VARIANTS.md - Estrutura de Produtos e Variantes Ópticas

## 1. Arquitetura de Entidades (`Product` -> `ProductVariant`)

Para atender o setor de armações e óculos, o produto base define o modelo/referência global, enquanto a **variante** é a unidade vendável de estoque (SKU/EAN).

```text
Product (Modelo Base)
├── brand (Marca: Ray-Ban, Oakley, Boss)
├── reference_code (Código da Referência: RB3025, BOSS 1724)
├── category (Armação de Grau, Óculos de Sol)
├── material (Acetato, Titânio, Metal)
├── gender (Masculino, Feminino, Unissex)
└── ProductVariant (Unidade Vendável SKU)
    ├── color_code & color_name (Código e Nome da Cor: 001/58 - Preto)
    ├── size (Tamanho: 54-18-140)
    ├── barcode (Código de Barras EAN-13 / GTIN)
    ├── available_stock (Estoque disponível)
    ├── reserved_stock (Estoque reservado em pedidos)
    ├── price (Preço base da variante)
    └── images (Array de imagens específicas da variante)
```

---

## 2. Eliminação de Conflitos de Referência

Com a separação explícita entre modelo (`Product`) e variante (`ProductVariant`):
- O código de referência (`reference_code`) pertence ao modelo pai.
- Várias cores ou tamanhos da mesma referência compartilham o mesmo `Product` pai e são diferenciadas no nível de `ProductVariant`.
- Evita totalmente o problema de unicidade de referência no cadastro e atualização.
