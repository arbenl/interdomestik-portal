# Project Enhancement Recommendations

This document outlines key areas for improvement based on a brief audit of the Interdomestik Member Portal codebase. Addressing these points will enhance the project's quality, security, and maintainability.

### 1. Code Quality and Type Safety

**Issue:** The frontend codebase has 35 linting errors, with the vast majority being the use of `any` (`@typescript-eslint/no-explicit-any`). This undermines the benefits of TypeScript, reducing type safety and making the code harder to refactor and maintain.

**Recommendation:**
*   **Prioritize fixing critical linting errors:**
    1.  **`react-hooks/rules-of-hooks` in `MemberPortal.tsx`:** This is a critical violation that can lead to unpredictable behavior. Hooks must be called unconditionally at the top level of the component.
    2.  **`react-refresh/only-export-components` in `Toast.tsx`:** This prevents React's Fast Refresh from working correctly, impacting the development experience.
*   **Systematically eliminate `any`:** Replace `any` with specific types or interfaces. This will improve type safety, catch bugs at compile time, and make the code more self-documenting. For example, define interfaces for user profiles, memberships, and events, and use them consistently across the application.
*   **Fix minor issues:** Address the `no-empty` and `@typescript-eslint/triple-slash-reference` errors to improve code clarity and adhere to best practices.

### 2. Security Vulnerabilities in Firestore Rules

**Issue:** The Firestore security rules do not fully align with the security model described in the project documentation, potentially leading to unauthorized data access.

**Recommendations:**
1.  **Enforce Admin Region Restrictions:** The rules allow an admin to update any member's profile, regardless of region. This contradicts the documentation, which states that admins should only be able to write to member profiles within their `allowedRegions`. The `update` rule for `/members/{uid}` should be modified to enforce this.
2.  **Restrict Agent Read Access:** The rules allow agents to read all member data. If agents should only be able to access members in their assigned regions, the `read` rule for `/members/{uid}` should be updated to enforce this, similar to the recommended admin restriction.

### 3. Outdated Dependencies

**Issue:** Both the `frontend` and `functions` packages have several outdated dependencies, some with major version differences.

**Recommendations:**
*   **Frontend:**
    *   `jsdom`: `24.1.3` -> `26.1.0`
    *   `vitest`: `1.6.1` -> `3.2.4`
    *   `zod`: `3.25.76` -> `4.1.5`
    *   And several other minor version updates.
*   **Functions:**
    *   `chai`: `5.3.3` -> `6.0.1`
    *   `mocha`: `10.8.2` -> `11.7.2`
    *   `rewire`: `7.0.0` -> `9.0.1`
    *   `sinon`: `18.0.1` -> `21.0.0`
    *   `zod`: `3.25.76` -> `4.1.5`
    *   And several other minor version updates.

Update these dependencies to their latest stable versions to incorporate bug fixes, security patches, and new features. Pay special attention to major version changes, as they may require code modifications.

### 4. Low Test Coverage

**Issue:** The project has very low test coverage, which increases the risk of regressions and makes it harder to refactor with confidence.

**Recommendations:**
*   **Frontend:**
    *   **Hooks:** Add tests for all untested hooks: `useAdmin`, `useAgentOrAdmin`, `useAuth`, `useDirectory`, `useEvents`, and `useInvoices`.
    *   **Components:** Add tests for critical UI components like `ActivateMembershipModal`, `AgentRegistrationCard`, `DigitalMembershipCard`, and `ProtectedRoute`.
    *   **Pages:** Add tests for all untested pages, especially those with complex logic like `Admin`, `Profile`, and `Billing`.
*   **Backend:**
    *   Add unit tests for all untested business logic in `functions/src/lib`, including `upsertProfile.ts`, `startMembership.ts`, `rbac.ts`, and `validators.ts`.
    *   Ensure that all Cloud Functions have corresponding integration tests that verify their behavior against the Firebase emulators.

By systematically addressing these areas, the Interdomestik Member Portal will become a more robust, secure, and maintainable application.