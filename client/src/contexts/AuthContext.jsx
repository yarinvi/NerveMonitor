import { createContext, useContext, useState, useEffect } from 'react';
import { login as loginApi, logout as logoutApi, checkAuthStatus } from '../api/auth';
import { useLocation } from 'react-router-dom';
import LoadingSpinner from '../components/LoadingSpinner';

const AuthContext = createContext(null);

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}

export function AuthProvider({ children }) {
  const [currentUser, setCurrentUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const location = useLocation();

  useEffect(() => {
    const initAuth = async () => {
      if (['/login', '/register', '/', '/gallery', '/contact'].includes(location.pathname)) {
        setLoading(false);
        return;
      }

      try {
        const user = await checkAuthStatus();
        setCurrentUser(user);
      } catch (error) {
        console.error('Auth initialization error:', error);
        setCurrentUser(null);
      } finally {
        setLoading(false);
      }
    };

    initAuth();
  }, [location.pathname]);

  const login = async (credentials) => {
    try {
      setLoading(true);
      const response = await loginApi(credentials);
      setCurrentUser(response.user);
      return response;
    } catch (error) {
      setCurrentUser(null);
      throw error;
    } finally {
      setLoading(false);
    }
  };

  const signInWithGoogle = async () => {
    try {
      setLoading(true);
      const response = await loginApi({ provider: 'google' });
      setCurrentUser(response.user);
      return response;
    } catch (error) {
      setCurrentUser(null);
      throw error;
    } finally {
      setLoading(false);
    }
  };

  const logout = async () => {
    try {
      setLoading(true);
      await logoutApi();
      setCurrentUser(null);
    } catch (error) {
      console.error('Logout error:', error);
      throw error;
    } finally {
      setLoading(false);
    }
  };

  const value = {
    currentUser,
    login,
    logout,
    loading,
    signInWithGoogle
  };

  if (loading) {
    return <LoadingSpinner />;
  }

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
} 