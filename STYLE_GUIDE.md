# Synara Style Guide

## 1. Purpose

This guide documents the conventions already visible in Synara and the defaults to preserve when extending the product. It covers product copy, UI composition, TypeScript/application code, API patterns, database naming, and AI prompt conventions.

It is not a mandate to restyle unrelated code. Follow local conventions when they are more specific and avoid mass-formatting.

## 2. Product Language

### Canonical name

Use **Synara** in new product-facing documentation and UI copy.

Historical names such as `gemastik-roadmap`, `gemastik`, `@gemastik/*`, and `Gradio Engine` may remain in code until a dedicated rename is intentionally scoped.

### UI language

Current product UI is predominantly English. New learner-facing copy should therefore be English unless localization is explicitly introduced.

When touching an existing learner-facing message that is informal Indonesian, prefer normalizing the touched flow to clear English rather than adding more mixed-language copy.

### Tone

Use concise, instructional language.

Prefer:

- `Create course`
- `Validate to finish step`
- `Roadmap recalibration required`
- `Unable to load this course`

Avoid:

- excessive AI hype;
- claims that a result is objectively correct when it is AI-scored;
- vague labels such as `Magic` or `Smart mode` when the actual behavior can be named;
- technical provider terminology in learner-facing messages unless it helps the learner recover.

### State copy

Copy must reflect server truth.

Do not say a roadmap was recalibrated until the recalibration mutation succeeded. Do not say validation is the only completion mechanism while `Finish manually` remains available.

## 3. Visual Foundation

The global theme is defined in `packages/ui/src/styles/globals.css`.

### Typography

- Primary sans-serif: **Plus Jakarta Sans**
- Serif: **Lora**
- Monospace: **IBM Plex Mono**

Use the sans-serif stack for normal product UI. Serif and monospace should be intentional, not decorative defaults.

### Shape language

Synara currently uses a square, flat interface:

```css
--radius: 0rem;
```

Preserve square cards, inputs, chat bubbles, and panels unless a deliberate redesign changes the global design system.

Do not add arbitrary `rounded-xl`/`rounded-2xl` styling to product-specific elements simply because it is common in AI products.

### Color

Use semantic tokens such as:

- `bg-background`
- `text-foreground`
- `text-muted-foreground`
- `bg-primary`
- `text-primary-foreground`
- `border-border`
- `bg-muted`
- `text-destructive`

The primary palette is violet/purple through theme tokens. Avoid hard-coded brand hex values in product components when an existing semantic token is appropriate.

### Theme support

Light and dark theme tokens both exist. New UI must remain readable in both themes unless the page is intentionally fixed to one appearance.

### Shadows and borders

The design relies more on borders and spacing than large floating shadows.

Prefer bordered hierarchy over adding strong shadows to every card.

## 4. Shared UI Components

Reusable primitives belong in `packages/ui`. Product composition belongs in `apps/web`.

Prefer existing primitives from `@gemastik/ui`, including components such as:

- `Button`
- `Card`
- `Badge`
- `Drawer`
- `Input`
- `Tabs`
- `ScrollArea`
- `Skeleton`

Before creating a new primitive, check whether an existing shadcn-based component already covers the need.

Do not move a course-specific component into the shared UI package merely because it is large.

## 5. Layout Patterns

### Dashboard

Use the existing dashboard shell and sidebar composition rather than creating a separate page chrome.

### Course creation

The current pattern is a short five-step guided flow:

- bottom drawer on mobile;
- right-side drawer on larger screens.

Preserve the sequential interaction unless the product requirement changes. Do not turn it into a dense multi-field form solely for implementation convenience.

### Course workspace

On large screens the workspace is conceptually three areas:

1. roadmap navigation;
2. selected-node lesson;
3. tutor/validation coach panel.

Responsive changes should preserve access to all three concepts rather than simply hiding an entire capability on smaller screens.

### Dense learning UI

Use spacing, borders, headings, badges, and clear state text to establish hierarchy. Avoid excessive decorative gradients, floating ornaments, glassmorphism, or dashboard-card proliferation that does not improve learning flow.

## 6. Feedback States

Every async user action should have understandable states.

### Loading

Use skeletons for content surfaces and pending labels for mutations where appropriate.

### Empty

Empty states should explain what is missing and what the learner can do next.

### Error

Show a concise recoverable error message. Provider-specific diagnostics belong in server logs, not raw in the learner interface.

### Success

Use toasts for short mutation confirmation; persistent product state should also be visible in the actual page after query refresh.

### AI latency

A pending AI state should explain what is happening without pretending the result is guaranteed. Examples such as `Creating...` or `Thinking through ...` are appropriate.

## 7. Accessibility

- Preserve visible focus states from shared primitives.
- Use semantic buttons for actions and links for navigation.
- Associate form labels with controls.
- Avoid click handlers on non-interactive elements when a button is appropriate.
- Do not encode completion/error state by color alone; pair it with iconography or text.
- Preserve keyboard usability when composing Drawer, Tabs, Dialog, and similar primitives.
- Keep muted text sufficiently legible in both themes.

## 8. React and Component Conventions

### Product-specific components

Keep them under `apps/web/src/components` or close to their route when appropriate.

### State ownership

Use local React state for transient interface state such as:

- selected node;
- active tab;
- unsent textarea content;
- drawer step.

Use TanStack Query/tRPC state for server-owned data such as:

- roadmaps;
- lessons;
- tutor histories;
- validation sessions;
- completion status.

Avoid copying server state into local state unless there is a concrete editing/optimistic interaction need.

### Mutations

After a mutation:

- invalidate the narrowest affected queries; or
- update cached data directly when the mutation returns the authoritative next state.

Do not rely on stale UI state after a progress-changing mutation.

### Large components

Extract pieces when doing so creates a meaningful boundary, improves testability, or removes genuine duplication. Do not split components mechanically just to meet a line-count target.

`course-workspace.tsx` is currently large; future decomposition should preserve its data-flow clarity rather than scattering state across many wrappers.

## 9. TypeScript

- Prefer explicit domain types or types inferred from Zod/Drizzle/tRPC.
- Avoid new broad `any` usage.
- Use unions/enums for constrained state rather than free-form strings when the domain is known.
- Runtime validation is still required at external boundaries even when TypeScript types exist.
- Prefer readable function signatures over opaque object bags with unknown fields.
- Do not silence errors with type assertions solely to make checks pass.

### Formatting

The codebase contains mixed quote/indent conventions between areas. Preserve the local file convention and let project tooling drive formatting. Do not generate a repository-wide formatting diff as part of a feature task.

## 10. Imports and Package Boundaries

Use workspace package imports where the package already exposes the capability:

```ts
import { ... } from '@gemastik/ui/...'
import { ... } from '@gemastik/db/...'
import { ... } from '@gemastik/env/...'
```

Do not reach deep across package internals when a public package entry point exists.

Keep import changes scoped; historical package naming should not be opportunistically renamed.

## 11. tRPC and API Style

### Authentication

Use `protectedProcedure` for learner-owned product actions.

### Input validation

Define Zod input schemas at the API boundary. Trim/min/max constraints should reflect actual product requirements.

### Ownership

Never use a client-submitted user ID as authorization. Use authenticated `ctx.user.id` and constrain owned records accordingly.

### Business rules

Rules such as node completion, recalibration eligibility, and roadmap replacement belong in the API/service layer so they cannot be bypassed by alternative clients.

### Transactions

Use transactions when a mutation spans related rows and partial success would corrupt product state.

### Errors

Use concise domain errors at API boundaries. Avoid exposing database/provider implementation details directly to the learner.

## 12. Database Style

The current Drizzle convention is:

- camelCase property names in TypeScript;
- snake_case PostgreSQL column/table names;
- explicit foreign keys;
- indexes around common ownership/relationship access paths;
- JSONB for bounded structured data such as lesson content, metadata, and chat histories.

Do not put arbitrary unvalidated blobs into JSONB merely to avoid schema decisions. Keep JSON shapes typed and validated where they cross AI/API boundaries.

## 13. AI Prompt Style

AI prompts are part of the product contract and should be treated as code.

### Structured generation

For roadmap, lesson, and validation generation:

- explicitly state `Respond ONLY with valid JSON` or equivalent;
- show the expected schema;
- constrain enum values;
- specify key behavioral constraints;
- validate returned JSON with Zod before using it.

### Tutor prompts

Tutor context should be bounded to the active learning situation:

- overall goal;
- node title/type/difficulty/time;
- success criteria;
- relevant lesson content;
- current tutor history.

Keep the Tutor non-evaluative.

### Validator prompts

The Validator may score understanding, stumble state, and sentiment. Scoring rules should be explicit and stable enough that changes can be reasoned about and tested.

### Recalibration prompts

Preserve the goal and produce a replacement path for unfinished work. Prefer prerequisite bridging or reduced conceptual jumps over simply changing wording.

### Prompt changes

When changing scoring thresholds, output schemas, or recalibration semantics, update corresponding docs and verify downstream parsing/database assumptions.

## 14. Naming

### Product concepts

Preferred terms:

- course
- roadmap
- roadmap node / step
- lesson
- tutor
- Socratic validation
- competency score
- recalibration
- learning goal

Avoid introducing multiple names for the same concept without a product reason.

### IDs and fields

Use existing domain naming rather than creating aliases such as `module`, `unit`, or `chapter` for `roadmapNode` inside backend logic unless the model actually changes.

## 15. Documentation Style

Project docs should distinguish:

- implemented behavior;
- partial integration;
- schema-only groundwork;
- planned/aspirational design.

Do not use future design documents as evidence of completed functionality.

Prefer concrete procedure/table/component names when they help future maintainers verify a claim.

## 16. Avoid These Patterns

- hard-coded user IDs;
- client-only authorization;
- unvalidated Gemini JSON;
- fake-success fallback after a failed state-changing AI operation;
- generating the same persisted lesson every visit;
- broad architecture rewrites for a small feature;
- adding large dependencies for trivial UI behavior;
- arbitrary rounded cards that break the current square visual system;
- hard-coded colors that ignore theme tokens;
- mixed-language UI copy introduced accidentally;
- overclaiming RLS, cognitive profiling, artifact verification, or fully automatic recalibration before those flows exist end to end.
