create table if not exists public.grocery_extra_items (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  week_start date not null,
  name text not null,
  quantity numeric not null default 1 check (quantity >= 0),
  unit text not null default '',
  category text not null default 'Other',
  is_checked boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists grocery_extra_items_user_week_idx on public.grocery_extra_items(user_id, week_start);

drop trigger if exists set_grocery_extra_items_updated_at on public.grocery_extra_items;
create trigger set_grocery_extra_items_updated_at
before update on public.grocery_extra_items
for each row execute function public.set_updated_at();

alter table public.grocery_extra_items enable row level security;

create policy "Users can manage own grocery extra items"
on public.grocery_extra_items for all
using (auth.uid() = user_id)
with check (auth.uid() = user_id);
