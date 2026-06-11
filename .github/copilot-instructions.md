# Copilot Instructions — Store Audit Trainer

You are working on the Store Audit Trainer app.

Before implementing any feature, always read the project documentation in this order:

1. docs/app-bible.md
2. docs/engineering.md
3. docs/implementation-phases.md
4. docs/implementation-checklist.md
5. docs/ui-ux-design-system.md

## Core Rules

- The app interface must be in English.
- All generated reports must be in English.
- Documentation can be in Portuguese.
- The app is a mobile-first PWA.
- Stack: Next.js, TypeScript, Tailwind CSS, Supabase, OpenAI API.
- Use Next.js App Router.
- Use TypeScript.
- Use Tailwind CSS.
- Do not change the stack without approval.
- Do not add features outside the approved scope.
- Do not expose OpenAI API keys in frontend code.
- Do not expose Supabase Service Role keys in frontend code.
- Do not disable Supabase RLS.
- Do not allow users to access data outside their role permissions.
- Do not allow completed audits to be edited by regular users.
- Follow the implementation checklist phase by phase.
- Implement only one phase or subphase at a time.
- At the end of every phase, clean the code and run validation.

## Required Validation

At the end of each phase or subphase, run:

```bash
npm run lint
npm run typecheck
npm run build
```

If a command does not exist, create it before continuing.

## Project Roles

The app supports:

- Admin: full access to everything.
- Area Manager: access to stores in their assigned area.
- Store Manager: access to reports, audits and action plans for their own store.
- Leader: access to audits from their own store for learning and comparison.

## UI Rules

- Product name displayed in the app: Audit Trainer.
- Full project/product name: Store Audit Trainer.
- Visual style: modern internal SaaS.
- Identity: internal operational app for now.
- Background: light cream.
- Primary color: elegant burgundy.
- Cards: soft cream/white cards with subtle beige borders.
- Text: black primary text and warm-gray secondary text.
- Status colors: green, amber and red.
- Layout must be mobile-first.
- Checklist must show one section at a time.
- Inside each section, all questions must appear as open cards.
- Score must display both points and percentage, for example: 76/95 · 80%.
- Reports should be action-plan focused.

## AI Rules

- AI output must be in English.
- AI must not invent facts.
- AI must use only audit data, scores, comments, photo captions and historical data when available.
- AI API calls must happen only on the backend.
- Never call OpenAI directly from the browser.

## Implementation Discipline

Do not build the whole app at once.

For every task:

1. Read the relevant docs.
2. Identify the current phase.
3. Implement only the requested subphase.
4. Clean duplicated code.
5. Remove unused imports.
6. Remove unnecessary console logs.
7. Validate with lint, typecheck and build.
8. Summarize what changed.
9. List risks or issues.
10. Suggest the next subphase.
11. Suggest a commit message.

## Non-Negotiable Rules

- App UI must be in English.
- Reports must be in English.
- API keys must not be exposed.
- RLS must not be disabled.
- Role-based access must be respected.
- Completed audits must be locked by default.
- Do not add unapproved features.
- Do not skip phase validation.