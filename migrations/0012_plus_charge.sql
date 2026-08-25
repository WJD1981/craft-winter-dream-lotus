-- Plus saves the poster 15 points on the take. Runner pay stays 80% of the named fare.
alter table runs add column if not exists charge_cents integer;

update runs
set charge_cents = coalesce(take_cents, 0) + coalesce(runner_cents, 0)
where charge_cents is null;
