# gemastik-roadmap

`gemastik-roadmap` is an AI-assisted learning platform that helps learners turn a topic into a structured roadmap, study each step in a guided workspace, and strengthen understanding through tutoring and socratic validation.

## What This Project Does

The project is built around a simple learning flow: a learner chooses what they want to study, the app organizes that goal into a roadmap, and each roadmap step becomes a focused place to learn, ask questions, and validate understanding.

Instead of treating learning as a pile of notes or disconnected chats, `gemastik-roadmap` treats it as a trackable journey. The dashboard gives learners a clear view of their active courses, their progress, and the next step they should focus on.

## Main Experience

The core experience of the app is centered on four moments:

- Sign in to a personal learner dashboard.
- Create a new course by answering a short onboarding flow.
- Open a course to explore the roadmap and current learning node.
- Study, ask the tutor for help, and validate understanding before moving forward.

This makes the app feel less like a generic AI prompt box and more like a structured study environment.

## Core Features

- Authenticated learner dashboard for managing active courses.
- Guided course creation flow that captures topic, level, goal, weekly availability, and learning style.
- AI-assisted roadmap generation for turning a broad topic into smaller learning steps.
- Course cards that summarize progress, pacing, and roadmap status at a glance.
- Course workspace for reviewing lesson content and progressing through roadmap nodes.
- Tutor chat for asking follow-up questions while studying.
- Socratic validation flow for checking whether the learner can explain and apply what they learned.
- Shared design system built on shadcn/ui primitives, with the dashboard shell scaffolded from `dashboard-01`.

## How The App Works

1. A learner signs up or logs in.
2. The app routes authenticated users directly to the dashboard.
3. The learner creates a course through a short multi-step questionnaire.
4. The course is stored and presented as a roadmap with learning nodes.
5. From the dashboard, the learner opens a course and works through the roadmap step by step.
6. Inside the course workspace, the learner can read lesson content, chat with the tutor, and submit responses for validation.
7. Progress updates over time as nodes are completed or revisited.

## Why This Project Exists

Many learning tools are either too static or too open-ended. Static tools make it hard to adapt to individual goals, while open-ended chat tools can feel unstructured and difficult to follow over time.

`gemastik-roadmap` sits in the middle. It uses AI to help create and support a study plan, but keeps that experience grounded in a roadmap with clear steps, progress tracking, and a dedicated workspace for each part of the learning process.

## Tech Stack

The project is built with:

- Next.js for the web application.
- Better Auth for authentication.
- tRPC for type-safe API procedures.
- Drizzle ORM with PostgreSQL for persistence.
- React Query for client-side data fetching and cache updates.
- Shared shadcn/ui-based components in `packages/ui`.
- Turborepo for monorepo orchestration.

## Project Structure

```text
gemastik-roadmap/
├── apps/
│   └── web/                 # Main product application built with Next.js
├── packages/
│   ├── api/                 # API procedures and business logic
│   ├── auth/                # Authentication setup and server helpers
│   ├── db/                  # Database schema, queries, and migrations
│   ├── env/                 # Shared environment configuration
│   ├── config/              # Shared config packages
│   └── ui/                  # Shared shadcn/ui primitives and global styles
```

## For Developers

This repository is a monorepo with the product app in `apps/web` and shared packages under `packages/*`.

- Shared UI primitives live in `packages/ui`.
- App-specific dashboard composition lives in `apps/web/src/app/dashboard` and `apps/web/src/components`.
- Global UI tokens and theme styles live in `packages/ui/src/styles/globals.css`.
- The dashboard shell is based on the shadcn `dashboard-01` scaffold, but the app composes its own product-specific pages and flows on top of it.

## Running Locally

Install dependencies:

```bash
bun install
```

Configure the required environment variables for the web app, including database, authentication, and any AI provider settings used by the learning flows.

Apply the database schema:

```bash
bun run db:push
```

Start the development server:

```bash
bun run dev
```

Then open [http://localhost:3001](http://localhost:3001).

## Available Scripts

- `bun run dev` starts the workspace in development mode.
- `bun run build` builds all applications and packages.
- `bun run dev:web` starts only the web app.
- `bun run check-types` runs TypeScript checks across the workspace.
- `bun run db:push` pushes schema changes to the database.
- `bun run db:generate` generates database artifacts.
- `bun run db:migrate` runs database migrations.
- `bun run db:studio` opens the database studio.
