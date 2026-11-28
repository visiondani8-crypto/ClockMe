-- APPLIED 26 Nov 2026 (migration 20261126211940). Copied into the repo on 28 Nov 2026 from the database's own
-- migration record (supabase_migrations.schema_migrations), so the schema and its access rules can be reviewed here.
-- ShiftPay core schema. Every row belongs to one user (auth.users) and is protected by row level security.

create or replace function public.set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- One row per user: account settings, business details for invoices, usual weekly roster
create table public.profiles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  display_name text not null default '',
  email text not null default '',
  settings jsonb not null default '{}'::jsonb,
  business jsonb not null default '{}'::jsonb,
  roster jsonb not null default '{}'::jsonb,
  avatar_path text,
  schema_version int not null default 3,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.jobs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  rate numeric(10,2) not null default 0 check (rate >= 0),
  icon text not null default 'briefcase',
  color text not null default '#2DB52D',
  self_employed boolean not null default false,
  archived boolean not null default false,
  config jsonb not null default '{}'::jsonb,  -- premiums, night window, overtime, special days, holiday pay, client details
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz,
  unique (user_id, id)
);

create table public.contracts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  job_id uuid not null,
  type text not null default 'permanent',
  start_date date not null,
  end_date date,
  hours numeric(6,2) not null default 0 check (hours >= 0),
  rate numeric(10,2) not null default 0 check (rate >= 0),
  notice text not null default '',
  probation_end date,
  notes text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz,
  check (end_date is null or end_date >= start_date),
  foreign key (user_id, job_id) references public.jobs(user_id, id) on delete cascade
);

create table public.invoices (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  job_id uuid,
  number text not null,
  issue_date date not null,
  period_from date,
  period_to date,
  status text not null default 'draft',
  total numeric(12,2) not null default 0,
  paid_at timestamptz,
  data jsonb not null default '{}'::jsonb,  -- lines, extras, notes, client snapshot
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz,
  unique (user_id, id),
  foreign key (user_id, job_id) references public.jobs(user_id, id) on delete set null (job_id)
);
create unique index invoices_user_number_key on public.invoices (user_id, lower(btrim(number))) where deleted_at is null;

create table public.shifts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  job_id uuid not null,
  type text not null default 'work' check (type in ('work','holiday','sick')),
  paid_sick boolean not null default false,
  start_at timestamptz not null,
  end_at timestamptz not null,
  break_min integer not null default 0 check (break_min >= 0),
  rate numeric(10,2) not null default 0 check (rate >= 0),
  extra_pct numeric(6,2) not null default 0,
  tips numeric(10,2) not null default 0,
  notes text not null default '',
  roster_key text,
  edited boolean not null default false,
  week_edit boolean not null default false,
  invoice_id uuid,
  extra jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz,
  check (end_at > start_at),
  foreign key (user_id, job_id) references public.jobs(user_id, id) on delete cascade,
  foreign key (user_id, invoice_id) references public.invoices(user_id, id) on delete set null (invoice_id)
);

create table public.goals (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  title text not null,
  subtitle text not null default '',
  icon text not null default 'flag',
  color text not null default '#2DB52D',
  target numeric(12,2) not null check (target > 0),
  start_date date not null,
  deadline date not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);

create table public.payslips (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  period_from date not null,
  period_to date not null,
  expected numeric(12,2) not null default 0,
  gross numeric(12,2) not null default 0,
  net numeric(12,2) not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);

-- The shift currently being clocked, at most one per user
create table public.active_clock (
  user_id uuid primary key references auth.users(id) on delete cascade,
  job_id uuid,
  started_at timestamptz not null,
  break_started_at timestamptz,
  break_seconds integer not null default 0 check (break_seconds >= 0),
  plan_id text,
  updated_at timestamptz not null default now(),
  foreign key (user_id, job_id) references public.jobs(user_id, id) on delete set null (job_id)
);

-- Indexes for the screens that read by user and date, and for sync by last change
create index shifts_user_start_idx on public.shifts (user_id, start_at desc);
create index shifts_user_job_idx on public.shifts (user_id, job_id);
create index shifts_user_invoice_idx on public.shifts (user_id, invoice_id) where invoice_id is not null;
create index shifts_user_updated_idx on public.shifts (user_id, updated_at);
create index jobs_user_updated_idx on public.jobs (user_id, updated_at);
create index contracts_user_job_idx on public.contracts (user_id, job_id);
create index invoices_user_issue_idx on public.invoices (user_id, issue_date desc);
create index invoices_user_updated_idx on public.invoices (user_id, updated_at);
create index goals_user_idx on public.goals (user_id);
create index payslips_user_period_idx on public.payslips (user_id, period_from desc);

-- Keep updated_at honest (used for syncing)
do $$
declare t text;
begin
  foreach t in array array['profiles','jobs','contracts','invoices','shifts','goals','payslips','active_clock'] loop
    execute format('create trigger set_updated_at before update on public.%I for each row execute function public.set_updated_at()', t);
  end loop;
end $$;

-- Row level security: a signed-in user can only touch their own rows
do $$
declare t text;
begin
  foreach t in array array['profiles','jobs','contracts','invoices','shifts','goals','payslips','active_clock'] loop
    execute format('alter table public.%I enable row level security', t);
    execute format('create policy "own rows select" on public.%I for select to authenticated using (user_id = (select auth.uid()))', t);
    execute format('create policy "own rows insert" on public.%I for insert to authenticated with check (user_id = (select auth.uid()))', t);
    execute format('create policy "own rows update" on public.%I for update to authenticated using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()))', t);
    execute format('create policy "own rows delete" on public.%I for delete to authenticated using (user_id = (select auth.uid()))', t);
  end loop;
end $$;

-- New sign-ups get an empty profile automatically
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (user_id, email, display_name)
  values (new.id, coalesce(new.email, ''), coalesce(new.raw_user_meta_data ->> 'full_name', ''))
  on conflict (user_id) do nothing;
  return new;
end;
$$;
revoke all on function public.handle_new_user() from public, anon, authenticated;
create trigger on_auth_user_created after insert on auth.users for each row execute function public.handle_new_user();

-- App Store rule: users must be able to delete their account and data from inside the app.
-- Deleting the auth user cascades to every table above.
create or replace function public.delete_my_account()
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if (select auth.uid()) is null then
    raise exception 'not signed in';
  end if;
  delete from auth.users where id = (select auth.uid());
end;
$$;
revoke all on function public.delete_my_account() from public, anon;
grant execute on function public.delete_my_account() to authenticated;
