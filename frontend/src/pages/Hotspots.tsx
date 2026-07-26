import { useEffect, useState } from 'react';
import { Flame, TrendingUp, TrendingDown, AlertCircle, RefreshCw } from 'lucide-react';
import { getHotspots } from '../api/hotspots';
import type { HotspotDistrict } from '../types';

export default function HotspotsPage() {
  const [hotspots, setHotspots] = useState<HotspotDistrict[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        setLoading(true);
        setError(null);
        const data = await getHotspots();
        if (!cancelled) setHotspots(data);
      } catch (e: any) {
        if (!cancelled) setError(e?.message || 'Failed to load hotspot data');
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    load();
    const interval = setInterval(load, 30000);
    return () => { cancelled = true; clearInterval(interval); };
  }, []);

  if (loading && hotspots.length === 0) {
    return (
      <div className="flex flex-col h-full items-center justify-center gap-3">
        <RefreshCw className="w-6 h-6 text-primary animate-spin" />
        <p className="text-[14px] text-on-surface-variant font-mono">Loading hotspot data…</p>
      </div>
    );
  }

  if (error && hotspots.length === 0) {
    return (
      <div className="flex flex-col h-full items-center justify-center gap-3">
        <AlertCircle className="w-8 h-8 text-error" />
        <p className="text-[14px] text-error font-mono">{error}</p>
        <button onClick={() => window.location.reload()} className="px-4 py-2 bg-primary/10 border border-primary/30 rounded text-[11px] font-semibold text-primary hover:bg-primary/20">Retry</button>
      </div>
    );
  }

  const maxScore = hotspots.length > 0 ? Math.max(...hotspots.map(h => h.cases)) : 1;

  return (
    <div className="flex flex-col h-full overflow-y-auto pr-1">
      <header className="mb-4 flex items-center justify-between">
        <div>
          <h1 className="text-[24px] font-semibold text-on-surface mb-1 tracking-tight">Hotspots</h1>
          <p className="text-[14px] text-on-surface-variant">Top crime-dense areas ranked by live incident count</p>
        </div>
        <div className="flex items-center gap-2 text-[11px] text-on-surface-variant font-mono">
          <RefreshCw className="w-3 h-3" />
          Auto-refresh 30s
        </div>
      </header>

      {hotspots.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 gap-3">
          <Flame className="w-10 h-10 text-outline" />
          <p className="text-[14px] text-on-surface-variant">No hotspot data available</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 max-w-[1100px]">
          {hotspots.map((h, i) => {
            const pct = maxScore > 0 ? (h.cases / maxScore) * 100 : 0;
            const barColor = i === 0 ? 'from-cyan-500 to-cyan-400'
              : i <= 3 ? 'from-amber-500 to-amber-400'
              : i <= 6 ? 'from-orange-500 to-orange-400'
              : 'from-red-500 to-red-400';
            return (
              <div key={h.name} className="bg-surface-container/80 backdrop-blur-md border border-outline-variant rounded-lg p-4 flex items-center gap-4">
                <div className="w-8 h-8 rounded-full bg-primary/10 border border-primary/20 flex items-center justify-center text-[13px] font-mono font-bold text-primary shrink-0">
                  {i + 1}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-[14px] font-medium text-on-surface truncate">{h.name}</span>
                    <span className="text-[13px] font-mono font-semibold text-on-surface ml-2">{h.cases}</span>
                  </div>
                  <div className="w-full h-2 bg-surface-container-low rounded-full overflow-hidden">
                    <div className={`h-full rounded-full bg-gradient-to-r ${barColor} transition-all duration-500`} style={{ width: `${Math.max(pct, 2)}%` }} />
                  </div>
                  <div className="flex items-center justify-between mt-1">
                    <span className="text-[10px] text-outline font-mono">{h.cases} incident{(h.cases !== 1) ? 's' : ''}</span>
                    {h.trendPct !== 0 && (
                      <span className={`text-[10px] font-mono flex items-center gap-0.5 ${h.trendPct > 0 ? 'text-error' : 'text-emerald-400'}`}>
                        {h.trendPct > 0 ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
                        {Math.abs(h.trendPct).toFixed(1)}%
                      </span>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
