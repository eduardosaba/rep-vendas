-- Atualiza o profile específico para role = 'admin_company'
-- Executar com usuário/sessão com privilégios (psql com SERVICE_ROLE ou superuser)

BEGIN;

-- verificação prévia
SELECT id, email, role FROM public.profiles WHERE id = '919773de-f981-4892-b3d1-e1e63506b739';

-- atualização
UPDATE public.profiles
SET role = 'admin_company'
WHERE id = '919773de-f981-4892-b3d1-e1e63506b739';

-- verificação pós
SELECT id, email, role FROM public.profiles WHERE id = '919773de-f981-4892-b3d1-e1e63506b739';

COMMIT;

-- Nota: se houver CHECK/trigger adicional em outro schema, aplique como superuser.