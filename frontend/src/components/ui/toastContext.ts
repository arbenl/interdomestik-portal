import { createContext } from 'react';

export type Toast = {
  id: number;
  type: 'success' | 'error' | 'info';
  message: string;
};

export const ToastContext = createContext<{
  push: (t: Omit<Toast, 'id'>) => void;
} | null>(null);
