# Synara Implementation Status

## Purpose

This document records what the current codebase actually implements. It is intentionally stricter than `PRD.md` or the historical `document.md` so development discussions do not confuse product intent, database scaffolding, and end-to-end behavior.

The audit was performed against the implementation state on `master` immediately before the documentation-only commits that introduced the project documentation set. Those documentation commits do not change product behavior.

## Status Definitions

- **Implemented** — working application logic and a usable product/API flow exist.
- **Partial** — meaningful implementation exists, but the end-to-end flow or an important integration is incomplete.
- **Schema-only** — database structures exist, but no active business flow currently uses them.
- **Not implemented** — the capability is described or desirable but no meaningful implementation was found.
- **Not evidenced** — a claim exists in historical documentation, but repository-owned implementation could not be verified.

## Core Feature Matrix

| Capability | Status | Evidence / Current Behavior | Important Notes |
| --- | --- | --- | --- |
| Email/password authentication | Implemented | Better Auth with Drizzle/PostgreSQL | Core learning procedures are protected by authenticated session middleware. |
| Authenticated learner dashboard | Implemented | Saved roadmaps can be listed and reopened | Current product is learner-only. |
| Five-step course onboarding | Implemented | Topic, level, goal, weekly hours, learning style | Responsive drawer UI. |
| Initial AI roadmap generation | Implemented | Gemini generates up to 5 nodes with typed metadata | Structured output is validated before persistence. |
| Draft fallback on generation failure | Implemented | Guided creation can save a roadmap with zero nodes and `generationStatus: draft` | Recovery UI beyond the draft state is still limited. |
| Persistent roadmaps and nodes | Implemented | PostgreSQL + Drizzle | Ownership is tied to authenticated user IDs. |
| Node progress tracking | Implemented | Completion state and completion timestamp stored per node | Roadmap is marked completed when all nodes are complete. |
| Linear prerequisite locking | Implemented | Access is derived from ordered `orderIndex` + `isCompleted` state and enforced by node-specific learner procedures | Completed nodes are reviewable, the first incomplete node is current, and later incomplete nodes are locked; this is not a general dependency graph. |
| Lazy lesson generation | Implemented | Lesson generated when selected/needed and stored in node JSON | Avoids repeated AI calls after persistence. |
| Lesson summary/concepts/steps/exercises/resources | Implemented | Structured lesson JSON rendered in course workspace | Current resources are descriptors, not curated external links. |
| Contextual AI tutor | Implemented | Tutor receives goal, node, success criteria, lesson context | Tutor explicitly does not grade or mark progress. |
| Persistent tutor history | Implemented | One tutor session per learner + node | Conversation survives revisits. |
| Socratic validation chat | Implemented | Persistent validation session per node | Separate from tutor role. |
| Competency scoring | Implemented | Gemini returns score 0-100 | Score is AI-produced and prompt-governed. |
| Automatic completion at score >= 80 | Implemented | Validation mutation marks node complete | This is the preferred validated-completion path. |
| Stumble accumulation | Implemented | Session stumble count accumulates across validation turns | Retained as historical telemetry; not an authoritative recalibration trigger. |
| Sentiment signal | Implemented | Gemini returns 0.0-1.0 sentiment score | Retained as historical telemetry; not an authoritative recalibration trigger. |
| Stagnation Score | Implemented | Deterministic score uses Socratic failures, time ratios, Tutor learner turns, backtracks, and effort 1-9 | Quiz and hint signals are not implemented. |
| Recalibration trigger | Implemented | Two Socratic failures, two consecutive time ratios >2.0, or Stagnation Score >=70 marks the roadmap `needs_recalibration` after a failed attempt | Passing mastery on the same attempt takes precedence; recalibration execution remains separate. |
| Backend recalibration mutation | Implemented | Incomplete nodes replaced; completed nodes preserved | Uses failed-node Socratic context. |
| Learner-facing recalibration execution | Partial | UI displays warning toast when recalibration is required | Course workspace does not currently call `learning.recalibrate`. |
| Manual node completion | Deprecated learner flow | `finishNode` remains as a protected compatibility mutation, but the learner UI no longer exposes it | The retained mutation also rejects future locked nodes. |
| Reopen completed node | Deprecated learner flow | `reopenNode` remains as a protected compatibility mutation, but the learner UI no longer exposes it | Completed nodes remain readable and tutor-accessible without reopening. |
| Cognitive profile storage | Schema-only | `user_cognitive_profiles` table exists | Not read or updated by current learning flows. |
| Learning activity logs | Implemented for Stagnation MVP | One aggregate row per authenticated learner + node stores active seconds, failure/time/backtrack/effort metrics, score, level, and trigger reasons | Tutor learner turns are derived from persistent Tutor history rather than duplicated. |
| Micro-artifact records | Schema-only | `micro_artifacts` table exists | No submission, review, or UI workflow. |
| Long-term cognitive adaptation | Not implemented | Historical design describes it | Current recalibration uses recent Socratic failure context instead. |
| Curated learning-source database | Not implemented | No active source ingestion/curation pipeline found | AI lesson resources are descriptive text only. |
| Supabase/Postgres RLS policies | Not evidenced | Historical design claims RLS | No repository-owned RLS policy/migration was found during audit. |
| Instructor/admin workflows | Not implemented | No core product role/flow found | Outside current learner MVP. |

## Current End-to-End Happy Path

The strongest working path today is:

```text
Sign up / sign in
  -> Dashboard
  -> Create course
  -> Gemini roadmap generation
  -> Open course
  -> Open the first incomplete/current node
  -> Lazy lesson generation + persistence
  -> Ask contextual tutor questions
  -> Enter Socratic validation
  -> Reach competency >= 80
  -> Node completes
  -> Dashboard/course progress updates
```

This is the current demo-ready core.

## Partially Connected Adaptive Path

```text
Socratic validation
  -> record active time, failure, backtrack, effort, and Tutor-turn signals
  -> calculate deterministic Stagnation Score
  -> evaluate repeated-failure, repeated-time-ratio, and score hard triggers
  -> roadmap becomes needs_recalibration
  -> UI warns learner
  -X-> recalibration mutation is not invoked by UI
```

The backend continuation already exists:

```text
learning.recalibrate
  -> load failed-node Socratic history
  -> generate more accessible replacement nodes
  -> delete incomplete old nodes
  -> preserve completed nodes
  -> insert replacement path
  -> mark roadmap active
```

The key missing piece is the learner-facing bridge between the warning and that mutation.

## Product / Implementation Contradictions

### 1. Validation-first completion and legacy API compatibility

The normal learner workspace now completes the current node only through Socratic Validation and removes both manual completion and reopen actions. The protected `finishNode` and `reopenNode` mutations remain temporarily for compatibility, so they should be removed separately once external usage risk is resolved.

### 2. Adaptive cognitive memory vs recent-session adaptation

The historical design describes a persistent cognitive profile influencing curriculum generation. The current implementation does not use `user_cognitive_profiles` in roadmap generation/recalibration.

Current adaptive behavior is narrower: `learning_logs` supports the deterministic Stagnation Score, while recalibration generation still uses the failed node and its Socratic conversation rather than a long-term cognitive profile.

### 3. RLS claim vs repository evidence

Application-level ownership checks are present. Repository-owned database RLS policies were not found. Do not describe the system as having two implemented authorization layers until RLS is actually configured and verified.

### 4. Micro-artifact validation claim vs schema

The table exists, but no active API/UI flow verifies repositories, files, or live demos. Treat micro-artifact verification as future work.

## Priority Gaps

### P0 — Complete the adaptive MVP loop

1. Add a learner-facing action or automatic orchestration for `learning.recalibrate`.
2. Define loading/failure/success states for recalibration.
3. Refresh the roadmap after successful replacement.
4. Decide whether recalibration needs learner confirmation.

### P1 — Retire legacy completion mutations

Confirm whether any non-workspace consumers still require `finishNode` or `reopenNode`, then remove them if compatibility is no longer needed.

### P1 — Expand adaptive data only when required

If long-term personalization remains in scope:

1. define how cognitive profile fields would be updated;
2. feed bounded, useful profile context into roadmap generation/recalibration only if product requirements justify it;
3. avoid collecting signals that are not actually used.

### P1 — Artifact validation

Only implement micro-artifact verification after defining supported artifact types and a safe, testable validation model. Do not imply arbitrary executable-file or repository verification before that exists.

### P1 — Security verification

If RLS is part of the intended architecture, add explicit policies/migrations and tests demonstrating cross-user isolation. Otherwise remove the RLS claim from outward-facing technical descriptions.

### P2 — Naming cleanup

Historical names remain in package namespaces and prompts (`@gemastik/*`, `gemastik`, `Gradio Engine`). Renaming is not functionally required and should be handled as a deliberate migration rather than opportunistic cleanup.

## Testing and Quality Status

No comprehensive automated product test suite was identified during this documentation audit. There are development/testing artifacts in the repository, but they should not be treated as evidence of full regression coverage.

A focused progression check now covers the derived completed/current/locked states, locked-node server access contract, next-node unlocking, final roadmap completion, and zero-node draft behavior. It is not a full database-backed router integration suite.

A focused Stagnation Score check covers the deterministic signal weights, exclusive time tiers, all three hard triggers, mastery precedence, and completed-node review isolation. It is also a domain-level check rather than a database-backed router integration suite.

For meaningful feature changes, at minimum verify:

- TypeScript checks;
- production build when practical;
- authenticated ownership behavior;
- AI structured-output failure handling;
- roadmap/node persistence;
- completion synchronization; and
- recalibration preservation of completed nodes.

As automated tests are added, document their scope here rather than reporting only raw test counts.

## When to Update This File

Update this document whenever a change materially moves a capability between:

- not implemented -> schema-only;
- schema-only -> partial;
- partial -> implemented; or
- implemented -> deprecated/removed.

Do not update status based only on a schema, mock UI, TODO, or design document. Status should reflect executable behavior.
