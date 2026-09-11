alter table public.benchmarks
  add column if not exists visitor_id uuid;

alter table public.benchmark_runs
  add column if not exists visitor_id uuid;

alter table public.benchmarks
  alter column user_id drop not null;

alter table public.benchmark_runs
  alter column user_id drop not null;

create index if not exists benchmarks_visitor_id_idx on public.benchmarks (visitor_id);
create index if not exists benchmark_runs_visitor_id_idx on public.benchmark_runs (visitor_id);
