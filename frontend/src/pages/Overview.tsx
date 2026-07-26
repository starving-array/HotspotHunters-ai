import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import type { KPIData } from '../types';
import LiveFIRFeed from '../components/LiveFIRFeed';
import MapView from '../components/MapView';
import HotspotLeaderboard from '../components/HotspotLeaderboard';
import { useLanguage } from '../context/LanguageContext';
import { useAlerts } from '../context/AlertContext';
import { getKPIs } from '../api/dashboard';

export default function Overview() {
  const { t } = useLanguage();
  const [kpis, setKpis] = useState<KPIData[]>([]);
  const alerts = useAlerts();

  useEffect(() => {
    getKPIs().then(setKpis);
  }, []);

  return (
    <div className="flex flex-col h-full min-h-0">
      <header className="mb-6 animate-fade-in flex-shrink-0">
        <h1 className="text-[24px] font-semibold text-on-surface mb-1 tracking-tight">
          {t('overview')}
        </h1>
        <p className="text-[14px] text-on-surface-variant">
          Real-time intelligence and monitoring
        </p>
      </header>

      <section className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-4 flex-shrink-0">
        {kpis.map((kpi, i) => (
          <motion.div
            key={kpi.label}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.08, type: 'spring', stiffness: 240, damping: 28 }}
            className="bg-surface-container/80 backdrop-blur-md border border-outline-variant/80 rounded-lg p-4 relative overflow-hidden group hover:bg-surface-container-high/50 transition-colors glow-card"
          >
            <div className="absolute inset-0 bg-primary/5 opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none" />
            <div className="flex justify-between items-start mb-2">
              <span className="text-[11px] font-semibold uppercase tracking-widest text-on-surface-variant">
                {kpi.label}
              </span>
              {kpi.severity === 'critical' && (
                <div className="w-2 h-2 rounded-full bg-error animate-led-pulse" />
              )}
              {kpi.label === 'FIRs Today' && kpi.severity !== 'critical' && (
                <div className="w-2 h-2 rounded-full bg-primary animate-led-pulse" />
              )}
              {kpi.label === 'Active Cases' && (
                <span className="px-2 py-1 bg-secondary-container/20 border border-secondary-container rounded text-[10px] font-semibold uppercase tracking-widest text-secondary-fixed-dim">
                  Investigating
                </span>
              )}
            </div>
            <div
              className={`font-mono text-[48px] leading-none font-semibold mb-2 tabular-nums tracking-tight ${
                kpi.severity === 'critical' ? 'text-error' : 'text-on-surface'
              }`}
            >
              {kpi.value}
            </div>
            {kpi.delta && kpi.label !== 'Heinous Crimes' && kpi.label !== 'Clearance Rate' && (
              <div
                className={`flex items-center gap-1 text-[13px] font-mono tabular-nums ${
                  kpi.trend === 'up' ? 'text-success' : kpi.trend === 'down' ? 'text-error' : 'text-on-surface-variant'
                }`}
              >
                {kpi.trend === 'up' ? '\u25B2' : kpi.trend === 'down' ? '\u25BC' : '\u2192'} {kpi.delta}
              </div>
            )}
            {kpi.label === 'Active Cases' && (
              <div className="text-[14px] text-on-surface-variant mt-2">Across 31 districts</div>
            )}
            {kpi.label === 'Heinous Crimes' && (
              <div className="text-[14px] text-tertiary mt-2">8 in last hour</div>
            )}
            {kpi.label === 'Clearance Rate' && (
              <div className="text-[14px] text-on-surface-variant mt-2">
                1,203 chargesheeted / 1,796 total
              </div>
            )}
            {kpi.label === 'FIRs Today' && (
              <div className="text-[14px] text-on-surface-variant mt-2">38 in last hour</div>
            )}
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
          <MapView alerts={alerts} showLayerPanel={false} />
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
    </div>
  );
}
