import { Navigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import type { Role } from '@/types';

/**
 * Props for the RoleProtectedRoute component.
 */
type Props = {
  /**
   * The child elements to render if the user has the required role.
   */
  children: React.ReactNode;
  /**
   * An array of roles that are allowed to access this route.
   */
  roles: Role[];
  /**
   * The path to redirect to if the user does not have the required role.
   * @default '/portal'
   */
  redirectTo?: string;
};

/**
 * A route guard that checks if a user is authenticated and has one of the required roles.
 *
 * If the user is not authenticated, it redirects to `/signin`.
 * If the user is authenticated but does not have the required role, it redirects to
 * the specified `redirectTo` path (defaulting to `/portal`).
 * While checking permissions, it displays a loading message.
 *
 * @param props The component props.
 * @param props.children The child elements to render if authorized.
 * @param props.roles An array of roles allowed to access this route.
 * @param props.redirectTo The path to redirect to if unauthorized.
 * @returns The protected route element or a redirect.
 *
 * @example
 * <RoleProtectedRoute roles={['admin']}>
 *   <AdminPage />
 * </RoleProtectedRoute>
 */
export default function RoleProtectedRoute({
  children,
  roles,
  redirectTo = '/portal',
}: Props) {
  const { user, isAdmin, isAgent, loading } = useAuth();

  if (loading) {
    return <div className="p-4">Checking permissions…</div>;
  }

  if (!user) {
    return <Navigate to="/signin" />;
  }

  const userRoles: Record<Role, boolean> = {
    admin: isAdmin,
    agent: isAgent,
    member: !isAdmin && !isAgent,
  };
  const hasRequiredRole = roles.some((role) => userRoles[role]);

  if (!hasRequiredRole) {
    return <Navigate to={redirectTo} />;
  }

  return children;
}
