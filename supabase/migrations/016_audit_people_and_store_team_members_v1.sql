-- Audit V2.2 Slice 2: audit people fields and store team member registry.
--
-- Adds required operational people context for audits:
--   - Team Member
--   - Barista
--   - MOD / Manager on Duty
--
-- These fields do not affect Pret CE V1 scoring. Core remains /95 and the
-- Outstanding Card bonus remains separate /5.
--
-- The store_team_members table is a store-scoped registry built from audit
-- entry. It is intentionally not a global employee directory yet.

-- ---------------------------------------------------------------------------
-- 1. Enums
-- ---------------------------------------------------------------------------

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_type
    WHERE typnamespace = 'public'::regnamespace
      AND typname = 'audit_person_type'
  ) THEN
    CREATE TYPE public.audit_person_type AS ENUM (
      'team_member',
      'barista',
      'mod'
    );
  END IF;
END;
$$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_type
    WHERE typnamespace = 'public'::regnamespace
      AND typname = 'store_team_member_default_role'
  ) THEN
    CREATE TYPE public.store_team_member_default_role AS ENUM (
      'team_member',
      'barista',
      'manager_on_duty',
      'other'
    );
  END IF;
END;
$$;


-- ---------------------------------------------------------------------------
-- 2. Tables
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.store_team_members (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  store_id uuid NOT NULL REFERENCES public.stores(id) ON DELETE CASCADE,
  display_name text NOT NULL,
  normalized_name text NOT NULL,
  default_role public.store_team_member_default_role NOT NULL DEFAULT 'team_member',
  is_active boolean NOT NULL DEFAULT true,
  created_by uuid NULL REFERENCES public.profiles(id),
  updated_by uuid NULL REFERENCES public.profiles(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),

  CONSTRAINT chk_store_team_members_display_name_not_blank
    CHECK (btrim(display_name) <> ''),
  CONSTRAINT chk_store_team_members_normalized_name_not_blank
    CHECK (btrim(normalized_name) <> ''),
  CONSTRAINT uq_store_team_members_store_normalized_name
    UNIQUE (store_id, normalized_name)
);

CREATE TABLE IF NOT EXISTS public.audit_people (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  audit_id uuid NOT NULL REFERENCES public.audits(id) ON DELETE CASCADE,
  store_id uuid NOT NULL REFERENCES public.stores(id) ON DELETE CASCADE,
  person_type public.audit_person_type NOT NULL,
  team_member_id uuid NULL REFERENCES public.store_team_members(id) ON DELETE SET NULL,
  typed_name text NOT NULL,
  created_by uuid NULL REFERENCES public.profiles(id),
  updated_by uuid NULL REFERENCES public.profiles(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),

  CONSTRAINT chk_audit_people_typed_name_not_blank
    CHECK (btrim(typed_name) <> ''),
  CONSTRAINT uq_audit_people_audit_person_type
    UNIQUE (audit_id, person_type)
);


-- ---------------------------------------------------------------------------
-- 3. Indexes
-- ---------------------------------------------------------------------------

CREATE INDEX IF NOT EXISTS idx_store_team_members_store_id
  ON public.store_team_members (store_id);

CREATE INDEX IF NOT EXISTS idx_store_team_members_default_role
  ON public.store_team_members (default_role);

CREATE INDEX IF NOT EXISTS idx_store_team_members_is_active
  ON public.store_team_members (is_active);

CREATE INDEX IF NOT EXISTS idx_audit_people_audit_id
  ON public.audit_people (audit_id);

CREATE INDEX IF NOT EXISTS idx_audit_people_store_id
  ON public.audit_people (store_id);

CREATE INDEX IF NOT EXISTS idx_audit_people_team_member_id
  ON public.audit_people (team_member_id);


-- ---------------------------------------------------------------------------
-- 4. Normalization and integrity triggers
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.fn_normalize_store_team_member_v1()
  RETURNS trigger
  LANGUAGE plpgsql
  SECURITY INVOKER
  SET search_path = public, pg_temp
AS $$
BEGIN
  IF TG_OP = 'UPDATE' AND NEW.store_id IS DISTINCT FROM OLD.store_id THEN
    RAISE EXCEPTION 'Store team member store cannot be changed';
  END IF;

  NEW.display_name := regexp_replace(btrim(NEW.display_name), '\s+', ' ', 'g');
  NEW.normalized_name := lower(NEW.display_name);

  IF NEW.display_name = '' OR NEW.normalized_name = '' THEN
    RAISE EXCEPTION 'Team member name is required';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_normalize_store_team_member_v1
  ON public.store_team_members;

CREATE TRIGGER trg_normalize_store_team_member_v1
  BEFORE INSERT OR UPDATE ON public.store_team_members
  FOR EACH ROW EXECUTE FUNCTION public.fn_normalize_store_team_member_v1();

CREATE TRIGGER trg_store_team_members_updated_at
  BEFORE UPDATE ON public.store_team_members
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

CREATE OR REPLACE FUNCTION public.fn_validate_audit_people_v1()
  RETURNS trigger
  LANGUAGE plpgsql
  SECURITY DEFINER
  SET search_path = public, pg_temp
AS $$
DECLARE
  v_audit_store_id uuid;
BEGIN
  IF TG_OP = 'UPDATE' THEN
    IF NEW.audit_id IS DISTINCT FROM OLD.audit_id
      OR NEW.store_id IS DISTINCT FROM OLD.store_id
      OR NEW.person_type IS DISTINCT FROM OLD.person_type THEN
      RAISE EXCEPTION 'Audit person scope cannot be changed';
    END IF;
  END IF;

  NEW.typed_name := regexp_replace(btrim(NEW.typed_name), '\s+', ' ', 'g');

  IF NEW.typed_name = '' THEN
    RAISE EXCEPTION 'Audit person name is required';
  END IF;

  SELECT audit.store_id
  INTO v_audit_store_id
  FROM public.audits AS audit
  WHERE audit.id = NEW.audit_id;

  IF v_audit_store_id IS NULL THEN
    RAISE EXCEPTION 'Audit not found';
  END IF;

  IF NEW.store_id IS DISTINCT FROM v_audit_store_id THEN
    RAISE EXCEPTION 'Audit person store must match audit store';
  END IF;

  IF NEW.team_member_id IS NOT NULL
    AND NOT EXISTS (
      SELECT 1
      FROM public.store_team_members AS team_member
      WHERE team_member.id = NEW.team_member_id
        AND team_member.store_id = NEW.store_id
    ) THEN
    RAISE EXCEPTION 'Audit person team member must belong to the same store';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_validate_audit_people_v1
  ON public.audit_people;

CREATE TRIGGER trg_validate_audit_people_v1
  BEFORE INSERT OR UPDATE ON public.audit_people
  FOR EACH ROW EXECUTE FUNCTION public.fn_validate_audit_people_v1();

CREATE TRIGGER trg_audit_people_updated_at
  BEFORE UPDATE ON public.audit_people
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();


-- ---------------------------------------------------------------------------
-- 5. Grants and RLS
-- ---------------------------------------------------------------------------

GRANT SELECT, INSERT, UPDATE ON public.store_team_members TO authenticated;
GRANT SELECT, INSERT, UPDATE ON public.audit_people TO authenticated;

ALTER TABLE public.store_team_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_people ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS store_team_members_select ON public.store_team_members;
DROP POLICY IF EXISTS store_team_members_insert ON public.store_team_members;
DROP POLICY IF EXISTS store_team_members_update ON public.store_team_members;

CREATE POLICY store_team_members_select ON public.store_team_members
  FOR SELECT USING (
    public.is_admin()
    OR store_id IN (
      SELECT id
      FROM public.stores
      WHERE area_id = public.get_my_area_id()
    )
    OR (
      public.get_my_role() IN ('store_manager', 'leader')
      AND store_id = public.get_my_store_id()
    )
  );

CREATE POLICY store_team_members_insert ON public.store_team_members
  FOR INSERT WITH CHECK (
    created_by = auth.uid()
    AND updated_by = auth.uid()
    AND (
      public.is_admin()
      OR store_id IN (
        SELECT id
        FROM public.stores
        WHERE area_id = public.get_my_area_id()
      )
      OR (
        public.get_my_role() IN ('store_manager', 'leader')
        AND store_id = public.get_my_store_id()
      )
    )
  );

CREATE POLICY store_team_members_update ON public.store_team_members
  FOR UPDATE USING (
    public.is_admin()
    OR store_id IN (
      SELECT id
      FROM public.stores
      WHERE area_id = public.get_my_area_id()
    )
    OR (
      public.get_my_role() IN ('store_manager', 'leader')
      AND store_id = public.get_my_store_id()
    )
  ) WITH CHECK (
    updated_by = auth.uid()
    AND (
      public.is_admin()
      OR store_id IN (
        SELECT id
        FROM public.stores
        WHERE area_id = public.get_my_area_id()
      )
      OR (
        public.get_my_role() IN ('store_manager', 'leader')
        AND store_id = public.get_my_store_id()
      )
    )
  );

DROP POLICY IF EXISTS audit_people_select ON public.audit_people;
DROP POLICY IF EXISTS audit_people_insert ON public.audit_people;
DROP POLICY IF EXISTS audit_people_update ON public.audit_people;

CREATE POLICY audit_people_select ON public.audit_people
  FOR SELECT USING (
    public.is_admin()
    OR store_id IN (
      SELECT id
      FROM public.stores
      WHERE area_id = public.get_my_area_id()
    )
    OR (
      public.get_my_role() IN ('store_manager', 'leader')
      AND store_id = public.get_my_store_id()
    )
  );

CREATE POLICY audit_people_insert ON public.audit_people
  FOR INSERT WITH CHECK (
    created_by = auth.uid()
    AND updated_by = auth.uid()
    AND EXISTS (
      SELECT 1
      FROM public.audits AS audit
      JOIN public.stores AS store ON store.id = audit.store_id
      WHERE audit.id = public.audit_people.audit_id
        AND audit.store_id = public.audit_people.store_id
        AND audit.is_locked = false
        AND audit.status IN ('draft', 'in_progress')
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

CREATE POLICY audit_people_update ON public.audit_people
  FOR UPDATE USING (
    EXISTS (
      SELECT 1
      FROM public.audits AS audit
      JOIN public.stores AS store ON store.id = audit.store_id
      WHERE audit.id = public.audit_people.audit_id
        AND audit.store_id = public.audit_people.store_id
        AND audit.is_locked = false
        AND audit.status IN ('draft', 'in_progress')
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
  ) WITH CHECK (
    updated_by = auth.uid()
    AND EXISTS (
      SELECT 1
      FROM public.audits AS audit
      JOIN public.stores AS store ON store.id = audit.store_id
      WHERE audit.id = public.audit_people.audit_id
        AND audit.store_id = public.audit_people.store_id
        AND audit.is_locked = false
        AND audit.status IN ('draft', 'in_progress')
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


-- ---------------------------------------------------------------------------
-- 6. Atomic save RPC
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.save_audit_people_v1(
  p_audit_id uuid,
  p_team_member_name text,
  p_barista_name text,
  p_mod_name text
)
RETURNS TABLE (
  person_type public.audit_person_type,
  typed_name text,
  team_member_id uuid
)
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_actor public.profiles%ROWTYPE;
  v_audit public.audits%ROWTYPE;
  v_store_area_id uuid;
  v_names text[] := ARRAY[p_team_member_name, p_barista_name, p_mod_name];
  v_person_types public.audit_person_type[] := ARRAY[
    'team_member'::public.audit_person_type,
    'barista'::public.audit_person_type,
    'mod'::public.audit_person_type
  ];
  v_default_roles public.store_team_member_default_role[] := ARRAY[
    'team_member'::public.store_team_member_default_role,
    'barista'::public.store_team_member_default_role,
    'manager_on_duty'::public.store_team_member_default_role
  ];
  v_index integer;
  v_display_name text;
  v_normalized_name text;
  v_team_member_id uuid;
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

  SELECT *
  INTO v_audit
  FROM public.audits
  WHERE id = p_audit_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Audit not found or access denied';
  END IF;

  SELECT store.area_id
  INTO v_store_area_id
  FROM public.stores AS store
  WHERE store.id = v_audit.store_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Audit store not found';
  END IF;

  IF v_audit.is_locked = true
    OR v_audit.status NOT IN ('draft', 'in_progress') THEN
    RAISE EXCEPTION 'This audit is locked and cannot be edited';
  END IF;

  IF NOT (
    v_actor.role = 'admin'
    OR (
      v_actor.role = 'area_manager'
      AND v_actor.area_id = v_store_area_id
    )
    OR (
      v_actor.role IN ('store_manager', 'leader')
      AND v_actor.store_id = v_audit.store_id
    )
  ) THEN
    RAISE EXCEPTION 'You do not have permission to edit this audit';
  END IF;

  FOR v_index IN 1..3 LOOP
    v_display_name := regexp_replace(btrim(COALESCE(v_names[v_index], '')), '\s+', ' ', 'g');
    v_normalized_name := lower(v_display_name);

    IF v_display_name = '' THEN
      RAISE EXCEPTION 'All people fields are required';
    END IF;

    IF length(v_display_name) > 120 THEN
      RAISE EXCEPTION 'People names must be 120 characters or fewer';
    END IF;

    INSERT INTO public.store_team_members (
      store_id,
      display_name,
      normalized_name,
      default_role,
      is_active,
      created_by,
      updated_by
    )
    VALUES (
      v_audit.store_id,
      v_display_name,
      v_normalized_name,
      v_default_roles[v_index],
      true,
      auth.uid(),
      auth.uid()
    )
    ON CONFLICT (store_id, normalized_name) DO UPDATE
    SET
      is_active = true,
      updated_by = auth.uid()
    RETURNING id INTO v_team_member_id;

    INSERT INTO public.audit_people (
      audit_id,
      store_id,
      person_type,
      team_member_id,
      typed_name,
      created_by,
      updated_by
    )
    VALUES (
      v_audit.id,
      v_audit.store_id,
      v_person_types[v_index],
      v_team_member_id,
      v_display_name,
      auth.uid(),
      auth.uid()
    )
    ON CONFLICT (audit_id, person_type) DO UPDATE
    SET
      team_member_id = EXCLUDED.team_member_id,
      typed_name = EXCLUDED.typed_name,
      updated_by = auth.uid();
  END LOOP;

  RETURN QUERY
  SELECT
    person.person_type,
    person.typed_name,
    person.team_member_id
  FROM public.audit_people AS person
  WHERE person.audit_id = p_audit_id
    AND person.person_type IN ('team_member', 'barista', 'mod')
  ORDER BY CASE person.person_type
    WHEN 'team_member'::public.audit_person_type THEN 1
    WHEN 'barista'::public.audit_person_type THEN 2
    WHEN 'mod'::public.audit_person_type THEN 3
    ELSE 4
  END;
END;
$$;

REVOKE ALL ON FUNCTION public.save_audit_people_v1(uuid, text, text, text)
  FROM PUBLIC;
REVOKE ALL ON FUNCTION public.save_audit_people_v1(uuid, text, text, text)
  FROM anon;

GRANT EXECUTE ON FUNCTION public.save_audit_people_v1(uuid, text, text, text)
  TO authenticated;
