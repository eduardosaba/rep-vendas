-- Estrutura para gerenciador de páginas do catálogo virtual por distribuidora
create table if not exists public.company_page_sections (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  section_key text not null,
  title text not null,
  is_active boolean not null default true,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (company_id, section_key)
);

create index if not exists idx_company_page_sections_company_sort
  on public.company_page_sections(company_id, sort_order);

alter table public.company_page_sections enable row level security;

-- Permite leitura dentro da mesma company
do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'company_page_sections'
      and policyname = 'company_page_sections_select_own_company'
  ) then
    create policy company_page_sections_select_own_company
      on public.company_page_sections
      for select
      using (
        company_id in (
          select p.company_id from public.profiles p where p.id = auth.uid()
        )
      );
  end if;
end
$$;

-- Escrita restrita a admin_company/master da mesma company
do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'company_page_sections'
      and policyname = 'company_page_sections_write_admin'
  ) then
    create policy company_page_sections_write_admin
      on public.company_page_sections
      for all
      using (
        company_id in (
          select p.company_id
          from public.profiles p
          where p.id = auth.uid()
            and p.role::text in ('admin_company', 'master')
        )
      )
      with check (
        company_id in (
          select p.company_id
          from public.profiles p
          where p.id = auth.uid()
            and p.role::text in ('admin_company', 'master')
        )
      );
  end if;
end
$$;
