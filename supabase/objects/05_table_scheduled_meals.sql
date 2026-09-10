create table if not exists public.scheduled_meals (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  meal_id uuid not null references public.meals(id) on delete cascade,
  scheduled_date date not null,
  sort_order integer not null default 0,
  is_completed boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, meal_id, scheduled_date)
);

create index if not exists scheduled_meals_user_date_idx on public.scheduled_meals(user_id, scheduled_date, sort_order);

drop trigger if exists set_scheduled_meals_updated_at on public.scheduled_meals;
create trigger set_scheduled_meals_updated_at
before update on public.scheduled_meals
for each row execute function public.set_updated_at();

alter table public.scheduled_meals enable row level security;

create policy "Users can manage own scheduled meals"
on public.scheduled_meals for all
using (auth.uid() = user_id)
with check (
  auth.uid() = user_id
  and exists (
    select 1 from public.meals m
    where m.id = meal_id and m.user_id = auth.uid()
  )
);
