import React, { useEffect, useMemo, useState } from 'react';
import { auth } from '@/lib/firebase';
import {
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

  useEffect(() => {
    const unsub = onIdTokenChanged(auth, async (user) => {
      if (user) {
        setUser(user);
        const tokenResult = await user.getIdTokenResult();
        const claims = tokenResult.claims;
        setIsAdmin(claims.role === 'admin');
        setIsAgent(claims.role === 'agent');
        setAllowedRegions(Array.isArray(claims.allowedRegions) ? claims.allowedRegions : []);
      } else {
        setUser(null);
        setIsAdmin(false);
        setIsAgent(false);
        setAllowedRegions([]);
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
    async signIn(email, password) {
      await signInWithEmailAndPassword(auth, email, password);
    },
    async signUp(email, password) {
      await createUserWithEmailAndPassword(auth, email, password);
    },
    async signOutUser() {
      await signOut(auth);
    }
  }), [user, loading, isAdmin, isAgent, allowedRegions]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};
