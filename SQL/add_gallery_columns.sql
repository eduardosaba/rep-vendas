-- Migration: add gallery display fields to settings, companies and public_catalogs

ALTER TABLE IF EXISTS settings
  ADD COLUMN IF NOT EXISTS gallery_title text,
  ADD COLUMN IF NOT EXISTS gallery_subtitle text,
  ADD COLUMN IF NOT EXISTS gallery_title_color varchar(32),
  ADD COLUMN IF NOT EXISTS gallery_subtitle_color varchar(32);

-- add headline font size for cover overlay
ALTER TABLE IF EXISTS settings
  ADD COLUMN IF NOT EXISTS cover_headline_font_size integer;
ALTER TABLE IF EXISTS settings
  ADD COLUMN IF NOT EXISTS cover_headline_offset_x integer,
  ADD COLUMN IF NOT EXISTS cover_headline_offset_y integer,
  ADD COLUMN IF NOT EXISTS cover_headline_z_index integer,
  ADD COLUMN IF NOT EXISTS cover_headline_wrap boolean,
  ADD COLUMN IF NOT EXISTS cover_headline_force_two_lines boolean;

ALTER TABLE IF EXISTS companies
  ADD COLUMN IF NOT EXISTS gallery_title text,
  ADD COLUMN IF NOT EXISTS gallery_subtitle text,
  ADD COLUMN IF NOT EXISTS gallery_title_color varchar(32),
  ADD COLUMN IF NOT EXISTS gallery_subtitle_color varchar(32);

ALTER TABLE IF EXISTS companies
  ADD COLUMN IF NOT EXISTS cover_headline_font_size integer;
ALTER TABLE IF EXISTS companies
  ADD COLUMN IF NOT EXISTS cover_headline_offset_x integer,
  ADD COLUMN IF NOT EXISTS cover_headline_offset_y integer,
  ADD COLUMN IF NOT EXISTS cover_headline_z_index integer,
  ADD COLUMN IF NOT EXISTS cover_headline_wrap boolean,
  ADD COLUMN IF NOT EXISTS cover_headline_force_two_lines boolean;

ALTER TABLE IF EXISTS public_catalogs
  ADD COLUMN IF NOT EXISTS gallery_title text,
  ADD COLUMN IF NOT EXISTS gallery_subtitle text,
  ADD COLUMN IF NOT EXISTS gallery_title_color varchar(32),
  ADD COLUMN IF NOT EXISTS gallery_subtitle_color varchar(32);

ALTER TABLE IF EXISTS public_catalogs
  ADD COLUMN IF NOT EXISTS cover_headline_font_size integer;
ALTER TABLE IF EXISTS public_catalogs
  ADD COLUMN IF NOT EXISTS cover_headline_offset_x integer,
  ADD COLUMN IF NOT EXISTS cover_headline_offset_y integer,
  ADD COLUMN IF NOT EXISTS cover_headline_z_index integer,
  ADD COLUMN IF NOT EXISTS cover_headline_wrap boolean,
  ADD COLUMN IF NOT EXISTS cover_headline_force_two_lines boolean;
