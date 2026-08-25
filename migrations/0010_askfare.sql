-- Askfare: named-price pickup & delivery. Independents accept or counter.

create table if not exists ask_waivers (
  user_id text primary key,
  legal_name text not null,
  version text not null,
  accepted_at timestamptz not null default now()
);

create table if not exists runner_profiles (
  user_id text primary key,
  display_name text not null default '',
  paypal_email text not null default '',
  vehicle text not null default 'car',
  updated_at timestamptz not null default now()
);

create table if not exists runs (
  id serial primary key,
  customer_id text not null,
  customer_name text not null,
  is_business boolean not null default false,
  business_name text not null default '',
  kind text not null,
  store text not null,
  order_ref text not null default '',
  pickup_address text not null,
  dropoff_address text not null,
  neighborhood text not null,
  notes text not null,
  item_key text not null,
  pickup_window text not null,
  photo_url text not null default '',
  offer_cents integer not null,
  locked_cents integer,
  take_cents integer not null default 0,
  runner_cents integer not null default 0,
  status text not null default 'open'
    check (status in ('open', 'pending_pay', 'locked', 'picked_up', 'delivered', 'cancelled')),
  funded boolean not null default false,
  runner_id text,
  runner_name text,
  runner_paypal_email text not null default '',
  created_at timestamptz not null default now()
);

create index if not exists runs_status_idx on runs (status, created_at desc);
create index if not exists runs_customer_idx on runs (customer_id);
create index if not exists runs_runner_idx on runs (runner_id);

create table if not exists run_counters (
  id serial primary key,
  run_id integer not null references runs(id) on delete cascade,
  runner_id text not null,
  runner_name text not null,
  amount_cents integer not null,
  message text not null default '',
  status text not null default 'pending'
    check (status in ('pending', 'accepted', 'declined', 'withdrawn')),
  created_at timestamptz not null default now(),
  unique (run_id, runner_id)
);

create table if not exists run_checkouts (
  order_id text primary key,
  run_id integer not null references runs(id) on delete cascade,
  user_id text not null,
  amount_cents integer not null,
  status text not null default 'created' check (status in ('created', 'captured', 'void')),
  created_at timestamptz not null default now()
);

create table if not exists run_payments (
  id serial primary key,
  run_id integer not null references runs(id) on delete cascade,
  payer_user_id text not null,
  amount_cents integer not null,
  take_cents integer not null,
  runner_cents integer not null,
  status text not null check (status in ('captured', 'refunded')),
  paypal_order_id text,
  paypal_capture_id text,
  payout_status text not null default 'held',
  payout_batch_id text,
  created_at timestamptz not null default now()
);

insert into runs (
  customer_id, customer_name, is_business, business_name, kind, store, order_ref,
  pickup_address, dropoff_address, neighborhood, notes, item_key, pickup_window,
  photo_url, offer_cents, take_cents, runner_cents, status, funded
) values
  ('community', 'Priya N.', false, '', 'retail', 'Target', 'Order B-4412',
   'Target pickup lane, name Priya', '418 Willow Ave', 'Riverside',
   'Two bags + a boxed blender. Ready at guest services.', 'boxes', 'Today 5–7pm',
   '/runs/boxes.jpg', 2200, 440, 1760, 'open', true),
  ('community', 'Harbor Dental', true, 'Harbor Dental', 'retail', 'Best Buy', 'PO-88',
   'Best Buy will-call, business pickup', '90 Harbor St, suite 2', 'Midtown',
   'Office monitor in carton. Need it before 10am tomorrow.', 'electronics', 'Tomorrow 8–10am',
   '/runs/electronics.jpg', 3500, 700, 2800, 'open', true),
  ('community', 'Marcus T.', false, '', 'restaurant', 'Thai House', 'Pickup Marcus',
   'Thai House counter, order under Marcus', '22 Oak Court', 'Eastside',
   'Two bags, extra rice. Keep upright.', 'takeout', 'Tonight 6:30–7:15pm',
   '/runs/takeout.jpg', 1200, 240, 960, 'open', true),
  ('community', 'Elena V.', false, '', 'pharmacy', 'CVS', 'Rx ready',
   'CVS drive-thru, DOB on file', '90 Harbor St, apt 12B', 'Midtown',
   'One white bag. ID may be asked. Do not leave on the stoop.', 'pharmacy', 'Today 4–6pm',
   '/runs/pharmacy.jpg', 1800, 360, 1440, 'open', true),
  ('community', 'Lakeside Cafe', true, 'Lakeside Cafe', 'hardware', 'Home Depot', 'Will-call 19',
   'Home Depot lot, bay 4, ask at lumber', '12 Birch Lane, back door', 'Lakeside',
   'Replacement faucet boxed. Shop needs it before the dinner rush.', 'hardware', 'Today 2–4pm',
   '/runs/hardware.jpg', 2800, 560, 2240, 'open', true)
on conflict do nothing;

insert into run_counters (run_id, runner_id, runner_name, amount_cents, message, status)
select id, 'seed-runner', 'Devon K.', 2800, 'I can do 5:30 with a hatchback.', 'pending'
from runs where order_ref = 'Order B-4412' limit 1
on conflict do nothing;
