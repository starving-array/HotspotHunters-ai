import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import type { KPIData, Alert } from '../types';
import type { HotspotDistrict } from '../api/hotspots';
import { getKPIs } from '../api/dashboard';
import { getInitialAlerts } from '../api/alerts';
import { getHotspots } from '../api/hotspots';
import LiveFIRFeed from '../components/LiveFIRFeed';
import MapView from '../components/MapView';
import HotspotLeaderboard from '../components/HotspotLeaderboard';
import { useLanguage } from '../context/LanguageContext';

export default function OverviewMap() {
  const { t } = useLanguage();
  const [kpis, setKpis] = useState<KPIData[]>([]);
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [hotspots, setHotspots] = useState<HotspotDistrict[]>([]);

  useEffect(() => {
    getKPIs().then(setKpis);
    getInitialAlerts().then(setAlerts);
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
            className="bg-surface-container/80 backdrop-blur-md border border-outline-variant/80 rounded-lg p-4"
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

      <div className="grid grid-cols-1 lg:grid-cols-[62%_38%] gap-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2, type: 'spring', stiffness: 240, damping: 28 }}
        >
          <MapView alerts={alerts} heightClass="h-[600px]" showLayerPanel />
        </motion.div>

        <div className="flex flex-col gap-4 h-[600px]">
          <motion.div
            className="flex-1 min-h-0"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3, type: 'spring', stiffness: 240, damping: 28 }}
          >
            <LiveFIRFeed alerts={alerts} />
          </motion.div>
          <motion.div
            className="h-[260px]"
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