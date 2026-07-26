import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import type { KPIData } from '../types';
import type { HotspotDistrict } from '../types';
import { getKPIs } from '../api/dashboard';
import { getHotspots } from '../api/hotspots';
import LiveFIRFeed from '../components/LiveFIRFeed';
import MapView from '../components/MapView';
import HotspotLeaderboard from '../components/HotspotLeaderboard';
import { useLanguage } from '../context/LanguageContext';
import { useAlerts } from '../context/AlertContext';

export default function OverviewMap() {
  const { t } = useLanguage();
  const [kpis, setKpis] = useState<KPIData[]>([]);
  const alerts = useAlerts();
  const [hotspots, setHotspots] = useState<HotspotDistrict[]>([]);

  useEffect(() => {
    getKPIs().then(setKpis);
    getHotspots().then(setHotspots);
  }, []);

  return (
    <>
      <header className="mb-6 animate-fade-in">
        <h1 className="text-[24px] font-semibold text-on-surface mb-1 tracking-tight">
          {t('liveMap')}
        </h1>
        <p className="text-[14px] text-on-surface-variant">
          Live crime telemetry with heatmap + district boundaries
        </p>
      </header>

      <section className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
        {kpis.map((kpi, i) => (
          <motion.div
            key={kpi.label}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.08, type: 'spring', stiffness: 240, damping: 28 }}
            className="bg-surface-container/80 backdrop-blur-md border border-outline-variant/80 rounded-lg p-4 glow-card"
          >
            <div className="flex justify-between items-start mb-2">
              <span className="text-[11px] font-semibold uppercase tracking-widest text-on-surface-variant">
                {kpi.label}
              </span>
              {kpi.severity === 'critical' && (
                <div className="w-2 h-2 rounded-full bg-error animate-led-pulse" />
              )}
            </div>
            <div
              className={`font-mono text-[36px] leading-none font-semibold tabular-nums ${
                kpi.severity === 'critical' ? 'text-error' : 'text-on-surface'
              }`}
            >
              {kpi.value}
            </div>
          </motion.div>
        ))}
      </section>

      <div className="grid grid-cols-1 lg:grid-cols-[66%_34%] gap-4 flex-1 min-h-0">
        <motion.div
          className="min-h-0"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2, type: 'spring', stiffness: 240, damping: 28 }}
        >
          <MapView alerts={alerts} showLayerPanel />
        </motion.div>

        <div className="flex flex-col min-h-0 gap-2">
          <motion.div
            className="flex-[6] min-h-0 flex flex-col"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3, type: 'spring', stiffness: 240, damping: 28 }}
          >
            <LiveFIRFeed alerts={alerts} />
          </motion.div>
          <motion.div
            className="flex-[3.5] min-h-0 flex flex-col"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4, type: 'spring', stiffness: 240, damping: 28 }}
          >
            <HotspotLeaderboard />
          </motion.div>
        </div>
      </div>
    </>
  );
}