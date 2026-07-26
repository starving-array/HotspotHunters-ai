import React, { createContext, useContext, useState, useCallback, useEffect, type ReactNode } from 'react';

interface AuthState {
  token: string | null;
  username: string | null;
  role: string | null;
  login: (username: string, password: string) => Promise<void>;
  logout: () => void;
  refreshAuth: () => Promise<string | null>;
  validateSession: () => Promise<boolean>;
  isAuthenticated: boolean;
  loading: boolean;
}

const AuthContext = createContext<AuthState | null>(null);

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [token, setToken] = useState<string | null>(() => localStorage.getItem('jwt_token'));
  const [username, setUsername] = useState<string | null>(null);
  const [role, setRole] = useState<string | null>(null);
  const hasStoredToken = !!localStorage.getItem('jwt_token');
  const [loading, setLoading] = useState(hasStoredToken && window.location.pathname !== '/login');

  // Validate session on mount — skip the login page to avoid a
  // needless /me 401 in console.  Stale tokens get cleared here so
  // subsequent API calls don't fail with 403.
  useEffect(() => {
    const storedToken = localStorage.getItem('jwt_token');
    if (!storedToken || window.location.pathname === '/login') {
      setLoading(false);
      return;
    }

    setLoading(true);
    (async () => {
      try {
        let activeToken = storedToken;
        let resp = await fetch('/api/v1/auth/me', {
          credentials: 'include',
          headers: { 'Authorization': `Bearer ${activeToken}` },
        });
        if (!resp.ok) {
          // token might be expired — try refresh
          const rt = localStorage.getItem('jwt_refresh');
          if (rt) {
            const refreshResp = await fetch('/api/v1/auth/refresh', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              credentials: 'include',
              body: JSON.stringify({ refreshToken: rt }),
            });
            if (refreshResp.ok) {
              const refreshData = await refreshResp.json();
              activeToken = refreshData.token;
              localStorage.setItem('jwt_token', activeToken);
              if (refreshData.role) setRole(refreshData.role);
              resp = await fetch('/api/v1/auth/me', {
                credentials: 'include',
                headers: { 'Authorization': `Bearer ${activeToken}` },
              });
            }
          }
        }
        if (!resp.ok) throw new Error('Not authenticated');
        const data = await resp.json();
        setToken(activeToken);
        setUsername(data.username);
        if (data.role) setRole(data.role);
      } catch {
        setUsername(null);
        setRole(null);
        setToken(null);
        localStorage.removeItem('jwt_token');
        localStorage.removeItem('jwt_refresh');
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  // Manual session validator — used by Settings page and wherever
  // username/role are needed outside the initial mount.
  const validateSession = useCallback(async (): Promise<boolean> => {
    const storedToken = localStorage.getItem('jwt_token');
    if (!storedToken) return false;
    try {
      const resp = await fetch('/api/v1/auth/me', {
        credentials: 'include',
        headers: { 'Authorization': `Bearer ${storedToken}` },
      });
      if (!resp.ok) throw new Error('Not authenticated');
      const data = await resp.json();
      setUsername(data.username);
      setRole(data.role);
      return true;
    } catch {
      setUsername(null);
      setRole(null);
      setToken(null);
      localStorage.removeItem('jwt_token');
      localStorage.removeItem('jwt_refresh');
      return false;
    }
  }, []);

  const login = useCallback(async (uname: string, pwd: string) => {
    const resp = await fetch('/api/v1/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ username: uname, password: pwd }),
    });
    if (!resp.ok) {
      const err = await resp.json().catch(() => ({}));
      throw new Error(err.error || 'Login failed');
    }
    const data = await resp.json();
    localStorage.setItem('jwt_token', data.token);
    localStorage.setItem('jwt_refresh', data.refreshToken);
    setToken(data.token);
    setUsername(uname);
    setRole(data.role);
  }, []);

  const logout = useCallback(async () => {
    await fetch('/api/v1/auth/logout', { method: 'POST', credentials: 'include' }).catch(() => {});
    setToken(null);
    setUsername(null);
    setRole(null);
    localStorage.removeItem('jwt_token');
    localStorage.removeItem('jwt_refresh');
    localStorage.removeItem('jwt_username');
    localStorage.removeItem('jwt_role');
  }, []);

  const refreshAuth = useCallback(async (): Promise<string | null> => {
    const rt = localStorage.getItem('jwt_refresh');
    if (!rt) return null;
    try {
      const resp = await fetch('/api/v1/auth/refresh', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ refreshToken: rt }),
      });
      if (!resp.ok) {
        logout();
        return null;
      }
      const data = await resp.json();
      setToken(data.token);
      if (data.role) setRole(data.role);
      return data.token;
    } catch {
      logout();
      return null;
    }
  }, [logout]);

  return (
    <AuthContext.Provider value={{ token, username, role, login, logout, refreshAuth, validateSession, isAuthenticated: !!username, loading }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = (): AuthState => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
};
