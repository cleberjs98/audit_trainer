# Current App State

This is the current source of truth for the implemented Audit Trainer V1 app.

## Product

- Display name: **Audit Trainer**.
- Current implementation scope: Pret CE V1 / Store Audit Trainer V1.
- Purpose: operational audit and action plan platform for store teams.
- Experience: mobile-first app with premium Graphite + Signal Crimson styling.
- Production URL: `https://audit-trainer.vercel.app`.

## Implemented V1 Features

### Authentication

- Supabase email/password login.
- Auth callback route at `/auth/callback`.
- Invitation acceptance route at `/accept-invite`.
- Safe internal `next` redirects only.
- Invitation acceptance uses `accept_invitation_v1(raw_token)` and requires the authenticated user's email to match the invitation email.

### Dashboard Analytics V1

- Role-specific analytics for `admin`, `area_manager`, `store_manager`, and `leader`.
- Uses the authenticated Supabase server client and RLS.
- No service role usage.
- Mobile dashboard has a compact Command Center.
- Mobile Quick Actions are hidden because bottom navigation handles primary navigation.

### Audit Workflow

- Start Audit at `/start-audit`.
- Audit History at `/audits`.
- Audit detail/checklist at `/audits/[auditId]`.
- Guided mobile checklist wizard.
- Review & Complete flow through `complete_audit_v1`.
- Completed audits are locked/read-only in the normal UI.

### Pret CE V1 Scoring

- 19 core questions.
- 5 points per core question.
- Core maximum score: 95.
- Outstanding Card bonus: separate 5-point optional bonus.
- Display format: `87/95 + 0/5 bonus`.
- Percentage and score band use core score only.

### Manual Action Plans V1

- `/action-plans` list.
- `/action-plans/[actionPlanId]` detail.
- Manual action plan creation from completed audits.
- One plan per audit.
- Manual plans use `generated_by_ai = false`.
- Action items support owner text, priority, due date, success measure, and status.
- Leaders can create and manage own-store action plans and items.
- No AI-generated action plans in V1.
- No delete in V1.

### Team Management V1

- `/team` is available to `admin`, `area_manager`, and `store_manager`.
- Leaders cannot access Team Management.
- Admin can invite all roles.
- Area manager can invite `store_manager` and `leader` inside own area.
- Store manager can invite `leader` inside own store.
- Pending invitations can be cancelled with the visible action label **Cancel invite**.
- Raw invite token is shown only once when email delivery is not configured or fails.
- `token_hash` is stored; raw token is never stored.
- Resend email delivery is optional through `RESEND_API_KEY`, `INVITE_EMAIL_FROM`, and `APP_BASE_URL`.

### Store Management V2

- `/store-management` is available to `admin` and `area_manager`.
- Store managers and leaders cannot access Store Management.
- `stores.code` is the official Store Number.
- Store records include operational address, contact, location, opening-hours, and notes fields.
- `stores.store_manager_id` is optional and must point to a `store_manager` profile whose `profiles.store_id` already matches the store.
- Mobile flow:
  - Stores list first.
  - `+ Create store` opens the create form.
  - Tapping a store opens a store profile/report.
  - `Edit store details` opens the edit form.
  - Create/edit forms are not shown by default on mobile.

### Mobile App Experience V1

- Mobile app shell with top header and role-aware bottom navigation.
- Premium Graphite + Signal Crimson styling.
- Raised white cards over soft gray/graphite-tinted backgrounds.
- Reusable mobile classes:
  - `mobile-graphite-panel`
  - `mobile-premium-card`
  - `mobile-soft-card`
- Semantic lucide-react iconography:
  - Home: dashboard.
  - ClipboardList: audits.
  - ListChecks: action plans.
  - Store: stores.
  - Users/UserPlus: team and invites.
  - Plus: create.
  - Pencil/Edit: edit.
  - CircleCheck: completed.
  - Clock: in progress.
  - TriangleAlert: attention.

## Current Role Model

The only active V1 roles are:

- `admin`
- `area_manager`
- `store_manager`
- `leader`

Do not use old role names such as `auditor` or generic `manager`.

## Not Implemented in V1

- Request access flow.
- Multi-store manager assignment.
- Full active user role/scope editing UI.
- AI-generated action plans.
- AI dashboard trends/rankings.
- PDF export.
- Employee/job title/person/team analysis.
- Rich store performance reports beyond currently loaded data.
