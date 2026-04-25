-- SQL seguro para sincronizar public_catalogs a partir de settings
-- Instruções:
-- 1) Primeiro execute a seção de PREVIEW (SELECT) para verificar quais linhas serão afetadas.
-- 2) Se o resultado estiver correto, execute a transação inteira (UPDATE dentro do BEGIN/COMMIT).
-- 3) Opcional: crie um backup antes de rodar em produção.

BEGIN;

-- PREVIEW: mostra as linhas que serão atualizadas e as diferenças
SELECT
  pc.user_id,
  s.slug AS slug,
  pc.primary_color AS pc_primary_color,
  COALESCE(s.primary_color, s.custom_primary_color) AS new_primary_color,
  pc.logo_url AS pc_logo_url,
  COALESCE(s.logo_url, s.custom_logo_url) AS new_logo_url,
  pc.top_benefit_text AS pc_top_benefit_text,
  s.top_benefit_text AS new_top_benefit_text,
  pc.top_benefit_bg_color AS pc_top_benefit_bg_color,
  s.top_benefit_bg_color AS new_top_benefit_bg_color,
  pc.top_benefit_text_color AS pc_top_benefit_text_color,
  s.top_benefit_text_color AS new_top_benefit_text_color,
  pc.show_top_benefit_bar AS pc_show_top_benefit_bar,
  s.show_top_benefit_bar AS new_show_top_benefit_bar,
  pc.show_sale_price AS pc_show_sale_price,
  s.show_sale_price AS new_show_sale_price,
  pc.show_cost_price AS pc_show_cost_price,
  s.show_cost_price AS new_show_cost_price,
  pc.price_unlock_mode AS pc_price_unlock_mode,
  s.price_unlock_mode AS new_price_unlock_mode
FROM public.public_catalogs pc
JOIN public.settings s ON pc.user_id = s.user_id
WHERE (
  pc.primary_color IS DISTINCT FROM COALESCE(s.primary_color, s.custom_primary_color)
  OR pc.logo_url IS DISTINCT FROM COALESCE(s.logo_url, s.custom_logo_url)
  OR pc.top_benefit_text IS DISTINCT FROM s.top_benefit_text
  OR pc.top_benefit_bg_color IS DISTINCT FROM s.top_benefit_bg_color
  OR pc.top_benefit_text_color IS DISTINCT FROM s.top_benefit_text_color
  OR pc.show_top_benefit_bar IS DISTINCT FROM s.show_top_benefit_bar
  OR pc.show_sale_price IS DISTINCT FROM s.show_sale_price
  OR pc.show_cost_price IS DISTINCT FROM s.show_cost_price
  OR pc.price_unlock_mode IS DISTINCT FROM s.price_unlock_mode
);

-- Opcional: criar backup (descomente se quiser)
-- CREATE TABLE public.backup_public_catalogs_before_sync AS
-- SELECT * FROM public.public_catalogs pc
-- WHERE EXISTS (
--   SELECT 1 FROM public.settings s WHERE s.user_id = pc.user_id
-- );

-- UPDATE massivo: atualiza apenas quando há diferença
UPDATE public.public_catalogs pc
SET
  primary_color = COALESCE(s.primary_color, s.custom_primary_color, pc.primary_color),
  logo_url = COALESCE(s.logo_url, s.custom_logo_url, pc.logo_url),
  show_top_benefit_bar = s.show_top_benefit_bar,
  top_benefit_text = s.top_benefit_text,
  top_benefit_bg_color = s.top_benefit_bg_color,
  top_benefit_text_color = s.top_benefit_text_color,
  show_sale_price = s.show_sale_price,
  show_cost_price = s.show_cost_price,
  price_unlock_mode = s.price_unlock_mode,
  updated_at = now()
FROM public.settings s
WHERE pc.user_id = s.user_id
  AND (
    pc.primary_color IS DISTINCT FROM COALESCE(s.primary_color, s.custom_primary_color)
    OR pc.logo_url IS DISTINCT FROM COALESCE(s.logo_url, s.custom_logo_url)
    OR pc.top_benefit_text IS DISTINCT FROM s.top_benefit_text
    OR pc.top_benefit_bg_color IS DISTINCT FROM s.top_benefit_bg_color
    OR pc.top_benefit_text_color IS DISTINCT FROM s.top_benefit_text_color
    OR pc.show_top_benefit_bar IS DISTINCT FROM s.show_top_benefit_bar
    OR pc.show_sale_price IS DISTINCT FROM s.show_sale_price
    OR pc.show_cost_price IS DISTINCT FROM s.show_cost_price
    OR pc.price_unlock_mode IS DISTINCT FROM s.price_unlock_mode
  );

COMMIT;

-- Nota: execute o PREVIEW (SELECT) e revise antes de rodar o UPDATE.
-- Para rodar apenas para um usuário/slug específico, adicione por exemplo:
--   AND s.user_id = 'uuid-aqui'
-- ou
--   AND pc.slug = 'meu-catalogo-slug'
