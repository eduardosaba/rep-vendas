# Guia para Inserir Dados de Teste (Mockup)

## Problema Atual Resolvido
O script foi atualizado para resolver o erro:
```
ERROR: 22P02: invalid input syntax for type uuid: "e7ea2fc-afd4-4310-a080-266fca8186a7"
```

**Causa**: O UUID fornecido não tem 36 caracteres (formato correto: xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx)

## Processo Passo a Passo

### ✅ **PASSO 1: Obter o UUID Correto**
**Execute primeiro o script auxiliar:**
- Abra `SQL/get_correct_user_id.sql`
- Copie e execute no SQL Editor do Supabase
- **Anote o ID completo** (deve ter 36 caracteres)

### ✅ **PASSO 2: Configurar o Script Principal**
**Edite o script mockup_data.sql:**
- Abra `SQL/mockup_data.sql`
- **Substitua** o UUID na linha 13 pelo ID correto copiado
- Exemplo: `my_user_id := '550e8400-e29b-41d4-a716-446655440000';`

### ✅ **PASSO 3: Executar o Script**
**Execute o script configurado:**
- Certifique-se de que as políticas RLS estão aplicadas
- Execute todo o conteúdo do `mockup_data.sql`
- O script irá validar o user_id antes de inserir os dados

## O que o Script Insere

### 📦 Produtos (32 produtos)
- **Samsung**: TVs, smartphones, eletrodomésticos
- **Apple**: iPhones, MacBooks, iPads, AirPods
- **LG**: TVs OLED, geladeiras, lavadoras, ar-condicionados
- **Sony**: TVs, PlayStation, fones, câmeras
- **Dell**: Notebooks, monitores, periféricos
- **Nike**: Tênis, roupas, acessórios
- **Adidas**: Tênis, roupas, mochilas
- **Electrolux**: Eletrodomésticos, aspiradores

### 👥 Clientes (5 clientes)
Clientes de teste com dados fictícios para demonstração.

### 📋 Pedidos (3 pedidos)
- Pedidos completos e pendentes
- Diferentes tipos: catálogo completo e pedido rápido por marca

## Validações Implementadas

O script agora inclui validações para:
- ✅ Verificar se o user_id foi configurado (não é mais "USER_ID_AQUI")
- ✅ Confirmar se o usuário existe na tabela auth.users
- ✅ Mostrar mensagem de sucesso com contagem de produtos inseridos

## Exemplo de Execução

```sql
-- 1. Primeiro execute get_correct_user_id.sql
SELECT id as user_id, email FROM auth.users ORDER BY created_at DESC;

-- 2. Copie o ID completo (36 caracteres), ex:
-- '550e8400-e29b-41d4-a716-446655440000'

-- 3. Edite mockup_data.sql e substitua:
my_user_id := '550e8400-e29b-41d4-a716-446655440000';

-- 4. Execute o script completo
```

## Resultado Esperado

Após execução bem-sucedida, você verá:
```
NOTICE:  Dados de teste inseridos com sucesso! Total de produtos: 32
```

## Troubleshooting

- **"UUID inválido"**: O UUID fornecido não tem 36 caracteres. Execute `get_correct_user_id.sql` novamente
- **"Usuário não encontrado"**: Verifique se copiou o ID correto da tabela auth.users
- **Erro de permissões**: Certifique-se de que aplicou as políticas RLS corretamente
- **Dados duplicados**: O script não verifica duplicatas, execute apenas uma vez

---

**Última atualização**: 13 de novembro de 2025