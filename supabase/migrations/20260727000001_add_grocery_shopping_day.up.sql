-- Adds the "grocery shopping day" preference (nullable weekday, 0=Sunday..6=Saturday).
-- Safe to run whether or not the initial schema migration already ran.

alter table public.nutrilog_user_preferences
  add column if not exists grocery_shopping_day integer;

alter table public.nutrilog_user_preferences
  drop constraint if exists nutrilog_user_preferences_grocery_shopping_day_check;

alter table public.nutrilog_user_preferences
  add constraint nutrilog_user_preferences_grocery_shopping_day_check
  check (grocery_shopping_day is null or grocery_shopping_day between 0 and 6);
