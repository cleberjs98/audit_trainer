# Audit Trainer

Audit Trainer is a mobile-first operational audit and action plan platform for store teams.

The current V1 implementation is focused on Pret CE V1 / Store Audit Trainer workflows:

- Supabase email/password authentication.
- Controlled invitation acceptance through `/auth/callback` and `/accept-invite`.
- Role-specific dashboard analytics.
- Start Audit, guided Pret CE V1 checklist, Review & Complete, and Audit History.
- Manual Action Plans V1.
- Team Management V1 invitations and pending invite cancellation.
- Store Management V2 with store list, profile/report view, and create/edit flows.
- Premium Graphite + Signal Crimson mobile experience with role-aware bottom navigation.

## Stack

- Next.js App Router
- TypeScript
- Tailwind CSS
- Supabase Auth and PostgreSQL
- Resend REST API for optional invitation email delivery

OpenAI, PDF export, request access, multi-store managers, richer employee/team analytics, and AI-generated recommendations are V2/future items.

## Roles

| Role | Scope | Current V1 access |
| --- | --- | --- |
| `admin` | All areas and stores | Full access to dashboard, audits, action plans, stores, team invitations, and assignments. |
| `area_manager` | One area through `profiles.area_id` | Own-area dashboard, audits, action plans, Store Management, own-area store manager assignment, and invitations for `store_manager`/`leader`. |
| `store_manager` | One store through `profiles.store_id` | Own-store dashboard, audits, action plans, and Team Management for inviting leaders. No Store Management access. |
| `leader` | One store through `profiles.store_id` | Own-store audits and action plans/items. No Team Management or Store Management access. |

There is no active V1 `auditor` or generic `manager` role.

## Pret CE V1 Scoring

- 19 required core questions.
- Each core question is worth 5 points.
- Core maximum score is 95.
- Outstanding Card is a separate optional bonus worth 5.
- Display format is `87/95 + 0/5 bonus`.
- Percentage and score band are based on the core score only.

Score bands:

- `95-100`: `excellent`
- `85-94`: `good`
- `70-84`: `needs_focus`
- `<70`: `critical`

## Local Setup

Install dependencies:

```bash
npm install
```

Create `.env.local` from `.env.example` and fill in local values.

Required local/production variables:

```txt
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
APP_BASE_URL=
```

Optional invitation email variables:

```txt
RESEND_API_KEY=
INVITE_EMAIL_FROM=
```

If the email variables are missing or invalid, Team Management still creates invitations and shows a one-time manual fallback link immediately after invite creation.

Future server-only variables are not required for current V1 client features:

```txt
# OPENAI_API_KEY=
# SUPABASE_SERVICE_ROLE_KEY=
```

Do not expose a Supabase service role key to the browser. The current V1 app does not require a service role key for implemented client-facing features.

## Development Commands

On Windows PowerShell, prefer `cmd /c` because PowerShell execution policy may block `npm.ps1`.

```bash
cmd /c npm run lint
cmd /c npm run typecheck
cmd /c npm run build
```

Other common commands:

```bash
npm run dev
npm run start
```

## Deployment

Production target:

```txt
https://audit-trainer.vercel.app
```

Supabase project:

```txt
Project ref: daatfutrebgmxozclthb
URL: https://daatfutrebgmxozclthb.supabase.co
```

See [docs/deployment.md](docs/deployment.md) for Vercel setup, environment variables, Supabase Auth URLs, post-deploy testing, and rollback notes.

## Documentation Map

- [docs/current-app-state.md](docs/current-app-state.md) - current V1 source of truth.
- [docs/permissions.md](docs/permissions.md) - role and scope matrix.
- [docs/scoring.md](docs/scoring.md) - Pret CE V1 scoring.
- [docs/mobile-ux.md](docs/mobile-ux.md) - Graphite + Signal Crimson mobile UX.
- [docs/database.md](docs/database.md) - migrations, key tables, RPCs, and RLS notes.
- [docs/deployment.md](docs/deployment.md) - deployment checklist.
- [docs/roadmap.md](docs/roadmap.md) - known limitations and V2 backlog.
