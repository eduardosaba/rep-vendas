# Adicionar Campo Bestseller aos Produtos

## Como executar:

1. Abra o painel do Supabase do seu projeto
2. Vá para **"SQL Editor"** no menu lateral esquerdo
3. Clique em **"New Query"**
4. Copie e cole o conteúdo do arquivo `add_bestseller_field.sql`
5. Clique em **"Run"** para executar o script

## O que o script faz:

### ✅ Verificações Iniciais:
- **Verifica se a tabela `products` existe** no banco de dados
- **Verifica se a coluna `bestseller` já existe** na tabela

### ✅ Adição da Coluna:
- **Adiciona a coluna `bestseller`** do tipo BOOLEAN com valor padrão `false`
- **Usa `IF NOT EXISTS`** para evitar erros se a coluna já existir

### ✅ Verificações Finais:
- **Confirma que a coluna foi adicionada** corretamente
- **Mostra produtos marcados como bestseller** (inicialmente nenhum)

## Estrutura da nova coluna:

```sql
bestseller BOOLEAN DEFAULT false
```

- **Tipo**: BOOLEAN (verdadeiro/falso)
- **Padrão**: false (todos os produtos começam como não-bestseller)
- **Opcional**: Pode ser null, mas tem valor padrão

## Como marcar produtos como bestseller:

Após executar o script, você pode marcar produtos específicos como bestseller:

```sql
-- Marcar produtos específicos como bestseller
UPDATE products SET bestseller = true WHERE id = 'id-do-produto';

-- Ou marcar vários produtos de uma vez
UPDATE products SET bestseller = true WHERE id IN ('id1', 'id2', 'id3');

-- Ver todos os produtos bestseller
SELECT id, name, brand, bestseller FROM products WHERE bestseller = true;
```

## Próximos passos:

1. Execute o script SQL no Supabase
2. Marque alguns produtos como bestseller (opcional)
3. Teste o catálogo para ver os badges amarelos nos produtos bestseller
4. Configure as opções de frete/parcelamento nas configurações