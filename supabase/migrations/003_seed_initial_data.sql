-- =============================================================================
-- Store Audit Trainer - Initial Seed Data
-- V1 starter area, store, checklist sections, and audit questions
-- =============================================================================
-- Scope:
--   - Seeds one starter area: Dublin.
--   - Seeds one starter store: Dublin Airport, code 5292.
--   - Seeds the approved checklist sections and audit questions.
--
-- Deliberately not included:
--   - No users or profiles. Admin user/profile is created manually later.
--   - No audits, answers, photos, reports, action plans, or action items.
--   - No RLS, storage, or policy changes.
--
-- Bootstrap seed policy:
--   This migration provides initial bootstrap data only. It must not overwrite
--   future admin-managed area, store, checklist section, or question changes.
--   Future checklist changes should be added through a new migration or
--   through the admin UI, not by re-running or editing this seed.
--
-- Idempotency:
--   - areas uses ON CONFLICT (name) DO NOTHING.
--   - stores uses ON CONFLICT (code) DO NOTHING.
--   - checklist_sections uses ON CONFLICT (slug) DO NOTHING.
--   - audit_questions uses ON CONFLICT (question_key) DO NOTHING.
-- =============================================================================

-- ---------------------------------------------------------------------------
-- 1. Starter area and store
-- ---------------------------------------------------------------------------

WITH inserted_area AS (
  INSERT INTO public.areas (name)
  VALUES ('Dublin')
  ON CONFLICT (name) DO NOTHING
  RETURNING id
),
dublin_area AS (
  SELECT id FROM inserted_area
  UNION ALL
  SELECT id FROM public.areas WHERE name = 'Dublin'
  LIMIT 1
)
INSERT INTO public.stores (name, code, area_id, is_active)
SELECT
  'Dublin Airport',
  '5292',
  dublin_area.id,
  true
FROM dublin_area
ON CONFLICT (code) DO NOTHING;


-- ---------------------------------------------------------------------------
-- 2. Checklist sections
-- ---------------------------------------------------------------------------

WITH section_seed (slug, title, description, order_index) AS (
  VALUES
    ('store-standards', 'Store Standards / Visual & Merchandising', 'Evaluate visual presentation, merchandising standards, product displays and customer-facing presentation.', 1),
    ('availability-selection', 'Availability / Selection', 'Evaluate whether core products are available, well stocked and actively maintained.', 2),
    ('speed', 'Speed', 'Evaluate customer flow, queue time, drink preparation time and operational bottlenecks.', 3),
    ('service-customer-interaction', 'Service & Customer Interaction', 'Evaluate customer greeting, friendliness, engagement and service behaviours.', 4),
    ('scenario-question', 'Scenario Question', 'Evaluate team knowledge, clarity, friendliness and natural customer engagement in a scenario interaction.', 5),
    ('product-quality', 'Product Quality', 'Evaluate food and drink quality, presentation, temperature and expected product standards.', 6),
    ('cleanliness-facilities', 'Cleanliness & Facilities', 'Evaluate cleanliness and condition of customer-facing areas and facilities.', 7),
    ('outstanding-service', 'Outstanding Service', 'Identify exceptional service moments and above-and-beyond customer care.', 8),
    ('menu-product-feedback', 'Menu / Product Feedback', 'Capture feedback about a specific food or drink item.', 9),
    ('information-only', 'Information Only', 'Record useful operational observations that may not affect the final score but should appear in the report.', 10)
)
INSERT INTO public.checklist_sections (
  slug,
  title,
  description,
  order_index,
  is_active
)
SELECT
  slug,
  title,
  description,
  order_index,
  true
FROM section_seed
ON CONFLICT (slug) DO NOTHING;


-- ---------------------------------------------------------------------------
-- 3. Audit questions
-- ---------------------------------------------------------------------------
-- Notes:
--   - max_score is 5 for all seeded rows because audit_questions.max_score
--     must be positive.
--   - Service & Customer Interaction and Scenario Question are marked critical
--     per the schema plan.
--   - Information-only rows are non-required so they can be skipped or marked
--     N/A without blocking completion.
--   - Some seeded rows are information-only or product-feedback fields. They
--     are seeded with positive max_score only because the schema requires
--     max_score > 0. They are non-required and must be excluded from scoring by
--     app/server scoring logic unless explicitly intended. Do not change schema
--     for this seed task.

WITH question_seed (
  section_slug,
  question_key,
  question_text,
  question_description,
  max_score,
  is_required,
  is_critical,
  order_index
) AS (
  VALUES
    -- Store Standards / Visual & Merchandising
    ('store-standards', 'store-standards-q01', 'Was the shop entrance clean, tidy and well presented?', NULL, 5, true, false, 1),
    ('store-standards', 'store-standards-q02', 'Were the main fridge displays neat, full and front-facing?', NULL, 5, true, false, 2),
    ('store-standards', 'store-standards-q03', 'Were hot food displays well presented and clearly labelled?', NULL, 5, true, false, 3),
    ('store-standards', 'store-standards-q04', 'Were snacks and bakery displays tidy and well stocked?', NULL, 5, true, false, 4),
    ('store-standards', 'store-standards-q05', 'Were all labels and price tickets visible and correctly positioned?', NULL, 5, true, false, 5),
    ('store-standards', 'store-standards-q06', 'Were products aligned and easy for customers to shop?', NULL, 5, true, false, 6),

    -- Availability / Selection
    ('availability-selection', 'availability-selection-q01', 'Did every cold food price ticket have at least one product available?', NULL, 5, true, false, 1),
    ('availability-selection', 'availability-selection-q02', 'Did every hot food price ticket have at least one product available?', NULL, 5, true, false, 2),
    ('availability-selection', 'availability-selection-q03', 'Were snacks and bottled drinks available?', NULL, 5, true, false, 3),
    ('availability-selection', 'availability-selection-q04', 'Was the bakery selection appropriate for the time of day?', NULL, 5, true, false, 4),
    ('availability-selection', 'availability-selection-q05', 'Were missing or low products communicated to the MOD?', NULL, 5, true, false, 5),
    ('availability-selection', 'availability-selection-q06', 'Was the team actively maintaining availability?', NULL, 5, true, false, 6),

    -- Speed
    ('speed', 'speed-q01', 'Was the queue time within the 60-second target?', NULL, 5, true, false, 1),
    ('speed', 'speed-q02', 'Was the barista-prepared drink time within the 60-second target?', NULL, 5, true, false, 2),
    ('speed', 'speed-q03', 'Were customers being prioritised?', NULL, 5, true, false, 3),
    ('speed', 'speed-q04', 'Was the till area operating efficiently?', NULL, 5, true, false, 4),
    ('speed', 'speed-q05', 'Was the barista area operating efficiently?', NULL, 5, true, false, 5),
    ('speed', 'speed-q06', 'Were there visible bottlenecks affecting the customer experience?', NULL, 5, true, false, 6),

    -- Service & Customer Interaction
    ('service-customer-interaction', 'service-customer-interaction-q01', 'Did the team member greet the customer?', NULL, 5, true, true, 1),
    ('service-customer-interaction', 'service-customer-interaction-q02', 'Did the team member smile?', NULL, 5, true, true, 2),
    ('service-customer-interaction', 'service-customer-interaction-q03', 'Did the team member make eye contact?', NULL, 5, true, true, 3),
    ('service-customer-interaction', 'service-customer-interaction-q04', 'Was the tone of voice friendly and natural?', NULL, 5, true, true, 4),
    ('service-customer-interaction', 'service-customer-interaction-q05', 'Did the team member give a pleasant parting comment?', NULL, 5, true, true, 5),
    ('service-customer-interaction', 'service-customer-interaction-q06', 'Was the customer acknowledged when the drink was handed over?', NULL, 5, true, true, 6),
    ('service-customer-interaction', 'service-customer-interaction-q07', 'Did the team member offer to size up the drink where applicable?', NULL, 5, true, true, 7),
    ('service-customer-interaction', 'service-customer-interaction-q08', 'Did the team member ask eat in or takeaway where applicable?', NULL, 5, true, true, 8),
    ('service-customer-interaction', 'service-customer-interaction-q09', 'Did any team member deliver exceptional service?', NULL, 5, true, true, 9),

    -- Scenario Question
    ('scenario-question', 'scenario-question-q01', 'Was the team member knowledgeable?', 'Scenario options include opening hours, alternative milk, allergen question, toilet location, Wi-Fi availability and product recommendation.', 5, true, true, 1),
    ('scenario-question', 'scenario-question-q02', 'Was the answer clear and helpful?', NULL, 5, true, true, 2),
    ('scenario-question', 'scenario-question-q03', 'Was the team member friendly?', NULL, 5, true, true, 3),
    ('scenario-question', 'scenario-question-q04', 'Did the team member engage naturally with the customer?', NULL, 5, true, true, 4),
    ('scenario-question', 'scenario-question-q05', 'Did the answer improve the customer experience?', NULL, 5, true, true, 5),

    -- Product Quality
    ('product-quality', 'product-quality-q01', 'Was the food item presented correctly?', NULL, 5, true, false, 1),
    ('product-quality', 'product-quality-q02', 'Was the food item served at the correct temperature?', NULL, 5, true, false, 2),
    ('product-quality', 'product-quality-q03', 'Was the product easy to eat?', NULL, 5, true, false, 3),
    ('product-quality', 'product-quality-q04', 'Was the filling or ingredient distribution correct?', NULL, 5, true, false, 4),
    ('product-quality', 'product-quality-q05', 'Was the barista-prepared drink well presented?', NULL, 5, true, false, 5),
    ('product-quality', 'product-quality-q06', 'Was the barista-prepared drink of expected quality?', NULL, 5, true, false, 6),

    -- Cleanliness & Facilities
    ('cleanliness-facilities', 'cleanliness-facilities-q01', 'Were the floors clean and tidy?', NULL, 5, true, false, 1),
    ('cleanliness-facilities', 'cleanliness-facilities-q02', 'Were tables and seating areas clean?', NULL, 5, true, false, 2),
    ('cleanliness-facilities', 'cleanliness-facilities-q03', 'Was the bin station clean and tidy?', NULL, 5, true, false, 3),
    ('cleanliness-facilities', 'cleanliness-facilities-q04', 'Were cutlery, sugars and customer-use items well stocked?', NULL, 5, true, false, 4),
    ('cleanliness-facilities', 'cleanliness-facilities-q05', 'Was the till area clean?', NULL, 5, true, false, 5),
    ('cleanliness-facilities', 'cleanliness-facilities-q06', 'Was the drink handoff area clean?', NULL, 5, true, false, 6),
    ('cleanliness-facilities', 'cleanliness-facilities-q07', 'Was the overall shop environment well maintained?', NULL, 5, true, false, 7),

    -- Outstanding Service
    ('outstanding-service', 'outstanding-service-q01', 'Did any team member go above and beyond?', NULL, 5, false, false, 1),
    ('outstanding-service', 'outstanding-service-q02', 'Would this service be worth mentioning to others?', NULL, 5, false, false, 2),
    ('outstanding-service', 'outstanding-service-q03', 'Was there a specific moment of exceptional care?', NULL, 5, false, false, 3),

    -- Menu / Product Feedback
    ('menu-product-feedback', 'menu-product-feedback-q01', 'Product Name', NULL, 5, false, false, 1),
    ('menu-product-feedback', 'menu-product-feedback-q02', 'Taste Score', NULL, 5, true, false, 2),
    ('menu-product-feedback', 'menu-product-feedback-q03', 'Packaging & Presentation Score', NULL, 5, true, false, 3),
    ('menu-product-feedback', 'menu-product-feedback-q04', 'Value Score', NULL, 5, true, false, 4),
    ('menu-product-feedback', 'menu-product-feedback-q05', 'Product Comment', NULL, 5, false, false, 5),
    ('menu-product-feedback', 'menu-product-feedback-q06', 'Product Photo', NULL, 5, false, false, 6),

    -- Information Only
    ('information-only', 'information-only-q01', 'Was a manager visible on duty?', NULL, 5, false, false, 1),
    ('information-only', 'information-only-q02', 'Were opening hours displayed?', NULL, 5, false, false, 2),
    ('information-only', 'information-only-q03', 'Was the customer asked to size up?', NULL, 5, false, false, 3),
    ('information-only', 'information-only-q04', 'Was the customer asked eat in or takeaway?', NULL, 5, false, false, 4),
    ('information-only', 'information-only-q05', 'Was the customer charged correctly?', NULL, 5, false, false, 5),
    ('information-only', 'information-only-q06', 'Server name or description', NULL, 5, false, false, 6),
    ('information-only', 'information-only-q07', 'Scenario team member name or description', NULL, 5, false, false, 7),
    ('information-only', 'information-only-q08', 'Additional notes', NULL, 5, false, false, 8)
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
  order_index
)
SELECT
  sections.id,
  seed.question_key,
  seed.question_text,
  seed.question_description,
  seed.max_score,
  seed.is_required,
  seed.is_critical,
  true,
  seed.order_index
FROM question_seed AS seed
JOIN public.checklist_sections AS sections
  ON sections.slug = seed.section_slug
ON CONFLICT (question_key) DO NOTHING;
