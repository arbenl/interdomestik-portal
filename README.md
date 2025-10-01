# Interdomestik Member Portal

This repository contains the source code for the Interdomestik Member Portal, a modern, secure, and performant application built with React, TypeScript, Vite, and Firebase.

<!-- ![Screenshot of the member portal dashboard](./docs/assets/screenshot.png) -->

## Quick Start: Local Development

This project uses a Firebase Emulator-first workflow. The following three commands will get you up and running with a fully seeded local environment.

**1. Start the Firebase Emulators** (in your first terminal)
```bash
pnpm dev:emu
```
This command starts the local Firebase services (Auth, Firestore, etc.) and leaves them running.

**2. Seed the Emulators** (in a second terminal)
```bash
pnpm dev:seed
```
This script populates the emulators with a deterministic set of users (1 admin, 3 agents, 30 members) and required Firestore documents. It's safe to run multiple times.

**3. Run the Frontend App** (in a third terminal)
```bash
pnpm -F frontend dev
```
This starts the Vite development server for the React application, which will connect to the running emulators.

## Production Build & Preview

To build and preview the production version of the frontend application:
```bash
pnpm -F frontend build
pnpm -F frontend preview
```

## Repository Structure

This is a PNPM monorepo with two primary packages:

-   `frontend/`: The Vite + React + TypeScript single-page application. This is the main user-facing portal.
-   `functions/`: Firebase Cloud Functions that provide the backend logic.

## Branches & Cleanup Workflow

- Stable baseline lives on `main` with green CI.
- New development and repository cleanup start from `next`.
  - Create once: `git checkout -b next && git push -u origin next`
  - Work in small PRs targeting `next`; keep CI green.
  - See cleanup plan: `docs/cleanup/ROADMAP.md`.
  - When ready, open a PR merging `next` back into `main`.
2
## Documentation

For detailed information on architecture, coding standards, and more, please refer to the `/docs` directory.

-   [Architecture & Decisions](./docs/adr.md)
-   [Authentication & Roles](./docs/AUTH.md)
-   [Project Guide (Emulators & Seeding)](./docs/PROJECT_GUIDE.md)
-   [Coding Standards](./docs/STYLEGUIDE.md)
