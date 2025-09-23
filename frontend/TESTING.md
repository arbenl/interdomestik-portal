# Testing Workflow

The frontend has a comprehensive testing strategy covering unit, integration, and end-to-end tests.

## Unit & Integration Tests (Vitest)

- **Run all tests:** `pnpm -F frontend test`
- **Run all tests with coverage:** `pnpm -F frontend test:ci`
- **Watch mode:** `pnpm -F frontend test:watch`
- **Run a single file:** `vitest run src/path/to/My.test.tsx`

### Test Conventions

- **Auth State:** When mocking Firebase auth state, always ensure that `onAuthStateChanged` or `onIdTokenChanged` returns an unsubscribe function (e.g., `() => {}`).
- **Async State:** Use `queueMicrotask` or `waitFor` from `@testing-library/react` to allow asynchronous state updates (like auth changes) to resolve before making assertions.
- **Render Helper:** For any component that requires Router, QueryClient, or Auth context, use the `renderWithProviders` helper from `@/test-utils` to ensure the component is wrapped with all necessary providers.

### Mocks

- **Firebase Auth:** For component tests requiring auth state, import `mockUseAuth` from `@/tests/mocks/auth`.
  ```tsx
  import { mockUseAuth, makeMockUser } from '@/tests/mocks/auth';
  // Before render:
  mockUseAuth({ user: makeMockUser({ uid: 'abc' }), loading: false });
  ```

- **Firebase `httpsCallable`:** The `firebase/functions` module is mocked globally in `src/setupTests.ts`. To control the behavior of a specific function in a test, use the `mockCallable` helper.
  ```tsx
  import { mockCallable, getCalls } from '@/tests/mocks/firebaseFunctions';
  // Before interaction:
  mockCallable('myCloudFunction', { resolve: { data: { success: true } } });
  // After interaction:
  await userEvent.click(screen.getByRole('button'));
  // Assert:
  expect(getCalls('myCloudFunction')).toHaveLength(1);
  ```

- **Stripe:** Components that use Stripe are expected to be tested against mocks. For components using `@stripe/react-stripe-js`, a global mock is provided in `src/setupTests.ts`. For components that load Stripe.js via script tag, mock the `window.Stripe` object directly in your test file.

## End-to-End Tests (Playwright)

E2E tests run against a real browser and can be run against the live emulators.

- **Run all E2E tests:** `pnpm -F frontend e2e`
- **Run in headed mode:** `pnpm -F frontend e2e:headed`
- **Debug with UI mode:** `pnpm -F frontend e2e:ui`

## Emulator-First Development

For a realistic development and testing environment, we use the Firebase Emulator Suite.

1. **Start emulators & seed data:**
   ```bash
   pnpm -F . dev:emulators:seed
   ```
2. **Start the frontend dev server:**
   ```bash
   pnpm -F frontend dev
   ```
The app will automatically connect to the local emulators.
