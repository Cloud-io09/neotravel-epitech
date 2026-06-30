-- Client accounts are backed by Supabase Auth. Each client row is linked to its auth user so
-- the server (service_role) can scope data to the logged-in client. RLS stays deny-all — the
-- authenticated role gets no table grants; all client data access goes through service_role
-- server-side, scoped by auth.uid()/email. Staff vs client is distinguished by
-- app_metadata.role = 'client' on the Supabase user (enforced in app auth guards).

alter table clients add column if not exists auth_user_id uuid;

create unique index if not exists clients_auth_user_id_key
  on clients (auth_user_id)
  where auth_user_id is not null;

create index if not exists clients_email_lower_idx on clients (lower(email));
