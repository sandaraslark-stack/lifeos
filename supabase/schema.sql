create table if not exists public.lifeos_states (
  user_id uuid primary key references auth.users(id) on delete cascade,
  data jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

alter table public.lifeos_states enable row level security;

create policy "Users can read their own LifeOS state"
  on public.lifeos_states
  for select
  using (auth.uid() = user_id);

create policy "Users can insert their own LifeOS state"
  on public.lifeos_states
  for insert
  with check (auth.uid() = user_id);

create policy "Users can update their own LifeOS state"
  on public.lifeos_states
  for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create or replace function public.set_lifeos_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists set_lifeos_states_updated_at on public.lifeos_states;

create trigger set_lifeos_states_updated_at
  before update on public.lifeos_states
  for each row
  execute function public.set_lifeos_updated_at();
