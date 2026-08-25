-- LotLift: paid heavy-item hauls from retailer lots to doors.

create table if not exists haul_waivers (
  user_id text primary key,
  legal_name text not null,
  version text not null,
  accepted_at timestamptz not null default now()
);

create table if not exists crew_profiles (
  user_id text primary key,
  display_name text not null default '',
  paypal_email text not null default '',
  vehicle text not null default 'pickup',
  crew_size integer not null default 2,
  updated_at timestamptz not null default now()
);

create table if not exists hauls (
  id serial primary key,
  customer_id text not null,
  customer_name text not null,
  retailer text not null,
  store_address text not null,
  dropoff_address text not null,
  neighborhood text not null,
  item_title text not null,
  item_notes text not null,
  item_key text not null,
  size_class text not null,
  stairs integer not null default 0,
  miles integer not null,
  helpers integer not null default 2,
  truck text not null default 'pickup',
  pickup_window text not null,
  photo_url text not null default '',
  price_cents integer not null,
  take_cents integer not null,
  crew_cents integer not null,
  status text not null default 'open'
    check (status in ('open', 'claimed', 'picked_up', 'delivered', 'cancelled')),
  funded boolean not null default false,
  crew_id text,
  crew_name text,
  crew_paypal_email text not null default '',
  created_at timestamptz not null default now()
);

create index if not exists hauls_status_idx on hauls (status, created_at desc);
create index if not exists hauls_customer_idx on hauls (customer_id);
create index if not exists hauls_crew_idx on hauls (crew_id);

create table if not exists haul_checkouts (
  order_id text primary key,
  user_id text not null,
  payload text not null,
  status text not null default 'created' check (status in ('created', 'captured', 'void')),
  created_at timestamptz not null default now()
);

create table if not exists haul_payments (
  id serial primary key,
  haul_id integer not null references hauls(id) on delete cascade,
  payer_user_id text not null,
  amount_cents integer not null,
  take_cents integer not null,
  crew_cents integer not null,
  status text not null check (status in ('captured', 'refunded')),
  paypal_order_id text,
  paypal_capture_id text,
  payout_status text not null default 'held',
  payout_batch_id text,
  created_at timestamptz not null default now()
);

create table if not exists haul_reviews (
  id serial primary key,
  haul_id integer not null references hauls(id) on delete cascade,
  author_user_id text not null,
  role text not null check (role in ('customer', 'crew')),
  rating integer not null check (rating between 1 and 5),
  comment text not null default '',
  created_at timestamptz not null default now(),
  unique (haul_id, author_user_id)
);

insert into hauls (
  customer_id, customer_name, retailer, store_address, dropoff_address, neighborhood,
  item_title, item_notes, item_key, size_class, stairs, miles, helpers, truck,
  pickup_window, photo_url, price_cents, take_cents, crew_cents, status, funded
) values
  ('community', 'Priya N.', 'IKEA', 'IKEA, 1 Marketplace Dr, loading dock B', '418 Willow Ave, 2nd floor', 'Riverside',
   'Kivik three-seat sofa', 'Still boxed. Elevator out — two flights of stairs.', 'sofa', 'large', 2, 7, 2, 'pickup',
   'Today 4–7pm', '/hauls/sofa.jpg', 19900, 3980, 15920, 'open', true),
  ('community', 'Marcus T.', 'Home Depot', 'Home Depot lot, bay 9, ask at lumber', '22 Oak Court, garage', 'Eastside',
   'Front-load washer', 'On a pallet. Ground-floor garage. Keep the crate.', 'washer', 'medium', 0, 4, 2, 'pickup',
   'Tomorrow 10am–1pm', '/hauls/washer.jpg', 8900, 1780, 7120, 'open', true),
  ('community', 'Elena V.', 'Best Buy', 'Best Buy curb, order #B-44119', '90 Harbor St, apt 12B', 'Midtown',
   '75-inch TV in carton', 'Do not lay flat. Building has a freight elevator.', 'tv', 'medium', 0, 6, 2, 'van',
   'Tonight 6–8pm', '/hauls/tv.jpg', 10700, 2140, 8560, 'open', true),
  ('community', 'Chris D.', 'Costco', 'Costco tire center lot', '7 Pine Ridge, basement gym', 'Hills',
   'Folding treadmill', 'Long box. One flight down to the basement.', 'treadmill', 'large', 1, 11, 2, 'pickup',
   'Saturday 9am–noon', '/hauls/treadmill.jpg', 18300, 3660, 14640, 'open', true),
  ('community', 'Amina K.', 'Lowe’s', 'Lowe’s garden center, pallet 4', '55 Courtland, backyard', 'West End',
   'Stainless gas grill', 'Leave on the patio. Assembly not requested.', 'grill', 'medium', 0, 5, 2, 'pickup',
   'Sunday 12–3pm', '/hauls/grill.jpg', 8900, 1780, 7120, 'open', true),
  ('community', 'Jonah P.', 'Ashley', 'Ashley outlet loading bay', '310 Sycamore, bedroom', 'Old Town',
   'Walnut six-drawer dresser', 'Blankets on. Tight hallway — two people.', 'dresser', 'medium', 1, 9, 2, 'van',
   'Friday 2–5pm', '/hauls/dresser.jpg', 13500, 2700, 10800, 'open', true),
  ('community', 'Sofia R.', 'Mattress Firm', 'Mattress Firm curb, king in wrap', '12 Birch Lane, upstairs bedroom', 'Lakeside',
   'King mattress', 'Plastic wrap on. Two flights, no elevator.', 'mattress', 'large', 2, 8, 2, 'van',
   'Today 5–8pm', '/hauls/mattress.jpg', 21700, 4340, 17360, 'open', true)
on conflict do nothing;
