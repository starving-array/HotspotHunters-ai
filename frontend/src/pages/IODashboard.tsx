import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Users, UserCheck, Trophy, ShieldCheck } from 'lucide-react';
import { getIODashboard } from '../api/ioDashboard';
import { useLanguage } from '../context/LanguageContext';
import type { IODashboardData, IORow } from '../api/ioDashboard';

function clearanceClass(rate: number): { text: string; bg: string; label: string } {
  if (rate >= 70) return { text: 'text-emerald-400', bg: 'bg-emerald-400/10', label: 'Good' };
  if (rate >= 50) return { text: 'text-on-surface', bg: 'bg-surface-variant', label: 'Fair' };
  return { text: 'text-tertiary', bg: 'bg-tertiary/10', label: 'Below' };
}

function KpiTile({ icon: Icon, label, value }: { icon: typeof Users; label: string; value: number | string }) {
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
        {value}
      </div>
    </motion.div>
  );
}

function OfficerRow({ row, rank }: { row: IORow; rank: number }) {
  const clr = clearanceClass(row.clearanceRate);
  return (
    <tr className="border-b border-outline-variant/10 hover:bg-surface-container-low transition-colors">
      <td className="p-3 text-[11px] font-mono tabular-nums text-outline text-center">#{rank}</td>
      <td className="p-3">
        <div className="text-[13px] text-on-surface font-medium">{row.firstName}</div>
        <div className="text-[11px] text-outline font-mono mt-0.5">
          ID {row.employeeId}
        </div>
      </td>
      <td className="p-3 text-[12px] text-on-surface-variant font-mono">{row.rankName}</td>
      <td className="p-3 text-[12px] text-on-surface-variant font-mono">{row.unitName}</td>
      <td className="p-3 text-[13px] text-on-surface-variant font-mono tabular-nums text-right">{row.casesCount}</td>
      <td className="p-3 text-[13px] text-on-surface-variant font-mono tabular-nums text-right">{row.arrestsCount}</td>
      <td className="p-3 text-right">
        <span className={`inline-flex items-center gap-1.5 px-2 py-1 rounded text-[12px] font-mono tabular-nums font-semibold ${clr.bg} ${clr.text}`}>
          <ShieldCheck className="w-3 h-3" />
          {row.clearanceRate}%
        </span>
      </td>
    </tr>
  );
}

export default function InvestigatingOfficerDashboardPage() {
  const { t } = useLanguage();
  const [data, setData] = useState<IODashboardData | null>(null);

  useEffect(() => {
    getIODashboard().then(setData);
  }, []);

  if (!data) return null;

  const sorted = [...data.leaderboard].sort((a, b) => b.casesCount - a.casesCount);

  return (
    <div className="flex flex-col h-full overflow-y-auto pr-1">
      <header className="mb-4">
        <h1 className="text-[24px] font-semibold text-on-surface mb-1 tracking-tight">
          Investigating Officer Dashboard
        </h1>
        <p className="text-[14px] text-on-surface-variant">
          {t('ioDashboardSubtitle')}
        </p>
      </header>

      <section className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
        <KpiTile icon={Users} label={t('activeIOs')} value={data.kpis.activeIOs} />
        <KpiTile icon={UserCheck} label={t('avgCasesPerIO')} value={data.kpis.avgCasesPerIO} />
        <KpiTile icon={Trophy} label={t('topArrestRate')} value={`${data.kpis.topArrestRate}%`} />
      </section>

      <section className="bg-surface-container/80 backdrop-blur-md border border-outline-variant rounded-lg overflow-hidden">
        <div className="flex items-center justify-between p-4 border-b border-outline-variant/30">
          <h2 className="text-[11px] font-semibold uppercase tracking-widest text-on-surface">
            Officer Leaderboard
          </h2>
          <div className="flex items-center gap-3 text-[11px]">
            <span className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-emerald-400" />
              <span className="text-on-surface-variant font-mono">≥70%</span>
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-tertiary" />
              <span className="text-on-surface-variant font-mono">Less than 50%</span>
            </span>
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="bg-surface-container-low/50 border-b border-outline-variant/30">
                <th className="text-[10px] font-mono uppercase tracking-widest text-outline p-3 text-center">{t('rank')}</th>
                <th className="text-left text-[10px] font-mono uppercase tracking-widest text-outline p-3">{t('officer')}</th>
                <th className="text-left text-[10px] font-mono uppercase tracking-widest text-outline p-3">{t('rankTitle')}</th>
                <th className="text-left text-[10px] font-mono uppercase tracking-widest text-outline p-3">{t('unit')}</th>
                <th className="text-right text-[10px] font-mono uppercase tracking-widest text-outline p-3">{t('cases')}</th>
                <th className="text-right text-[10px] font-mono uppercase tracking-widest text-outline p-3">{t('arrests')}</th>
                <th className="text-right text-[10px] font-mono uppercase tracking-widest text-outline p-3">{t('clearance')}</th>
              </tr>
            </thead>
            <tbody>
              {sorted.map((row, i) => (
                <OfficerRow key={row.employeeId} row={row} rank={i + 1} />
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
