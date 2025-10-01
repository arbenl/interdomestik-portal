# Interdomestik Member Portal

## Project Overview

This repository contains the source code for the Interdomestik Member Portal, a modern, secure, and performant application built with React, TypeScript, Vite, and Firebase. It is a PNPM monorepo with two primary packages:

-   `frontend/`: The Vite + React + TypeScript single-page application. This is the main user-facing portal.
-   `functions/`: Firebase Cloud Functions that provide the backend logic.

The frontend application uses TanStack Query for data fetching, React Hook Form for forms, and Tailwind CSS for styling. The backend is built with Firebase Cloud Functions and uses Firebase Admin SDK.

## Building and Running

This project uses a Firebase Emulator-first workflow.

**1. Start the Firebase Emulators**
```bash
pnpm dev:emu
```

**2. Seed the Emulators**
```bash
pnpm dev:seed
```

**3. Run the Frontend App**
```bash
pnpm -F frontend dev
```

### Other useful commands

-   **Build for production:** `pnpm -F frontend build`
-   **Run tests:** `pnpm test`
-   **Run linter:** `pnpm lint`
-   **Run type checking:** `pnpm typecheck`

## Development Conventions

-   **Authentication**: The `AuthProvider` is the single source of truth for user authentication state and custom claims (roles, regions).
-   **Authorization**: The `RoleProtectedRoute` component acts as a gatekeeper for routes.
-   **Data Fetching**: All data fetching from Firestore and Cloud Functions is handled by TanStack Query hooks (`useQuery`, `useMutation`).
-   **Styling**: The project uses Tailwind CSS for styling.
-   **Code Style**: The project uses ESLint to enforce code style.
-   **Modules**: The frontend codebase is organized into distinct, feature-oriented modules.
-   **Services**: A dedicated services layer is used for interacting with external services, primarily Firebase.
