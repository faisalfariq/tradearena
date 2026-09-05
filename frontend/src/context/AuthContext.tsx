'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';

export interface AuthUser {
  id: string;
  email: string;
  name: string;
  role: string;
}

interface AuthContextType {
  user: AuthUser | null;
  token: string | null;
  isLoading: boolean;
  login: (email: string, pass: string) => Promise<{ success: boolean; message?: string }>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3333/api/v1';

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  const logout = React.useCallback(async () => {
    const currentToken = localStorage.getItem('tradearena_access_token');
    const refreshToken = localStorage.getItem('tradearena_refresh_token');

    if (currentToken) {
      try {
        await fetch(`${API_BASE}/auth/logout`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${currentToken}`,
          },
          body: JSON.stringify({ refreshToken }),
        });
      } catch {
        // Silently clear client session even if offline
      }
    }

    setToken(null);
    setUser(null);
    localStorage.removeItem('tradearena_access_token');
    localStorage.removeItem('tradearena_refresh_token');
    localStorage.removeItem('tradearena_user');
  }, []);

  // Restore session from localStorage on client mount
  useEffect(() => {
    const storedToken = localStorage.getItem('tradearena_access_token');
    const storedUser = localStorage.getItem('tradearena_user');

    if (storedToken && storedUser) {
      try {
        setToken(storedToken);
        setUser(JSON.parse(storedUser));
        // Verify token with backend
        fetch(`${API_BASE}/auth/me`, {
          headers: { Authorization: `Bearer ${storedToken}` },
        })
          .then((res) => {
            if (res.ok) {
              return res.json();
            }
            throw new Error('Expired');
          })
          .then((userData) => {
            setUser(userData);
            localStorage.setItem('tradearena_user', JSON.stringify(userData));
          })
          .catch(() => {
            // Token expired or invalid
            logout();
          })
          .finally(() => setIsLoading(false));
      } catch {
        logout();
        setIsLoading(false);
      }
    } else {
      setIsLoading(false);
    }
  }, [logout]);

  const login = async (email: string, pass: string) => {
    try {
      const res = await fetch(`${API_BASE}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password: pass }),
      });

      const data = await res.json();

      if (!res.ok) {
        return {
          success: false,
          message: data.message || 'Login gagal. Silakan periksa kredensial Anda.',
        };
      }

      setToken(data.accessToken);
      setUser(data.user);
      localStorage.setItem('tradearena_access_token', data.accessToken);
      localStorage.setItem('tradearena_refresh_token', data.refreshToken);
      localStorage.setItem('tradearena_user', JSON.stringify(data.user));

      return { success: true };
    } catch {
      return {
        success: false,
        message: 'Gagal terhubung ke server backend API.',
      };
    }
  };

  return (
    <AuthContext.Provider value={{ user, token, isLoading, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
