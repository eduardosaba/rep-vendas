-- Adiciona o modo de exibição da barra de benefícios (estática ou letreiro animado)

ALTER TABLE public.settings
ADD COLUMN IF NOT EXISTS top_benefit_mode TEXT DEFAULT 'static';

ALTER TABLE public.settings
ADD COLUMN IF NOT EXISTS top_benefit_speed TEXT DEFAULT 'medium';

ALTER TABLE public.settings
ADD COLUMN IF NOT EXISTS top_benefit_animation TEXT DEFAULT 'scroll_left';

ALTER TABLE public.public_catalogs
ADD COLUMN IF NOT EXISTS top_benefit_mode TEXT DEFAULT 'static';

ALTER TABLE public.public_catalogs
ADD COLUMN IF NOT EXISTS top_benefit_speed TEXT DEFAULT 'medium';

ALTER TABLE public.public_catalogs
ADD COLUMN IF NOT EXISTS top_benefit_animation TEXT DEFAULT 'scroll_left';

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'settings_top_benefit_mode_chk'
  ) THEN
    ALTER TABLE public.settings
      ADD CONSTRAINT settings_top_benefit_mode_chk
      CHECK (top_benefit_mode IN ('static', 'marquee'));
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'settings_top_benefit_speed_chk'
  ) THEN
    ALTER TABLE public.settings
      ADD CONSTRAINT settings_top_benefit_speed_chk
      CHECK (top_benefit_speed IN ('slow', 'medium', 'fast'));
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'settings_top_benefit_animation_chk'
  ) THEN
    ALTER TABLE public.settings
      ADD CONSTRAINT settings_top_benefit_animation_chk
      CHECK (top_benefit_animation IN ('scroll_left', 'scroll_right', 'alternate'));
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'public_catalogs_top_benefit_mode_chk'
  ) THEN
    ALTER TABLE public.public_catalogs
      ADD CONSTRAINT public_catalogs_top_benefit_mode_chk
      CHECK (top_benefit_mode IN ('static', 'marquee'));
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'public_catalogs_top_benefit_speed_chk'
  ) THEN
    ALTER TABLE public.public_catalogs
      ADD CONSTRAINT public_catalogs_top_benefit_speed_chk
      CHECK (top_benefit_speed IN ('slow', 'medium', 'fast'));
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'public_catalogs_top_benefit_animation_chk'
  ) THEN
    ALTER TABLE public.public_catalogs
      ADD CONSTRAINT public_catalogs_top_benefit_animation_chk
      CHECK (top_benefit_animation IN ('scroll_left', 'scroll_right', 'alternate'));
  END IF;
END;
$$;

UPDATE public.settings
SET top_benefit_mode = 'static'
WHERE top_benefit_mode IS NULL;

UPDATE public.settings
SET top_benefit_speed = 'medium'
WHERE top_benefit_speed IS NULL;

UPDATE public.settings
SET top_benefit_animation = 'scroll_left'
WHERE top_benefit_animation IS NULL;

UPDATE public.public_catalogs
SET top_benefit_mode = 'static'
WHERE top_benefit_mode IS NULL;

UPDATE public.public_catalogs
SET top_benefit_speed = 'medium'
WHERE top_benefit_speed IS NULL;

UPDATE public.public_catalogs
SET top_benefit_animation = 'scroll_left'
WHERE top_benefit_animation IS NULL;
