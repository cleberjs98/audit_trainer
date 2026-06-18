# Implementation Phases

This document replaces the original historical phase plan. The current implementation is already beyond the early scaffolding phases, so this file now records the current phase status and safe next steps.

## Completed / Implemented

- Project setup with Next.js, TypeScript, Tailwind CSS, and Supabase.
- Auth/login foundation.
- Protected dashboard shell.
- Pret CE V1 scoring metadata and checklist seed.
- Start Audit.
- Guided Audit Checklist.
- Review & Complete RPC flow.
- Audit History V2.
- Manual Action Plans V1.
- Graphite + Signal Crimson visual identity.
- Mobile App Experience V1.
- User & Access Management migration 013.
- Accept Invite flow.
- Team Management V1.
- Store Management V2.
- Leader own-store action plan permissions.
- Optional Resend invitation email sending with manual fallback.
- Deployment documentation.
- Dashboard Analytics V1.

## Current Validation Standard

Every implementation or review phase should run:

```bash
cmd /c npm run lint
cmd /c npm run typecheck
cmd /c npm run build
cmd /c git diff --check
```

Do not run Supabase commands unless the user explicitly asks.

## Current V1 Maintenance Priorities

1. Keep documentation aligned with current behavior.
2. Preserve RLS and role/scope enforcement.
3. Validate post-deploy mobile behavior on the production HTTPS URL.
4. Keep manual invite fallback available when email is not configured.
5. Avoid introducing service-role dependencies into client-facing V1 paths.

## Next Candidate Phases

- Active user role/scope editing UI.
- Password recovery UI.
- Photo evidence upload.
- Richer store performance reports.
- AI-generated action plan recommendations.
- PDF export.
- Request access workflow.
- Multi-store manager support.

Any future phase must start by reading:

1. `docs/current-app-state.md`
2. `docs/permissions.md`
3. `docs/scoring.md`
4. `docs/mobile-ux.md`
5. `docs/database.md`
6. `docs/roadmap.md`
