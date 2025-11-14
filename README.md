# Rep-Vendas

Sistema SaaS para catálogo virtual e dashboard de vendas.

## Funcionalidades

- **Dashboard Administrativo**: Gerencie pedidos, analise vendas e acesse dados de clientes.
- **Catálogo Virtual**: Página pública para clientes visualizarem produtos.
- **Autenticação**: Login seguro com Supabase Auth.
- **Análise de Vendas**: Gráficos e estatísticas.

## Tecnologias

- Next.js
- Supabase (Auth, DB, Storage)
- Tailwind CSS
- Recharts
- Lucide React

## Instalação

1. Clone o repositório.
2. Instale dependências: `pnpm install`
3. Configure variáveis de ambiente no `.env.local`:
   ```
   NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
   NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
   ```
4. Execute o SQL em `SQL/supabase_schema.sql` no Supabase para criar tabelas.
5. Execute: `pnpm dev`

## Estrutura do Banco de Dados

As tabelas são criadas via SQL em `SQL/supabase_schema.sql`:
- clients, products, orders, order_items, settings

## Como Usar

- **Catálogo Público**: Acesse `/` para ver produtos.
- **Login**: Vá para `/login` e entre com suas credenciais.
- **Dashboard**: Após login, acesse `/dashboard` para gerenciar vendas.
- **Configurações**: `/dashboard/settings` para customizar aparência.

## Desenvolvimento

Para recriar tabelas, use `SQL/drop_tables.sql` primeiro.

Insira dados de teste via Supabase Dashboard > Table Editor.