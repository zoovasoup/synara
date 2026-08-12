# Synara Style Guide

## 1. Purpose

This guide defines Synara's product-facing visual, interaction, copy, and implementation conventions.

Synara is an adaptive learning workspace for students, not a generic administration dashboard and not an open-ended AI chat product.

The interface must help learners understand three things quickly:

1. Where am I in the learning path?
2. What should I focus on now?
3. What should I do next?

Every design decision should reduce avoidable choice, visual competition, and context switching.

---

## 2. Design Direction

### Product Genre

Synara should feel like a calm technical learning workspace.

The intended character is:

- structured, but not rigid;
- technical, but not intimidating;
- supportive, but not playful or childish;
- focused, but not visually empty;
- AI-assisted, without looking like a generic chatbot.

Avoid drifting toward either extreme:

- Admin/SaaS dashboard:
  dense cards, equal-weight metrics, excessive borders, and raw system telemetry.

- Playful consumer edtech:
  oversized illustrations, gamification-first visuals, excessive celebration, and decorative gradients.

The visual system should make the learning path feel dependable and understandable.

---

## 3. Core UX Principles

### 3.1 One Primary Learning Decision at a Time

A screen may contain multiple capabilities, but only one should visually dominate.

The learner should not have to choose between many equally prominent actions.

Use hierarchy and progressive disclosure to make the next useful action obvious.

### 3.2 Roadmap as Learning Navigation

The roadmap is not merely a list of modules.

It communicates:

- prerequisite order;
- current position;
- completed work;
- locked future work;
- adaptive or remedial changes.

Roadmap state should be understandable before the learner reads detailed text.

### 3.3 Lesson First, Assistance Second

Inside a course, the lesson is the primary workspace.

Tutor and Socratic Validation are supporting layers.

Do not give roadmap, lesson, tutor, validation, and system metrics equal visual weight.

### 3.4 Translate Telemetry into Useful Feedback

Internal adaptive signals such as:

- stumble count;
- sentiment score;
- time ratio;
- stagnation score;
- backtrack count;

are system inputs, not primary learner-facing content.

Prefer:

"This step is taking more effort than expected. We can reinforce the prerequisites before continuing."

Instead of:

"Sentiment: 0.24, Stumbles: 4, Stagnation Score: 65."

Raw values may appear in developer or diagnostic interfaces, but normal learner UI should communicate meaning and action.

### 3.5 Adapt Without Punishment

Recalibration should feel like the system is improving the learning route, not declaring learner failure.

Prefer:

- Adjust learning path
- Review a prerequisite first
- We adjusted the next steps
- Try a more guided path

Avoid:

- You failed
- Bad performance
- High frustration detected

---

## 4. Product Language

### Canonical Name

Use Synara in all new learner-facing copy and project documentation.

Historical implementation names such as:

- gemastik
- @gemastik/\*
- Gradio Engine

may remain in code until a deliberate rename is scoped.

### UI Language

The current product UI is English.

Keep learner-facing copy consistently English unless localization is intentionally introduced.

### Tone

Use concise, calm, instructional language.

Prefer:

- Continue learning
- Validate understanding
- Review prerequisite
- Adjust learning path
- Course saved as draft
- Unable to generate the roadmap. Try again.

Avoid:

- AI hype such as "magical", "super smart", or "genius mode";
- provider terminology unless needed for recovery;
- vague actions such as "Go", "Do it", or "Magic";
- overconfident claims about AI-generated evaluation.

### State Copy

Copy must reflect actual server state.

Do not say a node is completed before persistence succeeds.

Do not say a roadmap was recalibrated before replacement nodes are successfully stored.

---

## 5. Visual Foundation

The shared theme lives in:

packages/ui/src/styles/globals.css

### 5.1 Typography

Primary UI font:

- Plus Jakarta Sans

Use it for:

- navigation;
- controls;
- cards;
- normal application copy.

Supporting fonts:

- IBM Plex Mono:
  code, commands, technical identifiers, or terminal-style learning examples.

- Lora:
  use sparingly when an editorial learning surface genuinely benefits from it.

For lesson content:

- body size approximately 14-16px;
- comfortable line-height around 1.55-1.7;
- normal body and control copy uses natural letter spacing around `0em`;
- slight negative tracking is reserved for headings and applied locally;
- uppercase eyebrow labels may use modest positive tracking;
- avoid overly wide text columns;
- maintain clear heading hierarchy.

### 5.2 Shape Language

The previous fully square interface makes Synara feel closer to a technical administration tool than a supportive learning workspace.

The target system should use soft, restrained geometry.

Recommended base token:

--radius: 0.625rem;

Guidance:

- normal cards and panels: medium radius;
- inputs and buttons: small-to-medium radius;
- status badges may use pill styling;
- avoid excessive rounded-2xl surfaces;
- avoid mixing fully square and heavily rounded components arbitrarily.

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

- success:
  completed or mastered;

- attention:
  needs support or recalibration;

- destructive:
  actual errors;

- muted:
  locked, secondary, or inactive content.

Avoid decorative AI gradients.

Synara does not need gradients to communicate that it uses AI.

### 5.4 Surfaces, Borders, and Shadows

Use fewer containers with clearer hierarchy.

Prefer:

- one strong workspace surface;
- whitespace;
- section spacing;
- subtle separators;
- low-contrast supporting panels.

Avoid:

- card inside card inside card;
- borders around every concept or paragraph;
- several adjacent panels with identical visual weight;
- heavy floating shadows.

Hierarchy should primarily come from:

- spacing;
- typography;
- surface contrast;
- selective borders.

### 5.5 Light and Dark Mode

Both themes must remain supported.

Dark mode works well for technical learning content and demos, but dark mode should not become Synara's only visual identity.

---

## 6. Information Density

Synara exists partly to reduce decision fatigue.

Information density must therefore be controlled intentionally.

### Show First

- current course or node;
- progress;
- next action;
- current lesson objective;
- prerequisite or adaptive state when relevant.

### De-emphasize

- creation date;
- secondary metadata;
- learning-style labels after onboarding;
- raw adaptive telemetry;
- technical system status.

### Hide Until Needed

- detailed score breakdowns;
- AI diagnostics;
- intervention history;
- secondary course metadata;
- long resource explanations.

---

## 7. Dashboard Pattern

The dashboard should follow three clear zones.

### Zone 1 — Progress Overview

Provide a compact overview of the learner's active journey.

Recommended information:

- overall completion percentage;
- active course;
- current step;
- estimated remaining effort or time when trustworthy.

Avoid turning this section into a large KPI grid.

### Zone 2 — Learning Roadmap

Show the learning sequence as a visual path or timeline.

Each node should communicate one of these states:

- completed;
- current;
- available;
- locked;
- needs support;
- recalibrating.

For desktop, a horizontal scrollable roadmap is preferred if it remains readable.

For narrow screens, a vertical sequence is acceptable.

Locked nodes must:

- look unavailable;
- be non-interactive;
- communicate the prerequisite when appropriate.

### Zone 3 — Continue Learning

Provide one prominent action to resume the active node.

Secondary recommendations should not compete with the primary continuation action.

### Course Cards

Course cards should prioritize:

1. topic or course title;
2. progress;
3. current or next step;
4. one concise pace or status signal.

Avoid giving equal emphasis to:

- weekly hours;
- learning style;
- node count;
- created date;
- status;
- progress;

all at once.

---

## 8. Course and Node Workspace Pattern

Navigation and learning should not compete for attention. The learner selects a step from the roadmap, then enters a dedicated learning context.

### Course Overview

The course page is roadmap-first. Its primary visual element is an interactive, honest representation of the linear `orderIndex` path.

The course overview should show concise goal, pace, progress, and connected completed/current/locked nodes. It must not embed the full lesson or permanent support controls.

### Interactive Roadmap

Show:

- step number;
- concise title;
- prerequisite/order state;
- completion/current/locked indicator;
- estimated time when useful.

Do not overload each roadmap row with all available metadata.

The roadmap may use a vertical or gently alternating connected path on desktop and a vertical connected path on mobile. It must not imply branches or dependency relationships that the product does not implement.

### Node Workspace

The node route is a dedicated lesson-first page. Do not keep a permanent roadmap sidebar beside the lesson. Provide a clear Back to roadmap action, then center the lesson in a focused reading column.

Lesson content should feel closer to an editorial reading surface than a dashboard card stack.

Recommended sections:

- overview;
- key concepts;
- guided steps;
- practice;
- trusted resources;
- success criteria.

Avoid placing every concept or sentence in its own bordered rectangle.

### Contextual Support

Assistance uses progressive disclosure. The lesson remains the default center of attention; Tutor and Validation appear in an accessible Sheet, Drawer, or equivalent surface only when intentionally requested.

If Tutor and Validation share a support surface, their roles must remain visibly distinct.

Tutor:

"Help me understand."

Validation:

"Check whether I am ready to continue."

Tutor and Validation remain available from lesson actions on every viewport. They do not appear as permanent columns or compete with lesson consumption.

### Validation Results

Learner-facing feedback should emphasize outcome and next action.

Examples:

- Ready to continue
- Review this concept once more
- A prerequisite may need reinforcement

Numeric competency score may remain secondary.

Raw stumble and sentiment telemetry should not be presented as primary feedback.

---

## 9. Node Progression and Mastery States

The visual model must match prerequisite behavior.

### Completed

- clearly marked as complete;
- visually quieter than the current node;
- remains accessible for review.

### Current

- strongest roadmap emphasis;
- primary accent;
- clear Continue or Open action.

### Available

- accessible;
- secondary to current.

### Locked

- disabled interaction;
- muted state;
- explain prerequisite when useful.

Example:

"Complete 'TypeScript Core Concepts' before opening this step."

### Needs Support / Recalibration

Use an attention state rather than destructive error styling.

Provide one clear action such as:

- Review prerequisite
- Adjust learning path

---

## 10. Adaptive Intervention UI

Adaptive behavior is a core Synara differentiator.

It should be visible without overwhelming the learner.

### Light Support

Use small inline guidance.

Example:

"Need a simpler explanation? Review a worked example first."

### Remediation

When prerequisite micro-nodes are inserted, explain the change.

Example:

"We added two short prerequisite steps before continuing this topic."

### Recalibration

The learner should understand:

- that the route is being adjusted;
- why in simple language;
- what changed;
- how to continue.

Do not expose the entire stagnation scoring formula during normal learning.

---

## 11. Onboarding / Initial Skill Profiling

Synara captures five core inputs:

- topic;
- current level;
- learning goal;
- weekly time commitment;
- preferred learning style.

To reduce perceived effort, group them into three logical stages.

### Step 1 — Goal

- topic;
- motivation or learning goal.

### Step 2 — Starting Point

- current level;
- preferred learning style.

### Step 3 — Commitment

- weekly learning time;
- short review and confirmation.

Use a clear progress indicator.

Do not ask for information that does not affect roadmap generation or adaptation.

---

## 12. Learning Resources

Resources presented as trusted or curated must clearly identify their source.

Each resource should eventually support:

- title;
- source/provider;
- URL;
- type;
- recommended level;
- short relevance explanation.

Do not present AI-invented resource names as verified external references.

Official documentation, verified tutorials, and open courseware should communicate credibility clearly without requiring a complex rating interface.

---

## 13. Feedback States

Every async action must provide understandable feedback.

### Loading

Use skeletons for content surfaces and concise pending labels for mutations.

For AI operations:

- Building your roadmap...
- Preparing this lesson...
- Adjusting the next steps...

### Empty

Explain:

- what is missing;
- what the learner can do next.

### Error

Provide a recoverable learner-facing message.

Provider diagnostics belong in server logs.

### Success

Use toasts for short confirmation.

Important state changes must also remain visible in persistent UI.

---

## 14. Accessibility

- Maintain visible keyboard focus.
- Use semantic buttons for actions.
- Use links for navigation.
- Associate labels and controls correctly.
- Never communicate completion, locking, or error by color alone.
- Maintain readable contrast in light and dark mode.
- Preserve keyboard behavior of Drawer, Tabs, Dialog, and similar primitives.
- Do not use disabled-looking elements that remain interactive.

---

## 15. Shared UI and Component Boundaries

Reusable primitives belong in packages/ui.

Product-specific composition belongs in apps/web.

Prefer existing shadcn-based primitives before creating new low-level components.

Do not move a course-specific component into packages/ui merely because it is large.

---

## 16. React and State Conventions

Use local React state for transient UI state such as:

- selected node;
- active coach tab;
- onboarding step;
- unsent text input.

Use tRPC and TanStack Query for server-owned state such as:

- roadmaps;
- node content;
- tutor history;
- validation sessions;
- progress;
- adaptive status.

After state-changing mutations, update or invalidate only affected queries.

Do not duplicate authoritative server state into local state without a concrete interaction reason.

---

## 17. TypeScript, API, and Data Boundaries

- Prefer explicit domain types or types inferred from Zod, Drizzle, or tRPC.
- Avoid new broad any usage.
- Validate external and AI-generated data at runtime.
- Use protectedProcedure for learner-owned actions.
- Derive ownership from authenticated ctx.user.id.
- Keep mastery, locking, stagnation, and recalibration rules in the server/business layer.
- Use database transactions when related learning-state changes must succeed atomically.

---

## 18. AI Prompt Conventions

AI prompts are part of the product contract.

For structured generation:

- require valid JSON;
- define the expected schema;
- constrain enum values;
- validate returned data before persistence.

### Tutor

Tutor should:

- explain;
- clarify;
- unblock.

Tutor should not grade.

### Socratic Validator

Validator may:

- evaluate understanding;
- produce competency information;
- produce adaptive signals.

Learner-facing copy should translate those signals into meaningful feedback.

### Recalibration

Recalibration must:

- preserve the original learning goal;
- preserve completed work;
- reduce conceptual jumps;
- add prerequisites where appropriate.

---

## 19. Naming

Preferred product concepts:

- course;
- roadmap;
- node / step;
- prerequisite;
- lesson;
- tutor;
- Socratic Validation;
- mastery;
- stagnation;
- remediation;
- recalibration;
- learning goal.

Avoid introducing parallel names such as:

- module;
- chapter;
- unit;

for the same backend concept unless the domain model changes.

---

## 20. Patterns to Avoid

Avoid:

- fully square technical-dashboard styling across the entire product;
- arbitrary rounded-2xl cards mixed with square components;
- dense KPI grids on learner pages;
- card-inside-card visual fragmentation;
- giving roadmap, lesson, tutor, and validation equal visual weight;
- permanently showing Tutor or Validation controls beside the lesson before the learner requests support;
- globally compressing normal body copy with negative letter spacing;
- exposing raw sentiment, stumble, or stagnation telemetry as primary learner feedback;
- unlocked future nodes when prerequisites are part of the learning contract;
- decorative AI gradients;
- excessive purple accents;
- AI-generated resource descriptions presented as verified sources;
- mixed-language UI copy;
- client-only authorization or mastery rules;
- unvalidated Gemini JSON;
- overclaiming adaptive behavior that is not connected end-to-end.

---

## 21. Design Review Checklist

Before merging learner-facing UI changes, verify:

1. What is the single primary action on this screen?
2. Can the learner identify current progress quickly?
3. Can the learner identify the next step quickly?
4. Are prerequisite states visually clear?
5. Is internal telemetry exposed without helping the learner decide?
6. Can a border, card, badge, or label be removed without losing meaning?
7. Does the layout remain usable in both themes?
8. Does the UI reflect actual server state?
9. Does this change reduce rather than add avoidable choices?

If the answer to the final question is no, the interface is working against Synara's product goal.
