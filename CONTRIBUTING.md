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


## Authorization rule

Treat role-based access control as a default requirement for every feature.

- Define who can read, create, update, delete, or invoke each resource before implementation.
- Enforce authorization on the server or database boundary. UI visibility is never the security boundary.
- Use the canonical guest/member/admin permission model from `src/lib/access-control.ts`; do not add one-off authentication checks when a permission already exists.
- Public responses must contain only public fields. Redact protected contact, account, messaging, moderation, and administrative data before serialization.
- Require ownership in addition to authentication for user-owned resources.
- Require the admin permission for moderation and administrative resources.
- Keep public browsing separate from protected account actions such as saving, messaging, direct contact, posting, reporting, profile access, and listing management.
- When a protected feature depends on current legal acceptance, enforce that requirement at the API boundary before returning protected data or performing the mutation.
- Add regression tests for every new permission boundary and for unauthenticated access.

## Migration checklist

For database or platform-enforcement changes:

- Add or update the canonical schema and migration.
- Update TypeScript types and domain models.
- Update all readers, writers, webhook parsers, API handlers, policy guards, and admin surfaces.
- Update fixtures and tests for both old failure modes and the new contract.
- Run the complete quality gate.
- Merge the complete change as one reviewed pull request. Prefer squash merging when the branch contains incremental implementation commits.
