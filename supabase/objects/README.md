# NutriLog Supabase Objects

These files split the initial Supabase schema into per-object definitions for review.

This schema is designed to run in the **same Supabase project as SweatLog**. To avoid
colliding with SweatLog's existing objects, table/function/trigger names that would
otherwise clash are prefixed or suffixed with `nutrilog`:

- `nutrilog_user_preferences` (SweatLog already has a `user_preferences` table)
- `handle_new_nutrilog_user` / `on_auth_user_created_nutrilog` (SweatLog already has a
  `handle_new_user` function and `on_auth_user_created` trigger on `auth.users`)

Everything else (`meals`, `meal_ingredients`, `scheduled_meals`, `grocery_extra_items`,
`grocery_checkoffs`, and the shared `set_updated_at()` function / `pgcrypto` extension)
has no name overlap with SweatLog's schema.

Run `../migrations/20260727000000_initial_schema.up.sql` to create everything in one pass.
The numbered object files are ordered by dependency if you need to inspect or run
individual pieces manually.

For Walmart product links on an existing database, run
`../migrations/20260910000000_add_walmart_product_links.up.sql` before importing
or saving ingredients with `walmartUrl`. The cart handoff itself requires no API key.

Run `../migrations/20260910000001_add_scheduled_meal_completion.up.sql` once
to track eaten status per scheduled date. Existing repeated recipes start unchecked
because their old shared completion flag cannot identify the dates actually eaten.
Single-occurrence completed recipes retain their completion.
