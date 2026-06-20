-- Weekly Action Plan AI payload foundation.
--
-- Adds a precise audit-scoped insight type for cached structured content that
-- can later drive the premium weekly action plan poster/PDF renderer.

ALTER TYPE public.ai_insight_type
  ADD VALUE IF NOT EXISTS 'audit_weekly_action_plan';

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
        'audit_weekly_action_plan'
      )
      AND audit_id IN (
        SELECT id
        FROM public.audits
        WHERE store_id = public.get_my_store_id()
      )
    )
  );
