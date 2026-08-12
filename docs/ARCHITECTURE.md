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
  +--> @gemastik/db   --> PostgreSQL via Drizzle + curated learning sources
  +--> Gemini API     --> roadmap, lesson body, tutor, validation, recalibration
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

- `create-course-dialog.tsx` — three-stage presentation of five onboarding answers and the course creation mutation
- `course-card.tsx` — focused dashboard course summary and continuation affordance
- `course-workspace.tsx` — course/server-state orchestration, Tutor, Socratic validation, and adaptive UI state
- `course-workspace-sections.tsx` — presentational roadmap sequence and lesson/article surfaces
- `app-sidebar.tsx` and navigation components — authenticated app shell

The course workspace is a lesson-dominant three-area composition on large screens:

1. roadmap node list;
2. selected node lesson content; and
3. coach panel containing Tutor and Validation tabs.

At narrower widths these areas stack so roadmap and coach remain fully available without squeezing three columns into the viewport. Roadmap, lesson, and coach use focused scroll surfaces on desktop-height layouts.

`use-active-study-attempt.ts` measures a lightweight current-node attempt window after lesson content is available. It pauses while the document is hidden, during validation network wait, or while a completed node is being reviewed. The workspace increments a backtrack only when navigation leaves the current node for an earlier completed node and submits elapsed/backtrack deltas plus effort 1-9 with Socratic validation.

When validation returns `recalibrationRequired`, the workspace uses a single-flight orchestration helper to invoke `learning.recalibrate` once, refresh course/list/dashboard queries, and select the returned replacement current node. The validation UI exposes pending and recoverable retry states without displaying raw stagnation telemetry.

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

Input includes the original goal, completed-node titles, learner level when available, the problematic node snapshot, the latest bounded Socratic context, deterministic trigger reasons/level, and a compact behavioral summary.

The service asks Gemini to generate a replacement path that is easier or includes missing prerequisite bridges.

## 8. Lesson Generation and Curated Sources

Lesson content is assembled lazily when a learner first requests a node's content or asks the tutor about a node without a persisted lesson.

```text
Gemini -> validated summary/concepts/steps/exercises
PostgreSQL learning_sources -> verified + active candidates
deterministic matcher -> up to 3 relevant source snapshots
server -> persisted roadmap_nodes.lesson_content
```

The matcher normalizes topic, node-title, and goal tokens; scores tag overlap at 12 points per token and source-title overlap at 4 points per token; then applies explicit learner-level influence (exact +4, `all` +2, opposite beginner/advanced -2). A source must have topical overlap to qualify. Ties resolve by source-category priority, title, provider, then ID, so ordering is stable.

Gemini is explicitly asked for the lesson body only and its Zod schema has no resource field. Learner-visible source ID, title, provider, URL, category, level, and description are copied only from database records. Persisted lesson JSON carries `resourceModelVersion: 1`; source snapshots are rematched against currently eligible rows on lesson access, while unchanged content avoids a write. Legacy lessons without the marker retain their body, discard old AI descriptors, rematch the catalog, and persist the normalized result. Zero matches is a valid empty resource list.

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

The adaptive state machine is:

```text
active -> needs_recalibration -> recalibrating -> active
                                      |
                                      +-- handled failure -> needs_recalibration
```

`learning.recalibrate` atomically claims only an owned `needs_recalibration` roadmap. It then loads bounded trigger context and asks the existing `roadmapService.recalibrateRoadmap` engine for 3-5 replacement nodes. AI generation and Zod validation happen before deletion. A short database transaction locks/rechecks the roadmap, preserves completed nodes and their order, deletes incomplete nodes, inserts the replacement path, writes one recalibration log, preserves stable metadata, and returns the roadmap to `active`.

Duplicate calls cannot claim an already `recalibrating` or `active` roadmap. Handled generation or transaction failures restore `needs_recalibration`; transactional rollback keeps the old unfinished path and prevents a false success log.

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

Logs for deleted incomplete nodes cascade during successful recalibration. Their meaningful trigger summary is copied first into the same transaction's `recalibration_logs` record.

### `recalibration_logs`

Stores learner/roadmap ownership, trigger node title, Stagnation Score and intervention level, trigger reasons, old unfinished node titles, replacement node titles, and creation time. It deliberately snapshots the trigger title rather than referencing a node that will be deleted.

### `learning_sources`

Stores unique URLs and manually controlled source title, provider, category, level, normalized tags, description, active/verified state, nullable verification time, and timestamps. Only verified and active rows are queried for lesson matching. The catalog seed is typed, URL-validated, repeatable by unique-URL upsert, and intentionally empty until manual verification is completed.

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
- restrained soft geometry (`--radius: 0.625rem`);
- a violet/purple primary color family;
- light and dark themes;
- restrained shadows and flat bordered surfaces.

See `STYLE_GUIDE.md` for implementation conventions.

## 16. Known Architectural Gaps

1. Cognitive profiles are not wired into generation or recalibration.
2. Quiz and hint signals are not part of the current Stagnation Score.
3. Micro-artifact validation is schema-only.
4. RLS is documented historically but not evidenced in repository migrations/policies.
5. Legacy manual completion/reopen API mutations remain for compatibility but are not exposed by the learner workspace.
6. Several historical names remain in package names/prompts (`gemastik`, `Gradio`).
7. Recalibration recovery handles normal request/provider/database failures, but no lease timeout recovers a process terminated after claiming `recalibrating`.
8. The curated-source catalog infrastructure is connected, but its seed dataset is intentionally empty pending manual research and verification; there is no crawler, broken-link checker, or curation UI.
9. The workspace container still owns intertwined learning-query and mutation orchestration; roadmap and lesson presentation are extracted, while further splitting should preserve the current single source of server state.

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
