alter table public.runs
  add column if not exists user_id uuid;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'runs_user_id_fkey'
      and conrelid = 'public.runs'::regclass
  ) then
    alter table public.runs
      add constraint runs_user_id_fkey
      foreign key (user_id) references auth.users(id) on delete cascade;
  end if;
end $$;

alter table public.runs
  alter column visitor_id drop not null;

create index if not exists runs_user_id_idx on public.runs (user_id);
