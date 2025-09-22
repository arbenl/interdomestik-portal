import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';

export const ProtectedRoute: React.FC<React.PropsWithChildren> = ({ children }) => {
  const { user, loading } = useAuth();
  const location = useLocation();

  if (loading) return <div>Loading…</div>;
  if (!user) return <Navigate to="/signin" replace state={{ from: location }} />;
  return <>{children}</>;
};
