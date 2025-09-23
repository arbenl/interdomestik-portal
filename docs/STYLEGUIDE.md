# Style Guide

This document provides style guidelines for the project.

## TypeScript

-   **`import type`:** Use `import type` when importing only types to comply with the `verbatimModuleSyntax` setting.

    ```typescript
    import type { User } from 'firebase/auth';
    ```

-   **`unknown` for Errors:** Always type errors caught in `try...catch` blocks as `unknown` and use type guards to safely access their properties.

    ```typescript
    try {
      // ...
    } catch (e: unknown) {
      // ...
    }
    ```

## React

-   **Hooks:** Use `useCallback` and `useMemo` to memoize functions and values where appropriate to prevent unnecessary re-renders.
-   **File Naming:**
    -   Components: `PascalCase.tsx`
    -   Hooks: `useCamelCase.ts`
    -   Services: `camelCase.ts`
