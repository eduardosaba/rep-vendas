# Correção de Problemas RLS (Row Level Security)

## 🚨 PROBLEMA ATUAL

Você está vendo estes erros:
- `406 (Not Acceptable)` - Políticas RLS rejeitando queries
- `409 (Conflict)` - Conflito de chave única na tabela settings
- `favicon.ico 404` - Favicon não encontrado

## ✅ SOLUÇÃO COMPLETA (escolha o script correto)

### **Se as tabelas AINDA NÃO existem:**
Execute `SQL/supabase_schema.sql` (cria tabelas + políticas)

### **Se as tabelas JÁ existem (erro "relation already exists"):**
Execute `SQL/apply_rls_only.sql` (apenas políticas RLS)

### **Passo 2: Executar Correção Storage**
1. Ainda no **SQL Editor**
2. **Copie e execute TODO** o conteúdo de `SQL/storage_policies.sql`

### **Passo 3: Verificar Configuração**
1. **Execute** o conteúdo de `SQL/verify_rls_setup.sql`
2. **Verifique** se todos os valores estão corretos

## 📊 RESULTADO ESPERADO

Após executar os scripts, você deve ver:
```
schemaname | tablename  | rls_enabled | total_policies
public      | clients    | t           | 4
public      | products   | t           | 4
public      | orders     | t           | 4
public      | order_items| t           | 4
public      | settings   | t           | 4
```

## 🔧 CORREÇÕES ADICIONAIS APLICADAS

### 1. **Código Ajustado**
- Modificado `settings/page.tsx` para usar UPDATE ao invés de UPSERT
- Evita conflitos de chave única

### 2. **Favicon Criado**
- Criado `public/favicon.svg` 
- Atualizado `layout.tsx` para usar o favicon

## 🐛 DEBUG

### Console do Navegador:
```javascript
// Verificar autenticação
const { data } = await supabase.auth.getUser()
console.log('User:', data.user?.id)

// Testar settings
const { data: settings, error } = await supabase
  .from('settings')
  .select('*')
  .eq('user_id', data.user?.id)
console.log('Settings:', settings, 'Error:', error)
```

## 📋 SCRIPTS DISPONÍVEIS

1. **`SQL/supabase_schema.sql`** - Cria tabelas + políticas (se tabelas não existem)
2. **`SQL/apply_rls_only.sql`** - Apenas políticas RLS (se tabelas já existem)
3. **`SQL/storage_policies.sql`** - Políticas de storage buckets
4. **`SQL/verify_rls_setup.sql`** - Verifica se tudo está correto
5. **`SQL/mockup_data.sql`** - Insere dados de teste
6. **`SQL/cleanup_mockup.sql`** - Remove dados de teste

## ✅ APÓS CORREÇÃO

1. **Reinicie** a aplicação
2. **Faça login** novamente
3. **Teste**:
   - ✅ Salvar configurações (sem erro 409)
   - ✅ Upload de imagens (sem erro 400)
   - ✅ Acessar dashboard (sem erro 406)
   - ✅ Favicon carregado (sem erro 404)

---

**IMPORTANTE**: Execute os scripts SQL **nesta ordem**:
1. `SQL/supabase_schema.sql` OU `SQL/apply_rls_only.sql` (dependendo se tabelas existem)
2. `SQL/storage_policies.sql` (políticas de storage)
3. `SQL/verify_rls_setup.sql` (verificação)

## 📦 DADOS DE TESTE

### Inserir Dados de Teste
Execute `SQL/mockup_data.sql` para popular o banco com:
- **32 produtos** de 8 marcas diferentes (Samsung, Apple, LG, Sony, Dell, Nike, Adidas, Electrolux)
- **5 clientes** de teste
- **3 pedidos** de exemplo

### Limpar Dados de Teste
Se precisar limpar: `SQL/cleanup_mockup.sql`

### Marcas Incluídas:
- **Eletrônicos**: Samsung, Apple, LG, Sony, Dell
- **Esportes**: Nike, Adidas
- **Eletrodomésticos**: Electrolux

### Categorias (via marcas):
- TVs e Monitores
- Smartphones
- Notebooks
- Eletrodomésticos
- Roupas e Acessórios Esportivos
- Eletrônicos de Consumo

### Como Usar:
1. Execute os scripts RLS primeiro
2. Obtenha o `user_id`: `SELECT id FROM auth.users WHERE email = 'seu@email.com';`
3. Substitua `USER_ID_AQUI` no arquivo `mockup_data.sql`
4. Execute o script de dados de teste