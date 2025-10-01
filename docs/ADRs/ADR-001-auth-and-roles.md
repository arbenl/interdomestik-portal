# ADR-001: Centralized Authentication and Role Protection

## Status

Accepted

## Context

The application requires a robust and secure way to manage user authentication and control access to different sections (Admin, Agent, Member Portal) based on user roles. The state of the authenticated user needs to be globally accessible, and route protection must be enforced reliably.

## Decision

We will implement a centralized authentication provider using React Context (`AuthProvider`). This provider will be the single source of truth for the user's authentication status and their custom claims (roles and allowed regions).

For route protection, we will use a dedicated `RoleProtectedRoute` component that consumes this context to guard routes.

## Consequences

- **Pros**:
  - **Single Source of Truth**: All authentication logic is centralized, making it easier to manage and debug.
  - **Decoupled Components**: Components don't need to know how authentication works; they just consume the `useAuth` hook.
  - **Secure**: Route protection is based on server-verified custom claims from the Firebase ID token, which cannot be spoofed on the client.
  - **Declarative**: Route protection is declarative and easy to reason about in the routing configuration.
- **Cons**:
  - Components that need auth state will have a dependency on the `AuthProvider` being present in the component tree.
