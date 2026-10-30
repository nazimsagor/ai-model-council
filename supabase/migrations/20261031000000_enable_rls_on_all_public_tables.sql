-- The app only touches these tables from the server with the service-role
-- key (which bypasses RLS); the browser uses Supabase solely for auth. With
-- RLS on and no policies, the public anon key can no longer read or write
-- any row directly.
alter table public.runs enable row level security;
alter table public.model_responses enable row level security;
alter table public.evaluations enable row level security;
alter table public.benchmarks enable row level security;
alter table public.benchmark_questions enable row level security;
alter table public.benchmark_runs enable row level security;
alter table public.benchmark_results enable row level security;
alter table public.profiles enable row level security;
alter table public.request_log enable row level security;
alter table public.payments enable row level security;
alter table public.coupons enable row level security;
