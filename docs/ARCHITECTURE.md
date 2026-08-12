# Synara Architecture

## 1. System Overview

Synara is implemented as a Bun/Turborepo monorepo with a single Next.js application and shared packages for API, authentication, database access, environment configuration, and UI primitives.

```text
Browser
  |
  v
Next.js App Router (apps/web)
  |-- Better Auth route handlers
  |-- tRPC route handler
  |
  v
@ gemastik/api
  |-- learning router
  |-- validation router
  |-- sidebar router
  |-- AI + roadmap services
  |
  +--> @gemastik/auth --> Better Auth + Drizzle adapter
  +--> @gemastik/db   --> PostgreSQL via Drizzle
  +--> Gemini API     --> roadmap, lesson, tutor, validation, recalibration
```

## 2. Repository Structure

```text
synara/
├── apps/
│   └── web/
│       ├── src/app/                # Next.js routes
│       ├── src/components/         # Product-specific UI
│       ├── src/lib/                # App helpers/config
│       └── src/utils/              # tRPC client setup
├── packages/
│   ├── api/                        # tRPC routers and business services
│   ├── auth/                       # Better Auth configuration
│   ├── db/                         # Drizzle schema, migrations, DB client
│   ├── env/                        # Validated environment variables
│   ├── config/                     # Shared TypeScript config
│   └── ui/                         # Shared shadcn/ui primitives and theme
├── .agents/                        # Installed reusable agent skills
├── .codex/                         # Codex configuration
├── PRD.md                          # Product requirements
├── IMPLEMENTATION_STATUS.md        # Current feature audit
├── CODEX_CONTEXT.md                # Compact agent context
├── STYLE_GUIDE.md                  # Product/code style conventions
├── AGENTS.md                       # Repository-level agent rules
└── document.md                     # Historical/aspirational technical design
```

## 3. Runtime and Tooling

- Runtime/package manager: Bun
- Monorepo orchestration: Turborepo
- Web framework: Next.js 16 App Router
- UI: React 19, Tailwind CSS 4, shadcn/ui primitives
- API contract: tRPC 11
- Client server-state: TanStack React Query
- Authentication: Better Auth
- ORM: Drizzle ORM
- Database: PostgreSQL
- AI provider: Google Gemini through `@google/generative-ai`
- Validation: Zod

## 4. Web Application

### Main routes

- `/` — entry route
- `/login` — sign-in page
- `/signup` — registration page
- `/dashboard` — authenticated learner dashboard
- `/dashboard/courses/[id]` — course workspace
- `/dashboard/settings` — settings page
- `/api/auth/[...all]` — Better Auth handler
- `/api/trpc/[trpc]` — tRPC handler

### Main product components

- `create-course-dialog.tsx` — five-step course onboarding and course creation mutation
- `course-card.tsx` — dashboard course summary
- `course-workspace.tsx` — roadmap, lesson content, tutor, Socratic validation, node completion
- `app-sidebar.tsx` and navigation components — authenticated app shell

The course workspace is currently a three-column composition on large screens:

1. roadmap node list;
2. selected node lesson content; and
3. coach panel containing Tutor and Validation tabs.

`use-active-study-attempt.ts` measures a lightweight current-node attempt window after lesson content is available. It pauses while the document is hidden, during validation network wait, or while a completed node is being reviewed. The workspace increments a backtrack only when navigation leaves the current node for an earlier completed node and submits elapsed/backtrack deltas plus effort 1-9 with Socratic validation.

## 5. API Layer

All core learning procedures are protected by tRPC authentication middleware. The middleware requires `ctx.session.user` and injects the authenticated user and shared database instance into protected procedures.

### `learningRouter`

Primary responsibilities:

- guided course creation;
- direct roadmap generation;
- roadmap listing and dashboard queries;
- roadmap detail queries;
- lazy lesson-content generation;
- persistent tutor conversations;
- derived linear node-access enforcement;
- legacy manual node completion/reopening mutations (not exposed in the learner UI);
- roadmap completion synchronization;
- backend roadmap recalibration.

### `validationRouter`

Primary responsibilities:

- Socratic session retrieval;
- Socratic response generation;
- competency scoring;
- cumulative stumble tracking;
- sentiment extraction;
- active-time/backtrack/effort metric persistence;
- deterministic Stagnation Score calculation;
- automatic node completion at competency >= 80;
- setting roadmap status to `needs_recalibration` on Stagnation Score hard triggers after a failed attempt.

## 6. AI Service

`packages/api/src/services/ai.service.ts` centralizes Gemini calls.

### Responsibilities

- plain-text generation;
- structured JSON generation;
- provider error classification;
- limited retry/backoff handling;
- JSON cleanup and parsing.

### Current model configuration

The service defines:

```text
gemini-2.5-flash
gemini-1.5-flash
```

The helper changes model after the first failed attempt. Documentation and comments around retry behavior should be kept synchronized with the actual code if this strategy changes.

### Error categories

The service classifies errors into:

- `high_demand`
- `rate_limited`
- `model_not_found`
- `invalid_api_key`
- `bad_request`
- `safety_blocked`
- `invalid_json`
- `unknown`

Structured output is parsed with `JSON.parse` after markdown-fence cleanup. Domain-specific Zod validation occurs in calling routers/services.

## 7. Roadmap Generation

`roadmap.service.ts` contains two prompt-level operations.

### Initial generation

Input: a combined learner goal description.

Output: JSON object containing a maximum of five roadmap nodes.

Each node contains:

- `title`
- `difficulty_level`
- `estimated_time`
- `content_type`
- `success_criteria`

The API router normalizes alternate AI content type values such as `text`, `doc`, and `hands_on` before persistence.

### Recalibration generation

Input includes:

- original goal;
- failed node title; and
- failure-context conversation history.

The service asks Gemini to generate a replacement path that is easier or includes missing prerequisite bridges.

## 8. Lesson Generation

Lesson content is generated lazily when a learner first requests a node's content or asks the tutor a question about a node whose lesson has not yet been generated.

The generated structure contains:

- summary;
- concepts;
- steps;
- exercises;
- resource descriptors.

Once generated, lesson content is stored in `roadmap_nodes.lesson_content` and reused on later reads.

This reduces unnecessary AI calls for nodes the learner never opens.

## 9. Tutor Flow

The tutor is intentionally separate from validation.

```text
Learner message
  -> learning.askTutor
  -> load roadmap + node
  -> ensure lesson content exists
  -> load prior tutor session
  -> build contextual prompt
  -> Gemini text generation
  -> persist updated chat history
  -> return answer + history
```

Tutor context includes:

- overall goal;
- active node title/type/difficulty/time;
- success criteria;
- lesson summary and concepts;
- previous tutor messages.

The system instruction explicitly tells the tutor not to grade, reveal competency scores, or claim progress changes.

## 10. Socratic Validation Flow

```text
Learner validation message
  -> validation.submitSocratic
  -> load owned roadmap node
  -> append message to Socratic history
  -> Gemini structured evaluation
  -> derive Tutor learner turns from persistent history
  -> accumulate active time, time ratio, failures, backtracks, and effort
  -> calculate deterministic Stagnation Score
  -> persist validation + learning-log state atomically
  -> if competency >= 80: complete node and ignore same-attempt stagnation eligibility
  -> derive and expose the next incomplete node by orderIndex
  -> if the final node completed: mark the roadmap completed in the same transaction
  -> otherwise, if a Stagnation Score hard trigger fires: mark roadmap needs_recalibration
```

### Linear node access

`packages/api/src/domain/node-progression.ts` derives three states from ordered nodes: `completed`, `current`, and `locked`. `packages/api/src/services/node-access.service.ts` applies that rule with authenticated ownership checks before learner-facing lesson, tutor, validation, and legacy node mutations run. No lock state is persisted in the database, and this MVP model is not a general dependency graph.

The current validator returns:

- `ai_response`
- `competency_score`
- `stumble_count`
- `sentiment_score`
- `interventionLevel`
- `recalibrationRequired`
- `nextNodeId`

Stumble and sentiment remain session telemetry. They no longer determine recalibration eligibility. The authoritative hard triggers are two failed Socratic attempts, two consecutive recorded time ratios above 2.0, or a deterministic Stagnation Score of at least 70.

## 11. Recalibration Flow

The backend recalibration mutation:

1. requires roadmap status `needs_recalibration`;
2. loads the failed node from roadmap metadata;
3. reads failure context from the Socratic session;
4. generates replacement nodes through `roadmapService.recalibrateRoadmap`;
5. deletes all incomplete nodes;
6. preserves completed nodes;
7. inserts replacement nodes after the completed-node count; and
8. returns the roadmap to `active`.

### Current limitation

The course workspace currently warns the learner when recalibration is required but does not call `learning.recalibrate`. Therefore this flow is backend-complete but not end-to-end complete.

## 12. Database Model

### Authentication tables

Managed by Better Auth schema in `packages/db/src/schema/auth.ts`.

### `learning_roadmaps`

Important fields:

- `id`
- `user_id`
- `goal_description`
- `current_status`
- `metadata`
- timestamps

Statuses:

- `active`
- `completed`
- `recalibrating`
- `needs_recalibration`

Metadata currently stores onboarding answers and generation/recalibration context.

### `roadmap_nodes`

Important fields:

- learner and roadmap ownership
- ordered position
- content type
- estimated time
- success criteria
- difficulty level
- generated lesson JSON
- completion state

### `tutor_sessions`

One persistent tutor thread per learner + node pair.

### `socratic_sessions`

Stores validation conversation plus competency, stumble, sentiment, and AI feedback signals.

### `user_cognitive_profiles`

Schema exists for:

- preferred format;
- average focus duration;
- weak topics;
- last recalibration time.

No active API business logic currently reads or updates this table.

### `learning_logs`

One aggregate row per learner + node stores cumulative active study seconds, Socratic failure count, recorded time ratios, cumulative backtracks, latest effort score, latest Stagnation Score/level, trigger reasons, and an idempotent last-attempt identifier. Legacy stumble and sentiment columns remain telemetry. Tutor turns are derived from `tutor_sessions.chat_history` at validation time.

### `micro_artifacts`

Schema exists for artifact URL, verification status, and AI critique. No current API/UI workflow uses it.

## 13. Authentication and Authorization

### Authentication

Better Auth is configured with:

- PostgreSQL Drizzle adapter;
- email/password authentication;
- trusted origin from environment config;
- cookie integration for Next.js.

### API authorization

Core tRPC procedures use `protectedProcedure`.

Business queries typically constrain records by authenticated `userId`. This ownership filtering is part of the current application-level authorization model.

### RLS status

The historical design claims Supabase Row Level Security. Repository search does not currently show application-owned RLS policies/migrations. Treat RLS as unimplemented/unverified until explicit policies exist and are tested.

## 14. Environment Variables

Server configuration currently requires:

- `DATABASE_URL`
- `GEMINI_API_KEY`
- `BETTER_AUTH_SECRET`
- `BETTER_AUTH_URL`
- `CORS_ORIGIN`
- `NODE_ENV` (optional default: development)

Environment validation lives in `packages/env/src/server.ts`.

Do not commit real secrets.

## 15. UI System

Shared UI primitives live in `packages/ui` and are based on shadcn/ui.

The global theme currently uses:

- Plus Jakarta Sans as sans-serif;
- Lora as serif;
- IBM Plex Mono as monospace;
- zero base radius (`--radius: 0rem`);
- a violet/purple primary color family;
- light and dark themes;
- restrained shadows and flat bordered surfaces.

See `STYLE_GUIDE.md` for implementation conventions.

## 16. Known Architectural Gaps

1. Recalibration is not invoked from the learner UI.
2. Cognitive profiles are not wired into generation or recalibration.
3. Quiz and hint signals are not part of the current Stagnation Score.
4. Micro-artifact validation is schema-only.
5. RLS is documented historically but not evidenced in repository migrations/policies.
6. Legacy manual completion/reopen API mutations remain for compatibility but are not exposed by the learner workspace.
7. Several historical names remain in package names/prompts (`gemastik`, `Gradio`).
8. `course-workspace.tsx` is large and currently combines data orchestration and multiple UI concerns; future refactoring may improve maintainability, but functionality should take priority over cosmetic decomposition.

## 17. Change Safety

When modifying core flows:

- preserve authenticated ownership filtering;
- validate AI structured output before database writes;
- use database transactions for multi-record roadmap changes;
- do not silently change the original learner goal during recalibration;
- preserve completed roadmap nodes during path replacement;
- avoid re-generating persisted lesson content unnecessarily;
- keep Tutor and Validator responsibilities separate;
- update `IMPLEMENTATION_STATUS.md` when feature state changes materially.
