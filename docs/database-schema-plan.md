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
| 3 | `profiles` CHECK enforces role/store/area consistency strictly. `profiles.store_id` and `profiles.area_id` use ON DELETE RESTRICT. No auth trigger in V1. Admin creates all users manually. |
| 4 | RLS is explicitly defined for all 11 tables, for all 4 roles, for all 4 operations. |
| 5 | Score and N/A constraints on `audit_answers`: `NOT is_na OR score IS NULL`; `score IS NULL OR (score >= 0 AND score <= max_score)`; `max_score > 0`. |
| 6 | `audit_photos.answer_id` is NOT NULL. `storage_path` is UNIQUE. Composite FK enforced at DB level. Photos are immutable — UPDATE denied for all roles including admin. |
| 7 | `action_priority` values: `low`, `medium`, `high`. No `critical`. Matches `ActionPlanPriority` in `types/report.ts`. |
| 8 | `raw_ai_response` is NOT in V1. |
| 9 | Helper functions are SECURITY DEFINER with fixed `search_path`. The function owner must be the `public.profiles` table owner or a role with the `BYPASSRLS` attribute. SECURITY DEFINER runs as the function owner — not automatically as superuser — and profiles RLS evaluates against the owner's role. A role with only SELECT on profiles is insufficient: profiles RLS would still fire, causing recursion or empty results. BYPASSRLS (or table ownership) is required so the helper bypasses profiles RLS entirely. |
| 10 | Completed-audit locking via BEFORE UPDATE trigger with explicit USING/WITH CHECK RLS semantics. |
| 11 | Leader is read-only on audits, answers, reports, action plans and action plan items. No UPDATE allowed for leader. |
| 12 | Non-admin direct UPDATE on `action_plan_items` and `action_plans` is denied in V1. Store manager progress tracking requires a future server-side RPC. |
| 13 | Storage access is server-side only in V1. No direct client reads or uploads. Signed URLs from DB-backed authorization only. |
| 14 | `audit_questions` includes `question_key text NOT NULL UNIQUE` for idempotent seed. `areas(name)` has UNIQUE constraint. |
| 15 | Migration must begin with `CREATE EXTENSION IF NOT EXISTS pgcrypto` before `gen_random_uuid()` usage. |
| 16 | Areas and stores are operational data, not fixed seed-only data. Seed creates only the Dublin starter area/store. Future stores are created through the app by admin or area_manager. Area creation remains admin-only in V1. |

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
| `name` | `text` | NOT NULL | — | UNIQUE; natural seed key |
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
| `store_id` | `uuid` | NULL | `NULL` | FK → `stores.id` RESTRICT (stores/areas cannot be deleted while assigned) |
| `area_id` | `uuid` | NULL | `NULL` | FK → `areas.id` RESTRICT (stores/areas cannot be deleted while assigned) |
| `created_at` | `timestamptz` | NOT NULL | `now()` | |
| `updated_at` | `timestamptz` | NOT NULL | `now()` | Managed by `handle_updated_at()` trigger |

**CHECK constraint** (Decision 3 — exact expression):

```sql
CHECK (
  (role = 'admin'         AND store_id IS NULL    AND area_id IS NULL   ) OR
  (role = 'area_manager'  AND area_id IS NOT NULL AND store_id IS NULL  ) OR
  (role = 'store_manager' AND store_id IS NOT NULL AND area_id IS NULL  ) OR
  (role = 'leader'        AND store_id IS NOT NULL AND area_id IS NULL  )
)
```

> Because `profiles.store_id` and `profiles.area_id` now use ON DELETE RESTRICT, a store or area cannot be deleted while any profile references it. This prevents the FK from being set to NULL and silently breaking the CHECK constraint.

**Auth trigger decision (Decision 3 — final):** There is NO `AFTER INSERT ON auth.users` trigger for profile creation in V1. Because `store_manager` and `leader` require `store_id IS NOT NULL`, the CHECK constraint would reject any auto-inserted profile row that lacks a store. Therefore, **all user profiles are created manually by the Admin via the Supabase Dashboard**. The Admin assigns the correct role, store, and area at creation time. Auto-trigger creation is deferred to Phase 4 (admin user management UI). This is a deliberate V1 constraint, not an oversight.

---

### `checklist_sections`

(Decision 2 — adds `slug` and `updated_at`; not insert-only; admin may UPDATE.)

| Column | Type | Nullable | Default | Notes |
|---|---|---|---|---|
| `id` | `uuid` | NOT NULL | `gen_random_uuid()` | PK |
| `slug` | `text` | NOT NULL | — | UNIQUE; stable key used for idempotent seed (e.g., `store-standards`, `speed-of-service`) |
| `title` | `text` | NOT NULL | — | English |
| `description` | `text` | NULL | `NULL` | |
| `order_index` | `integer` | NOT NULL | `0` | CHECK (order_index >= 0) |
| `is_active` | `boolean` | NOT NULL | `true` | |
| `created_at` | `timestamptz` | NOT NULL | `now()` | |
| `updated_at` | `timestamptz` | NOT NULL | `now()` | Admin may update titles; managed by `handle_updated_at()` trigger |

---

### `audit_questions`

| Column | Type | Nullable | Default | Notes |
|---|---|---|---|---|
| `id` | `uuid` | NOT NULL | `gen_random_uuid()` | PK |
| `question_key` | `text` | NOT NULL | — | UNIQUE; stable natural key for idempotent seed (e.g., `store-standards-q01`) |
| `section_id` | `uuid` | NOT NULL | — | FK → `checklist_sections.id` RESTRICT |
| `question_text` | `text` | NOT NULL | — | English |
| `question_description` | `text` | NULL | `NULL` | Optional sub-text |
| `max_score` | `numeric` | NOT NULL | `5` | CHECK (max_score > 0) |
| `is_required` | `boolean` | NOT NULL | `true` | |
| `is_critical` | `boolean` | NOT NULL | `false` | If true and unanswered, blocks audit completion |
| `is_active` | `boolean` | NOT NULL | `true` | |
| `order_index` | `integer` | NOT NULL | `0` | CHECK (order_index >= 0) |
| `created_at` | `timestamptz` | NOT NULL | `now()` | |
| `updated_at` | `timestamptz` | NOT NULL | `now()` | Managed by `handle_updated_at()` trigger |

UNIQUE constraint: `UNIQUE (section_id, order_index)` — stable ordering within section; used as secondary uniqueness anchor alongside `question_key`.

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
| `total_score` | `numeric` | NOT NULL | `0` | CHECK (total_score >= 0); computed at completion |
| `max_score` | `numeric` | NOT NULL | `0` | CHECK (max_score >= 0); must be > 0 for completed audits |
| `percentage` | `numeric` | NOT NULL | `0` | CHECK (percentage >= 0 AND percentage <= 100) |
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
| `is_critical_flag` | `boolean` | NOT NULL | `false` | User-flagged critical issue |
| `created_at` | `timestamptz` | NOT NULL | `now()` | |
| `updated_at` | `timestamptz` | NOT NULL | `now()` | Managed by `handle_updated_at()` trigger |

**CHECK constraints (N/A semantics and score bounds):**
- `CHECK (NOT is_na OR score IS NULL)` — if N/A is true, score must be NULL
- `CHECK (score IS NULL OR (score >= 0 AND score <= max_score))` — score must be within valid range when present
- `CHECK (max_score > 0)` — max score must always be positive

**Score/N/A semantics:**
- `score IS NULL AND is_na = false` → unanswered (incomplete)
- `score IS NULL AND is_na = true` → N/A, excluded from calculation
- `score IS NOT NULL AND is_na = false` → valid scored answer
- `score IS NOT NULL AND is_na = true` → forbidden by CHECK

Completion logic must require every `is_required = true AND is_na = false` answer to have a non-NULL score before the audit can transition to `completed`.

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
| `profiles` | `(role = 'admin' AND store_id IS NULL AND area_id IS NULL) OR (role = 'area_manager' AND area_id IS NOT NULL AND store_id IS NULL) OR (role = 'store_manager' AND store_id IS NOT NULL AND area_id IS NULL) OR (role = 'leader' AND store_id IS NOT NULL AND area_id IS NULL)` |
| `checklist_sections` | `order_index >= 0` |
| `audit_questions` | `max_score > 0` |
| `audit_questions` | `order_index >= 0` |
| `audit_answers` | `NOT is_na OR score IS NULL` |
| `audit_answers` | `score IS NULL OR (score >= 0 AND score <= max_score)` |
| `audit_answers` | `max_score > 0` |
| `audits` | `total_score >= 0` |
| `audits` | `max_score >= 0` |
| `audits` | `total_score <= max_score OR max_score = 0` |
| `audits` | `percentage >= 0 AND percentage <= 100` |
| `audits` | `(max_score = 0 AND percentage = 0) OR max_score > 0` |

### UNIQUE Constraints

| Table | Columns | Notes |
|---|---|---|
| `areas` | `(name)` | Natural seed key |
| `stores` | `(code)` | Natural seed key |
| `checklist_sections` | `(slug)` | Natural seed key |
| `audit_questions` | `(question_key)` | Primary idempotent seed key |
| `audit_questions` | `(section_id, order_index)` | Secondary; stable ordering |
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
| `profiles.store_id` | `stores.id` | RESTRICT (store cannot be deleted while assigned to any profile) |
| `profiles.area_id` | `areas.id` | RESTRICT (area cannot be deleted while assigned to any profile) |
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
| `areas` | `(name)` | UNIQUE B-tree | Natural seed key |
| `stores` | `(code)` | UNIQUE B-tree | Uniqueness + seed idempotency |
| `stores` | `(area_id)` | B-tree | Filter by area; critical for area_manager RLS subqueries |
| `stores` | `(is_active)` | B-tree | Active store filter |
| `checklist_sections` | `(slug)` | UNIQUE B-tree | Seed idempotency; admin lookup |
| `audit_questions` | `(question_key)` | UNIQUE B-tree | Primary idempotent seed lookup |
| `audit_questions` | `(section_id)` | B-tree | Questions per section fetch |
| `audit_questions` | `(section_id, order_index)` | UNIQUE B-tree | Stable ordering + secondary seed anchor |
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

All four functions share these properties (Decisions 9, 14):
- `SECURITY DEFINER` — runs as the **function owner** (the role that created the function), not the calling user, and **NOT automatically as PostgreSQL superuser**. The function owner must be the `public.profiles` **table owner** or a role with the **`BYPASSRLS` attribute**. A role that only has `SELECT` on `public.profiles` is insufficient: `profiles` RLS evaluates against the owner's role, which means the helper query on `profiles` would trigger RLS, which calls the helper again — infinite recursion — or the RLS policy blocks the read entirely and returns an empty result. Ownership of the `profiles` table or `BYPASSRLS` ensures the helper can read `profiles` without RLS firing on that internal query. This is required to avoid profiles RLS recursion or empty helper results.
- `SET search_path = public, pg_temp` — **required**; prevents search_path injection attacks where a malicious user creates objects in a schema that shadows `public`. Without this, the function's SQL could resolve to attacker-controlled objects.
- `STABLE` — result is constant within a single SQL statement; PostgreSQL can cache it
- Query uses `public.profiles` with fully-qualified schema reference
- WHERE clause is always `WHERE id = auth.uid()` — current user only; never another user's row
- SECURITY DEFINER bypasses the calling user's RLS on `profiles` — this is intentional and safe because the helper only returns the current user's own row

**Recursion prevention:**
`profiles` has RLS enabled. An RLS policy on `profiles` calls `get_my_role()`. Without SECURITY DEFINER, `get_my_role()` would be subject to the calling user's RLS when it queries `profiles` — which calls `get_my_role()` again — infinite recursion and a stack overflow. With SECURITY DEFINER, the function runs as its owner, bypassing the calling user's RLS entirely. The `WHERE id = auth.uid()` clause ensures the function can only ever return the current user's own data, making this bypass safe.

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
- **Leaders are read-only** on all data tables — they may not INSERT, UPDATE, or DELETE anything.
- "Own store" = `store_id = get_my_store_id()`
- "Area stores" = `store_id IN (SELECT id FROM public.stores WHERE area_id = get_my_area_id())`
- "Lock check (USING)" = checked against `OLD` row; `(SELECT is_locked FROM public.audits WHERE id = <child>.audit_id) = false`
- All non-admin direct UPDATE on `action_plan_items` and `action_plans` is DENIED in V1. Progress tracking for store managers requires a future server-side RPC/route.

---

### `areas`

| Operation | admin | area_manager | store_manager | leader |
|---|---|---|---|---|
| SELECT | All rows | Own area only: `id = get_my_area_id()` | Own store's area: `id = (SELECT area_id FROM stores WHERE id = get_my_store_id())` | Same as store_manager |
| INSERT | Yes | No | No | No |
| UPDATE | Yes | No | No | No |
| DELETE | Yes | No | No | No |

**Area management rule:** Area creation and updates are admin-only in V1. Area managers are assigned to an existing area through `profiles.area_id`; they do not create or edit `areas`.

---

### `stores`

| Operation | admin | area_manager | store_manager | leader |
|---|---|---|---|---|
| SELECT | All rows | `area_id = get_my_area_id()` | `id = get_my_store_id()` | `id = get_my_store_id()` |
| INSERT | Yes | Target rule: `area_id = get_my_area_id()` | No | No |
| UPDATE | Yes | Target rule: `area_id = get_my_area_id()` and cannot move store outside assigned area | No | No |
| DELETE | Yes | No | No | No |

**Store management rule:** Stores are not fixed seed-only data. Admin can create, update, and manage all stores. Area managers may create and update stores only inside their assigned area. Store managers and leaders cannot create stores and can only view their own assigned store.

**First migration compatibility note:** If `001_initial_schema.sql` still has admin-only `stores_insert` and `stores_update` policies, the schema is safe for the first migration but does not yet support the area-manager store-management UI. Add a follow-up migration before building that UI. The follow-up RLS must scope area-manager INSERT/UPDATE to `area_id = get_my_area_id()` and must prevent an area manager from moving an existing store into or out of another area.

---

### `profiles`

| Operation | admin | area_manager | store_manager | leader |
|---|---|---|---|---|
| SELECT | All rows | Own row + rows where `store_id IN (area stores)` | Own row + rows where `store_id = get_my_store_id()` | Own row only: `id = auth.uid()` |
| INSERT | Yes (manual only in V1) | No | No | No |
| UPDATE | All rows | **No** | **No** | **No** |
| DELETE | Yes | No | No | No |

**profiles UPDATE policy (V1):** Only admin can directly UPDATE profiles rows. Non-admin direct UPDATE on `profiles` is denied in V1 for all roles (area_manager, store_manager, leader). If non-admin profile edits (such as updating `full_name`) are needed in a future phase, they must be implemented via a server-side route or RPC that explicitly cannot modify `role`, `store_id`, or `area_id`. No direct client UPDATE on profiles is permitted for non-admin roles in V1.

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
| UPDATE | All rows | No | `store_id = get_my_store_id()` (see USING/WITH CHECK note) | No |
| DELETE | Yes | No | No | No |

**USING vs WITH CHECK for store_manager UPDATE on `audits`:**

The `BEFORE UPDATE` trigger sets `NEW.is_locked = true` when `status` transitions to `'completed'`. Without careful policy design, the WITH CHECK on the resulting row would fail because `is_locked = true` but the policy checked `is_locked = false`.

Correct RLS design:
- `USING (store_id = get_my_store_id() AND is_locked = false)` — allows the UPDATE only when the **current (OLD) row** is unlocked. This filters which rows can be targeted.
- `WITH CHECK (store_id = get_my_store_id() AND (is_locked = false OR (status = 'completed' AND is_locked = true)))` — allows the **resulting (NEW) row** to be either still-unlocked (draft/in_progress updates) or newly locked (the completion transition itself).

This means a store_manager CAN transition an audit to `completed` (which triggers auto-lock), but CANNOT re-open or unlock it afterward. Non-admin can never set `is_locked = false` directly.

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
| INSERT | Yes (service role only in practice) | No | **No** | No |
| UPDATE | **No — denied for ALL roles including admin** | No | No | No |
| DELETE | Yes (server route/service role only) | No | No | No |

Photos are immutable once uploaded. No UPDATE is allowed for any role.

**audit_photos INSERT policy (V1):** Non-admin direct INSERT into `audit_photos` is **denied** in V1 for all non-admin roles. All photo uploads go through the server-side API route, which authenticates the caller, validates authorization by role and store scope, uploads the storage object using service role, and then inserts the `audit_photos` row using service role. Admin and service role may insert; store managers must not insert audit_photos directly from the client.

**audit_photos DELETE policy (V1):** Admin-initiated deletes also go through the Next.js server route using service role after admin authorization is confirmed. No direct client DELETE on `audit_photos` or `storage.objects` is permitted in V1.

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
| UPDATE | All rows | No | **Denied in V1** | No |
| DELETE | Yes | No | No | No |

**V1 decision:** Non-admin direct UPDATE on `action_plans` is denied. If store managers need to update plan status, this must be implemented as a server-side RPC or API route in a later phase, which can enforce store ownership, allowed fields, and business rules. Admin manages plans directly.

---

### `action_plan_items`

| Operation | admin | area_manager | store_manager | leader |
|---|---|---|---|---|
| SELECT | All rows | Via `action_plan_id → action_plans.store_id IN (area stores)` | Via `action_plan_id → action_plans.store_id = get_my_store_id()` | Via `action_plan_id → action_plans.store_id = get_my_store_id()` |
| INSERT | Yes (also service_role) | No | No | No |
| UPDATE | All rows | No | **Denied in V1** | **Denied in V1** |
| DELETE | Yes | No | No | No |

**V1 decision:** Non-admin direct UPDATE on `action_plan_items` is denied in V1. Leader is read-only on all tables including this one. Store manager progress tracking (`status`, `completed_at`) must be implemented via a server-side RPC in a later phase. That RPC will validate role, store ownership, and restrict fields to `status` and `completed_at` only.

---

## Section 8 — Final Storage Strategy

**Bucket:** `audit-photos`
**Access:** Private (no public access)

### Path Format

**Bucket name:** `audit-photos`

The `storage_path` column in `audit_photos` stores the **bucket-relative path only** — do not include the bucket name (`audit-photos/`) inside `storage_path`:

```
{audit_id}/{answer_id}/{photo_id}.{ext}
```

Example value stored in `storage_path`:
```
8e8f4a2c-...-uuid/9a9b3d1e-...-uuid/c7d2e3f4-...-uuid.jpg
```

Full path used in Storage API calls (bucket name + object path; never stored in DB):
```
audit-photos/8e8f4a2c-...-uuid/9a9b3d1e-...-uuid/c7d2e3f4-...-uuid.jpg
```

`photo_id` is the UUID of the `audit_photos` row, assigned before upload. The extension is derived from the validated MIME type server-side.

> **Path parsing is never authorization.** Access checks must parse exact path segments (3 segments: `{audit_id}/{answer_id}/{photo_id}.{ext}`), not prefix matching. Path structure is for organization only. All authorization requires a DB-backed lookup against `audits` and `profiles`.

> **Important:** Path structure is used for organization only, not for access authorization. **Path parsing alone is never sufficient for access decisions.** All authorization requires a DB-backed lookup: the server route must query `audits` and `profiles` to confirm the caller has permission before generating a signed URL or accepting an upload.

### `storage.objects` Policies (V1)

In V1, **all storage access is server-side only**. No direct client reads or uploads are permitted.

| Operation | Policy |
|---|---|
| SELECT (read) | **Denied for all authenticated clients in V1.** All reads are via server-generated signed URLs only. |
| INSERT (upload) | **Denied for all authenticated clients in V1.** All uploads go through the Next.js API route using service role. |
| UPDATE | **Denied for all roles including admin.** Photos are immutable. |
| DELETE | **Denied for direct authenticated clients in V1.** Admin-initiated deletes also go through the Next.js server route using service role after admin authorization is confirmed. No direct storage DELETE policy is granted to any authenticated role in V1. |

### Signed URL Approach

- Signed URLs are generated **server-side only**, via a Next.js API route using `SUPABASE_SERVICE_ROLE_KEY`.
- Never generated in browser code or client components.
- TTL: 60 minutes per signed URL.
- The API route performs a DB-backed authorization check before generating the URL.

### Server-Side Validation Steps (Upload)

Before accepting an upload, the API route must:
1. Authenticate the caller via the Supabase server client (not anon client).
2. Verify upload authorization by role and store scope:
   - **admin:** may upload for any audit.
   - **store_manager:** may upload only for unlocked audits where `audits.store_id` matches the caller's `store_id` in `profiles`.
   - **area_manager:** SELECT-only in V1; upload is **denied**.
   - **leader:** upload is **denied** in V1.
   - Do **NOT** use `audited_by = auth.uid()` as the authorization check — authorization is role/store-scope, not auditor identity.
3. Verify `is_locked = false` on the parent audit.
4. Query `audit_answers` to verify `answer_id` exists and `audit_id` matches the provided `audit_id`.
5. Validate MIME type: only `image/jpeg`, `image/png`, `image/webp` accepted.
6. Validate file size: reject files exceeding the configured limit (e.g., 10 MB).
7. Generate `photo_id = gen_random_uuid()`. Construct the bucket-relative object path (this is the value stored in `storage_path`): `{audit_id}/{answer_id}/{photo_id}.{ext}`. For the Storage API call, prepend the bucket name: `audit-photos/{audit_id}/{answer_id}/{photo_id}.{ext}`. Never store the bucket name inside `storage_path`.
8. Upload to Storage using service role (full path: `audit-photos/{object_path}`).
9. Insert `audit_photos` row with `storage_path = {audit_id}/{answer_id}/{photo_id}.{ext}` (bucket-relative), `audit_id`, `answer_id`, `uploaded_by` using service role.
10. Return the inserted `audit_photos` row to the client (not a public URL).

### Server-Side Validation Steps (Signed URL Read)

Before generating a signed URL, the API route must:
1. Authenticate the caller.
2. Query `audit_photos` to get the `audit_id` for the requested `storage_path`.
3. Verify the caller's role has access to that `audit_id` (same logic as the audit SELECT policy).
4. Generate and return the signed URL via service role.

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
| `audit_photos` | Non-admin direct INSERT is **denied** in V1. All uploads go through the server route (service role), which validates `is_locked = false` before inserting. |
| `ai_reports` | Written only via service role (bypasses RLS). Backend route does not write to locked audits by application logic. |
| `action_plans` | Non-admin direct UPDATE denied in V1 (see Section 7). |
| `action_plan_items` | Non-admin direct UPDATE denied in V1 (see Section 7). Store manager progress tracking deferred to future server-side RPC. |

### `action_plan_items` and `action_plans` — V1 Decision

Non-admin direct UPDATE on `action_plan_items` and `action_plans` is **denied** in V1.

- **Leader:** read-only on all tables. No UPDATE allowed on any table.
- **Store_manager:** progress tracking (`status`, `completed_at` on items) is a valid future product need, but granting direct UPDATE through the Supabase client in V1 would require column-level restriction that RLS cannot enforce. The safe V1 choice is to deny direct UPDATE and implement tracking via a server-side RPC in a later phase.
- **Admin:** may UPDATE all columns on both tables at any time.

This design is conservative. It does not prevent the feature — it defers the implementation to a controlled server route that can validate role, store ownership, allowed fields, and audit lock status atomically.

---

## Section 10 — Final Seed Strategy

### Tables to Seed

| Table | Natural key column | Seed content |
|---|---|---|
| `areas` | `name` | Minimal starter area only: `Dublin` |
| `stores` | `code` | Minimal starter store only: `Dublin Airport` with store code `5292`, linked to `Dublin` |
| `checklist_sections` | `slug` | 10 sections from app-bible.md (in English, in order) |
| `audit_questions` | `question_key` | 62 questions distributed across 10 sections; `is_critical = true` for Service & Customer Interaction and Scenario Question sections |

The admin user profile is **not seeded via SQL**. See below.

Stores and areas are operational records, not permanent seed-only fixtures. Seed files should not become the normal workflow for adding new stores. After the starter data exists, future stores must be created through the app by admin or, after the required RLS follow-up migration, by area_manager users within their assigned area. Future area creation remains admin-only in V1.

### Idempotency

All seed rows use:
```sql
INSERT INTO ... (...) VALUES (...)
ON CONFLICT (<natural_key>) DO NOTHING;
```

For `areas`: conflict on `name`. For `stores`: conflict on `code`. For `checklist_sections`: conflict on `slug`. For `audit_questions`: conflict on `question_key`. Running the seed file multiple times produces no duplicate rows and no errors.

Do NOT use `(section_id, order_index)` as the conflict target for `audit_questions` — it is a secondary UNIQUE constraint for ordering stability, not the seed's primary idempotency key.

### Auth User Creation — No Auto-Trigger in V1 (Decision 3)

There is no `AFTER INSERT ON auth.users` trigger in V1. **The admin user and all other users are created manually via the Supabase Dashboard.** After creating a user in Supabase Auth, the admin manually inserts a corresponding row into `public.profiles` with the correct `role`, `store_id`, and `area_id`. This is the only supported user creation path in V1. A UI-driven user management flow (with a trigger or Edge Function) is deferred to Phase 4.

### Seed Execution Order

```
1. areas                     (no dependencies)
2. stores                    (depends on: areas; starter store only)
3. checklist_sections        (no dependencies)
4. audit_questions           (depends on: checklist_sections)
5. Admin profile             (manual: Supabase Dashboard → Auth → New User → insert profiles row)
```

---

## Section 11 — Remaining Risks

- **Migration must begin with `CREATE EXTENSION IF NOT EXISTS pgcrypto`** before any use of `gen_random_uuid()`. Without this extension, UUID generation will fail in PostgreSQL < 14 and some Supabase environments.
- **Sentinel answer creation:** The "General Observations" answer row (for general-overview photos not tied to a specific checklist question) must be auto-created when a new audit starts. Requires either an `AFTER INSERT ON audits` trigger or logic in the "Start Audit" API route. Not in this migration — plan for Phase 3.3/3.4.
- **Composite FK creation order:** `UNIQUE(audit_id, id)` on `audit_answers` must be declared before the composite FK on `audit_photos`. Migration authoring must respect this.
- **Helper functions before RLS policies:** All four helper functions must be created before any RLS policy that calls them. Migration creation order must enforce this.
- **area_manager RLS subquery cost:** `store_id IN (SELECT id FROM stores WHERE area_id = get_my_area_id())` runs on every row eval. The `stores(area_id)` B-tree index is mandatory for acceptable performance.
- **profiles.email denormalization drift:** If a user changes their email in Supabase Auth, `profiles.email` becomes stale. No sync mechanism in V1. Acceptable but must be documented.
- **`checklist_sections` trigger registration:** `handle_updated_at()` must be registered on `checklist_sections` explicitly. This was previously described as insert-only and may be missed in migration authoring.
- **`data/defaultChecklist.ts` is an empty array:** Must be populated with the 10 sections and 62 questions before Phase 3.4 seed execution.
- **ON DELETE RESTRICT for profiles.store_id/area_id:** Stores and areas with assigned profiles cannot be deleted. Admin must reassign or remove profiles first. Acceptable for V1 but may need a cascade or soft-delete strategy later.
- **Area-manager store writes require follow-up migration if not in `001_initial_schema.sql`:** The current first migration may intentionally keep `stores_insert` and `stores_update` admin-only. Before building area-manager store management UI, add a follow-up migration that allows area_manager INSERT/UPDATE only where `area_id = get_my_area_id()` and prevents cross-area reassignment.
- **store_manager progress tracking deferred:** Direct UPDATE on `action_plans` and `action_plan_items` is denied for non-admin in V1. A server-side RPC must be built before store managers can track action item completion.
- **`data/defaultChecklist.ts` TypeScript alignment (future task):** `types/audit.ts` `AuditPhoto` should later be updated to use `answerId`, `storagePath`, `createdAt` to match the DB column names. Not required for this migration.
- **`types/report.ts` `ActionPlan` alignment (future task):** Should later include `status`, `focusArea`, `summary`, `generatedByAi` fields to match the DB `action_plans` table. Not required for this migration.
- **`types/audit.ts` Score/N/A alignment (future task):** The DB uses `score IS NULL AND is_na = false` to represent an unanswered question, and `is_na = true` with `score IS NULL` to represent N/A. The current `types/audit.ts` `QuestionScore` comment says `// null = N/A (question skipped or not applicable)`, which is incorrect — `null` means unanswered in the DB. The `AuditAnswer` interface should later add an `isNa: boolean` field (or equivalent), and the `null = N/A` comment should be replaced with `null = unanswered`. Do not change TypeScript types as part of this migration.
- **Required-answer completion validation is application/server-side (V1 known limitation):** The DB enforces score range bounds and N/A semantics via CHECK constraints, but the rule that every `is_required = true AND is_na = false` answer must have a non-NULL score before an audit can transition to `completed` is enforced by application logic (the server route or RPC that triggers the transition), not by a DB constraint in V1. This is a deliberate choice — enforcing this as a DB constraint would require a complex deferred multi-row check. The DB is protected by the audit lock trigger and RLS; completion validation is a guard at the transition call site, not a storage-layer constraint.

---

## Section 12 — Readiness Statement

**READY FOR CODEX RE-AUDIT.**

All blocking issues from the previous Codex audit have been resolved:

| Previous issue | Resolution |
|---|---|
| C1 — `question_key` missing from `audit_questions` | Added `question_key text NOT NULL UNIQUE`; seed uses `ON CONFLICT (question_key)` |
| C2 — leader UPDATE contradiction on `action_plan_items` | Leader is read-only everywhere. Direct non-admin UPDATE on `action_plan_items` denied in V1. |
| C3 — `areas(name)` no UNIQUE constraint for seed | Added `UNIQUE (name)` to `areas` |
| M1 — Missing CHECKs for `audit_questions` and `checklist_sections` | All missing CHECK constraints added to Section 4 |
| M2 — `action_plans` UPDATE lock contradiction | Lock check removed; non-admin direct UPDATE denied in V1 |
| M3 — `audit_photos` admin UPDATE contradicted immutability | UPDATE denied for ALL roles including admin in Section 7 |
| M4 — Missing `answer_id` DB validation step | Step 4 added to upload validation sequence |
| S1 — SECURITY DEFINER helper ownership insufficient (SELECT only) | Clarified: owner must be profiles table owner or have BYPASSRLS. SELECT-only is insufficient. Updated Section 1 Decision 9 and Section 6. |
| S2 — Non-admin direct profiles UPDATE permitted | Denied in V1 for all non-admin roles. profiles UPDATE table corrected. Server-route note added. |
| S3 — Non-admin direct audit_photos INSERT permitted | Denied in V1 for all non-admin roles. All uploads server-route only via service role. |
| S4 — Upload authorization used audited_by = auth.uid() | Replaced with role/store-scope authorization. area_manager is SELECT-only; leader denied in V1. |
| S5 — Storage DELETE described as direct admin access | Clarified: admin DELETE also goes through server route/service role. No direct storage DELETE in V1. |
| S6 — Storage path format ambiguous | Clarified: storage_path is bucket-relative (no bucket name prefix). Exact 3-segment path format documented. |
| S7 — Score/N/A TypeScript misalignment undocumented | Added known V1 limitation note to Section 11: types/audit.ts null = N/A comment is wrong; isNa field needed in future. |
| S8 — Completion validation not documented as app-side | Added V1 known limitation: required-answer completion validation is application/server-side, not a DB constraint. |
