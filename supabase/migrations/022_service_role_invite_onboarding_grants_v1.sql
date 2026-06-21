-- Service-role grants for manual invite onboarding.
--
-- The public /accept-invite page validates raw invite tokens before a user is
-- signed in. That lookup happens only in server code through the Supabase
-- service-role key; anon users still receive no direct table access.

GRANT SELECT, UPDATE ON public.user_invitations TO service_role;

-- Safe display context shown on the invite acceptance page.
GRANT SELECT ON public.areas TO service_role;
GRANT SELECT ON public.stores TO service_role;

-- The server-only accept flow creates/activates the invited user's scoped
-- profile after creating the Supabase Auth user.
GRANT INSERT, UPDATE ON public.profiles TO service_role;
