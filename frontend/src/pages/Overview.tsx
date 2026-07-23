import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import type { Alert, KPIData } from '../types';
import LiveFIRFeed from '../components/LiveFIRFeed';
import MapView from '../components/MapView';
import HotspotLeaderboard from '../components/HotspotLeaderboard';
import { useLanguage } from '../context/LanguageContext';
import { getKPIs } from '../api/dashboard';
import { getInitialAlerts, subscribeAlerts } from '../api/alerts';

const ALERT_BUFFER_MAX = 100;

// Lightweight shared alert-store so LiveFIRFeed + MapView share ONE SSE stream.
// (TODO(U3): lift this into an AlertContext so the Layout also pulls from it.)
function useAlerts() {
  const [alerts, setAlerts] = useState<Alert[]>([]);
  useEffect(() => {
    let unsub = () => {};
    getInitialAlerts().then((seed) => setAlerts(seed));
    unsub = subscribeAlerts((a) =>
      setAlerts((prev) => [a, ...prev].slice(0, ALERT_BUFFER_MAX)),
    );
    return () => unsub();
  }, []);
  return alerts;
}

export default function Overview() {
  const { t } = useLanguage();
  const [kpis, setKpis] = useState<KPIData[]>([]);
  const alerts = useAlerts();

  useEffect(() => {
    getKPIs().then(setKpis);
  }, []);

  return (
    <>
      <header className="mb-6 animate-fade-in">
        <h1 className="text-[24px] font-semibold text-on-surface mb-1 tracking-tight">
          {t('overview')}
        </h1>
        <p className="text-[14px] text-on-surface-variant">
          Real-time intelligence and monitoring
        </p>
      </header>

      <section className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
        {kpis.map((kpi, i) => (
          <motion.div
            key={kpi.label}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.08, type: 'spring', stiffness: 240, damping: 28 }}
            className="bg-surface-container/80 backdrop-blur-md border border-outline-variant/80 rounded-lg p-4 relative overflow-hidden group hover:bg-surface-container-high/50 transition-colors"
          >
            <div className="absolute inset-0 bg-primary/5 opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none" />
            <div className="flex justify-between items-start mb-2">
              <span className="text-[11px] font-semibold uppercase tracking-widest text-on-surface-variant">
                {kpi.label}
              </span>
              {kpi.severity === 'critical' && (
                <div className="w-2 h-2 rounded-full bg-error animate-led-pulse" />
              )}
              {kpi.label === 'FIRs Today' && (
                <div className="w-2 h-2 rounded-full bg-primary animate-led-pulse" />
              )}
              {kpi.label === 'Active Cases' && (
                <span className="px-2 py-1 bg-secondary-container/20 border border-secondary-container rounded text-[10px] font-semibold uppercase tracking-widest text-secondary-fixed-dim">
                  Investigating
                </span>
              )}
            </div>
            <div
              className={`font-mono text-[52px] leading-none font-semibold mb-2 tabular-nums ${
                kpi.severity === 'critical' ? 'text-error' : kpi.trend === 'down' ? 'text-on-surface' : 'text-on-surface'
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
                {kpi.trend === 'up' ? '▲' : kpi.trend === 'down' ? '▼' : '→'} {kpi.delta}
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

      <div className="grid grid-cols-1 lg:grid-cols-[62%_38%] gap-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2, type: 'spring', stiffness: 240, damping: 28 }}
        >
          <MapView alerts={alerts} heightClass="h-[600px]" showLayerPanel={false} />
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
