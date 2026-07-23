import { AnimatePresence, motion } from 'framer-motion';
import { AlertCircle, AlertTriangle, CheckCircle, Info, X } from 'lucide-react';
import { useToasts } from '../context/ToastContext';

const ICON = {
  info: Info,
  success: CheckCircle,
  warning: AlertTriangle,
  error: AlertCircle,
} as const;

const ACCENT = {
  info: { color: 'text-primary', bar: 'bg-primary', border: 'border-primary/30' },
  success: { color: 'text-success', bar: 'bg-success', border: 'border-success/40' },
  warning: { color: 'text-tertiary', bar: 'bg-tertiary', border: 'border-tertiary/40' },
  error: { color: 'text-error', bar: 'bg-error', border: 'border-error/50' },
} as const;

export default function ToastStack() {
  const { toasts, dismissToast } = useToasts();
  return (
    <div className="fixed top-20 right-6 z-[100] flex flex-col gap-3 pointer-events-none w-80">
      <AnimatePresence initial={false}>
        {toasts.map((t) => {
          const Icon = ICON[t.type];
          const accent = ACCENT[t.type];
          return (
            <motion.div
              key={t.id}
              layout
              initial={{ opacity: 0, x: 60, scale: 0.9 }}
              animate={{ opacity: 1, x: 0, scale: 1 }}
              exit={{ opacity: 0, x: 30, scale: 0.95 }}
              transition={{ type: 'spring', stiffness: 380, damping: 30 }}
              className={`pointer-events-auto rounded-lg bg-surface-container-highest/95 backdrop-blur-md border ${accent.border} p-3 shadow-2xl flex gap-3 relative overflow-hidden`}
            >
              <div className={`absolute left-0 top-0 bottom-0 w-1 ${accent.bar}`} />
              <div className="flex-shrink-0 mt-0.5">
                <Icon className={`w-5 h-5 ${accent.color}`} />
              </div>
              <div className="flex-grow min-w-0">
                <div
                  className={`text-[11px] font-semibold uppercase tracking-widest ${accent.color} mb-1 flex justify-between`}
                >
                  <span className="truncate">{t.title}</span>
                  <button
                    onClick={() => dismissToast(t.id)}
                    className="opacity-60 hover:opacity-100 transition-opacity ml-2"
                    aria-label="Dismiss"
                  >
                    <X className="w-3 h-3 text-on-surface-variant hover:text-on-surface" />
                  </button>
                </div>
                <div className="text-[13px] text-on-surface leading-snug font-medium break-words">
                  {t.message}
                </div>
              </div>
            </motion.div>
          );
        })}
      </AnimatePresence>
    </div>
  );
}
