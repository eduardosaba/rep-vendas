-- Sincroniza registros de `settings` para `public_catalogs`.
-- Uso: rodar este script com permissões de administrador (service role) ou via psql conectado ao banco apropriado.

DO $$
DECLARE
  settings_cols TEXT[] := ARRAY(SELECT column_name FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'settings');
  mapping RECORD;
  update_parts TEXT[] := ARRAY[]::TEXT[];
  insert_cols TEXT[] := ARRAY['user_id','slug','store_name'];
  insert_exprs TEXT[] := ARRAY['s.user_id','s.catalog_slug','COALESCE(s.name, ''Loja'')'];
  sql TEXT;
BEGIN
  -- Lista de mapeamentos: settings_col, public_catalogs_col, default_expression
  FOR mapping IN SELECT * FROM (VALUES
    ('catalog_slug','slug', 's.catalog_slug'),
    ('name','store_name', 'COALESCE(s.name, ''Loja'')'),
    ('logo_url','logo_url', 's.logo_url'),
    ('primary_color','primary_color', '''#b9722e'''),
    ('secondary_color','secondary_color', '''#0d1b2c'''),
    ('header_background_color','header_background_color', '''#ffffff'''),
    ('show_sale_price','show_sale_price', 'COALESCE(s.show_sale_price, true)'),
    ('show_cost_price','show_cost_price', 'COALESCE(s.show_cost_price, false)'),
    ('enable_stock_management','enable_stock_management', 'COALESCE(s.enable_stock_management, false)'),
    ('show_installments','show_installments', 'COALESCE(s.show_installments, false)'),
    ('max_installments','max_installments', 'COALESCE(s.max_installments, 1)'),
    ('show_cash_discount','show_cash_discount', 'COALESCE(s.show_cash_discount, false)'),
    ('cash_price_discount_percent','cash_price_discount_percent', 'COALESCE(s.cash_price_discount_percent, 0)'),
    ('footer_message','footer_message', 's.footer_message'),
    ('is_active','is_active', 'COALESCE(s.is_active, true)'),
    ('price_password_hash','price_password_hash', 's.price_password_hash'),
    ('banners','banners', 's.banners'),
    ('banners_mobile','banners_mobile', 's.banners_mobile'),
    ('top_benefit_image_url','top_benefit_image_url', 's.top_benefit_image_url'),
    ('top_benefit_image_fit','top_benefit_image_fit', 's.top_benefit_image_fit'),
    ('top_benefit_image_scale','top_benefit_image_scale', 's.top_benefit_image_scale'),
    ('top_benefit_height','top_benefit_height', 's.top_benefit_height'),
    ('top_benefit_text_size','top_benefit_text_size', 's.top_benefit_text_size'),
    ('top_benefit_bg_color','top_benefit_bg_color', 's.top_benefit_bg_color'),
    ('top_benefit_text_color','top_benefit_text_color', 's.top_benefit_text_color'),
    ('top_benefit_text','top_benefit_text', 's.top_benefit_text'),
    ('show_top_benefit_bar','show_top_benefit_bar', 'COALESCE(s.show_top_benefit_bar, false)'),
    ('show_top_info_bar','show_top_info_bar', 'COALESCE(s.show_top_info_bar, true)'),
    ('font_family','font_family', 's.font_family'),
    ('font_url','font_url', 's.font_url'),
    ('share_banner_url','share_banner_url', 's.share_banner_url'),
    ('og_image_url','og_image_url', 's.og_image_url')
  ) AS t(settings_col, pc_col, def) LOOP
    -- If settings contains this column, add to update parts and to insert lists using s.<col>
    IF mapping.settings_col = 'catalog_slug' OR mapping.settings_col = 'name' OR mapping.settings_col = 'logo_url' OR mapping.settings_col = 'price_password_hash' OR mapping.settings_col = 'banners' OR mapping.settings_col = 'banners_mobile' OR mapping.settings_col = 'top_benefit_image_url' OR mapping.settings_col = 'top_benefit_image_fit' OR mapping.settings_col = 'top_benefit_image_scale' OR mapping.settings_col = 'top_benefit_height' OR mapping.settings_col = 'top_benefit_text_size' OR mapping.settings_col = 'top_benefit_bg_color' OR mapping.settings_col = 'top_benefit_text_color' OR mapping.settings_col = 'top_benefit_text' OR mapping.settings_col = 'font_family' OR mapping.settings_col = 'font_url' OR mapping.settings_col = 'share_banner_url' OR mapping.settings_col = 'og_image_url' THEN
      -- these columns are safe to reference if missing; still check existence
      IF mapping.settings_col = ANY(settings_cols) THEN
        update_parts := array_append(update_parts, mapping.pc_col || ' = ' || mapping.def);
        -- add to insert lists
        insert_cols := array_append(insert_cols, mapping.pc_col);
        insert_exprs := array_append(insert_exprs, mapping.def);
      ELSE
        -- use default in insert if missing
        update_parts := array_append(update_parts, mapping.pc_col || ' = ' || 'COALESCE(NULL, ' || mapping.pc_col || ')');
        insert_cols := array_append(insert_cols, mapping.pc_col);
        insert_exprs := array_append(insert_exprs, mapping.def);
      END IF;
    ELSE
      -- For other columns where we want COALESCE(s.col, pc.col) semantics
      IF mapping.settings_col = ANY(settings_cols) THEN
        update_parts := array_append(update_parts, mapping.pc_col || ' = COALESCE(s.' || mapping.settings_col || ', pc.' || mapping.pc_col || ')');
        insert_cols := array_append(insert_cols, mapping.pc_col);
        insert_exprs := array_append(insert_exprs, mapping.def);
      ELSE
        -- Use pc existing value for update (no-op) and default for insert
        update_parts := array_append(update_parts, mapping.pc_col || ' = pc.' || mapping.pc_col);
        insert_cols := array_append(insert_cols, mapping.pc_col);
        insert_exprs := array_append(insert_exprs, mapping.def);
      END IF;
    END IF;
  END LOOP;

  -- Always ensure updated_at is set
  update_parts := array_append(update_parts, 'updated_at = now()');

  -- Build and execute UPDATE
  sql := 'UPDATE public.public_catalogs pc SET ' || array_to_string(update_parts, ', ') || ' FROM public.settings s WHERE pc.user_id = s.user_id AND s.catalog_slug IS NOT NULL;';
  RAISE NOTICE 'Executing: %', sql;
  EXECUTE sql;

  -- Build and execute INSERT for missing public_catalogs
  sql := 'INSERT INTO public.public_catalogs (' || array_to_string(insert_cols, ', ') || ', created_at, updated_at) ' ||
         'SELECT ' || array_to_string(insert_exprs, ', ') || ', now(), now() FROM public.settings s LEFT JOIN public.public_catalogs pc ON pc.user_id = s.user_id ' ||
         'WHERE s.catalog_slug IS NOT NULL AND pc.user_id IS NULL AND NOT EXISTS (SELECT 1 FROM public.public_catalogs pc2 WHERE pc2.slug = s.catalog_slug);';
  RAISE NOTICE 'Executing: %', sql;
  EXECUTE sql;
END
$$;

-- Observação:
-- - Este bloco monta as queries dinamicamente com base nas colunas existentes em `settings`.
-- - Execute com permissão adequada (service role) e revise os avisos/NOTICES gerados.
