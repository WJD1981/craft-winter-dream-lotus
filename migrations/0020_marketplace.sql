-- Chat, live status, tips, inbox, blocks, reports, saved addresses, share-a-trip.

alter table runs add column if not exists progress text not null default 'idle';
alter table runs add column if not exists share_token text;
alter table runs add column if not exists tip_cents integer not null default 0;
alter table runs add column if not exists tip_status text not null default 'none';

alter table run_checkouts add column if not exists kind text not null default 'lock';

create table if not exists run_messages (
  id serial primary key,
  run_id integer not null references runs(id) on delete cascade,
  from_user_id text not null,
  body text not null,
  created_at timestamptz not null default now()
);

create table if not exists notifications (
  id serial primary key,
  user_id text not null,
  kind text not null,
  title text not null,
  body text not null default '',
  href text not null default '',
  read boolean not null default false,
  created_at timestamptz not null default now()
);

create index if not exists notifications_user on notifications (user_id, read, created_at desc);

create table if not exists user_blocks (
  user_id text not null,
  blocked_id text not null,
  created_at timestamptz not null default now(),
  primary key (user_id, blocked_id)
);

create table if not exists user_reports (
  id serial primary key,
  from_user_id text not null,
  about_user_id text not null,
  run_id integer,
  reason text not null,
  note text not null default '',
  created_at timestamptz not null default now()
);

create table if not exists saved_addresses (
  id serial primary key,
  user_id text not null,
  label text not null,
  address text not null,
  created_at timestamptz not null default now()
);
