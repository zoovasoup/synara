# Synara

Synara is an AI-assisted adaptive learning workspace that turns a learner's goal into a structured roadmap, generates focused lessons for each step, provides contextual tutoring, and validates understanding through Socratic dialogue.

Rather than acting as an open-ended AI chat, Synara keeps assistance grounded in a persistent learning path with visible progress and explicit success criteria.

## Current MVP

The current application supports:

- email/password authentication;
- an authenticated learner dashboard;
- a guided five-step course onboarding flow;
- Gemini-assisted roadmap generation;
- persistent roadmaps and progress;
- lazy AI lesson generation that is stored per roadmap node;
- contextual tutor chat with persistent node-level history;
- Socratic validation with competency, stumble, and sentiment signals;
- automatic node completion when competency reaches the current passing threshold;
- detection of repeated learning blockage/frustration; and
- backend roadmap recalibration that preserves completed nodes and replaces unfinished ones.

### Current adaptive-loop limitation

Recalibration is **not yet complete end to end**. The backend mutation exists and the course workspace can detect when recalibration is required, but the learner UI currently only shows a warning and does not invoke the recalibration mutation.

Long-term cognitive profiles, learning logs, and micro-artifact records also have database schemas but are not yet wired into active product flows.

For an exact feature audit, see [`IMPLEMENTATION_STATUS.md`](./IMPLEMENTATION_STATUS.md).

## Learning Flow

```text
Sign up / sign in
  -> Create course
  -> Generate roadmap
  -> Open a roadmap node
  -> Generate/persist lesson content
  -> Ask the contextual tutor
  -> Run Socratic validation
  -> Complete node at competency >= 80
  -> Detect blockage/frustration when applicable
  -> Recalibrate unfinished path (backend available; UI integration pending)
```

## Tech Stack

- **Runtime / package manager:** Bun
- **Monorepo:** Turborepo
- **Web:** Next.js 16, React 19
- **API:** tRPC 11
- **Server state:** TanStack React Query
- **Authentication:** Better Auth
- **Database:** PostgreSQL + Drizzle ORM
- **AI:** Google Gemini
- **Runtime validation:** Zod
- **UI:** Tailwind CSS 4 + shared shadcn/ui primitives

## Repository Structure

```text
synara/
├── apps/
│   └── web/                 # Next.js product application
├── packages/
│   ├── api/                 # tRPC routers and AI/business services
│   ├── auth/                # Better Auth configuration
│   ├── db/                  # Drizzle schema, migrations, database client
│   ├── env/                 # Validated environment configuration
│   ├── config/              # Shared configuration
│   └── ui/                  # Shared shadcn/ui primitives and theme
├── PRD.md
├── ARCHITECTURE.md
├── IMPLEMENTATION_STATUS.md
├── CODEX_CONTEXT.md
├── AGENTS.md
├── STYLE_GUIDE.md
└── document.md              # Historical / aspirational design context
```

## Documentation

| Document | Purpose |
| --- | --- |
| [`PRD.md`](./PRD.md) | Product requirements, user journey, requirements, non-goals, and open decisions |
| [`ARCHITECTURE.md`](./ARCHITECTURE.md) | Runtime architecture, data flows, schemas, auth, and AI integration |
| [`IMPLEMENTATION_STATUS.md`](./IMPLEMENTATION_STATUS.md) | Strict audit of implemented, partial, schema-only, and unverified capabilities |
| [`CODEX_CONTEXT.md`](./CODEX_CONTEXT.md) | Compact technical context for Codex and other coding agents |
| [`AGENTS.md`](./AGENTS.md) | Repository-wide rules and invariants for coding agents |
| [`STYLE_GUIDE.md`](./STYLE_GUIDE.md) | Product copy, UI, TypeScript, API, database, and AI-prompt conventions |
| [`document.md`](./document.md) | Earlier Adaptive Efficiency Engine design; useful as product vision, not implementation evidence |

### Documentation precedence

When documentation disagrees, use current code and migrations as the source of truth. `IMPLEMENTATION_STATUS.md` records the current audited state, while `document.md` should be treated as historical/aspirational context.

## Running Locally

Install dependencies:

```bash
bun install
```

Copy `.env.example` to `.env` and configure the required environment values:

```text
DATABASE_URL
AI_MODE
BETTER_AUTH_SECRET
BETTER_AUTH_URL
CORS_ORIGIN
```

Use `AI_MODE=mock` for deterministic local development without Gemini requests. Use `AI_MODE=gemini` for the real provider; only that mode requires a real `GEMINI_API_KEY`. Mock mode is intended for development and testing, not production learning decisions.

Apply tracked database migrations:

```bash
bun run db:migrate
```

Start the workspace:

```bash
bun run dev
```

Or start only the web application:

```bash
bun run dev:web
```

The existing local web configuration uses port `3001`.

## Common Commands

```bash
bun run dev
bun run dev:web
bun run build
bun run check-types
bun run db:push
bun run db:generate
bun run db:migrate
bun run db:studio
bun run test:ai-mock
```

## Development Notes

- Core learner operations are protected through Better Auth-backed tRPC middleware and user ownership filtering.
- AI mode selection is centralized; Gemini structured output is parsed centrally and all provider output is validated by domain schemas before core persistence/use.
- Lesson content is generated lazily and persisted rather than regenerated on every visit.
- Tutor and Socratic Validator are intentionally separate responsibilities.
- A manual node-completion path currently exists alongside Socratic completion; this is a known product decision that still needs to be resolved.
- Repository-owned Supabase/PostgreSQL RLS policies were not identified in the current implementation, so RLS should not be presented as an implemented security layer yet.

For coding-agent work, start with [`AGENTS.md`](./AGENTS.md) and [`CODEX_CONTEXT.md`](./CODEX_CONTEXT.md).
