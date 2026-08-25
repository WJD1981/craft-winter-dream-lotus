-- Face profiles for every user, vehicle proof for runners, reviews, runner approval.

create table if not exists user_profiles (
  user_id text primary key,
  display_name text not null default '',
  photo_url text not null default '',
  photo_ack boolean not null default false,
  age integer not null default 0,
  city text not null default '',
  region text not null default '',
  phone text not null default '',
  about text not null default '',
  license_ack boolean not null default false,
  vehicle_year integer not null default 0,
  vehicle_make text not null default '',
  vehicle_model text not null default '',
  vehicle_color text not null default '',
  vehicle_photo_url text not null default '',
  plate_last4 text not null default '',
  updated_at timestamptz not null default now()
);

create table if not exists run_reviews (
  id serial primary key,
  run_id integer not null references runs(id) on delete cascade,
  from_user_id text not null,
  to_user_id text not null,
  rating integer not null,
  communication integer not null default 0,
  punctual integer not null default 0,
  care integer not null default 0,
  note text not null default '',
  created_at timestamptz not null default now(),
  unique (run_id, from_user_id)
);

create index if not exists run_reviews_to_user on run_reviews (to_user_id);
