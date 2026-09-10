-- A recipe may appear on several dates; completion belongs to one occurrence.
alter table public.scheduled_meals add column if not exists is_completed boolean not null default false;

-- Only single-occurrence recipe history is unambiguous. Repeated recipes start
-- unchecked because the old global status cannot identify which date was eaten.
update public.scheduled_meals s set is_completed = true
from public.meals m
where s.meal_id = m.id and m.status = 'completed'
  and (select count(*) from public.scheduled_meals other where other.meal_id = m.id) = 1;
