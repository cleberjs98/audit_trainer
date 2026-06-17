# V1 Limitations and Upgrade Plan

## 1. Overview

V1 prioritizes secure role scope, RLS correctness, and a working audit flow before advanced analytics, automation, or reporting polish. The current implementation is intentionally conservative: users can sign in, work inside their assigned role scope, manage stores where permitted, start audits, and save checklist answers without exposing service-role access or bypassing RLS.

This document records which parts are deliberately simple for V1, why that is acceptable for the current phase, and what must be upgraded later.

## 2. Current Implemented Modules

### Visual Identity Refresh

- The app now uses its own **Audit Trainer** identity rather than a Pret-specific theme.
- The approved direction is **Graphite + Signal Crimson**:
  - `background`: `#F4F6F8`
  - `surface`: `#FFFFFF`
  - `surface-soft`: `#F8FAFC`
  - `primary`: `#D11F3A`
  - `primary-dark`: `#A9152D`
  - `primary-soft`: `#FDE8EC`
  - `foreground`: `#171A1F`
  - `muted`: `#667085`
  - `border`: `#D9DEE7`
  - `accent`: `#FFB020`
  - `success`: `#12B76A`
  - `warning`: `#F79009`
  - `danger`: `#F04438`
  - `info`: `#344054`
- Primary crimson buttons must use white text.
- Dashboard desktop uses a dark graphite sidebar with Sign out in the sidebar footer.
- Cards use white/light-gray surfaces, subtle gray borders, and premium shadow.
- Badges and status chips use semantic colors rather than brand color alone.
- Login includes a local password Show/Hide toggle and a safe Forgot password placeholder.
- The Pret CE V1 checklist uses a circular connected stepper:
  - Core 5/5: green.
  - Core 4/5: amber.
  - Core 0-3/5: red.
  - Unanswered: neutral.
  - Bonus 5/5: gold.
  - Bonus 0/5 or unanswered: neutral, never red.
- The core score selector is segmented 0-5 for Pret CE V1 questions.

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
- The Action Plans card links to `/action-plans`.

### Team Management V1

- `/team` is implemented for `admin`, `area_manager`, and `store_manager`.
- Leaders are restricted from Team Management.
- Admins can invite `admin`, `area_manager`, `store_manager`, and `leader`.
- Area managers can invite `store_manager` and `leader` only for stores in their assigned area.
- Store managers can invite `leader` only for their assigned store.
- Pending invitations can be viewed and revoked inside the user's allowed scope.
- The invite flow stores only `token_hash`; the raw token is not persisted.
- The raw invite link is shown only once immediately after invite creation for the current dev/manual flow.
- Email sending is deferred.
- Request access is deferred to V2.
- Multi-store manager support is deferred to V2.
- Active user role/scope editing UI is not implemented yet.

### Accept Invite V1

- `/auth/callback` supports safe internal `next` redirects for invitation returns.
- `/accept-invite` reads the token from the URL only to call the server-side acceptance flow.
- `accept_invitation_v1(raw_token)` validates token hash, pending status, expiry, and authenticated email match.
- Accepted tokens are single-use and the stored `token_hash` is never rendered.
- Role and scope come from the invitation/RPC result, not from query parameters.

### Store Management V2

- `/store-management` is implemented for `admin` and `area_manager`.
- Admin can create and update stores across all areas.
- Area managers can create and update stores only inside their assigned area, backed by RLS migration 002.
- Area managers cannot move an existing store to another area.
- `stores.code` is the official Store Number.
- Store records include operational contact, address, location, opening-hours, and notes fields.
- `stores.store_manager_id` is optional and must reference a `store_manager` profile whose `profiles.store_id` already matches the store.
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
- The Pret CE V1 guided checklist flow has been validated on local desktop.

### Mobile QA Note

- Local mobile testing over a LAN/IP Next.js dev server is not the source of truth for final mobile behavior.
- During local development, phone testing can be unreliable because of dev-server HMR, cache, and local network behavior.
- Pret CE V1 guided flow should not be blocked on local phone testing when local desktop validation passes.
- Final mobile QA must happen after deployment on a real HTTPS URL.
- The Pret CE V1 guided flow and visual identity refresh have passed local desktop validation; local LAN/IP phone testing remains advisory only.

Required post-deploy mobile test checklist:

1. Login.
2. Start New Audit.
3. Guided checklist opens at the first unanswered question.
4. Question chips navigate between questions.
5. Back works.
6. Save & Continue saves and advances.
7. Closing and reopening the audit resumes at the first unanswered question.
8. Outstanding Card accepts only 0/5.
9. Review shows core + bonus score.
10. Complete Audit locks the audit.
11. Audit History shows the completed score.

### Review / Complete Audit V1

- Completion is implemented from `/audits/[auditId]`.
- The app calls `public.complete_audit_v1(p_audit_id uuid)` through the normal authenticated Supabase server client.
- The server action re-checks auth, profile, role, audit access, status, and lock state before calling the RPC.
- The RPC calculates and persists `total_score`, `max_score`, `percentage`, `score_band`, and `section_scores` from DB-trusted checklist and answer rows.
- The existing database trigger sets `is_locked = true` and `completed_at` when status changes to `completed`.
- Completed audits become read-only in the normal UI.
- No score payload, score band, section scores, status, lock state, role, or store scope is trusted from the client.
- No photos, AI report, PDF, or reopen flow is implemented in this phase.
- Manual action plan creation is implemented separately from completed audit detail.

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

### Manual Action Plans V1

- `/action-plans` is implemented as a role-scoped list page.
- `/action-plans/[actionPlanId]` is implemented as the action plan detail page.
- The dashboard Action Plans card links to `/action-plans`.
- Completed audit detail shows either "Create Action Plan" or "View Action Plan".
- Draft and in-progress audits show that action plans become available after completion.
- Manual action plans can be created only for completed audits.
- One action plan per audit is enforced by the database.
- Manual plans use `generated_by_ai = false`.
- Admins can manage all manual action plans.
- Area managers can manage manual action plans for stores in their assigned area.
- Store managers can manage manual action plans for their assigned store.
- Leaders can manage manual action plans for their assigned store.
- Manual action items support description, owner, priority, due date, success measure, and status.
- Action item create, edit, and status update are implemented for allowed roles while the parent plan is open or in progress.
- Delete is not implemented in V1.

### RLS Migrations 004 and 005

- Migration 004 enables Start Audit V1 INSERT policies on `public.audits`.
- Migration 004 requires active stores and requires `audited_by = auth.uid()` for every role, including admin.
- Migration 005 enables Checklist V1 audit update and `audit_answers` insert/update policies.
- Migration 005 keeps non-admin edits scoped to unlocked `draft` or `in_progress` audits.
- Migration 005 allows leaders to save answers for their assigned store, matching the current V1 business rule.
- Migration 006 adds the focused `complete_audit_v1` RPC for Review / Complete Audit V1.

## 3. Intentional V1 Limitations

### Store Management V2

- No delete.
- No area management UI.
- Active user role/scope editing UI is not implemented yet.
- No bulk import.
- No advanced filtering or search.
- Area managers can manage stores in their assigned area, but user assignment is separate.

These limits keep the first store-management surface small and aligned with the current RLS model.

### User / Role Assignment

- Controlled invitation is implemented in Team Management V1.
- Invitation acceptance creates or updates the accepted user's profile with the invited role and scope.
- Active user role/scope editing UI is not implemented yet.
- Store managers cannot alter active user role or scope in V1.
- Area managers can invite and assign `store_manager` and `leader` only within their own area through invitation scope.
- Store managers can invite `leader` only within their own store.
- Leaders cannot invite or assign users.
- Request-access and multi-store-manager flows are deferred to V2.

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
- The checklist itself does not create action plans; manual action plan creation happens after completion.
- N/A support exists in the current checklist flow and the completion RPC excludes N/A answers from numerator and denominator.
- Notes are simple text.
- Answer snapshots are trusted from the database and written server-side.

The current action writes `is_critical_flag = false` because there is no critical flag UI yet. A future critical-issue feature must avoid unintentionally clearing existing flags.

### Leader Role

- The current business rule allows leaders to create and edit `draft` or `in_progress` audits for their own assigned store.
- Leaders can complete unlocked `draft` or `in_progress` audits for their assigned store.
- Leaders can create and manage manual action plans for their assigned store.
- Leaders can create and update action plan items for own-store plans.
- Leaders cannot access other stores.
- Leaders cannot manage stores.
- Leaders cannot access Team Management or invite users.
- Leaders cannot upload photos in V1.
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
- The real Pret Customer Experience checklist mapping is now documented in `docs/pret-customer-experience-checklist.md`.
- The current 62-question seed is deprecated for the real Pret-style model.
- The next scoring model should use 19 core questions worth 95 points plus 1 Outstanding Card bonus question worth 5 points.
- App V1 uses normalized 5-point scoring for all 19 core questions, including rows that appear as 3-point or 2-point questions in the source report.
- The real report's Information Only fields will not be included in the app V1 checklist.
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

### AI Reports / PDF / Email

- Database tables exist for AI reports and action plans.
- Manual Action Plans V1 is implemented.
- AI-generated action plans are not implemented yet.
- PDF export is not implemented yet.
- Email sending is not implemented yet.
- AI reports should be generated after audit completion or review in a future phase.
- OpenAI calls must remain server-side.
- PDF generation must not expose private audit data or service-role credentials to the browser.

## 4. Known Documentation Drift

Some older documents still describe an earlier role model or earlier route plan. Treat the current migrations and implemented V1 flow as the current source for behavior until these docs are cleaned up.

- `docs/engineering.md` contains old `auditor` and `manager` role examples and older schema snippets.
- `docs/implementation-phases.md` contains old `Auditor` wording and older route examples such as `/audits/[id]/checklist`.
- `docs/database-schema-plan.md` is an early consolidated schema plan and now includes update notes where migrations 004, 005, 012, and 013 changed leader/action-plan behavior.

Keep these legacy planning docs in mind when implementing new phases; current migrations and app code are authoritative for behavior.

## 5. Recommended Next Implementation Order

1. Photo upload V1
2. Email sending for invitations
3. Active user role/scope editing UI
4. AI report generation
5. PDF export
6. AI-generated action plan recommendations
7. Analytics and comparison dashboards

## 6. Security Notes

- RLS remains the final guard.
- Do not use the service role in client components.
- Server actions must re-check auth, profile, and role.
- Do not trust client-provided role, scope, max score, snapshots, store ID, or audit ownership.
- Do not trust a client-provided `audit_id` without reloading the audit server-side and checking role scope.
- Completed or locked audits should not be edited through the normal UI.
- Active user role/scope editing must be implemented separately and audited before release.
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
