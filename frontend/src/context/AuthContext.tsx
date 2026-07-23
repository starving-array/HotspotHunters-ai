import React, { createContext, useContext, useState, useCallback, useEffect, type ReactNode } from 'react';

// ============================================================
// TODO(known-issues):
//   S1 — Login flow has NO password. `login(uname)` only POSTs
//        { username } → backend. Add pwd field + bcrypt check.
//   S2 — JWT stored in localStorage — XSS token-theft risk.
//        Migrate to httpOnly+Secure+SameSite=Strict cookies.
// (See frontend_dev_plan_final.md §6 Security — deferred.)
// ============================================================

interface AuthState {
  token: string | null;
  username: string | null;
  login: (username: string) => Promise<void>;
  logout: () => void;
  isAuthenticated: boolean;
}

const AuthContext = createContext<AuthState | null>(null);

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [token, setToken] = useState<string | null>(() => localStorage.getItem('jwt_token'));
  const [username, setUsername] = useState<string | null>(() => localStorage.getItem('jwt_username'));

  useEffect(() => {
    if (token) localStorage.setItem('jwt_token', token);
    else localStorage.removeItem('jwt_token');
  }, [token]);

  useEffect(() => {
    if (username) localStorage.setItem('jwt_username', username);
    else localStorage.removeItem('jwt_username');
  }, [username]);

  const login = useCallback(async (uname: string) => {
    const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:8080';
    const resp = await fetch(`${apiUrl}/api/v1/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username: uname }),
    });
    if (!resp.ok) throw new Error('Login failed');
    const data = await resp.json();
    setToken(data.token);
    setUsername(uname);
  }, []);

  const logout = useCallback(() => {
    setToken(null);
    setUsername(null);
  }, []);

  return (
    <AuthContext.Provider value={{ token, username, login, logout, isAuthenticated: !!token }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = (): AuthState => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
};
