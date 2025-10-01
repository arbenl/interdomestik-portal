# ADR-003: Emulator-First Development Workflow

## Status

Accepted

## Context

Local development was inconsistent and prone to errors. Developers might connect to a live Firebase project by mistake, and the lack of a consistent, seeded dataset made testing features difficult and unpredictable. The process of starting and seeding the emulators was manual and error-prone, especially regarding port conflicts.

## Decision

We will adopt a formal **emulator-first** development workflow.

1.  **Deterministic Seeding**: A script (`scripts/emulator/seed.ts`) will be the single source of truth for creating a deterministic set of test users (admin, agents, members) with fixed UIDs, emails, passwords, and custom claims.
2.  **Smart Wrapper Script**: A wrapper script (`scripts/emulator/run-seed.ts`) will be the primary entry point for seeding (`pnpm dev:seed`). This script will:
    - Detect if the Firebase emulators are already running.
    - If they are, it will seed them directly.
    - If they are not, it will intelligently handle port conflicts, start the emulators (in the background or via `emulators:exec`), and then run the seed.
3.  **Frontend Configuration**: The frontend will be configured via `.env.local` to connect to the emulators by default when `VITE_USE_EMULATORS=true` is set.

## Consequences

- **Pros**:
  - **Consistency**: Every developer gets the exact same, fully populated environment every time.
  - **Safety**: Drastically reduces the risk of accidentally modifying production data during development.
  - **Improved DX**: The `pnpm dev:seed` command "just works," regardless of the state of the emulators, making the setup process much simpler.
  - **Reliable Testing**: Automated and manual testing can be performed against a known, predictable dataset.
- **Cons**:
  - Adds a small amount of complexity to the project's scripting layer.
