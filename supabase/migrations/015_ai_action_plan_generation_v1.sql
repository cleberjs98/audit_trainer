-- AI Action Plan Generation V1
--
-- Fixes the runtime blockers for server-side AI action plan generation:
-- - scoped users may create/manage AI-generated action plans in the same
--   store/area scope as manual action plans;
-- - generated_by_ai is immutable after insert;
-- - create_ai_action_plan_v1 creates the AI insight, action plan, and items
--   atomically in a single PostgreSQL function call.
--
-- Prerequisite: 014_ai_insights_v1.sql must be applied first.

-- ---------------------------------------------------------------------------
-- 1. Keep action plan identity fields immutable
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.fn_prevent_action_plan_scope_change()
  RETURNS trigger
  LANGUAGE plpgsql
  SECURITY INVOKER
  SET search_path = public, pg_temp
AS $$
BEGIN
  -- Allow trusted server/migration execution contexts.
  IF current_user IN ('postgres', 'service_role') THEN
    RETURN NEW;
  END IF;

  IF auth.role() = 'service_role' THEN
    RETURN NEW;
  END IF;

  IF NEW.audit_id IS DISTINCT FROM OLD.audit_id THEN
    RAISE EXCEPTION 'audit_id cannot be changed after action plan creation';
  END IF;

  IF NEW.store_id IS DISTINCT FROM OLD.store_id THEN
    RAISE EXCEPTION 'store_id cannot be changed after action plan creation';
  END IF;

  IF NEW.generated_by_ai IS DISTINCT FROM OLD.generated_by_ai THEN
    RAISE EXCEPTION 'generated_by_ai cannot be changed after action plan creation';
  END IF;

  RETURN NEW;
END;
$$;


-- ---------------------------------------------------------------------------
-- 2. Scoped action plan RLS for manual and AI-generated plans
-- ---------------------------------------------------------------------------
-- Preserve one-plan-per-audit and completed-audit requirements. Do not add
-- DELETE access. RLS remains scoped by admin/all, area manager/own area, and
-- store manager or leader/own store.

DROP POLICY IF EXISTS action_plans_insert ON public.action_plans;
DROP POLICY IF EXISTS action_plans_update ON public.action_plans;

CREATE POLICY action_plans_insert ON public.action_plans
  FOR INSERT WITH CHECK (
    status = 'open'
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
      status IN ('open', 'in_progress', 'completed')
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


-- ---------------------------------------------------------------------------
-- 3. Atomic AI action plan creation RPC
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.create_ai_action_plan_v1(
  p_audit_id uuid,
  p_input_hash text,
  p_prompt_version text,
  p_model text,
  p_payload jsonb
)
  RETURNS TABLE (
    action_plan_id uuid,
    ai_insight_id uuid
  )
  LANGUAGE plpgsql
  SECURITY INVOKER
  SET search_path = public, pg_temp
AS $$
DECLARE
  v_actor public.profiles%ROWTYPE;
  v_audit public.audits%ROWTYPE;
  v_store public.stores%ROWTYPE;
  v_action_plan_id uuid;
  v_ai_insight_id uuid;
  v_item_count integer;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Authentication required';
  END IF;

  IF p_audit_id IS NULL THEN
    RAISE EXCEPTION 'Audit id is required';
  END IF;

  IF p_input_hash IS NULL OR btrim(p_input_hash) = '' THEN
    RAISE EXCEPTION 'AI input hash is required';
  END IF;

  IF p_prompt_version IS NULL OR btrim(p_prompt_version) = '' THEN
    RAISE EXCEPTION 'AI prompt version is required';
  END IF;

  IF p_payload IS NULL OR jsonb_typeof(p_payload) IS DISTINCT FROM 'object' THEN
    RAISE EXCEPTION 'AI payload is required';
  END IF;

  IF jsonb_typeof(p_payload->'action_items') IS DISTINCT FROM 'array' THEN
    RAISE EXCEPTION 'AI payload action_items must be an array';
  END IF;

  v_item_count := jsonb_array_length(p_payload->'action_items');

  IF v_item_count < 3 OR v_item_count > 5 THEN
    RAISE EXCEPTION 'AI action plans require 3 to 5 action items';
  END IF;

  IF jsonb_typeof(p_payload->'executive_summary') IS DISTINCT FROM 'string'
    OR COALESCE(btrim(p_payload->>'executive_summary'), '') = '' THEN
    RAISE EXCEPTION 'AI payload executive_summary is required';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM jsonb_array_elements(p_payload->'action_items') AS item(value)
    WHERE jsonb_typeof(item.value) IS DISTINCT FROM 'object'
      OR btrim(COALESCE(item.value->>'title', '')) = ''
      OR btrim(COALESCE(item.value->>'issue_observed', '')) = ''
      OR btrim(COALESCE(item.value->>'recommended_action', '')) = ''
      OR btrim(COALESCE(item.value->>'owner_suggestion', '')) = ''
      OR btrim(COALESCE(item.value->>'success_measure', '')) = ''
      OR COALESCE(item.value->>'priority', '') NOT IN ('low', 'medium', 'high')
      OR CASE
        WHEN COALESCE(item.value->>'due_in_days', '') ~ '^[0-9]+$'
          THEN (item.value->>'due_in_days')::integer NOT BETWEEN 1 AND 30
        ELSE true
      END
  ) THEN
    RAISE EXCEPTION 'AI payload contains invalid action items';
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

  IF v_audit.status <> 'completed' THEN
    RAISE EXCEPTION 'AI action plans can only be generated for completed audits';
  END IF;

  SELECT *
  INTO v_store
  FROM public.stores
  WHERE id = v_audit.store_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Store not found or access denied';
  END IF;

  IF v_actor.role = 'admin' THEN
    NULL; -- allowed
  ELSIF v_actor.role = 'area_manager' THEN
    IF v_actor.area_id IS NULL OR v_store.area_id IS DISTINCT FROM v_actor.area_id THEN
      RAISE EXCEPTION 'You do not have permission to generate a plan for this audit';
    END IF;
  ELSIF v_actor.role IN ('store_manager', 'leader') THEN
    IF v_actor.store_id IS NULL OR v_audit.store_id IS DISTINCT FROM v_actor.store_id THEN
      RAISE EXCEPTION 'You do not have permission to generate a plan for this audit';
    END IF;
  ELSE
    RAISE EXCEPTION 'You do not have permission to generate AI action plans';
  END IF;

  -- Serialize concurrent generation attempts for the same audit. The unique
  -- action_plans.audit_id constraint remains the final duplicate guard.
  PERFORM pg_advisory_xact_lock(hashtextextended(p_audit_id::text, 0));

  IF EXISTS (
    SELECT 1
    FROM public.action_plans
    WHERE audit_id = p_audit_id
  ) THEN
    RAISE EXCEPTION 'Action plan already exists for this audit';
  END IF;

  INSERT INTO public.action_plans (
    audit_id,
    store_id,
    generated_by_ai,
    status,
    focus_area,
    summary
  )
  VALUES (
    v_audit.id,
    v_audit.store_id,
    true,
    'open',
    COALESCE(NULLIF(btrim(p_payload #>> '{priority_focus,0,area}'), ''), 'AI Action Plan'),
    btrim(p_payload->>'executive_summary')
  )
  RETURNING id INTO v_action_plan_id;

  INSERT INTO public.action_plan_items (
    action_plan_id,
    action_description,
    owner,
    priority,
    due_date,
    success_measure,
    status
  )
  SELECT
    v_action_plan_id,
    concat_ws(
      E'\n\n',
      btrim(item.value->>'title'),
      'Issue observed: ' || btrim(item.value->>'issue_observed'),
      'Recommended action: ' || btrim(item.value->>'recommended_action')
    ),
    NULLIF(btrim(item.value->>'owner_suggestion'), ''),
    (item.value->>'priority')::public.action_priority,
    current_date + (item.value->>'due_in_days')::integer,
    NULLIF(btrim(item.value->>'success_measure'), ''),
    'open'
  FROM jsonb_array_elements(p_payload->'action_items') WITH ORDINALITY AS item(value, item_order)
  ORDER BY item.item_order;

  INSERT INTO public.ai_insights (
    insight_type,
    scope_type,
    audit_id,
    store_id,
    area_id,
    source_audit_ids,
    source_action_plan_ids,
    input_hash,
    prompt_version,
    model,
    payload,
    status,
    generated_by
  )
  VALUES (
    'audit_action_plan',
    'audit',
    v_audit.id,
    v_audit.store_id,
    v_store.area_id,
    ARRAY[v_audit.id],
    ARRAY[v_action_plan_id],
    btrim(p_input_hash),
    btrim(p_prompt_version),
    NULLIF(btrim(COALESCE(p_model, '')), ''),
    p_payload,
    'generated',
    v_actor.id
  )
  RETURNING id INTO v_ai_insight_id;

  action_plan_id := v_action_plan_id;
  ai_insight_id := v_ai_insight_id;

  RETURN NEXT;
END;
$$;

REVOKE ALL ON FUNCTION public.create_ai_action_plan_v1(uuid, text, text, text, jsonb)
  FROM PUBLIC;

GRANT EXECUTE ON FUNCTION public.create_ai_action_plan_v1(uuid, text, text, text, jsonb)
  TO authenticated;
