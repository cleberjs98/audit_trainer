-- Allow authenticated users to read public.profiles through existing RLS policies.
-- This grants table-level SELECT only; RLS still limits which profile rows are visible.
GRANT SELECT ON public.profiles TO authenticated;
