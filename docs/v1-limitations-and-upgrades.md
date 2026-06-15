# V1 Limitations and Upgrade Plan

## 1. Overview

V1 prioritizes secure role scope, RLS correctness, and a working audit flow before advanced analytics, automation, or reporting polish. The current implementation is intentionally conservative: users can sign in, work inside their assigned role scope, manage stores where permitted, start audits, and save checklist answers without exposing service-role access or bypassing RLS.

This document records which parts are deliberately simple for V1, why that is acceptable for the current phase, and what must be upgraded later.

## 2. Current Implemented Modules

### Auth/Login

- Supabase email/password login is implemented.
- Authenticated users are routed into the protected app flow.
- Missing profiles are handled with a safe setup-needed state.
- The app uses only the approved roles: `admin`, `area_manager`, `store_manager`, and `leader`.
- Service-role credentials are not used in the client auth flow.

### Protected Dashboard

- `/dashboard` is protected server-side.
- The dashboard shows the Audit Trainer shell, signed-in email, role, and friendly store/area context.
- The Start New Audit card links to `/start-audit`.
- The View Audit History card links to `/audits`.
- Store Management is visible only to `admin` and `area_manager`.
- Action Plans is still a placeholder.

### Store Management V1

- `/store-management` is implemented for `admin` and `area_manager`.
- Admin can create and update stores across all areas.
- Area managers can create and update stores only inside their assigned area, backed by RLS migration 002.
- Store managers and leaders cannot access Store Management.
- Store deletion is not implemented in V1.

### Start Audit V1

- `/start-audit` is implemented for all four roles.
- Admin can start audits for any active store.
- Area managers can start audits for active stores in their assigned area.
- Store managers and leaders can start audits only for their assigned active store.
- The server action inserts only the `audits` row with `status = 'draft'` and `audited_by = auth.uid()`.
- No answers, photos, AI report, PDF, or action plan are created at audit start.
- Successful creation redirects to `/audits/[auditId]`.

### Audit Detail / Checklist V1

- `/audits/[auditId]` is implemented.
- The page loads the audit through the normal Supabase server client and RLS.
- Active checklist sections and active audit questions are loaded from the database.
- Existing answers are loaded only for the current audit.
- Users can save checklist answers for unlocked `draft` or `in_progress` audits inside their role scope.
- Completed or locked audits render read-only in the normal UI.
- Score preview is calculated in the app from loaded answers before completion.
- Completed audits show the persisted final score from `audits`.
- Answer snapshots and `max_score` are trusted from the database on the server side.

### Review / Complete Audit V1

- Completion is implemented from `/audits/[auditId]`.
- The app calls `public.complete_audit_v1(p_audit_id uuid)` through the normal authenticated Supabase server client.
- The server action re-checks auth, profile, role, audit access, status, and lock state before calling the RPC.
- The RPC calculates and persists `total_score`, `max_score`, `percentage`, `score_band`, and `section_scores` from DB-trusted checklist and answer rows.
- The existing database trigger sets `is_locked = true` and `completed_at` when status changes to `completed`.
- Completed audits become read-only in the normal UI.
- No score payload, score band, section scores, status, lock state, role, or store scope is trusted from the client.
- No photos, AI report, PDF, action plan, or reopen flow is implemented in this phase.

### Audit History V1

- `/audits` is implemented.
- The page is protected server-side and uses the normal Supabase server client.
- Audit visibility is role-scoped through RLS:
  - Admin sees audits for all stores.
  - Area managers see audits for stores in their assigned area.
  - Store managers see audits for their assigned store, including audits created by leaders from the same store.
  - Leaders see audits for their assigned store.
- The page includes a status filter for `draft`, `in_progress`, `completed`, and `archived`.
- Invalid status filters are ignored and treated as all statuses.
- Each row links to `/audits/[auditId]`.
- Store name, store code, area name, and creator display are shown when available through RLS.
- Score display uses persisted `audits.total_score`, `audits.max_score`, and `audits.percentage`; when no persisted score exists, it shows "Not finalized".
- The page is list/navigation only.

### RLS Migrations 004 and 005

- Migration 004 enables Start Audit V1 INSERT policies on `public.audits`.
- Migration 004 requires active stores and requires `audited_by = auth.uid()` for every role, including admin.
- Migration 005 enables Checklist V1 audit update and `audit_answers` insert/update policies.
- Migration 005 keeps non-admin edits scoped to unlocked `draft` or `in_progress` audits.
- Migration 005 allows leaders to save answers for their assigned store, matching the current V1 business rule.
- Migration 006 adds the focused `complete_audit_v1` RPC for Review / Complete Audit V1.

## 3. Intentional V1 Limitations

### Store Management V1

- No delete.
- No area management UI.
- No user assignment UI yet.
- No bulk import.
- No advanced filtering or search.
- Area managers can manage stores in their assigned area, but user assignment is separate.

These limits keep the first store-management surface small and aligned with the current RLS model.

### User / Role Assignment

- User and role assignment is not implemented yet.
- It must remain separate from Start Audit.
- Future rules:
  - Admin can assign any user role, store, or area.
  - Area managers can assign `store_manager` and `leader` only within their own area.
  - Store managers can assign `leader` only within their own store.
  - Leaders cannot assign users.
- This requires a secure design and likely server actions or RPC plus a dedicated RLS review.

### Start Audit V1

- Creates only the `audits` row.
- Does not create answer rows at audit creation.
- Does not upload photos.
- Does not generate an AI report.
- Does not generate a PDF.
- Does not create an action plan.
- Redirects to audit detail after creation.

This is safe because audit creation is role-scoped server-side and RLS remains the final guard.

### Checklist V1

- Saves answers only.
- Score preview is calculated in app memory from loaded answers.
- Total score, max score, percentage, score band, and section scores are persisted only when the user completes the audit through the Review & Complete card.
- No photos.
- No critical flag UI yet.
- No AI summary.
- No PDF export.
- No action plan.
- N/A support exists in the current checklist flow and the completion RPC excludes N/A answers from numerator and denominator.
- Notes are simple text.
- Answer snapshots are trusted from the database and written server-side.

The current action writes `is_critical_flag = false` because there is no critical flag UI yet. A future critical-issue feature must avoid unintentionally clearing existing flags.

### Leader Role

- Older docs may still say leader is read-only.
- The current business rule allows leaders to create and edit `draft` or `in_progress` audits for their own assigned store.
- Leaders cannot access other stores.
- Leaders cannot manage stores.
- Leaders cannot upload photos in V1.
- Leaders cannot update action plans or action plan items in V1.
- Completed or locked audits remain read-only.

### Audit History

- Audit History V1 is implemented.
- Current V1 behavior:
  - Role-scoped audit list through RLS.
  - Status filter.
  - Links to `/audits/[auditId]`.
  - Store name, store code, and area display when available.
  - Creator display when available through RLS.
  - Persisted score only; otherwise "Not finalized".
  - No destructive actions.
  - No complete or final submit behavior.
  - No answer editing on the list page.
  - No photos, AI report, PDF, action plan, analytics, or advanced comparison.
- Advanced analytics and comparison dashboards should come later.

### Scoring

- Current draft/in-progress scoring is preview only.
- Final persisted scoring is implemented by `complete_audit_v1` when the audit is completed.
- Score bands to use:
  - 95-100%: Excellent / Bonus Standard
  - 85-94%: Good
  - 70-84%: Needs Focus
  - <70%: Critical Training Required
- Remaining future scoring decisions:
  - Which questions are informational or non-scored.
  - Which product feedback questions count toward final score.
  - Whether decimal scores are allowed.
  - Whether comments should be required for low scores.

### Completed / Locked Audits

- Completed and locked audits are read-only in the normal UI.
- The final completion flow is implemented from `/audits/[auditId]`.
- Admin RLS may be broader as a break-glass capability, but app pages and server actions should enforce normal UI rules.
- Completion validates required answers, calculates final persisted score, sets completion fields through the RPC, and relies on the existing lock trigger.

### Photos

- The `audit-photos` storage bucket exists in the schema/storage plan.
- No photo upload UI is implemented yet.
- No photo policy changes are part of the current checklist flow.
- Uploads should use a future server route or server action with strict audit scope checks.
- Direct client storage reads, writes, updates, and deletes should remain denied in V1.

### AI Reports / PDF / Action Plans

- Database tables exist for AI reports and action plans.
- UI and generation flows are not implemented yet.
- These should be generated after audit completion or review.
- OpenAI calls must remain server-side.
- PDF generation must not expose private audit data or service-role credentials to the browser.

## 4. Known Documentation Drift

Some older documents still describe an earlier role model or earlier route plan. Treat the current migrations and implemented V1 flow as the current source for behavior until these docs are cleaned up.

- `docs/app-bible.md` still contains leader read-only language in some sections, although the current V1 rule allows leaders to create and edit draft/in_progress audits for their own store.
- `docs/engineering.md` contains old `auditor` and `manager` role examples and older schema snippets.
- `docs/implementation-phases.md` contains old `Auditor` wording and older route examples such as `/audits/[id]/checklist`.
- `docs/implementation-checklist.md` contains old leader test items that say leaders cannot create or edit checklist data.
- `docs/database-schema-plan.md` still includes older leader read-only statements in places, while migrations 004 and 005 implement the newer Start Audit and Checklist V1 role model.

These should be updated after the new V1 role model is stable across the completed core audit flow.

## 5. Recommended Next Implementation Order

1. Update docs to remove old leader read-only wording
2. Photo upload V1
3. AI report generation
4. PDF export
5. Action plan generation
6. User / Role Assignment
7. Analytics and comparison dashboards

## 6. Security Notes

- RLS remains the final guard.
- Do not use the service role in client components.
- Server actions must re-check auth, profile, and role.
- Do not trust client-provided role, scope, max score, snapshots, store ID, or audit ownership.
- Do not trust a client-provided `audit_id` without reloading the audit server-side and checking role scope.
- Completed or locked audits should not be edited through the normal UI.
- User assignment must be implemented separately and audited before release.
- Start Audit must not become a user-assignment flow.
- OpenAI and PDF generation must stay server-side.

## 7. Open Questions

- Should leaders edit all draft/in_progress audits in their store or only audits they created?
- Should decimal scores be allowed?
- Which questions are informational/non-scored?
- Which product feedback questions should count toward final score?
- When should critical flag be enabled?
- Who can reopen completed audits, if anyone?
- Should area managers be able to complete audits or only review them?
- Should final scoring require comments for low scores?
- Should the app pre-create all answer rows later, or keep lazy answer creation?
