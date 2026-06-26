alter table clients
  add column if not exists contact_name text,
  add column if not exists phone text,
  add column if not exists active boolean not null default true;
