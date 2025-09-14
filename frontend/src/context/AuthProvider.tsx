import { useState, useEffect, useMemo } from 'react';
import { auth } from '../firebase';
import { onAuthStateChanged, type User } from 'firebase/auth';
import { AuthContext } from './auth'; // Import from new file
import type { CustomClaims } from '@/types';

/**
 * Provides authentication state to its children.
 * @param {object} props - The component props.
 * @param {React.ReactNode} props.children - The child components to render.
 *
 * @example
 * <AuthProvider>
 *   <App />
 * </AuthProvider>
 *
 * @returns {JSX.Element} The provider component.
 */
/**
 * Provides global authentication state to its children via the `useAuth` hook.
 *
 * This component is the single source of truth for the user's authentication status,
 * ID token claims (like role and allowed regions), and loading state. It should wrap
 * the entire application.
 *
 * @param props The component props.
 * @param props.children The child components to render.
 * @returns The provider component.
 *
 * @example
 * <AuthProvider>
 *   <App />
 * </AuthProvider>
 */
export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [isAgent, setIsAgent] = useState(false);
  const [allowedRegions, setAllowedRegions] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user: User | null) => {
      void (async () => {
        setUser(user);
        if (user) {
          try {
            const token = await user.getIdTokenResult();
            const claims = token.claims as CustomClaims;
            const role = claims.role ?? null;
            setIsAdmin(role === 'admin');
            setIsAgent(role === 'agent');
            setAllowedRegions(Array.isArray(claims.allowedRegions) ? claims.allowedRegions : []);
          } catch (e) {
            console.error("Error fetching user claims:", e);
            // This can happen if the user is not in the emulator
            // Reset roles to default
            setIsAdmin(false);
            setIsAgent(false);
            setAllowedRegions([]);
          }
        } else {
          // User is signed out
          setIsAdmin(false);
          setIsAgent(false);
          setAllowedRegions([]);
        }
        setLoading(false);
      })();
    });

    return () => unsubscribe();
  }, []);

  const value = useMemo(() => ({
    user,
    isAdmin,
    isAgent,
    allowedRegions,
    loading,
  }), [user, isAdmin, isAgent, allowedRegions, loading]);

  return (
    <AuthContext.Provider value={value}>
      {!loading && children}
    </AuthContext.Provider>
  );
}

export default AuthProvider;