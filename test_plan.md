# Comprehensive Test Plan

This document outlines a comprehensive testing strategy to ensure the Interdomestik Member Portal is robust, secure, and reliable.

## 1. Frontend Unit Tests (`frontend/src/`)

Unit tests should focus on individual components, hooks, and utility functions in isolation.

### Hooks (`frontend/src/hooks/`)

-   **`useAdmin.ts`**:
    -   Should return `true` when the user has the `admin` role.
    -   Should return `false` when the user does not have the `admin` role or is not authenticated.
-   **`useAgentOrAdmin.ts`**:
    -   Should return `true` for users with `agent` or `admin` roles.
    -   Should return `false` for regular members or unauthenticated users.
-   **`useAuth.ts`**:
    -   Mock the `onAuthStateChanged` listener to test:
        -   The `user` object is correctly set on sign-in.
        -   The `user` object is `null` on sign-out.
        -   Custom claims (like `role` and `allowedRegions`) are correctly parsed.
-   **`useDirectory.ts`**:
    -   Mock the Firestore query to test:
        -   It returns a list of members.
        -   It handles an empty list of members correctly.
        -   It handles Firestore errors gracefully.
-   **`useEvents.ts`**:
    -   Mock the Firestore query to test:
        -   It returns a list of events.
        -   It handles an empty list of events correctly.
        -   It handles Firestore errors gracefully.
-   **`useInvoices.ts`**:
    -   Mock the Firestore query for a specific user to test:
        -   It returns a list of invoices for that user.
        -   It handles the case where a user has no invoices.
        -   It handles Firestore errors.

### Components (`frontend/src/components/`)

-   **`ActivateMembershipModal.tsx`**:
    -   Test that it renders correctly when open.
    -   Test that the form fields can be filled out.
    -   Test that the `onSubmit` function is called with the correct data when the form is submitted.
    -   Test that the `onClose` function is called when the modal is closed.
-   **`AgentRegistrationCard.tsx`**:
    -   Test that it renders the form correctly.
    -   Test form submission with valid and invalid data.
    -   Test that the `onRegister` function is called with the correct data.
-   **`DigitalMembershipCard.tsx`**:
    -   Test that it correctly displays the member's name, number, region, and status.
    -   Test that the QR code is generated with the correct URL.
    -   Test that the card style changes based on the membership `status` (e.g., `active`, `expired`).
-   **`ProtectedRoute.tsx`**:
    -   Test that it redirects unauthenticated users to the sign-in page.
    -   Test that it renders the child components for authenticated users.
    -   Test that it correctly handles role-based access (e.g., for admin-only routes).

### Validation (`frontend/src/validation/`)

-   **`profile.ts`**:
    -   Test the `profileSchema` with valid data to ensure it passes.
    -   Test the `profileSchema` with various invalid data (e.g., invalid email, short name) to ensure it fails with the correct error messages.

## 2. Backend Unit Tests (`functions/test/`)

Unit tests for the backend should focus on the business logic within your Cloud Functions, mocking external dependencies like Firestore.

-   **`upsertProfile.ts`**:
    -   Test that it correctly creates a new user profile with a unique `memberNo`.
    -   Test that it correctly updates an existing user profile.
    -   Test that it throws an error if the input data is invalid.
-   **`startMembership.ts`**:
    -   Test that it successfully activates a membership for a user.
    -   Test that it sets the correct `expiresAt` date.
    -   Test that it throws an error if the user does not exist.
    -   Test that it can only be executed by an admin.
-   **`rbac.ts`**:
    -   Test the `setUserRole` function:
        -   Ensure it correctly sets custom claims on a user.
        -   Ensure it can only be executed by an admin.
-   **`membership.ts`**:
    -   Test the `dailyExpireMemberships` function:
        -   Mock Firestore to have a set of members with memberships expiring on the current day.
        -   Verify that the function correctly updates their status to `expired`.
        -   Verify that it sends renewal reminder emails (mock the email sending service).

## 3. Integration Tests

Integration tests should verify the interaction between different parts of your application, such as the frontend and the Firebase emulators.

### Frontend + Firebase

-   **`Admin.tsx`**:
    -   Test that it correctly lists all users.
    -   Test that an admin can activate a user's membership and the change is reflected in the UI.
    -   Test that an admin can search for a user by email.
-   **`Profile.tsx`**:
    -   Test that a user can update their profile information and the changes are saved to Firestore and reflected in the UI.
-   **`Billing.tsx`**:
    -   Test that it correctly displays a user's invoices from Firestore.

### Backend (Functions + Emulators)

-   **Callable Functions**:
    -   For each callable function (`upsertProfile`, `startMembership`, etc.), write a test that calls the function with the emulators running and asserts that the data in the Firestore emulator is in the expected state.
    -   Test with different authentication contexts (unauthenticated, member, agent, admin) to verify the security rules.
-   **HTTP Functions**:
    -   **`verifyMembership`**: Call the HTTP endpoint with a valid, invalid, and expired `memberNo` and assert the JSON response is correct.
    -   **`exportMembersCsv`**: Call the HTTP endpoint (as an admin) and verify that it returns a CSV file with the correct content.

## 4. Firestore Security Rules Tests (`test/firestore.rules.test.ts`)

Expand the existing security rules tests to cover every collection and operation.

-   **`/members/{uid}`**:
    -   **Read**:
        -   A user can read their own document.
        -   An admin/agent can read a user's document in their allowed region.
        -   An admin/agent *cannot* read a user's document outside their allowed region.
        -   An unauthenticated user cannot read any member document.
    -   **Write/Update**:
        -   A user can update their own `name`, `phone`, etc., but not their `memberNo` or `status`.
        -   An admin can update any field in a member's document within their region.
        -   An agent can update a limited set of fields within their region.
-   **`/members/{uid}/memberships/{year}`**:
    -   Test that a user can read their own membership history.
    -   Test that an admin can read any user's membership history.
    -   Test that no one except an admin can write to the membership history.
-   **`/events/{eventId}`**:
    -   Test that any authenticated user can read events.
    -   Test that only admins can create, update, or delete events.
-   **`/billing/{uid}/invoices/{invoiceId}`**:
    -   Test that a user can read their own invoices.
    -   Test that an admin can read any user's invoices.
    -   Test that no one can write to the invoices collection from the client-side.

## 5. End-to-End (E2E) Tests (`cypress/e2e/`)

Expand the Cypress tests to cover complete user journeys.

-   **Admin Journey**:
    1.  Sign in as an admin.
    2.  Navigate to the admin panel.
    3.  Create a new member.
    4.  Activate the new member's membership.
    5.  Search for the member by email and verify their active status.
    6.  Download the CSV export and verify the new member is included.
-   **Member Journey**:
    1.  A new user signs up.
    2.  They are redirected to their profile page and fill it out.
    3.  (After an admin activates their membership) They sign in and see their active digital membership card.
    4.  They navigate to the billing page and see their invoices.
    5.  They update their profile information.
-   **Public Verification**:
    1.  Navigate to the `/verify` page without being signed in.
    2.  Enter a valid member number and see the success message.
    3.  Enter an invalid or expired member number and see the failure message.
