# Frontend Application

This directory contains the Vite + React + TypeScript frontend for the Interdomestik Member Portal.

## Quick Start

The recommended way to run this application is from the **root of the monorepo**. Please see the [root README.md](../README.md) for the full 3-step development workflow.

## Environment Variables

To run the application, you will need to create a `.env` file in the root of the monorepo and add the following environment variables:

```
VITE_FIREBASE_API_KEY=...
VITE_FIREBASE_AUTH_DOMAIN=...
VITE_FIREBASE_PROJECT_ID=...
VITE_FIREBASE_APP_ID=...
```

## Available Scripts

From the **root** of the monorepo:

-   `pnpm -F frontend dev`: Starts the Vite development server.
-   `pnpm -F frontend build`: Builds the application for production.
-   `pnpm -F frontend preview`: Serves the production build locally for previewing.
-   `pnpm -F frontend lint`: Runs ESLint to check for code quality issues.

### Testing

-   `pnpm -F frontend test`: Runs the unit and integration tests with Vitest in watch mode.
-   `pnpm -F frontend test:ci`: Runs the unit and integration tests once with coverage.
-   `pnpm -F frontend e2e`: Runs the end-to-end tests with Playwright.
-   `pnpm -F frontend e2e:ui`: Runs the end-to-end tests with the Playwright UI.
-   `pnpm -F frontend e2e:report`: Shows the Playwright test report.

## Documentation

For detailed information on architecture, coding standards, and more, please refer to the central `/docs` directory at the root of the repository.

-   [Architecture Overview](../docs/architecture.md)
-   [Authentication & Roles](../docs/auth-and-roles.md)
-   [UI and Theming](../docs/ui-and-theming.md)