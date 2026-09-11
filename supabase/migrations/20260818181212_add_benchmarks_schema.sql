create extension if not exists "pgcrypto";

create table if not exists public.benchmarks (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade,
  name text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.benchmark_questions (
  id uuid primary key default gen_random_uuid(),
  benchmark_id uuid not null references public.benchmarks(id) on delete cascade,
  prompt text not null,
  position integer not null default 0,
  created_at timestamptz not null default now()
);

create table if not exists public.benchmark_runs (
  id uuid primary key default gen_random_uuid(),
  benchmark_id uuid not null references public.benchmarks(id) on delete cascade,
  user_id uuid references auth.users(id) on delete cascade,
  model_ids jsonb not null default '[]'::jsonb,
  status text not null default 'running',
  created_at timestamptz not null default now(),
  completed_at timestamptz
);

create table if not exists public.benchmark_results (
  id uuid primary key default gen_random_uuid(),
  benchmark_run_id uuid not null references public.benchmark_runs(id) on delete cascade,
  question_id uuid not null references public.benchmark_questions(id) on delete cascade,
  model_id text not null,
  provider text not null,
  status text not null,
  content text,
  error text,
  prompt_tokens integer default 0,
  completion_tokens integer default 0,
  cost double precision default 0,
  latency_ms integer default 0,
  scores_json jsonb,
  total double precision,
  created_at timestamptz not null default now()
);

create index if not exists benchmarks_user_id_idx on public.benchmarks (user_id);
create index if not exists benchmark_questions_benchmark_id_idx on public.benchmark_questions (benchmark_id);
create index if not exists benchmark_runs_benchmark_id_idx on public.benchmark_runs (benchmark_id);
create index if not exists benchmark_results_run_id_idx on public.benchmark_results (benchmark_run_id);
create index if not exists benchmark_results_question_id_idx on public.benchmark_results (question_id);
