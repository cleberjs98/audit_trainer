-- Audit hard delete support.
-- Audit-owned child rows already cascade from public.audits in the existing
-- schema, including answers, people, evidence metadata, ai_insights, and
-- audit-linked action plans/items. This migration only grants and scopes the
-- audit row DELETE itself.

DROP POLICY IF EXISTS audits_delete ON public.audits;

CREATE POLICY audits_delete ON public.audits
  FOR DELETE USING (
    is_admin()
    OR (
      get_my_role() = 'area_manager'
      AND store_id IN (
        SELECT stores.id
        FROM public.stores
        WHERE stores.area_id = get_my_area_id()
      )
    )
    OR (
      get_my_role() = 'store_manager'
      AND store_id = get_my_store_id()
    )
    OR (
      get_my_role() = 'leader'
      AND audited_by = auth.uid()
      AND status IN ('draft', 'in_progress')
    )
  );

GRANT DELETE ON public.audits TO authenticated;


-- Completed audit hard deletes need to remove private Storage objects before
-- the audit row is deleted. Keep normal photo evidence delete policies
-- editable-only, and add a separate object delete path that mirrors audit
-- delete authorization.
CREATE OR REPLACE FUNCTION public.can_delete_audit_v1(
  p_audit_id uuid,
  p_store_id uuid
)
RETURNS boolean
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_actor public.profiles%ROWTYPE;
  v_audit public.audits%ROWTYPE;
  v_store_area_id uuid;
BEGIN
  IF auth.uid() IS NULL THEN
    RETURN false;
  END IF;

  SELECT *
  INTO v_actor
  FROM public.profiles
  WHERE id = auth.uid();

  IF NOT FOUND THEN
    RETURN false;
  END IF;

  SELECT *
  INTO v_audit
  FROM public.audits
  WHERE id = p_audit_id;

  IF NOT FOUND OR v_audit.store_id IS DISTINCT FROM p_store_id THEN
    RETURN false;
  END IF;

  IF v_actor.role = 'admin' THEN
    RETURN true;
  END IF;

  SELECT stores.area_id
  INTO v_store_area_id
  FROM public.stores
  WHERE stores.id = p_store_id;

  IF NOT FOUND THEN
    RETURN false;
  END IF;

  RETURN (
    (
      v_actor.role = 'area_manager'
      AND v_actor.area_id = v_store_area_id
    )
    OR (
      v_actor.role = 'store_manager'
      AND v_actor.store_id = p_store_id
    )
    OR (
      v_actor.role = 'leader'
      AND v_audit.audited_by = auth.uid()
      AND v_audit.status IN ('draft', 'in_progress')
    )
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.can_delete_audit_evidence_storage_path_v1(
  p_path text
)
RETURNS boolean
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_store_id uuid;
  v_audit_id uuid;
  v_question_id uuid;
BEGIN
  IF split_part(p_path, '/', 1) <> 'stores'
    OR split_part(p_path, '/', 3) <> 'audits'
    OR split_part(p_path, '/', 5) <> 'questions' THEN
    RETURN false;
  END IF;

  IF split_part(p_path, '/', 2) !~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
    OR split_part(p_path, '/', 4) !~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
    OR split_part(p_path, '/', 6) !~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
    OR split_part(p_path, '/', 7) = '' THEN
    RETURN false;
  END IF;

  v_store_id := split_part(p_path, '/', 2)::uuid;
  v_audit_id := split_part(p_path, '/', 4)::uuid;
  v_question_id := split_part(p_path, '/', 6)::uuid;

  IF NOT EXISTS (
    SELECT 1
    FROM public.audit_questions AS question
    WHERE question.id = v_question_id
  ) THEN
    RETURN false;
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM public.audit_evidence AS evidence
    WHERE evidence.audit_id = v_audit_id
      AND evidence.store_id = v_store_id
      AND evidence.question_id = v_question_id
      AND evidence.file_path = p_path
  ) THEN
    RETURN false;
  END IF;

  RETURN public.can_delete_audit_v1(v_audit_id, v_store_id);
END;
$$;

REVOKE ALL ON FUNCTION public.can_delete_audit_v1(uuid, uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.can_delete_audit_evidence_storage_path_v1(text)
  FROM PUBLIC;

GRANT EXECUTE ON FUNCTION public.can_delete_audit_v1(uuid, uuid)
  TO authenticated;
GRANT EXECUTE ON FUNCTION public.can_delete_audit_evidence_storage_path_v1(text)
  TO authenticated;

DROP POLICY IF EXISTS audit_evidence_objects_hard_delete
  ON storage.objects;

CREATE POLICY audit_evidence_objects_hard_delete ON storage.objects
  FOR DELETE TO authenticated
  USING (
    bucket_id = 'audit-evidence'
    AND public.can_delete_audit_evidence_storage_path_v1(name)
  );
