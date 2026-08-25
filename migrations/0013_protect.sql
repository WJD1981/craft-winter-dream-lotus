-- Askfare Protect: declared value, optional protection fee, pickup photos, claims.

alter table runs add column if not exists declared_cents integer not null default 0;
alter table runs add column if not exists protect_on boolean not null default false;
alter table runs add column if not exists protect_fee_cents integer not null default 0;
alter table runs add column if not exists protect_cover_cents integer not null default 0;
alter table runs add column if not exists pickup_photo_url text not null default '';
alter table runs add column if not exists drop_photo_url text not null default '';
alter table runs add column if not exists claim_status text not null default 'none';

create table if not exists run_claims (
  id serial primary key,
  run_id integer not null references runs(id) on delete cascade,
  user_id text not null,
  kind text not null check (kind in ('damaged', 'missing')),
  note text not null,
  photo_url text not null default '',
  cover_cents integer not null default 0,
  status text not null default 'open' check (status in ('open', 'approved', 'denied')),
  created_at timestamptz not null default now()
);
