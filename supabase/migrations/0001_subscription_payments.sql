-- Run this in the Supabase SQL editor (Dashboard → SQL Editor) for this project.

alter table public.profiles
  add column if not exists subscription_expires_at timestamptz;

create table if not exists public.payments (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  tran_id text not null unique,
  amount numeric not null,
  currency text not null default 'BDT',
  status text not null default 'pending', -- pending | valid | failed | cancelled
  val_id text,
  card_type text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists payments_user_id_idx on public.payments (user_id);
