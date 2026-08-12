# AGENTS.md — Synara Repository Instructions

These instructions apply to coding agents working anywhere in this repository unless a more specific instruction file explicitly overrides them for a narrower path.

## 1. Source of Truth

Before making a non-trivial change, read:

1. `CODEX_CONTEXT.md`
2. `IMPLEMENTATION_STATUS.md`
3. the relevant code
4. `ARCHITECTURE.md` when the change crosses layers
5. `PRD.md` when behavior/product intent matters
6. `STYLE_GUIDE.md` for UI or code-style work

`document.md` is historical/aspirational context. It is not proof that a capability exists.

When documentation conflicts with executable code or migrations, current code and migrations are authoritative. If the mismatch is material, fix the relevant documentation as part of the same change when appropriate.

## 2. Product Identity

The canonical product name is **Synara**.

Historical implementation names such as `gemastik`, `gemastik-roadmap`, `@gemastik/*`, and `Gradio Engine` still exist. Do not perform broad naming migrations unless the task explicitly calls for them. Package/import renames have wide blast radius and should be handled intentionally.

## 3. Scope Discipline

- Make the smallest coherent change that satisfies the task.
- Do not opportunistically rewrite unrelated code.
- Do not add a new dependency when the existing stack already solves the problem adequately.
- Do not convert architecture patterns solely for stylistic preference.
- Do not implement aspirational features from `document.md` unless they are in the requested scope.
- Do not edit installed reference skills under `.agents/skills/*` as part of ordinary product work.
- Preserve existing working behavior unless the requested change intentionally replaces it.

## 4. Layer Ownership

### `apps/web`

Owns:

- Next.js routes;
- product-specific page composition;
- product-specific components;
- browser interaction/state;
- tRPC client usage;
- loading/error/empty UX.

Do not place backend authorization or durable business rules only in the frontend.

### `packages/api`

Owns:

- tRPC procedures;
- authorization-aware business operations;
- roadmap/validation orchestration;
- Gemini integration services;
- domain-level runtime validation.

Business rules that must not be bypassed by a client belong here rather than only in React handlers.

### `packages/db`

Owns:

- Drizzle schemas;
- database relations;
- migrations;
- DB client creation.

Keep TypeScript field naming idiomatic to the existing schema while mapping to snake_case database columns.

### `packages/auth`

Owns Better Auth configuration. Avoid duplicating session/auth configuration elsewhere.

### `packages/env`

Owns validated environment configuration. New server environment variables must be declared here rather than read ad hoc throughout the codebase.

### `packages/ui`

Owns genuinely reusable UI primitives, theme tokens, and global styles. Product-specific course/dashboard components belong in `apps/web` unless they become broadly reusable.

## 5. Authentication and Ownership Rules

All learner-owned data operations must preserve authenticated ownership checks.

For protected tRPC procedures:

- use `protectedProcedure` for authenticated product operations;
- constrain roadmap/node/session queries by `ctx.user.id` where ownership applies;
- do not trust a `userId` supplied by the client when the authenticated user already provides the identity;
- do not weaken an existing ownership predicate to simplify a query;
- verify related-resource ownership before mutating child records.

Application-level ownership filtering is currently part of the real security model. Do not claim database RLS exists unless actual policies are implemented and verified.

## 6. Database Change Rules

- Prefer schema definitions in `packages/db/src/schema/*` as the model source.
- Use foreign keys and cascade behavior deliberately; do not change deletion semantics casually.
- Use transactions for multi-step mutations that must remain consistent.
- Preserve completed roadmap nodes during recalibration unless product requirements explicitly change that invariant.
- Validate state transitions before destructive operations.
- If a schema change requires a migration, generate and inspect the migration rather than hand-editing migration metadata casually.
- Do not create unused tables/columns merely because they appear in `document.md`.

## 7. AI Integration Rules

Gemini output is external, untrusted input.

### Structured output

For AI output consumed programmatically:

1. make the requested JSON schema explicit in the prompt;
2. use the centralized AI service;
3. parse provider output defensively;
4. validate the domain shape with Zod before persistence or business decisions;
5. surface an understandable failure instead of persisting malformed fallback data.

### Prompt scope

- Include only context required for the current task.
- Do not send secrets or unrelated learner history.
- Keep Tutor and Validator responsibilities separate.
- The Tutor should help and explain; it should not grade or claim progress updates.
- The Validator may produce competency/stumble/sentiment signals according to the validation contract.
- Recalibration must preserve the learner's original goal unless an explicit product change says otherwise.

### Provider failure handling

Treat rate limits, provider outages, safety blocks, and invalid structured output as expected integration failures. Do not hide them behind fake successful results.

## 8. Current Adaptive-System Boundaries

Agents must know the difference between current behavior and future design:

- Socratic validation is implemented.
- Recalibration trigger logic is implemented.
- Backend replacement-path recalibration is implemented.
- Learner-facing invocation of recalibration is currently incomplete.
- `user_cognitive_profiles` is schema-only.
- `learning_logs` is schema-only.
- `micro_artifacts` is schema-only.
- curated external learning-source retrieval is not implemented.
- repository-owned RLS policies are not evidenced.

Do not silently wire these dormant schemas into production flows as a side effect of unrelated work.

## 9. Completion Semantics

Two completion paths currently exist:

1. Socratic competency >= 80 automatically completes a node.
2. `learning.finishNode` allows manual completion.

This is a known product decision gap. Do not remove or further entrench manual completion unless the task resolves that decision. When changing related UI/copy, avoid claiming that validation is the only completion path while manual completion still exists.

## 10. Frontend Data Rules

- Use tRPC + TanStack React Query patterns already established in the app.
- Prefer server state in query cache rather than duplicating it in local React state.
- Invalidate or update the narrowest relevant query keys after mutations.
- Keep mutations resilient to failed AI/network calls; restore user input when useful.
- Represent pending, empty, success, and error states explicitly.
- Do not optimistically claim completion/recalibration before the server confirms it.
- Preserve responsive behavior when changing course creation or workspace layouts.

## 11. UI and Design Rules

Follow `STYLE_GUIDE.md`. Core defaults:

- reuse `@gemastik/ui` primitives;
- use semantic theme tokens instead of arbitrary hard-coded colors;
- preserve the square/flat visual language (`--radius: 0rem`) unless a deliberate redesign is requested;
- keep Plus Jakarta Sans as the primary UI typography;
- preserve light/dark compatibility;
- product UI copy should remain English unless localization work is explicitly scoped;
- maintain keyboard/focus/accessibility behavior when composing primitives.

Do not copy a shadcn example wholesale when a smaller composition of existing primitives is sufficient.

## 12. TypeScript and Code Quality

- Prefer explicit domain types or inferred Zod/Drizzle types over broad `any`.
- Do not expand existing `any` usage without necessity.
- Keep functions focused enough that business intent remains inspectable.
- Extract shared logic when there is actual duplication or a clear domain boundary, not merely to reduce line count.
- Preserve local formatting conventions; avoid mass-formatting unrelated files.
- Do not suppress TypeScript errors with assertions unless the underlying runtime invariant is genuinely established.
- Prefer readable control flow over clever one-liners for stateful business logic.

## 13. Error Handling

User-facing failures should be actionable and should not leak secrets/provider internals.

- Convert known provider failures to useful application messages at the service boundary.
- Keep diagnostic provider details in server logs where appropriate.
- Never log API keys, auth secrets, session tokens, or raw credential data.
- Avoid catch blocks that silently convert a failed write into success.
- Draft fallback is intentionally supported only where the product flow explicitly allows it.

## 14. Verification

For code changes, run the narrowest relevant checks and broaden based on impact.

Common commands:

```bash
bun run check-types
bun run build
bun run dev:web
bun run db:generate
bun run db:migrate
```

Expected verification by change type:

### UI-only

- type check;
- manually inspect affected responsive/loading/error states when possible.

### API/business logic

- type check;
- verify authorization and ownership predicates;
- verify success and failure state transitions;
- build when the change crosses package boundaries.

### Database

- inspect generated schema/migration changes;
- verify related API assumptions;
- test destructive/cascade behavior deliberately.

### AI flows

- verify valid structured output;
- verify malformed/provider-failure behavior;
- verify no progress/database claim occurs before validated server success.

If the repository lacks automated coverage for the changed behavior, state that clearly rather than implying checks exist.

## 15. Documentation Maintenance

Update documentation when the implementation meaningfully changes:

- feature state -> `IMPLEMENTATION_STATUS.md`
- architecture/data flow -> `ARCHITECTURE.md`
- product behavior/requirements -> `PRD.md`
- recurring agent context/invariants -> `CODEX_CONTEXT.md` or this file
- visual/code conventions -> `STYLE_GUIDE.md`

Do not make documentation aspirational. A schema, mock, or TODO alone does not qualify a capability as implemented.

## 16. Secrets and Generated Files

- Never commit `.env` secrets.
- Never place real credentials in examples, tests, docs, screenshots, logs, or prompts.
- Do not edit lockfiles unless dependencies actually change.
- Do not modify generated/configured skill directories for normal feature work.
- Avoid committing transient build artifacts.

## 17. Before Finishing a Task

Check that:

- the requested behavior is actually implemented, not merely scaffolded;
- auth/ownership remains intact;
- AI output is validated where applicable;
- state-changing multi-step logic remains consistent;
- UI states match server truth;
- unrelated code was not changed;
- relevant checks were run;
- documentation status is still accurate.
