-- Allow the trusted backend key to access Frontier Radar tables.
-- Public browser users still only access explicitly granted views.

grant usage on schema public to service_role;

grant select, insert, update, delete
on all tables in schema public
to service_role;

grant usage, select
on all sequences in schema public
to service_role;

-- Apply the same permissions to tables created by future migrations.
alter default privileges for role postgres in schema public
grant select, insert, update, delete on tables to service_role;

alter default privileges for role postgres in schema public
grant usage, select on sequences to service_role;
