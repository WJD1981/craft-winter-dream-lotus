-- Askfare Plus: $9.99/month for a 5% take instead of 20%.

alter table runs add column if not exists take_rate numeric not null default 0.20;

create table if not exists plus_members (
  user_id text primary key,
  plus_until timestamptz not null,
  last_order_id text,
  updated_at timestamptz not null default now()
);

create table if not exists plus_orders (
  order_id text primary key,
  user_id text not null,
  status text not null default 'created' check (status in ('created', 'captured', 'void')),
  created_at timestamptz not null default now()
);
