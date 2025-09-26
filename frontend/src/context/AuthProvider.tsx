import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  getAuth,
  onIdTokenChanged,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut,
  User
} from 'firebase/auth';
import { AuthContext, AuthContextType } from './AuthContext';

export const AuthProvider: React.FC<React.PropsWithChildren> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
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
        setAllowedRegions(Array.isArray(claims.allowedRegions) ? claims.allowedRegions : []);
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

  const value = useMemo<AuthContextType>(() => ({
    user,
    loading,
    isAdmin,
    isAgent,
    allowedRegions,
    mfaEnabled,
    async signIn(email, password) {
      await signInWithEmailAndPassword(authRef.current, email, password);
    },
    async signUp(email, password) {
      await createUserWithEmailAndPassword(authRef.current, email, password);
    },
    async signOutUser() {
      await signOut(authRef.current);
    }
  }), [user, loading, isAdmin, isAgent, allowedRegions, mfaEnabled]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};
