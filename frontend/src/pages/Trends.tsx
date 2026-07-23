import { useEffect, useMemo, useState } from 'react';
import { LineChart, Line, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine } from 'recharts';
import { TrendingDown, TrendingUp, Activity } from 'lucide-react';
import { getTrends } from '../api/trends';
import type { TrendsData, MoversRow } from '../api/trends';
import { useLanguage } from '../context/LanguageContext';

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

function intensityColor(v: number): string {
  if (v >= 85) return '#ffb4ab';
  if (v >= 60) return '#ff9d6e';
  if (v >= 40) return '#ffb873';
  if (v >= 20) return '#4cd7f6';
  return '#2a4a72';
}

function Heatmap({ data }: { data: TrendsData['heatmap'] }) {
  const { t } = useLanguage();
  const districts = useMemo(
    () => Array.from(new Set(data.map((d) => d.district))),
    [data],
  );
  const grid = useMemo(() => {
    const map: Record<string, Record<string, number>> = {};
    for (const cell of data) {
      if (!map[cell.district]) map[cell.district] = {};
      map[cell.district][cell.month] = cell.intensity;
    }
    return map;
  }, [data]);
  return (
    <div className="bg-surface-container/80 backdrop-blur-md border border-outline-variant rounded-lg p-4">
      <div className="flex items-center gap-2 mb-4">
        <Activity className="w-4 h-4 text-primary" />
        <h2 className="text-[11px] font-semibold uppercase tracking-widest text-on-surface">
          {t('districtMonthDensity')}
        </h2>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full border-collapse">
          <thead>
            <tr>
              <th className="text-left text-[10px] font-mono uppercase tracking-widest text-outline p-2 sticky left-0 bg-surface-container">
                District
              </th>
              {MONTHS.map((m) => (
                <th key={m} className="text-[10px] font-mono uppercase tracking-widest text-outline p-2 text-center">
                  {m}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {districts.map((d) => (
              <tr key={d}>
                <td className="text-[11px] text-on-surface-variant font-mono p-2 whitespace-nowrap sticky left-0 bg-surface-container">
                  {d}
                </td>
                {MONTHS.map((m) => {
                  const v = grid[d]?.[m] ?? 0;
                  return (
                    <td key={m} className="p-1 text-center">
                      <div
                        title={`${d} · ${m}: ${v}`}
                        className="w-10 h-7 rounded-sm flex items-center justify-center text-[10px] font-mono tabular-nums transition-all cursor-default hover:scale-110"
                        style={{
                          backgroundColor: intensityColor(v),
                          color: v >= 60 ? '#0e1322' : '#dee1f7',
                        }}
                      >
                        {v}
                      </div>
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function MoverRow({ row }: { row: MoversRow }) {
  const up = row.deltaPct >= 0;
  return (
    <tr className="border-b border-outline-variant/10 hover:bg-surface-container-low transition-colors">
      <td className="text-[13px] text-on-surface font-medium p-2">{row.district}</td>
      <td className="text-[13px] text-on-surface-variant font-mono tabular-nums text-right p-2">
        {row.cases}
      </td>
      <td className="text-right p-2">
        <span className={`inline-flex items-center gap-1 font-mono tabular-nums text-[12px] ${up ? 'text-emerald-400' : 'text-error'}`}>
          {up ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
          {up ? '+' : ''}{row.deltaPct}%
        </span>
      </td>
    </tr>
  );
}

export default function TrendsForecastsPage() {
  const { t } = useLanguage();
  const [data, setData] = useState<TrendsData | null>(null);

  useEffect(() => {
    getTrends().then(setData);
  }, []);

  if (!data) return null;

  const moversUp = data.movers.filter((m) => m.deltaPct >= 0);
  const moversDown = data.movers.filter((m) => m.deltaPct < 0);

  return (
    <div className="flex flex-col h-full overflow-y-auto pr-1">
      <header className="mb-4">
        <h1 className="text-[24px] font-semibold text-on-surface mb-1 tracking-tight">
          Trends & Forecasts
        </h1>
        <p className="text-[14px] text-on-surface-variant">
          {t('trendsSubtitle')}
        </p>
      </header>

      <section className="bg-surface-container/80 backdrop-blur-md border border-outline-variant rounded-lg p-4 mb-4 h-[340px]">
        <h2 className="text-[11px] font-semibold uppercase tracking-widest text-on-surface mb-3">
          {t('forecastChart')}
        </h2>
        <ResponsiveContainer width="100%" height="86%">
          <LineChart data={data.forecast} margin={{ top: 8, right: 16, left: 0, bottom: 8 }}>
            <defs>
              <linearGradient id="ciBand" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#4cd7f6" stopOpacity={0.2} />
                <stop offset="100%" stopColor="#4cd7f6" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(134, 147, 151, 0.15)" />
            <XAxis
              dataKey="date"
              tick={{ fontSize: 10, fontFamily: 'JetBrains Mono', fill: '#869397' }}
              tickLine={false}
              axisLine={{ stroke: 'rgba(134, 147, 151, 0.2)' }}
              tickFormatter={(v: string) => v.slice(5)}
              interval={6}
            />
            <YAxis
              tick={{ fontSize: 10, fontFamily: 'JetBrains Mono', fill: '#869397' }}
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
              x="2026-07-23"
              stroke="#ffb873"
              strokeDasharray="4 4"
              strokeWidth={1.5}
              label={{ value: t('today'), fill: '#ffb873', fontSize: 10, fontFamily: 'JetBrains Mono', position: 'top' }}
            />
            <Area
              type="monotone"
              dataKey="ciUpper"
              stroke="none"
              fill="url(#ciBand)"
              isAnimationActive={false}
            />
            <Area
              type="monotone"
              dataKey="ciLower"
              stroke="none"
              fill="#0e1322"
              isAnimationActive={false}
            />
            <Line
              type="monotone"
              dataKey="actual"
              stroke="#4cd7f6"
              strokeWidth={2}
              dot={false}
              isAnimationActive={false}
            />
            <Line
              type="monotone"
              dataKey="forecast"
              stroke="#ffb873"
              strokeWidth={2}
              strokeDasharray="6 3"
              dot={false}
              isAnimationActive={false}
            />
          </LineChart>
        </ResponsiveContainer>
      </section>

      <section className="mb-4">
        <Heatmap data={data.heatmap} />
      </section>

      <section className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="bg-surface-container/80 backdrop-blur-md border border-outline-variant rounded-lg p-4">
          <h2 className="text-[11px] font-semibold uppercase tracking-widest text-on-surface mb-3 flex items-center gap-2">
            <TrendingUp className="w-3.5 h-3.5 text-emerald-400" />
            {t('moversUp')}
          </h2>
          <table className="w-full">
            <thead>
              <tr className="border-b border-outline-variant/30">
                <th className="text-left text-[10px] font-mono uppercase tracking-widest text-outline p-2">{t('districtLabel')}</th>
                <th className="text-right text-[10px] font-mono uppercase tracking-widest text-outline p-2">{t('cases')}</th>
                <th className="text-right text-[10px] font-mono uppercase tracking-widest text-outline p-2">{t('delta')}</th>
              </tr>
            </thead>
            <tbody>
              {moversUp.map((m) => (
                <MoverRow key={m.district} row={m} />
              ))}
            </tbody>
          </table>
        </div>
        <div className="bg-surface-container/80 backdrop-blur-md border border-outline-variant rounded-lg p-4">
          <h2 className="text-[11px] font-semibold uppercase tracking-widest text-on-surface mb-3 flex items-center gap-2">
            <TrendingDown className="w-3.5 h-3.5 text-error" />
            {t('moversDown')}
          </h2>
          <table className="w-full">
            <thead>
              <tr className="border-b border-outline-variant/30">
                <th className="text-left text-[10px] font-mono uppercase tracking-widest text-outline p-2">{t('districtLabel')}</th>
                <th className="text-right text-[10px] font-mono uppercase tracking-widest text-outline p-2">{t('cases')}</th>
                <th className="text-right text-[10px] font-mono uppercase tracking-widest text-outline p-2">{t('delta')}</th>
              </tr>
            </thead>
            <tbody>
              {moversDown.map((m) => (
                <MoverRow key={m.district} row={m} />
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
