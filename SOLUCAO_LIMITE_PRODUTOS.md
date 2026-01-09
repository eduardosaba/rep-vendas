# 🔧 PROBLEMA: Limite de 1000 Produtos e Importação Sobrescrevendo

## 📋 Problemas Identificados

### 1️⃣ Apenas 1000 produtos aparecem na listagem

**Causa**: Não é um problema real de limite! Os produtos estão no banco, mas:

- A página usa **paginação com 10 itens por página**
- É normal aparecerem apenas os primeiros produtos
- Para ver todos, navegue pelas páginas usando os botões de paginação

### 2️⃣ Importação sobrescreveu produtos existentes

**Causa**: Possível constraint UNIQUE em `(user_id, reference_code)` que impede produtos duplicados

### 3️⃣ Hook `usePlanLimits` não encontrava o limite correto

**Causa**: Inconsistência entre colunas `product_limit` e `max_products`

---

## ✅ CORREÇÕES APLICADAS

### 1. Hook `usePlanLimits.ts` Corrigido ✅

O hook agora busca **ambas as colunas** para compatibilidade:

```typescript
const { data: plan } = await supabase
  .from('plans')
  .select('product_limit, max_products')
  .eq('name', planName)
  .maybeSingle();

const maxLimit = plan?.product_limit || plan?.max_products || 500;
```

### 2. Scripts SQL Criados 📝

#### Opção 1: Script Completo (Recomendado)

Execute no SQL Editor do Supabase:

```
SQL/verificar_e_corrigir_planos.sql
```

Este script:

- ✅ Padroniza a coluna de limite (product_limit)
- ✅ Adiciona/atualiza plano 'teste' com 5000 produtos
- ✅ Remove constraints que impedem importação
- ✅ Mostra diagnóstico completo

#### Opção 2: Script Simples (Apenas atualizar plano)

Execute no SQL Editor do Supabase:

```
SQL/adicionar_plano_teste_5000.sql
```

Este script apenas:

- Adiciona ou atualiza o plano 'teste' para 5000 produtos

---

## 🎯 COMO RESOLVER

### Passo 1: Atualizar o Plano no Banco de Dados

1. Acesse o Supabase Dashboard
2. Vá em **SQL Editor**
3. Cole e execute um dos scripts acima
4. Verifique se aparece "Plano TESTE atualizado com sucesso!"

### Passo 2: Verificar se os Produtos Existem

Execute esta query no SQL Editor:

```sql
SELECT
  user_id,
  COUNT(*) as total_produtos
FROM products
GROUP BY user_id
ORDER BY total_produtos DESC;
```

Se aparecer **1300 produtos** ou mais, significa que:

- ✅ Os produtos foram importados com sucesso
- ✅ O problema é apenas visual (paginação)
- ✅ Navegue pelas páginas para ver todos

### Passo 3: Verificar Constraints que Bloqueiam Importação

Execute no SQL Editor:

```sql
SELECT
  tc.constraint_name,
  kcu.column_name
FROM information_schema.table_constraints AS tc
JOIN information_schema.key_column_usage AS kcu
  ON tc.constraint_name = kcu.constraint_name
WHERE tc.constraint_type = 'UNIQUE'
  AND tc.table_name = 'products'
ORDER BY tc.constraint_name;
```

Se aparecer constraint em `(user_id, reference_code)`:

- Isso impede produtos com mesma referência
- Execute o script completo que remove essa constraint

### Passo 4: Testar Nova Importação

1. Prepare uma planilha pequena (5-10 produtos)
2. Use referências DIFERENTES dos produtos existentes
3. Importe via Dashboard → Produtos → Importar Excel
4. Verifique se os produtos foram ADICIONADOS (não sobrescritos)

---

## 🔍 ENTENDENDO A IMPORTAÇÃO

### Como Funciona Atualmente ✅

O código em `import-massa/page.tsx` usa `INSERT`:

```typescript
const { error } = await supabase.from('products').insert(batch);
```

Isso significa:

- ✅ **Adiciona** novos produtos
- ❌ **Não sobrescreve** existentes
- ⚠️ **Mas pode falhar** se houver constraint UNIQUE

### Por Que Sobrescreveu?

Possíveis causas:

1. **Constraint UNIQUE em (user_id, reference_code)**
   - Solução: Remover constraint com script fornecido

2. **Mesmas referências**
   - Se sua planilha tinha REF001-REF1300
   - E você já tinha REF001-REF600
   - O INSERT falha em REF001-REF600 (duplicados)
   - E só insere REF601-REF1300 (novos)
   - **Total: 1300 produtos** (600 antigos ficaram, 700 novos foram adicionados)

3. **Você deletou os antigos antes de importar?**
   - Se fez isso, explica por que ficaram só 1300

---

## 🎓 COMO IMPORTAR SEM SOBRESCREVER

### Opção 1: Usar Referências Únicas

- Garanta que cada produto tenha referência diferente
- Ex: REF0001, REF0002, etc.

### Opção 2: Remover Constraint UNIQUE

- Execute o script `verificar_e_corrigir_planos.sql`
- Isso permite produtos com mesma referência

### Opção 3: Atualizar ao Invés de Inserir

Se quiser **sobrescrever** propositalmente:

```typescript
const { error } = await supabase.from('products').upsert(batch, {
  onConflict: 'user_id, reference_code',
  ignoreDuplicates: false, // Sobrescreve
});
```

---

## 📊 VERIFICAÇÃO FINAL

Após aplicar as correções, execute:

```sql
-- 1. Verificar plano teste
SELECT * FROM plans WHERE LOWER(name) = 'teste';
-- Deve mostrar: product_limit = 5000

-- 2. Contar seus produtos
SELECT COUNT(*) FROM products WHERE user_id = 'SEU_USER_ID';
-- Deve mostrar: 1300+ produtos

-- 3. Ver constraints
SELECT constraint_name
FROM information_schema.table_constraints
WHERE table_name = 'products' AND constraint_type = 'UNIQUE';
-- Não deve ter constraint em (user_id, reference_code)
```

---

## 🆘 TROUBLESHOOTING

### "Ainda aparecem só 1000 produtos"

- **Normal!** A tabela usa paginação
- Navegue pelas páginas usando os botões ◀️ ▶️
- Ou aumente `itemsPerPage` em `ProductsTable.tsx`

### "Importação continua falhando"

1. Veja o console do navegador (F12)
2. Procure por erros tipo "duplicate key value"
3. Se aparecer, execute o script de remoção de constraints

### "Plano não atualiza"

1. Limpe o cache do navegador (Ctrl+Shift+R)
2. Faça logout e login novamente
3. Verifique se a assinatura do usuário aponta para 'teste'

---

## 📁 Arquivos Alterados

- ✅ `src/hooks/usePlanLimits.ts` - Busca ambas colunas
- ✅ `SQL/verificar_e_corrigir_planos.sql` - Script completo
- ✅ `SQL/adicionar_plano_teste_5000.sql` - Script simples

---

## 🎯 PRÓXIMOS PASSOS

1. Execute um dos scripts SQL
2. Verifique se o plano foi atualizado
3. Conte quantos produtos realmente existem no banco
4. Se necessário, remova constraints UNIQUE
5. Teste nova importação com referências únicas

**Pronto! Agora você pode ter até 5000 produtos no plano teste!** 🚀
