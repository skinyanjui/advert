# Contributing

## Production change rule

Treat changes that alter a shared schema, domain model, API contract, persistence shape, or enforcement policy as one atomic production change.

For a schema or contract migration, update every affected layer in the same pull request:

```text
store schema → types → policy engine → send guard → webhook parser → persistence → admin UI → tests → migration → build
```

Do not merge an intermediate state in which producers and consumers use different field names, exports, function signatures, or persistence contracts.

Before merging to `main`, the complete quality gate must pass:

```bash
npm run lint
npm run typecheck
npm test
npm run build:app
```

`npm run build` runs the same gate as a single command and is the command Vercel uses for production builds. A failed lint, typecheck, test, or application build therefore prevents Vercel from producing a successful production artifact.

## Migration checklist

For database or platform-enforcement changes:

- Add or update the canonical schema and migration.
- Update TypeScript types and domain models.
- Update all readers, writers, webhook parsers, API handlers, policy guards, and admin surfaces.
- Update fixtures and tests for both old failure modes and the new contract.
- Run the complete quality gate.
- Merge the complete change as one reviewed pull request. Prefer squash merging when the branch contains incremental implementation commits.
