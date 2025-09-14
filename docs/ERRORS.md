# Error Handling

This document describes the error handling patterns used in the application.

## `safeErrorMessage`

To comply with the strict `@typescript-eslint/no-unsafe-*` ESLint rules, all errors caught in `try...catch` blocks are treated as `unknown`.

The `safeErrorMessage` utility function, located in `src/utils/errors.ts`, provides a type-safe way to extract an error message from an `unknown` error.

### API

```typescript
function safeErrorMessage(e: unknown): string;
```

### Example

```typescript
import { safeErrorMessage } from './utils/errors';

try {
  // ...
} catch (e: unknown) {
  const message = safeErrorMessage(e);
  console.error(message);
}
```

## `instanceof Error`

In cases where you need to access other properties of the `Error` object, you can use an `instanceof Error` check to narrow the type of the error.

### Example

```typescript
try {
  // ...
} catch (e: unknown) {
  if (e instanceof Error) {
    console.error(e.name, e.message, e.stack);
  } else {
    console.error('An unknown error occurred');
  }
}
```
