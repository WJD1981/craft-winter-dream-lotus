-- Sale takes: 20% of paid plates. Gifts and trades are never recorded here.

create table if not exists transactions (
  id serial primary key,
  listing_id integer not null unique references listings(id) on delete cascade,
  claim_id integer references claims(id) on delete set null,
  offer_type text not null check (offer_type = 'sale'),
  price_cents integer not null check (price_cents > 0),
  take_cents integer not null check (take_cents >= 0),
  cook_cents integer not null check (cook_cents >= 0),
  listing_title text not null,
  cook_name text not null,
  claimant_name text not null,
  created_at timestamptz not null default now()
);

create index if not exists transactions_created_idx on transactions (created_at desc);
