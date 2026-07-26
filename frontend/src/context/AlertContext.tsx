import React, {
  createContext,
  useContext,
  useState,
  useCallback,
  useEffect,
  useRef,
  type ReactNode,
} from 'react';
import type { Alert } from '../types';
import { subscribeAlerts } from '../api/alerts';
import { useAuth } from './AuthContext';

const LIVE_BUFFER_MAX = 10;

interface AlertContextValue {
  alerts: Alert[];
  onNewAlert: (cb: (alert: Alert) => void) => () => void;
}

const AlertContext = createContext<AlertContextValue | null>(null);

export const AlertProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const { isAuthenticated } = useAuth();
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const listenersRef = useRef<Set<(alert: Alert) => void>>(new Set());

  useEffect(() => {
    if (!isAuthenticated) return;

    const unsub = subscribeAlerts((alert) => {
      setAlerts((prev) => [alert, ...prev].slice(0, LIVE_BUFFER_MAX));
      listenersRef.current.forEach((cb) => cb(alert));
    });

    return unsub;
  }, [isAuthenticated]);

  const onNewAlert = useCallback((cb: (alert: Alert) => void) => {
    listenersRef.current.add(cb);
    return () => { listenersRef.current.delete(cb); };
  }, []);

  return (
    <AlertContext.Provider value={{ alerts, onNewAlert }}>
      {children}
    </AlertContext.Provider>
  );
};

export const useAlerts = (): Alert[] => {
  const ctx = useContext(AlertContext);
  if (!ctx) throw new Error('useAlerts must be used within AlertProvider');
  return ctx.alerts;
};

export const useOnNewAlert = (cb: (alert: Alert) => void): void => {
  const ctx = useContext(AlertContext);
  if (!ctx) throw new Error('useOnNewAlert must be used within AlertProvider');
  useEffect(() => ctx.onNewAlert(cb), [ctx, cb]);
};
