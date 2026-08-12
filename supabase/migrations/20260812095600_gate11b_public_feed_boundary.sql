-- Gate 11B-B: move the public frontier feed behind the server boundary.
-- Production application reads frontier_feed_v1 with the server-only service role.
-- Keep base tables private and make the view obey the invoker's privileges.

alter view public.frontier_feed_v1 set (security_invoker = true);

revoke select on public.frontier_feed_v1 from anon, authenticated;
grant select on public.frontier_feed_v1 to service_role;
