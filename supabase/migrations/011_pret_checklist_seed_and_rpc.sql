-- =============================================================================
-- Store Audit Trainer - Pret Checklist Seed and Completion RPC
-- V1 follow-up migration
-- =============================================================================
-- Purpose:
--   Switch the active app checklist from the deprecated 62-question model to
--   the real Pret Customer Experience V1 model:
--     - 19 core questions worth 95 points
--     - 1 Outstanding Card bonus question worth 5 points
--     - no Information Only section in app V1
--
-- Scope:
--   - Deactivates legacy_62_v1 checklist sections/questions.
--   - Upserts the pret_ce_v1 Core Score and Outstanding Card sections.
--   - Upserts the 20 pret_ce_v1 questions.
--   - Replaces complete_audit_v1 so pret_ce_v1 scores core and bonus
--     separately while preserving legacy_62_v1 completion behavior as much as
--     possible for existing test audits.
--
-- Deliberately not included:
--   - No deletes.
--   - No RLS, grants beyond RPC EXECUTE, storage, or audit_answers schema
--     changes.
-- =============================================================================

-- ---------------------------------------------------------------------------
-- 1. Deactivate legacy checklist reference data
-- ---------------------------------------------------------------------------

UPDATE public.audit_questions
SET is_active = false
WHERE scoring_model_version = 'legacy_62_v1';

UPDATE public.checklist_sections
SET is_active = false
WHERE scoring_model_version = 'legacy_62_v1';


-- ---------------------------------------------------------------------------
-- 2. Pret Customer Experience V1 sections
-- ---------------------------------------------------------------------------

WITH section_seed (
  slug,
  title,
  description,
  order_index,
  scoring_model_version
) AS (
  VALUES
    (
      'pret-ce-v1-core-score',
      'Core Score',
      'Real Pret Customer Experience core score: 19 questions worth 95 points.',
      1,
      'pret_ce_v1'
    ),
    (
      'pret-ce-v1-outstanding-card',
      'Outstanding Card',
      'Outstanding service bonus worth up to 5 points. This does not penalize the 95-point core score.',
      2,
      'pret_ce_v1'
    )
)
INSERT INTO public.checklist_sections (
  slug,
  title,
  description,
  order_index,
  is_active,
  scoring_model_version
)
SELECT
  seed.slug,
  seed.title,
  seed.description,
  seed.order_index,
  true,
  seed.scoring_model_version
FROM section_seed AS seed
ON CONFLICT (slug) DO UPDATE
SET
  title = EXCLUDED.title,
  description = EXCLUDED.description,
  order_index = EXCLUDED.order_index,
  is_active = EXCLUDED.is_active,
  scoring_model_version = EXCLUDED.scoring_model_version;


-- ---------------------------------------------------------------------------
-- 3. Pret Customer Experience V1 questions
-- ---------------------------------------------------------------------------

WITH question_seed (
  section_slug,
  question_key,
  question_text,
  max_score,
  is_required,
  is_critical,
  order_index,
  scoring_group,
  response_type,
  required_for_completion,
  display_number,
  scoring_model_version
) AS (
  VALUES
    (
      'pret-ce-v1-core-score',
      'pret-ce-v1-core-q01',
      'How clean and tidy was the shop from the outside and at the entrance (signage, door, doormat, outside seating)?',
      5, true, false, 1, 'core'::public.question_scoring_group, 'score'::public.question_response_type, true, 1, 'pret_ce_v1'
    ),
    (
      'pret-ce-v1-core-score',
      'pret-ce-v1-core-q02',
      'How well presented were the MAIN fridge display units, including hot food (neat, at the front of the shelf, with labels facing forward and with a price ticket)?',
      5, true, false, 2, 'core'::public.question_scoring_group, 'score'::public.question_response_type, true, 2, 'pret_ce_v1'
    ),
    (
      'pret-ce-v1-core-score',
      'pret-ce-v1-core-q03',
      'How well presented were SNACKS in snack stands and BAKERY at the till counter?',
      5, true, false, 3, 'core'::public.question_scoring_group, 'score'::public.question_response_type, true, 3, 'pret_ce_v1'
    ),
    (
      'pret-ce-v1-core-score',
      'pret-ce-v1-core-q04',
      'For this visit, EVERY price ticket for freshly-made COLD FRIDGE products should have at least 1 item available. Was this availability target met and, if not, by how many price tickets?',
      5, true, false, 4, 'core'::public.question_scoring_group, 'score'::public.question_response_type, true, 4, 'pret_ce_v1'
    ),
    (
      'pret-ce-v1-core-score',
      'pret-ce-v1-core-q05',
      'For this visit, EVERY price ticket for freshly-made HOT FOOD products should have at least 1 item available. Was this availability target missed and, if so, by how many price tickets?',
      5, true, false, 5, 'core'::public.question_scoring_group, 'score'::public.question_response_type, true, 5, 'pret_ce_v1'
    ),
    (
      'pret-ce-v1-core-score',
      'pret-ce-v1-core-q06',
      'Were ALL snacks and bottled drinks available and, if not, how many products were missing?',
      5, true, false, 6, 'core'::public.question_scoring_group, 'score'::public.question_response_type, true, 6, 'pret_ce_v1'
    ),
    (
      'pret-ce-v1-core-score',
      'pret-ce-v1-core-q07',
      'For this visit, you should have a choice of AT LEAST 10 different freshly-made BAKERY products. Were there at least 10 (target met), 9 (1 fewer than target), 8 (2 fewer), 7 (3 fewer), or less than 7 (4/4+ fewer)?',
      5, true, false, 7, 'core'::public.question_scoring_group, 'score'::public.question_response_type, true, 7, 'pret_ce_v1'
    ),
    (
      'pret-ce-v1-core-score',
      'pret-ce-v1-core-q08',
      'How smart and presentable was the team member serving you?',
      5, true, false, 8, 'core'::public.question_scoring_group, 'score'::public.question_response_type, true, 8, 'pret_ce_v1'
    ),
    (
      'pret-ce-v1-core-score',
      'pret-ce-v1-core-q09',
      'How reasonable was your queue time, given how busy it was? We aim for 60 seconds.',
      5, true, false, 9, 'core'::public.question_scoring_group, 'score'::public.question_response_type, true, 9, 'pret_ce_v1'
    ),
    (
      'pret-ce-v1-core-score',
      'pret-ce-v1-core-q10',
      'How reasonable was the wait for your barista prepared drink? We aim for 60 seconds.',
      5, true, false, 10, 'core'::public.question_scoring_group, 'score'::public.question_response_type, true, 10, 'pret_ce_v1'
    ),
    (
      'pret-ce-v1-core-score',
      'pret-ce-v1-core-q11',
      'How good were all our team members at prioritising customers?',
      5, true, false, 11, 'core'::public.question_scoring_group, 'score'::public.question_response_type, true, 11, 'pret_ce_v1'
    ),
    (
      'pret-ce-v1-core-score',
      'pret-ce-v1-core-q12',
      'How well did the person at the till engage with you (eye contact, smile and greeting)?',
      5, true, false, 12, 'core'::public.question_scoring_group, 'score'::public.question_response_type, true, 12, 'pret_ce_v1'
    ),
    (
      'pret-ce-v1-core-score',
      'pret-ce-v1-core-q13',
      'Did you receive a pleasant parting comment at point of payment from the team member that served you?',
      5, true, false, 13, 'core'::public.question_scoring_group, 'score'::public.question_response_type, true, 13, 'pret_ce_v1'
    ),
    (
      'pret-ce-v1-core-score',
      'pret-ce-v1-core-q14',
      'Were you acknowledged when your drink was handed to you?',
      5, true, false, 14, 'core'::public.question_scoring_group, 'score'::public.question_response_type, true, 14, 'pret_ce_v1'
    ),
    (
      'pret-ce-v1-core-score',
      'pret-ce-v1-core-q15',
      'Based on the scenario you selected, please rate your experience when making your enquiry to a team member.',
      5, true, false, 15, 'core'::public.question_scoring_group, 'score'::public.question_response_type, true, 15, 'pret_ce_v1'
    ),
    (
      'pret-ce-v1-core-score',
      'pret-ce-v1-core-q16',
      'How was the quality and presentation of your food items?',
      5, true, false, 16, 'core'::public.question_scoring_group, 'score'::public.question_response_type, true, 16, 'pret_ce_v1'
    ),
    (
      'pret-ce-v1-core-score',
      'pret-ce-v1-core-q17',
      'How was the quality and presentation of your barista-prepared drink?',
      5, true, false, 17, 'core'::public.question_scoring_group, 'score'::public.question_response_type, true, 17, 'pret_ce_v1'
    ),
    (
      'pret-ce-v1-core-score',
      'pret-ce-v1-core-q18',
      'How clean and tidy were the floors and seating area in the shop?',
      5, true, false, 18, 'core'::public.question_scoring_group, 'score'::public.question_response_type, true, 18, 'pret_ce_v1'
    ),
    (
      'pret-ce-v1-core-score',
      'pret-ce-v1-core-q19',
      'How clean, tidy and well stocked with cutlery/sugars were the bin stations?',
      5, true, false, 19, 'core'::public.question_scoring_group, 'score'::public.question_response_type, true, 19, 'pret_ce_v1'
    ),
    (
      'pret-ce-v1-outstanding-card',
      'pret-ce-v1-outstanding-card',
      'Smiling, courteous and competent service is our minimum expected standard. Did any ONE team member go beyond this with truly exceptional service that you would talk about with others?',
      5, false, false, 1, 'bonus'::public.question_scoring_group, 'boolean_score'::public.question_response_type, false, 21, 'pret_ce_v1'
    )
),
question_rows AS (
  SELECT
    sections.id AS section_id,
    seed.question_key,
    seed.question_text,
    seed.max_score,
    seed.is_required,
    seed.is_critical,
    seed.order_index,
    seed.scoring_group,
    seed.response_type,
    seed.required_for_completion,
    seed.display_number,
    seed.scoring_model_version
  FROM question_seed AS seed
  JOIN public.checklist_sections AS sections
    ON sections.slug = seed.section_slug
)
INSERT INTO public.audit_questions (
  section_id,
  question_key,
  question_text,
  question_description,
  max_score,
  is_required,
  is_critical,
  is_active,
  order_index,
  scoring_group,
  response_type,
  required_for_completion,
  display_number,
  scoring_model_version
)
SELECT
  section_id,
  question_key,
  question_text,
  NULL,
  max_score,
  is_required,
  is_critical,
  true,
  order_index,
  scoring_group,
  response_type,
  required_for_completion,
  display_number,
  scoring_model_version
FROM question_rows
ON CONFLICT (question_key) DO UPDATE
SET
  section_id = EXCLUDED.section_id,
  question_text = EXCLUDED.question_text,
  question_description = EXCLUDED.question_description,
  max_score = EXCLUDED.max_score,
  is_required = EXCLUDED.is_required,
  is_critical = EXCLUDED.is_critical,
  is_active = EXCLUDED.is_active,
  order_index = EXCLUDED.order_index,
  scoring_group = EXCLUDED.scoring_group,
  response_type = EXCLUDED.response_type,
  required_for_completion = EXCLUDED.required_for_completion,
  display_number = EXCLUDED.display_number,
  scoring_model_version = EXCLUDED.scoring_model_version;


-- ---------------------------------------------------------------------------
-- 4. Replace completion RPC with model-aware scoring
-- ---------------------------------------------------------------------------

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
  v_model_version text;
  v_missing_required_count integer := 0;
  v_invalid_answer_count integer := 0;
  v_total_score numeric := 0;
  v_max_score numeric := 0;
  v_percentage numeric := 0;
  v_score_band public.score_band;
  v_section_scores jsonb := '[]'::jsonb;
  v_bonus_score numeric := 0;
  v_bonus_max_score numeric := 0;
  v_bonus_answered boolean := false;
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
    a.scoring_model_version,
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

  v_model_version := COALESCE(v_audit.scoring_model_version, 'legacy_62_v1');

  IF v_model_version = 'pret_ce_v1' THEN
    -- Pret CE V1: all required core questions must have a numeric non-N/A
    -- answer. N/A is not allowed to reduce the official 95-point denominator.
    SELECT count(*)::integer
    INTO v_missing_required_count
    FROM public.audit_questions AS q
    JOIN public.checklist_sections AS s ON s.id = q.section_id
    LEFT JOIN public.audit_answers AS a
      ON a.audit_id = p_audit_id
     AND a.question_id = q.id
    WHERE q.scoring_model_version = 'pret_ce_v1'
      AND s.scoring_model_version = 'pret_ce_v1'
      AND q.is_active = true
      AND s.is_active = true
      AND q.scoring_group = 'core'::public.question_scoring_group
      AND q.required_for_completion = true
      AND (
        a.id IS NULL
        OR a.is_na = true
        OR a.score IS NULL
      );

    IF v_missing_required_count > 0 THEN
      RAISE EXCEPTION 'Required questions missing answers';
    END IF;

    SELECT count(*)::integer
    INTO v_invalid_answer_count
    FROM public.audit_answers AS a
    JOIN public.audit_questions AS q ON q.id = a.question_id
    JOIN public.checklist_sections AS s ON s.id = q.section_id
    WHERE a.audit_id = p_audit_id
      AND q.scoring_model_version = 'pret_ce_v1'
      AND s.scoring_model_version = 'pret_ce_v1'
      AND q.is_active = true
      AND s.is_active = true
      AND (
        (a.is_na = true)
        OR (a.is_na = true AND a.score IS NOT NULL)
        OR (q.scoring_group = 'core'::public.question_scoring_group AND a.score IS NULL)
        OR (a.score IS NOT NULL AND (a.score < 0 OR a.score > q.max_score))
        OR (
          q.response_type = 'boolean_score'::public.question_response_type
          AND a.score IS NOT NULL
          AND a.score NOT IN (0, q.max_score)
        )
      );

    IF v_invalid_answer_count > 0 THEN
      RAISE EXCEPTION 'Invalid answer score';
    END IF;

    SELECT
      COALESCE(sum(a.score), 0),
      COALESCE(sum(q.max_score), 0)
    INTO v_total_score, v_max_score
    FROM public.audit_questions AS q
    JOIN public.checklist_sections AS s ON s.id = q.section_id
    JOIN public.audit_answers AS a
      ON a.audit_id = p_audit_id
     AND a.question_id = q.id
    WHERE q.scoring_model_version = 'pret_ce_v1'
      AND s.scoring_model_version = 'pret_ce_v1'
      AND q.is_active = true
      AND s.is_active = true
      AND q.scoring_group = 'core'::public.question_scoring_group
      AND q.required_for_completion = true;

    IF v_max_score <> 95 THEN
      RAISE EXCEPTION 'Pret core max score must equal 95';
    END IF;

    SELECT
      COALESCE(sum(q.max_score), 0)
    INTO v_bonus_max_score
    FROM public.audit_questions AS q
    JOIN public.checklist_sections AS s ON s.id = q.section_id
    WHERE q.scoring_model_version = 'pret_ce_v1'
      AND s.scoring_model_version = 'pret_ce_v1'
      AND q.is_active = true
      AND s.is_active = true
      AND q.scoring_group = 'bonus'::public.question_scoring_group;

    IF v_bonus_max_score <> 5 THEN
      RAISE EXCEPTION 'Pret bonus max score must equal 5';
    END IF;

    SELECT
      COALESCE(sum(a.score), 0),
      EXISTS (
        SELECT 1
        FROM public.audit_answers AS answered_bonus
        JOIN public.audit_questions AS bonus_question
          ON bonus_question.id = answered_bonus.question_id
        WHERE answered_bonus.audit_id = p_audit_id
          AND bonus_question.scoring_model_version = 'pret_ce_v1'
          AND bonus_question.scoring_group = 'bonus'::public.question_scoring_group
          AND answered_bonus.score IS NOT NULL
      )
    INTO v_bonus_score, v_bonus_answered
    FROM public.audit_questions AS q
    JOIN public.checklist_sections AS s ON s.id = q.section_id
    LEFT JOIN public.audit_answers AS a
      ON a.audit_id = p_audit_id
     AND a.question_id = q.id
     AND a.is_na = false
     AND a.score IS NOT NULL
    WHERE q.scoring_model_version = 'pret_ce_v1'
      AND s.scoring_model_version = 'pret_ce_v1'
      AND q.is_active = true
      AND s.is_active = true
      AND q.scoring_group = 'bonus'::public.question_scoring_group;

    v_percentage := round((v_total_score / v_max_score) * 100, 2);

    v_score_band :=
      CASE
        WHEN v_percentage >= 95 THEN 'excellent'::public.score_band
        WHEN v_percentage >= 85 THEN 'good'::public.score_band
        WHEN v_percentage >= 70 THEN 'needs_focus'::public.score_band
        ELSE 'critical'::public.score_band
      END;

    v_section_scores := jsonb_build_object(
      'scoring_model_version', 'pret_ce_v1',
      'core', jsonb_build_object(
        'total_score', v_total_score,
        'max_score', v_max_score,
        'percentage', v_percentage
      ),
      'bonus', jsonb_build_object(
        'total_score', v_bonus_score,
        'max_score', v_bonus_max_score,
        'answered', v_bonus_answered
      ),
      'display', jsonb_build_object(
        'primary', concat(v_total_score::text, '/', v_max_score::text),
        'bonus', concat(v_bonus_score::text, '/', v_bonus_max_score::text, ' bonus'),
        'combined', concat(v_total_score::text, '/', v_max_score::text, ' + ', v_bonus_score::text, '/', v_bonus_max_score::text, ' bonus')
      ),
      'sections', jsonb_build_array(
        jsonb_build_object(
          'section_key', 'pret-ce-v1-core-score',
          'section_title', 'Core Score',
          'scoring_group', 'core',
          'total_score', v_total_score,
          'max_score', v_max_score,
          'percentage', v_percentage
        ),
        jsonb_build_object(
          'section_key', 'pret-ce-v1-outstanding-card',
          'section_title', 'Outstanding Card',
          'scoring_group', 'bonus',
          'total_score', v_bonus_score,
          'max_score', v_bonus_max_score,
          'percentage',
            CASE
              WHEN v_bonus_max_score > 0 THEN round((v_bonus_score / v_bonus_max_score) * 100, 2)
              ELSE NULL
            END
        )
      )
    );
  ELSE
    -- Legacy branch: existing test audits may reference questions that this
    -- migration has now hidden from the app UI. Use scoring_model_version
    -- rather than is_active to preserve completion behavior as much as possible.
    SELECT count(*)::integer
    INTO v_missing_required_count
    FROM public.audit_questions AS q
    JOIN public.checklist_sections AS s ON s.id = q.section_id
    LEFT JOIN public.audit_answers AS a
      ON a.audit_id = p_audit_id
     AND a.question_id = q.id
    WHERE q.scoring_model_version = 'legacy_62_v1'
      AND s.scoring_model_version = 'legacy_62_v1'
      AND q.is_required = true
      AND (
        a.id IS NULL
        OR (a.is_na = false AND a.score IS NULL)
      );

    IF v_missing_required_count > 0 THEN
      RAISE EXCEPTION 'Required questions missing answers';
    END IF;

    SELECT count(*)::integer
    INTO v_invalid_answer_count
    FROM public.audit_answers AS a
    JOIN public.audit_questions AS q ON q.id = a.question_id
    JOIN public.checklist_sections AS s ON s.id = q.section_id
    WHERE a.audit_id = p_audit_id
      AND q.scoring_model_version = 'legacy_62_v1'
      AND s.scoring_model_version = 'legacy_62_v1'
      AND (
        (a.is_na = true AND a.score IS NOT NULL)
        OR (q.is_required = true AND a.is_na = false AND a.score IS NULL)
        OR (a.score IS NOT NULL AND (a.score < 0 OR a.score > q.max_score))
      );

    IF v_invalid_answer_count > 0 THEN
      RAISE EXCEPTION 'Invalid answer score';
    END IF;

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
    WHERE q.scoring_model_version = 'legacy_62_v1'
      AND s.scoring_model_version = 'legacy_62_v1';

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
      WHERE s.scoring_model_version = 'legacy_62_v1'
        AND q.scoring_model_version = 'legacy_62_v1'
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
  END IF;

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
