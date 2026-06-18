-- AI Insights V1 foundation
--
-- Stores cached AI interpretations of deterministic source datasets.
-- Source-of-truth data remains audits, audit_answers, action_plans,
-- action_plan_items, stores, profiles, SQL, and RLS.
--
-- This migration intentionally does not add OpenAI calls, prompts, server
-- actions, dashboard UI, scoring changes, or completion RPC changes.

-- ---------------------------------------------------------------------------
-- 1. Enums
-- ---------------------------------------------------------------------------

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_type
    WHERE typnamespace = 'public'::regnamespace
      AND typname = 'ai_insight_type'
  ) THEN
    CREATE TYPE public.ai_insight_type AS ENUM (
      'audit_action_plan',
      'audit_summary',
      'store_dashboard',
      'area_dashboard',
      'admin_dashboard'
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
      AND typname = 'ai_scope_type'
  ) THEN
    CREATE TYPE public.ai_scope_type AS ENUM (
      'audit',
      'store',
      'area',
      'global'
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
      AND typname = 'ai_insight_status'
  ) THEN
    CREATE TYPE public.ai_insight_status AS ENUM (
      'generated',
      'accepted',
      'dismissed',
      'stale',
      'expired',
      'failed'
    );
  END IF;
END;
$$;


-- ---------------------------------------------------------------------------
-- 2. Table
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.ai_insights (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  insight_type public.ai_insight_type NOT NULL,
  scope_type public.ai_scope_type NOT NULL,
  audit_id uuid NULL REFERENCES public.audits(id) ON DELETE CASCADE,
  store_id uuid NULL REFERENCES public.stores(id) ON DELETE CASCADE,
  area_id uuid NULL REFERENCES public.areas(id) ON DELETE CASCADE,
  period_start timestamptz NULL,
  period_end timestamptz NULL,
  source_audit_ids uuid[] NOT NULL DEFAULT '{}',
  source_action_plan_ids uuid[] NOT NULL DEFAULT '{}',
  input_hash text NOT NULL,
  prompt_version text NOT NULL DEFAULT 'v2.1.0',
  model text NULL,
  payload jsonb NOT NULL,
  status public.ai_insight_status NOT NULL DEFAULT 'generated',
  generated_by uuid NULL REFERENCES public.profiles(id),
  generated_at timestamptz NOT NULL DEFAULT now(),
  expires_at timestamptz NULL,
  stale_at timestamptz NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),

  CONSTRAINT chk_ai_insights_scope_reference CHECK (
    (scope_type <> 'audit' OR audit_id IS NOT NULL)
    AND (scope_type <> 'store' OR store_id IS NOT NULL)
    AND (scope_type <> 'area' OR area_id IS NOT NULL)
  )
);


-- ---------------------------------------------------------------------------
-- 3. Indexes
-- ---------------------------------------------------------------------------

CREATE INDEX IF NOT EXISTS idx_ai_insights_insight_type
  ON public.ai_insights (insight_type);

CREATE INDEX IF NOT EXISTS idx_ai_insights_scope_type
  ON public.ai_insights (scope_type);

CREATE INDEX IF NOT EXISTS idx_ai_insights_audit_id
  ON public.ai_insights (audit_id);

CREATE INDEX IF NOT EXISTS idx_ai_insights_store_id
  ON public.ai_insights (store_id);

CREATE INDEX IF NOT EXISTS idx_ai_insights_area_id
  ON public.ai_insights (area_id);

CREATE INDEX IF NOT EXISTS idx_ai_insights_status
  ON public.ai_insights (status);

CREATE INDEX IF NOT EXISTS idx_ai_insights_generated_at_desc
  ON public.ai_insights (generated_at DESC);

CREATE INDEX IF NOT EXISTS idx_ai_insights_input_hash
  ON public.ai_insights (input_hash);

CREATE INDEX IF NOT EXISTS idx_ai_insights_store_type_status_generated
  ON public.ai_insights (store_id, insight_type, status, generated_at DESC);

CREATE INDEX IF NOT EXISTS idx_ai_insights_area_type_status_generated
  ON public.ai_insights (area_id, insight_type, status, generated_at DESC);

CREATE INDEX IF NOT EXISTS idx_ai_insights_audit_type_status_generated
  ON public.ai_insights (audit_id, insight_type, status, generated_at DESC);


-- ---------------------------------------------------------------------------
-- 4. updated_at trigger
-- ---------------------------------------------------------------------------

DROP TRIGGER IF EXISTS trg_ai_insights_updated_at
  ON public.ai_insights;

CREATE TRIGGER trg_ai_insights_updated_at
  BEFORE UPDATE ON public.ai_insights
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();


-- ---------------------------------------------------------------------------
-- 5. Grants and RLS
-- ---------------------------------------------------------------------------

GRANT SELECT, INSERT, UPDATE ON public.ai_insights TO authenticated;

ALTER TABLE public.ai_insights ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS ai_insights_select ON public.ai_insights;
DROP POLICY IF EXISTS ai_insights_insert ON public.ai_insights;
DROP POLICY IF EXISTS ai_insights_update ON public.ai_insights;

CREATE POLICY ai_insights_select ON public.ai_insights
  FOR SELECT USING (
    public.is_admin()
    OR (
      public.get_my_role() = 'area_manager'
      AND insight_type <> 'admin_dashboard'
      AND (
        (
          scope_type = 'area'
          AND area_id = public.get_my_area_id()
        )
        OR (
          scope_type = 'store'
          AND store_id IN (
            SELECT id
            FROM public.stores
            WHERE area_id = public.get_my_area_id()
          )
        )
        OR (
          scope_type = 'audit'
          AND audit_id IN (
            SELECT audit.id
            FROM public.audits AS audit
            JOIN public.stores AS store ON store.id = audit.store_id
            WHERE store.area_id = public.get_my_area_id()
          )
        )
      )
    )
    OR (
      public.get_my_role() IN ('store_manager', 'leader')
      AND insight_type <> 'admin_dashboard'
      AND (
        (
          scope_type = 'store'
          AND store_id = public.get_my_store_id()
        )
        OR (
          scope_type = 'audit'
          AND audit_id IN (
            SELECT id
            FROM public.audits
            WHERE store_id = public.get_my_store_id()
          )
        )
      )
    )
  );

CREATE POLICY ai_insights_insert ON public.ai_insights
  FOR INSERT WITH CHECK (
    public.is_admin()
    OR (
      generated_by = auth.uid()
      AND public.get_my_role() = 'area_manager'
      AND insight_type <> 'admin_dashboard'
      AND (
        (
          scope_type = 'area'
          AND area_id = public.get_my_area_id()
        )
        OR (
          scope_type = 'store'
          AND store_id IN (
            SELECT id
            FROM public.stores
            WHERE area_id = public.get_my_area_id()
          )
        )
        OR (
          scope_type = 'audit'
          AND audit_id IN (
            SELECT audit.id
            FROM public.audits AS audit
            JOIN public.stores AS store ON store.id = audit.store_id
            WHERE store.area_id = public.get_my_area_id()
          )
        )
      )
    )
    OR (
      generated_by = auth.uid()
      AND public.get_my_role() = 'store_manager'
      AND insight_type <> 'admin_dashboard'
      AND (
        (
          scope_type = 'store'
          AND store_id = public.get_my_store_id()
        )
        OR (
          scope_type = 'audit'
          AND audit_id IN (
            SELECT id
            FROM public.audits
            WHERE store_id = public.get_my_store_id()
          )
        )
      )
    )
    OR (
      generated_by = auth.uid()
      AND public.get_my_role() = 'leader'
      AND scope_type = 'audit'
      AND insight_type IN ('audit_action_plan', 'audit_summary')
      AND audit_id IN (
        SELECT id
        FROM public.audits
        WHERE store_id = public.get_my_store_id()
      )
    )
  );

CREATE POLICY ai_insights_update ON public.ai_insights
  FOR UPDATE USING (
    public.is_admin()
    OR (
      public.get_my_role() = 'area_manager'
      AND insight_type <> 'admin_dashboard'
      AND (
        (
          scope_type = 'area'
          AND area_id = public.get_my_area_id()
        )
        OR (
          scope_type = 'store'
          AND store_id IN (
            SELECT id
            FROM public.stores
            WHERE area_id = public.get_my_area_id()
          )
        )
        OR (
          scope_type = 'audit'
          AND audit_id IN (
            SELECT audit.id
            FROM public.audits AS audit
            JOIN public.stores AS store ON store.id = audit.store_id
            WHERE store.area_id = public.get_my_area_id()
          )
        )
      )
    )
    OR (
      public.get_my_role() = 'store_manager'
      AND insight_type <> 'admin_dashboard'
      AND (
        (
          scope_type = 'store'
          AND store_id = public.get_my_store_id()
        )
        OR (
          scope_type = 'audit'
          AND audit_id IN (
            SELECT id
            FROM public.audits
            WHERE store_id = public.get_my_store_id()
          )
        )
      )
    )
  ) WITH CHECK (
    public.is_admin()
    OR (
      public.get_my_role() = 'area_manager'
      AND insight_type <> 'admin_dashboard'
      AND (
        (
          scope_type = 'area'
          AND area_id = public.get_my_area_id()
        )
        OR (
          scope_type = 'store'
          AND store_id IN (
            SELECT id
            FROM public.stores
            WHERE area_id = public.get_my_area_id()
          )
        )
        OR (
          scope_type = 'audit'
          AND audit_id IN (
            SELECT audit.id
            FROM public.audits AS audit
            JOIN public.stores AS store ON store.id = audit.store_id
            WHERE store.area_id = public.get_my_area_id()
          )
        )
      )
    )
    OR (
      public.get_my_role() = 'store_manager'
      AND insight_type <> 'admin_dashboard'
      AND (
        (
          scope_type = 'store'
          AND store_id = public.get_my_store_id()
        )
        OR (
          scope_type = 'audit'
          AND audit_id IN (
            SELECT id
            FROM public.audits
            WHERE store_id = public.get_my_store_id()
          )
        )
      )
    )
  );

-- No DELETE policy is added. AI insights are cached snapshots and should be
-- marked stale/expired/dismissed rather than deleted by normal users.
