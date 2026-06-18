# Database and Supabase State

Supabase project:

```txt
Project ref: daatfutrebgmxozclthb
URL: https://daatfutrebgmxozclthb.supabase.co
```

Applied migrations currently run from `001` through `013`.

## Current Migration Highlights

- `001_initial_schema.sql`: core tables, enums, RLS foundations, and initial triggers.
- `003_seed_initial_data.sql`: starter reference data.
- `004` and `005`: Start Audit and checklist answer write policies.
- `006_complete_audit_v1_rpc.sql`: completion RPC for audits.
- `010_pret_scoring_schema.sql`: scoring metadata columns.
- `011_pret_checklist_seed_and_rpc.sql`: Pret CE V1 checklist seed and scoring-aware completion behavior.
- `012_manual_action_plans_v1.sql`: scoped manual action plan writes and item completion trigger.
- `013_user_access_management_v1.sql`: User & Access Management V1 foundation.

## Migration 013 Foundation

Migration 013 adds:

- `invitation_status` enum.
- `public.user_invitations`.
- Store operational detail columns.
- `stores.store_manager_id`.
- Store manager assignment validation trigger.
- Invitation accept/revoke RPCs.
- User scope assignment RPC.
- RLS for invitations.
- Store Management RLS updates.
- Leader own-store action plan permissions.

RPCs added or updated:

- `assign_user_scope_v1(target_profile_id uuid, target_role public.user_role, target_area_id uuid, target_store_id uuid)`
- `accept_invitation_v1(raw_token text)`
- `revoke_invitation_v1(invitation_id uuid)`

## Key Tables

- `profiles`: one role and one scope per user.
- `areas`: area records.
- `stores`: store records; `code` is the official Store Number.
- `audits`: audit header and persisted completed score.
- `audit_answers`: saved checklist answers.
- `checklist_sections` and `audit_questions`: active checklist reference data.
- `action_plans` and `action_plan_items`: manual V1 action plans.
- `user_invitations`: scoped controlled invitations.

## Security Rules

- RLS must remain enabled.
- Use the normal authenticated Supabase client for app pages and server actions.
- Never use a Supabase service role key in client components.
- The current V1 app does not require a service role key for implemented client-facing features.
- Raw invitation tokens are generated once and never stored.
- `token_hash` is never rendered.

## Store Manager Assignment

`stores.store_manager_id` is optional. When present, it must reference a profile where:

- `profiles.role = 'store_manager'`
- `profiles.store_id = stores.id`

For new stores, invite or assign the store manager first, then set `stores.store_manager_id` after the profile exists with the matching store scope.
