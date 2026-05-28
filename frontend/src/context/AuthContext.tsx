'use client';

import React, { createContext, useState, useEffect, ReactNode } from 'react';
import { User } from '@/lib/types';
import { api } from '@/lib/api';
import { API_URL } from '@/lib/constants';

interface AuthContextType {
  user: User | null;
  loading: boolean;
  login: () => void;
  logout: () => Promise<void>;
}

export const AuthContext = createContext<AuthContextType>({
  user: null,
  loading: true,
  login: () => {},
  logout: async () => {},
});

let cachedUser: User | null = null;
let hasCheckedCurrentUser = false;
let currentUserPromise: Promise<User | null> | null = null;

async function getCurrentUser(): Promise<User | null> {
  if (hasCheckedCurrentUser) {
    return cachedUser;
  }

  if (!currentUserPromise) {
    currentUserPromise = api
      .get<{ success: boolean; user: User | null }>('/api/auth/me')
      .then((response) => {
        cachedUser = response.user;
        hasCheckedCurrentUser = true;
        return cachedUser;
      })
      .catch((error) => {
        if ((error as { status?: number }).status === 429) {
          console.warn('Auth session check was rate limited. Continuing as signed out for now.');
        }
        cachedUser = null;
        hasCheckedCurrentUser = true;
        return null;
      })
      .finally(() => {
        currentUserPromise = null;
      });
  }

  return currentUserPromise;
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;

    getCurrentUser()
      .then((currentUser) => {
        if (isMounted) {
          setUser(currentUser);
        }
      })
      .finally(() => {
        if (isMounted) {
          setLoading(false);
        }
      });

    return () => {
      isMounted = false;
    };
  }, []);

  const login = () => {
    window.location.href = `${API_URL}/api/v1/auth/google`;
  };

  const logout = async () => {
    try {
      await api.post('/api/auth/logout');
      cachedUser = null;
      hasCheckedCurrentUser = true;
      setUser(null);
      window.location.href = '/';
    } catch (error) {
      console.error('Logout failed', error);
    }
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}
