# Deployment Guide

This guide prepares Audit Trainer for Vercel deployment.

## Production Targets

```txt
Production app: https://audit-trainer.vercel.app
GitHub remote: https://github.com/cleberjs98/audit_trainer.git
Supabase ref: daatfutrebgmxozclthb
Supabase URL: https://daatfutrebgmxozclthb.supabase.co
```

## Vercel Setup

1. Connect the GitHub repository to Vercel.
2. Use the Vercel-detected framework preset: `Next.js`.
3. Install command: `npm install`.
4. Build command: `npm run build`.
5. Output directory: default Next.js output.
6. Set environment variables before deploying.
7. Deploy from the intended production branch.

## Required Environment Variables

```txt
NEXT_PUBLIC_SUPABASE_URL=https://daatfutrebgmxozclthb.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=<anon public>
APP_BASE_URL=https://audit-trainer.vercel.app
```

Do not include a trailing slash in `APP_BASE_URL`.

## Optional Invitation Email Variables

```txt
RESEND_API_KEY=
INVITE_EMAIL_FROM=
```

If these are missing or invalid, Team Management still creates invitations and shows a one-time manual fallback link immediately after invite creation.

## Future Server-Only Variables

These are not required for current V1 client-facing features:

```txt
# OPENAI_API_KEY=
# SUPABASE_SERVICE_ROLE_KEY=
```

Do not expose a Supabase service role key to the browser. Do not set it unless a future server-only feature explicitly requires it and the code path has been reviewed.

## Supabase Production Settings

Confirm migrations are applied and aligned through `013`.

In Supabase Auth settings:

```txt
Site URL: https://audit-trainer.vercel.app
Redirect URLs:
  https://audit-trainer.vercel.app/auth/callback
  https://audit-trainer.vercel.app/accept-invite
```

Keep RLS enabled.

## Validation Commands

On Windows PowerShell, prefer:

```bash
cmd /c npm run lint
cmd /c npm run typecheck
cmd /c npm run build
```

## Post-Deploy Manual Test Checklist

1. Login.
2. Start a new audit.
3. Complete a Pret CE V1 audit.
4. Confirm Audit History shows `core/max + bonus/max bonus`.
5. Create an action plan from a completed audit.
6. Confirm a leader can manage own-store action plans and items.
7. Create a team invite with email variables disabled and confirm manual fallback appears once.
8. Create a team invite with Resend configured and confirm the email is sent.
9. Accept an invitation through `/accept-invite`.
10. Create and edit a store as `admin` or `area_manager`.
11. Confirm leaders cannot access `/team`.
12. Confirm leaders and store managers cannot access `/store-management`.
13. Confirm mobile bottom navigation is role-aware.

## Rollback Notes

- Use Vercel rollback to return to a previous deployment if an app deployment fails.
- Do not roll back database migrations unless a specific migration is confirmed as the cause.
- If the issue is environment configuration, update Vercel environment variables and redeploy.
