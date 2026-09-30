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


## Law-to-product rule

Treat a legal, privacy, consumer-protection, communications, moderation, or platform-policy requirement as a product contract, not a documentation-only change.

For every requirement that applies now or is deliberately implemented for readiness, trace it through the affected layers:

```text
law / policy trigger
→ customer disclosure
→ explicit user intent or choice
→ UI state and accessibility
→ RBAC / API enforcement
→ database evidence and audit history
→ export / correction / deletion semantics
→ admin operations and deadlines
→ regression tests
```

- Do not claim compliance merely because a legal page mentions a law. The product behavior and stored evidence must match the statement.
- Separate legally distinct user intentions. For example, age attestation, acceptance of Terms, acknowledgment of a Privacy Policy, and channel-specific marketing consent must not be silently bundled into one generic consent.
- Do not collect sensitive identifiers speculatively for a law that is not yet triggered. Add collection only when the applicable product/business facts require it.
- When a requirement is conditional on geography, scale, transaction volume, advertising, profiling, or another product fact, encode that fact in the compliance registry and re-evaluate before enabling the triggering feature.
- Keep privacy-rights, moderation-redress, and incident-response records behind server-side RBAC. Public/client keys must not receive direct table access.
- If a database migration is required, apply and verify it before merging application code that depends on the new schema.
- Keep privacy exports, account deletion, retention statements, and admin workflows synchronized with every new personal-data table.
- Preserve a reasoned audit trail for material moderation, privacy-rights, and incident-response decisions without exposing reporter or counterpart private data.
- Add tests that fail when a disclosure, API contract, database field, rights flow, or operator control drifts out of sync.
