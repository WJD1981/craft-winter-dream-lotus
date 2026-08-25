-- In-app payment for sales, captured when a plate is claimed.
-- Gifts and trades never generate a payment.

alter table listings
  add column if not exists for_need boolean not null default false;

create table if not exists payments (
  id serial primary key,
  listing_id integer not null references listings(id) on delete cascade,
  claim_id integer references claims(id) on delete set null,
  payer_user_id text not null,
  amount_cents integer not null check (amount_cents > 0),
  take_cents integer not null check (take_cents >= 0),
  cook_cents integer not null check (cook_cents >= 0),
  status text not null check (status in ('captured', 'refunded')),
  brand text not null,
  last4 text not null,
  cardholder text not null,
  created_at timestamptz not null default now()
);

create index if not exists payments_listing_idx on payments (listing_id);
create index if not exists payments_claim_idx on payments (claim_id);
create index if not exists payments_payer_idx on payments (payer_user_id);

update listings
  set for_need = true
  where offer_type = 'donate' and user_id = 'community';
