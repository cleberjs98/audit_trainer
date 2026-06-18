# Implement Phase Prompt

Implement only the requested Audit Trainer phase/subphase.

Before coding:

1. Read `docs/current-app-state.md`.
2. Read `docs/permissions.md`.
3. Read `docs/scoring.md`.
4. Read `docs/mobile-ux.md` if the task touches UI.
5. Read `docs/database.md` if the task touches Supabase, RLS, schema, or server actions.
6. Identify files to create or modify.
7. Explain the implementation plan briefly when useful.

During coding:

- Do not add extra features.
- Keep app UI in English.
- Keep reports in English.
- Use TypeScript and Tailwind.
- Respect Supabase RLS and role/scope rules.
- Preserve Pret CE V1 scoring.
- Do not expose secrets.
- Do not use service role in client components.
- Do not edit completed audit behavior unless explicitly requested.
- Keep implementation small and focused.

After coding:

1. Remove unused imports.
2. Remove duplicated code.
3. Remove temporary code.
4. Remove unnecessary console logs.
5. Run validation:

```bash
cmd /c npm run lint
cmd /c npm run typecheck
cmd /c npm run build
```

6. Summarize files changed.
7. List risks or issues.
8. Suggest commit message.
