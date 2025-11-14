-- Script para obter o UUID correto do usuário
-- Execute APENAS esta consulta no SQL Editor do Supabase

SELECT
    id as user_id,
    email,
    created_at,
    email_confirmed_at
FROM auth.users
ORDER BY created_at DESC;

-- Copie o ID (user_id) da primeira linha e use no script mockup_data.sql
-- O ID deve ter 36 caracteres no formato: xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx