-- Cargo limit on the runner's courier policy must meet declared item value.

alter table runner_profiles add column if not exists insurance_cover_cents integer not null default 0;

update runs set declared_cents = 8000 where declared_cents = 0 and item_key = 'boxes';
update runs set declared_cents = 20000 where declared_cents = 0 and item_key = 'electronics';
update runs set declared_cents = 4000 where declared_cents = 0 and item_key = 'takeout';
update runs set declared_cents = 5000 where declared_cents = 0 and item_key = 'pharmacy';
update runs set declared_cents = 8000 where declared_cents = 0 and item_key = 'hardware';
update runs set declared_cents = 5000 where declared_cents = 0;
