import type { KPIData } from '../types';

interface Props {
  kpi: KPIData;
}

const TREND_ICON = {
  up: { text: 'text-tertiary', prefix: '+' },
  down: { text: 'text-error', prefix: '' },
  flat: { text: 'text-outline', prefix: '' },
};

export default function KpiCard({ kpi }: Props) {
  const trend = TREND_ICON[kpi.trend || 'flat'];
  return (
    <div className="glow-card bg-surface-container border border-outline-variant/50 rounded-xl p-4 hover:bg-surface-container-high/50 transition-colors">
      <div className="flex justify-between items-start mb-2">
        <span className="text-[11px] font-semibold text-outline uppercase tracking-widest">
          {kpi.label}
        </span>
      </div>
      <div className="font-display text-[36px] leading-none font-semibold text-on-surface mb-2 font-mono tabular-nums">
        {kpi.value}
      </div>
      {kpi.delta && (
        <div
          className={`flex items-center gap-1 text-[12px] ${trend.text} font-mono tabular-nums`}
        >
          {trend.prefix}
          {kpi.delta}
        </div>
      )}
    </div>
  );
}
