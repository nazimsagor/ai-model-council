create extension if not exists "pgcrypto";

create table if not exists public.request_log (
  id uuid primary key default gen_random_uuid(),
  key text not null,
  created_at timestamptz not null default now()
);

create index if not exists request_log_key_created_at_idx
  on public.request_log (key, created_at desc);
