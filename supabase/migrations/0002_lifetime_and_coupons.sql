-- Run this in the Supabase SQL editor (Dashboard → SQL Editor) for this project.
-- Run after 0001_subscription_payments.sql.

-- Switches the product from a recurring monthly subscription to a
-- one-time lifetime purchase: subscription_expires_at now means "never"
-- when null and is_subscribed is true (see getCurrentUser in
-- src/lib/subscription.ts), which is exactly the state a lifetime grant
-- leaves a profile in — no separate "lifetime" flag needed.

alter table public.payments
  add column if not exists coupon_code text;

create table if not exists public.coupons (
  code text primary key,
  percent_off integer not null check (percent_off between 1 and 100),
  max_redemptions integer, -- null = unlimited
  redemption_count integer not null default 0,
  active boolean not null default true,
  created_at timestamptz not null default now()
);

insert into public.coupons (code, percent_off, max_redemptions)
values ('EARLYBD100', 100, null)
on conflict (code) do nothing;
