# Synara Codex Context

Use this file as the compact technical context for coding-agent work in this repository.

## 1. What Synara Is

Synara is an AI-assisted adaptive learning workspace. A learner creates a course from a learning goal, receives an AI-generated roadmap, studies generated node lessons, asks a contextual tutor for help, and validates understanding through Socratic dialogue.

The current adaptive loop can detect repeated stumbling/frustration and has a backend recalibration mutation that replaces unfinished roadmap nodes while preserving completed ones. The learner UI does not yet invoke that mutation.

## 2. Read Order

Before a non-trivial change, use this order:

1. `AGENTS.md` — repository rules and invariants.
2. `CODEX_CONTEXT.md` — this compact orientation.
3. `IMPLEMENTATION_STATUS.md` — what is actually implemented.
4. `ARCHITECTURE.md` — detailed technical flow.
5. `PRD.md` — intended product behavior and open decisions.
6. `STYLE_GUIDE.md` — UI/code conventions.
7. `document.md` — historical/aspirational context only.

When documentation disagrees with executable code, current code and migrations win.

## 3. Stack

- Bun + Turborepo monorepo
- Next.js 16 App Router
- React 19
- TypeScript
- Tailwind CSS 4
- shadcn/ui shared primitives
- tRPC 11
- TanStack React Query
- Better Auth
- Drizzle ORM
- PostgreSQL
- Gemini through `@google/generative-ai`
- Zod for runtime validation

## 4. Repository Map

```text
apps/web
  Main Next.js product UI and route handlers.

packages/api
  tRPC routers, protected procedures, AI services, roadmap business logic.

packages/auth
  Better Auth configuration.

packages/db
  Drizzle database client, schema, and migrations.

packages/env
  Validated environment variables.

packages/ui
  Shared shadcn/ui primitives and global design tokens.

packages/config
  Shared TypeScript/configuration.
```

Do not move product-specific components into `packages/ui` merely to reduce local file count. Shared UI should be genuinely reusable.

## 5. Core Procedures

### `learning`

- `create` — five-answer onboarding -> roadmap; allows draft fallback when AI generation fails.
- `generate` — direct goal -> roadmap; generation failure is surfaced.
- `list` / `getDashboard` — learner roadmaps.
- `getById` — learner-owned roadmap with ordered nodes.
- `getNodeContent` — lazy generate and persist lesson content.
- `getTutorSession` — persisted tutor history.
- `askTutor` — contextual AI tutor with persisted history.
- `finishNode` — manual completion.
- `reopenNode` — reopen completed node.
- `recalibrate` — replace incomplete nodes when roadmap is `needs_recalibration`.

### `validation`

- `getSocraticSession` — persisted validation state.
- `submitSocratic` — AI response + competency/stumble/sentiment signals.

Current validation behavior:

- competency >= 80 -> node completes;
- cumulative stumble count > 3 OR latest sentiment < 0.3 -> roadmap becomes `needs_recalibration`.

## 6. Core Database Tables

Active in core flows:

- Better Auth tables
- `learning_roadmaps`
- `roadmap_nodes`
- `tutor_sessions`
- `socratic_sessions`

Existing but not wired into active business flows:

- `user_cognitive_profiles`
- `learning_logs`
- `micro_artifacts`

Do not assume a table is an implemented product feature simply because its schema exists.

## 7. Important Invariants

### Ownership

Every learner-owned read/write must be constrained by the authenticated user where applicable. Do not weaken current user-ID filtering.

### Original goal preservation

Recalibration may change unfinished path nodes but must not silently replace the learner's original learning goal.

### Completed node preservation

Recalibration must preserve completed nodes and replace only unfinished work unless a product requirement explicitly changes this behavior.

### Tutor != Validator

Tutor guidance and Socratic validation are deliberately separate responsibilities.

The tutor must not:

- grade the learner;
- expose or invent competency scores;
- claim that progress changed automatically.

### AI output is untrusted input

Structured Gemini output must be runtime-validated before persistence/use. Do not rely on TypeScript types alone.

### Persist generated lesson content

Do not regenerate a node lesson on every visit. The current design lazily generates once and persists the result.

### Multi-record mutations

Use transactions when a business action mutates multiple related records, especially roadmap recalibration/completion flows.

## 8. Known Traps

### Historical architecture terminology

`document.md` refers to oRPC, Supabase RLS, richer cognitive profiles, and complete micro-artifact verification. The actual current implementation uses tRPC and does not evidence those full capabilities.

### Recalibration is not end-to-end complete

The backend mutation exists. `course-workspace.tsx` currently only warns when recalibration is required; it does not call `learning.recalibrate`.

### Manual completion bypasses validation

The UI has `Finish manually`, and `learning.finishNode` directly completes a node. Do not describe the current system as validation-only unless this behavior is changed.

### Cognitive data is not active

`user_cognitive_profiles` and `learning_logs` exist but are not currently used by generation/recalibration logic.

### Artifact verification is not active

`micro_artifacts` exists but has no active submission/review product flow.

### RLS is not proven

Application-level auth/ownership filtering exists. Do not claim repository-implemented PostgreSQL/Supabase RLS unless explicit policies and verification are added.

### Historical naming remains

The canonical product name is **Synara**, but code/package names such as `@gemastik/*` and prompt text such as `Gradio Engine` remain. Do not perform broad renames unless explicitly requested; they can have wide import/config impact.

## 9. Current UI Conventions

- Product UI copy is predominantly English.
- Use shared primitives from `@gemastik/ui`.
- Theme tokens live in `packages/ui/src/styles/globals.css`.
- Square/flat visual language: base radius is `0rem`.
- Primary accent is violet/purple through semantic tokens.
- Plus Jakarta Sans is the primary UI font.
- Support light/dark theme tokens.
- Prefer semantic theme classes over hard-coded colors.
- Course creation uses a bottom drawer on mobile and right drawer on larger screens.
- Course workspace uses a three-column large-screen layout.

See `STYLE_GUIDE.md` before visual changes.

## 10. AI Integration Rules

Current AI responsibilities:

1. initial roadmap generation;
2. replacement-roadmap generation;
3. node lesson generation;
4. tutor response generation;
5. Socratic validation/scoring/sentiment signal extraction.

For structured output:

- demand a small explicit schema in the prompt;
- parse centrally through the AI service;
- validate domain shape with Zod at the boundary;
- handle invalid JSON/provider errors as normal failure modes;
- never persist malformed output merely to keep the flow moving.

Do not send unnecessary user history to Gemini. Add context only when the feature demonstrably uses it.

## 11. Environment

Required server values:

```text
DATABASE_URL
GEMINI_API_KEY
BETTER_AUTH_SECRET
BETTER_AUTH_URL
CORS_ORIGIN
```

`NODE_ENV` defaults to development.

Never commit real credentials or paste secret values into docs, fixtures, prompts, tests, or logs.

## 12. Common Commands

```bash
bun install
bun run dev
bun run dev:web
bun run check-types
bun run build
bun run db:push
bun run db:generate
bun run db:migrate
bun run db:studio
```

Prefer the smallest relevant verification command first, then broaden when the change crosses package boundaries.

## 13. Change Checklist

For any meaningful code change:

1. Identify the owning layer instead of patching around it in the UI.
2. Preserve auth and ownership constraints.
3. Validate external/AI input.
4. Keep database mutations internally consistent.
5. Handle loading/error/empty states in user-facing flows.
6. Avoid unrelated refactors or historical-name cleanup.
7. Run type checks; run a production build for substantial cross-package changes when practical.
8. If feature state materially changes, update `IMPLEMENTATION_STATUS.md`.
9. If architecture or product behavior changes, update the corresponding documentation.

## 14. High-Value Next Work

Unless the active task says otherwise, the largest current product gaps are:

1. connect the learner UI to backend recalibration;
2. decide whether manual completion remains valid;
3. align recalibration UX, copy, and status handling;
4. only then expand long-term cognitive profiling/logging if it remains in scope.

Do not automatically implement these when assigned an unrelated task; they are context, not standing authorization for scope expansion.