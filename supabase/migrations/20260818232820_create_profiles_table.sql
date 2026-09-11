create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text,
  is_subscribed boolean not null default false,
  subscribed_at timestamptz,
  created_at timestamptz not null default now()
);
