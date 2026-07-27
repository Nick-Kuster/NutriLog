-- Named nutrilog_user_preferences (not user_preferences) because this schema is designed
-- to run in the same Supabase project as SweatLog, which already owns a user_preferences table.
create table if not exists public.nutrilog_user_preferences (
  user_id uuid primary key references auth.users(id) on delete cascade,
  week_starts_on integer not null default 0 check (week_starts_on between 0 and 6),
  grocery_shopping_day integer check (grocery_shopping_day is null or grocery_shopping_day between 0 and 6),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

drop trigger if exists set_nutrilog_user_preferences_updated_at on public.nutrilog_user_preferences;
create trigger set_nutrilog_user_preferences_updated_at
before update on public.nutrilog_user_preferences
for each row execute function public.set_updated_at();

alter table public.nutrilog_user_preferences enable row level security;

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
