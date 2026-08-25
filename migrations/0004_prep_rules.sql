-- Required kitchen gear: gloves, hair net, thermometer

alter table waivers
  add column if not exists gloves_ack boolean not null default false;
alter table waivers
  add column if not exists hairnet_ack boolean not null default false;
alter table waivers
  add column if not exists thermometer_ack boolean not null default false;

alter table listings
  add column if not exists gloves_used boolean not null default false;
alter table listings
  add column if not exists hairnet_used boolean not null default false;
alter table listings
  add column if not exists thermometer_used boolean not null default false;

alter table claims
  add column if not exists gloves_ack boolean not null default false;
alter table claims
  add column if not exists hairnet_ack boolean not null default false;
alter table claims
  add column if not exists thermometer_ack boolean not null default false;

update listings
  set gloves_used = true, hairnet_used = true, thermometer_used = true
  where user_id = 'community';
