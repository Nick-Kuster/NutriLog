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

drop trigger if exists set_meals_updated_at on public.meals;
create trigger set_meals_updated_at
before update on public.meals
for each row execute function public.set_updated_at();

alter table public.meals enable row level security;

create policy "Users can manage own meals"
on public.meals for all
using (auth.uid() = user_id)
with check (auth.uid() = user_id);
