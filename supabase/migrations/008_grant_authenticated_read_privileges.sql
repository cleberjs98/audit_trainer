-- Grant table-level read privileges required before RLS policies can allow rows.
-- RLS remains enabled and continues to enforce row-level access for each role.
GRANT SELECT ON public.areas TO authenticated;
GRANT SELECT ON public.stores TO authenticated;
GRANT SELECT ON public.profiles TO authenticated;
GRANT SELECT ON public.checklist_sections TO authenticated;
GRANT SELECT ON public.audit_questions TO authenticated;
GRANT SELECT ON public.audits TO authenticated;
GRANT SELECT ON public.audit_answers TO authenticated;
GRANT SELECT ON public.audit_photos TO authenticated;
GRANT SELECT ON public.ai_reports TO authenticated;
GRANT SELECT ON public.action_plans TO authenticated;
GRANT SELECT ON public.action_plan_items TO authenticated;
