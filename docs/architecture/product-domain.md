# Modelo de Domínio do Produto — RepVendas Platform

Este documento é a **fonte única da verdade (Single Source of Truth)** para a modelagem dos atributos de produtos no ecossistema RepVendas. Ele estabelece o princípio da **responsabilidade única** para cada coluna na tabela `products`.

---

## 📌 Mapeamento Oficial de Atributos

| Coluna | Tipo | Descrição e Finalidade | Valores Permitidos / Exemplo |
| :--- | :---: | :--- | :--- |
| `name` | `text` | Nome principal exibido no catálogo. | *"Armação Ray-Ban Aviador"* |
| `reference_code` | `text` | Código de referência do item/variante. | *"RB3025 001/58"* |
| `reference_id` | `text` | Código de agrupamento da armação/modelo base. | *"RB3025"* |
| `category` | `text` | **Categoria Comercial** (divisão principal do catálogo). | `"Solar"`, `"Receituário"`, `"Acessórios"` |
| `class_core` | `text` | **Classe Comercial** (estratégia de linha/preço). | `"Classe A"`, `"Linha Premium"`, `"Promocional"` |
| `tipo_montagem` | `text` | **Sistema de Montagem da Armação Ótica** (característica construtiva da peça). | `'aro_fechado'`, `'fio_nylon'`, `'balgriff'` |
| `clip_on` | `boolean` | Indica se a armação acompanha ou suporta lentes adicionais Clip-On. | `true` / `false` |
| `brand` | `text` | Marca do fabricante. | *"Ray-Ban"*, *"Oakley"* |
| `gender` | `text` | Público-alvo / Gênero. | `'feminino'`, `'masculino'`, `'unisex'`, `'teen'` |
| `color` | `text` | Cor da armação / haste. | *"Dourado / Preto"* |
| `material` | `text` | Material de fabricação da armação. | *"Acetato"*, *"Titânio"*, *"Metal"* |
| `is_active` | `boolean` | Status de visibilidade no catálogo público e pedidos. | `true` (Ativo) / `false` (Inativo) |

---

## 📐 Regras de Modelagem de `tipo_montagem`

A coluna `tipo_montagem` é restrita estritamente aos 3 sistemas construtivos de armações ópticas:

1. **`aro_fechado`**: Armação completa envolvendo toda a lente (Full Rim). Exibição visual: **"Aro Fechado"**.
2. **`fio_nylon`**: Armação semi-parafusada sustentada por fio de nylon (Nylor). Exibição visual: **"Fio de Nylon"**.
3. **`balgriff`**: Armação sem aro com lentes perfuradas e parafusadas (Rimless / 3 Peças). Exibição visual: **"Balgriff / Parafusada"**.

> ⚠️ **Regra Estrita**: `clip_on` não é um sistema de montagem de armação, e sim um atributo/funcionalidade adicional (flag booleana). `class_core` representa a classe comercial do item e nunca deve ser sobrescrita por `tipo_montagem`.
