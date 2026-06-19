-- ---------------------------------------------------------------------------
-- 017_fix_save_audit_people_person_type_ambiguity.sql
--
-- Fixes SQL ambiguity in save_audit_people_v1 caused by PL/pgSQL output
-- column names colliding with unqualified conflict-target column names.
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

  SELECT profile_row.*
  INTO v_actor
  FROM public.profiles AS profile_row
  WHERE profile_row.id = auth.uid();

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Profile not found';
  END IF;

  SELECT audit_row.*
  INTO v_audit
  FROM public.audits AS audit_row
  WHERE audit_row.id = p_audit_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Audit not found or access denied';
  END IF;

  SELECT store_row.area_id
  INTO v_store_area_id
  FROM public.stores AS store_row
  WHERE store_row.id = v_audit.store_id;

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

    INSERT INTO public.store_team_members AS stm (
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
    ON CONFLICT ON CONSTRAINT uq_store_team_members_store_normalized_name
    DO UPDATE
    SET
      is_active = true,
      updated_by = auth.uid()
    RETURNING id INTO v_team_member_id;

    INSERT INTO public.audit_people AS ap (
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
    ON CONFLICT ON CONSTRAINT uq_audit_people_audit_person_type
    DO UPDATE
    SET
      team_member_id = EXCLUDED.team_member_id,
      typed_name = EXCLUDED.typed_name,
      updated_by = auth.uid();
  END LOOP;

  RETURN QUERY
  SELECT
    ap.person_type,
    ap.typed_name,
    ap.team_member_id
  FROM public.audit_people AS ap
  WHERE ap.audit_id = p_audit_id
    AND ap.person_type IN (
      'team_member'::public.audit_person_type,
      'barista'::public.audit_person_type,
      'mod'::public.audit_person_type
    )
  ORDER BY CASE ap.person_type
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
