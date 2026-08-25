-- Kitchen safety course completions

create table if not exists course_completions (
  user_id text primary key,
  version text not null,
  score integer not null,
  answers text not null default '{}',
  completed_at timestamptz not null default now()
);
