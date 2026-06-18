# Database Schema Plan

This document is now a current database overview. Applied migrations in `supabase/migrations/` are authoritative.

## Supabase Project

```txt
Project ref: daatfutrebgmxozclthb
URL: https://daatfutrebgmxozclthb.supabase.co
```

## Applied Migration Range

Current migration range: `001` through `013`.

## Key Enums

- `user_role`: `admin`, `area_manager`, `store_manager`, `leader`
- `audit_status`: `draft`, `in_progress`, `completed`, `archived`
- `score_band`: `excellent`, `good`, `needs_focus`, `critical`
- `action_priority`: `low`, `medium`, `high`
- `action_item_status`: `open`, `in_progress`, `completed`
- `action_plan_status`: `open`, `in_progress`, `completed`
- `invitation_status`: `pending`, `accepted`, `revoked`, `expired`

## Key Tables

- `areas`
- `stores`
- `profiles`
- `audits`
- `audit_answers`
- `checklist_sections`
- `audit_questions`
- `action_plans`
- `action_plan_items`
- `user_invitations`

`stores.code` is the official Store Number. Do not add a duplicate `store_number` column.

## Migration 013 User Access Foundation

Migration 013 added:

- `user_invitations`
- `invitation_status`
- Store operational fields.
- `stores.store_manager_id`
- Store manager assignment validation.
- Invitation RLS.
- Store Management RLS updates.
- Leader own-store action plan permissions.

RPCs:

- `assign_user_scope_v1`
- `accept_invitation_v1`
- `revoke_invitation_v1`

## Store Manager Assignment Rule

`stores.store_manager_id` is optional. If set, the referenced profile must be:

- `role = 'store_manager'`
- `profiles.store_id = stores.id`

## Pret CE V1 Scoring Data

Migration 010 added scoring metadata. Migration 011 seeded Pret CE V1 and replaced `complete_audit_v1` with scoring-model-aware behavior.

Pret CE V1:

- 19 core questions.
- 5 points each.
- Core max 95.
- Outstanding Card bonus max 5, stored separately in `section_scores`.

## RLS and Security

- RLS stays enabled.
- App pages and server actions use the authenticated Supabase client.
- Server actions still validate role/scope before writes.
- The current V1 app does not require service-role access for implemented client-facing features.
- Do not expose service-role credentials to the browser.

For a concise operational version of this file, see `docs/database.md`.
