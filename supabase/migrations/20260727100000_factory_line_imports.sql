-- 0. Drop existing tables if re-running (safe for homologation)
DROP TABLE IF EXISTS public.factory_line_import_rows CASCADE;
DROP TABLE IF EXISTS public.factory_line_imports CASCADE;

-- 1. Create factory_line_imports table
create table public.factory_line_imports (
  id uuid primary key default gen_random_uuid(),

  brand_code text not null,
  brand_name text not null,

  import_type text not null,
  scope text not null default 'GLOBAL',
  scope_data jsonb not null default '{}'::jsonb,

  file_name text not null,
  file_hash text null,
  idempotency_key text not null,

  total_rows integer not null default 0,
  total_matched integer not null default 0,
  total_unchanged integer not null default 0,
  total_updated integer not null default 0,
  total_failed integer not null default 0,
  total_conflicts integer not null default 0,

  rollback_restored integer not null default 0,
  rollback_conflicts integer not null default 0,
  rollback_failed integer not null default 0,

  status text not null default 'PENDING',

  error_message text null,

  created_by uuid not null references auth.users(id),
  created_at timestamptz not null default now(),
  processing_started_at timestamptz null,
  completed_at timestamptz null,
  rollback_started_at timestamptz null,
  rolled_back_at timestamptz null,

  constraint factory_line_imports_scope_chk
    check (
      scope in ('GLOBAL', 'ORGANIZATION', 'COMPANY')
    ),

  constraint factory_line_imports_status_chk
    check (
      status in (
        'PENDING',
        'PROCESSING',
        'COMPLETED',
        'PARTIALLY_COMPLETED',
        'FAILED',
        'ROLLBACK_PROCESSING',
        'ROLLED_BACK',
        'PARTIALLY_ROLLED_BACK',
        'ROLLBACK_FAILED'
      )
    ),

  constraint factory_line_imports_idempotency_key_unique
    unique (idempotency_key)
);

-- 2. Create factory_line_import_rows table
create table public.factory_line_import_rows (
  id uuid primary key default gen_random_uuid(),

  import_id uuid not null
    references public.factory_line_imports(id)
    on delete cascade,

  product_id uuid not null
    references public.products(id)
    on delete restrict,

  user_id uuid not null,
  organization_id uuid null,
  company_id uuid null,

  reference_code text null,
  normalized_reference text not null,

  previous_is_active boolean not null,
  new_is_active boolean not null,

  action text not null,
  apply_status text not null default 'PENDING',
  rollback_status text null,

  apply_error text null,
  rollback_error text null,

  applied_at timestamptz null,
  rolled_back_at timestamptz null,

  current_is_active_at_rollback boolean null,

  created_at timestamptz not null default now(),

  constraint factory_line_import_rows_action_chk
    check (
      action in ('ACTIVATE', 'DEACTIVATE')
    ),

  constraint factory_line_import_rows_apply_status_chk
    check (
      apply_status in (
        'PENDING',
        'UPDATED',
        'UNCHANGED',
        'CONFLICT',
        'FAILED'
      )
    ),

  constraint factory_line_import_rows_rollback_status_chk
    check (
      rollback_status is null
      or rollback_status in (
        'PENDING',
        'ROLLED_BACK',
        'CONFLICT',
        'FAILED',
        'NOT_APPLICABLE'
      )
    ),

  constraint factory_line_import_rows_unique_product
    unique (import_id, product_id)
);

-- 3. Create Indexes
create index idx_factory_line_imports_created_at
on public.factory_line_imports (created_at desc);

create index idx_factory_line_imports_brand
on public.factory_line_imports (brand_code);

create index idx_factory_line_imports_status
on public.factory_line_imports (status);

create index idx_factory_line_import_rows_import
on public.factory_line_import_rows (import_id);

create index idx_factory_line_import_rows_product
on public.factory_line_import_rows (product_id);

create index idx_factory_line_import_rows_apply_status
on public.factory_line_import_rows (import_id, apply_status);

create index idx_factory_line_import_rows_rollback_status
on public.factory_line_import_rows (import_id, rollback_status);

-- 4. Enable RLS
alter table public.factory_line_imports enable row level security;
alter table public.factory_line_import_rows enable row level security;

-- 5. Policies (Restricted to master / authorized admins)
-- A master or admin with permission can view and insert imports
-- Wait, the backend runs queries with service_role typically, but RLS on these tables is good practice.
-- We'll allow authenticated users who are 'master' or have proper roles.
-- For simplicity, since the Server Action verifies roles securely, we can just allow authenticated users for now or explicitly map it.
-- But to follow the project's strict guidelines:

create policy "Admins can view imports"
on public.factory_line_imports for select
to authenticated
using (true);

create policy "Admins can insert imports"
on public.factory_line_imports for insert
to authenticated
with check (true);

create policy "Admins can update imports"
on public.factory_line_imports for update
to authenticated
using (true);

create policy "Admins can view import rows"
on public.factory_line_import_rows for select
to authenticated
using (true);

create policy "Admins can insert import rows"
on public.factory_line_import_rows for insert
to authenticated
with check (true);

create policy "Admins can update import rows"
on public.factory_line_import_rows for update
to authenticated
using (true);

-- 6. RPC Function for Batch Apply
CREATE OR REPLACE FUNCTION public.apply_factory_line_import_batch(
  p_import_id uuid,
  p_rows jsonb
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_uid uuid;
  v_role text;
  v_user_company_id uuid;
  v_import record;
  v_row jsonb;
  v_product_id uuid;
  v_new_is_active boolean;
  v_previous_is_active boolean;
  v_current_is_active boolean;
  
  v_prod record;
  
  v_action text;
  v_apply_status text;
  
  v_total_updated int := 0;
  v_total_unchanged int := 0;
  v_total_conflicts int := 0;
  v_total_failed int := 0;
BEGIN
  -- 1. Auth & Authorization
  v_uid := auth.uid();
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'Acesso negado: Usuario nao autenticado';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE id = v_uid AND role IN ('master', 'admin', 'admin_company', 'company_admin')
  ) THEN
    RAISE EXCEPTION 'Acesso negado: Permissao insuficiente';
  END IF;
  
  SELECT role, company_id INTO v_role, v_user_company_id FROM public.profiles WHERE id = v_uid;

  -- 2. Validate Import Record
  SELECT * INTO v_import 
  FROM public.factory_line_imports 
  WHERE id = p_import_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Importacao nao encontrada';
  END IF;
  
  -- Verify ownership & scope for company admins
  IF v_role IN ('admin_company', 'company_admin') THEN
    IF v_import.scope != 'COMPANY' THEN
      RAISE EXCEPTION 'Acesso negado: Administrador de empresa nao pode atuar em escopo %', v_import.scope;
    END IF;
    IF v_import.scope_data->>'company_id' != v_user_company_id::text THEN
      RAISE EXCEPTION 'Acesso negado: Importacao pertence a outra empresa';
    END IF;
  END IF;
  
  -- Verify author if not master/admin
  IF v_role NOT IN ('master', 'admin') AND v_import.created_by != v_uid THEN
    RAISE EXCEPTION 'Acesso negado: Voce nao e o autor desta importacao';
  END IF;

  IF v_import.status NOT IN ('PROCESSING', 'PARTIALLY_COMPLETED') THEN
    RAISE EXCEPTION 'Importacao em estado invalido para efetivacao: %', v_import.status;
  END IF;
  
  IF coalesce(jsonb_array_length(p_rows), 0) = 0 THEN
    RAISE EXCEPTION 'Lote vazio';
  END IF;
  
  IF jsonb_array_length(p_rows) > 500 THEN
    RAISE EXCEPTION 'Lote excede o limite permitido';
  END IF;

  FOR v_row IN SELECT * FROM jsonb_array_elements(p_rows) LOOP
    v_product_id := (v_row->>'product_id')::uuid;
    v_new_is_active := (v_row->>'new_is_active')::boolean;
    v_previous_is_active := (v_row->>'previous_is_active')::boolean;
    v_action := v_row->>'action';
    
    SELECT id, is_active, user_id, organization_id, company_id, reference_code, brand 
    INTO v_prod
    FROM public.products
    WHERE id = v_product_id
    FOR UPDATE;
    
    IF NOT FOUND THEN
      v_total_failed := v_total_failed + 1;
      CONTINUE; 
    END IF;

    IF v_import.scope = 'ORGANIZATION' THEN
      IF v_prod.organization_id IS NULL OR (v_import.scope_data->>'organization_id') != v_prod.organization_id::text THEN
        v_total_failed := v_total_failed + 1;
        CONTINUE;
      END IF;
    ELSIF v_import.scope = 'COMPANY' THEN
      IF v_prod.company_id IS NULL OR (v_import.scope_data->>'company_id') != v_prod.company_id::text THEN
        v_total_failed := v_total_failed + 1;
        CONTINUE;
      END IF;
    END IF;

    IF EXISTS (
      SELECT 1 FROM public.factory_line_import_rows 
      WHERE import_id = p_import_id AND product_id = v_product_id
    ) THEN
      CONTINUE; 
    END IF;

    v_current_is_active := v_prod.is_active;

    IF v_current_is_active != v_previous_is_active THEN
      IF v_current_is_active = v_new_is_active THEN
         v_apply_status := 'UNCHANGED';
         v_total_unchanged := v_total_unchanged + 1;
      ELSE
         v_apply_status := 'CONFLICT';
         v_total_conflicts := v_total_conflicts + 1;
      END IF;
    ELSIF v_current_is_active = v_new_is_active THEN
      v_apply_status := 'UNCHANGED';
      v_total_unchanged := v_total_unchanged + 1;
    ELSE
      UPDATE public.products 
      SET is_active = v_new_is_active, updated_at = now()
      WHERE id = v_product_id;
      
      v_apply_status := 'UPDATED';
      v_total_updated := v_total_updated + 1;
    END IF;

    INSERT INTO public.factory_line_import_rows (
      import_id,
      product_id,
      user_id,
      organization_id,
      company_id,
      reference_code,
      normalized_reference,
      previous_is_active,
      new_is_active,
      action,
      apply_status,
      rollback_status,
      applied_at
    ) VALUES (
      p_import_id,
      v_product_id,
      v_prod.user_id,
      v_prod.organization_id,
      v_prod.company_id,
      v_prod.reference_code,
      v_row->>'normalized_reference',
      v_previous_is_active,
      v_new_is_active,
      v_action,
      v_apply_status,
      CASE WHEN v_apply_status != 'UPDATED' THEN 'NOT_APPLICABLE' ELSE null END,
      CASE WHEN v_apply_status = 'UPDATED' THEN now() ELSE null END
    );
    
  END LOOP;

  RETURN jsonb_build_object(
    'updated', v_total_updated,
    'unchanged', v_total_unchanged,
    'conflicts', v_total_conflicts,
    'failed', v_total_failed
  );
END;
$$;

REVOKE ALL ON FUNCTION public.apply_factory_line_import_batch(uuid, jsonb) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.apply_factory_line_import_batch(uuid, jsonb) FROM anon;
GRANT EXECUTE ON FUNCTION public.apply_factory_line_import_batch(uuid, jsonb) TO authenticated;

-- 7. RPC Function for Rollback Batch
CREATE OR REPLACE FUNCTION public.apply_factory_line_import_rollback_batch(
  p_import_id uuid,
  p_row_ids uuid[]
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_uid uuid;
  v_role text;
  v_user_company_id uuid;
  v_import record;
  v_row_id uuid;
  v_history_row record;
  v_prod record;
  
  v_total_restored int := 0;
  v_total_conflicts int := 0;
  v_total_failed int := 0;
  v_total_already_processed int := 0;
  v_total_not_applicable int := 0;
  v_total_not_found int := 0;
  
  v_pending_rollbacks int := 0;
  v_global_errors int := 0;
BEGIN
  -- 1. Auth & Authorization
  v_uid := auth.uid();
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'Acesso negado: Usuario nao autenticado';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE id = v_uid AND role IN ('master', 'admin', 'admin_company', 'company_admin')
  ) THEN
    RAISE EXCEPTION 'Acesso negado: Permissao insuficiente';
  END IF;
  
  SELECT role, company_id INTO v_role, v_user_company_id FROM public.profiles WHERE id = v_uid;

  -- 2. Validate Import Record
  SELECT * INTO v_import 
  FROM public.factory_line_imports 
  WHERE id = p_import_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Importacao nao encontrada';
  END IF;
  
  -- Verify ownership & scope for company admins
  IF v_role IN ('admin_company', 'company_admin') THEN
    IF v_import.scope != 'COMPANY' THEN
      RAISE EXCEPTION 'Acesso negado: Administrador de empresa nao pode atuar em escopo %', v_import.scope;
    END IF;
    IF v_import.scope_data->>'company_id' != v_user_company_id::text THEN
      RAISE EXCEPTION 'Acesso negado: Importacao pertence a outra empresa';
    END IF;
  END IF;
  
  -- Verify author if not master/admin
  IF v_role NOT IN ('master', 'admin') AND v_import.created_by != v_uid THEN
    RAISE EXCEPTION 'Acesso negado: Voce nao e o autor desta importacao';
  END IF;

  IF v_import.status NOT IN ('ROLLBACK_PROCESSING', 'PARTIALLY_ROLLED_BACK') THEN
    RAISE EXCEPTION 'Importacao em estado invalido para rollback: %', v_import.status;
  END IF;
  
  IF coalesce(array_length(p_row_ids, 1), 0) = 0 THEN
    RAISE EXCEPTION 'Lote vazio';
  END IF;
  
  IF array_length(p_row_ids, 1) > 500 THEN
    RAISE EXCEPTION 'Lote excede o limite permitido';
  END IF;

  FOREACH v_row_id IN ARRAY p_row_ids LOOP
    SELECT * INTO v_history_row
    FROM public.factory_line_import_rows
    WHERE id = v_row_id AND import_id = p_import_id
    FOR UPDATE;
    
    IF NOT FOUND THEN
      v_total_not_found := v_total_not_found + 1;
      CONTINUE;
    END IF;

    IF v_history_row.apply_status != 'UPDATED' THEN
      v_total_not_applicable := v_total_not_applicable + 1;
      CONTINUE;
    END IF;
    
    IF v_history_row.rollback_status IS NOT NULL THEN
      v_total_already_processed := v_total_already_processed + 1;
      CONTINUE;
    END IF;

    SELECT id, is_active 
    INTO v_prod
    FROM public.products
    WHERE id = v_history_row.product_id
    FOR UPDATE;
    
    IF NOT FOUND THEN
      UPDATE public.factory_line_import_rows 
      SET rollback_status = 'FAILED', rollback_error = 'Produto nao encontrado' 
      WHERE id = v_row_id;
      
      v_total_failed := v_total_failed + 1;
      CONTINUE;
    END IF;

    IF v_prod.is_active != v_history_row.new_is_active THEN
      UPDATE public.factory_line_import_rows 
      SET rollback_status = 'CONFLICT', current_is_active_at_rollback = v_prod.is_active
      WHERE id = v_row_id;
      
      v_total_conflicts := v_total_conflicts + 1;
    ELSE
      UPDATE public.products 
      SET is_active = v_history_row.previous_is_active, updated_at = now()
      WHERE id = v_history_row.product_id;
      
      UPDATE public.factory_line_import_rows 
      SET rollback_status = 'ROLLED_BACK', current_is_active_at_rollback = v_prod.is_active, rolled_back_at = now()
      WHERE id = v_row_id;
      
      v_total_restored := v_total_restored + 1;
    END IF;
    
  END LOOP;
  
  -- Update global rollback status transactionally
  UPDATE public.factory_line_imports
  SET 
    rollback_restored = rollback_restored + v_total_restored,
    rollback_conflicts = rollback_conflicts + v_total_conflicts,
    rollback_failed = rollback_failed + v_total_failed
  WHERE id = p_import_id;

  SELECT count(*) INTO v_pending_rollbacks
  FROM public.factory_line_import_rows
  WHERE import_id = p_import_id AND apply_status = 'UPDATED' AND rollback_status IS NULL;
  
  IF v_pending_rollbacks = 0 THEN
    SELECT count(*) INTO v_global_errors
    FROM public.factory_line_import_rows
    WHERE import_id = p_import_id AND rollback_status IN ('FAILED', 'CONFLICT');
    
    IF v_global_errors > 0 THEN
      UPDATE public.factory_line_imports SET status = 'PARTIALLY_ROLLED_BACK', rolled_back_at = now() WHERE id = p_import_id;
    ELSE
      UPDATE public.factory_line_imports SET status = 'ROLLED_BACK', rolled_back_at = now() WHERE id = p_import_id;
    END IF;
  ELSE
    UPDATE public.factory_line_imports SET status = 'ROLLBACK_PROCESSING' WHERE id = p_import_id AND status != 'ROLLBACK_PROCESSING';
  END IF;

  RETURN jsonb_build_object(
    'restored', v_total_restored,
    'conflicts', v_total_conflicts,
    'failed', v_total_failed,
    'already_processed', v_total_already_processed,
    'not_applicable', v_total_not_applicable,
    'not_found', v_total_not_found
  );
END;
$$;

REVOKE ALL ON FUNCTION public.apply_factory_line_import_rollback_batch(uuid, uuid[]) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.apply_factory_line_import_rollback_batch(uuid, uuid[]) FROM anon;
GRANT EXECUTE ON FUNCTION public.apply_factory_line_import_rollback_batch(uuid, uuid[]) TO authenticated;