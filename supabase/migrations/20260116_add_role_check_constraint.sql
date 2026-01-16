-- Migration: add check constraint for profiles.role
-- Date: 2026-01-16

BEGIN;

DO $$
DECLARE
  _typname text;
  _enumoid oid;
BEGIN
  -- find the type name of the 'role' column in public.profiles
  SELECT t.typname
    INTO _typname
  FROM pg_attribute a
  JOIN pg_class c ON a.attrelid = c.oid
  JOIN pg_type t ON a.atttypid = t.oid
  WHERE c.relname = 'profiles' AND a.attname = 'role'
  LIMIT 1;

  IF _typname IS NOT NULL THEN
    SELECT t.oid INTO _enumoid FROM pg_type t WHERE t.typname = _typname AND t.typtype = 'e' LIMIT 1;
    IF _enumoid IS NOT NULL THEN
      -- add values if missing
      IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumtypid = _enumoid AND enumlabel = 'template') THEN
        EXECUTE format('ALTER TYPE %I ADD VALUE %L', _typname, 'template');
      END IF;
      IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumtypid = _enumoid AND enumlabel = 'rep') THEN
        EXECUTE format('ALTER TYPE %I ADD VALUE %L', _typname, 'rep');
      END IF;
      IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumtypid = _enumoid AND enumlabel = 'representative') THEN
        EXECUTE format('ALTER TYPE %I ADD VALUE %L', _typname, 'representative');
      END IF;
    END IF;
  END IF;
END;
$$;

-- Now add the constraint if missing
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'check_valid_roles'
  ) THEN
    EXECUTE 'ALTER TABLE public.profiles ADD CONSTRAINT check_valid_roles CHECK (role IN (''master'',''template'',''representative'',''rep''))';
  END IF;
END;
$$;

COMMIT;

-- Rollback (manual):
-- ALTER TABLE public.profiles DROP CONSTRAINT IF EXISTS check_valid_roles;
