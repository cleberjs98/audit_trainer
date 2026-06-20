-- AI Action Plan PDF payload foundation.
--
-- Adds the corrected action-plan-owned insight type for cached structured
-- content that renders the premium AI Action Plan PDF. Migration 020 may have
-- been applied locally with the earlier weekly naming, so this follow-up leaves
-- that value unused and adds the corrected one safely.

ALTER TYPE public.ai_insight_type
  ADD VALUE IF NOT EXISTS 'ai_action_plan_pdf';

DROP POLICY IF EXISTS ai_insights_insert ON public.ai_insights;

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
      AND insight_type::text IN (
        'audit_action_plan',
        'audit_summary',
        'audit_weekly_action_plan',
        'ai_action_plan_pdf'
      )
      AND audit_id IN (
        SELECT id
        FROM public.audits
        WHERE store_id = public.get_my_store_id()
      )
    )
  );
