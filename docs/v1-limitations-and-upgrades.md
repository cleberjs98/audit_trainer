# V1 Limitations and Upgrade Plan

Audit Trainer V1 is intentionally focused on secure role-scoped operations, Pret CE V1 audits, manual action plans, controlled invitations, and a premium mobile experience.

For the full current implementation summary, see `docs/current-app-state.md`.

## Implemented V1 Scope

- Supabase Auth login.
- Auth callback with safe internal redirect handling.
- Accept Invite route backed by `accept_invitation_v1`.
- Team Management V1 with scoped invitations, pending invitations, Cancel invite, optional Resend email delivery, and manual fallback.
- Dashboard Analytics V1.
- Start Audit.
- Pret CE V1 guided checklist.
- Review & Complete.
- Audit History V2.
- Manual Action Plans V1.
- Leader own-store action plan management.
- Store Management V2.
- Mobile App Experience V1 with Graphite + Signal Crimson identity.

## Current Role Model

- `admin`: full access.
- `area_manager`: scoped to one area.
- `store_manager`: scoped to one store; can invite leaders for own store and manage own-store audits/action plans.
- `leader`: scoped to one store; can create audits and manage own-store action plans/items; cannot access Team Management or Store Management.

There is no active V1 `auditor` or generic `manager` role.

## Current Scoring Model

- 19 Pret CE V1 core questions.
- Each core question is worth 5 points.
- Core maximum score is 95.
- Outstanding Card bonus is separate and max 5.
- Display format is `87/95 + 0/5 bonus`.
- Percentage and score band are based on core score only.

## Current Design Model

- Product identity: Audit Trainer, not Pret-specific.
- Palette: Graphite + Signal Crimson.
- Mobile uses soft graphite/light gray background, raised white cards, graphite panels, and crimson primary actions.
- Primary crimson buttons always use white text.
- Mobile bottom navigation is role-aware.
- The checklist uses a circular score-colored stepper.

## Known V1 Limitations

- Request access is deferred to V2.
- Multi-store manager support is deferred to V2.
- Active user role/scope editing UI is not fully implemented in V1.
- Store manager assignment requires the target profile's `profiles.store_id` to already match the store.
- Richer store performance reports require future analytics/data-loading work.
- Photo evidence upload is not implemented in the current V1 UI.
- AI-generated action plans are not implemented.
- AI dashboard trends/rankings are not implemented.
- PDF export is not implemented.
- Employee/job title/person/team analysis is not implemented.
- Password recovery UI is still future work.

## Invitation Email Note

Invite email sending is prepared through Resend REST API and is optional.

Required email variables:

```txt
RESEND_API_KEY=
INVITE_EMAIL_FROM=
APP_BASE_URL=
```

If email is not configured or fails, the invitation is still created and the one-time manual development invite link is shown immediately after creation.

## Mobile QA Note

Local mobile testing over a LAN/IP Next.js dev server is not the source of truth. Final mobile QA must happen after deployment on the real HTTPS URL.

Post-deploy mobile test checklist:

1. Login.
2. Start New Audit.
3. Guided checklist opens at the first unanswered question.
4. Question markers navigate between questions.
5. Back works.
6. Save & Continue saves and advances.
7. Closing and reopening an audit resumes at the first unanswered question.
8. Outstanding Card accepts only 0/5.
9. Review shows core + bonus score.
10. Complete Audit locks the audit.
11. Audit History shows the completed score.
12. Team invite and Accept Invite work.
13. Store Management mobile list/profile/create/edit flow works for allowed roles.

## Security Notes

- RLS remains the final guard.
- Do not use a service role key in client components.
- Server actions must re-check auth, profile, role, and scope.
- Do not trust client-provided role, scope, store ID, ownership, or scoring metadata.
- Completed or locked audits remain read-only in the normal UI.
