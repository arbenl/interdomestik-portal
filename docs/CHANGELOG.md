# Changelog

## [Unreleased] - 2025-09-13

### Major Refactor & Stabilization

This release includes a comprehensive overhaul of the frontend architecture, development workflow, and coding standards to improve stability, performance, and maintainability.

#### Key Changes:

-   **Modularization**:
    -   Refactored the monolithic Admin and Member Portal pages into distinct, lazy-loaded **Feature Panels** located under `src/features/`.

-   **Data Fetching**:
    -   Replaced all ad-hoc `fetch`/`useEffect` data calls with **TanStack Query**.
    -   Standardized the return shapes of all data hooks (e.g., `{ data, isLoading, error }`).
    -   Implemented **prefetching** on navigation hover to improve perceived performance.

-   **Imports & Exports**:
    -   Enforced a canonical import/export strategy: **named exports**, **feature barrels**, and the **`@` path alias**.
    -   Strictly enforced `import type` for all type-only imports (`verbatimModuleSyntax`).

-   **Emulator Workflow**:
    -   Vastly improved the developer experience with a **deterministic seed script** (`pnpm dev:seed`).
    -   The seed script is now **idempotent** and can be run safely multiple times.
    -   Created a smart wrapper script that automatically starts the emulators if they are not already running, and intelligently handles **port conflicts**.

-   **Toolchain & Styling**:
    -   Fixed the **Tailwind CSS** toolchain to ensure styles are applied correctly in development.
    -   Resolved **Content Security Policy (CSP)** issues by removing the problematic meta tag from `index.html` and moving the strict production policy to `firebase.json` hosting headers.

-   **Code Quality**:
    -   Fixed dozens of TypeScript and ESLint errors, including `no-floating-promises`, `no-unsafe-assignment`, and `no-explicit-any`.
    -   The frontend now passes both `pnpm build` and `pnpm lint` with zero errors.
