import { useEffect, useMemo, useState } from 'react';
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine,
} from 'recharts';
import {
  AlertTriangle, Sliders, Activity, MapPin, Download, Check, AlertCircle, ChevronLeft, ChevronRight,
} from 'lucide-react';
import type { AnomalyEvent } from '../types';
import type { AnomalyConfig } from '../api/anomalies';
import { getAnomalies, getAnomalyConfig, updateAnomalyConfig } from '../api/anomalies';
import { useLanguage } from '../context/LanguageContext';

type SeverityLabel = 'CRIT' | 'HIGH' | 'MOD';

function severityLabel(zScore: number): SeverityLabel {
  if (zScore >= 7) return 'CRIT';
  if (zScore >= 4) return 'HIGH';
  return 'MOD';
}

const SEVERITY_STYLE: Record<SeverityLabel, string> = {
  CRIT: 'bg-error/15 text-error border border-error/30',
  HIGH: 'bg-tertiary/15 text-tertiary border border-tertiary/30',
  MOD: 'bg-outline/10 text-outline border border-outline/20',
};

function chartData(anomalies: AnomalyEvent[]) {
  const grouped: Record<string, { date: string; avgZ: number; maxZ: number; count: number }> = {};
  for (const a of anomalies) {
    const z = a.zScore ?? 0;
    const key = a.timestamp?.slice(0, 10) ?? 'unknown';
    if (!grouped[key]) {
      grouped[key] = { date: key, avgZ: 0, maxZ: 0, count: 0 };
    }
    grouped[key].avgZ += z;
    grouped[key].maxZ = Math.max(grouped[key].maxZ, z);
    grouped[key].count += 1;
  }
  return Object.values(grouped)
    .map((g) => ({ ...g, avgZ: g.count > 0 ? parseFloat((g.avgZ / g.count).toFixed(2)) : 0 }))
    .sort((a, b) => a.date.localeCompare(b.date));
}

export default function AnomaliesDetectionPage() {
  const { t } = useLanguage();
  const [anomalies, setAnomalies] = useState<AnomalyEvent[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [config, setConfig] = useState<AnomalyConfig>({
    zScoreThreshold: 2.0,
    lookbackDays: 30,
    minCrimeCount: 5,
    routing: { dashboard: true, email: false, sms: false },
  });
  const [dirtyConfig, setDirtyConfig] = useState<AnomalyConfig>(config);
  const [page, setPage] = useState(0);
  const PAGE_SIZE = 10;

  useEffect(() => { setPage(0); }, [anomalies]);

  useEffect(() => {
    getAnomalies().then(setAnomalies).catch((e) => {
      if (e?.response?.status === 403) {
        setError('Authentication required. Please log in again.');
      } else {
        setError('Failed to load anomaly data.');
      }
    });
    getAnomalyConfig().then((c) => {
      setConfig(c);
      setDirtyConfig(c);
    });
  }, []);

  const data = useMemo(() => chartData(anomalies), [anomalies]);
  const sortedAnomalies = useMemo(
    () => [...anomalies].sort((a, b) => Math.abs(b.zScore) - Math.abs(a.zScore)),
    [anomalies],
  );

  const criticalCount = useMemo(
    () => anomalies.filter((a) => (a.zScore ?? 0) >= 7).length,
    [anomalies],
  );
  const highCount = useMemo(
    () => anomalies.filter((a) => { const z = a.zScore ?? 0; return z >= 4 && z < 7; }).length,
    [anomalies],
  );
  const maxZEntry = useMemo(() => {
    if (anomalies.length === 0) return null;
    return anomalies.reduce((best, a) => ((a.zScore ?? 0) > (best.zScore ?? 0) ? a : best));
  }, [anomalies]);
  const alertDistricts = useMemo(() => {
    const names = new Set(anomalies.map((a) => a.district).filter(Boolean));
    return { count: names.size, names: [...names] };
  }, [anomalies]);

  const totalPages = Math.max(1, Math.ceil(sortedAnomalies.length / PAGE_SIZE));
  const clampedPage = Math.min(page, totalPages - 1);
  const anomaliesForTable = useMemo(
    () => sortedAnomalies.slice(clampedPage * PAGE_SIZE, (clampedPage + 1) * PAGE_SIZE),
    [sortedAnomalies, clampedPage],
  );

  const handleSave = async () => {
    const updated = await updateAnomalyConfig(dirtyConfig);
    setConfig(updated);
    setDirtyConfig(updated);
  };

  return (
    <div className="flex flex-col h-full gap-4">
      {/* Header */}
      <header className="flex items-end justify-between">
        <div>
          <h1 className="text-[24px] font-semibold text-on-surface tracking-tight">
            Anomalies Detection
          </h1>
          <p className="text-[14px] text-on-surface-variant mt-0.5">
            Real-time deviation monitoring across structural baselines.
          </p>
        </div>
        <button
          type="button"
          onClick={() => window.print()}
          className="flex items-center gap-1.5 h-8 px-3 rounded-lg border border-outline-variant/50 bg-surface-container text-on-surface-variant hover:text-on-surface hover:bg-surface-variant text-[11px] font-semibold uppercase tracking-widest transition-colors"
        >
          <Download className="w-3.5 h-3.5" />
          Export
        </button>
      </header>

      {/* Error banner */}
      {error && (
        <div className="flex items-center gap-2 text-[12px] text-error bg-error/5 border border-error/10 rounded-lg p-3">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* KPI Strip — all values derived from live API data */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-surface-container/80 backdrop-blur-md border border-outline-variant/50 rounded-xl p-4">
          <div className="flex items-center justify-between mb-3">
            <span className="text-[11px] font-semibold text-outline uppercase tracking-widest">
              Active Anomalies
            </span>
            <AlertTriangle className="w-4 h-4 text-error" />
          </div>
          <div className="text-[36px] font-semibold text-on-surface font-mono tabular-nums leading-none mb-3">
            {anomalies.length}
          </div>
          <div className="flex items-center gap-2">
            <span className={`px-1.5 py-0.5 rounded text-[10px] font-semibold ${SEVERITY_STYLE.CRIT}`}>
              {criticalCount} CRITICAL
            </span>
            <span className={`px-1.5 py-0.5 rounded text-[10px] font-semibold ${SEVERITY_STYLE.HIGH}`}>
              {highCount} HIGH
            </span>
          </div>
        </div>

        <div className="bg-surface-container/80 backdrop-blur-md border border-outline-variant/50 rounded-xl p-4">
          <div className="flex items-center justify-between mb-3">
            <span className="text-[11px] font-semibold text-outline uppercase tracking-widest">
              Highest Z-Score
            </span>
            <Activity className="w-4 h-4 text-tertiary" />
          </div>
          <div className="text-[36px] font-semibold text-on-surface font-mono tabular-nums leading-none mb-1">
            {maxZEntry?.zScore != null ? `${maxZEntry.zScore.toFixed(1)}σ` : '\u2014'}
          </div>
          {maxZEntry && (
            <div className="text-[12px] text-on-surface-variant">
              {maxZEntry.district} — {maxZEntry.crimeType}
            </div>
          )}
        </div>

        <div className="bg-surface-container/80 backdrop-blur-md border border-outline-variant/50 rounded-xl p-4">
          <div className="flex items-center justify-between mb-3">
            <span className="text-[11px] font-semibold text-outline uppercase tracking-widest">
              Districts on Alert
            </span>
            <MapPin className="w-4 h-4 text-primary" />
          </div>
          <div className="text-[36px] font-semibold text-on-surface font-mono tabular-nums leading-none mb-1">
            {alertDistricts.count}
          </div>
          <div className="text-[12px] text-on-surface-variant">
            {alertDistricts.count > 0 ? alertDistricts.names.join(', ') : '\u2014'}
          </div>
        </div>
      </div>

      {/* Main Content: Chart + Config */}
      <div className="grid grid-cols-1 lg:grid-cols-[1fr_320px] gap-4 min-h-0">
        {/* Chart — real anomalies data rendered via Recharts */}
        <div className="bg-surface-container/80 backdrop-blur-md border border-outline-variant/50 rounded-xl p-4 flex flex-col">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-[11px] font-semibold uppercase tracking-widest text-on-surface">
              System Anomaly Score
            </h2>
            {data.length > 0 && (
              <div className="flex items-center gap-3 text-[11px]">
                <span className="flex items-center gap-1">
                  <span className="w-2 h-2 rounded-sm bg-error/70" />
                  <span className="text-on-surface-variant">CRITICAL (&gt;7)</span>
                </span>
                <span className="flex items-center gap-1">
                  <span className="w-2 h-2 rounded-sm bg-tertiary/70" />
                  <span className="text-on-surface-variant">HIGH (&gt;4)</span>
                </span>
              </div>
            )}
          </div>

          {data.length === 0 && !error ? (
            <div className="flex-1 flex items-center justify-center text-outline text-[13px]">
              No anomaly data available yet
            </div>
          ) : data.length > 0 && (
            <div className="flex-1 min-h-[200px]">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={data} margin={{ top: 8, right: 16, left: 0, bottom: 8 }}>
                  <defs>
                    <linearGradient id="avgZGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#4cd7f6" stopOpacity={0.3} />
                      <stop offset="100%" stopColor="#4cd7f6" stopOpacity={0} />
                    </linearGradient>
                    <linearGradient id="maxZGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#ffb873" stopOpacity={0.2} />
                      <stop offset="100%" stopColor="#ffb873" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(134, 147, 151, 0.15)" />
                  <XAxis
                    dataKey="date"
                    tick={{ fontSize: 11, fontFamily: 'JetBrains Mono', fill: '#869397' }}
                    tickLine={false}
                    axisLine={{ stroke: 'rgba(134, 147, 151, 0.2)' }}
                    tickFormatter={(v: string) => v.slice(5)}
                  />
                  <YAxis
                    tick={{ fontSize: 11, fontFamily: 'JetBrains Mono', fill: '#869397' }}
                    tickLine={false}
                    axisLine={false}
                    width={40}
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: '#0e1322',
                      border: '1px solid rgba(30, 58, 95, 1)',
                      borderRadius: 8,
                      fontSize: 12,
                      fontFamily: 'JetBrains Mono',
                      color: '#dee1f7',
                    }}
                  />
                  <ReferenceLine y={0} stroke="rgba(134, 147, 151, 0.3)" strokeWidth={1} />
                  <ReferenceLine
                    y={4}
                    stroke="#ffb873"
                    strokeDasharray="6 3"
                    strokeWidth={1.5}
                    label={{
                      value: 'HIGH (>4)',
                      fill: '#ffb873',
                      fontSize: 10,
                      fontFamily: 'JetBrains Mono',
                      position: 'insideTopRight',
                    }}
                  />
                  <ReferenceLine
                    y={7}
                    stroke="#ffb4ab"
                    strokeDasharray="6 3"
                    strokeWidth={1.5}
                    label={{
                      value: 'CRITICAL (>7)',
                      fill: '#ffb4ab',
                      fontSize: 10,
                      fontFamily: 'JetBrains Mono',
                      position: 'insideTopRight',
                    }}
                  />
                  <Area
                    type="monotone"
                    dataKey="avgZ"
                    stroke="#4cd7f6"
                    strokeWidth={2}
                    fill="url(#avgZGradient)"
                    dot={false}
                    activeDot={{ r: 4, fill: '#4cd7f6' }}
                  />
                  <Area
                    type="monotone"
                    dataKey="maxZ"
                    stroke="#ffb873"
                    strokeWidth={1.5}
                    fill="url(#maxZGradient)"
                    dot={false}
                    activeDot={{ r: 3, fill: '#ffb873' }}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>

        {/* Config Panel — settings persisted to localStorage */}
        <div className="flex flex-col gap-4">
          <div className="bg-surface-container/80 backdrop-blur-md border border-outline-variant/50 rounded-xl p-4">
            <div className="flex items-center gap-2 mb-4">
              <Sliders className="w-4 h-4 text-primary" />
              <h2 className="text-[11px] font-semibold uppercase tracking-widest text-on-surface">
                System Config
              </h2>
            </div>

            <div className="space-y-5">
              <div>
                <div className="flex justify-between text-[12px] mb-2">
                  <span className="text-on-surface-variant">Sensitivity (Z-Score)</span>
                  <span className="font-mono tabular-nums text-primary">{dirtyConfig.zScoreThreshold.toFixed(1)}σ</span>
                </div>
                <input
                  type="range"
                  min="0.5"
                  max="5.0"
                  step="0.1"
                  value={dirtyConfig.zScoreThreshold}
                  onChange={(e) =>
                    setDirtyConfig((p) => ({ ...p, zScoreThreshold: parseFloat(e.target.value) }))
                  }
                  className="w-full accent-primary"
                />
                <div className="flex justify-between text-[10px] text-outline mt-1">
                  <span>1.0</span>
                  <span>5.0</span>
                </div>
              </div>

              <div>
                <div className="flex justify-between text-[12px] mb-2">
                  <span className="text-on-surface-variant">Baseline Window</span>
                  <span className="font-mono tabular-nums text-primary">{dirtyConfig.lookbackDays}d</span>
                </div>
                <div className="grid grid-cols-4 gap-1">
                  {[7, 14, 30, 90].map((d) => (
                    <button
                      key={d}
                      type="button"
                      onClick={() => setDirtyConfig((p) => ({ ...p, lookbackDays: d }))}
                      className={`h-8 rounded text-[11px] font-mono tabular-nums transition-colors ${
                        dirtyConfig.lookbackDays === d
                          ? 'bg-primary/20 border border-primary/50 text-primary'
                          : 'bg-surface-container-low border border-outline-variant/30 text-on-surface-variant hover:bg-surface-variant'
                      }`}
                    >
                      {d}d
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <span className="text-[12px] text-on-surface-variant block mb-3">Alert Routing</span>
                <div className="flex flex-col gap-2">
                  {(['dashboard', 'email', 'sms'] as const).map((route) => {
                    const label = route === 'dashboard' ? 'Dashboard UI' : route === 'email' ? 'Email Duty Officer' : 'SMS (Critical Only)';
                    const checked = dirtyConfig.routing[route];
                    return (
                      <label
                        key={route}
                        className="flex items-center gap-2.5 cursor-pointer group"
                      >
                        <input
                          type="checkbox"
                          checked={checked}
                          onChange={() =>
                            setDirtyConfig((p) => ({
                              ...p,
                              routing: { ...p.routing, [route]: !p.routing[route] },
                            }))
                          }
                          className="peer sr-only"
                        />
                        <div className="w-4 h-4 shrink-0 rounded border flex items-center justify-center transition-colors peer-checked:bg-primary peer-checked:border-primary bg-surface-container-low border-outline-variant/50 group-hover:border-primary/50">
                          {checked && <Check className="w-3 h-3 text-on-primary" strokeWidth={3} />}
                        </div>
                        <span className="text-[12px] leading-tight text-on-surface-variant group-hover:text-on-surface transition-colors select-none">
                          {label}
                        </span>
                      </label>
                    );
                  })}
                </div>
              </div>

              <button
                onClick={handleSave}
                disabled={JSON.stringify(dirtyConfig) === JSON.stringify(config)}
                className="w-full h-9 bg-primary/10 border border-primary/30 rounded-lg text-[11px] font-semibold uppercase tracking-widest text-primary hover:bg-primary/20 transition-colors disabled:opacity-40"
              >
                Save Configuration
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Anomaly Events Table — rendered from live API data */}
      <div className="bg-surface-container/80 backdrop-blur-md border border-outline-variant/50 rounded-xl p-4 flex flex-col min-h-0">
        <div className="flex items-center justify-between mb-4 shrink-0">
          <h2 className="text-[11px] font-semibold uppercase tracking-widest text-on-surface">
            Anomaly Events
          </h2>
          <span className="text-[11px] font-mono tabular-nums text-on-surface-variant">
            {anomalies.length} events
          </span>
        </div>

        <div className="overflow-y-auto overflow-x-auto min-h-0 grow" style={{ maxHeight: '30vh' }}>
          <table className="w-full text-left border-collapse">
            <thead className="sticky top-0 z-10">
              <tr className="border-b border-outline-variant/30">
                <th className="text-[10px] font-semibold uppercase tracking-widest text-outline pb-2 pr-4 font-mono bg-surface-container/95 backdrop-blur-md">
                  Timestamp
                </th>
                <th className="text-[10px] font-semibold uppercase tracking-widest text-outline pb-2 pr-4 font-mono bg-surface-container/95 backdrop-blur-md">
                  District
                </th>
                <th className="text-[10px] font-semibold uppercase tracking-widest text-outline pb-2 pr-4 font-mono bg-surface-container/95 backdrop-blur-md">
                  Crime Type
                </th>
                <th className="text-[10px] font-semibold uppercase tracking-widest text-outline pb-2 pr-4 font-mono text-right bg-surface-container/95 backdrop-blur-md">
                  Expected
                </th>
                <th className="text-[10px] font-semibold uppercase tracking-widest text-outline pb-2 pr-4 font-mono text-right bg-surface-container/95 backdrop-blur-md">
                  Actual
                </th>
                <th className="text-[10px] font-semibold uppercase tracking-widest text-outline pb-2 pr-4 font-mono text-right bg-surface-container/95 backdrop-blur-md">
                  Z-Score
                </th>
                <th className="text-[10px] font-semibold uppercase tracking-widest text-outline pb-2 font-mono bg-surface-container/95 backdrop-blur-md">
                  Severity
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-outline-variant/20">
              {anomaliesForTable.length === 0 && (
                <tr>
                  <td colSpan={7} className="py-8 text-center text-[12px] text-outline">
                    {t('noAnomalies')}
                  </td>
                </tr>
              )}
               {anomaliesForTable.map((a) => {
                 const z = a.zScore ?? 0;
                 const sev = severityLabel(z);
                 return (
                   <tr
                     key={a.id}
                     className="hover:bg-primary/[0.03] transition-colors group"
                   >
                     <td className="py-2 pr-4 font-mono text-[12px] tabular-nums text-on-surface-variant whitespace-nowrap">
                       {a.timestamp ? `${a.timestamp.slice(5, 10)} ${a.timestamp.slice(11, 16)}` : '\u2014'}
                     </td>
                     <td className="py-2 pr-4 text-[13px] text-on-surface">{a.district ?? '\u2014'}</td>
                     <td className="py-2 pr-4 text-[13px] text-on-surface-variant">{a.crimeType ?? '\u2014'}</td>
                     <td className="py-2 pr-4 font-mono text-[12px] tabular-nums text-on-surface-variant text-right">
                       {(a.expected ?? 0).toFixed(1)}
                     </td>
                     <td className="py-2 pr-4 font-mono text-[12px] tabular-nums text-on-surface text-right">
                       {(a.actual ?? 0).toFixed(1)}
                     </td>
                     <td
                       className="py-2 pr-4 font-mono text-[12px] tabular-nums text-right"
                       style={{ color: sev === 'CRIT' ? '#ffb4ab' : sev === 'HIGH' ? '#ffb873' : '#869397' }}
                     >
                       {z.toFixed(1)}σ
                     </td>
                     <td className="py-2">
                       <span className={`px-1.5 py-0.5 rounded text-[10px] font-semibold ${SEVERITY_STYLE[sev]}`}>
                         {sev}
                       </span>
                     </td>
                   </tr>
                 );
               })}
            </tbody>
          </table>
        </div>

        {sortedAnomalies.length > PAGE_SIZE && (
          <div className="flex items-center justify-between pt-3 shrink-0">
            <span className="text-[11px] font-mono tabular-nums text-on-surface-variant">
              {clampedPage * PAGE_SIZE + 1}–{Math.min((clampedPage + 1) * PAGE_SIZE, sortedAnomalies.length)} of {sortedAnomalies.length}
            </span>
            <div className="flex items-center gap-1">
              <button
                type="button"
                disabled={clampedPage === 0}
                onClick={() => setPage((p) => Math.max(0, p - 1))}
                className="h-7 w-7 flex items-center justify-center rounded border border-outline-variant/30 text-on-surface-variant hover:bg-surface-variant disabled:opacity-30 transition-colors"
              >
                <ChevronLeft className="w-3.5 h-3.5" />
              </button>
              {Array.from({ length: totalPages }, (_, i) => (
                <button
                  key={i}
                  type="button"
                  onClick={() => setPage(i)}
                  className={`h-7 w-7 text-[11px] font-mono tabular-nums rounded border transition-colors ${
                    i === clampedPage
                      ? 'bg-primary/20 border-primary/50 text-primary'
                      : 'border-outline-variant/30 text-on-surface-variant hover:bg-surface-variant'
                  }`}
                >
                  {i + 1}
                </button>
              ))}
              <button
                type="button"
                disabled={clampedPage >= totalPages - 1}
                onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
                className="h-7 w-7 flex items-center justify-center rounded border border-outline-variant/30 text-on-surface-variant hover:bg-surface-variant disabled:opacity-30 transition-colors"
              >
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}