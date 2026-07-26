import { useEffect, useState } from 'react';
import { AlertCircle, RefreshCw, Flame } from 'lucide-react';
import { getHotspots, getHotspotDistrictDetail } from '../api/hotspots';
import type { DistrictDetail } from '../api/hotspots';
import type { HotspotDistrict } from '../types';
import { KpiCards } from './hotspots/KpiCards';
import { LeaderboardTable } from './hotspots/LeaderboardTable';
import { DistrictDetailPanel } from './hotspots/DistrictDetailPanel';

export default function HotspotsPage() {
  const [hotspots, setHotspots] = useState<HotspotDistrict[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedDistrict, setSelectedDistrict] = useState<HotspotDistrict | null>(null);
  const [districtDetail, setDistrictDetail] = useState<DistrictDetail | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);

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

  useEffect(() => {
    if (!selectedDistrict) { setDistrictDetail(null); return; }
    setDetailLoading(true);
    getHotspotDistrictDetail(selectedDistrict.code)
      .then(setDistrictDetail)
      .finally(() => setDetailLoading(false));
  }, [selectedDistrict]);

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
        <>
          <KpiCards districts={hotspots} />

          <section className="flex-1 bg-surface border border-outline-variant/50 rounded-lg flex flex-col overflow-hidden relative mt-4 min-h-[300px]">
            <LeaderboardTable
              districts={hotspots}
              onSelectDistrict={setSelectedDistrict}
              selectedDistrictId={selectedDistrict?.name ?? null}
            />
          </section>

          <DistrictDetailPanel
            district={selectedDistrict}
            detail={districtDetail}
            loading={detailLoading}
            onClose={() => setSelectedDistrict(null)}
          />
        </>
      )}
    </div>
  );
}
