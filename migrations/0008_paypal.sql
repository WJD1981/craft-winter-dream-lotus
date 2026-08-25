-- Real PayPal checkout (buyer → table) and payouts (table → cook).

create table if not exists platform_settings (
  id integer primary key check (id = 1),
  paypal_client_id text not null default '',
  paypal_secret text not null default '',
  paypal_mode text not null default 'sandbox' check (paypal_mode in ('sandbox', 'live')),
  updated_at timestamptz not null default now()
);

insert into platform_settings (id) values (1)
  on conflict (id) do nothing;

create table if not exists user_profiles (
  user_id text primary key,
  paypal_email text not null default '',
  updated_at timestamptz not null default now()
);

alter table listings add column if not exists paypal_email text not null default '';

create table if not exists paypal_checkouts (
  order_id text primary key,
  listing_id integer not null references listings(id) on delete cascade,
  user_id text not null,
  claimant_name text not null,
  message text not null,
  status text not null default 'created' check (status in ('created', 'captured', 'void')),
  created_at timestamptz not null default now()
);

alter table payments add column if not exists paypal_order_id text;
alter table payments add column if not exists paypal_capture_id text;
alter table payments add column if not exists payout_status text not null default 'none';
alter table payments add column if not exists payout_batch_id text;
alter table payments add column if not exists cook_paypal_email text not null default '';
