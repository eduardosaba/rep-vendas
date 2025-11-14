-- SQL para dropar tabelas existentes e recriar (use com cuidado em produção)

DROP TABLE IF EXISTS order_items CASCADE;
DROP TABLE IF EXISTS orders CASCADE;
DROP TABLE IF EXISTS products CASCADE;
DROP TABLE IF EXISTS clients CASCADE;
DROP TABLE IF EXISTS settings CASCADE;

-- Agora execute o supabase_schema.sql novamente