-- Adds structured cooking instructions to meals: an ordered array of sections, each with an
-- optional heading and an ordered list of step strings, e.g.:
-- [{"heading": "Marinade", "steps": ["Mix soy sauce and garlic", "Add chicken and coat"]},
--  {"heading": "Cook", "steps": ["Heat pan", "Sear chicken 4 min per side"]}]
-- Distinct from the existing free-text notes field. Safe to run whether or not this migration
-- has already applied.

alter table public.meals
  add column if not exists instructions jsonb not null default '[]'::jsonb;
