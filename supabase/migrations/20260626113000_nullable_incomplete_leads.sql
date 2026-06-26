alter table leads
  alter column departure_city drop not null,
  alter column arrival_city drop not null,
  alter column departure_date drop not null,
  alter column passenger_count drop not null,
  alter column trip_type drop not null;

update leads
set
  departure_city = case when 'departure_city' = any(missing_fields) then null else departure_city end,
  arrival_city = case when 'arrival_city' = any(missing_fields) then null else arrival_city end,
  departure_date = case when 'departure_date' = any(missing_fields) then null else departure_date end,
  passenger_count = case when 'passenger_count' = any(missing_fields) then null else passenger_count end,
  trip_type = case when 'trip_type' = any(missing_fields) then null else trip_type end;

alter table leads
  add constraint leads_required_fields_for_qualified_status check (
    status not in ('QUALIFIED', 'QUOTE_READY', 'QUOTE_SENT', 'WON', 'LOST', 'CLOSED')
    or (
      departure_city is not null
      and arrival_city is not null
      and departure_date is not null
      and passenger_count is not null
      and trip_type is not null
    )
  );
