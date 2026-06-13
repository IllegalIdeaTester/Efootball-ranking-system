-- Create table to store app state as key/value JSON
create table if not exists app_state (
  key text primary key,
  value jsonb
);

-- Optional: initialize empty state rows
insert into app_state (key, value) values
('players', '[]'::jsonb)
on conflict (key) do nothing;

insert into app_state (key, value) values
('matches', '[]'::jsonb)
on conflict (key) do nothing;

-- Optional: enable row level security (RLS) and allow selects for anon
-- alter table app_state enable row level security;
-- create policy "allow_select_for_public" on app_state
--   for select
--   using (true);
