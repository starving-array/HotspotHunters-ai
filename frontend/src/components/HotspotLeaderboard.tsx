import { useEffect, useMemo, useState } from 'react';
import { TrendingDown, TrendingUp, Minus } from 'lucide-react';
import { getHotspots } from '../api/hotspots';
import type { HotspotDistrict } from '../api/hotspots';

function barStyleFor(cases: number, max: number): string {
  const pct = (cases / max) * 100;
  if (pct >= 70) return 'bg-error';
  if (pct >= 40) return 'bg-gradient-to-r from-primary to-tertiary';
  if (pct >= 20) return 'bg-primary';
  return 'bg-primary/60';
}

function TrendArrow({ pct }: { pct: number }) {
  if (pct === 0) {
    return <Minus className="w-3 h-3 text-outline" aria-label="no change" />;
  }
  if (pct > 0) {
    return (
      <span className="flex items-center gap-0.5 text-tertiary font-mono text-[11px] tabular-nums">
        <TrendingUp className="w-3 h-3" /> +{pct}%
      </span>
    );
  }
  return (
    <span className="flex items-center gap-0.5 text-error font-mono text-[11px] tabular-nums">
      <TrendingDown className="w-3 h-3" /> {pct}%
    </span>
  );
}

interface Props {
  title?: string;
}

export default function HotspotLeaderboard({ title = 'Hotspot Districts' }: Props) {
  const [districts, setDistricts] = useState<HotspotDistrict[]>([]);

  useEffect(() => {
    getHotspots().then(setDistricts);
  }, []);

  const max = useMemo(() => Math.max(...districts.map((d) => d.cases), 1), [districts]);
  const sorted = useMemo(
    () => [...districts].sort((a, b) => b.cases - a.cases).slice(0, 10),
    [districts],
  );

  return (
    <section className="bg-surface-container/80 backdrop-blur-md border border-outline-variant rounded-lg flex flex-col h-full min-h-0">
      <div className="p-3 border-b border-outline-variant/30 bg-surface-container-low/50 flex items-center gap-2">
        <span className="w-2 h-2 rounded-full bg-tertiary" />
        <h2 className="text-[11px] font-semibold uppercase tracking-widest text-on-surface">
          {title}
        </h2>
      </div>
      <div className="flex-1 p-4 flex flex-col justify-around gap-3 overflow-y-auto">
        {sorted.map((d) => {
          const widthPct = Math.round((d.cases / max) * 100);
          return (
            <div key={`${d.rank}-${d.name}`}>
              <div className="flex justify-between items-center mb-1">
                <span className="text-[14px] text-on-surface flex items-center gap-2">
                  <span className="font-mono text-outline text-[11px] tabular-nums">
                    {String(d.rank).padStart(2, '0')}
                  </span>
                  {d.name}
                </span>
                <div className="flex items-center gap-3">
                  <TrendArrow pct={d.trendPct} />
                  <span className="font-mono text-[13px] text-on-surface-variant tabular-nums">
                    {d.cases}
                  </span>
                </div>
              </div>
              <div className="h-1.5 w-full bg-surface-container-highest rounded-full overflow-hidden">
                <div
                  className={`h-full transition-all duration-700 ${barStyleFor(d.cases, max)}`}
                  style={{ width: `${widthPct}%` }}
                />
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}