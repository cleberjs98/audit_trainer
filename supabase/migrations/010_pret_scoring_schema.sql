-- =============================================================================
-- Store Audit Trainer - Pret Scoring Schema Preparation
-- V1 follow-up migration
-- =============================================================================
-- Purpose:
--   Add backward-compatible scoring metadata required for the real Pret
--   Customer Experience checklist model.
--
-- Scope:
--   - Adds scoring enums used by future checklist questions.
--   - Adds metadata columns to audit_questions and checklist_sections.
--   - Adds scoring_model_version to audits.
--   - Backfills existing 62-question checklist data and existing audits as
--     legacy_62_v1.
--
-- Deliberately not included:
--   - No question deactivation.
--   - No new Pret checklist seed rows.
--   - No complete_audit_v1 changes.
--   - No RLS, grants, storage, audit_answers, or policy changes.
--
-- Model notes:
--   - Existing checklist/reference rows are marked legacy_62_v1.
--   - Future audits default to pret_ce_v1.
--   - The next seed/RPC migration will activate the real Pret model:
--       19 core questions worth 95 points
--       1 Outstanding Card bonus question worth 5 points
--       no Information Only questions in app V1
-- =============================================================================

-- ---------------------------------------------------------------------------
-- 1. Scoring metadata enums
-- ---------------------------------------------------------------------------

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_type AS t
    JOIN pg_namespace AS n ON n.oid = t.typnamespace
    WHERE n.nspname = 'public'
      AND t.typname = 'question_scoring_group'
  ) THEN
    CREATE TYPE public.question_scoring_group AS ENUM (
      'core',
      'bonus'
    );
  END IF;
END;
$$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_type AS t
    JOIN pg_namespace AS n ON n.oid = t.typnamespace
    WHERE n.nspname = 'public'
      AND t.typname = 'question_response_type'
  ) THEN
    CREATE TYPE public.question_response_type AS ENUM (
      'score',
      'boolean_score'
    );
  END IF;
END;
$$;


-- ---------------------------------------------------------------------------
-- 2. audit_questions metadata columns
-- ---------------------------------------------------------------------------

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'audit_questions'
      AND column_name = 'scoring_group'
  ) THEN
    ALTER TABLE public.audit_questions
      ADD COLUMN scoring_group public.question_scoring_group;
  END IF;
END;
$$;

UPDATE public.audit_questions
SET scoring_group = 'core'::public.question_scoring_group
WHERE scoring_group IS NULL;

ALTER TABLE public.audit_questions
  ALTER COLUMN scoring_group SET DEFAULT 'core'::public.question_scoring_group,
  ALTER COLUMN scoring_group SET NOT NULL;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'audit_questions'
      AND column_name = 'response_type'
  ) THEN
    ALTER TABLE public.audit_questions
      ADD COLUMN response_type public.question_response_type;
  END IF;
END;
$$;

UPDATE public.audit_questions
SET response_type = 'score'::public.question_response_type
WHERE response_type IS NULL;

ALTER TABLE public.audit_questions
  ALTER COLUMN response_type SET DEFAULT 'score'::public.question_response_type,
  ALTER COLUMN response_type SET NOT NULL;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'audit_questions'
      AND column_name = 'required_for_completion'
  ) THEN
    ALTER TABLE public.audit_questions
      ADD COLUMN required_for_completion boolean;
  END IF;
END;
$$;

UPDATE public.audit_questions
SET required_for_completion = COALESCE(is_required, true)
WHERE required_for_completion IS NULL;

ALTER TABLE public.audit_questions
  ALTER COLUMN required_for_completion SET DEFAULT true,
  ALTER COLUMN required_for_completion SET NOT NULL;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'audit_questions'
      AND column_name = 'display_number'
  ) THEN
    ALTER TABLE public.audit_questions
      ADD COLUMN display_number integer;
  END IF;
END;
$$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'chk_audit_questions_display_number_positive'
      AND conrelid = 'public.audit_questions'::regclass
  ) THEN
    ALTER TABLE public.audit_questions
      ADD CONSTRAINT chk_audit_questions_display_number_positive
      CHECK (display_number IS NULL OR display_number > 0);
  END IF;
END;
$$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'audit_questions'
      AND column_name = 'scoring_model_version'
  ) THEN
    ALTER TABLE public.audit_questions
      ADD COLUMN scoring_model_version text;
  END IF;
END;
$$;

UPDATE public.audit_questions
SET scoring_model_version = 'legacy_62_v1'
WHERE scoring_model_version IS NULL;

ALTER TABLE public.audit_questions
  ALTER COLUMN scoring_model_version SET DEFAULT 'legacy_62_v1',
  ALTER COLUMN scoring_model_version SET NOT NULL;


-- ---------------------------------------------------------------------------
-- 3. checklist_sections model version
-- ---------------------------------------------------------------------------

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'checklist_sections'
      AND column_name = 'scoring_model_version'
  ) THEN
    ALTER TABLE public.checklist_sections
      ADD COLUMN scoring_model_version text;
  END IF;
END;
$$;

UPDATE public.checklist_sections
SET scoring_model_version = 'legacy_62_v1'
WHERE scoring_model_version IS NULL;

ALTER TABLE public.checklist_sections
  ALTER COLUMN scoring_model_version SET DEFAULT 'legacy_62_v1',
  ALTER COLUMN scoring_model_version SET NOT NULL;


-- ---------------------------------------------------------------------------
-- 4. audits model version
-- ---------------------------------------------------------------------------

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'audits'
      AND column_name = 'scoring_model_version'
  ) THEN
    ALTER TABLE public.audits
      ADD COLUMN scoring_model_version text;
  END IF;
END;
$$;

-- Existing audits were created against the legacy 62-question checklist.
UPDATE public.audits
SET scoring_model_version = 'legacy_62_v1'
WHERE scoring_model_version IS NULL;

-- New audits should use the real Pret Customer Experience model by default.
ALTER TABLE public.audits
  ALTER COLUMN scoring_model_version SET DEFAULT 'pret_ce_v1',
  ALTER COLUMN scoring_model_version SET NOT NULL;

