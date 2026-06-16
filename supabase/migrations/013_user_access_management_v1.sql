-- User & Access Management V1
--
-- Adds the controlled invitation model and scoped assignment helpers needed
-- before first production deploy.
--
-- V1 decisions:
-- - Controlled invitations only; request-access is deferred to V2.
-- - One role and one scope per user:
--   admin: no scope, area_manager: area_id, store_manager/leader: store_id.
-- - profiles.role remains the source of truth for role.
-- - profiles.area_id / profiles.store_id remain the source of truth for scope.
-- - stores.code is the official store number; no duplicate store_number column.
-- - stores.store_manager_id is display/explicit assignment only and must match
--   a profile with role = store_manager assigned to that same store.
-- - Store managers can invite leaders only for their own store but cannot alter
--   active user role/scope in V1.
-- - Multi-store managers are deferred to V2.

-- ---------------------------------------------------------------------------
-- 1. invitation_status enum
-- ---------------------------------------------------------------------------

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_type
    WHERE typnamespace = 'public'::regnamespace
      AND typname = 'invitation_status'
  ) THEN
    CREATE TYPE public.invitation_status AS ENUM (
      'pending',
      'accepted',
      'revoked',
      'expired'
    );
  END IF;
END;
$$;


-- ---------------------------------------------------------------------------
-- 2. Store operational fields
-- ---------------------------------------------------------------------------

ALTER TABLE public.stores
  ADD COLUMN IF NOT EXISTS address_line_1 text NULL,
  ADD COLUMN IF NOT EXISTS address_line_2 text NULL,
  ADD COLUMN IF NOT EXISTS city text NULL,
  ADD COLUMN IF NOT EXISTS county_or_state text NULL,
  ADD COLUMN IF NOT EXISTS postcode text NULL,
  ADD COLUMN IF NOT EXISTS country text NULL,
  ADD COLUMN IF NOT EXISTS phone text NULL,
  ADD COLUMN IF NOT EXISTS email text NULL,
  ADD COLUMN IF NOT EXISTS opening_hours text NULL,
  ADD COLUMN IF NOT EXISTS location_type text NULL,
  ADD COLUMN IF NOT EXISTS terminal text NULL,
  ADD COLUMN IF NOT EXISTS airside_landside text NULL,
  ADD COLUMN IF NOT EXISTS location_notes text NULL,
  ADD COLUMN IF NOT EXISTS store_manager_id uuid NULL REFERENCES public.profiles(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_stores_store_manager_id
  ON public.stores (store_manager_id);


-- ---------------------------------------------------------------------------
-- 3. stores.store_manager_id validation
-- ---------------------------------------------------------------------------
-- The assigned store manager must be an active profile row with role
-- store_manager and profiles.store_id equal to this store id. NULL is allowed.

CREATE OR REPLACE FUNCTION public.fn_validate_store_manager_assignment()
  RETURNS trigger
  LANGUAGE plpgsql
  SECURITY DEFINER
  SET search_path = public, pg_temp
AS $$
BEGIN
  IF NEW.store_manager_id IS NULL THEN
    RETURN NEW;
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM public.profiles AS profile
    WHERE profile.id = NEW.store_manager_id
      AND profile.role = 'store_manager'
      AND profile.store_id = NEW.id
  ) THEN
    RAISE EXCEPTION 'store_manager_id must reference a store_manager profile assigned to this store';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_validate_store_manager_assignment
  ON public.stores;

CREATE TRIGGER trg_validate_store_manager_assignment
  BEFORE INSERT OR UPDATE ON public.stores
  FOR EACH ROW EXECUTE FUNCTION public.fn_validate_store_manager_assignment();


-- ---------------------------------------------------------------------------
-- 4. user_invitations table
-- ---------------------------------------------------------------------------
-- token_hash stores encode(digest(raw_token, 'sha256'), 'hex').
-- The raw token is sent only in the invite link and is never stored.

CREATE TABLE IF NOT EXISTS public.user_invitations (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  email text NOT NULL,
  normalized_email text NOT NULL,
  role public.user_role NOT NULL,
  area_id uuid NULL REFERENCES public.areas(id) ON DELETE SET NULL,
  store_id uuid NULL REFERENCES public.stores(id) ON DELETE SET NULL,
  token_hash text NOT NULL UNIQUE,
  status public.invitation_status NOT NULL DEFAULT 'pending',
  invited_by uuid NOT NULL REFERENCES public.profiles(id) ON DELETE RESTRICT,
  accepted_by uuid NULL REFERENCES public.profiles(id),
  accepted_at timestamptz NULL,
  revoked_at timestamptz NULL,
  expires_at timestamptz NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),

  CONSTRAINT chk_user_invitations_normalized_email
    CHECK (normalized_email = lower(btrim(email))),
  CONSTRAINT chk_user_invitations_role_scope CHECK (
    (role = 'admin'         AND area_id IS NULL     AND store_id IS NULL    ) OR
    (role = 'area_manager'  AND area_id IS NOT NULL AND store_id IS NULL    ) OR
    (role = 'store_manager' AND area_id IS NULL     AND store_id IS NOT NULL) OR
    (role = 'leader'        AND area_id IS NULL     AND store_id IS NOT NULL)
  ),
  CONSTRAINT chk_user_invitations_acceptance_state CHECK (
    (status = 'accepted' AND accepted_by IS NOT NULL AND accepted_at IS NOT NULL)
    OR (status <> 'accepted' AND accepted_by IS NULL AND accepted_at IS NULL)
  ),
  CONSTRAINT chk_user_invitations_revoked_state CHECK (
    (status = 'revoked' AND revoked_at IS NOT NULL)
    OR (status <> 'revoked' AND revoked_at IS NULL)
  )
);

CREATE INDEX IF NOT EXISTS idx_user_invitations_normalized_email
  ON public.user_invitations (normalized_email);

CREATE INDEX IF NOT EXISTS idx_user_invitations_status
  ON public.user_invitations (status);

CREATE INDEX IF NOT EXISTS idx_user_invitations_expires_at
  ON public.user_invitations (expires_at);

CREATE INDEX IF NOT EXISTS idx_user_invitations_invited_by
  ON public.user_invitations (invited_by);

CREATE INDEX IF NOT EXISTS idx_user_invitations_area_id
  ON public.user_invitations (area_id);

CREATE INDEX IF NOT EXISTS idx_user_invitations_store_id
  ON public.user_invitations (store_id);

CREATE UNIQUE INDEX IF NOT EXISTS idx_user_invitations_pending_email
  ON public.user_invitations (normalized_email)
  WHERE status = 'pending';

DROP TRIGGER IF EXISTS trg_user_invitations_updated_at
  ON public.user_invitations;

CREATE TRIGGER trg_user_invitations_updated_at
  BEFORE UPDATE ON public.user_invitations
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();


-- ---------------------------------------------------------------------------
-- 5. Normalize invitation emails
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.fn_normalize_user_invitation_email()
  RETURNS trigger
  LANGUAGE plpgsql
  SECURITY INVOKER
  SET search_path = public, pg_temp
AS $$
BEGIN
  NEW.email := btrim(NEW.email);
  NEW.normalized_email := lower(NEW.email);
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_normalize_user_invitation_email
  ON public.user_invitations;

CREATE TRIGGER trg_normalize_user_invitation_email
  BEFORE INSERT OR UPDATE OF email, normalized_email ON public.user_invitations
  FOR EACH ROW EXECUTE FUNCTION public.fn_normalize_user_invitation_email();


-- ---------------------------------------------------------------------------
-- 5b. Prevent direct mutation of invitation scope/token identity
-- ---------------------------------------------------------------------------
-- RLS can restrict rows, not individual columns. Scoped managers may update
-- pending invitations for resend/revoke flows, but they must not directly
-- rewrite the invited email, token, role, scope, or invited_by identity.

CREATE OR REPLACE FUNCTION public.fn_prevent_invitation_identity_change()
  RETURNS trigger
  LANGUAGE plpgsql
  SECURITY INVOKER
  SET search_path = public, pg_temp
AS $$
BEGIN
  -- Trusted migration/server contexts and app admins may correct invitation
  -- identity fields when required.
  IF current_user IN ('postgres', 'service_role') THEN
    RETURN NEW;
  END IF;

  IF auth.role() = 'service_role' THEN
    RETURN NEW;
  END IF;

  IF public.is_admin() THEN
    RETURN NEW;
  END IF;

  IF NEW.email IS DISTINCT FROM OLD.email
    OR NEW.normalized_email IS DISTINCT FROM OLD.normalized_email
    OR NEW.role IS DISTINCT FROM OLD.role
    OR NEW.area_id IS DISTINCT FROM OLD.area_id
    OR NEW.store_id IS DISTINCT FROM OLD.store_id
    OR NEW.token_hash IS DISTINCT FROM OLD.token_hash
    OR NEW.invited_by IS DISTINCT FROM OLD.invited_by THEN
    RAISE EXCEPTION 'Invitation identity and scope cannot be changed after creation';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_prevent_invitation_identity_change
  ON public.user_invitations;

CREATE TRIGGER trg_prevent_invitation_identity_change
  BEFORE UPDATE ON public.user_invitations
  FOR EACH ROW EXECUTE FUNCTION public.fn_prevent_invitation_identity_change();


-- ---------------------------------------------------------------------------
-- 6. Invitation table privileges and RLS
-- ---------------------------------------------------------------------------

GRANT SELECT, INSERT, UPDATE ON public.user_invitations TO authenticated;

ALTER TABLE public.user_invitations ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS user_invitations_select ON public.user_invitations;
DROP POLICY IF EXISTS user_invitations_insert ON public.user_invitations;
DROP POLICY IF EXISTS user_invitations_update ON public.user_invitations;

CREATE POLICY user_invitations_select ON public.user_invitations
  FOR SELECT USING (
    public.is_admin()
    OR (
      public.get_my_role() = 'area_manager'
      AND (
        area_id = public.get_my_area_id()
        OR store_id IN (
          SELECT id
          FROM public.stores
          WHERE area_id = public.get_my_area_id()
        )
      )
    )
    OR (
      public.get_my_role() = 'store_manager'
      AND role = 'leader'
      AND store_id = public.get_my_store_id()
    )
  );

CREATE POLICY user_invitations_insert ON public.user_invitations
  FOR INSERT WITH CHECK (
    invited_by = auth.uid()
    AND status = 'pending'
    AND accepted_by IS NULL
    AND accepted_at IS NULL
    AND revoked_at IS NULL
    AND expires_at > now()
    AND (
      public.is_admin()
      OR (
        public.get_my_role() = 'area_manager'
        AND role IN ('store_manager', 'leader')
        AND area_id IS NULL
        AND store_id IN (
          SELECT id
          FROM public.stores
          WHERE area_id = public.get_my_area_id()
        )
      )
      OR (
        public.get_my_role() = 'store_manager'
        AND role = 'leader'
        AND area_id IS NULL
        AND store_id = public.get_my_store_id()
      )
    )
  );

CREATE POLICY user_invitations_update ON public.user_invitations
  FOR UPDATE USING (
    public.is_admin()
    OR (
      status = 'pending'
      AND public.get_my_role() = 'area_manager'
      AND (
        area_id = public.get_my_area_id()
        OR store_id IN (
          SELECT id
          FROM public.stores
          WHERE area_id = public.get_my_area_id()
        )
      )
    )
    OR (
      status = 'pending'
      AND public.get_my_role() = 'store_manager'
      AND role = 'leader'
      AND store_id = public.get_my_store_id()
    )
  ) WITH CHECK (
    public.is_admin()
    OR (
      status IN ('pending', 'revoked', 'expired')
      AND accepted_by IS NULL
      AND accepted_at IS NULL
      AND public.get_my_role() = 'area_manager'
      AND role IN ('store_manager', 'leader')
      AND area_id IS NULL
      AND store_id IN (
        SELECT id
        FROM public.stores
        WHERE area_id = public.get_my_area_id()
      )
    )
    OR (
      status IN ('pending', 'revoked', 'expired')
      AND accepted_by IS NULL
      AND accepted_at IS NULL
      AND public.get_my_role() = 'store_manager'
      AND role = 'leader'
      AND area_id IS NULL
      AND store_id = public.get_my_store_id()
    )
  );


-- ---------------------------------------------------------------------------
-- 7. Scoped assignment helper RPC
-- ---------------------------------------------------------------------------
-- Used by /team later. Store managers cannot alter active user role/scope in
-- V1; they can only invite leaders for their own store.

CREATE OR REPLACE FUNCTION public.assign_user_scope_v1(
  target_profile_id uuid,
  target_role public.user_role,
  target_area_id uuid,
  target_store_id uuid
)
  RETURNS TABLE (
    profile_id uuid,
    role public.user_role,
    area_id uuid,
    store_id uuid
  )
  LANGUAGE plpgsql
  SECURITY DEFINER
  SET search_path = public, pg_temp
AS $$
DECLARE
  v_actor public.profiles%ROWTYPE;
  v_target public.profiles%ROWTYPE;
  v_target_store_area_id uuid;
  v_existing_store_area_id uuid;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Authentication required';
  END IF;

  SELECT *
  INTO v_actor
  FROM public.profiles
  WHERE id = auth.uid();

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Profile not found';
  END IF;

  IF v_actor.role NOT IN ('admin', 'area_manager') THEN
    RAISE EXCEPTION 'You do not have permission to assign users';
  END IF;

  IF target_role = 'admin' THEN
    IF target_area_id IS NOT NULL OR target_store_id IS NOT NULL THEN
      RAISE EXCEPTION 'Admin users cannot have area or store scope';
    END IF;
  ELSIF target_role = 'area_manager' THEN
    IF target_area_id IS NULL OR target_store_id IS NOT NULL THEN
      RAISE EXCEPTION 'Area managers require area scope only';
    END IF;
  ELSIF target_role IN ('store_manager', 'leader') THEN
    IF target_store_id IS NULL OR target_area_id IS NOT NULL THEN
      RAISE EXCEPTION 'Store managers and leaders require store scope only';
    END IF;
  ELSE
    RAISE EXCEPTION 'Unsupported role';
  END IF;

  SELECT *
  INTO v_target
  FROM public.profiles
  WHERE id = target_profile_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Target profile not found';
  END IF;

  IF v_actor.role = 'area_manager' THEN
    IF target_role NOT IN ('store_manager', 'leader') THEN
      RAISE EXCEPTION 'Area managers can assign only store managers and leaders';
    END IF;

    IF target_store_id IS NULL THEN
      RAISE EXCEPTION 'Target store is required';
    END IF;

    SELECT area_id
    INTO v_target_store_area_id
    FROM public.stores
    WHERE id = target_store_id;

    IF v_target_store_area_id IS DISTINCT FROM v_actor.area_id THEN
      RAISE EXCEPTION 'Area managers can assign users only inside their area';
    END IF;

    IF v_target.role NOT IN ('store_manager', 'leader') THEN
      RAISE EXCEPTION 'Area managers cannot alter this user role';
    END IF;

    SELECT area_id
    INTO v_existing_store_area_id
    FROM public.stores
    WHERE id = v_target.store_id;

    IF v_existing_store_area_id IS DISTINCT FROM v_actor.area_id THEN
      RAISE EXCEPTION 'Area managers can update only users already inside their area';
    END IF;
  END IF;

  UPDATE public.profiles
  SET
    role = target_role,
    area_id = target_area_id,
    store_id = target_store_id
  WHERE id = target_profile_id
  RETURNING id, profiles.role, profiles.area_id, profiles.store_id
  INTO profile_id, role, area_id, store_id;

  RETURN NEXT;
END;
$$;

REVOKE ALL ON FUNCTION public.assign_user_scope_v1(uuid, public.user_role, uuid, uuid)
  FROM PUBLIC;

GRANT EXECUTE ON FUNCTION public.assign_user_scope_v1(uuid, public.user_role, uuid, uuid)
  TO authenticated;


-- ---------------------------------------------------------------------------
-- 8. Accept invitation RPC
-- ---------------------------------------------------------------------------
-- The authenticated user's email must match the invitation email. The function
-- creates or updates public.profiles and marks the invitation accepted. It
-- returns no token_hash and cannot be used twice.

CREATE OR REPLACE FUNCTION public.accept_invitation_v1(raw_token text)
  RETURNS TABLE (
    invitation_id uuid,
    profile_id uuid,
    role public.user_role,
    area_id uuid,
    store_id uuid,
    status public.invitation_status
  )
  LANGUAGE plpgsql
  SECURITY DEFINER
  SET search_path = public, pg_temp
AS $$
DECLARE
  v_user_id uuid;
  v_user_email text;
  v_full_name text;
  v_token_hash text;
  v_invitation public.user_invitations%ROWTYPE;
BEGIN
  v_user_id := auth.uid();

  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Authentication required';
  END IF;

  IF raw_token IS NULL OR btrim(raw_token) = '' THEN
    RAISE EXCEPTION 'Invitation token is required';
  END IF;

  SELECT
    lower(btrim(email)),
    COALESCE(
      NULLIF(btrim(raw_user_meta_data->>'full_name'), ''),
      NULLIF(btrim(raw_user_meta_data->>'name'), ''),
      NULLIF(btrim(email), ''),
      'Invited user'
    )
  INTO v_user_email, v_full_name
  FROM auth.users
  WHERE id = v_user_id;

  IF v_user_email IS NULL THEN
    RAISE EXCEPTION 'Authenticated user not found';
  END IF;

  v_token_hash := encode(digest(btrim(raw_token), 'sha256'), 'hex');

  SELECT *
  INTO v_invitation
  FROM public.user_invitations
  WHERE token_hash = v_token_hash
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Invitation not found';
  END IF;

  IF v_invitation.status <> 'pending' THEN
    RAISE EXCEPTION 'Invitation is no longer pending';
  END IF;

  IF v_invitation.expires_at <= now() THEN
    UPDATE public.user_invitations
    SET status = 'expired'
    WHERE id = v_invitation.id;

    RAISE EXCEPTION 'Invitation has expired';
  END IF;

  IF v_user_email <> v_invitation.normalized_email THEN
    RAISE EXCEPTION 'Invitation email does not match signed-in user';
  END IF;

  INSERT INTO public.profiles (
    id,
    full_name,
    email,
    role,
    area_id,
    store_id
  )
  VALUES (
    v_user_id,
    v_full_name,
    v_user_email,
    v_invitation.role,
    v_invitation.area_id,
    v_invitation.store_id
  )
  ON CONFLICT (id) DO UPDATE
  SET
    full_name = COALESCE(NULLIF(public.profiles.full_name, ''), EXCLUDED.full_name),
    email = EXCLUDED.email,
    role = EXCLUDED.role,
    area_id = EXCLUDED.area_id,
    store_id = EXCLUDED.store_id;

  UPDATE public.user_invitations
  SET
    status = 'accepted',
    accepted_by = v_user_id,
    accepted_at = now()
  WHERE id = v_invitation.id;

  invitation_id := v_invitation.id;
  profile_id := v_user_id;
  role := v_invitation.role;
  area_id := v_invitation.area_id;
  store_id := v_invitation.store_id;
  status := 'accepted';

  RETURN NEXT;
END;
$$;

REVOKE ALL ON FUNCTION public.accept_invitation_v1(text)
  FROM PUBLIC;

GRANT EXECUTE ON FUNCTION public.accept_invitation_v1(text)
  TO authenticated;


-- ---------------------------------------------------------------------------
-- 9. Revoke invitation RPC
-- ---------------------------------------------------------------------------
-- Revocation is soft-delete by status. Direct DELETE is intentionally not
-- granted to authenticated users for V1.

CREATE OR REPLACE FUNCTION public.revoke_invitation_v1(invitation_id uuid)
  RETURNS TABLE (
    id uuid,
    status public.invitation_status,
    revoked_at timestamptz
  )
  LANGUAGE plpgsql
  SECURITY DEFINER
  SET search_path = public, pg_temp
AS $$
DECLARE
  v_actor public.profiles%ROWTYPE;
  v_invitation public.user_invitations%ROWTYPE;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Authentication required';
  END IF;

  SELECT *
  INTO v_actor
  FROM public.profiles
  WHERE profiles.id = auth.uid();

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Profile not found';
  END IF;

  SELECT *
  INTO v_invitation
  FROM public.user_invitations
  WHERE user_invitations.id = invitation_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Invitation not found';
  END IF;

  IF v_invitation.status <> 'pending' THEN
    RAISE EXCEPTION 'Only pending invitations can be revoked';
  END IF;

  IF v_actor.role = 'admin' THEN
    NULL; -- allowed
  ELSIF v_actor.role = 'area_manager' THEN
    IF NOT EXISTS (
      SELECT 1
      FROM public.stores AS store
      WHERE store.id = v_invitation.store_id
        AND store.area_id = v_actor.area_id
    ) THEN
      RAISE EXCEPTION 'Area managers can revoke invitations only inside their area';
    END IF;

    IF v_invitation.role NOT IN ('store_manager', 'leader') THEN
      RAISE EXCEPTION 'Area managers cannot revoke this invitation role';
    END IF;
  ELSIF v_actor.role = 'store_manager' THEN
    IF v_invitation.role <> 'leader'
      OR v_invitation.store_id IS DISTINCT FROM v_actor.store_id THEN
      RAISE EXCEPTION 'Store managers can revoke only leader invitations for their store';
    END IF;
  ELSE
    RAISE EXCEPTION 'You do not have permission to revoke invitations';
  END IF;

  UPDATE public.user_invitations
  SET
    status = 'revoked',
    revoked_at = now()
  WHERE user_invitations.id = v_invitation.id
  RETURNING user_invitations.id, user_invitations.status, user_invitations.revoked_at
  INTO id, status, revoked_at;

  RETURN NEXT;
END;
$$;

REVOKE ALL ON FUNCTION public.revoke_invitation_v1(uuid)
  FROM PUBLIC;

GRANT EXECUTE ON FUNCTION public.revoke_invitation_v1(uuid)
  TO authenticated;


-- ---------------------------------------------------------------------------
-- 10. Store Management grants and policies
-- ---------------------------------------------------------------------------
-- Preserve the existing store read rules and area-manager scoped insert/update.
-- Store managers and leaders still cannot manage stores in V1.

GRANT INSERT, UPDATE ON public.stores TO authenticated;

DROP POLICY IF EXISTS stores_insert ON public.stores;
DROP POLICY IF EXISTS stores_update ON public.stores;
DROP POLICY IF EXISTS stores_insert_area_manager ON public.stores;
DROP POLICY IF EXISTS stores_update_area_manager ON public.stores;

CREATE POLICY stores_insert ON public.stores
  FOR INSERT WITH CHECK (
    public.is_admin()
    OR (
      public.get_my_role() = 'area_manager'
      AND area_id = public.get_my_area_id()
    )
  );

CREATE POLICY stores_update ON public.stores
  FOR UPDATE USING (
    public.is_admin()
    OR (
      public.get_my_role() = 'area_manager'
      AND area_id = public.get_my_area_id()
    )
  ) WITH CHECK (
    public.is_admin()
    OR (
      public.get_my_role() = 'area_manager'
      AND area_id = public.get_my_area_id()
    )
  );


-- ---------------------------------------------------------------------------
-- 11. Operational leaders for Manual Action Plans
-- ---------------------------------------------------------------------------
-- Migration 012 intentionally kept leaders read-only for action plans. The
-- confirmed User & Access Management V1 business rule makes leaders operational
-- for their own store. App code still needs a follow-up change because current
-- server actions also block leader writes.

DROP POLICY IF EXISTS action_plans_insert ON public.action_plans;
DROP POLICY IF EXISTS action_plans_update ON public.action_plans;

CREATE POLICY action_plans_insert ON public.action_plans
  FOR INSERT WITH CHECK (
    generated_by_ai = false
    AND status = 'open'
    AND EXISTS (
      SELECT 1
      FROM public.audits AS audit
      JOIN public.stores AS store ON store.id = audit.store_id
      WHERE audit.id = public.action_plans.audit_id
        AND audit.status = 'completed'
        AND audit.store_id = public.action_plans.store_id
        AND (
          public.is_admin()
          OR (
            public.get_my_role() = 'area_manager'
            AND store.area_id = public.get_my_area_id()
          )
          OR (
            public.get_my_role() IN ('store_manager', 'leader')
            AND audit.store_id = public.get_my_store_id()
          )
        )
    )
  );

CREATE POLICY action_plans_update ON public.action_plans
  FOR UPDATE USING (
    public.is_admin()
    OR (
      status <> 'completed'
      AND generated_by_ai = false
      AND EXISTS (
        SELECT 1
        FROM public.stores AS store
        WHERE store.id = public.action_plans.store_id
          AND (
            (
              public.get_my_role() = 'area_manager'
              AND store.area_id = public.get_my_area_id()
            )
            OR (
              public.get_my_role() IN ('store_manager', 'leader')
              AND store.id = public.get_my_store_id()
            )
          )
      )
    )
  ) WITH CHECK (
    public.is_admin()
    OR (
      generated_by_ai = false
      AND status IN ('open', 'in_progress', 'completed')
      AND EXISTS (
        SELECT 1
        FROM public.stores AS store
        WHERE store.id = public.action_plans.store_id
          AND (
            (
              public.get_my_role() = 'area_manager'
              AND store.area_id = public.get_my_area_id()
            )
            OR (
              public.get_my_role() IN ('store_manager', 'leader')
              AND store.id = public.get_my_store_id()
            )
          )
      )
    )
  );

DROP POLICY IF EXISTS action_plan_items_insert ON public.action_plan_items;
DROP POLICY IF EXISTS action_plan_items_update ON public.action_plan_items;

CREATE POLICY action_plan_items_insert ON public.action_plan_items
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1
      FROM public.action_plans AS plan
      JOIN public.stores AS store ON store.id = plan.store_id
      WHERE plan.id = public.action_plan_items.action_plan_id
        AND plan.status <> 'completed'
        AND (
          public.is_admin()
          OR (
            public.get_my_role() = 'area_manager'
            AND store.area_id = public.get_my_area_id()
          )
          OR (
            public.get_my_role() IN ('store_manager', 'leader')
            AND plan.store_id = public.get_my_store_id()
          )
        )
    )
  );

CREATE POLICY action_plan_items_update ON public.action_plan_items
  FOR UPDATE USING (
    EXISTS (
      SELECT 1
      FROM public.action_plans AS plan
      JOIN public.stores AS store ON store.id = plan.store_id
      WHERE plan.id = public.action_plan_items.action_plan_id
        AND plan.status <> 'completed'
        AND (
          public.is_admin()
          OR (
            public.get_my_role() = 'area_manager'
            AND store.area_id = public.get_my_area_id()
          )
          OR (
            public.get_my_role() IN ('store_manager', 'leader')
            AND plan.store_id = public.get_my_store_id()
          )
        )
    )
  ) WITH CHECK (
    EXISTS (
      SELECT 1
      FROM public.action_plans AS plan
      JOIN public.stores AS store ON store.id = plan.store_id
      WHERE plan.id = public.action_plan_items.action_plan_id
        AND plan.status <> 'completed'
        AND (
          public.is_admin()
          OR (
            public.get_my_role() = 'area_manager'
            AND store.area_id = public.get_my_area_id()
          )
          OR (
            public.get_my_role() IN ('store_manager', 'leader')
            AND plan.store_id = public.get_my_store_id()
          )
        )
    )
  );
