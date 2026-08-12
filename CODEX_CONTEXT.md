# Synara Codex Context

Use this file as the compact technical context for coding-agent work in this repository.

## 1. What Synara Is

Synara is an AI-assisted adaptive learning workspace. A learner creates a course from a learning goal, receives an AI-generated roadmap, studies generated node lessons, asks a contextual tutor for help, and validates understanding through Socratic dialogue.

The current adaptive loop calculates a deterministic Stagnation Score from behavioral signals, marks eligible roadmaps `needs_recalibration`, and automatically invokes the existing recalibration mutation from the learner workspace. Recalibration preserves completed work, transactionally replaces the unfinished path, records a compact history log, and selects the new current node.

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
- `getById` — learner-owned roadmap with ordered nodes and derived progression state.
- `getNodeContent` — lazy generate and persist lesson content for an accessible node.
- `getTutorSession` — persisted tutor history.
- `askTutor` — contextual AI tutor with persisted history for an accessible node.
- `finishNode` — legacy manual-completion mutation; no normal learner UI entry point.
- `reopenNode` — legacy reopen mutation; no normal learner UI entry point.
- `recalibrate` — atomically claim a `needs_recalibration` roadmap, generate a bounded replacement path, transactionally replace incomplete nodes, record the adaptation, and return the new current node.

### `validation`

- `getSocraticSession` — persisted validation state.
- `submitSocratic` — AI response, mastery decision, behavioral-metric persistence, and deterministic Stagnation Score evaluation.

Current validation behavior:

- competency >= 80 -> node completes;
- completion exposes the next incomplete node according to `orderIndex`;
- failed attempts, active-time ratios, Tutor learner turns, backtracks, and effort 1-9 feed the deterministic Stagnation Score;
- repeated Socratic failure, two consecutive time ratios above 2.0, or score >= 70 marks the roadmap `needs_recalibration` when the current attempt did not pass.

## 6. Core Database Tables

Active in core flows:

- Better Auth tables
- `learning_roadmaps`
- `roadmap_nodes`
- `tutor_sessions`
- `socratic_sessions`
- `learning_logs`
- `recalibration_logs`

Existing but not wired into active business flows:

- `user_cognitive_profiles`
- `micro_artifacts`

Do not assume a table is an implemented product feature simply because its schema exists.

## 7. Important Invariants

### Ownership

Every learner-owned read/write must be constrained by the authenticated user where applicable. Do not weaken current user-ID filtering.

### Original goal preservation

Recalibration may change unfinished path nodes but must not silently replace the learner's original learning goal.

### Completed node preservation

Recalibration must preserve completed nodes and replace only unfinished work unless a product requirement explicitly changes this behavior.

### Linear mastery progression

Roadmap prerequisites are currently linear by `orderIndex`. Completed nodes remain accessible for review, the first incomplete node is current and accessible, and later incomplete nodes are locked. This state is derived from node order and completion rather than stored in a database column. Learner-facing node procedures must enforce the same access rule on the server.

### Deterministic stagnation eligibility

The current incomplete node accumulates one `learning_logs` row per learner + node. The server calculates Stagnation Score from Socratic failures, per-attempt active-time ratios, Tutor learner turns derived from persistent Tutor history, backtracks, and the latest 1-9 effort report. AI stumble and sentiment values remain historical telemetry and are not authoritative recalibration triggers. Passing mastery on the current attempt takes precedence over stagnation eligibility.

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

### Adaptive state machine

Automatic adaptation follows `active -> needs_recalibration -> recalibrating -> active`. Only the server can claim the transition into `recalibrating`. AI generation and validation happen before destructive replacement; deletion, replacement inserts, the recalibration log, metadata update, and return to `active` happen in one short transaction. A handled generation/database failure restores `needs_recalibration` for retry.

## 8. Known Traps

### Historical architecture terminology

`document.md` refers to oRPC, Supabase RLS, richer cognitive profiles, and complete micro-artifact verification. The actual current implementation uses tRPC and does not evidence those full capabilities.

### Recalibration history scope

Replacing an incomplete node cascades its aggregate `learning_logs`, Tutor session, and Socratic session. `recalibration_logs` preserves the trigger score/level/reasons and old/replacement node-title snapshots; this is intentionally not full event sourcing.

### Legacy completion mutations remain

The normal learner UI completes nodes only through Socratic Validation and no longer exposes `Finish manually` or `Reopen step`. The `learning.finishNode` and `learning.reopenNode` procedures remain temporarily for compatibility, are protected by the linear node-access rule, and should not be treated as normal learner flows.

### Cognitive profile data is not active

`user_cognitive_profiles` remains schema-only. `learning_logs` is active only for the Phase 2 deterministic Stagnation Score; it does not implement long-term cognitive-profile adaptation.

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

1. decide whether the legacy manual completion/reopen mutations can be removed entirely;
2. add database-backed integration coverage around AI and transaction failures;
3. only then expand long-term cognitive profiling/logging if it remains in scope.

Do not automatically implement these when assigned an unrelated task; they are context, not standing authorization for scope expansion.
