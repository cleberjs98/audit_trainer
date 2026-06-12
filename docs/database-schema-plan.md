# Store Audit Trainer — Final Consolidated Database Schema Plan
**V1 · Phase 3.1 · Planning Only — No Code, No Migrations, No SQL**

---

## Section 1 — Final Verdict

This document is the **single, authoritative V1 database schema** for Store Audit Trainer. It supersedes all previous drafts, all content in `engineering.md` section 7, and all "option A / option B" phrasing in earlier iterations of `database-schema-plan.md`. Every contradiction has been resolved. Every decision is stated once. This plan is ready for direct migration authoring.

**Key decisions embodied in this plan:**

| # | Decision |
|---|---|
| 1 | `action_plans.status` uses the `action_plan_status` enum (`open`, `in_progress`, `completed`). Never `text`. |
| 2 | `checklist_sections` includes `slug` and `updated_at`. Admin may UPDATE section titles and descriptions. Not insert-only. |
| 3 | `profiles` CHECK enforces role/store/area consistency strictly. No auth trigger in V1. Admin creates all users manually via Supabase Dashboard. |
| 4 | RLS is explicitly defined for all 11 tables, for all 4 roles, for all 4 operations. |
| 5 | Score CHECK constraints applied on `audit_answers` and `audits` exactly as specified. |
| 6 | `audit_photos.answer_id` is NOT NULL. All photos link to a specific answer. Sentinel answer for general photos. `storage_path` is UNIQUE. Composite FK enforced at DB level. |
| 7 | `action_priority` values: `low`, `medium`, `high`. No `critical`. Matches `ActionPlanPriority` in `types/report.ts`. |
| 8 | `raw_ai_response` is NOT in V1. The `ai_reports` table does not include this column. |
| 9 | All 4 helper functions are SECURITY DEFINER, STABLE, SET search_path = public, pg_temp. |
| 10 | Completed-audit locking via BEFORE UPDATE trigger. Non-admin locked via RLS. `action_plan_items` narrow UPDATE enforced at API layer only. |

---

## Section 2 — Final Enums

9 enums. No others.

| Enum name | Values | Used by |
|---|---|---|
| `user_role` | `admin`, `area_manager`, `store_manager`, `leader` | `profiles.role` |
| `audit_status` | `draft`, `in_progress`, `completed`, `archived` | `audits.status` |
| `shift_type` | `morning`, `afternoon`, `evening` | `audits.shift_type` |
| `traffic_level` | `low`, `medium`, `high` | `audits.traffic_level` |
| `visit_type` | `training_audit`, `follow_up_audit`, `mystery_shop_simulation` | `audits.visit_type` |
| `score_band` | `excellent`, `good`, `needs_focus`, `critical` | `audits.score_band` |
| `action_priority` | `low`, `medium`, `high` | `action_plan_items.priority` |
| `action_item_status` | `open`, `in_progress`, `completed` | `action_plan_items.status` |
| `action_plan_status` | `open`, `in_progress`, `completed` | `action_plans.status` |

Notes:
- `engineering.md` listed `critical` as an `action_priority` value. Decision 7 removes it permanently. `types/report.ts` `ActionPlanPriority` does not include `critical` and is authoritative.
- `action_plan_status` is a **new enum** not present in prior documents. It is required by Decision 1 to replace the plain `text` column.
- `score_band` value `critical` refers to a score rating band, not an action priority. These are separate enums and must not be confused.

---

## Section 3 — Final Tables and Columns

### `areas`

| Column | Type | Nullable | Default | Notes |
|---|---|---|---|---|
| `id` | `uuid` | NOT NULL | `gen_random_uuid()` | PK |
| `name` | `text` | NOT NULL | — | |
| `created_at` | `timestamptz` | NOT NULL | `now()` | |
| `updated_at` | `timestamptz` | NOT NULL | `now()` | Managed by `handle_updated_at()` trigger |

---

### `stores`

| Column | Type | Nullable | Default | Notes |
|---|---|---|---|---|
| `id` | `uuid` | NOT NULL | `gen_random_uuid()` | PK |
| `name` | `text` | NOT NULL | — | |
| `code` | `text` | NOT NULL | — | UNIQUE; used as natural key in seed |
| `area_id` | `uuid` | NOT NULL | — | FK → `areas.id` RESTRICT |
| `is_active` | `boolean` | NOT NULL | `true` | |
| `created_at` | `timestamptz` | NOT NULL | `now()` | |
| `updated_at` | `timestamptz` | NOT NULL | `now()` | Managed by `handle_updated_at()` trigger |

---

### `profiles`

| Column | Type | Nullable | Default | Notes |
|---|---|---|---|---|
| `id` | `uuid` | NOT NULL | — | PK; mirrors `auth.users.id`. **NOT generated.** |
| `full_name` | `text` | NOT NULL | — | |
| `email` | `text` | NOT NULL | — | Denormalized from `auth.users`; kept in sync manually |
| `role` | `user_role` | NOT NULL | — | Enum |
| `store_id` | `uuid` | NULL | `NULL` | FK → `stores.id` SET NULL |
| `area_id` | `uuid` | NULL | `NULL` | FK → `areas.id` SET NULL |
| `created_at` | `timestamptz` | NOT NULL | `now()` | |
| `updated_at` | `timestamptz` | NOT NULL | `now()` | Managed by `handle_updated_at()` trigger |

**CHECK constraint** (Decision 3 — exact expression):

```
CHECK (
  (role = 'admin'         AND store_id IS NULL    AND area_id IS NULL    ) OR
  (role = 'area_manager'  AND area_id IS NOT NULL AND store_id IS NULL   ) OR
  (role = 'store_manager' AND store_id IS NOT NULL                       ) OR
  (role = 'leader'        AND store_id IS NOT NULL                       )
)
```

**Auth trigger decision (Decision 3 — final):** There is NO `AFTER INSERT ON auth.users` trigger for profile creation in V1. Because `store_manager` and `leader` require `store_id IS NOT NULL`, the CHECK constraint would reject any auto-inserted profile row that lacks a store. Therefore, **all user profiles are created manually by the Admin via the Supabase Dashboard**. The Admin assigns the correct role, store, and area at creation time. Auto-trigger creation is deferred to Phase 4 (admin user management UI). This is a deliberate V1 constraint, not an oversight.

---

### `checklist_sections`

(Decision 2 — adds `slug` and `updated_at`; not insert-only; admin may UPDATE.)

| Column | Type | Nullable | Default | Notes |
|---|---|---|---|---|
| `id` | `uuid` | NOT NULL | `gen_random_uuid()` | PK |
| `slug` | `text` | NOT NULL | — | UNIQUE; stable key used for idempotent seed (e.g., `store-standards`, `speed`) |
| `title` | `text` | NOT NULL | — | English |
| `description` | `text` | NULL | `NULL` | |
| `order_index` | `integer` | NOT NULL | `0` | |
| `is_active` | `boolean` | NOT NULL | `true` | |
| `created_at` | `timestamptz` | NOT NULL | `now()` | |
| `updated_at` | `timestamptz` | NOT NULL | `now()` | Admin may update titles; managed by `handle_updated_at()` trigger |

---

### `audit_questions`

| Column | Type | Nullable | Default | Notes |
|---|---|---|---|---|
| `id` | `uuid` | NOT NULL | `gen_random_uuid()` | PK |
| `section_id` | `uuid` | NOT NULL | — | FK → `checklist_sections.id` RESTRICT |
| `question_text` | `text` | NOT NULL | — | English |
| `question_description` | `text` | NULL | `NULL` | Optional sub-text |
| `max_score` | `numeric` | NOT NULL | `5` | |
| `is_required` | `boolean` | NOT NULL | `true` | |
| `is_critical` | `boolean` | NOT NULL | `false` | If true and unanswered, blocks audit completion |
| `is_active` | `boolean` | NOT NULL | `true` | |
| `order_index` | `integer` | NOT NULL | `0` | |
| `created_at` | `timestamptz` | NOT NULL | `now()` | |
| `updated_at` | `timestamptz` | NOT NULL | `now()` | Managed by `handle_updated_at()` trigger |

---

### `audits`

| Column | Type | Nullable | Default | Notes |
|---|---|---|---|---|
| `id` | `uuid` | NOT NULL | `gen_random_uuid()` | PK |
| `store_id` | `uuid` | NOT NULL | — | FK → `stores.id` RESTRICT |
| `audited_by` | `uuid` | NOT NULL | — | FK → `profiles.id` RESTRICT |
| `status` | `audit_status` | NOT NULL | `'draft'` | Enum |
| `is_locked` | `boolean` | NOT NULL | `false` | Set `true` automatically by trigger on `→ completed` transition |
| `visit_date` | `date` | NOT NULL | — | |
| `visit_time` | `time` | NOT NULL | — | |
| `mod` | `text` | NULL | `NULL` | Manager on Duty name |
| `shift_type` | `shift_type` | NOT NULL | — | Enum |
| `traffic_level` | `traffic_level` | NOT NULL | — | Enum |
| `visit_type` | `visit_type` | NOT NULL | — | Enum |
| `initial_notes` | `text` | NULL | `NULL` | |
| `total_score` | `numeric` | NOT NULL | `0` | Computed at completion |
| `max_score` | `numeric` | NOT NULL | `0` | Meaningful after completion; `0` before |
| `percentage` | `numeric` | NOT NULL | `0` | |
| `score_band` | `score_band` | NULL | `NULL` | Populated at completion |
| `section_scores` | `jsonb` | NULL | `NULL` | Per-section score snapshot |
| `created_at` | `timestamptz` | NOT NULL | `now()` | |
| `updated_at` | `timestamptz` | NOT NULL | `now()` | Managed by `handle_updated_at()` trigger |
| `completed_at` | `timestamptz` | NULL | `NULL` | Set when status → `completed` |

---

### `audit_answers`

(Decision 5 — CHECK constraints. Decision 6 — UNIQUE(audit_id, id) required for composite FK from `audit_photos`.)

| Column | Type | Nullable | Default | Notes |
|---|---|---|---|---|
| `id` | `uuid` | NOT NULL | `gen_random_uuid()` | PK |
| `audit_id` | `uuid` | NOT NULL | — | FK → `audits.id` CASCADE |
| `question_id` | `uuid` | NOT NULL | — | FK → `audit_questions.id` RESTRICT |
| `question_text_snapshot` | `text` | NOT NULL | — | Immutable copy of question text at audit time |
| `section_title_snapshot` | `text` | NOT NULL | — | Immutable copy of section title at audit time |
| `score` | `numeric` | NULL | `NULL` | NULL = not yet answered |
| `max_score` | `numeric` | NOT NULL | `5` | Snapshot of `audit_questions.max_score` at audit time |
| `is_na` | `boolean` | NOT NULL | `false` | If true, excluded from scoring |
| `comment` | `text` | NULL | `NULL` | |
| `is_critical_flag` | `boolean` | NOT NULL | `false` | Auditor-flagged critical issue |
| `created_at` | `timestamptz` | NOT NULL | `now()` | |
| `updated_at` | `timestamptz` | NOT NULL | `now()` | Managed by `handle_updated_at()` trigger |

**CHECK constraints (Decision 5):**
- `CHECK (score IS NULL OR (score >= 0 AND score <= max_score))`
- `CHECK (max_score > 0)`

**UNIQUE constraints:**
- `UNIQUE (audit_id, question_id)` — one answer per question per audit
- `UNIQUE (audit_id, id)` — required to support composite FK from `audit_photos`

---

### `audit_photos`

(Decision 6 — `answer_id NOT NULL`; sentinel answer for general photos; `storage_path UNIQUE`; composite FK.)

| Column | Type | Nullable | Default | Notes |
|---|---|---|---|---|
| `id` | `uuid` | NOT NULL | `gen_random_uuid()` | PK |
| `audit_id` | `uuid` | NOT NULL | — | Part of composite FK |
| `answer_id` | `uuid` | NOT NULL | — | Every photo must link to a specific answer. General overview photos use a "General Observations" sentinel answer auto-created per audit. |
| `storage_path` | `text` | NOT NULL | — | Path in `audit-photos` bucket only — **never a public URL**. UNIQUE. |
| `caption` | `text` | NULL | `NULL` | |
| `uploaded_by` | `uuid` | NOT NULL | — | FK → `profiles.id` RESTRICT |
| `created_at` | `timestamptz` | NOT NULL | `now()` | Insert-only. No `updated_at`. |

**Composite FK (Decision 6):**
`FOREIGN KEY (audit_id, answer_id) REFERENCES audit_answers(audit_id, id)` — enforces that `answer_id` belongs to the same audit as `audit_id` at the database level. Requires `UNIQUE(audit_id, id)` on `audit_answers` (see above).

---

### `ai_reports`

(Decision 8 — no `raw_ai_response` in V1.)

| Column | Type | Nullable | Default | Notes |
|---|---|---|---|---|
| `id` | `uuid` | NOT NULL | `gen_random_uuid()` | PK |
| `audit_id` | `uuid` | NOT NULL | — | FK → `audits.id` CASCADE. UNIQUE (one report per audit). |
| `executive_summary` | `text` | NULL | `NULL` | |
| `what_went_well` | `text[]` | NULL | `NULL` | Array of bullet strings |
| `what_needs_improvement` | `text[]` | NULL | `NULL` | Array of bullet strings |
| `priority_focus` | `text` | NULL | `NULL` | |
| `coaching_notes` | `text` | NULL | `NULL` | |
| `team_message` | `text` | NULL | `NULL` | |
| `follow_up_recommendations` | `text[]` | NULL | `NULL` | Array of recommendation strings |
| `created_at` | `timestamptz` | NOT NULL | `now()` | |
| `updated_at` | `timestamptz` | NOT NULL | `now()` | Managed by `handle_updated_at()` trigger |

`raw_ai_response` is **not present in V1**. If future debugging requires it, it is added in a later migration with `ALTER TABLE`.

---

### `action_plans`

(Decision 1 — `status` uses `action_plan_status` enum.)

| Column | Type | Nullable | Default | Notes |
|---|---|---|---|---|
| `id` | `uuid` | NOT NULL | `gen_random_uuid()` | PK |
| `audit_id` | `uuid` | NOT NULL | — | FK → `audits.id` CASCADE. UNIQUE (one plan per audit). |
| `store_id` | `uuid` | NOT NULL | — | FK → `stores.id` RESTRICT. Denormalized for efficient RLS lookups. |
| `focus_area` | `text` | NULL | `NULL` | |
| `summary` | `text` | NULL | `NULL` | |
| `generated_by_ai` | `boolean` | NOT NULL | `true` | |
| `status` | `action_plan_status` | NOT NULL | `'open'` | Enum — never plain `text` |
| `created_at` | `timestamptz` | NOT NULL | `now()` | |
| `updated_at` | `timestamptz` | NOT NULL | `now()` | Managed by `handle_updated_at()` trigger |

---

### `action_plan_items`

(Decision 7 — `action_priority` has no `critical` value.)

| Column | Type | Nullable | Default | Notes |
|---|---|---|---|---|
| `id` | `uuid` | NOT NULL | `gen_random_uuid()` | PK |
| `action_plan_id` | `uuid` | NOT NULL | — | FK → `action_plans.id` CASCADE |
| `action_description` | `text` | NOT NULL | — | |
| `owner` | `text` | NULL | `NULL` | Free-text name of responsible person |
| `priority` | `action_priority` | NOT NULL | `'medium'` | Enum: `low`, `medium`, `high` only |
| `due_date` | `date` | NULL | `NULL` | PostgreSQL `date` type — not `text` |
| `success_measure` | `text` | NULL | `NULL` | |
| `status` | `action_item_status` | NOT NULL | `'open'` | Enum |
| `completed_at` | `timestamptz` | NULL | `NULL` | |
| `created_at` | `timestamptz` | NOT NULL | `now()` | |
| `updated_at` | `timestamptz` | NOT NULL | `now()` | Managed by `handle_updated_at()` trigger |

---

## Section 4 — Final Constraints

### CHECK Constraints

| Table | Expression |
|---|---|
| `profiles` | `(role = 'admin' AND store_id IS NULL AND area_id IS NULL) OR (role = 'area_manager' AND area_id IS NOT NULL AND store_id IS NULL) OR (role = 'store_manager' AND store_id IS NOT NULL) OR (role = 'leader' AND store_id IS NOT NULL)` |
| `audit_answers` | `score IS NULL OR (score >= 0 AND score <= max_score)` |
| `audit_answers` | `max_score > 0` |
| `audits` | `percentage >= 0 AND percentage <= 100` |
| `audits` | `total_score >= 0` |
| `audits` | `max_score >= 0` |

### UNIQUE Constraints

| Table | Columns | Notes |
|---|---|---|
| `stores` | `(code)` | Natural key for seed |
| `checklist_sections` | `(slug)` | Natural key for seed |
| `audit_answers` | `(audit_id, question_id)` | One answer per question per audit |
| `audit_answers` | `(audit_id, id)` | Required to back composite FK from `audit_photos` |
| `audit_photos` | `(storage_path)` | No duplicate paths in bucket |
| `ai_reports` | `(audit_id)` | One report per audit |
| `action_plans` | `(audit_id)` | One action plan per audit |

### Composite Foreign Keys

| Source | References | Purpose |
|---|---|---|
| `audit_photos(audit_id, answer_id)` | `audit_answers(audit_id, id)` | Enforces that `answer_id` belongs to the same audit — prevents cross-audit photo linking at DB level |

This composite FK is non-obvious. It requires that `UNIQUE(audit_id, id)` exists on `audit_answers` before it can be declared.

### All Foreign Keys

| Source column(s) | References | ON DELETE |
|---|---|---|
| `profiles.id` | `auth.users(id)` | CASCADE |
| `profiles.store_id` | `stores.id` | SET NULL |
| `profiles.area_id` | `areas.id` | SET NULL |
| `stores.area_id` | `areas.id` | RESTRICT |
| `audit_questions.section_id` | `checklist_sections.id` | RESTRICT |
| `audits.store_id` | `stores.id` | RESTRICT |
| `audits.audited_by` | `profiles.id` | RESTRICT |
| `audit_answers.audit_id` | `audits.id` | CASCADE |
| `audit_answers.question_id` | `audit_questions.id` | RESTRICT |
| `audit_photos.audit_id, audit_photos.answer_id` | `audit_answers(audit_id, id)` | CASCADE (composite) |
| `audit_photos.uploaded_by` | `profiles.id` | RESTRICT |
| `ai_reports.audit_id` | `audits.id` | CASCADE |
| `action_plans.audit_id` | `audits.id` | CASCADE |
| `action_plans.store_id` | `stores.id` | RESTRICT |
| `action_plan_items.action_plan_id` | `action_plans.id` | CASCADE |

RESTRICT on store/profile FKs prevents orphan data from accidental deletion. CASCADE on audit children cleanly removes all dependent rows when an audit is deleted.

---

## Section 5 — Final Indexes

| Table | Columns | Type | Purpose |
|---|---|---|---|
| `profiles` | `(role)` | B-tree | RLS helper function lookups |
| `profiles` | `(store_id)` | B-tree | Store member queries |
| `profiles` | `(area_id)` | B-tree | Area member queries |
| `stores` | `(code)` | UNIQUE B-tree | Uniqueness + seed idempotency |
| `stores` | `(area_id)` | B-tree | Filter by area; critical for area_manager RLS subqueries |
| `stores` | `(is_active)` | B-tree | Active store filter |
| `checklist_sections` | `(slug)` | UNIQUE B-tree | Seed idempotency; admin lookup |
| `audit_questions` | `(section_id)` | B-tree | Questions per section fetch |
| `audit_questions` | `(is_active)` | B-tree | Active question filter |
| `audits` | `(store_id)` | B-tree | Dashboard: audits per store |
| `audits` | `(audited_by)` | B-tree | Dashboard: own audits |
| `audits` | `(status)` | B-tree | Filter by status |
| `audits` | `(visit_date)` | B-tree | Sort/filter by date |
| `audits` | `(store_id, visit_date)` | Composite B-tree | Store history sorted by date |
| `audit_answers` | `(audit_id)` | B-tree | Most frequent join; answered questions per audit |
| `audit_answers` | `(audit_id, question_id)` | UNIQUE B-tree | One answer per question enforcement + lookup |
| `audit_answers` | `(audit_id, id)` | UNIQUE B-tree | Backs composite FK from `audit_photos` |
| `audit_photos` | `(audit_id)` | B-tree | Photos per audit |
| `audit_photos` | `(answer_id)` | B-tree | Photos per answer |
| `audit_photos` | `(storage_path)` | UNIQUE B-tree | Uniqueness enforcement |
| `ai_reports` | `(audit_id)` | UNIQUE B-tree | One report per audit enforcement + lookup |
| `action_plans` | `(audit_id)` | UNIQUE B-tree | One plan per audit enforcement + lookup |
| `action_plans` | `(store_id)` | B-tree | Store manager: own store's plans |
| `action_plan_items` | `(action_plan_id)` | B-tree | Items per plan |
| `action_plan_items` | `(status)` | B-tree | Filter open/in-progress items |

---

## Section 6 — Final Helper Functions Strategy

All four functions share these properties (Decision 9):
- `SECURITY DEFINER` — runs as the function owner (superuser), not the calling user
- `STABLE` — result is constant within a single SQL statement; PostgreSQL can cache it
- `SET search_path = public, pg_temp` — prevents search_path injection attacks
- Query uses `public.profiles` with fully-qualified schema reference
- WHERE clause is always `WHERE id = auth.uid()` — current user only; never another user's row
- SECURITY DEFINER bypasses the calling user's RLS on `profiles` — this is intentional and safe

**Recursion explanation (applies to all four functions):**
`profiles` has RLS enabled. An RLS policy on `profiles` calls `get_my_role()`. `get_my_role()` queries `profiles`. Without SECURITY DEFINER, this query is subject to the calling user's RLS, which calls `get_my_role()` again — infinite recursion. With SECURITY DEFINER, the function runs as its owner (who bypasses RLS), queries the row directly, returns the value. Safe because the function unconditionally restricts to `WHERE id = auth.uid()` — it can never return another user's data.

---

### `get_my_role()`

```
FUNCTION public.get_my_role()
  RETURNS user_role
  LANGUAGE sql
  SECURITY DEFINER
  STABLE
  SET search_path = public, pg_temp
BODY: SELECT role FROM public.profiles WHERE id = auth.uid()
```

Used by: RLS policies on `audits`, `audit_answers`, `audit_photos`, `checklist_sections`, `audit_questions`, `ai_reports`, `action_plans`, `action_plan_items`

---

### `get_my_store_id()`

```
FUNCTION public.get_my_store_id()
  RETURNS uuid
  LANGUAGE sql
  SECURITY DEFINER
  STABLE
  SET search_path = public, pg_temp
BODY: SELECT store_id FROM public.profiles WHERE id = auth.uid()
```

Used by: RLS policies on `stores`, `audits`, `audit_answers`, `audit_photos`, `action_plans`, `action_plan_items`

---

### `get_my_area_id()`

```
FUNCTION public.get_my_area_id()
  RETURNS uuid
  LANGUAGE sql
  SECURITY DEFINER
  STABLE
  SET search_path = public, pg_temp
BODY: SELECT area_id FROM public.profiles WHERE id = auth.uid()
```

Used by: RLS policies on `areas`, `stores`, `profiles`, `audits`, `audit_answers`, `audit_photos`, `ai_reports`, `action_plans`

---

### `is_admin()`

```
FUNCTION public.is_admin()
  RETURNS boolean
  LANGUAGE sql
  SECURITY DEFINER
  STABLE
  SET search_path = public, pg_temp
BODY: SELECT EXISTS (
        SELECT 1 FROM public.profiles
        WHERE id = auth.uid() AND role = 'admin'
      )
```

Used by: all RLS policies as the "admin bypass" condition in `USING` expressions

---

## Section 7 — Final RLS Strategy for All 11 Tables

**General conventions used throughout:**
- RLS is enabled on all 11 tables. No exceptions.
- `service_role` bypasses RLS entirely (Supabase default). Used for `ai_reports` INSERT/UPDATE and `action_plans`/`action_plan_items` INSERT from the AI backend route.
- All non-admin policies call the helper functions defined in Section 6.
- "Own store" = `store_id = get_my_store_id()`
- "Area stores" = `store_id IN (SELECT id FROM public.stores WHERE area_id = get_my_area_id())`
- Lock check = `(SELECT is_locked FROM public.audits WHERE id = <child>.audit_id) = false`

---

### `areas`

| Operation | admin | area_manager | store_manager | leader |
|---|---|---|---|---|
| SELECT | All rows | Own area only: `id = get_my_area_id()` | Own store's area: `id = (SELECT area_id FROM stores WHERE id = get_my_store_id())` | Same as store_manager |
| INSERT | Yes | No | No | No |
| UPDATE | Yes | No | No | No |
| DELETE | Yes | No | No | No |

---

### `stores`

| Operation | admin | area_manager | store_manager | leader |
|---|---|---|---|---|
| SELECT | All rows | `area_id = get_my_area_id()` | `id = get_my_store_id()` | `id = get_my_store_id()` |
| INSERT | Yes | No | No | No |
| UPDATE | Yes | No | No | No |
| DELETE | Yes | No | No | No |

---

### `profiles`

| Operation | admin | area_manager | store_manager | leader |
|---|---|---|---|---|
| SELECT | All rows | Own row + rows where `store_id IN (area stores)` | Own row + rows where `store_id = get_my_store_id()` | Own row only: `id = auth.uid()` |
| INSERT | Yes (manual only in V1) | No | No | No |
| UPDATE | All rows | Own row only (limited columns — API-enforced) | Own row only (limited columns — API-enforced) | Own row only (limited columns — API-enforced) |
| DELETE | Yes | No | No | No |

---

### `checklist_sections`

| Operation | admin | area_manager | store_manager | leader |
|---|---|---|---|---|
| SELECT | All rows | All active rows | All active rows | All active rows |
| INSERT | Yes | No | No | No |
| UPDATE | Yes | No | No | No |
| DELETE | Yes | No | No | No |

Admin can UPDATE section titles and descriptions (Decision 2). Not insert-only.

---

### `audit_questions`

| Operation | admin | area_manager | store_manager | leader |
|---|---|---|---|---|
| SELECT | All rows | All active rows | All active rows | All active rows |
| INSERT | Yes | No | No | No |
| UPDATE | Yes | No | No | No |
| DELETE | Yes | No | No | No |

---

### `audits`

| Operation | admin | area_manager | store_manager | leader |
|---|---|---|---|---|
| SELECT | All rows | `store_id IN (area stores)` | `store_id = get_my_store_id()` | `store_id = get_my_store_id()` |
| INSERT | Yes | No | `store_id = get_my_store_id()` | No |
| UPDATE | All rows | No | `store_id = get_my_store_id() AND is_locked = false` | No |
| DELETE | Yes | No | No | No |

Non-admin UPDATE requires `is_locked = false`. Once the trigger sets `is_locked = true`, non-admin cannot UPDATE the row at all — including attempting to reset `is_locked` to false.

---

### `audit_answers`

| Operation | admin | area_manager | store_manager | leader |
|---|---|---|---|---|
| SELECT | All rows | `audit_id IN (audits for area stores)` | `audit_id IN (audits for own store)` | `audit_id IN (audits for own store)` |
| INSERT | Yes | No | `audit.store_id = get_my_store_id() AND lock check = false` | No |
| UPDATE | All rows | No | `audit.store_id = get_my_store_id() AND lock check = false` | No |
| DELETE | Yes | No | No | No |

---

### `audit_photos`

| Operation | admin | area_manager | store_manager | leader |
|---|---|---|---|---|
| SELECT | All rows | `audit_id IN (audits for area stores)` | `audit_id IN (audits for own store)` | `audit_id IN (audits for own store)` |
| INSERT | Yes | No | `audit.store_id = get_my_store_id() AND lock check = false` | No |
| UPDATE | All rows | No | No (insert-only for non-admin) | No |
| DELETE | Yes | No | No | No |

---

### `ai_reports`

| Operation | admin | area_manager | store_manager | leader |
|---|---|---|---|---|
| SELECT | All rows | `audit_id IN (audits for area stores)` | `audit_id IN (audits for own store)` | `audit_id IN (audits for own store)` |
| INSERT | Yes (also service_role only in practice) | No | No | No |
| UPDATE | Yes (also service_role only in practice) | No | No | No |
| DELETE | Yes | No | No | No |

**Service role note:** INSERT and UPDATE for `ai_reports` happen only via the backend API route using `SUPABASE_SERVICE_ROLE_KEY`. The service role bypasses RLS. No client-side path to write AI reports exists. RLS admin policies exist as a safety net, not a primary enforcement path.

---

### `action_plans`

| Operation | admin | area_manager | store_manager | leader |
|---|---|---|---|---|
| SELECT | All rows | `store_id IN (area stores)` | `store_id = get_my_store_id()` | `store_id = get_my_store_id()` |
| INSERT | Yes (also service_role) | No | No | No |
| UPDATE | All rows | No | `store_id = get_my_store_id() AND audit lock check = false` | No |
| DELETE | Yes | No | No | No |

---

### `action_plan_items`

| Operation | admin | area_manager | store_manager | leader |
|---|---|---|---|---|
| SELECT | All rows | Via `action_plan_id → action_plans.store_id IN (area stores)` | Via `action_plan_id → action_plans.store_id = get_my_store_id()` | Same as store_manager |
| INSERT | Yes (also service_role) | No | No | No |
| UPDATE | All rows | No | Allowed by RLS (store chain check) — **column restriction to `status` + `completed_at` only is enforced at the API layer, not by RLS** | No |
| DELETE | Yes | No | No | No |

**Decision 10 — final explicit statement on `action_plan_items` UPDATE:** After an audit is locked, store_manager and admin may update `status` and `completed_at` on items (tracking completion of action items does not require reopening the audit). This narrow column restriction (`status` and `completed_at` only, not `action_description`, `priority`, etc.) **cannot be enforced by Supabase RLS** because Supabase does not support column-level UPDATE restrictions in RLS policies. This restriction is enforced exclusively at the API route level. The API route must validate that only `status` and `completed_at` are included in the update payload for locked-audit items.

---

## Section 8 — Final Storage Strategy

**Bucket:** `audit-photos`
**Access:** Private (no public access)

### Path Format

```
{audit_id}/{answer_id}/{unix_timestamp_ms}-{sanitized_filename}
```

Example:
```
8e8f4a2c-audit-uuid/9a9b3d1e-answer-uuid/1718000000000-fridge-display.jpg
```

The path embeds `audit_id` and `answer_id` as the first two segments. This enables server-side validation by path parsing alone, without a database lookup. The filename is sanitized (no spaces, no special characters, no path traversal).

### `storage.objects` Policies

| Operation | Who | Condition |
|---|---|---|
| SELECT (read) | admin | All objects |
| SELECT (read) | area_manager | Object path starts with an audit_id belonging to area stores |
| SELECT (read) | store_manager | Object path starts with an audit_id belonging to `get_my_store_id()` |
| SELECT (read) | leader | Same as store_manager |
| INSERT (upload) | store_manager | Object path starts with an audit_id belonging to own store AND audit is not locked |
| INSERT (upload) | admin | All |
| UPDATE | admin only | No client-side update of photos |
| DELETE | admin only | |

### Signed URL Approach

- Signed URLs are generated **server-side only**, via a Next.js API route using `SUPABASE_SERVICE_ROLE_KEY`.
- Never generated in browser code.
- TTL: 60 minutes per signed URL.
- The API route verifies that the requesting user has access to the audit before signing.

### Server-Side Validation Steps

Before accepting an upload or returning a signed URL, the API route must:
1. Authenticate the user via the Supabase server client (not anon client).
2. Verify that `audit_id` in the path belongs to a store accessible to the user's role.
3. Verify that the audit's `is_locked = false` for uploads.
4. Validate MIME type: only `image/jpeg`, `image/png`, `image/webp` accepted.
5. Validate file size: reject files exceeding the configured limit (e.g., 10 MB).
6. Sanitize the filename: strip all non-alphanumeric characters except hyphens and dots.
7. Insert the `audit_photos` row only after the Storage upload succeeds.

---

## Section 9 — Final Completed-Audit Lock Strategy

### Trigger

| Property | Value |
|---|---|
| Trigger name | `trg_lock_audit_on_complete` |
| Timing | `BEFORE UPDATE` on `audits` |
| Condition | `NEW.status = 'completed' AND OLD.status <> 'completed'` |
| Action | `SET NEW.is_locked = true` |
| Fires for | Every user including admin (the transition itself auto-locks) |

### Non-Admin Lock Enforcement

- `audits` UPDATE RLS for non-admin includes `is_locked = false` in the `USING` expression.
- Once `is_locked = true`, the RLS policy rejects any non-admin UPDATE on that row — including any attempt to flip `is_locked` back to false.
- This means a store_manager cannot unlock an audit. Only admin can.

### Admin Unlock

- Admin's UPDATE RLS on `audits` has no `is_locked` restriction.
- Admin can directly `UPDATE audits SET is_locked = false WHERE id = ?`.
- The `trg_lock_audit_on_complete` trigger fires only on the transition `status → 'completed'`. If admin subsequently updates `is_locked` without changing `status`, the trigger condition `NEW.status = 'completed' AND OLD.status <> 'completed'` is false (because OLD.status is already `'completed'`), so `is_locked` stays false after admin sets it. Admin unlock works correctly.

### Child Table Lock Enforcement Per Table

| Table | Enforcement mechanism |
|---|---|
| `audit_answers` | RLS INSERT and UPDATE policies include: `(SELECT is_locked FROM public.audits WHERE id = audit_answers.audit_id) = false` for non-admin |
| `audit_photos` | RLS INSERT policy includes the same lock check for non-admin |
| `ai_reports` | Written only via service role (bypasses RLS). Backend route does not write to locked audits by application logic. |
| `action_plans` | RLS UPDATE policy includes the lock check for store_manager |
| `action_plan_items` | RLS allows UPDATE by store_manager (to update status/completed_at after lock). Narrow column restriction is API-enforced only (see below). |

### `action_plan_items` Narrow UPDATE — Final Decision

After an audit is locked:
- Admin may update any column on `action_plan_items`.
- Store_manager and leader may update **only `status` and `completed_at`** to track action item completion progress.
- **This column-level restriction is not enforceable via Supabase RLS.** Supabase does not support column-level UPDATE restrictions in row-level policies.
- **Final decision: the restriction is enforced exclusively at the API route.** The API route for `PATCH /api/action-plan-items/:id` must whitelist only `status` and `completed_at` in the update payload for non-admin callers. Any other fields in the request body are silently stripped before the Supabase update call. This is documented here as a security-by-API-design requirement, not a database guarantee.

---

## Section 10 — Final Seed Strategy

### Tables to Seed

| Table | Natural key column | Seed content |
|---|---|---|
| `areas` | `name` | Development sample areas (e.g., "North Region", "South Region") |
| `stores` | `code` | Development sample stores per area |
| `checklist_sections` | `slug` | 10 sections from `engineering.md` section 10 (in English, in order) |
| `audit_questions` | `(section_id, order_index)` | ~53 questions distributed across 10 sections; `is_critical = true` for Service & Customer Interaction and Scenario Question sections |

The admin user profile is **not seeded via SQL**. See below.

### Idempotency

All seed rows use:
```
INSERT INTO ... (...) VALUES (...)
ON CONFLICT (<natural_key>) DO NOTHING;
```

For `checklist_sections`: conflict on `slug`. For `stores`: conflict on `code`. For `areas`: conflict on `name`. Running the seed file multiple times produces no duplicate rows and no errors.

### Auth User Creation — No Auto-Trigger in V1 (Decision 3)

There is no `AFTER INSERT ON auth.users` trigger in V1. **The admin user and all other users are created manually via the Supabase Dashboard.** After creating a user in Supabase Auth, the admin manually inserts a corresponding row into `public.profiles` with the correct `role`, `store_id`, and `area_id`. This is the only supported user creation path in V1. A UI-driven user management flow (with a trigger or Edge Function) is deferred to Phase 4.

### Seed Execution Order

```
1. areas                     (no dependencies)
2. stores                    (depends on: areas)
3. checklist_sections        (no dependencies)
4. audit_questions           (depends on: checklist_sections)
5. Admin profile             (manual: Supabase Dashboard → Auth → New User → insert profiles row)
```

---

## Section 11 — Remaining Risks

- **Sentinel answer creation:** The "General Observations" answer row (for photos not linked to a specific question) must be auto-created when a new audit is started. This requires either an `AFTER INSERT ON audits` trigger or application-level logic in the "Start Audit" API route. Not in the migration itself — must be planned in Phase 3.3 or 3.4.
- **Composite FK creation order:** `UNIQUE(audit_id, id)` on `audit_answers` must be created before the composite FK on `audit_photos` is declared. Migration authoring must respect this within the same file or across files.
- **Helper functions before RLS policies:** The four helper functions must be created before any RLS policy that calls them. Migration creation order must enforce this.
- **area_manager RLS subquery cost:** The `store_id IN (SELECT id FROM stores WHERE area_id = get_my_area_id())` subquery runs on every row evaluation. The `stores(area_id)` B-tree index is mandatory for acceptable performance.
- **`action_plan_items` narrow UPDATE is API-enforced only:** If an API route is miscoded, a store_manager could overwrite `action_description` or `priority` on a locked audit's items. This must be reviewed at every API route implementation.
- **`profiles.email` denormalization drift:** If a user changes their email in Supabase Auth, `profiles.email` becomes stale. No sync mechanism exists in V1. Acceptable for V1 but must be documented.
- **`checklist_sections` admin UPDATE:** `handle_updated_at()` trigger must be registered on `checklist_sections` (it was previously described as insert-only and might be omitted from the trigger list in early migration drafts).
- **`data/defaultChecklist.ts` is an empty array:** Must be populated with the 10 sections and ~53 questions before Phase 3.4 seed execution.

---

## Section 12 — Readiness Statement

**READY FOR CODEX RE-AUDIT.**

All 10 specific decisions from the consolidation instructions are resolved without contradiction or ambiguity. No old alternatives remain. No both-options phrasing exists. Every table has a defined column list, constraint set, and RLS strategy. The 9 enums are final. The composite FK is explicit. The auth trigger decision is stated clearly. The `action_plan_items` column restriction limitation is acknowledged and its enforcement path identified. This plan can be handed directly to a migration-authoring agent without further clarification.