# Synara UI Design Guidelines

Use this document as the visual source of truth for frontend work.

Synara should feel like a calm guided learning workspace: focused, spacious, technical, and supportive.

It must not feel like an admin dashboard, generic AI chat, or gamified learning app.

---

## 1. Core Principles

- Prioritize readability and focus over decoration.
- Keep one clear primary action per context.
- Use generous negative space.
- Use progressive disclosure for secondary actions.
- Keep visual hierarchy obvious.
- Prefer open layouts over excessive cards.
- Keep interactions calm and predictable.
- Avoid unnecessary metadata, labels, and repeated explanations.
- Support both light and dark themes.
- Preserve application behavior during visual changes.

---

## 2. Visual Direction

Synara should feel:

- calm;
- modern;
- structured;
- spacious;
- technical;
- trustworthy.

Prefer:

- editorial learning layouts;
- documentation-like readability;
- restrained surfaces;
- simple directional progress;
- subtle visual hierarchy.

Avoid:

- dense dashboards;
- excessive cards;
- gamification;
- neon AI aesthetics;
- glassmorphism;
- heavy gradients;
- decorative complexity.

---

## 3. Color System

Synara uses neutral surfaces with a restrained violet accent.

### Light Theme

| Token          | Hex       |
| -------------- | --------- |
| Background     | `#F7F7FA` |
| Surface        | `#FFFFFF` |
| Surface Muted  | `#F1F2F6` |
| Text Primary   | `#202126` |
| Text Secondary | `#6B6F7A` |
| Border         | `#E1E3EA` |
| Primary        | `#6D5DFB` |
| Primary Hover  | `#5848E8` |
| Success        | `#4E8F6A` |
| Attention      | `#B98535` |
| Destructive    | `#B94A48` |

### Dark Theme

| Token          | Hex       |
| -------------- | --------- |
| Background     | `#17181D` |
| Surface        | `#1F2128` |
| Surface Muted  | `#272A33` |
| Text Primary   | `#F2F3F5` |
| Text Secondary | `#A7ABB6` |
| Border         | `#343743` |
| Primary        | `#8B7CFF` |
| Primary Hover  | `#9D90FF` |
| Success        | `#66A982` |
| Attention      | `#D1A154` |
| Destructive    | `#D66B68` |

Rules:

- Use violet only for meaningful active states and primary actions.
- Do not use pure black as the primary dark background.
- Do not use pure white as every light-theme surface.
- Use semantic colors only for their intended states.
- Avoid high-saturation colors.

---

## 4. Typography

Primary font:

- **Plus Jakarta Sans**

Supporting fonts:

- **IBM Plex Mono** for code, commands, and technical identifiers.
- **Lora** only when serif typography genuinely improves editorial learning content.

Recommended hierarchy:

| Type          | Guidance                            |
| ------------- | ----------------------------------- |
| Page title    | Strong, compact, not oversized      |
| Section title | Medium to semibold                  |
| Body          | `15–16px`, normal weight            |
| Metadata      | Smaller and muted                   |
| Eyebrow       | Small uppercase with wider tracking |

Body text:

- use natural letter spacing;
- use approximately `1.6–1.75` line height;
- avoid excessive bold text.

Do not globally apply negative letter spacing to body copy.

---

## 5. Layout and Container System

Synara should use one consistent horizontal page grid across the authenticated application.

Major page content should not shift left or right when navigating between Dashboard, Roadmap, and Learning pages unless the layout intentionally requires a different composition.

### Main Page Container

Use one shared outer content container for normal application pages.

Recommended desktop container:

- maximum width: `1280px`;
- centered within the available main-content area;
- consistent horizontal gutters.

Recommended page gutters:

| Viewport      | Horizontal gutter |
| ------------- | ----------------: |
| `< 640px`     |            `16px` |
| `640–1023px`  |            `24px` |
| `1024–1279px` |            `32px` |
| `>= 1280px`   |            `40px` |

Dashboard, course overview, roadmap, and learning pages should share the same outer container alignment.

The left edge of major page content should remain visually stable when navigating between these pages.

---

### Page Width and Content Width

The outer page container and the width of the content inside it are separate concepts.

A page may contain narrower content without changing the alignment of the page itself.

For example:

    Main page container
    ┌──────────────────────────────────────────────────────────────┐
    │                                                              │
    │  Reading content                                             │
    │  ┌──────────────────────────────┐                            │
    │  │                              │                            │
    │  │  Lesson text                 │                            │
    │  │                              │                            │
    │  └──────────────────────────────┘                            │
    │                                                              │
    └──────────────────────────────────────────────────────────────┘

Do not create a new independently centered page container simply because one section needs a narrower width.

---

### Reading Width

Long-form learning content should use a narrower reading measure for readability.

Recommended reading width:

- `68–76ch`;
- approximately `680–800px`.

The reading column should normally align with the left edge of the shared page grid.

Do not independently center the reading column if doing so causes the page content to shift horizontally compared with other authenticated pages.

---

### Wide Content

Content that benefits from more horizontal space may use most or all of the shared page container.

Examples:

- learning roadmaps;
- progress visualization;
- course overview;
- tables;
- diagrams;
- interactive learning artifacts.

Wide content should still respect the same outer page grid and gutters.

Do not extend individual sections beyond the shared page container without a deliberate full-bleed reason.

---

### Alignment Rules

The following elements should normally share the same left alignment:

- back navigation;
- page title;
- primary page description;
- status or adaptive notices;
- major page sections;
- primary content area.

Narrower child content may exist inside the page container, but it should not redefine the horizontal alignment of the page.

Avoid arbitrary combinations of independently centered:

- `max-width` containers;
- cards;
- headers;
- reading columns;
- alerts;
- section wrappers.

Do not use different outer `max-width` values on different authenticated pages merely to make individual screens look balanced.

---

### Visual Consistency

When moving between major pages, the horizontal anchor should remain stable.

Preferred:

    Dashboard
        | content starts

    Roadmap
        | content starts

    Learning
        | content starts
        | ┌──────── reading column ────────┐
        | │                                │
        | │ lesson content                 │
        | │                                │
        | └────────────────────────────────┘

Avoid:

    Dashboard
             | content starts

    Roadmap
        | content starts

    Learning
                    | content starts

The layout should feel like different views inside the same product, not separate applications with unrelated grids.

---

### Exceptions

Independent centering is appropriate for genuinely self-contained experiences such as:

- authentication forms;
- dialogs;
- modal content;
- compact empty states;
- focused setup flows.

These exceptions should not redefine the horizontal grid of normal authenticated application pages.

---

## 6. Reading Content

Learning content should feel editorial.

Recommended reading width:

- approximately `68–76ch`;
- roughly `680–800px`.

Prefer:

- clear section headings;
- natural paragraph flow;
- lightweight lists;
- numbered steps;
- generous vertical rhythm.

Avoid:

- card-per-concept layouts;
- overly wide paragraphs;
- excessive separators;
- persistent controls surrounding reading content.

---

## 7. Surfaces and Cards

Use a small number of visual surface levels:

1. background;
2. primary surface;
3. muted supporting surface;
4. temporary overlay.

Cards are not the default layout unit.

Use cards only when content is genuinely self-contained.

Avoid:

- nested cards;
- border inside card inside another card;
- excessive shadows;
- dashboard-style boxes around every piece of information.

Prefer spacing and tonal contrast over additional containers.

---

## 8. Borders, Radius, and Shadows

### Borders

Use subtle borders only when they help define:

- inputs;
- overlays;
- important boundaries.

Do not border every section.

### Radius

Recommended base radius:

- `8–10px`.

Avoid interfaces that feel either completely square or excessively bubbly.

### Shadows

Use shadows sparingly.

Prefer shadows for:

- dialogs;
- popovers;
- floating overlays.

Persistent learning surfaces should mostly rely on spacing and tonal contrast.

---

## 9. Roadmap Visual Language

Roadmaps should feel directional and connected.

Prefer:

- milestone-like waypoints rather than cards on a line;
- a subtle flowing connector on desktop and a simple vertical connector on mobile;
- clear sequence;
- visible progress;
- restrained staggered placement;
- obvious completed, current, and locked states.

Prioritize node content:

- step number;
- short title;
- state;
- optional duration.

Avoid:

- identical card lists;
- table-like roadmaps;
- long descriptions on every node;
- fake complex dependency graphs.

Current state should receive the strongest emphasis.

Completed states should remain clear but quieter.

Locked states should use muted styling plus an icon or label.

---

## 10. Buttons and Actions

Use one visually dominant primary action per context.

### Primary

Use the violet accent.

Examples:

- `Continue learning`
- `Validate understanding`
- `Create course`

### Secondary

Use:

- outline;
- ghost;
- text actions.

Examples:

- `Ask Tutor`
- `Back to roadmap`
- `Review lesson`

Rules:

- Keep labels short and specific.
- Disable actions while pending.
- Avoid multiple filled primary buttons in the same area.
- Use destructive styling only for destructive actions.

---

## 11. Forms and Inputs

Forms should include:

- visible labels;
- clear focus states;
- consistent input sizing;
- disabled states;
- pending states;
- useful validation messages.

Do not use placeholder text as the only label.

Avoid overly strong input borders.

Never expose raw server errors to learners.

---

## 12. Contextual Surfaces

Secondary workflows should appear only when needed.

Temporary overlays should have:

- clear title;
- concise supporting text;
- obvious close action;
- focused controls;
- enough internal spacing.

Avoid turning overlays into miniature dashboards.

Keep the number of simultaneously visible choices low.

---

## 13. States and Feedback

### Loading

Use:

- skeletons for structured content;
- small spinners for actions;
- meaningful loading copy.

Examples:

- `Building your roadmap...`
- `Preparing this lesson...`
- `Adjusting your learning path...`

### Empty

Explain what is missing and what the learner can do next.

### Error

Use concise, recoverable messages.

Do not expose:

- stack traces;
- provider errors;
- database errors.

### Success

Show both:

- concise confirmation;
- visible resulting state.

Do not rely only on toasts for important changes.

---

## 14. Content Tone

Use learner-facing language that is:

- calm;
- concise;
- instructional;
- concrete;
- supportive.

Prefer:

- `Ready to continue`
- `Review this concept once more`
- `Your learning path was adjusted`
- `Ask Tutor`

Avoid:

- AI marketing language;
- overly enthusiastic copy;
- system jargon;
- punitive language;
- verbose explanations.

Adaptive feedback should describe what changed, not expose internal scoring.

---

## 15. Motion

Keep motion subtle and functional.

Recommended duration:

- `150–250ms`.

Use motion for:

- overlays;
- selection changes;
- progress transitions;
- meaningful state changes.

Avoid:

- bouncing;
- excessive spring animations;
- looping decorative animation;
- movement that distracts from reading.

Respect reduced-motion preferences.

---

## 16. Responsive Behavior

Verify visual changes at minimum at:

- `320px`
- `768px`
- `1024px`
- `1366px`
- `1440px`

Requirements:

- no horizontal overflow;
- usable at `100%` browser zoom;
- readable body text;
- tappable actions;
- consistent hierarchy.

When space becomes limited:

1. preserve primary content;
2. reduce secondary metadata;
3. hide secondary tools behind progressive disclosure;
4. reorganize navigation;
5. never shrink text just to preserve desktop layout.

Mobile should feel intentionally designed rather than compressed.

---

## 17. Accessibility

- Use semantic HTML.
- Preserve visible keyboard focus.
- Maintain sufficient contrast.
- Associate labels with form controls.
- Keep touch targets comfortable.
- Do not communicate state using color alone.
- Use text or icons alongside semantic colors.
- Use `aria-live` for important asynchronous feedback when appropriate.
- Ensure disabled controls are actually non-interactive.
- Respect reduced-motion preferences.

---

## 18. Avoid

Do not use:

- neon colors;
- excessive gradients;
- glassmorphism;
- glowing borders;
- heavy shadows;
- excessive animation;
- nested cards;
- dense dashboard grids;
- excessive pills or badges;
- multiple competing primary actions;
- compressed body typography;
- decorative UI without function;
- gamification unless explicitly required;
- AI-themed visuals purely to advertise AI.

---

## 19. Visual Review Checklist

Before completing a frontend visual task, verify:

- Is the correct element attracting attention first?
- Is there only one clear primary action?
- Is text comfortable at `100%` zoom?
- Is body spacing readable?
- Is metadata visually secondary?
- Is violet used sparingly?
- Is there enough negative space?
- Can any border or card be removed?
- Are states understandable without color alone?
- Is the reading width comfortable?
- Does light mode work?
- Does dark mode work?
- Is there horizontal overflow?
- Does mobile remain usable?
- Is keyboard focus visible?
- Are loading, empty, error, and pending states covered?
- Is application behavior unchanged?

If removing an element improves clarity without losing useful information, remove it.
