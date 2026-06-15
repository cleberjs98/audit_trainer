-- =============================================================================
-- Store Audit Trainer - Complete Audit V1 RPC
-- V1 follow-up migration
-- =============================================================================
-- Purpose:
--   Enable Review / Complete Audit V1 without loosening public.audits UPDATE
--   RLS policies. The app calls this RPC with the normal authenticated
--   Supabase client; no service role is required by app code.
--
-- Scope:
--   - Creates public.complete_audit_v1(p_audit_id uuid).
--   - Does not alter previous migrations.
--   - Does not alter RLS policies.
--   - Does not modify audit_answers.
--   - Does not create photos, AI reports, PDFs, or action plans.
--
-- Security model:
--   - SECURITY DEFINER with a fixed search_path.
--   - Explicit auth, profile, role, store, and area checks inside the function.
--   - Computes scores only from DB-trusted checklist and answer rows.
--   - Updates only final completion fields on public.audits.
--   - Existing trg_lock_audit_on_complete sets is_locked and completed_at.
--
-- Scoring caveat:
--   The current schema has no is_scored or question_type column, and
--   audit_questions.max_score must be positive. Therefore this RPC does not
--   invent special exclusions for information-only or product-feedback rows.
--   Future schema should add is_scored/question_type if some questions must be
--   permanently excluded from final scoring.
--
-- section_scores JSON shape:
--   Includes active sections that have active questions.
--   [
--     {
--       "section_id": "...",
--       "section_title": "...",
--       "total_score": 12,
--       "max_score": 15,
--       "percentage": 80.00,
--       "answered_count": 3,
--       "na_count": 1,
--       "unanswered_optional_count": 0
--     }
--   ]
-- =============================================================================

CREATE OR REPLACE FUNCTION public.complete_audit_v1(p_audit_id uuid)
RETURNS TABLE (
  audit_id uuid,
  total_score numeric,
  max_score numeric,
  percentage numeric,
  score_band public.score_band,
  section_scores jsonb,
  status public.audit_status,
  is_locked boolean,
  completed_at timestamptz
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_user_id uuid;
  v_profile public.profiles%ROWTYPE;
  v_audit record;
  v_missing_required_count integer := 0;
  v_invalid_answer_count integer := 0;
  v_total_score numeric := 0;
  v_max_score numeric := 0;
  v_percentage numeric := 0;
  v_score_band public.score_band;
  v_section_scores jsonb := '[]'::jsonb;
BEGIN
  v_user_id := auth.uid();

  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Authentication required';
  END IF;

  IF p_audit_id IS NULL THEN
    RAISE EXCEPTION 'Audit not found or access denied';
  END IF;

  SELECT *
  INTO v_profile
  FROM public.profiles
  WHERE id = v_user_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Profile not found';
  END IF;

  IF v_profile.role NOT IN ('admin', 'area_manager', 'store_manager', 'leader') THEN
    RAISE EXCEPTION 'Unsupported role';
  END IF;

  SELECT
    a.id,
    a.store_id,
    a.status,
    a.is_locked,
    s.area_id
  INTO v_audit
  FROM public.audits AS a
  JOIN public.stores AS s ON s.id = a.store_id
  WHERE a.id = p_audit_id
  FOR UPDATE OF a;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Audit not found or access denied';
  END IF;

  IF v_profile.role = 'area_manager' THEN
    IF v_profile.area_id IS NULL OR v_audit.area_id IS DISTINCT FROM v_profile.area_id THEN
      RAISE EXCEPTION 'Audit not found or access denied';
    END IF;
  ELSIF v_profile.role IN ('store_manager', 'leader') THEN
    IF v_profile.store_id IS NULL OR v_audit.store_id IS DISTINCT FROM v_profile.store_id THEN
      RAISE EXCEPTION 'Audit not found or access denied';
    END IF;
  END IF;

  IF v_audit.is_locked OR v_audit.status NOT IN ('draft', 'in_progress') THEN
    RAISE EXCEPTION 'Audit already locked or completed';
  END IF;

  -- Required active questions must be answered unless explicitly marked N/A.
  SELECT count(*)::integer
  INTO v_missing_required_count
  FROM public.audit_questions AS q
  JOIN public.checklist_sections AS s ON s.id = q.section_id
  LEFT JOIN public.audit_answers AS a
    ON a.audit_id = p_audit_id
   AND a.question_id = q.id
  WHERE q.is_active = true
    AND s.is_active = true
    AND q.is_required = true
    AND (
      a.id IS NULL
      OR (a.is_na = false AND a.score IS NULL)
    );

  IF v_missing_required_count > 0 THEN
    RAISE EXCEPTION 'Required questions missing answers';
  END IF;

  -- Required saved non-N/A answers must have a valid score. Optional saved rows
  -- with score NULL and is_na=false are treated as unanswered optional rows and
  -- excluded from scoring. This keeps the RPC safe if future code pre-creates
  -- answer rows before the user enters a score.
  SELECT count(*)::integer
  INTO v_invalid_answer_count
  FROM public.audit_answers AS a
  JOIN public.audit_questions AS q ON q.id = a.question_id
  JOIN public.checklist_sections AS s ON s.id = q.section_id
  WHERE a.audit_id = p_audit_id
    AND q.is_active = true
    AND s.is_active = true
    AND (
      (a.is_na = true AND a.score IS NOT NULL)
      OR (q.is_required = true AND a.is_na = false AND a.score IS NULL)
      OR (a.score IS NOT NULL AND (a.score < 0 OR a.score > q.max_score))
    );

  IF v_invalid_answer_count > 0 THEN
    RAISE EXCEPTION 'Invalid answer score';
  END IF;

  -- Final score uses active sections/questions only. N/A and unanswered
  -- optional questions are excluded from numerator and denominator.
  SELECT
    COALESCE(
      sum(
        CASE
          WHEN a.id IS NOT NULL AND a.is_na = false AND a.score IS NOT NULL
          THEN a.score
          ELSE 0
        END
      ),
      0
    ),
    COALESCE(
      sum(
        CASE
          WHEN a.id IS NOT NULL AND a.is_na = false AND a.score IS NOT NULL
          THEN q.max_score
          ELSE 0
        END
      ),
      0
    )
  INTO v_total_score, v_max_score
  FROM public.audit_questions AS q
  JOIN public.checklist_sections AS s ON s.id = q.section_id
  LEFT JOIN public.audit_answers AS a
    ON a.audit_id = p_audit_id
   AND a.question_id = q.id
  WHERE q.is_active = true
    AND s.is_active = true;

  IF v_max_score <= 0 THEN
    RAISE EXCEPTION 'No scorable answers';
  END IF;

  v_percentage := round((v_total_score / v_max_score) * 100, 2);

  v_score_band :=
    CASE
      WHEN v_percentage >= 95 THEN 'excellent'::public.score_band
      WHEN v_percentage >= 85 THEN 'good'::public.score_band
      WHEN v_percentage >= 70 THEN 'needs_focus'::public.score_band
      ELSE 'critical'::public.score_band
    END;

  WITH per_section AS (
    SELECT
      s.id AS section_id,
      s.title AS section_title,
      s.order_index,
      COALESCE(
        sum(
          CASE
            WHEN a.id IS NOT NULL AND a.is_na = false AND a.score IS NOT NULL
            THEN a.score
            ELSE 0
          END
        ),
        0
      ) AS total_score,
      COALESCE(
        sum(
          CASE
            WHEN a.id IS NOT NULL AND a.is_na = false AND a.score IS NOT NULL
            THEN q.max_score
            ELSE 0
          END
        ),
        0
      ) AS max_score,
      (count(*) FILTER (
        WHERE a.id IS NOT NULL
          AND a.is_na = false
          AND a.score IS NOT NULL
      ))::integer AS answered_count,
      (count(*) FILTER (
        WHERE a.id IS NOT NULL
          AND a.is_na = true
      ))::integer AS na_count,
      (count(*) FILTER (
        WHERE q.is_required = false
          AND (
            a.id IS NULL
            OR (a.is_na = false AND a.score IS NULL)
          )
      ))::integer AS unanswered_optional_count
    FROM public.checklist_sections AS s
    JOIN public.audit_questions AS q ON q.section_id = s.id
    LEFT JOIN public.audit_answers AS a
      ON a.audit_id = p_audit_id
     AND a.question_id = q.id
    WHERE s.is_active = true
      AND q.is_active = true
    GROUP BY s.id, s.title, s.order_index
  )
  SELECT COALESCE(
    jsonb_agg(
      jsonb_build_object(
        'section_id', ps.section_id,
        'section_title', ps.section_title,
        'total_score', ps.total_score,
        'max_score', ps.max_score,
        'percentage',
          CASE
            WHEN ps.max_score > 0 THEN round((ps.total_score / ps.max_score) * 100, 2)
            ELSE NULL
          END,
        'answered_count', ps.answered_count,
        'na_count', ps.na_count,
        'unanswered_optional_count', ps.unanswered_optional_count
      )
      ORDER BY ps.order_index
    ),
    '[]'::jsonb
  )
  INTO v_section_scores
  FROM per_section AS ps;

  UPDATE public.audits AS a
  SET
    total_score = v_total_score,
    max_score = v_max_score,
    percentage = v_percentage,
    score_band = v_score_band,
    section_scores = v_section_scores,
    status = 'completed'
  WHERE a.id = p_audit_id;

  RETURN QUERY
  SELECT
    a.id,
    a.total_score,
    a.max_score,
    a.percentage,
    a.score_band,
    a.section_scores,
    a.status,
    a.is_locked,
    a.completed_at
  FROM public.audits AS a
  WHERE a.id = p_audit_id;
END;
$$;

REVOKE ALL ON FUNCTION public.complete_audit_v1(uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.complete_audit_v1(uuid) FROM anon;
GRANT EXECUTE ON FUNCTION public.complete_audit_v1(uuid) TO authenticated;
