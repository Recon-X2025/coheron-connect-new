import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { apiService } from '../services/apiService';

export interface AuthUser {
  userId: string;
  uid: number;
  email: string;
  name: string;
  tenant_id?: string;
  roles?: string[];
  permissions?: string[];
}

interface AuthContextValue {
  user: AuthUser | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const loadUser = useCallback(async () => {
    const token = localStorage.getItem('authToken');
    if (!token) {
      setUser(null);
      setIsLoading(false);
      return;
    }
    try {
      // Decode JWT payload to get user info (no verification - server does that)
      const payload = JSON.parse(atob(token.split('.')[1]));
      setUser({
        userId: payload.userId,
        uid: payload.uid,
        email: payload.email,
        name: payload.name || payload.email,
        tenant_id: payload.tenant_id,
        roles: payload.roles,
        permissions: payload.permissions,
      });
    } catch {
      localStorage.removeItem('authToken');
      setUser(null);
    }
    setIsLoading(false);
  }, []);

  useEffect(() => {
    loadUser();
  }, [loadUser]);

  const login = async (email: string, password: string) => {
    const data = await apiService.login(email, password);
    // Token is already saved by apiService.login
    const payload = JSON.parse(atob(data.token.split('.')[1]));
    setUser({
      userId: payload.userId,
      uid: payload.uid,
      email: payload.email,
      name: payload.name || payload.email,
      tenant_id: payload.tenant_id,
      roles: payload.roles,
      permissions: payload.permissions,
    });
  };

  const logout = () => {
    apiService.logout();
    setUser(null);
  };

  const refreshUser = async () => {
    await loadUser();
  };

  return (
    <AuthContext.Provider value={{
      user,
      isAuthenticated: !!user,
      isLoading,
      login,
      logout,
      refreshUser,
    }}>
      {children}
    </AuthContext.Provider>
  );
};

export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
