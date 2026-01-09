# 🔍 DIAGNÓSTICO: Limite de 1000 Produtos

## Problema

Mesmo após importar 3500+ produtos, a listagem mostra apenas 1000.

## Causa Provável

O plano no banco de dados pode ter `product_limit` ou `max_products` configurado em 1000.

## ✅ SOLUÇÃO RÁPIDA

### 1️⃣ Executar SQL no Supabase

1. Acesse: **Supabase Dashboard → SQL Editor**
2. Execute o arquivo: `SQL/verificar_limite_produtos_debug.sql`
3. Veja os resultados e confirme se `product_limit` = 5000

### 2️⃣ Reiniciar Servidor (se estiver rodando dev)

Se estiver rodando `pnpm run dev`:

```bash
# Pare o servidor (Ctrl+C) e execute:
pnpm run dev
```

### 3️⃣ Recarregar Página com Cache Limpo

- **Chrome/Edge**: `Ctrl + Shift + R` ou `Ctrl + F5`
- **Firefox**: `Ctrl + Shift + R`

### 4️⃣ Verificar Console do Navegador

Abra o DevTools (F12) e veja os logs:

```
[ProductsPage] Limite do plano: 5000 Plano: teste
[ProductsPage] fetchLimit final: 5000
```

## 🔧 Se Ainda Não Funcionar

Execute este SQL direto no Supabase:

```sql
-- Atualizar plano para 5000
UPDATE plans
SET product_limit = 5000, max_products = 5000
WHERE name = 'teste' OR id = 'teste';

-- Verificar
SELECT * FROM plans WHERE name = 'teste';

-- Ver total de produtos
SELECT COUNT(*) FROM products WHERE user_id = auth.uid();
```

## 📊 Verificação Final

Após executar:

1. Recarregue a página `/dashboard/products`
2. Verifique o contador: "Gerencie seu catálogo (**X** itens)"
3. Role até o final da lista (paginação de 50 itens/página)
4. Deve mostrar todos os 3500+ produtos

## ⚠️ IMPORTANTE

- O código já está configurado para buscar até **5000 produtos**
- O fallback padrão agora é **5000** (não 1000)
- Se o plano tiver limite menor, ele respeita o limite do plano
- **Máximo absoluto**: 5000 produtos por query

---

**Dúvidas?** Verifique os logs do console do navegador (F12) para ver qual limite está sendo usado.
