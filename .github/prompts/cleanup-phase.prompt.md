# Cleanup Phase Prompt

Clean the current phase implementation.

Check:

- Unused imports
- Dead code
- Duplicated logic
- Unnecessary console logs
- TypeScript errors
- Broken imports
- Inconsistent naming
- UI text not in English
- Report text not in English
- Secrets exposed in frontend
- RLS bypasses
- Completed audit editing loopholes
- Unapproved feature creep
- Placeholder code that should not remain

Run:

```bash
npm run lint
npm run typecheck
npm run build
```

Return:

1. What was cleaned
2. Remaining warnings
3. Whether the phase is safe to commit
4. Suggested commit message