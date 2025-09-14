# Authentication & Roles

This document details the authentication and role-based access control (RBAC) strategy for the portal.

## AuthProvider

The `AuthProvider` (`src/context/AuthProvider.tsx`) is the single source of truth for the current user's authentication state. Its responsibilities include:
-   Listening to Firebase Auth state changes.
-   On login, fetching the user's ID token and parsing the custom claims.
-   Providing the user object, roles (`isAdmin`, `isAgent`), and `allowedRegions` to the entire application via the `useAuth` hook.

## Roles and Regions

The system defines three primary roles:

-   `'admin'`: Full access to all administrative panels and data across all regions.
-   `'agent'`: Limited access to specific agent tools, restricted to a list of assigned regions.
-   `'member'`: Access to their own profile and membership details within the member portal.

The regions are currently defined for Kosovo: `['Prishtina', 'Gjakova', 'Peja', 'Prizreni']`.

## RoleProtectedRoute

The `RoleProtectedRoute` component (`src/components/RoleProtectedRoute.tsx`) is a route guard that enforces RBAC. It consumes the user's roles from the `AuthProvider`.

**Usage Example:**
```tsx
import { RoleProtectedRoute } from '@/components/RoleProtectedRoute';
import { Admin } from '@/pages/Admin';

// This route is only accessible to users with the 'admin' role.
<RoleProtectedRoute roles={['admin']}>
  <Admin />
</RoleProtectedRoute>
```

## Security Notes

-   **Server-Verified Claims**: All roles and region permissions are stored as **custom claims** on the user's Firebase Auth ID token. These claims are minted and signed by a trusted server environment (the seed script or a secure Cloud Function).
-   **Firestore Security Rules**: Firestore's security rules are the ultimate authority for data access. They read the `request.auth.token.role` and `request.auth.token.allowedRegions` properties from the user's verified ID token to grant or deny read/write operations.
-   **Client-Side Spoofing**: Because the security rules operate on the server and trust only the signed ID token, a malicious user cannot gain elevated privileges by simply modifying their client-side state. Any attempt to access data they are not authorized for will be rejected by Firestore's rules.
