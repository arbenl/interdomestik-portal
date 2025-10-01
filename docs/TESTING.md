# Testing

This document outlines the testing strategy for the frontend application.

## Frameworks

- **Unit & Integration Tests**: [Vitest](https://vitest.dev/) is used as the test runner, assertion library, and mocking framework.
- **Component Tests**: [React Testing Library](https://testing-library.com/docs/react-testing-library/intro/) is used for rendering components and interacting with them in a user-centric way.

## E2E Smoke Tests

End-to-end smoke tests (Playwright) live under `frontend/e2e` and verify critical user flows:

- Signing in as an admin and a member.
- Navigating to the `/portal` and `/admin` pages.
- Asserting that basic content renders without redirect loops.

## Sample Tests

### `RoleProtectedRoute`

A test for the `RoleProtectedRoute` component would ensure that:

- Unauthenticated users are redirected to `/signin`.
- Authenticated users without the required role are redirected.
- Authenticated users with the required role can see the child content.

### Profile Update Mutation

A test for a component that uses the `useProfile` hook's mutation would:

1.  Render the component within a `QueryClientProvider`.
2.  Mock the `updateProfile` service function to return a successful response.
3.  Fill out and submit the form.
4.  Assert that the `updateProfile` service was called with the correct data.
5.  Assert that a success toast is displayed.
