# Permissions Matrix

Audit Trainer uses one role and one scope per profile.

| Role | Scope source | Dashboard | Audits | Action plans | Team Management | Store Management |
| --- | --- | --- | --- | --- | --- | --- |
| `admin` | No `area_id` or `store_id` | All data | All stores | All stores | Invite all roles, view/cancel all pending invitations | Create/edit all stores and assign store managers |
| `area_manager` | `profiles.area_id` | Own area | Own-area stores | Own-area stores | Invite/cancel `store_manager` and `leader` invites for own-area stores | Create/edit stores in own area and assign eligible store managers |
| `store_manager` | `profiles.store_id` | Own store | Own store | Own store | Invite/cancel `leader` invites for own store | No access |
| `leader` | `profiles.store_id` | Own store | Own store | Own store | No access | No access |

## Role Details

### Admin

- Full access across all areas and stores.
- Can manage stores.
- Can manage team invitations.
- Can invite `admin`, `area_manager`, `store_manager`, and `leader`.
- Can access audits, action plans, and dashboard analytics.

### Area Manager

- Scoped to one area through `profiles.area_id`.
- Can manage stores inside the assigned area.
- Can invite `store_manager` and `leader` for stores inside the assigned area.
- Can assign store managers to own-area stores when the profile is already scoped to that store.
- Can access audits, action plans, and dashboard analytics for own area.
- Cannot invite or assign `admin` or `area_manager`.
- Cannot access another area.

### Store Manager

- Scoped to one store through `profiles.store_id`.
- Can access own-store dashboard, audits, action plans, and team invitations.
- Can invite leaders for own store.
- Cannot access Store Management.
- Cannot alter active user role/scope in V1.

### Leader

- Scoped to one store through `profiles.store_id`.
- Can create audits for own store.
- Can create and manage action plans and action plan items for own store.
- Cannot access Team Management.
- Cannot access Store Management.
- Cannot invite users.

## Security Rules

- RLS remains the final guard.
- Server actions must re-check auth, profile, role, and scope.
- Client-provided role, scope, store ID, score metadata, and ownership are never trusted.
- Completed or locked audits are read-only in the normal UI.
- No client component may use the Supabase service role key.
