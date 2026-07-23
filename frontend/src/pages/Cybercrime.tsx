import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Shield, DollarSign, UserX, Monitor, Cpu } from 'lucide-react';
import MapView from '../components/MapView';
import { getCyberDashboard, PATTERN_LABELS } from '../api/cybercrime';
import type { CyberDashboardData } from '../api/cybercrime';
import { useLanguage } from '../context/LanguageContext';
import type { CyberAlert, Alert } from '../types';

function CyberKpi({ icon: Icon, label, value }: { icon: typeof Shield; label: string; value: number }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ type: 'spring', stiffness: 240, damping: 28 }}
      className="glow-card bg-surface-container/80 backdrop-blur-md border border-outline-variant rounded-lg p-4"
    >
      <div className="flex items-center justify-between mb-2">
        <span className="text-[11px] font-semibold uppercase tracking-widest text-on-surface-variant">
          {label}
        </span>
        <Icon className="w-4 h-4 text-primary" />
      </div>
      <div className="font-mono text-[36px] leading-none font-semibold text-on-surface tabular-nums">
        {value.toLocaleString()}
      </div>
    </motion.div>
  );
}

const THREAT_STYLE: Record<string, { chip: string; dot: string }> = {
  critical: { chip: 'bg-error/10 text-error', dot: 'bg-error' },
  high: { chip: 'bg-error/10 text-error', dot: 'bg-error' },
  medium: { chip: 'bg-tertiary/10 text-tertiary', dot: 'bg-tertiary' },
  low: { chip: 'bg-primary/10 text-primary', dot: 'bg-primary' },
};

function PatternRow({ pattern }: { pattern: CyberAlert }) {
  const style = THREAT_STYLE[pattern.threatLevel] || THREAT_STYLE.low;
  return (
    <tr className="border-b border-outline-variant/10 hover:bg-surface-container-low transition-colors">
      <td className="p-3">
        <div className="flex items-center gap-2">
          <span className={`w-2 h-2 rounded-full ${style.dot}`} />
          <span className="text-[13px] text-on-surface font-medium">
            {PATTERN_LABELS[pattern.patternType] || pattern.patternType}
          </span>
        </div>
      </td>
      <td className="p-3 text-[12px] text-on-surface-variant font-mono">{pattern.entityType}</td>
      <td className="p-3 text-[12px] text-primary font-mono tabular-nums">{pattern.entityValue}</td>
      <td className="p-3 text-right">
        <span className="font-mono tabular-nums text-[13px] text-on-surface-variant">{pattern.caseCount}</span>
      </td>
      <td className="p-3 text-right">
        <span className={`text-[10px] font-semibold uppercase tracking-widest px-2 py-1 rounded ${style.chip}`}>
          {pattern.threatLevel}
        </span>
      </td>
    </tr>
  );
}

export default function CybercrimeIntelligencePage() {
  const { t } = useLanguage();
  const [data, setData] = useState<CyberDashboardData | null>(null);

  useEffect(() => {
    getCyberDashboard().then(setData);
  }, []);

  if (!data) return null;

  return (
    <div className="flex flex-col h-full overflow-y-auto pr-1">
      <header className="mb-4 flex items-center gap-3">
        <Monitor className="w-6 h-6 text-primary" />
        <div>
          <h1 className="text-[24px] font-semibold text-on-surface mb-1 tracking-tight">
            Cybercrime Intelligence
          </h1>
          <p className="text-[14px] text-on-surface-variant">
            {t('cybercrimeSubtitle')}
          </p>
        </div>
      </header>

      <section className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
        <CyberKpi icon={Shield} label={t('itActCases')} value={data.kpis.itActCases} />
        <CyberKpi icon={DollarSign} label={t('financialFraud')} value={data.kpis.financialFraud} />
        <CyberKpi icon={UserX} label={t('identityTheft')} value={data.kpis.identityTheft} />
      </section>

      <section className="grid grid-cols-1 lg:grid-cols-[58%_42%] gap-4">
        <MapView
          alerts={data.mapAlerts as Alert[]}
          heightClass="h-[520px]"
          showLayerPanel={false}
        />

        <div className="bg-surface-container/80 backdrop-blur-md border border-outline-variant rounded-lg flex flex-col h-[520px]">
          <div className="flex items-center gap-2 p-3 border-b border-outline-variant/30">
            <Cpu className="w-4 h-4 text-primary" />
            <h2 className="text-[11px] font-semibold uppercase tracking-widest text-on-surface">
              Pattern Clustering
            </h2>
            <span className="ml-auto text-[11px] font-mono text-outline">{data.patterns.length} active</span>
          </div>
          <div className="flex-1 overflow-y-auto">
            <table className="w-full">
              <thead>
                <tr className="bg-surface-container-low/50 border-b border-outline-variant/30 sticky top-0">
                  <th className="text-left text-[10px] font-mono uppercase tracking-widest text-outline p-3">{t('pattern')}</th>
                  <th className="text-left text-[10px] font-mono uppercase tracking-widest text-outline p-3">{t('type')}</th>
                  <th className="text-left text-[10px] font-mono uppercase tracking-widest text-outline p-3">{t('entity')}</th>
                  <th className="text-right text-[10px] font-mono uppercase tracking-widest text-outline p-3">{t('cases')}</th>
                  <th className="text-right text-[10px] font-mono uppercase tracking-widest text-outline p-3">{t('threat')}</th>
                </tr>
              </thead>
              <tbody>
                {data.patterns.map((p) => (
                  <PatternRow key={p.alertId} pattern={p} />
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </section>
    </div>
  );
}
