# Authentication

Authentication is handled by Firebase Authentication and a custom `AuthProvider` component.

## `AuthProvider`

The `AuthProvider` component, located in `src/context/AuthProvider.tsx`, is the core of the authentication system. It wraps the entire application and performs the following tasks:

- It listens for changes in the Firebase auth state using `onAuthStateChanged`.
- When a user signs in, it calls `getIdTokenResult()` to get the user's ID token and custom claims.
- It stores the user object, role information (`isAdmin`, `isAgent`), allowed regions, and a loading state in a React context.
- It provides this context to all its children.

## Custom Claims

User roles are managed using Firebase custom claims. The following claims are used:

- `role`: A string that can be `'admin'` or `'agent'`.
- `allowedRegions`: An array of strings representing the regions a user is allowed to manage.

These claims are set on the user object on the backend (e.g., in a Firebase Function) and are securely propagated to the client via the ID token.

## `useAuth` Hook

The `useAuth` hook, located in `src/context/auth.ts`, provides a simple and clean way for components to access the authentication context.

### API

- `user`: The Firebase `User` object, or `null` if the user is not signed in.
- `isAdmin`: A boolean that is `true` if the user has the `admin` role.
- `isAgent`: A boolean that is `true` if the user has the `agent` role.
- `allowedRegions`: An array of strings representing the regions the user is allowed to manage.
- `loading`: A boolean that is `true` while the authentication state is being resolved.

### Example

```typescript
import { useAuth } from '../context/auth';

function MyComponent() {
  const { user, isAdmin, loading } = useAuth();

  if (loading) {
    return <p>Loading...</p>;
  }

  if (!user) {
    return <p>Please sign in.</p>;
  }

  return (
    <div>
      <p>Welcome, {user.email}</p>
      {isAdmin && <p>You are an admin.</p>}
    </div>
  );
}
```
