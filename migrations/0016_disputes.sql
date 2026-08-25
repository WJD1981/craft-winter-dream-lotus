-- Dispute resolution: both sides file, the other answers, Askfare decides on The take.

create table if not exists run_disputes (
  id serial primary key,
  run_id integer not null references runs(id) on delete cascade,
  opened_by_id text not null,
  opened_by_role text not null,
  kind text not null,
  note text not null,
  photo_url text not null default '',
  response_note text not null default '',
  response_photo_url text not null default '',
  responded_at timestamptz,
  status text not null default 'open',
  decision_note text not null default '',
  decided_at timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists run_disputes_run_id on run_disputes (run_id);
create index if not exists run_disputes_status on run_disputes (status);
