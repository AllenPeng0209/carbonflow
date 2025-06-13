import React, { createContext, useContext, useMemo, useEffect } from 'react';
import type { ReactNode } from 'react';
import { useAuth } from '../hooks/useAuth';
import type { AuthUser } from '../hooks/useAuth';

interface AuthContextType {
  user: AuthUser | null;
  loading: boolean;
  error: string | null;
  login: (email: string, password: string) => Promise<{ success: boolean; error?: string }>;
  logout: () => Promise<{ success: boolean; error?: string }>;
  register: (
    fullName: string,
    email: string,
    password: string,
    company?: string,
  ) => Promise<{ success: boolean; error?: string }>;
  loginWithGoogle: () => Promise<{ success: boolean; error?: string }>;
  checkAuth: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const auth = useAuth();

  // 使用useMemo优化性能，避免不必要的重渲染
  const value = useMemo(
    () => ({
      ...auth,
      checkAuth: auth.checkAuth,
      login: auth.login,
      logout: auth.logout,
      register: auth.register,
      loginWithGoogle: auth.loginWithGoogle,
    }),
    [auth.user, auth.loading, auth.error, auth.checkAuth, auth.login, auth.logout, auth.register, auth.loginWithGoogle],
  );

  // 在组件挂载时检查认证状态
  useEffect(() => {
    auth.checkAuth();
  }, []);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuthContext = (): AuthContextType => {
  const context = useContext(AuthContext);

  if (context === undefined) {
    throw new Error('useAuthContext must be used within an AuthProvider');
  }

  return context;
};
