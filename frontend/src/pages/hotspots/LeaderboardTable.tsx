import { useState, useMemo } from 'react';
import { Search, TrendingUp, TrendingDown, Minus, Filter } from 'lucide-react';
import type { HotspotDistrict } from '../../types';

interface LeaderboardTableProps {
  districts: HotspotDistrict[];
  onSelectDistrict: (district: HotspotDistrict) => void;
  selectedDistrictId: string | null;
}

function barColor(index: number): string {
  if (index === 0) return 'from-cyan-500 to-cyan-400';
  if (index <= 3) return 'from-amber-500 to-amber-400';
  return 'from-orange-500 to-orange-400';
}

function TrendCell({ pct }: { pct: number }) {
  if (pct > 0) {
    return (
      <span className="inline-flex items-center gap-1 font-mono tabular-nums text-[12px] text-error">
        <TrendingUp className="w-3 h-3" />+{pct.toFixed(1)}%
      </span>
    );
  }
  if (pct < 0) {
    return (
      <span className="inline-flex items-center gap-1 font-mono tabular-nums text-[12px] text-emerald-400">
        <TrendingDown className="w-3 h-3" />{pct.toFixed(1)}%
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 font-mono tabular-nums text-[12px] text-on-surface-variant">
      <Minus className="w-3 h-3" />0.0%
    </span>
  );
}

export function LeaderboardTable({ districts, onSelectDistrict, selectedDistrictId }: LeaderboardTableProps) {
  const [searchQuery, setSearchQuery] = useState('');

  const filtered = useMemo(() => {
    if (!searchQuery.trim()) return districts;
    const q = searchQuery.toLowerCase();
    return districts.filter(d => d.name.toLowerCase().includes(q));
  }, [districts, searchQuery]);

  const maxCases = filtered.length > 0 ? Math.max(...filtered.map(d => d.cases)) : 1;

  return (
    <>
      <div className="p-4 border-b border-outline-variant/30 flex justify-between items-center bg-surface-container-low/50">
        <div className="relative w-64">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-on-surface-variant" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search district..."
            className="w-full bg-background border border-outline-variant rounded pl-9 pr-3 py-1.5 text-sm text-on-surface focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary/50 transition-all placeholder:text-on-surface-variant/50 font-mono"
          />
        </div>
        <button className="flex items-center gap-1 px-3 py-1.5 border border-outline-variant rounded text-sm text-on-surface-variant hover:text-on-surface hover:bg-surface-variant transition-colors cursor-pointer">
          <Filter className="w-4 h-4" /> Filter
        </button>
      </div>

      <div className="flex-1 overflow-auto">
        {filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <Search className="w-10 h-10 text-outline mb-3" />
            <p className="text-sm text-on-surface-variant font-mono">No districts match your search</p>
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="mt-2 text-xs text-primary hover:underline font-mono"
              >
                Clear filter
              </button>
            )}
          </div>
        ) : (
          <table className="w-full text-left border-collapse">
            <thead className="sticky top-0 bg-surface-container-high border-b border-outline-variant/50 z-20">
              <tr>
                <th className="py-3 px-4 text-[11px] font-semibold uppercase tracking-widest text-on-surface-variant w-12 text-center">#</th>
                <th className="py-3 px-4 text-[11px] font-semibold uppercase tracking-widest text-on-surface-variant">District</th>
                <th className="py-3 px-4 text-[11px] font-semibold uppercase tracking-widest text-on-surface-variant text-right">Cases</th>
                <th className="py-3 px-4 text-[11px] font-semibold uppercase tracking-widest text-on-surface-variant text-right">Trend</th>
              </tr>
            </thead>
            <tbody className="text-sm divide-y divide-outline-variant/10">
              {filtered.map((d, i) => {
                const isSelected = selectedDistrictId === d.name;
                const pct = (d.cases / maxCases) * 100;
                return (
                  <tr
                    key={d.name}
                    onClick={() => onSelectDistrict(d)}
                    className={`group hover:bg-primary/5 transition-colors cursor-pointer relative ${
                      i % 2 !== 0 ? 'bg-white/[0.01]' : ''
                    } ${isSelected ? 'bg-primary/10' : ''}`}
                  >
                    <td className="py-3 px-4 text-center font-mono text-on-surface-variant group-hover:text-primary relative">
                      <div className="absolute left-0 top-0 h-full w-[2px] bg-primary scale-y-0 group-hover:scale-y-100 transition-transform origin-left" />
                      {d.rank}
                    </td>
                    <td className="py-3 px-4 text-on-surface font-medium">{d.name}</td>
                    <td className="py-3 px-4 text-right">
                      <div className="flex items-center justify-end gap-3">
                        <span className="font-mono font-semibold text-on-surface">{d.cases}</span>
                        <div className="w-20 h-2 bg-surface-container-low rounded-full overflow-hidden hidden sm:block">
                          <div
                            className={`h-full rounded-full bg-gradient-to-r ${barColor(i)} transition-all duration-500`}
                            style={{ width: `${Math.max(pct, 2)}%` }}
                          />
                        </div>
                      </div>
                    </td>
                    <td className="py-3 px-4 text-right">
                      <TrendCell pct={d.trendPct} />
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>
    </>
  );
}
