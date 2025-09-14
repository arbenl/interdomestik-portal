# Architecture

This document provides a high-level overview of the Interdomestik Member Portal's frontend architecture.

## System Diagram (Mermaid)

```mermaid
graph TD
    A[User Browser] --> B{Firebase Hosting};
    B --> C[React App];
    C --> D[AuthProvider];
    D --> E{RoleProtectedRoute};
    E -- Admin Role --> F[Admin Feature Panels (Lazy)];
    E -- Member/Agent Role --> G[Portal Feature Panels (Lazy)];
    F --> H[Admin Query Hooks];
    G --> I[Portal Query Hooks];
    H --> J[Firebase Services];
    I --> J;
    J --> K[Firebase Emulators / Cloud];

    subgraph React App
        direction LR
        C
        D
        E
        F
        G
        H
        I
    end
```

## Module Boundaries

The frontend codebase is organized into distinct, feature-oriented modules to promote separation of concerns and maintainability.

-   **`src/features/`**: This is the core of the application, divided into `admin` and `portal` sections. Each feature (e.g., `members`, `profile`) is a self-contained module that includes its own components, hooks, and services.
-   **`src/components/`**: Contains shared, reusable components used across multiple features (e.g., `Button`, `Layout`, `PanelBoundary`).
-   **`src/hooks/`**: Holds shared custom hooks that are not specific to a single feature.
-   **`src/services/`**: Provides a layer for interacting with external services, primarily Firebase. It contains typed wrappers for Firestore and Cloud Functions calls.
-   **`src/queryClient.ts`**: A single, shared instance of the TanStack Query client, configured with project-wide defaults.

## Data Flow

-   **Authentication**: The `AuthProvider` is the single source of truth for user authentication state and custom claims (roles, regions). It loads this information once upon login and makes it available to the entire app via the `useAuth` hook.
-   **Authorization**: The `RoleProtectedRoute` component acts as a gatekeeper for routes, checking the user's role from the `AuthProvider` before rendering a protected feature.
-   **Data Fetching**: All data fetching from Firestore and Cloud Functions is handled by TanStack Query hooks (`useQuery`, `useMutation`). These hooks are typically co-located with the features that use them and call functions from the `src/services` layer. This provides caching, automatic refetching, and a consistent API for handling loading and error states.