# Copilot Instructions - Audit Trainer

You are working on the Audit Trainer app.

Before implementing a feature, read the relevant current docs:

1. `docs/current-app-state.md`
2. `docs/permissions.md`
3. `docs/scoring.md`
4. `docs/mobile-ux.md`
5. `docs/database.md`
6. `docs/roadmap.md`

## Core Rules

- The app interface must be in English.
- Generated reports must be in English.
- Documentation may be in Portuguese or English, but current source-of-truth docs are English.
- The app is mobile-first.
- Stack: Next.js App Router, TypeScript, Tailwind CSS, Supabase.
- Do not change the stack without approval.
- Do not add features outside the approved scope.
- Do not expose API keys or service-role keys in frontend code.
- Do not disable Supabase RLS.
- Do not allow users to access data outside their role/scope.
- Do not allow completed audits to be edited through the normal UI.
- Keep implementation changes scoped to the requested task.

## Required Validation

Use Windows-safe commands:

```bash
cmd /c npm run lint
cmd /c npm run typecheck
cmd /c npm run build
```

Use `cmd /c git diff --check` when requested or before commit readiness review.

## Project Roles

The app supports only:

- `admin`: full access.
- `area_manager`: one area through `profiles.area_id`.
- `store_manager`: one store through `profiles.store_id`.
- `leader`: one store through `profiles.store_id`.

Do not introduce old roles such as `auditor` or generic `manager`.

Leaders are operational in V1: they can create audits and manage action plans/items for their own store, but they cannot access Team Management or Store Management.

## Scoring Rules

- Pret CE V1 has 19 core questions.
- Each core question is worth 5 points.
- Core max score is 95.
- Outstanding Card bonus is separate and max 5.
- Display Pret CE V1 scores as `87/95 + 0/5 bonus`.
- Percentage and score band use core score only.
- Do not fold bonus into `/100`.

## UI Rules

- Product name displayed in the app: Audit Trainer.
- Visual identity: Graphite + Signal Crimson.
- Background: `#F4F6F8`.
- Foreground: `#171A1F`.
- Surface: `#FFFFFF`.
- Surface soft: `#F8FAFC`.
- Primary: `#D11F3A`.
- Primary dark: `#A9152D`.
- Primary soft: `#FDE8EC`.
- Border: `#D9DEE7`.
- Muted: `#667085`.
- Status colors: success green, warning amber, danger red, info graphite, bonus gold.
- Primary crimson buttons must use white text.
- Mobile should use soft graphite/light gray backgrounds, raised white cards, graphite panels, and crimson primary actions.
- Desktop dashboard sidebar remains dark graphite.
- Checklist uses the guided wizard and circular score-colored stepper.

## Security Rules

- Use authenticated Supabase clients for app data access.
- RLS remains the final guard.
- Server actions must validate auth, profile, role, and scope.
- Do not trust client-provided role, scope, ownership, store ID, or scoring metadata.
- Raw invite tokens are never stored.
- `token_hash` is never rendered.
- Service role is not required for current V1 client-facing features.

## Implementation Discipline

For every task:

1. Read relevant docs.
2. Inspect current code before editing.
3. Implement only the requested scope.
4. Preserve role/scope rules.
5. Preserve scoring rules.
6. Remove unused imports and debug logs.
7. Run validation.
8. Summarize files changed, behavior, validation, risks, and suggested commit message.
