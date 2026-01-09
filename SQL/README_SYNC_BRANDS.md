# Correção: Função sync_brands

## 🔍 Problema

Erro ao tentar sincronizar marcas no Dashboard:

```
POST .../rest/v1/rpc/sync_brands 404 (Not Found)
Could not find the function public.sync_brands(current_user_id)
```

## ✅ Solução

### 1. Correção no Código TypeScript

O parâmetro foi corrigido de `current_user_id` para `p_user_id` em:

- [src/app/dashboard/brands/page.tsx](../src/app/dashboard/brands/page.tsx#L174-L176)

### 2. Criar a Função no Supabase

#### Opção A: Via Interface (Recomendado)

1. Acesse o **SQL Editor** do Supabase:

   ```
   https://supabase.com/dashboard/project/SEU_PROJETO/sql
   ```

2. Execute o script para visualizar o SQL:

   ```bash
   node scripts/show-sync-brands-sql.mjs
   ```

3. Copie e cole o SQL exibido no SQL Editor do Supabase

4. Clique em **Run** para executar

#### Opção B: Copiar Diretamente

Copie o conteúdo do arquivo:

- [SQL/create_sync_brands_function.sql](../SQL/create_sync_brands_function.sql)

E execute no SQL Editor do Supabase.

## 📋 O que a Função Faz

A função `sync_brands`:

1. Extrai todas as marcas únicas dos produtos do usuário
2. Insere automaticamente na tabela `brands`
3. Atualiza o campo `brand_id` nos produtos
4. Valida que apenas o usuário autenticado pode executá-la (RLS)

## 🎯 Uso

Após aplicar a função, vá para:

```
Dashboard > Marcas > Botão "Sincronizar do Catálogo"
```

A sincronização importará automaticamente todas as marcas únicas dos seus produtos.

## 🔐 Segurança

- A função usa `SECURITY DEFINER` para garantir permissões adequadas
- Valida que `p_user_id` corresponde ao usuário autenticado (`auth.uid()`)
- Apenas usuários autenticados podem executá-la (`GRANT ... TO authenticated`)
