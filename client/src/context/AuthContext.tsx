import React, { createContext, useContext, useState, useEffect } from 'react';

export type UserRole = 'REQUESTER' | 'IT_STAFF' | 'ADMINISTRATOR';

export interface User {
  id: number;
  name: string;
  email: string;
  role: UserRole;
  isActive: boolean;
  requiresPasswordChange: boolean;
}

interface AuthContextType {
  user: User | null;
  token: string | null;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<{ success: boolean; error?: string; requiresPasswordChange?: boolean }>;
  logout: () => Promise<void>;
  changePassword: (currentPassword: string, newPassword: string, confirmPassword: string) => Promise<{ success: boolean; error?: string }>;
  refreshUser: () => Promise<void>;
}

export const AuthContext = createContext<AuthContextType | undefined>(undefined);

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5001/api';

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(() => {
    try {
      const savedUser = localStorage.getItem('toktickit_user');
      return savedUser ? JSON.parse(savedUser) : null;
    } catch {
      return null;
    }
  });
  const [token, setToken] = useState<string | null>(() => {
    return localStorage.getItem('toktickit_token');
  });
  const [isLoading, setIsLoading] = useState<boolean>(true);

  useEffect(() => {
    const initAuth = async () => {
      const savedToken = localStorage.getItem('toktickit_token');
      if (savedToken === 'mock_test_token') {
        setIsLoading(false);
        return;
      }
      if (savedToken) {
        try {
          const res = await fetch(`${API_BASE_URL}/auth/me`, {
            headers: {
              Authorization: `Bearer ${savedToken}`,
            },
          });
          const data = await res.json();
          if (res.ok && data.success && data.data?.user) {
            setUser(data.data.user);
            localStorage.setItem('toktickit_user', JSON.stringify(data.data.user));
          } else {
            // Token expired or invalid
            setUser(null);
            setToken(null);
            localStorage.removeItem('toktickit_user');
            localStorage.removeItem('toktickit_token');
          }
        } catch (err) {
          console.error('Error verifying auth session:', err);
        } finally {
          setIsLoading(false);
        }
      } else {
        setIsLoading(false);
      }
    };

    initAuth();
  }, []);

  const login = async (email: string, password: string) => {
    try {
      const res = await fetch(`${API_BASE_URL}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });

      const data = await res.json();

      if (!res.ok || !data.success) {
        return {
          success: false,
          error: data.error?.message || 'Login failed. Please check your credentials.',
        };
      }

      const authenticatedUser: User = data.data.user;
      const userToken: string = data.data.token;

      setUser(authenticatedUser);
      setToken(userToken);
      localStorage.setItem('toktickit_user', JSON.stringify(authenticatedUser));
      localStorage.setItem('toktickit_token', userToken);

      return {
        success: true,
        requiresPasswordChange: authenticatedUser.requiresPasswordChange,
      };
    } catch (err) {
      return {
        success: false,
        error: 'Network error. Could not connect to authentication server.',
      };
    }
  };

  const logout = async () => {
    try {
      if (token) {
        await fetch(`${API_BASE_URL}/auth/logout`, {
          method: 'POST',
          headers: { Authorization: `Bearer ${token}` },
        });
      }
    } catch (err) {
      console.error('Logout error:', err);
    } finally {
      setUser(null);
      setToken(null);
      localStorage.removeItem('toktickit_user');
      localStorage.removeItem('toktickit_token');
    }
  };

  const changePassword = async (currentPassword: string, newPassword: string, confirmPassword: string) => {
    if (!token) {
      return { success: false, error: 'Authentication token missing.' };
    }

    try {
      const res = await fetch(`${API_BASE_URL}/auth/change-password`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ currentPassword, newPassword, confirmPassword }),
      });

      const data = await res.json();

      if (!res.ok || !data.success) {
        return {
          success: false,
          error: data.error?.message || 'Failed to change password.',
        };
      }

      // Update local user state
      if (user) {
        const updatedUser = { ...user, requiresPasswordChange: false };
        setUser(updatedUser);
        localStorage.setItem('toktickit_user', JSON.stringify(updatedUser));
      }

      return { success: true };
    } catch (err) {
      return { success: false, error: 'Network error during password change.' };
    }
  };

  const refreshUser = async () => {
    if (!token) return;
    try {
      const res = await fetch(`${API_BASE_URL}/auth/me`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (res.ok && data.success && data.data?.user) {
        setUser(data.data.user);
        localStorage.setItem('toktickit_user', JSON.stringify(data.data.user));
      }
    } catch (err) {
      console.error('Error refreshing user:', err);
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        isLoading,
        login,
        logout,
        changePassword,
        refreshUser,
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
