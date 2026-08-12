# Synara Style Guide

## 1. Purpose

This guide defines Synara's product-facing visual, interaction, copy, and implementation conventions.

Synara is an adaptive learning workspace for students, not a generic administration dashboard and not an open-ended AI chat product. The interface must help learners understand three things quickly:

1. **Where am I in the learning path?**
2. **What should I focus on now?**
3. **What should I do next?**

Every design decision should reduce avoidable choice, visual competition, and context switching.

## 2. Design Direction

### Product genre

Synara should feel like a **calm technical learning workspace**.

The intended character is:

- structured, but not rigid;
- technical, but not intimidating;
- supportive, but not playful or childish;
- focused, but not visually empty;
- AI-assisted, without looking like a generic chatbot.

Avoid drifting toward either extreme:

- **admin/SaaS dashboard:** dense cards, equal-weight metrics, excessive borders, raw system telemetry; or
- **playful consumer edtech:** oversized illustrations, gamification-first visuals, excessive celebration, decorative gradients.

The visual system should make the learning path feel dependable and understandable.

## 3. Core UX Principles

### 3.1 One primary learning decision at a time

A screen may contain multiple capabilities, but only one should visually dominate.

The learner should not have to decide between many equally prominent actions. Use hierarchy and progressive disclosure to make the next useful action obvious.

### 3.2 Roadmap as learning navigation

The roadmap is not merely a list of modules. It communicates:

- prerequisite order;
- current position;
- completed work;
- locked future work; and
- adaptive/remedial changes.

Roadmap state should be understandable before reading detailed text.

### 3.3 Lesson first, assistance second

Inside a course, the lesson is the primary workspace. Tutor and validation are supporting layers.

Do not give roadmap, lesson, tutor, validation, and system metrics equal visual weight.

### 3.4 Translate telemetry into useful feedback

Internal adaptive signals such as stumble count, sentiment values, time ratios, or stagnation scores are system inputs, not primary learner-facing content.

Prefer:

> This step is taking more effort than expected. We can reinforce the prerequisites before continuing.

Instead of:

> Sentiment: 0.24, Stumbles: 4, Stagnation Score: 65.

Raw values may appear in developer/admin diagnostics, but normal learner UI should communicate meaning and action.

### 3.5 Adapt without punishment

Recalibration should feel like the system is improving the route, not declaring learner failure.

Prefer language such as:

- `Adjust learning path`
- `Review a prerequisite first`
- `We adjusted the next steps`
- `Try a more guided path`

Avoid language such as:

- `You failed`
- `Bad performance`
- `High frustration detected`

## 4. Product Language

### Canonical name

Use **Synara** in all new learner-facing copy and project documentation.

Historical implementation names such as `gemastik`, `@gemastik/*`, and `Gradio Engine` may remain in code until a deliberate rename is scoped.

### UI language

The current product UI is English. Keep learner-facing copy consistently English unless localization is intentionally introduced.

### Tone

Use concise, calm, instructional language.

Prefer:

- `Continue learning`
- `Validate understanding`
- `Review prerequisite`
- `Adjust learning path`
- `Course saved as draft`
- `Unable to generate the roadmap. Try again.`

Avoid:

- AI hype such as `magical`, `super smart`, or `genius mode`;
- provider terminology unless needed for recovery;
- vague calls to action such as `Go`, `Do it`, or `Magic`;
- overconfident claims about AI-generated evaluation.

### State copy

Copy must reflect actual server state.

Do not say a node is completed before persistence succeeds. Do not say a roadmap was recalibrated before replacement nodes are successfully stored.

## 5. Visual Foundation

The shared theme lives in `packages/ui/src/styles/globals.css`.

### 5.1 Typography

Primary UI font:

- **Plus Jakarta Sans** for navigation, controls, cards, and normal application copy.

Supporting fonts:

- **IBM Plex Mono** for code, commands, technical identifiers, or terminal-style learning examples.
- **Lora** should be used sparingly, only when an editorial learning surface genuinely benefits from it. It should not become a decorative display font throughout the dashboard.

For lesson content, prioritize reading comfort:

- body size approximately 14-16px depending on viewport;
- comfortable line-height around 1.55-1.7;
- avoid very wide text columns;
- preserve strong heading hierarchy.

### 5.2 Shape language

The previous fully square `0rem` radius makes the interface feel closer to a technical administration tool than a supportive learning workspace.

The target system should use **soft, restrained geometry**.

Recommended base token:

```css
--radius: 0.625rem;
```

Guidance:

- normal cards/panels: medium radius;
- inputs/buttons: small-to-medium radius;
- status badges may use pill-like styling where useful;
- avoid excessive `rounded-2xl` or oversized bubble shapes;
- avoid mixing fully square and very rounded surfaces arbitrarily.

The goal is subtle softness, not a bubbly consumer-app aesthetic.

### 5.3 Color

Keep violet/purple as the Synara primary accent.

Use the primary color intentionally for:

- current learning step;
- primary action;
- active navigation;
- progress emphasis;
- selected state.

Do not use purple on every border or decorative surface.

State colors should remain semantic:

- success: completed/mastered;
- attention: needs support or recalibration;
- destructive: actual failure/error states;
- muted: locked, secondary, inactive content.

Avoid gradients unless they provide a clear state or information benefit. Synara does not need decorative AI gradients to communicate that it uses AI.

### 5.4 Surfaces, borders, and shadows

Use **fewer containers with clearer hierarchy**.

Prefer:

- one strong page/workspace surface;
- whitespace and section spacing inside it;
- subtle separators;
- low-contrast supporting panels.

Avoid:

- card inside card inside card;
- borders around every paragraph or concept;
- multiple adjacent panels with identical visual weight;
- heavy floating shadows.

Shadows should remain subtle. Structure should primarily come from spacing, typography, surface contrast, and selective borders.

### 5.5 Light and dark mode

Both themes must remain supported and readable.

The current dark presentation is suitable for technical learning content and demos, but dark mode is not itself the product identity. Features must not rely on dark-only contrast assumptions.

## 6. Information Density

Synara exists partly to reduce decision fatigue, so information density must be controlled intentionally.

### Show first

- current course or node;
- progress;
- next action;
- current lesson objective;
- prerequisite or adaptive state when relevant.

### De-emphasize

- creation date;
- detailed metadata;
- learning-style labels once they no longer affect the immediate task;
- raw adaptive telemetry;
- technical system status.

### Hide until needed

- detailed score breakdowns;
- complete AI diagnostics;
- historic intervention logs;
- secondary course metadata;
- long resource explanations.

## 7. Dashboard Pattern

The dashboard should follow three clear zones.

### Zone 1 - Progress overview

At the top, provide a compact overview of the active learning journey.

Recommended information:

- overall completion percentage;
- active course;
- current step;
- estimated remaining effort/time when the estimate is trustworthy.

Avoid turning this into a KPI grid with many unrelated cards.

### Zone 2 - Learning roadmap

Show the learning sequence as a visual path or timeline.

Each node must visibly communicate one of these states:

- `completed`
- `current`
- `available`
- `locked`
- `needs-support` / `recalibrating` when applicable

For the MVP, a horizontal scrollable timeline is preferred on desktop if it remains readable. A vertical sequence is acceptable on narrow screens.

Locked nodes must look unavailable and must not behave like normal clickable nodes.

### Zone 3 - Continue learning

Provide one prominent action to resume the active node.

Secondary recommendations may appear only when they genuinely help the learner. Avoid presenting several alternative courses or next actions with equal prominence.

### Course cards

Course cards should prioritize:

1. title/topic;
2. current progress;
3. current or next step;
4. one concise pace/status signal.

Metadata such as weekly hours, learning style, node count, and created date should not all compete at the same level.

## 8. Course Workspace Pattern

The course workspace should preserve three concepts but not three equal visual priorities.

### Desktop hierarchy

Conceptually:

```text
Roadmap navigation | Primary lesson workspace | Contextual coach
```

Recommended emphasis:

- roadmap: narrow navigation/supporting column;
- lesson: dominant reading/work area;
- coach: secondary contextual panel.

The lesson area should receive the most width and visual weight.

### Roadmap panel

Show:

- step number;
- concise title;
- prerequisite/order state;
- completion/current/locked indicator;
- estimated time only when useful.

Do not overload each row with every piece of node metadata.

### Lesson surface

Lesson content should feel closer to an editorial reading surface than a dashboard card stack.

Use clear sections:

- overview;
- key concepts;
- guided steps;
- practice;
- trusted resources;
- success criteria.

Avoid putting each individual concept or sentence in its own bordered rectangle.

### Coach panel

Tutor and Socratic validation may share one panel, but their roles must be visually distinct.

**Tutor** = help me understand.

**Validation** = check whether I am ready to continue.

On medium screens, the coach panel may collapse into a drawer/sheet. On mobile, tutor and validation should use tabs or dedicated full-width states rather than squeezing three columns.

### Validation results

Normal learner UI should emphasize outcome and next action:

- `Ready to continue`
- `Review this concept once more`
- `A prerequisite may need reinforcement`

A numeric competency score may appear as secondary detail if needed, but raw stumble/sentiment telemetry should not be presented as the main feedback.

## 9. Node Progression and Mastery States

The visual model must match prerequisite behavior.

### Completed

- clearly marked as complete;
- readable but visually quieter than current step.

### Current

- strongest roadmap emphasis;
- primary accent;
- obvious `Continue` or `Open` action.

### Available

- accessible but secondary to current.

### Locked

- disabled interaction;
- muted state;
- explain the prerequisite when useful.

Example:

> Complete "TypeScript Core Concepts" before opening this step.

### Needs support / recalibration

Use an attention state, not a destructive error state.

Provide one clear action such as:

- `Review prerequisite`
- `Adjust learning path`

## 10. Adaptive Intervention UI

Adaptive behavior is a core Synara differentiator and must be visible without overwhelming the learner.

### Light support

Use small inline guidance:

> Need a simpler explanation? Review a worked example first.

### Remediation

When the system inserts prerequisite micro-nodes, visually explain that the path has been adjusted.

Example:

> We added two short prerequisite steps before continuing this topic.

### Recalibration

The learner should see:

- that the current route is being adjusted;
- why in plain language;
- what changed after completion;
- how to continue.

Avoid exposing the entire scoring formula during normal learning.

## 11. Onboarding / Initial Skill Profiling

Synara captures five core inputs:

- topic;
- current level;
- learning goal;
- weekly time commitment;
- preferred learning style.

To reduce perceived effort, group these into **three logical stages** rather than presenting a dense form:

### Step 1 - Goal

- topic;
- why the learner wants to learn it.

### Step 2 - Starting point

- current level;
- preferred learning style.

### Step 3 - Commitment

- weekly learning time;
- short review/confirmation.

Use a clear progress indicator. Do not ask for information that does not affect roadmap generation or adaptation.

## 12. Learning Resources

Resources presented as trusted/curated must clearly identify their source.

Each displayed resource should eventually support:

- title;
- source/provider;
- URL;
- type;
- recommended level;
- short reason it is relevant.

Do not present AI-invented resource names as though they are verified external references.

Official documentation, verified tutorials, and open courseware should visually communicate source credibility without creating a complicated rating interface.

## 13. Feedback States

Every async action must provide understandable feedback.

### Loading

Use skeletons for page-level content and concise pending labels for mutations.

For AI operations, state what is happening:

- `Building your roadmap...`
- `Preparing this lesson...`
- `Adjusting the next steps...`

### Empty

Explain both the state and next action.

### Error

Provide a recoverable message. Provider diagnostics belong in server logs.

### Success

Use toasts for short confirmation, but important state changes must also be visible in the persistent UI.

## 14. Accessibility

- Maintain visible keyboard focus.
- Use semantic buttons for actions and links for navigation.
- Associate labels and form controls correctly.
- Never communicate completion, locking, or error by color alone.
- Maintain readable contrast in both themes.
- Preserve keyboard behavior of Drawer, Tabs, Dialog, and similar primitives.
- Do not use disabled-looking elements that remain interactable.

## 15. Shared UI and Component Boundaries

Reusable primitives belong in `packages/ui`. Product-specific composition belongs in `apps/web`.

Prefer existing shadcn-based primitives before creating new low-level components.

Do not move a course-specific component into the shared UI package merely because it is large.

## 16. React and State Conventions

Use local React state for transient interface state such as:

- selected node;
- active coach tab;
- drawer step;
- unsent text input.

Use tRPC/TanStack Query for server-owned data such as:

- roadmaps;
- node content;
- tutor history;
- validation sessions;
- progress;
- adaptive state.

After state-changing mutations, update or invalidate only the affected queries.

Do not duplicate authoritative server state into local React state without a concrete interaction reason.

## 17. TypeScript, API, and Data Boundaries

- Prefer explicit domain types or types inferred from Zod/Drizzle/tRPC.
- Avoid new broad `any` usage.
- Validate external and AI-generated data at runtime.
- Use `protectedProcedure` for learner-owned actions.
- Derive ownership from authenticated `ctx.user.id`, never a client-submitted user ID.
- Keep mastery, locking, stagnation, and recalibration rules in the server/business layer so they cannot be bypassed by alternative clients.
- Use database transactions when multi-row learning-state changes must succeed atomically.

## 18. AI Prompt Conventions

AI prompts are part of the product contract.

For structured generation:

- require valid JSON;
- define the expected schema;
- constrain enum values;
- validate outputs before persistence.

### Tutor

Tutor should explain and unblock, not grade.

### Socratic Validator

Validator may evaluate understanding and produce internal learning signals. Learner-facing copy should translate those signals into meaningful feedback.

### Recalibration

Recalibration must preserve the original learning goal and completed work while reducing conceptual jumps or adding prerequisites.

## 19. Naming

Preferred product concepts:

- course
- roadmap
- node / step
- prerequisite
- lesson
- tutor
- Socratic validation
- mastery
- stagnation
- remediation
- recalibration
- learning goal

Avoid adding parallel names such as `module`, `chapter`, and `unit` for the same backend concept unless the domain model actually changes.

## 20. Patterns to Avoid

- fully square technical-dashboard styling across the entire product;
- arbitrary `rounded-2xl` cards mixed with square components;
- dense KPI grids on learner pages;
- card-inside-card visual fragmentation;
- giving roadmap, lesson, tutor, and validation equal visual weight;
- raw sentiment/stumble/stagnation telemetry as primary learner feedback;
- unlocked future nodes when prerequisites are part of the learning contract;
- decorative AI gradients and excessive purple accents;
- AI-generated resource descriptions presented as verified sources;
- mixed-language UI copy introduced accidentally;
- client-only authorization or mastery rules;
- unvalidated Gemini JSON;
- overclaiming adaptive behavior that is not connected end to end.

## 21. Design Review Checklist

Before merging learner-facing UI changes, verify:

1. What is the single primary action on this screen?
2. Can the learner identify current progress and next step quickly?
3. Are future/prerequisite states visually clear?
4. Is any internal telemetry exposed without helping the learner decide what to do?
5. Can a border, badge, card, or label be removed without losing meaning?
6. Does the layout remain usable in light and dark themes?
7. Does the UI reflect actual server state?
8. Does the feature reduce rather than add avoidable choices?

If the answer to the last question is no, the interface is working against Synara's product goal.