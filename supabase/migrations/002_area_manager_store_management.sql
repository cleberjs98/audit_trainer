-- =============================================================================
-- Store Audit Trainer - Area Manager Store Management
-- V1 follow-up migration
-- =============================================================================
-- Purpose:
--   Allow area_manager users to create and update stores only inside their
--   assigned area.
--
-- Scope:
--   - public.stores RLS policies only.
--   - No changes to areas, audits, profiles, checklist, action plans, storage,
--     seed data, or the original 001 migration.
--
-- Security model:
--   - Admin policies from 001 remain unchanged.
--   - area_manager can INSERT only when NEW.area_id = get_my_area_id().
--   - area_manager can UPDATE only rows already in their area, and the
--     resulting row must remain in that same assigned area.
--   - area_manager DELETE remains denied because no DELETE policy is added.
--   - store_manager and leader receive no INSERT, UPDATE, or DELETE policies.
-- =============================================================================

-- ---------------------------------------------------------------------------
-- public.stores: area_manager INSERT
-- ---------------------------------------------------------------------------
-- Allows an area manager to create a store only in their assigned area.
-- Store code uniqueness remains enforced by the existing UNIQUE constraint on
-- public.stores(code).

DROP POLICY IF EXISTS stores_insert_area_manager ON public.stores;

CREATE POLICY stores_insert_area_manager ON public.stores
  FOR INSERT
  WITH CHECK (
    public.get_my_role() = 'area_manager'
    AND area_id = public.get_my_area_id()
  );


-- ---------------------------------------------------------------------------
-- public.stores: area_manager UPDATE
-- ---------------------------------------------------------------------------
-- USING checks the existing row (OLD): the store must already belong to the
-- caller's assigned area.
--
-- WITH CHECK checks the resulting row (NEW): the store must still belong to
-- the caller's assigned area after the update. This prevents moving a store
-- out of the area, into another area, or editing stores from another area.

DROP POLICY IF EXISTS stores_update_area_manager ON public.stores;

CREATE POLICY stores_update_area_manager ON public.stores
  FOR UPDATE
  USING (
    public.get_my_role() = 'area_manager'
    AND area_id = public.get_my_area_id()
  )
  WITH CHECK (
    public.get_my_role() = 'area_manager'
    AND area_id = public.get_my_area_id()
  );

