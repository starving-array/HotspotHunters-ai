import { memo, useEffect, useMemo, useRef, useState } from 'react';
import type { Alert } from '../types';
import { getInitialAlerts, subscribeAlerts } from '../api/alerts';

const BUFFER_MAX = 100;

const SEVERITY_STYLE: Record<
  Alert['severity'],
  { border: string; chip: string }
> = {
  critical: { border: 'border-l-error', chip: 'text-error bg-error/10' },
  high: { border: 'border-l-error', chip: 'text-error bg-error/10' },
  medium: { border: 'border-l-tertiary', chip: 'text-tertiary bg-tertiary/10' },
  low: { border: 'border-l-primary', chip: 'text-primary bg-primary/10' },
};

function fmtRelative(ts: string): string {
  const then = new Date(ts).getTime();
  const diff = Date.now() - then;
  const m = Math.floor(diff / 60000);
  if (m < 1) return 'just now';
  if (m < 60) return `${m} mins ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.floor(h / 24);
  return `${d}d ago`;
}

interface FeedEntryProps {
  alert: Alert;
  isNew: boolean;
}

const FeedEntry = memo(function FeedEntry({ alert, isNew }: FeedEntryProps) {
  const style = SEVERITY_STYLE[alert.severity] || SEVERITY_STYLE.low;
  return (
    <div
      className={`bg-surface-container-lowest border border-outline-variant/30 border-l-2 ${style.border} rounded p-3 hover:bg-surface-container-highest transition-colors cursor-pointer group`}
    >
      <div className="flex justify-between items-start mb-1">
        <div className="flex gap-2 items-center">
          <span className={`text-[11px] font-semibold uppercase tracking-widest px-1.5 rounded ${style.chip}`}>
            {alert.severity === 'critical' || alert.severity === 'high' ? 'Heinous' : alert.crimeType}
          </span>
          {alert.severity !== 'critical' && (
            <span className="text-[11px] font-semibold uppercase tracking-widest text-on-surface">
              {alert.crimeType}
            </span>
          )}
        </div>
        <span className="text-[11px] text-on-surface-variant tabular-nums font-mono">
          {fmtRelative(alert.timestamp)}
        </span>
      </div>
      <div className="font-mono text-[13px] text-on-surface-variant mt-2 group-hover:text-primary transition-colors tabular-nums">
        {alert.crimeNo}
      </div>
      <div className="text-[11px] text-outline mt-1 font-mono">
        {alert.district}
      </div>
      {isNew && (
        <span className="absolute top-2 right-2 w-1.5 h-1.5 rounded-full bg-primary animate-led-pulse" />
      )}
    </div>
  );
});

interface Props {
  alerts?: Alert[];
  unreadLabel?: string;
}

export default function LiveFIRFeed({ alerts: external, unreadLabel }: Props) {
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [unread, setUnread] = useState(0);

  useEffect(() => {
    let unsub = () => {};
    getInitialAlerts().then((seed) => {
      setAlerts(seed);
      setUnread(seed.length);
    });
    unsub = subscribeAlerts((a) =>
      setAlerts((prev) => [a, ...prev].slice(0, BUFFER_MAX)),
    );
    return () => unsub();
  }, []);

  const source = external ?? alerts;
  const buffered = useMemo(() => source.slice(0, BUFFER_MAX), [source]);

  const idleTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => {
    if (idleTimer.current) clearTimeout(idleTimer.current);
    idleTimer.current = setTimeout(() => setUnread(0), 3000);
    return () => {
      if (idleTimer.current) clearTimeout(idleTimer.current);
    };
  }, [buffered]);

  return (
    <section className="bg-surface-container/80 backdrop-blur-md border border-outline-variant rounded-lg flex flex-col flex-1 min-h-0 relative">
      <div className="p-3 border-b border-outline-variant/30 flex justify-between items-center bg-surface-container-low/50">
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-error animate-led-pulse" />
          <h2 className="text-[11px] font-semibold uppercase tracking-widest text-on-surface">
            Live Feed
          </h2>
        </div>
        <span className="text-[11px] font-semibold uppercase tracking-widest text-on-surface-variant bg-surface-variant px-2 py-0.5 rounded tabular-nums">
          {unreadLabel ?? `${unread} unread`}
        </span>
      </div>
      <div className="flex-1 overflow-y-auto p-2 space-y-2">
        {buffered.length === 0 && (
          <div className="text-center py-8 text-outline text-sm">
            Waiting for live telemetry…
          </div>
        )}
        {buffered.map((a, i) => (
          <FeedEntry key={a.id} alert={a} isNew={i === 0 && unread > 0} />
        ))}
      </div>
    </section>
  );
}