# Correção: Funções de Sincronização (Marcas e Categorias)

## 🔍 Problemas Identificados

### 1. sync_brands

```
POST .../rest/v1/rpc/sync_brands 404 (Not Found)
Could not find the function public.sync_brands(current_user_id)
```

### 2. sync_categories

```
POST .../rest/v1/rpc/sync_categories 400 (Bad Request)
column "user_id" is of type uuid but expression is of type text
```

## ✅ Soluções Aplicadas

### Correções no Código TypeScript

1. **Marcas** - [src/app/dashboard/brands/page.tsx](../src/app/dashboard/brands/page.tsx#L159-L161)
   - Alterado de `current_user_id` para `p_user_id`

2. **Categorias** - [src/app/dashboard/categories/page.tsx](../src/app/dashboard/categories/page.tsx#L159-L161)
   - Alterado de `current_user_id` para `p_user_id`

### Funções SQL Criadas

✅ [SQL/create_sync_brands_function.sql](../SQL/create_sync_brands_function.sql) - Sincroniza marcas dos produtos  
✅ [SQL/create_sync_categories_function.sql](../SQL/create_sync_categories_function.sql) - Sincroniza categorias dos produtos

## 📋 Como Aplicar no Supabase

### Método 1: Script Automatizado (Recomendado)

```bash
node scripts/show-sync-functions.mjs
```

Isso exibirá **ambas** as funções SQL. Copie tudo e execute no SQL Editor do Supabase.

### Método 2: Manual

1. Acesse o SQL Editor: https://supabase.com/dashboard/project/SEU_PROJETO/sql
2. Copie o conteúdo de:
   - [SQL/create_sync_brands_function.sql](../SQL/create_sync_brands_function.sql)
   - [SQL/create_sync_categories_function.sql](../SQL/create_sync_categories_function.sql)
3. Cole e execute no SQL Editor

## 🎯 Funcionalidades

### sync_brands(p_user_id UUID)

- Extrai marcas únicas dos produtos
- Insere automaticamente na tabela `brands`
- Atualiza `brand_id` nos produtos
- Validação de segurança (RLS)

### sync_categories(p_user_id UUID)

- Extrai categorias únicas dos produtos
- Insere automaticamente na tabela `categories`
- Atualiza `category_id` nos produtos
- Validação de segurança (RLS)

## 🔐 Segurança

Ambas as funções:

- Usam `SECURITY DEFINER` para permissões adequadas
- Validam que `p_user_id` corresponde ao usuário autenticado (`auth.uid()`)
- Apenas usuários autenticados podem executá-las
- Isolamento multi-tenant garantido (cada usuário vê apenas seus dados)

## 📍 Uso no Sistema

Após aplicar as funções:

**Marcas:**

```
Dashboard > Marcas > Botão "Sincronizar do Catálogo"
```

**Categorias:**

```
Dashboard > Categorias > Botão "Sincronizar do Catálogo"
```

Ambas sincronizarão automaticamente os dados únicos dos seus produtos.
