# Synara Product Requirements Document

## 1. Product Summary

Synara is an AI-assisted adaptive learning workspace that turns a learner's goal into a structured roadmap, provides focused lesson content for each roadmap node, supports contextual tutoring, and validates understanding through Socratic dialogue.

The product is intended to sit between two common extremes:

- static learning paths that do not react to learner difficulty; and
- open-ended AI chat that offers help without a persistent learning structure.

Synara keeps the learner anchored to a roadmap while using AI to generate, support, validate, and eventually adapt that roadmap.

## 2. Canonical Product Name

**Canonical name:** Synara

The repository still contains historical names such as `gemastik`, `gemastik-roadmap`, and `Gradio Engine`. Treat those as implementation or prompt artifacts, not current product branding.

## 3. Target User

### Primary user

A learner or student who:

- has a learning goal but does not know how to structure it;
- benefits from smaller, sequenced learning steps;
- wants help while studying without losing track of the larger goal; and
- needs lightweight validation of understanding rather than a conventional formal exam.

### Current product role model

The current MVP has one authenticated learner role. There is no implemented instructor, curator, or administrator workflow in the core learning experience.

## 4. Problem Statement

Learners often encounter three problems:

1. **Unstructured goals.** Broad goals such as learning a framework, preparing for a project, or mastering a topic are difficult to translate into a practical sequence.
2. **Static learning paths.** A fixed curriculum does not respond when a learner repeatedly struggles with a prerequisite or specific concept.
3. **Weak evidence of understanding.** Completing content does not necessarily mean the learner can explain or apply it.

Synara addresses these by combining a persistent roadmap, node-level lessons, contextual tutoring, Socratic validation, and an adaptive recalibration mechanism.

## 5. Product Principles

1. **Roadmap first.** AI assistance must remain grounded in a visible learning path.
2. **Atomic learning units.** Each roadmap node should represent a focused, independently understandable learning objective.
3. **Contextual assistance.** Tutor responses should be based on the active goal, node, lesson, and success criteria.
4. **Validation over passive completion.** The preferred completion path is demonstrating understanding through Socratic validation.
5. **Adapt the route, preserve the goal.** Recalibration may replace unfinished steps but should not silently change the learner's original goal.
6. **Persist useful state.** Roadmaps, generated lessons, tutor conversations, and validation sessions should survive navigation and future sessions.
7. **Implementation truth over aspirational copy.** Product documentation must distinguish implemented behavior from planned adaptive features.

## 6. Core User Journey

1. The learner signs up or signs in.
2. The learner enters the dashboard.
3. The learner creates a course through a five-question onboarding flow:
   - topic;
   - current level;
   - learning goal/motivation;
   - weekly time commitment; and
   - preferred learning style.
4. Synara generates a roadmap of up to five initial nodes.
5. The learner opens a course workspace.
6. Synara generates lesson content for a selected node on demand and persists it.
7. The learner studies the lesson and may ask the contextual tutor for help.
8. The learner enters Socratic validation and explains or applies the concept.
9. A competency score of at least 80 marks the node complete automatically.
10. Repeated stumbling or low sentiment marks the roadmap as needing recalibration.
11. The intended next step is to regenerate the unfinished path while preserving completed nodes and the original learning goal.

## 7. Functional Requirements

### FR-1 Authentication

The system must support authenticated learner accounts using email and password.

**Current state:** Implemented with Better Auth.

### FR-2 Guided course creation

The learner must be able to create a course from structured onboarding answers.

The onboarding must capture topic, level, goal, weekly hours, and learning style.

**Current state:** Implemented.

### FR-3 AI roadmap generation

The system must transform a goal into ordered roadmap nodes. Each node must contain:

- title;
- difficulty level from 1 to 10;
- estimated completion time;
- content type (`video`, `reading`, `hands-on`, or `socratic`); and
- one or more explicit success criteria.

The current generation batch must contain no more than five nodes.

**Current state:** Implemented.

### FR-4 Graceful roadmap-generation failure

When roadmap generation fails during the guided course-creation flow, the course may be persisted as a draft instead of discarding the learner's input.

**Current state:** Implemented.

### FR-5 Persistent course dashboard

The learner must be able to see their saved roadmaps and progress and reopen a course later.

**Current state:** Implemented.

### FR-6 Node lesson content

For each roadmap node, the system should provide a compact lesson containing:

- summary;
- core concepts;
- suggested steps;
- exercises; and
- resource suggestions.

Generated lesson content must be persisted so repeated visits do not require regeneration.

**Current state:** Implemented through lazy generation.

### FR-7 Contextual tutor

The learner must be able to ask questions about the active node. Tutor context must include the overall goal, node metadata, success criteria, and generated lesson content.

Tutor conversation history must persist per learner and node.

The tutor must not independently mark progress complete or present itself as the validator.

**Current state:** Implemented.

### FR-8 Socratic validation

The learner must be able to demonstrate understanding through dialogue. The validator should return:

- an AI response;
- competency score from 0 to 100;
- stumble signal; and
- sentiment score from 0.0 to 1.0.

A competency score of at least 80 should automatically complete the node.

**Current state:** Implemented.

### FR-9 Recalibration trigger

The roadmap should be marked `needs_recalibration` when the learner shows a persistent learning blockage or strong frustration signal.

The current implementation triggers this when either:

- accumulated Socratic stumble count is greater than 3; or
- the latest sentiment score is below 0.3.

**Current state:** Implemented.

### FR-10 Roadmap recalibration

When a roadmap needs recalibration, the system should preserve completed nodes and replace unfinished nodes with a more accessible route generated from the original goal and recent failure context.

**Current state:** Backend implemented; end-to-end learner UX is incomplete because the course workspace does not currently invoke the recalibration mutation.

### FR-11 Manual node completion

The current workspace allows a learner to mark an unfinished node complete manually and reopen it later.

**Current state:** Implemented, but this behavior conflicts with the stronger product principle that validation should be the authoritative completion mechanism. This is an explicit product decision to resolve before the completion model is considered final.

## 8. Planned / Incomplete Capabilities

### Long-term cognitive profile

Database structures exist for preferred format, average focus duration, weak topics, and last recalibration time. They are not currently wired into active learning logic.

**Status:** Schema-only.

### Learning logs

Database structures exist for time spent, stumble count, and sentiment history, but current routers do not write or consume them.

**Status:** Schema-only.

### Micro-artifact verification

Database structures exist for artifact URLs, validation status, and AI critique. No active router/service/UI flow currently submits or verifies artifacts.

**Status:** Schema-only.

### Curated external learning sources

Current lesson resources are AI-generated descriptors and do not include a curated source database or verified external URLs.

**Status:** Not implemented.

### Database Row Level Security

The legacy design document describes Supabase RLS as a second authorization layer. No application migration or policy implementation is currently evidenced in the repository.

**Status:** Not evidenced. Do not represent it as implemented until policies exist and are verified.

## 9. UX Requirements

- The dashboard must clearly separate active courses and their progress.
- Course creation must remain short and sequential rather than exposing a large configuration form.
- The course workspace should keep roadmap, lesson content, and coach/validation context visible together on large screens.
- Mobile interactions must remain usable; course creation should use a bottom drawer on mobile and a side drawer on larger screens.
- Loading, empty, error, and AI failure states must be visible to the learner.
- Recalibration must eventually provide a clear learner action or automatic transition rather than only a warning toast.
- Product UI copy is currently English and should remain consistent until localization is intentionally introduced.

## 10. Success Criteria for the MVP

The MVP is product-complete when a learner can reliably:

1. create an account and sign in;
2. create a course and receive a roadmap;
3. open every generated node and receive persisted lesson content;
4. ask the tutor contextual questions with persistent history;
5. complete a node through Socratic validation;
6. see progress update correctly;
7. trigger a recalibration condition; and
8. complete the recalibration flow from the learner UI without direct API intervention.

The current implementation satisfies items 1-6 and the backend portion of item 7-8. See `IMPLEMENTATION_STATUS.md` for the exact audit state.

## 11. Product Decisions Still Open

1. Should manual completion remain available, be restricted to development/demo mode, or be removed in favor of validation-only completion?
2. Should recalibration run automatically or require explicit learner confirmation?
3. What learner history should be retained when incomplete nodes are replaced?
4. How should cognitive-profile data influence future roadmap generation once it is wired in?
5. Should external learning resources be curated, retrieved from trusted providers, or remain AI-generated suggestions?
6. What evidence is sufficient for micro-artifact validation, and which artifact types are supported?
7. What telemetry is required to evaluate learning effectiveness without collecting unnecessary learner data?

## 12. Non-Goals for the Current MVP

Unless separately scoped, the current MVP does not require:

- instructor or classroom management;
- formal certification or high-stakes assessment;
- a full LMS content-authoring system;
- social/community features;
- payment/subscription flows;
- autonomous verification of arbitrary GitHub repositories or executable uploads; or
- claims of long-term cognitive personalization before the profile/log pipeline is implemented.

## 13. Documentation Precedence

When documents disagree, use this order:

1. current code and database migrations;
2. `IMPLEMENTATION_STATUS.md`;
3. `ARCHITECTURE.md`;
4. this PRD for intended product behavior;
5. `document.md` as historical/aspirational design context.

`document.md` contains useful product ideas but must not be treated as proof that a feature is implemented.
