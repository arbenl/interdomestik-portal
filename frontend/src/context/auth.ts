import { createContext, useContext } from 'react';
import type { User } from 'firebase/auth';

interface AuthContextType {
  user: User | null;
  isAdmin: boolean;
  isAgent: boolean;
  allowedRegions: string[];
  loading: boolean;
}

export const AuthContext = createContext<AuthContextType>({
  user: null,
  isAdmin: false,
  isAgent: false,
  allowedRegions: [],
  loading: true,
});

/**
 * Hook to access the authentication context.
 * @returns {AuthContextType} The authentication context.
 */
export const useAuth = () => {
  return useContext(AuthContext);
};
