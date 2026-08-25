-- Deletion / copy requests under the Data Retention Policy.

create table if not exists retention_requests (
  id serial primary key,
  user_id text not null,
  kind text not null,
  note text not null default '',
  status text not null default 'open',
  created_at timestamptz not null default now()
);
