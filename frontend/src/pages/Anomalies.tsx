import { useEffect, useMemo, useState } from 'react';
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine,
} from 'recharts';
import { AlertTriangle, Sliders } from 'lucide-react';
import type { AnomalyEvent } from '../types';
import type { AnomalyConfig } from '../api/anomalies';
import { getAnomalies, getAnomalyConfig, updateAnomalyConfig } from '../api/anomalies';
import { useLanguage } from '../context/LanguageContext';

function chartData(anomalies: AnomalyEvent[]) {
  const grouped: Record<string, { date: string; avgZ: number; maxZ: number; count: number }> = {};
  for (const a of anomalies) {
    const key = a.timestamp.slice(0, 10);
    if (!grouped[key]) {
      grouped[key] = { date: key, avgZ: 0, maxZ: 0, count: 0 };
    }
    grouped[key].avgZ += a.zScore;
    grouped[key].maxZ = Math.max(grouped[key].maxZ, a.zScore);
    grouped[key].count += 1;
  }
  return Object.values(grouped)
    .map((g) => ({ ...g, avgZ: parseFloat((g.avgZ / g.count).toFixed(2)) }))
    .sort((a, b) => a.date.localeCompare(b.date));
}

export default function AnomaliesDetectionPage() {
  const { t } = useLanguage();
  const [anomalies, setAnomalies] = useState<AnomalyEvent[]>([]);
  const [config, setConfig] = useState<AnomalyConfig>({
    zScoreThreshold: 2.0,
    lookbackDays: 30,
    minCrimeCount: 5,
  });
  const [dirtyConfig, setDirtyConfig] = useState<AnomalyConfig>(config);

  useEffect(() => {
    getAnomalies().then(setAnomalies);
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
  const anomaliesAboveThreshold = useMemo(
    () => sortedAnomalies.filter((a) => Math.abs(a.zScore) >= config.zScoreThreshold),
    [sortedAnomalies, config.zScoreThreshold],
  );

  const handleSave = async () => {
    const updated = await updateAnomalyConfig(dirtyConfig);
    setConfig(updated);
    setDirtyConfig(updated);
  };

  return (
    <div className="flex flex-col h-full">
      <header className="mb-4">
        <h1 className="text-[24px] font-semibold text-on-surface mb-1 tracking-tight">
          Anomalies Detection
        </h1>
        <p className="text-[14px] text-on-surface-variant">
          {t('anomaliesSubtitle')}
        </p>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-[1fr_320px] gap-4 flex-1 min-h-0">
        <div className="bg-surface-container/80 backdrop-blur-md border border-outline-variant rounded-lg p-4 flex flex-col min-h-0">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-[11px] font-semibold uppercase tracking-widest text-on-surface">
              Z-Score Timeline (30-day rolling)
            </h2>
            <div className="flex items-center gap-2 text-[11px]">
              <span className="w-2.5 h-2.5 rounded-sm bg-primary/60" />
              <span className="text-on-surface-variant">Avg Z</span>
              <span className="w-2.5 h-2.5 rounded-sm bg-tertiary" />
              <span className="text-on-surface-variant">Max Z</span>
            </div>
          </div>

          <div className="flex-1 min-h-0">
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
                <ReferenceLine
                  y={config.zScoreThreshold}
                  stroke="#4cd7f6"
                  strokeDasharray="4 4"
                  strokeWidth={1.5}
                  label={{
                    value: `Sensitivity σ=${config.zScoreThreshold}`,
                    fill: '#4cd7f6',
                    fontSize: 10,
                    fontFamily: 'JetBrains Mono',
                    position: 'right',
                  }}
                />
                <ReferenceLine y={0} stroke="rgba(134, 147, 151, 0.3)" strokeWidth={1} />
                <ReferenceLine
                  y={-config.zScoreThreshold}
                  stroke="#4cd7f6"
                  strokeDasharray="4 4"
                  strokeWidth={1.5}
                />
                <ReferenceLine
                  y={4}
                  stroke="#ffb873"
                  strokeDasharray="6 3"
                  strokeWidth={2}
                  label={{
                    value: 'High y=4',
                    fill: '#ffb873',
                    fontSize: 10,
                    fontFamily: 'JetBrains Mono',
                    position: 'right',
                  }}
                />
                <ReferenceLine
                  y={7}
                  stroke="#ffb4ab"
                  strokeDasharray="6 3"
                  strokeWidth={2}
                  label={{
                    value: 'Critical y=7',
                    fill: '#ffb4ab',
                    fontSize: 10,
                    fontFamily: 'JetBrains Mono',
                    position: 'right',
                  }}
                />
                <ReferenceLine
                  y={-4}
                  stroke="#ffb873"
                  strokeDasharray="6 3"
                  strokeWidth={2}
                />
                <ReferenceLine
                  y={-7}
                  stroke="#ffb4ab"
                  strokeDasharray="6 3"
                  strokeWidth={2}
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
        </div>

        <div className="flex flex-col gap-4">
          <div className="bg-surface-container/80 backdrop-blur-md border border-outline-variant rounded-lg p-4">
            <div className="flex items-center gap-2 mb-4">
              <Sliders className="w-4 h-4 text-primary" />
              <h2 className="text-[11px] font-semibold uppercase tracking-widest text-on-surface">
                Detection Config
              </h2>
            </div>

            <div className="space-y-5">
              <div>
                <div className="flex justify-between text-[12px] mb-2">
                  <span className="text-on-surface-variant">{t('zScoreThreshold')}</span>
                  <span className="font-mono tabular-nums text-primary">{dirtyConfig.zScoreThreshold.toFixed(1)}</span>
                </div>
                <input
                  type="range"
                  min="0.5"
                  max="4"
                  step="0.1"
                  value={dirtyConfig.zScoreThreshold}
                  onChange={(e) =>
                    setDirtyConfig((p) => ({ ...p, zScoreThreshold: parseFloat(e.target.value) }))
                  }
                  className="w-full accent-primary"
                />
                <div className="flex justify-between text-[10px] text-outline mt-1">
                  <span>0.5 (sensitive)</span>
                  <span>4.0 (strict)</span>
                </div>
              </div>

              <div>
                <div className="flex justify-between text-[12px] mb-2">
                  <span className="text-on-surface-variant">Baseline Window</span>
                  <span className="font-mono tabular-nums text-primary">{dirtyConfig.lookbackDays}d</span>
                </div>
                <div className="grid grid-cols-3 gap-1">
                  {[7, 14, 30].map((d) => (
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
                <div className="flex justify-between text-[12px] mb-2">
                  <span className="text-on-surface-variant">{t('minCrimeCount')}</span>
                  <span className="font-mono tabular-nums text-primary">{dirtyConfig.minCrimeCount}</span>
                </div>
                <input
                  type="range"
                  min="1"
                  max="20"
                  step="1"
                  value={dirtyConfig.minCrimeCount}
                  onChange={(e) =>
                    setDirtyConfig((p) => ({ ...p, minCrimeCount: parseInt(e.target.value) }))
                  }
                  className="w-full accent-primary"
                />
              </div>

              <button
                onClick={handleSave}
                disabled={JSON.stringify(dirtyConfig) === JSON.stringify(config)}
                className="w-full h-9 bg-primary/10 border border-primary/30 rounded-lg text-[11px] font-semibold uppercase tracking-widest text-primary hover:bg-primary/20 transition-colors disabled:opacity-40"
              >
                Apply Config
              </button>
            </div>
          </div>

          <div className="bg-surface-container/80 backdrop-blur-md border border-outline-variant rounded-lg p-4">
            <div className="flex items-center gap-2 mb-3">
              <AlertTriangle className="w-4 h-4 text-error" />
              <h2 className="text-[11px] font-semibold uppercase tracking-widest text-on-surface">
                {t('alertsCount')} ({anomaliesAboveThreshold.length})
              </h2>
            </div>
            <div className="space-y-2 max-h-[260px] overflow-y-auto">
              {anomaliesAboveThreshold.length === 0 && (
                <p className="text-[12px] text-outline text-center py-4">{t('noAnomalies')}</p>
              )}
              {anomaliesAboveThreshold.slice(0, 20).map((a) => (
                <div
                  key={a.id}
                  className="bg-error/5 border border-error/10 rounded p-2 text-[12px]"
                >
                  <div className="flex justify-between items-center mb-1">
                    <span className="text-on-surface font-semibold">{a.district}</span>
                    <span className="font-mono tabular-nums text-error">z={a.zScore.toFixed(1)}</span>
                  </div>
                  <div className="text-on-surface-variant">
                    {a.crimeType} — exp {a.expected.toFixed(0)} vs actual {a.actual.toFixed(0)}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
