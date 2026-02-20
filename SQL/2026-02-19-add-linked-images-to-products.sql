-- Migration: adiciona coluna linked_images na tabela products
-- Tipo: text[] para armazenar URLs vinculadas externamente
ALTER TABLE products
  ADD COLUMN IF NOT EXISTS linked_images text[] DEFAULT ARRAY[]::text[];

-- Nota: após aplicar a migration, é recomendado executar revalidação do catálogo
-- para que páginas públicas reflitam imagens recém-vinculadas.
