# Implementation Checklist

This checklist reflects the current Audit Trainer V1 implementation.

## Current Status

- [x] Auth/login/dashboard foundation.
- [x] Supabase migrations through `013`.
- [x] Pret CE V1 checklist and scoring.
- [x] Start Audit.
- [x] Guided checklist wizard.
- [x] Review & Complete.
- [x] Audit History V2.
- [x] Manual Action Plans V1.
- [x] Leader own-store action plan management.
- [x] Team Management V1.
- [x] Accept Invite flow.
- [x] Optional Resend invite email sending with manual fallback.
- [x] Store Management V2.
- [x] Dashboard Analytics V1.
- [x] Graphite + Signal Crimson visual identity.
- [x] Mobile App Experience V1.
- [x] Deployment documentation.

## Required Validation

Run these after each implementation or review task:

```bash
cmd /c npm run lint
cmd /c npm run typecheck
cmd /c npm run build
cmd /c git diff --check
```

## Current Documentation Set

- [x] `README.md`
- [x] `docs/current-app-state.md`
- [x] `docs/permissions.md`
- [x] `docs/scoring.md`
- [x] `docs/mobile-ux.md`
- [x] `docs/database.md`
- [x] `docs/deployment.md`
- [x] `docs/roadmap.md`
- [x] `docs/app-bible.md`
- [x] `docs/engineering.md`
- [x] `docs/ui-ux-design-system.md`

## Current Role Rules

- [x] Admin has full access.
- [x] Area manager is scoped to one area.
- [x] Store manager is scoped to one store.
- [x] Leader is operational for own-store audits and action plans.
- [x] Leader cannot access Team Management.
- [x] Leader cannot access Store Management.
- [x] Store manager can access Team Management for own-store leader invites.
- [x] Store manager cannot access Store Management.

## Current Scoring Rules

- [x] Pret CE V1 has 19 core questions.
- [x] Each core question is worth 5 points.
- [x] Core max is 95.
- [x] Outstanding Card bonus is separate and max 5.
- [x] Display format is `87/95 + 0/5 bonus`.
- [x] Percentage and score band use core score only.

## V1 Limitations / Future Backlog

- [ ] Request access.
- [ ] Multi-store manager support.
- [ ] Active user role/scope editing UI.
- [ ] Photo evidence upload.
- [ ] AI-generated action plans.
- [ ] AI dashboard trends/rankings.
- [ ] PDF export.
- [ ] Employee/job title/person/team analysis.
- [ ] Richer store performance reports.

## Release Readiness Checklist

- [ ] Confirm Vercel env vars are set.
- [ ] Confirm Supabase Auth Site URL and Redirect URLs.
- [ ] Run validation commands.
- [ ] Test login.
- [ ] Test start and complete audit.
- [ ] Test Audit History score display.
- [ ] Test manual action plan creation.
- [ ] Test leader own-store action plan access.
- [ ] Test Team invite manual fallback or email delivery.
- [ ] Test Accept Invite.
- [ ] Test Store Management create/edit as admin or area manager.
- [ ] Test restricted access for leader to `/team` and `/store-management`.
- [ ] Run post-deploy mobile QA on the production HTTPS URL.
