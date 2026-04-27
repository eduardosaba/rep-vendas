-- Migration: create error_logs table for Torre de Controle
-- Location: supabase/migrations/002_create_error_logs.sql

create table if not exists public.error_logs (
  id uuid default gen_random_uuid() primary key,
  created_at timestamp with time zone default now(),
  url text,
  error_type text,
  message text,
  user_agent text,
  stack_trace text,
  user_id uuid
);

-- Enable RLS and allow inserts from anonymous/public clients
alter table public.error_logs enable row level security;
-- Ensure idempotent policy creation: drop if exists, then create
drop policy if exists "Allow insert for everyone" on public.error_logs;
create policy "Allow insert for everyone" on public.error_logs for insert with check (true);
