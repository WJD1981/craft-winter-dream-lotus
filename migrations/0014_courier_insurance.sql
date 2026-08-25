-- Runners must carry courier / cargo insurance before they accept or counter.

alter table runner_profiles add column if not exists insurance_carrier text not null default '';
alter table runner_profiles add column if not exists insurance_policy text not null default '';
alter table runner_profiles add column if not exists insurance_expires date;
alter table runner_profiles add column if not exists insurance_photo_url text not null default '';
alter table runner_profiles add column if not exists insurance_ack boolean not null default false;
