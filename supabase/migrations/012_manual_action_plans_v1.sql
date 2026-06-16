-- Manual Action Plans V1
--
-- Enables authenticated, RLS-scoped manual action plan management.
-- No AI generation, storage, audit, or profile policies are changed here.

-- ---------------------------------------------------------------------------
-- 1. Table-level write privileges
-- ---------------------------------------------------------------------------
-- PostgreSQL requires table privileges before RLS policies can allow rows.
-- RLS remains the row-level guard. No DELETE or anon privileges are granted.

GRANT INSERT, UPDATE ON public.action_plans TO authenticated;
GRANT INSERT, UPDATE ON public.action_plan_items TO authenticated;


-- ---------------------------------------------------------------------------
-- 2. action_plans immutability
-- ---------------------------------------------------------------------------
-- action_plans.audit_id and action_plans.store_id define the parent audit/store
-- scope and must not change after insert. Manual V1 plans also must not be
-- changed from generated_by_ai = false to true.

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

  IF OLD.generated_by_ai = false AND NEW.generated_by_ai = true THEN
    RAISE EXCEPTION 'manual action plans cannot be converted to AI-generated plans';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_prevent_action_plan_scope_change
  ON public.action_plans;

CREATE TRIGGER trg_prevent_action_plan_scope_change
  BEFORE UPDATE ON public.action_plans
  FOR EACH ROW EXECUTE FUNCTION public.fn_prevent_action_plan_scope_change();


-- ---------------------------------------------------------------------------
-- 3. action_plan_items completed_at maintenance
-- ---------------------------------------------------------------------------
-- completed_at is set when an item is created/completed as completed and
-- cleared when reopened. Existing completed_at is preserved while status
-- remains completed.

CREATE OR REPLACE FUNCTION public.fn_set_action_item_completed_at()
  RETURNS trigger
  LANGUAGE plpgsql
  SECURITY INVOKER
  SET search_path = public, pg_temp
AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    IF NEW.status = 'completed' AND NEW.completed_at IS NULL THEN
      NEW.completed_at := now();
    ELSIF NEW.status <> 'completed' THEN
      NEW.completed_at := NULL;
    END IF;

    RETURN NEW;
  END IF;

  IF NEW.status = 'completed' AND OLD.status IS DISTINCT FROM 'completed' THEN
    NEW.completed_at := now();
  ELSIF NEW.status = 'completed' AND OLD.status = 'completed' THEN
    NEW.completed_at := OLD.completed_at;
  ELSIF NEW.status <> 'completed' THEN
    NEW.completed_at := NULL;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_set_action_item_completed_at
  ON public.action_plan_items;

CREATE TRIGGER trg_set_action_item_completed_at
  BEFORE INSERT OR UPDATE ON public.action_plan_items
  FOR EACH ROW EXECUTE FUNCTION public.fn_set_action_item_completed_at();


-- ---------------------------------------------------------------------------
-- 4. Scoped action_plans write policies
-- ---------------------------------------------------------------------------
-- Keep existing SELECT and DELETE policies from migration 001.
-- Replace only INSERT/UPDATE so manual V1 can be managed without service role.

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
            public.get_my_role() = 'store_manager'
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
              public.get_my_role() = 'store_manager'
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
              public.get_my_role() = 'store_manager'
              AND store.id = public.get_my_store_id()
            )
          )
      )
    )
  );


-- ---------------------------------------------------------------------------
-- 5. Scoped action_plan_items write policies
-- ---------------------------------------------------------------------------
-- Keep existing SELECT and DELETE policies from migration 001.
-- Leaders remain read-only for Action Plans V1.

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
            public.get_my_role() = 'store_manager'
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
            public.get_my_role() = 'store_manager'
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
            public.get_my_role() = 'store_manager'
            AND plan.store_id = public.get_my_store_id()
          )
        )
    )
  );
