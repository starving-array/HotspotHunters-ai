import { useEffect, useState } from 'react';
import { Filter, Search } from 'lucide-react';
import { getAuditTrail } from '../api/auditTrail';
import { useLanguage, translations, type TranslationKey } from '../context/LanguageContext';

const LABEL_MAP: Record<AuditAction | 'all', TranslationKey> = {
  all: 'all', [AuditAction.Query]: 'query', [AuditAction.Login]: 'login', [AuditAction.Export]: 'export', [AuditAction.View]: 'view', [AuditAction.Alert]: 'alert',
};
import type { AuditEvent } from '../types';
import { AuditAction } from '../types/enums';

const ACTION_BADGE: Record<AuditAction, { bg: string; text: string }> = {
  [AuditAction.Query]: { bg: 'bg-primary/15', text: 'text-primary' },
  [AuditAction.Login]: { bg: 'bg-emerald-400/15', text: 'text-emerald-400' },
  [AuditAction.Export]: { bg: 'bg-tertiary/15', text: 'text-tertiary' },
  [AuditAction.View]: { bg: 'bg-outline-variant/30', text: 'text-on-surface-variant' },
  [AuditAction.Alert]: { bg: 'bg-error/15', text: 'text-error' },
};

const FILTER_OPTIONS: { value: AuditAction | 'all'; label: AuditAction | 'all' }[] = [
  { value: 'all', label: 'all' },
  { value: AuditAction.Query, label: AuditAction.Query },
  { value: AuditAction.Login, label: AuditAction.Login },
  { value: AuditAction.Export, label: AuditAction.Export },
  { value: AuditAction.View, label: AuditAction.View },
  { value: AuditAction.Alert, label: AuditAction.Alert },
];

function fmtTimestamp(ts: string): string {
  const d = new Date(ts);
  return d.toLocaleString('en-GB', {
    year: 'numeric', month: 'short', day: '2-digit',
    hour: '2-digit', minute: '2-digit', second: '2-digit',
    hour12: false,
  });
}

export default function AuditTrailPage() {
  const { t } = useLanguage();
  const [events, setEvents] = useState<AuditEvent[]>([]);
  const [actionFilter, setActionFilter] = useState<AuditAction | 'all'>('all');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function refresh() {
    setLoading(true);
    const data = await getAuditTrail({ action: actionFilter, startDate, endDate });
    setEvents(data);
    setLoading(false);
  }

  function applyFilters() {
    refresh();
  }

  return (
    <div className="flex flex-col h-full">
      <header className="mb-4">
        <h1 className="text-[24px] font-semibold text-on-surface mb-1 tracking-tight">
          Audit Trail
        </h1>
        <p className="text-[14px] text-on-surface-variant">
          {t('auditTrailSubtitle')}
        </p>
      </header>

      <section className="bg-surface-container/80 backdrop-blur-md border border-outline-variant rounded-lg p-3 mb-4 flex flex-wrap items-center gap-3">
        <div className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-widest text-on-surface-variant">
          <Filter className="w-3.5 h-3.5 text-primary" />
          Filters
        </div>

        <div className="flex gap-1">
          {FILTER_OPTIONS.map((opt) => (
            <button
              key={opt.value}
              onClick={() => setActionFilter(opt.value)}
              className={`px-2.5 py-1 rounded text-[11px] font-mono uppercase tracking-widest transition-colors ${
                actionFilter === opt.value
                  ? 'bg-primary/20 border border-primary/50 text-primary'
                  : 'bg-surface-container-low border border-outline-variant/30 text-on-surface-variant hover:bg-surface-variant'
              }`}
            >
              {LABEL_MAP[opt.label]}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-1.5 text-[12px] text-on-surface-variant font-mono">
          <label className="text-outline">From</label>
          <input
            type="date"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value + 'T00:00:00')}
            className="bg-surface-container border border-outline-variant/30 rounded px-2 py-1 text-on-surface focus:outline-none focus:border-primary/50"
          />
          <label className="text-outline ml-2">To</label>
          <input
            type="date"
            value={endDate.slice(0, 10)}
            onChange={(e) => setEndDate(e.target.value + 'T23:59:59')}
            className="bg-surface-container border border-outline-variant/30 rounded px-2 py-1 text-on-surface focus:outline-none focus:border-primary/50"
          />
        </div>

        <button
          onClick={applyFilters}
          className="px-3 py-1 bg-primary/10 border border-primary/30 rounded text-[11px] font-semibold uppercase tracking-widest text-primary hover:bg-primary/20 transition-colors"
        >
          Apply
        </button>

        <span className="ml-auto text-[12px] font-mono text-outline tabular-nums">
          {events.length} {t('events')}{loading ? ' · loading…' : ''}
        </span>
      </section>

      <div className="flex-1 bg-surface-container-lowest border border-outline-variant/30 rounded-lg overflow-hidden">
        <div className="overflow-y-auto h-full">
          <table className="w-full">
            <thead>
              <tr className="bg-surface-container-low border-b border-outline-variant sticky top-0">
                <th className="text-left text-[10px] font-mono uppercase tracking-widest text-outline p-3">{t('timestamp')}</th>
                <th className="text-left text-[10px] font-mono uppercase tracking-widest text-outline p-3">{t('action')}</th>
                <th className="text-left text-[10px] font-mono uppercase tracking-widest text-outline p-3">{t('user')}</th>
                <th className="text-left text-[10px] font-mono uppercase tracking-widest text-outline p-3">{t('ipAddress')}</th>
                <th className="text-left text-[10px] font-mono uppercase tracking-widest text-outline p-3">{t('resource')}</th>
              </tr>
            </thead>
            <tbody>
              {events.length === 0 && !loading && (
                <tr>
                  <td colSpan={5} className="text-center py-12 text-[13px] text-outline italic">
                    {t('noEventsMatch')}
                  </td>
                </tr>
              )}
              {events.map((e) => {
                const badge = ACTION_BADGE[e.action] || ACTION_BADGE[AuditAction.View];
                return (
                  <tr key={e.id} className="border-b border-outline-variant/10 hover:bg-surface-container-low transition-colors">
                    <td className="p-3 text-[12px] font-mono tabular-nums text-on-surface-variant whitespace-nowrap">
                      {fmtTimestamp(e.timestamp)}
                    </td>
                    <td className="p-3">
                      <span className={`text-[10px] font-mono font-semibold uppercase tracking-widest px-2 py-1 rounded ${badge.bg} ${badge.text}`}>
                        {e.action}
                      </span>
                    </td>
                    <td className="p-3 text-[13px] text-on-surface font-mono">{e.userId}</td>
                    <td className="p-3 text-[12px] font-mono tabular-nums text-on-surface-variant">{e.ip}</td>
                    <td className="p-3 text-[12px] font-mono text-on-surface-variant max-w-md truncate" title={e.resource}>
                      {e.resource}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
