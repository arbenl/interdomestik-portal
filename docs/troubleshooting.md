# Troubleshooting

This document lists common issues and their solutions.

## Tailwind CSS styles are not applied in development.

- **Cause**: This is almost always due to a misconfiguration in the Tailwind toolchain.
- **Fix**:
  1.  Ensure `tailwind.config.ts` has the correct `content` globs to scan all your `.tsx` files.
  2.  Verify that `postcss.config.cjs` exists and is correctly configured.
  3.  Check that `src/index.css` contains the `@tailwind` directives and is imported in `src/main.tsx`.
  4.  Make sure there is no overly restrictive CSP `<meta>` tag in `index.html` blocking inline styles.

## Firebase Error: `invalid-api-key`

- **Cause**: The Firebase API key is missing or incorrect in your `.env.local` file.
- **Fix**:
  1.  Copy `frontend/.env.example` to `frontend/.env.local`.
  2.  For emulator development, you can use a dummy key like `"demo-api-key"`. For production, ensure the correct `VITE_FIREBASE_API_KEY` is set.

## Emulator Port Conflicts

- **Cause**: Another process is using one of the default Firebase emulator ports (e.g., 8080, 9099).
- **Fix**: The `pnpm dev:seed` script automatically handles this. It will detect the conflict, find the next available free ports, and start the emulators there using a temporary config file.

## TypeScript Errors

- **`TS2307: Cannot find module '...' or its corresponding type declarations.`**:
  - **Fix**: Ensure you are using the correct path alias (`@/`) and that the module is correctly exported from its barrel file (`index.ts`).
- **`Property '...' does not exist on type 'IntrinsicAttributes'.`**:
  - **Cause**: You are passing props to a lazy-loaded component without providing an explicit type annotation.
  - **Fix**: Add an explicit type annotation.

    ```typescript
    import type { ComponentType } from 'react';

    const MyPanel = lazy(() => import('./MyPanel')) as ComponentType<{
      myProp: string;
    }>;
    ```
