-- Audit V2.2 Slice 3A: photo evidence foundation.
--
-- Adds private, scoped audit photo evidence metadata and storage policies.
-- This slice does not make photos required for completion and does not affect
-- Pret CE V1 scoring.

-- ---------------------------------------------------------------------------
-- 1. Enum
-- ---------------------------------------------------------------------------

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_type
    WHERE typnamespace = 'public'::regnamespace
      AND typname = 'audit_evidence_type'
  ) THEN
    CREATE TYPE public.audit_evidence_type AS ENUM ('photo');
  END IF;
END;
$$;


-- ---------------------------------------------------------------------------
-- 2. Table
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.audit_evidence (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  audit_id uuid NOT NULL REFERENCES public.audits(id) ON DELETE CASCADE,
  store_id uuid NOT NULL REFERENCES public.stores(id) ON DELETE CASCADE,
  question_id uuid NULL REFERENCES public.audit_questions(id) ON DELETE SET NULL,
  audit_answer_id uuid NULL REFERENCES public.audit_answers(id) ON DELETE SET NULL,
  evidence_type public.audit_evidence_type NOT NULL DEFAULT 'photo',
  bucket_id text NOT NULL DEFAULT 'audit-evidence',
  file_path text NOT NULL,
  file_name text NULL,
  mime_type text NULL,
  file_size_bytes integer NULL,
  caption text NULL,
  created_by uuid NULL REFERENCES public.profiles(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),

  CONSTRAINT chk_audit_evidence_file_path_not_blank
    CHECK (btrim(file_path) <> ''),
  CONSTRAINT chk_audit_evidence_photo_only
    CHECK (evidence_type = 'photo'),
  CONSTRAINT chk_audit_evidence_bucket
    CHECK (bucket_id = 'audit-evidence'),
  CONSTRAINT chk_audit_evidence_file_size_positive
    CHECK (file_size_bytes IS NULL OR file_size_bytes > 0),
  CONSTRAINT chk_audit_evidence_image_mime
    CHECK (mime_type IS NULL OR mime_type LIKE 'image/%'),
  CONSTRAINT uq_audit_evidence_bucket_file_path
    UNIQUE (bucket_id, file_path)
);

CREATE INDEX IF NOT EXISTS idx_audit_evidence_audit_id
  ON public.audit_evidence (audit_id);

CREATE INDEX IF NOT EXISTS idx_audit_evidence_store_id
  ON public.audit_evidence (store_id);

CREATE INDEX IF NOT EXISTS idx_audit_evidence_question_id
  ON public.audit_evidence (question_id);

CREATE INDEX IF NOT EXISTS idx_audit_evidence_audit_answer_id
  ON public.audit_evidence (audit_answer_id);

CREATE INDEX IF NOT EXISTS idx_audit_evidence_created_by
  ON public.audit_evidence (created_by);

CREATE INDEX IF NOT EXISTS idx_audit_evidence_audit_question
  ON public.audit_evidence (audit_id, question_id);

CREATE INDEX IF NOT EXISTS idx_audit_evidence_audit_created_at
  ON public.audit_evidence (audit_id, created_at DESC);


-- ---------------------------------------------------------------------------
-- 3. Integrity triggers
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.fn_validate_audit_evidence_v1()
  RETURNS trigger
  LANGUAGE plpgsql
  SECURITY DEFINER
  SET search_path = public, pg_temp
AS $$
DECLARE
  v_audit_store_id uuid;
  v_answer_question_id uuid;
BEGIN
  IF TG_OP = 'UPDATE' THEN
    IF NEW.audit_id IS DISTINCT FROM OLD.audit_id
      OR NEW.store_id IS DISTINCT FROM OLD.store_id
      OR NEW.question_id IS DISTINCT FROM OLD.question_id
      OR NEW.audit_answer_id IS DISTINCT FROM OLD.audit_answer_id
      OR NEW.bucket_id IS DISTINCT FROM OLD.bucket_id
      OR NEW.file_path IS DISTINCT FROM OLD.file_path
      OR NEW.evidence_type IS DISTINCT FROM OLD.evidence_type THEN
      RAISE EXCEPTION 'Audit evidence scope cannot be changed';
    END IF;
  END IF;

  NEW.file_path := btrim(NEW.file_path);
  NEW.file_name := NULLIF(btrim(COALESCE(NEW.file_name, '')), '');
  NEW.mime_type := NULLIF(btrim(COALESCE(NEW.mime_type, '')), '');
  NEW.caption := NULLIF(btrim(COALESCE(NEW.caption, '')), '');

  IF NEW.file_path = '' THEN
    RAISE EXCEPTION 'Evidence file path is required';
  END IF;

  IF NEW.evidence_type <> 'photo' THEN
    RAISE EXCEPTION 'Only photo evidence is supported';
  END IF;

  IF NEW.bucket_id <> 'audit-evidence' THEN
    RAISE EXCEPTION 'Invalid evidence bucket';
  END IF;

  IF NEW.mime_type IS NOT NULL AND NEW.mime_type NOT LIKE 'image/%' THEN
    RAISE EXCEPTION 'Evidence file must be an image';
  END IF;

  SELECT audit.store_id
  INTO v_audit_store_id
  FROM public.audits AS audit
  WHERE audit.id = NEW.audit_id;

  IF v_audit_store_id IS NULL THEN
    RAISE EXCEPTION 'Audit not found';
  END IF;

  IF NEW.store_id IS DISTINCT FROM v_audit_store_id THEN
    RAISE EXCEPTION 'Evidence store must match audit store';
  END IF;

  IF NEW.question_id IS NOT NULL
    AND NOT EXISTS (
      SELECT 1
      FROM public.audit_questions AS question
      WHERE question.id = NEW.question_id
    ) THEN
    RAISE EXCEPTION 'Evidence question not found';
  END IF;

  IF NEW.audit_answer_id IS NOT NULL THEN
    SELECT answer.question_id
    INTO v_answer_question_id
    FROM public.audit_answers AS answer
    WHERE answer.id = NEW.audit_answer_id
      AND answer.audit_id = NEW.audit_id;

    IF v_answer_question_id IS NULL THEN
      RAISE EXCEPTION 'Evidence answer must belong to the same audit';
    END IF;

    IF NEW.question_id IS NOT NULL
      AND v_answer_question_id IS DISTINCT FROM NEW.question_id THEN
      RAISE EXCEPTION 'Evidence answer must belong to the same question';
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_validate_audit_evidence_v1
  ON public.audit_evidence;

CREATE TRIGGER trg_validate_audit_evidence_v1
  BEFORE INSERT OR UPDATE ON public.audit_evidence
  FOR EACH ROW EXECUTE FUNCTION public.fn_validate_audit_evidence_v1();

DROP TRIGGER IF EXISTS trg_audit_evidence_updated_at
  ON public.audit_evidence;

CREATE TRIGGER trg_audit_evidence_updated_at
  BEFORE UPDATE ON public.audit_evidence
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();


-- ---------------------------------------------------------------------------
-- 4. Shared access helpers for table and storage RLS
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.can_access_audit_evidence_v1(
  p_audit_id uuid,
  p_store_id uuid,
  p_require_editable boolean DEFAULT false
)
RETURNS boolean
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_actor public.profiles%ROWTYPE;
  v_audit public.audits%ROWTYPE;
  v_store_area_id uuid;
BEGIN
  IF auth.uid() IS NULL THEN
    RETURN false;
  END IF;

  SELECT *
  INTO v_actor
  FROM public.profiles
  WHERE id = auth.uid();

  IF NOT FOUND THEN
    RETURN false;
  END IF;

  SELECT *
  INTO v_audit
  FROM public.audits
  WHERE id = p_audit_id;

  IF NOT FOUND OR v_audit.store_id IS DISTINCT FROM p_store_id THEN
    RETURN false;
  END IF;

  IF p_require_editable
    AND (v_audit.is_locked = true OR v_audit.status NOT IN ('draft', 'in_progress')) THEN
    RETURN false;
  END IF;

  SELECT store.area_id
  INTO v_store_area_id
  FROM public.stores AS store
  WHERE store.id = p_store_id;

  IF NOT FOUND THEN
    RETURN false;
  END IF;

  RETURN (
    v_actor.role = 'admin'
    OR (
      v_actor.role = 'area_manager'
      AND v_actor.area_id = v_store_area_id
    )
    OR (
      v_actor.role IN ('store_manager', 'leader')
      AND v_actor.store_id = p_store_id
    )
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.can_access_audit_evidence_storage_path_v1(
  p_path text,
  p_require_editable boolean DEFAULT false
)
RETURNS boolean
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_store_id uuid;
  v_audit_id uuid;
  v_question_id uuid;
BEGIN
  IF split_part(p_path, '/', 1) <> 'stores'
    OR split_part(p_path, '/', 3) <> 'audits'
    OR split_part(p_path, '/', 5) <> 'questions' THEN
    RETURN false;
  END IF;

  IF split_part(p_path, '/', 2) !~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
    OR split_part(p_path, '/', 4) !~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
    OR split_part(p_path, '/', 6) !~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
    OR split_part(p_path, '/', 7) = '' THEN
    RETURN false;
  END IF;

  v_store_id := split_part(p_path, '/', 2)::uuid;
  v_audit_id := split_part(p_path, '/', 4)::uuid;
  v_question_id := split_part(p_path, '/', 6)::uuid;

  IF NOT EXISTS (
    SELECT 1
    FROM public.audit_questions AS question
    WHERE question.id = v_question_id
  ) THEN
    RETURN false;
  END IF;

  RETURN public.can_access_audit_evidence_v1(
    v_audit_id,
    v_store_id,
    p_require_editable
  );
END;
$$;

REVOKE ALL ON FUNCTION public.can_access_audit_evidence_v1(uuid, uuid, boolean)
  FROM PUBLIC;
REVOKE ALL ON FUNCTION public.can_access_audit_evidence_storage_path_v1(text, boolean)
  FROM PUBLIC;

GRANT EXECUTE ON FUNCTION public.can_access_audit_evidence_v1(uuid, uuid, boolean)
  TO authenticated;
GRANT EXECUTE ON FUNCTION public.can_access_audit_evidence_storage_path_v1(text, boolean)
  TO authenticated;


-- ---------------------------------------------------------------------------
-- 5. Grants and RLS
-- ---------------------------------------------------------------------------

GRANT SELECT, INSERT, UPDATE, DELETE ON public.audit_evidence TO authenticated;

ALTER TABLE public.audit_evidence ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS audit_evidence_select ON public.audit_evidence;
DROP POLICY IF EXISTS audit_evidence_insert ON public.audit_evidence;
DROP POLICY IF EXISTS audit_evidence_update ON public.audit_evidence;
DROP POLICY IF EXISTS audit_evidence_delete ON public.audit_evidence;

CREATE POLICY audit_evidence_select ON public.audit_evidence
  FOR SELECT USING (
    public.can_access_audit_evidence_v1(audit_id, store_id, false)
  );

CREATE POLICY audit_evidence_insert ON public.audit_evidence
  FOR INSERT WITH CHECK (
    created_by = auth.uid()
    AND public.can_access_audit_evidence_v1(audit_id, store_id, true)
  );

CREATE POLICY audit_evidence_update ON public.audit_evidence
  FOR UPDATE USING (
    public.can_access_audit_evidence_v1(audit_id, store_id, true)
  ) WITH CHECK (
    public.can_access_audit_evidence_v1(audit_id, store_id, true)
  );

CREATE POLICY audit_evidence_delete ON public.audit_evidence
  FOR DELETE USING (
    public.can_access_audit_evidence_v1(audit_id, store_id, true)
  );


-- ---------------------------------------------------------------------------
-- 6. Private storage bucket and scoped object policies
-- ---------------------------------------------------------------------------

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'audit-evidence',
  'audit-evidence',
  false,
  5242880,
  ARRAY['image/jpeg', 'image/png', 'image/webp']
)
ON CONFLICT (id) DO UPDATE
SET
  public = false,
  file_size_limit = 5242880,
  allowed_mime_types = ARRAY['image/jpeg', 'image/png', 'image/webp'];

DROP POLICY IF EXISTS audit_evidence_objects_select ON storage.objects;
DROP POLICY IF EXISTS audit_evidence_objects_insert ON storage.objects;
DROP POLICY IF EXISTS audit_evidence_objects_delete ON storage.objects;

CREATE POLICY audit_evidence_objects_select ON storage.objects
  FOR SELECT TO authenticated
  USING (
    bucket_id = 'audit-evidence'
    AND public.can_access_audit_evidence_storage_path_v1(name, false)
  );

CREATE POLICY audit_evidence_objects_insert ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'audit-evidence'
    AND public.can_access_audit_evidence_storage_path_v1(name, true)
  );

CREATE POLICY audit_evidence_objects_delete ON storage.objects
  FOR DELETE TO authenticated
  USING (
    bucket_id = 'audit-evidence'
    AND public.can_access_audit_evidence_storage_path_v1(name, true)
  );
