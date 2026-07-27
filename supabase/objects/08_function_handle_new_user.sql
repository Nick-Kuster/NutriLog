-- Named handle_new_nutrilog_user / on_auth_user_created_nutrilog (not the bare
-- handle_new_user / on_auth_user_created names) because this runs in the same Supabase
-- project as SweatLog, which already owns a trigger with those names on auth.users.
-- Postgres allows multiple triggers per table/event, so both fire independently on signup.
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
