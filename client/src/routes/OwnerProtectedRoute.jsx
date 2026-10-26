import React from 'react';
import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Loading } from '../components/common/Loading';

export const OwnerProtectedRoute = () => {
  const { isAuthenticated, user, loading } = useAuth();

  if (loading) {
    return <Loading text="Verifying owner session..." fullScreen />;
  }

  if (!isAuthenticated) {
    return <Navigate to="/owner/login" replace />;
  }

  if (user?.role !== 'platform_owner') {
    // Non-owner users must not access the owner portal
    return <Navigate to="/" replace />;
  }

  return <Outlet />;
};
