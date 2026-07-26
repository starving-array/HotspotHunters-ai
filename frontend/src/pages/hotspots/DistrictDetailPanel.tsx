import { X, TrendingUp, TrendingDown, Shield, MapPin, Badge, AlertTriangle, RefreshCw } from 'lucide-react';
import type { HotspotDistrict } from '../../types';
import type { DistrictDetail, CrimeTypeBreakdownItem } from '../../api/hotspots';

interface DistrictDetailPanelProps {
  district: HotspotDistrict | null;
  detail: DistrictDetail | null;
  loading: boolean;
  onClose: () => void;
}

const SEVERITY_COLOR: Record<string, string> = {
  critical: 'bg-error/10 text-error border-error/30',
  high: 'bg-error/10 text-error border-error/30',
  medium: 'bg-amber-500/10 text-amber-500 border-amber-500/20',
  low: 'bg-primary/10 text-primary border-primary/30',
};

function BreakdownBar({ item, max }: { item: CrimeTypeBreakdownItem; max: number }) {
  const pct = max > 0 ? (item.count / max) * 100 : 0;
  return (
    <div className="flex items-center gap-3">
      <span className="w-32 text-xs text-on-surface-variant font-mono truncate shrink-0">{item.type}</span>
      <div className="flex-1 h-2 bg-surface-container-low rounded-full overflow-hidden">
        <div className="h-full rounded-full bg-primary transition-all duration-500" style={{ width: `${pct}%` }} />
      </div>
      <span className="w-12 text-right text-xs font-mono text-on-surface tabular-nums shrink-0">{item.pct}%</span>
    </div>
  );
}

export function DistrictDetailPanel({ district, detail, loading, onClose }: DistrictDetailPanelProps) {
  const isOpen = district !== null;

  return (
    <div
      className={`fixed inset-y-0 right-0 w-[400px] bg-surface-container-high/95 backdrop-blur-xl border-l border-outline-variant/30 shadow-2xl z-[70] transform transition-transform duration-300 ease-out flex flex-col ${
        isOpen ? 'translate-x-0' : 'translate-x-full'
      }`}
    >
      <button
        onClick={onClose}
        className="absolute top-4 right-4 text-on-surface-variant hover:text-on-surface p-1 bg-surface-variant rounded-full transition-colors z-10 cursor-pointer"
      >
        <X className="w-5 h-5" />
      </button>

      {district && (
        <>
          <div className="p-6 border-b border-outline-variant/20 relative">
            <div className="absolute inset-0 bg-gradient-to-br from-primary/10 to-transparent opacity-50 pointer-events-none" />
            <div className="flex items-center gap-5 relative z-10">
              <div className="w-20 h-20 rounded border-2 border-primary/30 overflow-hidden shrink-0 shadow-[0_0_15px_rgba(6,182,212,0.1)] flex items-center justify-center bg-surface-variant">
                <span className="font-bold text-on-surface-variant text-2xl font-mono">
                  {district.rank}
                </span>
              </div>
              <div>
                <h2 className="text-xl font-semibold text-on-surface">{district.name}</h2>
                <div className="text-sm text-on-surface-variant mt-1 flex flex-col gap-1">
                  <span className="flex items-center gap-1.5">
                    <Badge className="w-3.5 h-3.5 text-outline" />
                    {district.cases} total cases
                  </span>
                  <span className="flex items-center gap-1.5">
                    <MapPin className="w-3.5 h-3.5 text-outline" />
                    Rank #{district.rank}
                  </span>
                </div>
              </div>
            </div>
            <div className="mt-6 flex gap-2">
              <button className="flex-1 bg-primary text-on-primary py-2 rounded text-sm font-bold hover:opacity-90 transition-opacity cursor-pointer">
                Assign Case
              </button>
              <button className="flex-1 border border-outline-variant text-on-surface py-2 rounded text-sm font-medium hover:bg-surface-variant transition-colors cursor-pointer">
                View Full Dossier
              </button>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto p-6 space-y-8">
            {detail && (
              <>
                {/* Risk / Trend Summary */}
                <div className="bg-surface border border-outline-variant/50 rounded-lg p-4 relative overflow-hidden">
                  <div className="absolute top-0 right-0 p-2 opacity-10 pointer-events-none">
                    <AlertTriangle className="w-16 h-16 text-error" />
                  </div>
                  <div className="flex justify-between items-end mb-2 relative z-10">
                    <span className="text-[11px] font-semibold uppercase tracking-widest text-on-surface-variant">
                      Trend Assessment
                    </span>
                    <span className={`font-mono font-bold text-2xl leading-none flex items-center gap-1 ${detail.trendPct >= 0 ? 'text-error' : 'text-emerald-400'}`}>
                      {detail.trendPct >= 0 ? <TrendingUp className="w-5 h-5" /> : <TrendingDown className="w-5 h-5" />}
                      {detail.trendPct >= 0 ? '+' : ''}{detail.trendPct.toFixed(1)}%
                    </span>
                  </div>
                  <div className="w-full h-2 bg-surface-container-highest rounded-full overflow-hidden mb-1 relative z-10">
                    <div
                      className={`h-full rounded-full transition-all duration-500 ${detail.trendPct >= 0 ? 'bg-error' : 'bg-emerald-500'}`}
                      style={{ width: `${Math.min(Math.abs(detail.trendPct) * 2, 100)}%` }}
                    />
                  </div>
                  <div className="flex justify-between font-mono text-[10px] text-on-surface-variant mt-1 relative z-10">
                    <span>Stable (0%)</span>
                    <span>Spiking (50%+)</span>
                  </div>
                </div>

                {/* Crime Type Breakdown */}
                <section>
                  <h3 className="text-[11px] font-semibold uppercase tracking-widest text-on-surface-variant mb-4 border-b border-outline-variant/30 pb-2">
                    Crime Type Breakdown
                  </h3>
                  <div className="space-y-3">
                    {detail.crimeTypeBreakdown.map((item) => (
                      <BreakdownBar key={item.type} item={item} max={detail.crimeTypeBreakdown[0].count} />
                    ))}
                  </div>
                </section>

                {/* Monthly Trend (sparkline bars) */}
                <section>
                  <h3 className="text-[11px] font-semibold uppercase tracking-widest text-on-surface-variant mb-4 border-b border-outline-variant/30 pb-2">
                    7-Month Trend
                  </h3>
                  <div className="bg-surface p-4 border border-outline-variant/50 rounded">
                    <div className="flex items-end gap-2 h-24 justify-between">
                      {detail.monthlyTrend.map((point, idx) => {
                        const maxVal = Math.max(...detail.monthlyTrend.map(p => p.cases));
                        const height = maxVal > 0 ? (point.cases / maxVal) * 100 : 0;
                        const isLatest = idx === detail.monthlyTrend.length - 1;
                        return (
                          <div key={point.month} className="flex flex-col items-center gap-1 flex-1">
                            <div
                              className={`w-full rounded-t-sm transition-all ${
                                isLatest ? 'bg-primary shadow-[0_0_8px_rgba(6,182,212,0.6)]' : 'bg-primary/30 hover:bg-primary/50'
                              }`}
                              style={{ height: `${Math.max(height, 4)}%` }}
                            />
                            <span className="text-[9px] font-mono text-on-surface-variant">{point.month}</span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </section>

                {/* Top Police Stations */}
                <section>
                  <h3 className="text-[11px] font-semibold uppercase tracking-widest text-on-surface-variant mb-4 border-b border-outline-variant/30 pb-2">
                    Top Police Stations
                  </h3>
                  <div className="space-y-2">
                    {detail.topPoliceStations.map((ps, i) => (
                      <div key={ps.name} className="bg-surface border border-outline-variant/50 rounded p-3 flex justify-between items-center hover:border-primary/30 transition-colors">
                        <div className="flex items-center gap-3">
                          <span className="w-5 h-5 rounded bg-surface-variant flex items-center justify-center text-[10px] font-mono text-on-surface-variant">
                            {i + 1}
                          </span>
                          <span className="text-sm text-on-surface font-mono">{ps.name}</span>
                        </div>
                        <span className="font-mono text-sm text-primary font-semibold">{ps.cases}</span>
                      </div>
                    ))}
                  </div>
                </section>

                {/* Recent Alerts */}
                <section>
                  <h3 className="text-[11px] font-semibold uppercase tracking-widest text-on-surface-variant mb-4 border-b border-outline-variant/30 pb-2 flex items-center gap-2">
                    <AlertTriangle className="w-3.5 h-3.5 text-on-surface-variant" />
                    Recent Alerts
                  </h3>
                  <div className="space-y-2">
                    {detail.recentAlerts.map((alert) => {
                      const chip = SEVERITY_COLOR[alert.severity] || SEVERITY_COLOR.low;
                      return (
                        <div key={alert.crimeNo} className="bg-surface border border-outline-variant/50 rounded p-3 hover:border-primary/30 transition-colors cursor-pointer group">
                          <div className="flex justify-between items-start mb-2">
                            <span className="font-mono text-xs text-primary group-hover:brightness-125 transition-all tabular-nums">
                              {alert.crimeNo}
                            </span>
                            <span className={`text-[10px] px-1.5 py-0.5 rounded border font-bold uppercase ${chip}`}>
                              {alert.severity}
                            </span>
                          </div>
                          <div className="flex justify-between items-center text-xs text-on-surface-variant">
                            <span className="flex items-center gap-1">
                              <Shield className="w-3 h-3 text-outline" />
                              {alert.crimeType}
                            </span>
                            <span className="font-mono">{alert.date}</span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </section>
              </>
            )}

            {loading && (
              <div className="flex items-center justify-center py-12">
                <RefreshCw className="w-6 h-6 text-primary animate-spin" />
              </div>
            )}

            {!detail && !loading && (
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <MapPin className="w-10 h-10 text-outline mb-3" />
                <p className="text-sm text-on-surface-variant font-mono">
                  No detail data available for {district.name}
                </p>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
