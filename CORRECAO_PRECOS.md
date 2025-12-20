# 🔧 Correção: Preços de Custo e Sugerido agora funcionam corretamente

## ✅ Problema Resolvido

As configurações em **Settings > Exibição** agora funcionam corretamente!

## 🔍 O Problema

A estrutura dos campos no banco estava sendo interpretada incorretamente:

### ❌ Interpretação INCORRETA (anterior):

```typescript
{
  price: 100.00,  // ❌ Achávamos que era preço de venda
  cost: 50.00     // ❌ Tentávamos buscar este campo que não existe
}
```

### ✅ Estrutura CORRETA:

```typescript
{
  price: 50.00,        // ✅ CUSTO (quanto você paga ao fornecedor)
  sale_price: 100.00   // ✅ VENDA (preço sugerido ao cliente)
}
```

## ✅ Correções Aplicadas

1. **ProductDetailsModal** - Corrigido para usar `price` como custo e `sale_price` como venda
2. **ProductCard** - Corrigido para usar `price` como custo e `sale_price` como venda
3. **Formulário de Produtos** - Já estava correto (price = custo, sale_price = venda)

## 🎯 Como Usar

### No Dashboard - Cadastrar/Editar Produto:

```
┌─────────────────────────────────────────────┐
│ Preço de Custo (R$)                        │
│ 50,00  ← Quanto você PAGA (price)          │
├─────────────────────────────────────────────┤
│ Preço de Venda (R$) *                      │
│ 100,00 ← Quanto você COBRA (sale_price)    │
├─────────────────────────────────────────────┤
│ Preço Promocional (Opcional)               │
│ 120,00 ← Preço "De/Por" (original_price)   │
└─────────────────────────────────────────────┘
```

### No Catálogo - Exibição Condicional:

| Configuração                     | Resultado                                         |
| -------------------------------- | ------------------------------------------------- |
| `show_cost_price = true`         | Mostra **"Preço de Custo: R$ 50,00"** (azul)      |
| `show_sale_price = true`         | Mostra **"Preço Sugerido: R$ 100,00"** (vermelho) |
| Ambas ativadas                   | Mostra **AMBOS** os preços                        |
| `show_installments = true`       | Mostra **"ou 12x de R$ 8,33 sem juros"**          |
| `show_cash_discount = true` (5%) | Mostra **"R$ 95,00 à vista (-5%)"**               |

## 📝 Exemplos de Uso

### Lojista que vende para VAREJISTA:

- ✅ Ativa `show_cost_price` - Cliente vê quanto você paga
- ✅ Ativa `show_sale_price` - Cliente vê o preço sugerido de revenda
- 💡 Útil para representantes comerciais

### Lojista que vende para CONSUMIDOR FINAL:

- ❌ Desativa `show_cost_price` - Esconde seu custo
- ✅ Ativa `show_sale_price` - Mostra apenas o preço de venda
- ✅ Ativa `show_installments` - Oferece parcelamento
- ✅ Ativa `show_cash_discount` - Incentiva pagamento à vista

## 🚨 Importante

- Se o produto **não tiver** `sale_price` definido, o sistema usa `price` (custo) como fallback
- Modo "Apenas Custo": Quando `show_cost_price = true` e `show_sale_price = false`
- Parcelamento e Desconto são sempre aplicados sobre `sale_price` (preço de venda)

## 📂 Arquivos Corrigidos

- ✅ `src/components/catalogo/modals/ProductDetailsModal.tsx`
- ✅ `src/components/catalogo/ProductCard.tsx`
- ✅ `src/app/dashboard/products/new/page.tsx` (já estava correto)

---

**Agora todas as configurações de exibição em Settings funcionam perfeitamente! 🎉**

## ❌ Problema Identificado

As configurações em **Settings > Exibição** estão marcadas corretamente:

- ✅ Mostrar Preço de Custo (ativado)
- ✅ Mostrar Preço de Venda (ativado)
- ✅ Mostrar Parcelamento (ativado)
- ✅ Tag de Desconto à Vista (ativado - 5%)

Porém, no catálogo e modal de detalhes **só aparece "Preço unitário"**.

## 🔍 Causa Raiz

A coluna `cost` (preço de custo) **não existe** na tabela `products` do banco de dados.

Verificamos:

- ✅ Código do front-end está correto (ProductDetailsModal, ProductCard)
- ✅ Configurações do Settings são salvas corretamente
- ❌ **Falta a coluna `cost` na tabela products**

## ✅ Solução

### Passo 1: Aplicar Migration SQL

Execute o script SQL para adicionar a coluna `cost`:

```powershell
# No terminal PowerShell (a:\RepVendas):
node scripts/apply-sql.mjs "sua-connection-string" SQL/add_cost_column_to_products.sql
```

**Alternativa usando Supabase Dashboard:**

1. Acesse o Supabase Dashboard
2. Vá em **SQL Editor**
3. Cole o conteúdo de `SQL/add_cost_column_to_products.sql`
4. Execute (Run)

### Passo 2: Adicionar Preços de Custo aos Produtos

Após criar a coluna, você precisa **popular o campo `cost`** nos seus produtos:

**Opção A - Via Dashboard (Produtos):**

1. Vá em **Dashboard > Produtos**
2. Edite cada produto
3. Preencha o campo **"Preço de Custo"**

**Opção B - Via SQL (Atualização em massa):**

```sql
-- Exemplo: definir custo como 60% do preço de venda
UPDATE products SET cost = price * 0.6 WHERE cost IS NULL;

-- OU definir um valor fixo para produtos específicos
UPDATE products SET cost = 45.00 WHERE name LIKE '%Produto X%';
```

**Opção C - Via Importação CSV:**
Se você tem planilha com os custos, use a funcionalidade de importação do dashboard.

### Passo 3: Verificar no Catálogo

Após popular os custos, acesse o catálogo e verifique:

✅ **Preço de Custo** (azul) - aparece quando `show_cost_price = true`
✅ **Preço Sugerido** (vermelho) - aparece quando `show_sale_price = true`
✅ **Parcelamento** - aparece quando `show_installments = true` e `max_installments > 1`
✅ **Desconto à Vista** - aparece quando `show_cash_discount = true` e `cash_price_discount_percent > 0`

## 📝 Estrutura de Preços

Após a correção, cada produto terá:

```typescript
{
  name: "Produto Exemplo",
  cost: 50.00,        // ← NOVO: Preço de Custo (quanto você paga)
  price: 100.00,      // Preço de Venda Sugerido (quanto você cobra)
  original_price: 120.00  // Opcional: Preço "De" (para mostrar desconto)
}
```

## 🎯 Exibição Condicional

| Configuração                                        | Efeito no Catálogo                           |
| --------------------------------------------------- | -------------------------------------------- |
| `show_cost_price = true`                            | Mostra **"Preço de Custo: R$ X"** (azul)     |
| `show_sale_price = true`                            | Mostra **"Preço Sugerido: R$ Y"** (vermelho) |
| `show_cost_price = true` + `show_sale_price = true` | Mostra **AMBOS** os preços                   |
| `show_installments = true`                          | Mostra **"ou 12x de R$ Z sem juros"**        |
| `show_cash_discount = true` + `5%`                  | Mostra **"R$ W à vista (-5%)"**              |

## 🚨 Importante

- Se o produto **não tiver** `cost` definido, ele usará `price` como fallback
- Se você ativar **apenas** `show_cost_price` (sem sale), o catálogo entra em "modo custo" (não mostra preço de venda)
- As configurações são **por lojista** (multi-tenant)

## 📂 Arquivos Criados

- ✅ `SQL/add_cost_column_to_products.sql` - Migration para adicionar coluna
- ✅ `CORRECAO_PRECOS.md` - Este documento

## 🔗 Referências

- Interface Product: `src/lib/types.ts` (linha 55+)
- ProductDetailsModal: `src/components/catalogo/modals/ProductDetailsModal.tsx` (linha 220+)
- ProductCard: `src/components/catalogo/ProductCard.tsx` (linha 70+)
- Settings: `src/app/dashboard/settings/page.tsx`
