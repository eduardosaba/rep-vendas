# Correção das Políticas de Storage - Atualizado

## Problema Resolvido

O script `storage_policies.sql` foi atualizado para resolver o erro:

```
ERROR: 42710: policy "Anyone can view logos" for table "objects" already exists
```

## Solução Implementada

O script agora usa um bloco PL/pgSQL que **remove dinamicamente todas as políticas existentes** antes de recriar as novas políticas corretas.

## Como Executar

1. **Acesse o SQL Editor do Supabase**
   - Vá para seu projeto Supabase
   - Navegue para SQL Editor

2. **Execute o script atualizado**
   - Abra o arquivo `SQL/storage_policies.sql`
   - Copie e cole todo o conteúdo no SQL Editor
   - Clique em "Run" para executar

3. **Verifique o resultado**
   - O script irá mostrar uma lista de políticas removidas (se houver)
   - No final, mostrará todas as políticas criadas

## O que o Script Faz

### 1. Verificação de Buckets

```sql
SELECT id, name, public FROM storage.buckets;
```

Verifica se os buckets necessários existem.

### 2. Remoção Dinâmica de Políticas

```sql
DO $$
DECLARE
    policy_record RECORD;
BEGIN
    FOR policy_record IN
        SELECT policyname
        FROM pg_policies
        WHERE schemaname = 'storage' AND tablename = 'objects'
    LOOP
        EXECUTE 'DROP POLICY IF EXISTS "' || policy_record.policyname || '" ON storage.objects';
        RAISE NOTICE 'Dropped policy: %', policy_record.policyname;
    END LOOP;
END $$;
```

Remove TODAS as políticas existentes de storage.objects automaticamente.

### 3. Criação das Políticas Corretas

Cria as políticas necessárias para cada bucket:

- **logos**: Upload para usuários autenticados, visualização pública
- **banner**: Upload para usuários autenticados, visualização pública
- **produtos**: Upload para usuários autenticados, visualização pública
- **marcas**: Upload para usuários autenticados, visualização pública

### 4. Verificação

```sql
SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual, with_check
FROM pg_policies
WHERE schemaname = 'storage'
ORDER BY tablename, policyname;
```

Mostra todas as políticas criadas para confirmação.

## Próximos Passos

Após executar este script com sucesso:

1. **Execute o script de dados mockup** (opcional para testes)

   ```sql
   -- Execute SQL/mockup_data.sql
   ```

2. **Teste o upload de imagens**
   - Acesse `/settings` no dashboard
   - Teste o upload de logos, banners e imagens de produtos

3. **Verifique o catálogo público**
   - Acesse `/` (página inicial)
   - Verifique se as imagens estão sendo exibidas corretamente

## Troubleshooting

- **Se ainda houver erros**: Verifique se você tem permissões administrativas no Supabase
- **Buckets não existem**: Execute primeiro a criação dos buckets (comentada no script)
- **Problemas de autenticação**: Certifique-se de que as políticas RLS das tabelas estão corretas

---

**Última atualização**: 13 de novembro de 2025</content>
<parameter name="filePath">a:\RepVendas\README_STORAGE_FIX.md
