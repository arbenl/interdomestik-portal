# Release Notes

## 2025-09-13

### Admin Page Refactor

-   **Summary:** The monolithic `Admin.tsx` page has been refactored into a modular, maintainable, and performant architecture. The UI has been split into multiple feature-based panels, and data access logic has been moved into typed services and hooks.
-   **Migration Notes:**
    -   The `AdminRoute` component has been replaced with the generic `RoleProtectedRoute` component.
    -   The admin page now uses lazy loading for its feature panels. This should not affect end-users, but it is a significant change to the codebase.
