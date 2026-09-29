import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';

import { onSessionExpired } from '@/lib/authEvents';
import { clearStoredAuth, getStoredAuth, setStoredAuth } from '@/lib/authStorage';

interface AuthContextValue {
  isLoading: boolean;
  isLoggedIn: boolean;
  login: (accessToken?: string, refreshToken?: string) => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [isLoading, setIsLoading] = useState(true);
  const [isLoggedIn, setIsLoggedIn] = useState(false);

  useEffect(() => {
    getStoredAuth()
      .then(({ isLoggedIn: stored }) => setIsLoggedIn(stored))
      .finally(() => setIsLoading(false));

    // lib/api.ts가 refresh_token까지 무효라 세션을 못 살릴 때 저장소를 직접
    // 지우고 이걸 쏜다 — 화면이 다음 API 실패 전까지 계속 "로그인된 것처럼"
    // 남아있지 않도록 즉시 반영한다.
    return onSessionExpired(() => setIsLoggedIn(false));
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({
      isLoading,
      isLoggedIn,
      login: async (accessToken?: string, refreshToken?: string) => {
        await setStoredAuth(accessToken, refreshToken);
        setIsLoggedIn(true);
      },
      logout: async () => {
        await clearStoredAuth();
        setIsLoggedIn(false);
      },
    }),
    [isLoading, isLoggedIn],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
