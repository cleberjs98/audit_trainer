-- =============================================================================
-- Store Audit Trainer — Initial Schema Migration
-- V1 · Phase 3.1
-- =============================================================================
-- IMPORTANT: Do not apply this migration manually.
-- Run only through the approved Supabase migration flow.
-- =============================================================================

-- ---------------------------------------------------------------------------
-- 0. Extension
-- ---------------------------------------------------------------------------
-- Required for gen_random_uuid() in PostgreSQL < 14 and some Supabase envs.
CREATE EXTENSION IF NOT EXISTS pgcrypto;


-- ---------------------------------------------------------------------------
-- 1. Enums  (9 total — no others)
-- ---------------------------------------------------------------------------

CREATE TYPE public.user_role AS ENUM (
  'admin',
  'area_manager',
  'store_manager',
  'leader'
);

CREATE TYPE public.audit_status AS ENUM (
  'draft',
  'in_progress',
  'completed',
  'archived'
);

CREATE TYPE public.shift_type AS ENUM (
  'morning',
  'afternoon',
  'evening'
);

CREATE TYPE public.traffic_level AS ENUM (
  'low',
  'medium',
  'high'
);

CREATE TYPE public.visit_type AS ENUM (
  'training_audit',
  'follow_up_audit',
  'mystery_shop_simulation'
);

-- score_band: rating bands for completed audits (not related to action priority)
CREATE TYPE public.score_band AS ENUM (
  'excellent',
  'good',
  'needs_focus',
  'critical'
);

-- action_priority: low/medium/high only — no 'critical' (Decision 7)
CREATE TYPE public.action_priority AS ENUM (
  'low',
  'medium',
  'high'
);

CREATE TYPE public.action_item_status AS ENUM (
  'open',
  'in_progress',
  'completed'
);

-- action_plan_status replaces plain text — Decision 1
CREATE TYPE public.action_plan_status AS ENUM (
  'open',
  'in_progress',
  'completed'
);


-- ---------------------------------------------------------------------------
-- 2. Shared trigger function: handle_updated_at()
-- ---------------------------------------------------------------------------
-- Sets NEW.updated_at = now() on every UPDATE.
-- Must be registered on each table individually (see trigger declarations).

CREATE OR REPLACE FUNCTION public.handle_updated_at()
  RETURNS trigger
  LANGUAGE plpgsql
  SECURITY INVOKER
  SET search_path = public, pg_temp
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;


-- ---------------------------------------------------------------------------
-- 3. Tables (creation order respects FK dependencies)
-- ---------------------------------------------------------------------------

-- 3.1 areas ----------------------------------------------------------------
CREATE TABLE public.areas (
  id         uuid        NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name       text        NOT NULL UNIQUE,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TRIGGER trg_areas_updated_at
  BEFORE UPDATE ON public.areas
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();


-- 3.2 stores ---------------------------------------------------------------
CREATE TABLE public.stores (
  id         uuid        NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name       text        NOT NULL,
  code       text        NOT NULL UNIQUE,
  area_id    uuid        NOT NULL REFERENCES public.areas(id) ON DELETE RESTRICT,
  is_active  boolean     NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_stores_area_id  ON public.stores (area_id);
CREATE INDEX idx_stores_is_active ON public.stores (is_active);

CREATE TRIGGER trg_stores_updated_at
  BEFORE UPDATE ON public.stores
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();


-- 3.3 profiles -------------------------------------------------------------
-- id mirrors auth.users.id — NOT generated. Admin creates profiles manually.
-- Decision 3: No auth trigger in V1. store_manager/leader require store_id NOT NULL,
--   which an auto-trigger cannot satisfy without additional data.
CREATE TABLE public.profiles (
  id         uuid       NOT NULL PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name  text       NOT NULL,
  email      text       NOT NULL,
  role       public.user_role NOT NULL,
  store_id   uuid       NULL REFERENCES public.stores(id) ON DELETE RESTRICT,
  area_id    uuid       NULL REFERENCES public.areas(id)  ON DELETE RESTRICT,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),

  -- Role/store/area consistency (Decision 3 — all 4 roles explicit)
  CONSTRAINT chk_profiles_role_scope CHECK (
    (role = 'admin'         AND store_id IS NULL    AND area_id IS NULL   ) OR
    (role = 'area_manager'  AND area_id IS NOT NULL AND store_id IS NULL  ) OR
    (role = 'store_manager' AND store_id IS NOT NULL AND area_id IS NULL  ) OR
    (role = 'leader'        AND store_id IS NOT NULL AND area_id IS NULL  )
  )
);

-- Indexes for RLS helper function lookups and member queries
CREATE INDEX idx_profiles_role     ON public.profiles (role);
CREATE INDEX idx_profiles_store_id ON public.profiles (store_id);
CREATE INDEX idx_profiles_area_id  ON public.profiles (area_id);

CREATE TRIGGER trg_profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();


-- 3.4 checklist_sections ---------------------------------------------------
-- Decision 2: includes slug and updated_at; admin may UPDATE titles/descriptions.
CREATE TABLE public.checklist_sections (
  id          uuid        NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  slug        text        NOT NULL UNIQUE,
  title       text        NOT NULL,
  description text        NULL,
  order_index integer     NOT NULL DEFAULT 0 CHECK (order_index >= 0),
  is_active   boolean     NOT NULL DEFAULT true,
  created_at  timestamptz NOT NULL DEFAULT now(),
  updated_at  timestamptz NOT NULL DEFAULT now()
);

CREATE TRIGGER trg_checklist_sections_updated_at
  BEFORE UPDATE ON public.checklist_sections
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();


-- 3.5 audit_questions ------------------------------------------------------
-- Decision 14: question_key for idempotent seed.
CREATE TABLE public.audit_questions (
  id                   uuid        NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  question_key         text        NOT NULL UNIQUE,
  section_id           uuid        NOT NULL REFERENCES public.checklist_sections(id) ON DELETE RESTRICT,
  question_text        text        NOT NULL,
  question_description text        NULL,
  max_score            numeric     NOT NULL DEFAULT 5 CHECK (max_score > 0),
  is_required          boolean     NOT NULL DEFAULT true,
  is_critical          boolean     NOT NULL DEFAULT false,
  is_active            boolean     NOT NULL DEFAULT true,
  order_index          integer     NOT NULL DEFAULT 0 CHECK (order_index >= 0),
  created_at           timestamptz NOT NULL DEFAULT now(),
  updated_at           timestamptz NOT NULL DEFAULT now(),

  UNIQUE (section_id, order_index)
);

CREATE INDEX idx_audit_questions_section_id         ON public.audit_questions (section_id);
CREATE INDEX idx_audit_questions_section_order      ON public.audit_questions (section_id, order_index);
CREATE INDEX idx_audit_questions_is_active          ON public.audit_questions (is_active);

CREATE TRIGGER trg_audit_questions_updated_at
  BEFORE UPDATE ON public.audit_questions
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();


-- 3.6 audits ---------------------------------------------------------------
CREATE TABLE public.audits (
  id            uuid              NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  store_id      uuid              NOT NULL REFERENCES public.stores(id)   ON DELETE RESTRICT,
  audited_by    uuid              NOT NULL REFERENCES public.profiles(id)  ON DELETE RESTRICT,
  status        public.audit_status NOT NULL DEFAULT 'draft',
  -- is_locked set true automatically by trg_lock_audit_on_complete
  is_locked     boolean           NOT NULL DEFAULT false,
  visit_date    date              NOT NULL,
  visit_time    time              NOT NULL,
  mod           text              NULL,      -- Manager on Duty name
  shift_type    public.shift_type NOT NULL,
  traffic_level public.traffic_level NOT NULL,
  visit_type    public.visit_type NOT NULL,
  initial_notes text              NULL,
  total_score   numeric           NOT NULL DEFAULT 0 CHECK (total_score >= 0),
  max_score     numeric           NOT NULL DEFAULT 0 CHECK (max_score >= 0),
  percentage    numeric           NOT NULL DEFAULT 0,
  score_band    public.score_band NULL,
  section_scores jsonb            NULL,
  created_at    timestamptz       NOT NULL DEFAULT now(),
  updated_at    timestamptz       NOT NULL DEFAULT now(),
  completed_at  timestamptz       NULL,

  CONSTRAINT chk_audits_total_lte_max    CHECK (total_score <= max_score OR max_score = 0),
  CONSTRAINT chk_audits_percentage_range CHECK (percentage >= 0 AND percentage <= 100),
  CONSTRAINT chk_audits_max_score_valid  CHECK ((max_score = 0 AND percentage = 0) OR max_score > 0)
);

CREATE INDEX idx_audits_store_id        ON public.audits (store_id);
CREATE INDEX idx_audits_audited_by      ON public.audits (audited_by);
CREATE INDEX idx_audits_status          ON public.audits (status);
CREATE INDEX idx_audits_visit_date      ON public.audits (visit_date);
CREATE INDEX idx_audits_store_date      ON public.audits (store_id, visit_date);

CREATE TRIGGER trg_audits_updated_at
  BEFORE UPDATE ON public.audits
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();


-- 3.7 audit_answers --------------------------------------------------------
-- Decision 5: N/A semantics and score-bound CHECKs.
-- Decision 6: UNIQUE(audit_id, id) required to back composite FK from audit_photos.
CREATE TABLE public.audit_answers (
  id                     uuid        NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  audit_id               uuid        NOT NULL REFERENCES public.audits(id) ON DELETE CASCADE,
  question_id            uuid        NOT NULL REFERENCES public.audit_questions(id) ON DELETE RESTRICT,
  question_text_snapshot text        NOT NULL,  -- immutable copy at audit time
  section_title_snapshot text        NOT NULL,  -- immutable copy at audit time
  -- score semantics:
  --   NULL + is_na=false  → unanswered (incomplete)
  --   NULL + is_na=true   → N/A, excluded from scoring
  --   NOT NULL + is_na=false → valid scored answer
  --   NOT NULL + is_na=true  → forbidden by CHECK below
  score                  numeric     NULL,
  max_score              numeric     NOT NULL DEFAULT 5,
  is_na                  boolean     NOT NULL DEFAULT false,
  comment                text        NULL,
  is_critical_flag       boolean     NOT NULL DEFAULT false,  -- auditor-flagged issue
  created_at             timestamptz NOT NULL DEFAULT now(),
  updated_at             timestamptz NOT NULL DEFAULT now(),

  -- One answer per question per audit
  UNIQUE (audit_id, question_id),
  -- Required to support composite FK from audit_photos (must be declared before audit_photos table)
  UNIQUE (audit_id, id),

  -- N/A semantics: if is_na=true then score must be NULL
  CONSTRAINT chk_audit_answers_na_score     CHECK (NOT is_na OR score IS NULL),
  -- Score must be in valid range when present
  CONSTRAINT chk_audit_answers_score_range  CHECK (score IS NULL OR (score >= 0 AND score <= max_score)),
  -- max_score snapshot must always be positive
  CONSTRAINT chk_audit_answers_max_score    CHECK (max_score > 0)
);

-- idx_audit_answers_audit_question and idx_audit_answers_audit_id_id are covered
-- by the UNIQUE constraints declared above; PostgreSQL creates UNIQUE indexes for
-- those automatically. Only the non-unique single-column index is created here.
CREATE INDEX idx_audit_answers_audit_id ON public.audit_answers (audit_id);

CREATE TRIGGER trg_audit_answers_updated_at
  BEFORE UPDATE ON public.audit_answers
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();


-- 3.8 audit_photos ---------------------------------------------------------
-- Decision 6: answer_id NOT NULL; storage_path UNIQUE; composite FK.
-- Insert-only: no updated_at column. UPDATE denied for all roles.
-- Non-admin INSERT denied in V1 — all uploads via server route using service role.
CREATE TABLE public.audit_photos (
  id           uuid        NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  audit_id     uuid        NOT NULL,
  answer_id    uuid        NOT NULL,
  -- storage_path is bucket-relative: {audit_id}/{answer_id}/{photo_id}.{ext}
  -- Never includes the bucket name 'audit-photos/' as a prefix.
  storage_path text        NOT NULL UNIQUE,
  caption      text        NULL,
  uploaded_by  uuid        NOT NULL REFERENCES public.profiles(id) ON DELETE RESTRICT,
  created_at   timestamptz NOT NULL DEFAULT now(),

  -- Composite FK: enforces answer_id belongs to same audit as audit_id (Decision 6)
  -- Requires UNIQUE(audit_id, id) on audit_answers to exist first.
  CONSTRAINT fk_audit_photos_audit_answer
    FOREIGN KEY (audit_id, answer_id)
    REFERENCES public.audit_answers(audit_id, id)
    ON DELETE CASCADE
);

CREATE INDEX idx_audit_photos_audit_id    ON public.audit_photos (audit_id);
CREATE INDEX idx_audit_photos_answer_id   ON public.audit_photos (answer_id);
-- storage_path UNIQUE index is implicit from the UNIQUE constraint above


-- 3.9 ai_reports -----------------------------------------------------------
-- Decision 8: no raw_ai_response in V1.
-- INSERT/UPDATE via service role only in practice. RLS admin policies are a safety net.
CREATE TABLE public.ai_reports (
  id                       uuid     NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  audit_id                 uuid     NOT NULL UNIQUE REFERENCES public.audits(id) ON DELETE CASCADE,
  executive_summary        text     NULL,
  what_went_well           text[]   NULL,
  what_needs_improvement   text[]   NULL,
  priority_focus           text     NULL,
  coaching_notes           text     NULL,
  team_message             text     NULL,
  follow_up_recommendations text[]  NULL,
  created_at               timestamptz NOT NULL DEFAULT now(),
  updated_at               timestamptz NOT NULL DEFAULT now()
);

CREATE TRIGGER trg_ai_reports_updated_at
  BEFORE UPDATE ON public.ai_reports
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();


-- 3.10 action_plans --------------------------------------------------------
-- Decision 1: status uses action_plan_status enum (never plain text).
CREATE TABLE public.action_plans (
  id              uuid                   NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  audit_id        uuid                   NOT NULL UNIQUE REFERENCES public.audits(id)  ON DELETE CASCADE,
  store_id        uuid                   NOT NULL REFERENCES public.stores(id) ON DELETE RESTRICT,
  focus_area      text                   NULL,
  summary         text                   NULL,
  generated_by_ai boolean                NOT NULL DEFAULT true,
  status          public.action_plan_status NOT NULL DEFAULT 'open',
  created_at      timestamptz            NOT NULL DEFAULT now(),
  updated_at      timestamptz            NOT NULL DEFAULT now()
);

CREATE INDEX idx_action_plans_store_id ON public.action_plans (store_id);

CREATE TRIGGER trg_action_plans_updated_at
  BEFORE UPDATE ON public.action_plans
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();


-- 3.11 action_plan_items ---------------------------------------------------
-- Decision 7: action_priority has no 'critical' value.
CREATE TABLE public.action_plan_items (
  id                 uuid                     NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  action_plan_id     uuid                     NOT NULL REFERENCES public.action_plans(id) ON DELETE CASCADE,
  action_description text                     NOT NULL,
  owner              text                     NULL,
  priority           public.action_priority   NOT NULL DEFAULT 'medium',
  due_date           date                     NULL,
  success_measure    text                     NULL,
  status             public.action_item_status NOT NULL DEFAULT 'open',
  completed_at       timestamptz              NULL,
  created_at         timestamptz              NOT NULL DEFAULT now(),
  updated_at         timestamptz              NOT NULL DEFAULT now()
);

CREATE INDEX idx_action_plan_items_plan_id ON public.action_plan_items (action_plan_id);
CREATE INDEX idx_action_plan_items_status  ON public.action_plan_items (status);

CREATE TRIGGER trg_action_plan_items_updated_at
  BEFORE UPDATE ON public.action_plan_items
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();


-- ---------------------------------------------------------------------------
-- 4. Audit lock trigger
-- ---------------------------------------------------------------------------
-- Fires BEFORE UPDATE on audits. When status transitions → 'completed',
-- sets is_locked = true automatically. Fires for all users including admin.
-- Admin can later set is_locked = false directly (trigger condition won't re-fire
-- unless status transitions to 'completed' again from a non-completed state).

CREATE OR REPLACE FUNCTION public.fn_lock_audit_on_complete()
  RETURNS trigger
  LANGUAGE plpgsql
  SECURITY INVOKER
  SET search_path = public, pg_temp
AS $$
BEGIN
  IF NEW.status = 'completed' AND OLD.status <> 'completed' THEN
    NEW.is_locked := true;
    NEW.completed_at := now();
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_lock_audit_on_complete
  BEFORE UPDATE ON public.audits
  FOR EACH ROW EXECUTE FUNCTION public.fn_lock_audit_on_complete();


-- ---------------------------------------------------------------------------
-- 4b. Prevent non-admin/non-service changes to immutable audit columns
-- ---------------------------------------------------------------------------
-- audited_by and store_id must not be changed after creation by normal
-- authenticated users. RLS WITH CHECK cannot restrict individual columns,
-- so a BEFORE UPDATE trigger is required for this protection.
--
-- IMPORTANT — service role and trigger execution context:
--   The Supabase service role bypasses RLS entirely, but table-level triggers
--   still execute for service-role operations. This trigger therefore
--   explicitly allows trusted server/migration execution contexts to change
--   audited_by and store_id, because those contexts are controlled server-side
--   and have already performed their own authorization checks.
--
--   Trusted contexts allowed to change audited_by/store_id:
--     • current_user = 'postgres'      (migrations, maintenance tasks)
--     • current_user = 'service_role'  (Supabase service role in some configs)
--     • auth.role() = 'service_role'   (Supabase service role via JWT claim)
--
--   Server routes MUST still perform their own authorization before using
--   the service role — this trigger is not a substitute for server-side checks.
--
-- This trigger fires AFTER trg_lock_audit_on_complete (alphabetical order within
-- the same timing/event; both are BEFORE UPDATE FOR EACH ROW). Authenticated
-- users (store_manager, area_manager, leader) and app-role admins (is_admin())
-- are checked. Trusted execution contexts bypass the column-immutability check.

CREATE OR REPLACE FUNCTION public.fn_prevent_audit_column_change()
  RETURNS trigger
  LANGUAGE plpgsql
  SECURITY INVOKER
  SET search_path = public, pg_temp
AS $$
BEGIN
  -- Allow trusted server/migration execution contexts.
  -- service_role bypasses RLS but triggers still run; these contexts are
  -- considered trusted because they are controlled server-side.
  IF current_user IN ('postgres', 'service_role') THEN
    RETURN NEW;
  END IF;

  -- auth.role() = 'service_role' covers the Supabase service-role JWT path.
  IF auth.role() = 'service_role' THEN
    RETURN NEW;
  END IF;

  -- App-level admin (authenticated user with role = 'admin') may also change
  -- these columns when needed (e.g., correcting data via admin UI).
  IF public.is_admin() THEN
    RETURN NEW;
  END IF;

  -- All other authenticated users: audited_by must not change.
  IF NEW.audited_by IS DISTINCT FROM OLD.audited_by THEN
    RAISE EXCEPTION 'audited_by cannot be changed after creation';
  END IF;

  -- All other authenticated users: store_id must not change.
  IF NEW.store_id IS DISTINCT FROM OLD.store_id THEN
    RAISE EXCEPTION 'store_id cannot be changed after creation';
  END IF;

  RETURN NEW;
END;
$$;

-- Named so it fires after trg_lock_audit_on_complete (alphabetical: trg_p > trg_l).
CREATE TRIGGER trg_prevent_audit_column_change
  BEFORE UPDATE ON public.audits
  FOR EACH ROW EXECUTE FUNCTION public.fn_prevent_audit_column_change();


-- ---------------------------------------------------------------------------
-- 5. RLS helper functions (SECURITY DEFINER)
-- ---------------------------------------------------------------------------
-- CRITICAL ownership requirement (Decision 9):
--   These functions must be owned by the public.profiles TABLE OWNER
--   or by a role with BYPASSRLS. A role with only SELECT on profiles is
--   INSUFFICIENT — profiles RLS evaluates against the function owner's role,
--   causing recursion or empty results. Ownership or BYPASSRLS is required
--   so that the helper's internal query bypasses profiles RLS entirely.
--
--   In Supabase managed projects, migrations are executed by the 'postgres'
--   superuser (which has BYPASSRLS), so functions created here are owned by
--   'postgres' and will correctly bypass profiles RLS. If you ever run this
--   migration manually under a custom role, verify that role either owns
--   public.profiles or has the BYPASSRLS attribute before proceeding.
--   SECURITY DEFINER depends entirely on the function owner — not on the
--   caller. Do NOT alter function ownership to a role without BYPASSRLS.
--
-- All four functions:
--   - SECURITY DEFINER (runs as owner, not caller)
--   - SET search_path = public, pg_temp (prevents search_path injection)
--   - STABLE (result constant within a single SQL statement)
--   - Query public.profiles with WHERE id = auth.uid() (own row only)

CREATE OR REPLACE FUNCTION public.get_my_role()
  RETURNS public.user_role
  LANGUAGE sql
  SECURITY DEFINER
  STABLE
  SET search_path = public, pg_temp
AS $$
  SELECT role FROM public.profiles WHERE id = auth.uid();
$$;

CREATE OR REPLACE FUNCTION public.get_my_store_id()
  RETURNS uuid
  LANGUAGE sql
  SECURITY DEFINER
  STABLE
  SET search_path = public, pg_temp
AS $$
  SELECT store_id FROM public.profiles WHERE id = auth.uid();
$$;

CREATE OR REPLACE FUNCTION public.get_my_area_id()
  RETURNS uuid
  LANGUAGE sql
  SECURITY DEFINER
  STABLE
  SET search_path = public, pg_temp
AS $$
  SELECT area_id FROM public.profiles WHERE id = auth.uid();
$$;

CREATE OR REPLACE FUNCTION public.is_admin()
  RETURNS boolean
  LANGUAGE sql
  SECURITY DEFINER
  STABLE
  SET search_path = public, pg_temp
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid() AND role = 'admin'
  );
$$;


-- ---------------------------------------------------------------------------
-- 6. Enable RLS on all 11 app tables
-- ---------------------------------------------------------------------------
ALTER TABLE public.areas              ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.stores             ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles           ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.checklist_sections ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_questions    ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audits             ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_answers      ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_photos       ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ai_reports         ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.action_plans       ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.action_plan_items  ENABLE ROW LEVEL SECURITY;


-- ---------------------------------------------------------------------------
-- 7. RLS Policies
-- ---------------------------------------------------------------------------
-- Conventions:
--   • service_role bypasses RLS (Supabase default) — no policy needed for it.
--   • is_admin() is the admin bypass in all USING expressions.
--   • "area stores" subquery: store_id IN (SELECT id FROM public.stores WHERE area_id = get_my_area_id())
--   • "lock check" (non-admin child writes): (SELECT is_locked FROM public.audits WHERE id = <fk>) = false
--   • Leaders are read-only on all tables.
--   • Non-admin direct UPDATE on action_plans/action_plan_items denied in V1.
--   • Non-admin direct INSERT on audit_photos denied in V1.
--   • Non-admin direct UPDATE on profiles denied in V1.


-- ---- 7.1 areas -----------------------------------------------------------

CREATE POLICY areas_select ON public.areas
  FOR SELECT USING (
    is_admin()
    OR id = get_my_area_id()
    OR id = (SELECT area_id FROM public.stores WHERE id = get_my_store_id())
  );

CREATE POLICY areas_insert ON public.areas
  FOR INSERT WITH CHECK (is_admin());

CREATE POLICY areas_update ON public.areas
  FOR UPDATE USING (is_admin()) WITH CHECK (is_admin());

CREATE POLICY areas_delete ON public.areas
  FOR DELETE USING (is_admin());


-- ---- 7.2 stores ----------------------------------------------------------

CREATE POLICY stores_select ON public.stores
  FOR SELECT USING (
    is_admin()
    OR area_id = get_my_area_id()
    OR id = get_my_store_id()
  );

CREATE POLICY stores_insert ON public.stores
  FOR INSERT WITH CHECK (is_admin());

CREATE POLICY stores_update ON public.stores
  FOR UPDATE USING (is_admin()) WITH CHECK (is_admin());

CREATE POLICY stores_delete ON public.stores
  FOR DELETE USING (is_admin());


-- ---- 7.3 profiles --------------------------------------------------------
-- SELECT: admin=all; area_manager=own row + area store members;
--         store_manager=own row + same-store members; leader=own row only.
-- INSERT: admin only (manual in V1, no auto-trigger).
-- UPDATE: admin only — non-admin direct UPDATE denied in V1 (Decision S2).
-- DELETE: admin only.

CREATE POLICY profiles_select ON public.profiles
  FOR SELECT USING (
    is_admin()
    OR id = auth.uid()
    OR (
      get_my_role() = 'area_manager'
      AND store_id IN (
        SELECT id FROM public.stores WHERE area_id = get_my_area_id()
      )
    )
    OR (
      get_my_role() = 'store_manager'
      AND store_id = get_my_store_id()
    )
  );

CREATE POLICY profiles_insert ON public.profiles
  FOR INSERT WITH CHECK (is_admin());

-- Only admin may directly UPDATE profiles in V1.
-- Non-admin profile edits (if ever needed) must go through a server RPC
-- that is prevented from modifying role, store_id, or area_id.
CREATE POLICY profiles_update ON public.profiles
  FOR UPDATE USING (is_admin()) WITH CHECK (is_admin());

CREATE POLICY profiles_delete ON public.profiles
  FOR DELETE USING (is_admin());


-- ---- 7.4 checklist_sections ---------------------------------------------
-- Authenticated users read active rows. Anonymous access is denied.

CREATE POLICY checklist_sections_select ON public.checklist_sections
  FOR SELECT USING (
    is_admin()
    OR (auth.role() = 'authenticated' AND is_active = true)
  );

CREATE POLICY checklist_sections_insert ON public.checklist_sections
  FOR INSERT WITH CHECK (is_admin());

CREATE POLICY checklist_sections_update ON public.checklist_sections
  FOR UPDATE USING (is_admin()) WITH CHECK (is_admin());

CREATE POLICY checklist_sections_delete ON public.checklist_sections
  FOR DELETE USING (is_admin());


-- ---- 7.5 audit_questions ------------------------------------------------

-- Authenticated users read active questions. Anonymous access is denied.
CREATE POLICY audit_questions_select ON public.audit_questions
  FOR SELECT USING (
    is_admin()
    OR (auth.role() = 'authenticated' AND is_active = true)
  );

CREATE POLICY audit_questions_insert ON public.audit_questions
  FOR INSERT WITH CHECK (is_admin());

CREATE POLICY audit_questions_update ON public.audit_questions
  FOR UPDATE USING (is_admin()) WITH CHECK (is_admin());

CREATE POLICY audit_questions_delete ON public.audit_questions
  FOR DELETE USING (is_admin());


-- ---- 7.6 audits ----------------------------------------------------------
-- store_manager UPDATE uses USING/WITH CHECK split (Decision 10):
--   USING  (OLD row check): store must match AND audit must be unlocked.
--   WITH CHECK (NEW row check): allows the row to be either still unlocked
--     OR newly locked by the completion transition (trigger sets is_locked=true).
--   This allows store_manager to complete their own audit (triggering auto-lock)
--   without the WITH CHECK failing on the resulting locked row.

CREATE POLICY audits_select ON public.audits
  FOR SELECT USING (
    is_admin()
    OR store_id IN (SELECT id FROM public.stores WHERE area_id = get_my_area_id())
    OR store_id = get_my_store_id()
  );

-- store_manager INSERT: must target own store AND set audited_by to themselves.
-- This prevents audited_by spoofing — a store_manager cannot claim another user
-- authored the audit.
CREATE POLICY audits_insert_store_manager ON public.audits
  FOR INSERT WITH CHECK (
    is_admin()
    OR (
      get_my_role() = 'store_manager'
      AND store_id = get_my_store_id()
      AND audited_by = auth.uid()
    )
  );

CREATE POLICY audits_update_admin ON public.audits
  FOR UPDATE USING (is_admin()) WITH CHECK (is_admin());

-- store_manager may update only unlocked audits belonging to their store,
-- and the result may be either still-unlocked or newly locked (completion).
CREATE POLICY audits_update_store_manager ON public.audits
  FOR UPDATE
  USING (
    get_my_role() = 'store_manager'
    AND store_id = get_my_store_id()
    AND is_locked = false
  )
  WITH CHECK (
    get_my_role() = 'store_manager'
    AND store_id = get_my_store_id()
    AND (
      is_locked = false
      OR (status = 'completed' AND is_locked = true)
    )
  );

CREATE POLICY audits_delete ON public.audits
  FOR DELETE USING (is_admin());


-- ---- 7.7 audit_answers --------------------------------------------------
-- Non-admin INSERT/UPDATE includes lock check against parent audit.

CREATE POLICY audit_answers_select ON public.audit_answers
  FOR SELECT USING (
    is_admin()
    OR audit_id IN (
      SELECT id FROM public.audits
      WHERE store_id IN (SELECT id FROM public.stores WHERE area_id = get_my_area_id())
    )
    OR audit_id IN (
      SELECT id FROM public.audits WHERE store_id = get_my_store_id()
    )
  );

CREATE POLICY audit_answers_insert ON public.audit_answers
  FOR INSERT WITH CHECK (
    is_admin()
    OR (
      get_my_role() = 'store_manager'
      AND (SELECT store_id FROM public.audits WHERE id = audit_id) = get_my_store_id()
      AND (SELECT is_locked FROM public.audits WHERE id = audit_id) = false
    )
  );

CREATE POLICY audit_answers_update ON public.audit_answers
  FOR UPDATE
  USING (
    is_admin()
    OR (
      get_my_role() = 'store_manager'
      AND (SELECT store_id FROM public.audits WHERE id = audit_id) = get_my_store_id()
      AND (SELECT is_locked FROM public.audits WHERE id = audit_id) = false
    )
  )
  WITH CHECK (
    is_admin()
    OR (
      get_my_role() = 'store_manager'
      AND (SELECT store_id FROM public.audits WHERE id = audit_id) = get_my_store_id()
      AND (SELECT is_locked FROM public.audits WHERE id = audit_id) = false
    )
  );

CREATE POLICY audit_answers_delete ON public.audit_answers
  FOR DELETE USING (is_admin());


-- ---- 7.8 audit_photos ---------------------------------------------------
-- Strict server-route-only model (V1):
--   INSERT: no direct INSERT policy for any role, including admin.
--     All audit_photos metadata rows are inserted by the Next.js server route
--     using SUPABASE_SERVICE_ROLE_KEY after the server route validates
--     authorization, uploads the storage object, and confirms the audit is
--     unlocked. The service role bypasses RLS, so no INSERT policy is needed.
--   UPDATE: denied for ALL roles — photos are immutable (Decision 6).
--     No audit_photos_update policy is created; absence = deny.
--   DELETE: denied for all direct authenticated clients in V1.
--     Admin-initiated deletes go through the Next.js server route using
--     service role after server-side authorization is confirmed.
--     No audit_photos_delete policy is created; absence = deny.
--   SELECT: scoped by role via RLS policy below.

CREATE POLICY audit_photos_select ON public.audit_photos
  FOR SELECT USING (
    is_admin()
    OR audit_id IN (
      SELECT id FROM public.audits
      WHERE store_id IN (SELECT id FROM public.stores WHERE area_id = get_my_area_id())
    )
    OR audit_id IN (
      SELECT id FROM public.audits WHERE store_id = get_my_store_id()
    )
  );

-- No audit_photos_insert policy. INSERT is service-role only via server route.
-- No audit_photos_update policy. UPDATE denied for all roles — photos are immutable.
-- No audit_photos_delete policy. DELETE is service-role only via server route.


-- ---- 7.9 ai_reports -----------------------------------------------------
-- INSERT/UPDATE via service role only in practice; admin policies are safety net.

CREATE POLICY ai_reports_select ON public.ai_reports
  FOR SELECT USING (
    is_admin()
    OR audit_id IN (
      SELECT id FROM public.audits
      WHERE store_id IN (SELECT id FROM public.stores WHERE area_id = get_my_area_id())
    )
    OR audit_id IN (
      SELECT id FROM public.audits WHERE store_id = get_my_store_id()
    )
  );

CREATE POLICY ai_reports_insert ON public.ai_reports
  FOR INSERT WITH CHECK (is_admin());

CREATE POLICY ai_reports_update ON public.ai_reports
  FOR UPDATE USING (is_admin()) WITH CHECK (is_admin());

CREATE POLICY ai_reports_delete ON public.ai_reports
  FOR DELETE USING (is_admin());


-- ---- 7.10 action_plans --------------------------------------------------
-- Non-admin direct UPDATE denied in V1 (Decision 12).
-- INSERT via service role (AI backend). admin policy is safety net.

CREATE POLICY action_plans_select ON public.action_plans
  FOR SELECT USING (
    is_admin()
    OR store_id IN (SELECT id FROM public.stores WHERE area_id = get_my_area_id())
    OR store_id = get_my_store_id()
  );

CREATE POLICY action_plans_insert ON public.action_plans
  FOR INSERT WITH CHECK (is_admin());

-- Only admin may UPDATE action_plans in V1. Non-admin denied.
CREATE POLICY action_plans_update ON public.action_plans
  FOR UPDATE USING (is_admin()) WITH CHECK (is_admin());

CREATE POLICY action_plans_delete ON public.action_plans
  FOR DELETE USING (is_admin());


-- ---- 7.11 action_plan_items ---------------------------------------------
-- Non-admin direct UPDATE denied in V1 (Decision 12). Leader read-only.
-- SELECT scoped via action_plan → store_id.

CREATE POLICY action_plan_items_select ON public.action_plan_items
  FOR SELECT USING (
    is_admin()
    OR action_plan_id IN (
      SELECT id FROM public.action_plans
      WHERE store_id IN (SELECT id FROM public.stores WHERE area_id = get_my_area_id())
    )
    OR action_plan_id IN (
      SELECT id FROM public.action_plans WHERE store_id = get_my_store_id()
    )
  );

CREATE POLICY action_plan_items_insert ON public.action_plan_items
  FOR INSERT WITH CHECK (is_admin());

-- Only admin may UPDATE action_plan_items in V1. Non-admin denied.
-- Store manager progress tracking (status, completed_at) requires future server RPC.
CREATE POLICY action_plan_items_update ON public.action_plan_items
  FOR UPDATE USING (is_admin()) WITH CHECK (is_admin());

CREATE POLICY action_plan_items_delete ON public.action_plan_items
  FOR DELETE USING (is_admin());


-- ---------------------------------------------------------------------------
-- 8. Storage bucket: audit-photos
-- ---------------------------------------------------------------------------
-- Bucket is private (public = false). All access via server-side signed URLs.
-- Direct authenticated SELECT/INSERT/UPDATE/DELETE on storage.objects is denied
-- in V1 for all roles. No storage.objects policies are created that grant access.
--
-- Path format stored in audit_photos.storage_path (bucket-relative):
--   {audit_id}/{answer_id}/{photo_id}.{ext}
-- Full Storage API path (never stored in DB):
--   audit-photos/{audit_id}/{answer_id}/{photo_id}.{ext}

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'audit-photos',
  'audit-photos',
  false,
  10485760,  -- 10 MB file size limit
  ARRAY['image/jpeg', 'image/png', 'image/webp']
)
ON CONFLICT (id) DO NOTHING;

-- No storage.objects policies are created in V1.
-- All uploads and reads are handled server-side via SUPABASE_SERVICE_ROLE_KEY.
-- The service role bypasses storage RLS entirely.
-- Signed URLs (60-minute TTL) are generated server-side after DB-backed auth checks.
