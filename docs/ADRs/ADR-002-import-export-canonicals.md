# ADR-002: Canonical Imports, Exports, and Paths

## Status

Accepted

## Context

The codebase had inconsistent import and export styles. Some modules used default exports, others used named exports. Relative paths (`../../../`) were common, making refactoring difficult. Type-only imports were not consistently used, which can lead to larger bundles.

## Decision

We will enforce a strict and consistent set of rules for modules, paths, and types:
1.  **Path Alias**: A `@` alias pointing to `src` will be used for all absolute imports to eliminate deep relative paths.
2.  **Named Exports**: All internal modules (components, hooks, utils) will use named exports. Default exports are reserved for framework-specific requirements (e.g., pages for `React.lazy`).
3.  **Feature Barrels**: Each feature directory (`src/features/*`) will have an `index.ts` file that explicitly re-exports its public API (`export { MyComponent } from './MyComponent'`). Wildcard exports (`export *`) are forbidden.
4.  **Type-only Imports**: The TypeScript compiler option `verbatimModuleSyntax: true` will be enabled. All imports that only bring in types must use the `import type` syntax.

## Consequences

-   **Pros**:
    -   **Consistency**: All modules follow the same import/export pattern, improving readability.
    -   **Maintainability**: Using path aliases and barrels makes it much easier to move files and refactor code without breaking imports across the application.
    -   **Performance**: `import type` ensures that type information is completely erased at compile time, preventing type-only modules from being included in the production bundle.
-   **Cons**:
    -   Requires a one-time effort to update all existing imports to the new canonical format.
