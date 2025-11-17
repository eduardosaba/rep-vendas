# Adicionar Colunas de Timestamp na Tabela Products

## Problema

O erro `column products.created_at does not exist` indica que a tabela `products` no Supabase não tem as colunas de timestamp necessárias para ordenação e auditoria.

## Scripts disponíveis:

### 1. `add_timestamp_columns_products.sql` (Básico)

Adiciona apenas as colunas `created_at` e `updated_at` faltantes.

### 2. `fix_products_table_complete.sql` (Completo) ⭐ **RECOMENDADO**

Script completo que:

- Adiciona todas as colunas faltantes (`reference_code`, `brand`, `created_at`, `updated_at`)
- Corrige o tipo de dados de `price` para `NUMERIC(10,2)`
- Configura triggers para `updated_at`
- Corrige políticas RLS (produtos públicos para visualização)
- Preenche dados existentes

## Como executar:

1. Abra o painel do Supabase do seu projeto
2. Vá para **"SQL Editor"** no menu lateral esquerdo
3. Clique em **"New Query"**
4. Copie e cole o conteúdo do arquivo `fix_products_table_complete.sql`
5. Clique em **"Run"** para executar o script

## O que o script completo faz:

### ✅ Verificações Iniciais:

- **Verifica estrutura atual** da tabela `products`
- **Mostra colunas existentes** antes das alterações

### ✅ Adição de Colunas:

- **Adiciona `reference_code`** (código de referência do produto)
- **Adiciona `brand`** (marca do produto)
- **Adiciona `created_at`** (data de criação)
- **Adiciona `updated_at`** (data de atualização)

### ✅ Correção de Tipos:

- **Garante que `price`** seja `NUMERIC(10,2)` e não nullable
- **Converte valores null** para 0 se necessário

### ✅ Configuração de Triggers:

- **Cria função `update_updated_at_column()`** se não existir
- **Cria trigger `update_products_updated_at`** para atualização automática

### ✅ Correção de Políticas RLS:

- **Remove políticas incorretas** (se existirem)
- **Cria política pública** para visualização (catálogo)
- **Mantém controle** para inserção/edição/exclusão (apenas proprietário)

### ✅ Atualização de Dados:

- **Preenche `created_at`** com `NOW()` para registros existentes
- **Mantém dados existentes** intactos

### ✅ Verificações Finais:

- **Confirma estrutura final** da tabela
- **Verifica políticas RLS** aplicadas
- **Conta total de produtos**
- **Mostra exemplo** de produtos com novas colunas

## Estrutura Final da Tabela:

```sql
id UUID PRIMARY KEY
reference_code TEXT
name TEXT NOT NULL
description TEXT
brand TEXT
price NUMERIC(10,2) NOT NULL
image_url TEXT
user_id UUID NOT NULL
created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
```

## Próximos passos:

1. Execute o script `fix_products_table_complete.sql` no Supabase
2. Teste o catálogo - o erro de `created_at` deve ser resolvido
3. Verifique se a paginação e ordenação funcionam corretamente
4. Teste filtros por marca e outras funcionalidades

## Scripts relacionados:

- `database_schema.sql` - Schema completo do banco
- `add_bestseller_field.sql` - Adiciona campo bestseller
- `add_filter_settings.sql` - Adiciona configurações de filtros
- `mockup_data.sql` - Dados de exemplo</content>
  <parameter name="filePath">A:\RepVendas\SQL\README_add_timestamp_columns.md
