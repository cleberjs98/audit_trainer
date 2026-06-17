# Deployment Guide

This guide prepares Audit Trainer for a safe Vercel deployment.

## Vercel Deployment Steps

1. Connect the GitHub repository to Vercel.
2. Use the Vercel-detected framework preset: `Next.js`.
3. Use these commands:
   - Install command: `npm install`
   - Build command: `npm run build`
   - Output directory: default Next.js output
4. Set environment variables in Vercel before deploying.
5. Deploy from the intended production branch.
6. After deployment, copy the final HTTPS deployment URL and use it as `APP_BASE_URL`.

## Required Environment Variables

Set these in Vercel for production:

```txt
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
APP_BASE_URL=
```

`APP_BASE_URL` must be the deployed HTTPS app URL, for example:

```txt
https://your-app.vercel.app
```

Do not include a trailing slash.

## Optional Invite Email Variables

Set these only when real invitation emails are ready:

```txt
RESEND_API_KEY=
INVITE_EMAIL_FROM=
```

If these are not configured, Team Management still creates invitations and shows the one-time manual development invite link immediately after creation.

## Future Server-Only Variables

These are not required for the current deployed V1 flow:

```txt
OPENAI_API_KEY=
SUPABASE_SERVICE_ROLE_KEY=
```

Do not set `SUPABASE_SERVICE_ROLE_KEY` unless a future server-only feature requires it. Never expose it to the browser.

## Supabase Production Settings

Before production testing:

1. Confirm migrations are already applied and aligned through the latest migration.
2. In Supabase Auth settings, set Site URL to:

```txt
APP_BASE_URL
```

3. Add redirect URLs:

```txt
APP_BASE_URL/auth/callback
APP_BASE_URL/accept-invite
```

4. Keep Row Level Security enabled.
5. Do not expose the Supabase service role key in Vercel unless a server-only feature explicitly needs it.

## Post-Deploy Manual Test Checklist

Run these tests on the deployed HTTPS URL:

1. Login.
2. Start a new audit.
3. Complete a Pret CE V1 audit.
4. Confirm Audit History shows the completed score.
5. Create an action plan from a completed audit.
6. Confirm a leader can manage action plans for their own store.
7. Create a team invite with email variables disabled and confirm the manual fallback link appears once.
8. Create a team invite with Resend configured and confirm the email is sent.
9. Accept an invitation through `/accept-invite`.
10. Create and edit a store in Store Management as an allowed role.
11. Confirm leader access is restricted for `/team`.
12. Confirm leader access is restricted for `/store-management`.

## Rollback Notes

- Use Vercel rollback to return to the previous deployment if an app deployment fails.
- Do not roll back database migrations unless a specific migration is confirmed as the cause of the issue.
- If a deployment has an environment-variable issue, update Vercel environment variables and redeploy instead of changing the database.
