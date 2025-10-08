import React, {
  useEffect,
  useMemo,
  useRef,
  useState,
  useCallback,
} from 'react';
import {
  getAuth,
  onIdTokenChanged,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut,
  User,
} from 'firebase/auth';
import { AuthContext, AuthContextType } from './AuthContext';

export const AuthProvider: React.FC<React.PropsWithChildren> = ({
  children,
}) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true); // Initial auth state check
  const [isAdmin, setIsAdmin] = useState(false);
  const [isAgent, setIsAgent] = useState(false);
  const [allowedRegions, setAllowedRegions] = useState<string[]>([]);
  const [mfaEnabled, setMfaEnabled] = useState(false);
  const authRef = useRef(getAuth());

  useEffect(() => {
    const unsub = onIdTokenChanged(authRef.current, async (user) => {
      if (user) {
        setUser(user);
        const tokenResult = await user.getIdTokenResult();
        const claims = tokenResult.claims;
        setIsAdmin(claims.role === 'admin');
        setIsAgent(claims.role === 'agent');
        setAllowedRegions(
          Array.isArray(claims.allowedRegions) ? claims.allowedRegions : []
        );
        setMfaEnabled(Boolean(claims.mfaEnabled));
      } else {
        setUser(null);
        setIsAdmin(false);
        setIsAgent(false);
        setAllowedRegions([]);
        setMfaEnabled(false);
      }
      setLoading(false);
    });
    return () => unsub();
  }, []);

  const refreshClaims = useCallback(async () => {
    if (!authRef.current.currentUser) return;
    try {
      setLoading(true);
      await authRef.current.currentUser.getIdToken(true);
    } catch (error) {
      console.error('Failed to refresh user claims:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  const value = useMemo<AuthContextType>(
    () => ({
      user,
      loading,
      isAdmin,
      isAgent,
      allowedRegions,
      mfaEnabled,
      refreshClaims,
      async signIn(email, password) {
        setLoading(true);
        try {
          await signInWithEmailAndPassword(authRef.current, email, password);
        } catch (error) {
          console.error('Sign in failed:', error);
          throw error;
        } finally {
          setLoading(false);
        }
      },
      async signUp(email, password) {
        setLoading(true);
        try {
          await createUserWithEmailAndPassword(
            authRef.current,
            email,
            password
          );
        } catch (error) {
          console.error('Sign up failed:', error);
          throw error;
        } finally {
          setLoading(false);
        }
      },
      async signOutUser() {
        setLoading(true);
        try {
          await signOut(authRef.current);
        } catch (error) {
          console.error('Sign out failed:', error);
          throw error;
        } finally {
          setLoading(false);
        }
      },
    }),
    [user, loading, isAdmin, isAgent, allowedRegions, mfaEnabled, refreshClaims]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};
