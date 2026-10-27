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

  // Force first-login password change before entering tenant dashboard
  if (user?.mustChangePassword) {
    return <Navigate to="/change-password" replace />;
  }

  if (user?.role === 'platform_owner') {
    return <Navigate to="/owner/dashboard" replace />;
  }

  return <Outlet />;
};
