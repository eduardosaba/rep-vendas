-- Script auxiliar para obter o user_id
-- Execute ESTE script PRIMEIRO para descobrir seu user_id

-- Consulta para listar todos os usuários
SELECT
    id,
    email,
    created_at,
    last_sign_in_at,
    email_confirmed_at
FROM auth.users
ORDER BY created_at DESC;

-- Se você tiver apenas um usuário, pode usar este comando para obter apenas o ID:
-- SELECT id FROM auth.users LIMIT 1;

-- Copie o ID do usuário desejado e use no script mockup_data.sql
-- Exemplo: se o ID for '550e8400-e29b-41d4-a716-446655440000'
-- Substitua 'USER_ID_AQUI' por '550e8400-e29b-41d4-a716-446655440000' no script mockup_data.sql