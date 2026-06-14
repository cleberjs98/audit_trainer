-- =============================================================================
-- Store Audit Trainer - Start Audit INSERT Policies
-- V1 follow-up migration
-- =============================================================================
-- Purpose:
--   Enable Start Audit V1 by allowing authorized roles to INSERT rows into
--   public.audits for active stores only.
--
-- Scope:
--   - public.audits INSERT policies only.
--   - No changes to SELECT, UPDATE, or DELETE policies.
--   - No changes to audit_answers, photos, reports, action plans, storage,
--     seed data, or previous migrations.
--
-- Security model:
--   - audited_by must always be auth.uid() in V1, including for admin.
--   - admin may start an audit for any active store.
--   - area_manager may start an audit only for active stores in their assigned
--     area.
--   - store_manager and leader may start an audit only for their assigned
--     active store.
--   - No auditor or manager role exists in V1.
-- =============================================================================

-- ---------------------------------------------------------------------------
-- Remove old/conflicting audit INSERT policies
-- ---------------------------------------------------------------------------
-- 001_initial_schema.sql created audits_insert_store_manager, which allowed
-- admin plus store_manager inserts but did not enforce active stores and did
-- not support area_manager or leader Start Audit V1.

DROP POLICY IF EXISTS audits_insert_store_manager ON public.audits;
DROP POLICY IF EXISTS audits_insert_admin ON public.audits;
DROP POLICY IF EXISTS audits_insert_area_manager ON public.audits;
DROP POLICY IF EXISTS audits_insert_leader ON public.audits;


-- ---------------------------------------------------------------------------
-- public.audits: admin Start Audit INSERT
-- ---------------------------------------------------------------------------
-- Admin may start an audit for any active store. In V1, the audit creator is
-- always the signed-in user, so audited_by must equal auth.uid().

CREATE POLICY audits_insert_admin ON public.audits
  FOR INSERT
  WITH CHECK (
    public.is_admin()
    AND audited_by = auth.uid()
    AND EXISTS (
      SELECT 1
      FROM public.stores
      WHERE public.stores.id = store_id
        AND public.stores.is_active = true
    )
  );


-- ---------------------------------------------------------------------------
-- public.audits: area_manager Start Audit INSERT
-- ---------------------------------------------------------------------------
-- Area managers may start audits only for active stores in their assigned area.

CREATE POLICY audits_insert_area_manager ON public.audits
  FOR INSERT
  WITH CHECK (
    public.get_my_role() = 'area_manager'
    AND audited_by = auth.uid()
    AND EXISTS (
      SELECT 1
      FROM public.stores
      WHERE public.stores.id = store_id
        AND public.stores.area_id = public.get_my_area_id()
        AND public.stores.is_active = true
    )
  );


-- ---------------------------------------------------------------------------
-- public.audits: store_manager Start Audit INSERT
-- ---------------------------------------------------------------------------
-- Store managers may start audits only for their assigned active store.

CREATE POLICY audits_insert_store_manager ON public.audits
  FOR INSERT
  WITH CHECK (
    public.get_my_role() = 'store_manager'
    AND audited_by = auth.uid()
    AND store_id = public.get_my_store_id()
    AND EXISTS (
      SELECT 1
      FROM public.stores
      WHERE public.stores.id = store_id
        AND public.stores.is_active = true
    )
  );


-- ---------------------------------------------------------------------------
-- public.audits: leader Start Audit INSERT
-- ---------------------------------------------------------------------------
-- Leaders may start audits only for their assigned active store. Later audit
-- continuation/checklist permissions must be handled separately.

CREATE POLICY audits_insert_leader ON public.audits
  FOR INSERT
  WITH CHECK (
    public.get_my_role() = 'leader'
    AND audited_by = auth.uid()
    AND store_id = public.get_my_store_id()
    AND EXISTS (
      SELECT 1
      FROM public.stores
      WHERE public.stores.id = store_id
        AND public.stores.is_active = true
    )
  );
