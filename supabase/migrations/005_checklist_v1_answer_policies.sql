-- =============================================================================
-- Store Audit Trainer - Checklist V1 Answer Policies
-- V1 follow-up migration
-- =============================================================================
-- Purpose:
--   Enable Checklist V1 answer saving for admin, area_manager, store_manager,
--   and leader using the normal authenticated Supabase server/client context.
--
-- Scope:
--   - public.audits UPDATE policies.
--   - public.audit_answers INSERT/UPDATE policies.
--   - No changes to SELECT or DELETE policies.
--   - No changes to checklist_sections, audit_questions, audit_photos,
--     ai_reports, action plans, storage, seed data, or previous migrations.
--
-- Security model:
--   - Non-admin audit edits are limited to unlocked draft/in_progress audits.
--   - area_manager edits only audits for stores in their assigned area.
--   - store_manager and leader edit only audits for their assigned store.
--   - audit_answers writes are allowed only when the parent audit is editable
--     by the caller under the same role/scope/lock/status rules.
--   - Existing triggers continue to prevent normal authenticated users from
--     changing immutable audit columns such as store_id and audited_by.
--   - No service-role access is introduced or required by this migration.
--   - No auditor or manager role exists in V1.
-- =============================================================================


-- ---------------------------------------------------------------------------
-- public.audits: replace old/conflicting UPDATE policies
-- ---------------------------------------------------------------------------
-- 001_initial_schema.sql allowed store_manager updates and allowed completion
-- through the same policy. Checklist V1 does not complete audits. It only
-- allows editing unlocked draft/in_progress audits inside the caller's scope.

DROP POLICY IF EXISTS audits_update_admin ON public.audits;
DROP POLICY IF EXISTS audits_update_area_manager ON public.audits;
DROP POLICY IF EXISTS audits_update_store_manager ON public.audits;
DROP POLICY IF EXISTS audits_update_leader ON public.audits;

-- Admin keeps the broad direct UPDATE policy from 001. The V1 app UI should
-- still block normal completed-audit edits, but admin remains the database
-- break-glass role for corrections/reopen workflows.
CREATE POLICY audits_update_admin ON public.audits
  FOR UPDATE
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

-- Area managers may edit only unlocked draft/in_progress audits for stores in
-- their assigned area. USING checks the current row; WITH CHECK checks the
-- resulting row after the update.
CREATE POLICY audits_update_area_manager ON public.audits
  FOR UPDATE
  USING (
    public.get_my_role() = 'area_manager'
    AND is_locked = false
    AND status IN ('draft', 'in_progress')
    AND EXISTS (
      SELECT 1
      FROM public.stores
      WHERE public.stores.id = store_id
        AND public.stores.area_id = public.get_my_area_id()
    )
  )
  WITH CHECK (
    public.get_my_role() = 'area_manager'
    AND is_locked = false
    AND status IN ('draft', 'in_progress')
    AND EXISTS (
      SELECT 1
      FROM public.stores
      WHERE public.stores.id = store_id
        AND public.stores.area_id = public.get_my_area_id()
    )
  );

-- Store managers may edit only unlocked draft/in_progress audits for their
-- assigned store.
CREATE POLICY audits_update_store_manager ON public.audits
  FOR UPDATE
  USING (
    public.get_my_role() = 'store_manager'
    AND store_id = public.get_my_store_id()
    AND is_locked = false
    AND status IN ('draft', 'in_progress')
  )
  WITH CHECK (
    public.get_my_role() = 'store_manager'
    AND store_id = public.get_my_store_id()
    AND is_locked = false
    AND status IN ('draft', 'in_progress')
  );

-- Leaders may edit only unlocked draft/in_progress audits for their assigned
-- store in Checklist V1. They still receive no access to stores management,
-- photos, reports, action plans, or DELETE operations.
CREATE POLICY audits_update_leader ON public.audits
  FOR UPDATE
  USING (
    public.get_my_role() = 'leader'
    AND store_id = public.get_my_store_id()
    AND is_locked = false
    AND status IN ('draft', 'in_progress')
  )
  WITH CHECK (
    public.get_my_role() = 'leader'
    AND store_id = public.get_my_store_id()
    AND is_locked = false
    AND status IN ('draft', 'in_progress')
  );


-- ---------------------------------------------------------------------------
-- public.audit_answers: replace old/conflicting INSERT policy
-- ---------------------------------------------------------------------------
-- Answer INSERT is allowed only when the parent audit exists and is editable
-- under the caller's role/scope rules. Server actions must still validate the
-- question, active status, snapshots, score bounds, and N/A semantics.

DROP POLICY IF EXISTS audit_answers_insert ON public.audit_answers;

CREATE POLICY audit_answers_insert ON public.audit_answers
  FOR INSERT
  WITH CHECK (
    (
      public.is_admin()
      AND EXISTS (
        SELECT 1
        FROM public.audits
        WHERE public.audits.id = audit_id
          AND public.audits.is_locked = false
          AND public.audits.status IN ('draft', 'in_progress')
      )
    )
    OR (
      public.get_my_role() = 'area_manager'
      AND EXISTS (
        SELECT 1
        FROM public.audits
        JOIN public.stores ON public.stores.id = public.audits.store_id
        WHERE public.audits.id = audit_id
          AND public.audits.is_locked = false
          AND public.audits.status IN ('draft', 'in_progress')
          AND public.stores.area_id = public.get_my_area_id()
      )
    )
    OR (
      public.get_my_role() = 'store_manager'
      AND EXISTS (
        SELECT 1
        FROM public.audits
        WHERE public.audits.id = audit_id
          AND public.audits.store_id = public.get_my_store_id()
          AND public.audits.is_locked = false
          AND public.audits.status IN ('draft', 'in_progress')
      )
    )
    OR (
      public.get_my_role() = 'leader'
      AND EXISTS (
        SELECT 1
        FROM public.audits
        WHERE public.audits.id = audit_id
          AND public.audits.store_id = public.get_my_store_id()
          AND public.audits.is_locked = false
          AND public.audits.status IN ('draft', 'in_progress')
      )
    )
  );


-- ---------------------------------------------------------------------------
-- public.audit_answers: replace old/conflicting UPDATE policy
-- ---------------------------------------------------------------------------
-- USING checks the current answer's parent audit; WITH CHECK checks the
-- resulting answer's parent audit. No DELETE policy is added for non-admin.

DROP POLICY IF EXISTS audit_answers_update ON public.audit_answers;

CREATE POLICY audit_answers_update ON public.audit_answers
  FOR UPDATE
  USING (
    (
      public.is_admin()
      AND EXISTS (
        SELECT 1
        FROM public.audits
        WHERE public.audits.id = audit_id
          AND public.audits.is_locked = false
          AND public.audits.status IN ('draft', 'in_progress')
      )
    )
    OR (
      public.get_my_role() = 'area_manager'
      AND EXISTS (
        SELECT 1
        FROM public.audits
        JOIN public.stores ON public.stores.id = public.audits.store_id
        WHERE public.audits.id = audit_id
          AND public.audits.is_locked = false
          AND public.audits.status IN ('draft', 'in_progress')
          AND public.stores.area_id = public.get_my_area_id()
      )
    )
    OR (
      public.get_my_role() = 'store_manager'
      AND EXISTS (
        SELECT 1
        FROM public.audits
        WHERE public.audits.id = audit_id
          AND public.audits.store_id = public.get_my_store_id()
          AND public.audits.is_locked = false
          AND public.audits.status IN ('draft', 'in_progress')
      )
    )
    OR (
      public.get_my_role() = 'leader'
      AND EXISTS (
        SELECT 1
        FROM public.audits
        WHERE public.audits.id = audit_id
          AND public.audits.store_id = public.get_my_store_id()
          AND public.audits.is_locked = false
          AND public.audits.status IN ('draft', 'in_progress')
      )
    )
  )
  WITH CHECK (
    (
      public.is_admin()
      AND EXISTS (
        SELECT 1
        FROM public.audits
        WHERE public.audits.id = audit_id
          AND public.audits.is_locked = false
          AND public.audits.status IN ('draft', 'in_progress')
      )
    )
    OR (
      public.get_my_role() = 'area_manager'
      AND EXISTS (
        SELECT 1
        FROM public.audits
        JOIN public.stores ON public.stores.id = public.audits.store_id
        WHERE public.audits.id = audit_id
          AND public.audits.is_locked = false
          AND public.audits.status IN ('draft', 'in_progress')
          AND public.stores.area_id = public.get_my_area_id()
      )
    )
    OR (
      public.get_my_role() = 'store_manager'
      AND EXISTS (
        SELECT 1
        FROM public.audits
        WHERE public.audits.id = audit_id
          AND public.audits.store_id = public.get_my_store_id()
          AND public.audits.is_locked = false
          AND public.audits.status IN ('draft', 'in_progress')
      )
    )
    OR (
      public.get_my_role() = 'leader'
      AND EXISTS (
        SELECT 1
        FROM public.audits
        WHERE public.audits.id = audit_id
          AND public.audits.store_id = public.get_my_store_id()
          AND public.audits.is_locked = false
          AND public.audits.status IN ('draft', 'in_progress')
      )
    )
  );

