alter table route_pricing
  add column if not exists base_price_eur numeric,
  add column if not exists active boolean not null default true,
  add column if not exists version integer not null default 1;
