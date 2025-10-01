# Coding Standards

This document outlines the key coding standards and conventions for the frontend application.

## TypeScript Strictness

The project is configured with `strict: true` in `tsconfig.json`. This includes rules like `noImplicitAny` and `strictNullChecks`.

- **`verbatimModuleSyntax: true`**: This rule is enforced. All type-only imports **must** use the `import type` syntax.

  ```typescript
  // Correct
  import type { Profile } from '@/types';

  // Incorrect
  import { Profile } from '@/types';
  ```

- **`no-unsafe-*`**: The use of `any` is strictly discouraged. The ESLint rules `@typescript-eslint/no-unsafe-assignment`, `@typescript-eslint/no-unsafe-call`, etc., are enabled. Use `unknown` and perform type narrowing instead.
- **`no-floating-promises`**: All Promises must be handled. If a promise is intentionally not awaited, it must be explicitly marked with the `void` operator.

## Imports & Exports

- **Named Exports**: Prefer named exports for all internal modules (components, hooks, services). Default exports should only be used where required by a framework (e.g., lazy-loaded pages).
- **Feature Barrels**: Each feature directory (e.g., `src/features/admin/members`) should have an `index.ts` file that explicitly re-exports its public API. Do **not** use wildcard exports (`export * from ...`).
- **Path Alias**: Use the `@` alias for absolute imports from the `src` directory to avoid deep relative paths (`../../../`).

**Example: Fixing a Legacy Import**

```diff
- import Button from '../../../components/ui/Button';
+ import { Button } from '@/components/ui';
```

## File Headers

- **`'use client';`**: Any `.tsx` file containing React components that use client-side features (hooks, event handlers) **must** have `'use client';` as the very first line of the file.
