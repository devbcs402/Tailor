import React, { createContext, useContext, useState, useEffect } from 'react';
import { authApi } from '../api/authApi';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(() => {
    try {
      const savedUser = localStorage.getItem('tailor_user');
      return savedUser ? JSON.parse(savedUser) : null;
    } catch {
      return null;
    }
  });
  const [token, setToken] = useState(() => localStorage.getItem('tailor_token') || null);
  const [loading, setLoading] = useState(true);

  // Sync session on mount
  useEffect(() => {
    const checkAuth = async () => {
      const savedToken = localStorage.getItem('tailor_token');
      if (savedToken) {
        try {
          const res = await authApi.getMe();
          setUser(res.user);
          localStorage.setItem('tailor_user', JSON.stringify(res.user));
        } catch (err) {
          console.warn('[Auth] Session validation failed:', err.message);
          logout();
        }
      }
      setLoading(false);
    };

    checkAuth();

    const handleAutoLogout = () => {
      setUser(null);
      setToken(null);
    };

    window.addEventListener('tailor_auth_logout', handleAutoLogout);
    return () => window.removeEventListener('tailor_auth_logout', handleAutoLogout);
  }, []);

  const login = async (email, password) => {
    const res = await authApi.login({ email, password });
    if (res.success && res.token) {
      localStorage.setItem('tailor_token', res.token);
      localStorage.setItem('tailor_user', JSON.stringify(res.user));
      setToken(res.token);
      setUser(res.user);
      return res;
    }
    throw new Error(res.message || 'Login failed');
  };

  const changePassword = async (data) => {
    const res = await authApi.changePassword(data);
    if (res.success) {
      if (res.token) {
        localStorage.setItem('tailor_token', res.token);
        setToken(res.token);
      }
      if (res.user) {
        localStorage.setItem('tailor_user', JSON.stringify(res.user));
        setUser(res.user);
      }
      return res;
    }
    throw new Error(res.message || 'Password update failed');
  };

  const logout = async () => {
    try {
      await authApi.logout();
    } catch {
      // Ignore network errors on logout
    } finally {
      localStorage.removeItem('tailor_token');
      localStorage.removeItem('tailor_user');
      setUser(null);
      setToken(null);
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        isAuthenticated: !!token,
        loading,
        login,
        logout,
        changePassword,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
