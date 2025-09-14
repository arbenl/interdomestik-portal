# Routing

Routing is handled by React Router.

## `RoleProtectedRoute`

The `RoleProtectedRoute` component, located in `src/components/RoleProtectedRoute.tsx`, is a generic route guard that protects routes based on user roles.

### Props

-   `roles`: An array of strings representing the roles that are allowed to access the route (e.g., `['admin']`, `['agent', 'admin']`).
-   `children`: The component to render if the user has the required role.
-   `redirectTo`: The path to redirect to if the user is not authorized (defaults to `/portal`).

### Example

```typescript
import { Route } from 'react-router-dom';
import { RoleProtectedRoute } from './components/RoleProtectedRoute';
import { AdminPage } from './pages/Admin';

<Route
  path="/admin"
  element={
    <RoleProtectedRoute roles={['admin']}>
      <AdminPage />
    </RoleProtectedRoute>
  }
/>
```

## Lazy Loading

To improve performance, admin panels and other large components are lazily loaded using `React.lazy` and `<Suspense>`.

### Example

```typescript
import { lazy, Suspense } from 'react';

const AdminPanel = lazy(() => import('./features/admin/AdminPanel'));

function MyPage() {
  return (
    <Suspense fallback={<p>Loading...</p>}>
      <AdminPanel />
    </Suspense>
  );
}
```

## Next.js Middleware

This project uses Vite and client-side rendering, so there is no Next.js middleware. If the project were to be migrated to Next.js with server-side rendering (SSR), a middleware file would be necessary to protect routes on the server.
