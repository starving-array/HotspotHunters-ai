import { useEffect, useState, useCallback } from 'react';
import { motion } from 'framer-motion';
import { Shield, DollarSign, UserX, Monitor, Cpu, Search, RefreshCw, AlertCircle } from 'lucide-react';
import MapView from '../components/MapView';
import { getCyberDashboard, lookupOsintIndicator, enrichText, PATTERN_LABELS } from '../api/cybercrime';
import type { CyberDashboardData } from '../api/cybercrime';
import { useLanguage } from '../context/LanguageContext';
import type { CyberAlert, Alert, OsintResult } from '../types';

function CyberKpi({ icon: Icon, label, value }: { icon: typeof Shield; label: string; value: number | string }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ type: 'spring', stiffness: 240, damping: 28 }}
      className="glow-card bg-surface-container/80 backdrop-blur-md border border-outline-variant/50 rounded-xl p-4"
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

function IndicatorBadge({ result }: { result: OsintResult }) {
  const isMalicious = result.malicious;
  return (
    <span
      className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-mono border ${
        isMalicious
          ? 'bg-error/10 border-error/30 text-error'
          : 'bg-primary/10 border-primary/20 text-primary'
      }`}
      title={`${result.indicatorType}:${result.indicatorValue} | ${result.reports} reports | ${result.categories.join(', ')}`}
    >
      <span className={`w-1.5 h-1.5 rounded-full ${isMalicious ? 'bg-error' : 'bg-primary'}`} />
      {result.indicatorValue.length > 25
        ? result.indicatorValue.substring(0, 22) + '…'
        : result.indicatorValue}
    </span>
  );
}

function inrFormat(n: number): string {
  const s = Math.round(n).toString();
  const last3 = s.slice(-3);
  const rest = s.slice(0, -3);
  const groups: string[] = [];
  if (rest) {
    let r = rest;
    while (r.length > 0) {
      groups.push(r.slice(-2));
      r = r.slice(0, -2);
    }
    return '₹' + groups.reverse().join(',') + ',' + last3;
  }
  return '₹' + last3;
}

export default function CybercrimeIntelligencePage() {
  const { t } = useLanguage();
  const [data, setData] = useState<CyberDashboardData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [osintIoc, setOsintIoc] = useState('');
  const [osintResult, setOsintResult] = useState<OsintResult | null>(null);
  const [osintSearching, setOsintSearching] = useState(false);
  const [enrichResults, setEnrichResults] = useState<Record<string, OsintResult[]> | null>(null);
  const [enrichTextVal, setEnrichTextVal] = useState('');

  useEffect(() => {
    getCyberDashboard()
      .then(setData)
      .catch((e) => {
        if (e?.response?.status === 403) {
          setError('Authentication required. Please log in again.');
        } else {
          setError('Failed to load cybercrime data.');
        }
      });
  }, []);

  const handleOsintLookup = useCallback(async () => {
    if (!osintIoc.trim()) return;
    setOsintSearching(true);
    setOsintResult(null);
    try {
      const type = osintIoc.includes('.') ? 'domain' : osintIoc.includes('@') ? 'email' : 'ip';
      const result = await lookupOsintIndicator(osintIoc.trim(), type);
      setOsintResult(result);
    } catch { /* ignore */ }
    setOsintSearching(false);
  }, [osintIoc]);

  const handleEnrichText = useCallback(async () => {
    if (!enrichTextVal.trim()) return;
    try {
      const results = await enrichText(enrichTextVal);
      setEnrichResults(results);
    } catch { /* ignore */ }
  }, [enrichTextVal]);

  if (!data) {
    return (
      <div className="flex flex-col h-full overflow-y-auto pr-1 items-center justify-center">
        {error ? (
          <div className="flex items-center gap-2 text-[12px] text-error bg-error/5 border border-error/10 rounded-lg p-3 max-w-lg">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        ) : (
          <>
            <RefreshCw className="w-6 h-6 text-primary animate-spin" />
            <p className="text-[13px] text-on-surface-variant mt-3">Loading dashboard...</p>
          </>
        )}
      </div>
    );
  }

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
        <CyberKpi icon={DollarSign} label={t('financialFraud')} value={inrFormat(data.kpis.financialFraud)} />
        <CyberKpi icon={UserX} label={t('identityTheft')} value={data.kpis.identityTheft} />
      </section>

      <section className="grid grid-cols-1 lg:grid-cols-[58%_42%] gap-4 mb-4">
        <MapView
          alerts={data.mapAlerts as Alert[]}
          heightClass="h-[520px]"
          showLayerPanel={false}
        />

        <div className="bg-surface-container/80 backdrop-blur-md border border-outline-variant/50 rounded-xl flex flex-col min-h-0">
          <div className="flex items-center gap-2 p-3 border-b border-outline-variant/30">
            <Cpu className="w-4 h-4 text-primary" />
            <h2 className="text-[11px] font-semibold uppercase tracking-widest text-on-surface">
              Pattern Clustering
            </h2>
            <span className="ml-auto text-[11px] font-mono text-outline">{data.patterns.length} active</span>
          </div>
          <div className="flex-1 overflow-y-auto min-h-0" style={{ maxHeight: '30vh' }}>
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

      <section className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="bg-surface-container/80 backdrop-blur-md border border-outline-variant/50 rounded-xl p-4">
          <h3 className="text-[11px] font-semibold uppercase tracking-widest text-on-surface mb-3 flex items-center gap-2">
            <Search className="w-3.5 h-3.5 text-primary" />
            OSINT Indicator Lookup
          </h3>
          <div className="flex gap-2 mb-3">
            <input
              type="text"
              value={osintIoc}
              onChange={(e) => setOsintIoc(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleOsintLookup()}
              placeholder="IP, domain, email, phone…"
              className="flex-1 bg-surface-container-low border border-outline-variant/30 rounded px-3 py-1.5 text-[13px] text-on-surface font-mono placeholder:text-outline focus:outline-none focus:border-primary/50"
            />
            <button
              onClick={handleOsintLookup}
              disabled={osintSearching}
              className="px-3 py-1.5 bg-primary/10 border border-primary/30 rounded text-[11px] font-semibold uppercase tracking-widest text-primary hover:bg-primary/20 transition-colors disabled:opacity-50"
            >
              {osintSearching ? '…' : 'Lookup'}
            </button>
          </div>
          {osintResult && (
            <div className="space-y-1.5 text-[12px] font-mono">
              <div className="flex items-center gap-2">
                <span className={`w-2 h-2 rounded-full ${osintResult.malicious ? 'bg-error' : 'bg-primary'}`} />
                <span className={osintResult.malicious ? 'text-error' : 'text-primary'}>
                  {osintResult.malicious ? 'MALICIOUS' : 'CLEAN'}
                </span>
                <span className="text-outline">|</span>
                <span className="text-on-surface-variant">reputation {osintResult.reputation}/100</span>
                <span className="text-outline">|</span>
                <span className="text-on-surface-variant">{osintResult.reports} reports</span>
              </div>
              {osintResult.categories.length > 0 && (
                <div className="flex flex-wrap gap-1">
                  {osintResult.categories.map((c) => (
                    <span key={c} className="px-1.5 py-0.5 bg-tertiary/10 text-tertiary rounded text-[10px]">{c}</span>
                  ))}
                </div>
              )}
              {(osintResult.country || osintResult.asn) && (
                <div className="text-outline">
                  {osintResult.country && <span>{osintResult.country}</span>}
                  {osintResult.country && osintResult.asn && <span> · </span>}
                  {osintResult.asn && <span>{osintResult.asn}</span>}
                </div>
              )}
              <div className="text-outline text-[10px]">
                source: {osintResult.source} · {new Date(osintResult.enrichedAt).toLocaleString()}
              </div>
            </div>
          )}
        </div>

        <div className="bg-surface-container/80 backdrop-blur-md border border-outline-variant/50 rounded-xl p-4">
          <h3 className="text-[11px] font-semibold uppercase tracking-widest text-on-surface mb-3">
            IOC Extraction
          </h3>
          <textarea
            value={enrichTextVal}
            onChange={(e) => setEnrichTextVal(e.target.value)}
            placeholder="Paste FIR text to extract indicators…"
            rows={4}
            className="w-full bg-surface-container-low border border-outline-variant/30 rounded px-3 py-2 text-[13px] text-on-surface font-mono placeholder:text-outline focus:outline-none focus:border-primary/50 resize-none mb-2"
          />
          <button
            onClick={handleEnrichText}
            className="px-3 py-1.5 bg-primary/10 border border-primary/30 rounded text-[11px] font-semibold uppercase tracking-widest text-primary hover:bg-primary/20 transition-colors mb-3"
          >
            Extract
          </button>
          {enrichResults && (
            <div className="space-y-2 max-h-[200px] overflow-y-auto">
              {Object.entries(enrichResults).map(([type, results]) => (
                <div key={type}>
                  <div className="text-[10px] font-mono uppercase tracking-widest text-outline mb-1">
                    {type} ({results.length})
                  </div>
                  <div className="flex flex-wrap gap-1">
                    {results.map((r) => (
                      <IndicatorBadge key={r.indicatorValue} result={r} />
                    ))}
                  </div>
                </div>
              ))}
              {Object.keys(enrichResults).length === 0 && (
                <p className="text-[12px] text-outline italic">No indicators found in the text.</p>
              )}
            </div>
          )}
        </div>
      </section>
    </div>
  );
}
