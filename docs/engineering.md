# Engineering Overview

This document summarizes the current Audit Trainer engineering state. Applied migrations and current app code are authoritative.

## Stack

- Next.js App Router.
- TypeScript.
- Tailwind CSS.
- Supabase Auth and PostgreSQL.
- Resend REST API for optional invite emails.

OpenAI, PDF generation, photo upload, and richer analytics are future V2 work unless specifically implemented later.

## Local Project

```txt
C:\Users\Cleber 2\Desktop\audit_trainer
```

Use Windows-safe validation commands:

```bash
cmd /c npm run lint
cmd /c npm run typecheck
cmd /c npm run build
```

## App Architecture

- `app/`: Next.js App Router pages and server actions.
- `components/`: page-specific and feature components.
- `components/navigation/mobile-app-shell.tsx`: mobile app shell and role-aware bottom navigation.
- `lib/supabase/`: Supabase client helpers.
- `lib/email/`: server-only invitation email helpers.
- `types/`: local TypeScript types.
- `supabase/migrations/`: database migrations `001` through `013`.

## Auth and Profiles

- Supabase Auth provides user sessions.
- `profiles` stores app role and scope.
- One role and one scope per profile:
  - `admin`: no area/store scope.
  - `area_manager`: `area_id`.
  - `store_manager`: `store_id`.
  - `leader`: `store_id`.
- Invitation acceptance can create/update profile scope through `accept_invitation_v1`.

## Data Access Rules

- Pages and server actions use the normal authenticated Supabase server client.
- RLS remains the final guard.
- Server actions still validate role/scope explicitly before writes.
- No client component may import a service-role helper or expose secret keys.

## Current Feature Routes

- `/login`
- `/auth/callback`
- `/accept-invite`
- `/dashboard`
- `/start-audit`
- `/audits`
- `/audits/[auditId]`
- `/action-plans`
- `/action-plans/[actionPlanId]`
- `/team`
- `/store-management`

## Scoring

Pret CE V1 uses `19 x 5 = 95` core points plus a separate 5-point Outstanding Card bonus.

Persisted audit fields hold core score only:

- `audits.total_score`
- `audits.max_score`
- `audits.percentage`
- `audits.score_band`

Bonus details are stored in `audits.section_scores`.

## Database

Current Supabase migrations run through `013`.

Important RPCs:

- `complete_audit_v1`
- `assign_user_scope_v1`
- `accept_invitation_v1`
- `revoke_invitation_v1`

See `docs/database.md` for details.

## Implementation Rules for Future Work

- Do not introduce old roles such as `auditor` or generic `manager`.
- Do not fold the bonus score into `/100`.
- Do not disable RLS.
- Do not trust client-provided role, scope, scoring metadata, or ownership.
- Do not use service role in browser/client code.
- Keep app UI and report output in English.
- Keep primary crimson buttons white-text.
- Preserve the mobile-first Graphite + Signal Crimson identity.
