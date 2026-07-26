import { memo, useCallback, useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, Mic, X, FileText, MapPin, Calendar, Shield, DollarSign, Sparkles, ArrowRight } from 'lucide-react';
import { useVirtualizer } from '@tanstack/react-virtual';
import type { FIRSearchResult, FIRDetail, ParsedQuery } from '../api/firSearch';
import { searchFIR, getFIRDetail } from '../api/firSearch';
import { useLanguage } from '../context/LanguageContext';

const SEVERITY_CHIP: Record<string, { bg: string; text: string; label: string }> = {
  critical: { bg: 'bg-error/10', text: 'text-error', label: 'Critical' },
  high: { bg: 'bg-error/10', text: 'text-error', label: 'High' },
  medium: { bg: 'bg-tertiary/10', text: 'text-tertiary', label: 'Medium' },
  low: { bg: 'bg-primary/10', text: 'text-primary', label: 'Low' },
};

const Row = memo(function Row({
  result,
  isSelected,
  onSelect,
  style,
}: {
  result: FIRSearchResult;
  isSelected: boolean;
  onSelect: (id: number) => void;
  style: React.CSSProperties;
}) {
  const chip = SEVERITY_CHIP[result.severity] || SEVERITY_CHIP.low;
  return (
    <div
      style={style}
      onClick={() => onSelect(result.caseMasterId)}
      className={`flex items-center gap-4 px-4 border-b border-outline-variant/10 cursor-pointer transition-colors ${
        isSelected ? 'bg-primary/5 border-l-2 border-l-primary' : 'hover:bg-surface-container-low'
      }`}
    >
      <div className="w-8 h-8 rounded bg-surface-variant flex items-center justify-center shrink-0">
        <FileText className="w-4 h-4 text-primary" />
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-0.5">
          <span className="font-mono text-[13px] text-primary font-semibold tabular-nums">
            {result.crimeNo}
          </span>
          <span className={`text-[10px] font-semibold uppercase tracking-widest px-1.5 rounded ${chip.bg} ${chip.text}`}>
            {chip.label}
          </span>
        </div>
        <div className="flex items-center gap-3 text-[12px] text-on-surface-variant">
          <span className="truncate">{result.crimeType}</span>
          <span className="text-outline">·</span>
          <span>{result.district}</span>
          <span className="text-outline">·</span>
          <span className="font-mono tabular-nums">{new Date(result.registeredDate).toLocaleDateString()}</span>
        </div>
      </div>
      <div className="text-on-surface-variant text-[12px] text-right hidden md:block max-w-[200px] truncate">
        {result.briefFacts}
      </div>
    </div>
  );
});

function DetailDrawer({
  detail,
  caseId,
  onClose,
  onInvestigate,
}: {
  detail: FIRDetail | null;
  caseId: number | null;
  onClose: () => void;
  onInvestigate: (caseMasterId: number) => void;
}) {
  const { t } = useLanguage();
  return (
    <AnimatePresence>
      {detail && (
        <motion.aside
          initial={{ x: 420 }}
          animate={{ x: 0 }}
          exit={{ x: 420 }}
          transition={{ type: 'spring', stiffness: 300, damping: 32 }}
          className="absolute top-0 right-0 h-full w-[420px] bg-surface-container/95 backdrop-blur-xl border-l border-outline-variant z-50 flex flex-col"
        >
          <div className="flex items-center justify-between p-4 border-b border-outline-variant/30">
            <h2 className="text-[13px] font-semibold uppercase tracking-widest text-on-surface">
              {t('firDetail')}
            </h2>
            <button
              onClick={onClose}
              className="w-7 h-7 flex items-center justify-center rounded hover:bg-surface-variant transition-colors"
            >
              <X className="w-4 h-4 text-on-surface-variant" />
            </button>
          </div>

          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            <div className="bg-surface-container-low rounded-lg p-4 space-y-3">
              <div className="flex items-center justify-between">
                <span className="font-mono text-[15px] text-primary font-semibold tabular-nums">
                  {detail.crimeNo}
                </span>
                {detail.isCybercrime && (
                  <span className="text-[10px] font-semibold uppercase tracking-widest text-primary bg-primary/10 px-2 py-0.5 rounded">
                    Cyber
                  </span>
                )}
              </div>

              <div className="grid grid-cols-2 gap-3 mt-3">
                <div className="flex items-center gap-2 text-[12px] text-on-surface-variant">
                  <Calendar className="w-3.5 h-3.5 text-outline" />
                  <span className="font-mono">{new Date(detail.registeredDate).toLocaleDateString()}</span>
                </div>
                <div className="flex items-center gap-2 text-[12px] text-on-surface-variant">
                  <MapPin className="w-3.5 h-3.5 text-outline" />
                  <span>{detail.district}</span>
                </div>
                <div className="flex items-center gap-2 text-[12px] text-on-surface-variant">
                  <Shield className="w-3.5 h-3.5 text-outline" />
                  <span>{detail.policeStation}</span>
                </div>
                {detail.financialLoss && (
                  <div className="flex items-center gap-2 text-[12px] text-on-surface-variant">
                    <DollarSign className="w-3.5 h-3.5 text-tertiary" />
                    <span className="font-mono tabular-nums">₹{(detail.financialLoss / 100000).toFixed(1)}L</span>
                  </div>
                )}
              </div>
            </div>

            <section className="bg-surface-container-low rounded-lg p-4">
              <h3 className="text-[11px] font-semibold uppercase tracking-widest text-outline mb-2">
                {t('caseSummary')}
              </h3>
              <p className="text-[13px] text-on-surface leading-relaxed">{detail.briefFacts}</p>
            </section>

            <div className="grid grid-cols-2 gap-3">
              <div className="bg-surface-container-low rounded-lg p-3">
                <div className="text-[11px] text-outline uppercase tracking-widest mb-1">{t('complainant')}</div>
                <div className="text-[13px] text-on-surface font-mono">{detail.complainantName}</div>
              </div>
              <div className="bg-surface-container-low rounded-lg p-3">
                <div className="text-[11px] text-outline uppercase tracking-widest mb-1">{t('accused')}</div>
                <div className="text-[13px] text-on-surface font-mono">{detail.accusedName}</div>
              </div>
            </div>

            <div className="bg-surface-container-low rounded-lg p-3 flex items-center justify-between">
              <div className="text-[11px] text-outline uppercase tracking-widest">{t('status')}</div>
              <span className="text-[13px] font-mono text-tertiary font-semibold">{detail.status}</span>
            </div>
          </div>

          <div className="p-4 border-t border-outline-variant/30 shrink-0">
            <button
              onClick={() => onInvestigate(caseId!)}
              className="w-full h-9 bg-primary/10 border border-primary/30 rounded-lg text-[11px] font-semibold uppercase tracking-widest text-primary hover:bg-primary/20 transition-colors flex items-center justify-center gap-2"
            >
              Full Investigation Panel
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </motion.aside>
      )}
    </AnimatePresence>
  );
}

const PARSED_CHIP_META: { key: keyof ParsedQuery; label: string; icon: typeof MapPin }[] = [
  { key: 'district', label: 'District', icon: MapPin },
  { key: 'crimeCategory', label: 'Crime', icon: Shield },
  { key: 'area', label: 'Area', icon: FileText },
  { key: 'dateRange', label: 'Date', icon: Calendar },
];

function TransparencyPanel({ parsed }: { parsed: ParsedQuery | null }) {
  const { t } = useLanguage();
  if (!parsed) return null;
  const chips = PARSED_CHIP_META.filter((m) => parsed[m.key]);
  if (chips.length === 0 && !parsed.raw) return null;
  return (
    <motion.div
      initial={{ opacity: 0, height: 0 }}
      animate={{ opacity: 1, height: 'auto' }}
      exit={{ opacity: 0, height: 0 }}
      className="bg-surface-container-low/60 border border-outline-variant/30 rounded-lg p-3 mb-4 overflow-hidden"
    >
      <div className="flex items-center gap-2 mb-2">
        <Sparkles className="w-3.5 h-3.5 text-primary" />
        <span className="text-[11px] font-semibold uppercase tracking-widest text-on-surface-variant">
          {t('transparencyParsed')}
        </span>
      </div>
      <div className="flex flex-wrap gap-2">
        {chips.length === 0 ? (
          <span className="text-[12px] text-outline italic">{t('noEntities')}</span>
        ) : (
          chips.map((m) => {
            const Icon = m.icon;
            const value = parsed[m.key] as string;
            return (
              <span
                key={m.key}
                className="inline-flex items-center gap-1.5 bg-primary/10 border border-primary/30 text-primary text-[12px] font-mono px-2 py-1 rounded tabular-nums"
              >
                <Icon className="w-3 h-3" />
                <span className="text-outline uppercase tracking-widest text-[10px]">{m.label}:</span>
                <span className="text-on-surface">{value}</span>
              </span>
            );
          })
        )}
      </div>
    </motion.div>
  );
}

export default function FIRIntelligenceSearchPage() {
  const { t } = useLanguage();
  const navigate = useNavigate();
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<FIRSearchResult[]>([]);
  const [parsed, setParsed] = useState<ParsedQuery | null>(null);
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [selectedDetail, setSelectedDetail] = useState<FIRDetail | null>(null);
  const [loading, setLoading] = useState(false);
  const parentRef = useRef<HTMLDivElement>(null);

  const rowVirtualizer = useVirtualizer({
    count: results.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 68,
    overscan: 5,
  });

  useEffect(() => {
    if (selectedId === null) {
      setSelectedDetail(null);
      return;
    }
    getFIRDetail(selectedId).then(setSelectedDetail);
  }, [selectedId]);

  const handleSearch = useCallback(async () => {
    setLoading(true);
    const { results, parsed } = await searchFIR(query);
    setResults(results);
    setParsed(parsed);
    setLoading(false);
  }, [query]);

  return (
    <div className="flex flex-col h-full">
      <header className="mb-4">
        <h1 className="text-[24px] font-semibold text-on-surface mb-1 tracking-tight">
          $($t('firSearchTitle'))
        </h1>
        <p className="text-[14px] text-on-surface-variant">
          $($t('firSearchSubtitle')) — try "cyber crime Bengaluru last week"
        </p>
      </header>

      <div className="flex items-center gap-3 mb-4">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-outline" />
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
            placeholder="{t('searchPlaceholderFir')}"
            className="w-full h-10 pl-10 pr-12 bg-surface-container border border-outline-variant/50 rounded-lg text-[13px] text-on-surface placeholder:text-outline focus:outline-none focus:border-primary/50 focus:ring-1 focus:ring-primary/30 font-mono"
          />
          <button
            type="button"
            title="Voice search (demo)"
            className="absolute right-2 top-1/2 -translate-y-1/2 w-8 h-8 flex items-center justify-center rounded text-on-surface-variant hover:text-primary hover:bg-primary/10 transition-colors"
          >
            <Mic className="w-4 h-4" />
          </button>
        </div>
        <button
          onClick={handleSearch}
          disabled={loading}
          className="h-10 px-5 bg-primary/10 border border-primary/30 rounded-lg text-[12px] font-semibold uppercase tracking-widest text-primary hover:bg-primary/20 transition-colors disabled:opacity-50 flex items-center gap-2"
        >
          {loading ? t('searching') : t('search')}
        </button>
      </div>

      <AnimatePresence>
        {parsed && <TransparencyPanel parsed={parsed} />}
      </AnimatePresence>

      <div className="flex-1 relative bg-surface-container-lowest border border-outline-variant/30 rounded-lg overflow-hidden">
        <div className="bg-surface-container-low border-b border-outline-variant/20 px-4 py-2 flex items-center text-[11px] font-semibold uppercase tracking-widest text-outline">
          <span className="w-[72px] shrink-0">ID</span>
          <span className="flex-1">Case Details</span>
          <span className="w-[200px] text-right hidden md:block">Summary</span>
        </div>

        {results.length === 0 && !loading && (
          <div className="flex flex-col items-center justify-center py-24 text-center">
            <Search className="w-10 h-10 text-outline mb-3" />
            <p className="text-[13px] text-outline">{t('enterQuery')}</p>
          </div>
        )}

        <div ref={parentRef} className="h-[calc(100%-36px)] overflow-y-auto">
          <div
            style={{
              height: `${rowVirtualizer.getTotalSize()}px`,
              width: '100%',
              position: 'relative',
            }}
          >
            {rowVirtualizer.getVirtualItems().map((virtualItem) => {
              const result = results[virtualItem.index];
              if (!result) return null;
              return (
                <Row
                  key={result.caseMasterId}
                  result={result}
                  isSelected={selectedId === result.caseMasterId}
                  onSelect={setSelectedId}
                  style={{
                    position: 'absolute',
                    top: 0,
                    left: 0,
                    width: '100%',
                    height: `${virtualItem.size}px`,
                    transform: `translateY(${virtualItem.start}px)`,
                  }}
                />
              );
            })}
          </div>
        </div>

        <DetailDrawer
          detail={selectedDetail}
          caseId={selectedId}
          onClose={() => setSelectedId(null)}
          onInvestigate={(id) => navigate(`/cases/${id}`)}
        />
      </div>
    </div>
  );
}
