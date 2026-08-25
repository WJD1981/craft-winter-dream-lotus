-- Government ID + selfie verification. Full document numbers are not stored.

create table if not exists identity_verifications (
  user_id text primary key,
  legal_name text not null default '',
  dob date,
  id_type text not null default '',
  id_issuer text not null default '',
  id_last4 text not null default '',
  id_expires date,
  id_front_url text not null default '',
  selfie_url text not null default '',
  status text not null default 'unverified',
  reject_reason text not null default '',
  submitted_at timestamptz,
  decided_at timestamptz
);
