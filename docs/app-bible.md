# Audit Trainer App Bible

Documentation language: Portuguese is allowed, but this document is intentionally written in English so future implementation work has a single, unambiguous reference.

## Product

Audit Trainer is a mobile-first operational audit and action plan platform for store teams.

Current scope:

- Product display name: **Audit Trainer**.
- Implementation scope: Pret CE V1 / Store Audit Trainer V1.
- Visual identity: Graphite + Signal Crimson.
- Experience: premium native-style mobile app with desktop support.

## Product Purpose

Audit Trainer helps store teams answer:

```txt
Is the store ready to deliver a strong customer experience today?
```

The app currently supports:

- Role-scoped operational dashboards.
- Store audit creation.
- Pret CE V1 guided checklist.
- Completed audit scoring.
- Audit History.
- Manual action plans and action items.
- Controlled team invitations.
- Store Management for allowed roles.

## Official Roles

The only active V1 roles are:

- `admin`
- `area_manager`
- `store_manager`
- `leader`

Do not use old role names such as `auditor` or generic `manager`.

## Role Summary

| Role | Summary |
| --- | --- |
| `admin` | Full access to all areas, stores, audits, action plans, stores, team invitations, and assignments. |
| `area_manager` | Scoped to one area; manages own-area stores, audits, action plans, store manager assignments, and invitations for store managers/leaders. |
| `store_manager` | Scoped to one store; manages own-store audits, action plans, dashboard, and leader invitations. No Store Management access. |
| `leader` | Scoped to one store; creates audits and manages own-store action plans/items. No Team Management or Store Management access. |

Detailed access rules live in `docs/permissions.md`.

## Implemented V1 Modules

- Authentication and login.
- Auth callback with safe internal redirects.
- Accept Invite flow.
- Team Management V1 with invitations, pending invite list, optional Resend email sending, manual fallback, and Cancel invite.
- Dashboard Analytics V1 with role-specific metrics.
- Start Audit.
- Pret CE V1 guided checklist.
- Review & Complete.
- Audit History V2.
- Manual Action Plans V1.
- Store Management V2.
- Mobile App Experience V1.

See `docs/current-app-state.md` for the full current implementation summary.

## Pret CE V1 Scoring

- 19 required core questions.
- Each core question is worth 5 points.
- Core maximum score is 95.
- Outstanding Card bonus is separate and worth up to 5 points.
- Display example: `87/95 + 0/5 bonus`.
- Percentage and score band are based on core score only.

Score bands:

- `95-100`: `excellent`
- `85-94`: `good`
- `70-84`: `needs_focus`
- `<70`: `critical`

See `docs/scoring.md` for details.

## Design System

Audit Trainer uses its own identity, not a Pret-specific theme.

Core visual rules:

- Background: `#F4F6F8`.
- Foreground: `#171A1F`.
- Surface: `#FFFFFF`.
- Primary Signal Crimson: `#D11F3A`.
- Primary hover/dark: `#A9152D`.
- Primary soft: `#FDE8EC`.
- Border: `#D9DEE7`.
- Muted text: `#667085`.
- Primary crimson buttons always use white text.
- Mobile uses raised white cards over soft graphite/light gray backgrounds.
- Status colors are semantic: green, amber, red, graphite/info, and gold for bonus.

See `docs/mobile-ux.md` and `docs/ui-ux-design-system.md`.

## Database and Security

- Supabase project ref: `daatfutrebgmxozclthb`.
- Supabase URL: `https://daatfutrebgmxozclthb.supabase.co`.
- Migrations currently run through `013`.
- RLS must stay enabled.
- The normal authenticated Supabase client is used for app data access.
- The service role key must never be used in client components.
- Current V1 client-facing features do not require a service role key.

See `docs/database.md`.

## Deployment

Production URL:

```txt
https://audit-trainer.vercel.app
```

Required Vercel variables:

```txt
NEXT_PUBLIC_SUPABASE_URL=https://daatfutrebgmxozclthb.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=<anon public>
APP_BASE_URL=https://audit-trainer.vercel.app
```

Optional invitation email variables:

```txt
RESEND_API_KEY=
INVITE_EMAIL_FROM=
```

See `docs/deployment.md`.

## V2/Future Scope

Not implemented in current V1:

- Request access.
- Multi-store managers.
- Full active user role/scope editing UI.
- Photo evidence upload.
- AI-generated action plans.
- AI dashboard trends/rankings.
- PDF export.
- Employee/job title/person/team analysis.
- Richer store performance reports.

See `docs/roadmap.md`.
