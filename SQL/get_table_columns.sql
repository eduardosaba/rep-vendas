-- Função RPC para listar colunas de uma tabela pública
create or replace function get_table_columns(t_name text)
returns table (column_name text)
language sql
security definer
as $$
  select column_name::text
  from information_schema.columns
  where table_name = t_name
    and table_schema = 'public'
  order by ordinal_position;
$$;

-- Uso (Exemplo): select * from get_table_columns('products');
