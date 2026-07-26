import { MapPin, Flame, Award, BarChart3, TrendingUp, TrendingDown, AlertTriangle } from 'lucide-react';
import type { HotspotDistrict } from '../../types';

interface KpiCardsProps {
  districts: HotspotDistrict[];
}

export function KpiCards({ districts }: KpiCardsProps) {
  if (districts.length === 0) return null;

  const totalCases = districts.reduce((s, d) => s + d.cases, 0);
  const topDistrict = districts.reduce((best, d) => (d.cases > best.cases ? d : best), districts[0]);
  const avgCases = Math.round(totalCases / districts.length);
  const avgTrend = districts.reduce((s, d) => s + d.trendPct, 0) / districts.length;

  const cards = [
    {
      label: 'Total Districts',
      value: districts.length,
      detail: 'Monitored areas',
      icon: MapPin,
      color: 'text-primary',
      accent: 'bg-primary/5',
    },
    {
      label: 'Total Cases',
      value: totalCases,
      detail: 'Incidents this period',
      icon: Flame,
      color: 'text-primary',
      accent: 'bg-primary/5',
    },
    {
      label: 'Top District',
      value: topDistrict.name,
      detail: `${topDistrict.cases} incidents`,
      icon: Award,
      color: 'text-primary',
      accent: 'bg-primary/5 border-l-2 border-primary',
    },
    {
      label: 'Avg Cases / District',
      value: avgCases,
      detail: (
        <span className={`inline-flex items-center gap-1 ${avgTrend >= 0 ? 'text-error' : 'text-emerald-400'}`}>
          {avgTrend >= 0 ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
          {avgTrend >= 0 ? '+' : ''}{avgTrend.toFixed(1)}% avg trend
        </span>
      ),
      icon: BarChart3,
      color: 'text-primary',
      accent: '',
    },
  ];

  const hasOverloaded = districts.some(d => d.trendPct > 20);
  if (hasOverloaded) {
    const overloadedCount = districts.filter(d => d.trendPct > 20).length;
    cards.push({
      label: 'Spiking Districts',
      value: overloadedCount,
      detail: '> 20% trend spike',
      icon: AlertTriangle,
      color: 'text-error',
      accent: 'bg-error/5 border border-error/30',
    });
  }

  return (
    <section className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
      {cards.map((card) => {
        const Icon = card.icon;
        return (
          <div
            key={card.label}
            className={`bg-surface/50 backdrop-blur-md border border-outline-variant/50 rounded-lg p-5 flex flex-col justify-between hover:border-primary/50 transition-colors relative overflow-hidden group ${card.accent}`}
          >
            <div className="absolute top-0 right-0 w-16 h-16 bg-primary/5 rounded-bl-full -mr-4 -mt-4 transition-transform group-hover:scale-110 pointer-events-none" />
            <div className="flex justify-between items-start mb-4 relative z-10">
              <span className="text-[11px] font-semibold uppercase tracking-widest text-on-surface-variant">
                {card.label}
              </span>
              <Icon className={`w-5 h-5 ${card.color}`} />
            </div>
            <div className="relative z-10">
              <div className="font-mono font-bold text-3xl text-on-surface truncate">
                {typeof card.value === 'number' ? card.value.toLocaleString() : card.value}
              </div>
              <div className="text-xs text-on-surface-variant mt-1 flex items-center gap-1">
                {card.detail}
              </div>
            </div>
          </div>
        );
      })}
    </section>
  );
}
