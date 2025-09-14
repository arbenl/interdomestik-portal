# Environments

This document explains how environment variables are managed in the Vite-based frontend.

## Vite Environment Variables

All environment variables exposed to the client-side application **must** be prefixed with `VITE_`.

### Key Variables

-   `VITE_FIREBASE_*`: These variables (`API_KEY`, `AUTH_DOMAIN`, etc.) are required for the Firebase SDK to connect to the correct project in a production environment.
-   `VITE_USE_EMULATORS`: A flag (`true` or `false`) that tells the application whether to connect to local Firebase emulators. This should only be `true` for local development.

## `.env` Files

The project uses a standard Vite `.env` file setup:

-   **`.env.example` (in `frontend/`)**: A template file that lists all required environment variables. This file is committed to the repository.
-   **`.env.local` (in `frontend/`)**: This file is used for local development overrides. It is **not** committed to the repository. For this project, it's the recommended place to set `VITE_USE_EMULATORS=true` and provide a dummy API key for the emulators.
-   **`.env.example` (at project ROOT)**: This file documents the environment variables needed for the Node.js-based seed script (`FIRESTORE_EMULATOR_HOST`, etc.).

## Runtime Validation

To ensure stability, environment variables are validated at runtime by `src/config/env.ts`. This file reads the `import.meta.env` object and exports a typed `config` object. In a production build (`PROD`), the application will throw an error on startup if any of the required `VITE_FIREBASE_*` keys are missing.
