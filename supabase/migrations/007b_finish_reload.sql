-- Verify policies exist (fixed column name)
select policyname, cmd from pg_policies
where tablename = 'messages' and schemaname = 'public';

-- Verify my_profile_id() exists
select routine_name from information_schema.routines
where routine_schema = 'public' and routine_name = 'my_profile_id';

-- Fire the schema reload (both methods)
notify pgrst, 'reload schema';
select pg_notify('pgrst', 'reload schema');
