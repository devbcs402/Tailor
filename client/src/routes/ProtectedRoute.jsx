import React from 'react';
import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Loading } from '../components/common/Loading';

export const ProtectedRoute = () => {
  const { isAuthenticated, user, loading } = useAuth();

  if (loading) {
    return <Loading text="Verifying session..." fullScreen />;
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  if (user?.role === 'platform_owner') {
    return <Navigate to="/owner/dashboard" replace />;
  }

  return <Outlet />;
};
