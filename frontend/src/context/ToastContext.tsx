import React, {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';

export interface Toast {
  id: string;
  type: 'info' | 'success' | 'warning' | 'error';
  title: string;
  message: string;
}

type PushToast = (
  toast: Omit<Toast, 'id'> & { id?: string; durationMs?: number },
) => void;

interface ToastContextValue {
  toasts: Toast[];
  pushToast: PushToast;
  dismissToast: (id: string) => void;
}

const ToastContext = createContext<ToastContextValue | null>(null);

const AUTO_DISMISS_MS = 5000;

export const ToastProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const counter = useRef(0);
  const timers = useRef<Map<string, ReturnType<typeof setTimeout>>>(new Map());

  const dismissToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
    const tmr = timers.current.get(id);
    if (tmr) {
      clearTimeout(tmr);
      timers.current.delete(id);
    }
  }, []);

  const pushToast = useCallback<PushToast>(
    (input) => {
      const id = input.id || `toast-${++counter.current}`;
      const next: Toast = {
        id,
        type: input.type,
        title: input.title,
        message: input.message,
      };
      setToasts((prev) => [next, ...prev].slice(0, 5));
      const duration = input.durationMs ?? AUTO_DISMISS_MS;
      if (duration > 0) {
        const tmr = setTimeout(() => dismissToast(id), duration);
        timers.current.set(id, tmr);
      }
    },
    [dismissToast],
  );

  const value = useMemo<ToastContextValue>(
    () => ({ toasts, pushToast, dismissToast }),
    [toasts, pushToast, dismissToast],
  );

  return <ToastContext.Provider value={value}>{children}</ToastContext.Provider>;
};

export const useToasts = (): ToastContextValue => {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error('useToasts must be used within ToastProvider');
  return ctx;
};

export default ToastContext;
