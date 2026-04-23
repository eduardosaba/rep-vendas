-- Migration: create role_permissions table
-- Run this in your Supabase / Postgres database

CREATE TABLE IF NOT EXISTS public.role_permissions (
  role text PRIMARY KEY,
  data jsonb NOT NULL,
  updated_at timestamptz DEFAULT now()
);

-- Optional: insert default mapping
INSERT INTO public.role_permissions (role, data, updated_at)
VALUES ('mapping', '{"master": {"can_edit_appearance": true, "can_manage_catalog": true, "can_edit_stock": true, "can_edit_institutional": true, "can_edit_pages": true, "can_sync_settings": true}, "template": {"can_edit_appearance": true, "can_manage_catalog": true, "can_edit_stock": true, "can_edit_institutional": true, "can_edit_pages": true, "can_sync_settings": true}, "admin_company": {"can_edit_appearance": true, "can_manage_catalog": true, "can_edit_stock": true, "can_edit_institutional": true, "can_edit_pages": true, "can_sync_settings": true}, "rep": {"can_edit_appearance": true, "can_manage_catalog": false, "can_edit_stock": false, "can_edit_institutional": false, "can_edit_pages": false, "can_sync_settings": false}, "representative": {"can_edit_appearance": false, "can_manage_catalog": false, "can_edit_stock": false, "can_edit_institutional": false, "can_edit_pages": false, "can_sync_settings": false}}', now())
ON CONFLICT (role) DO NOTHING;
