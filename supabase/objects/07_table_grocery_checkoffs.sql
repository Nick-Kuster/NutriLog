create table if not exists public.grocery_checkoffs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  week_start date not null,
  item_key text not null,
  is_checked boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, week_start, item_key)
);

create index if not exists grocery_checkoffs_user_week_idx on public.grocery_checkoffs(user_id, week_start);

drop trigger if exists set_grocery_checkoffs_updated_at on public.grocery_checkoffs;
create trigger set_grocery_checkoffs_updated_at
before update on public.grocery_checkoffs
for each row execute function public.set_updated_at();

alter table public.grocery_checkoffs enable row level security;

create policy "Users can manage own grocery checkoffs"
on public.grocery_checkoffs for all
using (auth.uid() = user_id)
with check (auth.uid() = user_id);
