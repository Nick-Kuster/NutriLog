-- NutriLog initial Supabase schema.
-- Designed to run in the same Supabase project as SweatLog: table/function/trigger
-- names that would otherwise collide with SweatLog's schema (user_preferences,
-- handle_new_user, on_auth_user_created) are namespaced with "nutrilog" below.
-- Run this file in the Supabase SQL editor or through the Supabase CLI.

create extension if not exists pgcrypto;

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create table if not exists public.nutrilog_user_preferences (
  user_id uuid primary key references auth.users(id) on delete cascade,
  week_starts_on integer not null default 0 check (week_starts_on between 0 and 6),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.meals (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  meal_type text not null default 'Meal' check (meal_type in ('Breakfast', 'Lunch', 'Dinner', 'Snack', 'Meal')),
  servings numeric not null default 1 check (servings > 0),
  prep_minutes numeric not null default 0 check (prep_minutes >= 0),
  calories numeric check (calories >= 0),
  protein_g numeric check (protein_g >= 0),
  carbs_g numeric check (carbs_g >= 0),
  fat_g numeric check (fat_g >= 0),
  status text not null default 'planned' check (status in ('planned', 'completed')),
  notes text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists meals_user_id_idx on public.meals(user_id);

create table if not exists public.meal_ingredients (
  id uuid primary key default gen_random_uuid(),
  meal_id uuid not null references public.meals(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  quantity numeric not null default 1 check (quantity >= 0),
  unit text not null default '',
  category text not null default 'Other',
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists meal_ingredients_meal_id_idx on public.meal_ingredients(meal_id);
create index if not exists meal_ingredients_user_meal_order_idx on public.meal_ingredients(user_id, meal_id, sort_order);

create table if not exists public.scheduled_meals (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  meal_id uuid not null references public.meals(id) on delete cascade,
  scheduled_date date not null,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, meal_id, scheduled_date)
);

create index if not exists scheduled_meals_user_date_idx on public.scheduled_meals(user_id, scheduled_date, sort_order);

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

drop trigger if exists set_nutrilog_user_preferences_updated_at on public.nutrilog_user_preferences;
create trigger set_nutrilog_user_preferences_updated_at
before update on public.nutrilog_user_preferences
for each row execute function public.set_updated_at();

drop trigger if exists set_meals_updated_at on public.meals;
create trigger set_meals_updated_at
before update on public.meals
for each row execute function public.set_updated_at();

drop trigger if exists set_meal_ingredients_updated_at on public.meal_ingredients;
create trigger set_meal_ingredients_updated_at
before update on public.meal_ingredients
for each row execute function public.set_updated_at();

drop trigger if exists set_scheduled_meals_updated_at on public.scheduled_meals;
create trigger set_scheduled_meals_updated_at
before update on public.scheduled_meals
for each row execute function public.set_updated_at();

drop trigger if exists set_grocery_extra_items_updated_at on public.grocery_extra_items;
create trigger set_grocery_extra_items_updated_at
before update on public.grocery_extra_items
for each row execute function public.set_updated_at();

drop trigger if exists set_grocery_checkoffs_updated_at on public.grocery_checkoffs;
create trigger set_grocery_checkoffs_updated_at
before update on public.grocery_checkoffs
for each row execute function public.set_updated_at();

alter table public.nutrilog_user_preferences enable row level security;
alter table public.meals enable row level security;
alter table public.meal_ingredients enable row level security;
alter table public.scheduled_meals enable row level security;
alter table public.grocery_extra_items enable row level security;
alter table public.grocery_checkoffs enable row level security;

create policy "Users can read own nutrilog preferences"
on public.nutrilog_user_preferences for select
using (auth.uid() = user_id);

create policy "Users can insert own nutrilog preferences"
on public.nutrilog_user_preferences for insert
with check (auth.uid() = user_id);

create policy "Users can update own nutrilog preferences"
on public.nutrilog_user_preferences for update
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

create policy "Users can delete own nutrilog preferences"
on public.nutrilog_user_preferences for delete
using (auth.uid() = user_id);

create policy "Users can manage own meals"
on public.meals for all
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

create policy "Users can manage own meal ingredients"
on public.meal_ingredients for all
using (auth.uid() = user_id)
with check (
  auth.uid() = user_id
  and exists (
    select 1 from public.meals m
    where m.id = meal_id and m.user_id = auth.uid()
  )
);

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

create policy "Users can manage own grocery extra items"
on public.grocery_extra_items for all
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

create policy "Users can manage own grocery checkoffs"
on public.grocery_checkoffs for all
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

create or replace function public.handle_new_nutrilog_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.nutrilog_user_preferences (user_id)
  values (new.id)
  on conflict (user_id) do nothing;

  return new;
end;
$$;

drop trigger if exists on_auth_user_created_nutrilog on auth.users;
create trigger on_auth_user_created_nutrilog
after insert on auth.users
for each row execute function public.handle_new_nutrilog_user();
