import { createContext } from 'react';
import { User } from 'firebase/auth';

export type AuthContextType = {
  user: User | null;
  loading: boolean;
  isAdmin: boolean;
  isAgent: boolean;
  allowedRegions: string[];
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (email: string, password: string) => Promise<void>;
  signOutUser: () => Promise<void>;
};

export const AuthContext = createContext<AuthContextType | undefined>(undefined);
