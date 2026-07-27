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

drop trigger if exists set_meal_ingredients_updated_at on public.meal_ingredients;
create trigger set_meal_ingredients_updated_at
before update on public.meal_ingredients
for each row execute function public.set_updated_at();

alter table public.meal_ingredients enable row level security;

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
