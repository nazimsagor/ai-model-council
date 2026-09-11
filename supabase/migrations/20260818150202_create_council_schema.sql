create extension if not exists "pgcrypto";

create table if not exists public.runs (
  id uuid primary key default gen_random_uuid(),
  visitor_id uuid,
  prompt text not null,
  system_prompt text,
  workflow text not null default 'council',
  mode text not null,
  prompt_mode text not null,
  params jsonb not null,
  selected_model_ids jsonb not null,
  judge_model_ids jsonb not null,
  blind_judging boolean not null default true,
  status text not null default 'running',
  created_at timestamptz not null default now(),
  completed_at timestamptz,
  total_cost double precision not null default 0,
  total_time_ms integer not null default 0,
  final_answer text,
  summary_json jsonb,
  parent_run_id uuid
);

create table if not exists public.model_responses (
  id uuid primary key default gen_random_uuid(),
  run_id uuid not null references public.runs(id) on delete cascade,
  model_id text not null,
  provider text not null,
  status text not null,
  content text,
  error text,
  prompt_tokens integer default 0,
  completion_tokens integer default 0,
  cost double precision default 0,
  latency_ms integer default 0
);

create table if not exists public.evaluations (
  id uuid primary key default gen_random_uuid(),
  run_id uuid not null references public.runs(id) on delete cascade,
  model_id text not null,
  judge_model_id text not null,
  scores_json jsonb not null,
  total double precision not null,
  justification text
);

create index if not exists idx_runs_visitor on public.runs (visitor_id, created_at desc);
create index if not exists idx_model_responses_run on public.model_responses (run_id);
create index if not exists idx_evaluations_run on public.evaluations (run_id);
