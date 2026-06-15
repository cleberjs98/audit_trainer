-- Grant table-level write privileges required before RLS policies can permit writes.
-- RLS remains enabled and continues to enforce role, store, area, and lock scope.
-- Audit completion remains handled through public.complete_audit_v1(), not direct audit UPDATE.
GRANT INSERT ON public.audits TO authenticated;
GRANT INSERT, UPDATE ON public.audit_answers TO authenticated;
