import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { Clock, Map, Search, Zap, Command, Navigation } from 'lucide-react';

interface Props {
  open: boolean;
  onClose: () => void;
}

const NAV_ITEMS = [
  { to: '/', label: 'Overview' },
  { to: '/map', label: 'Live Map' },
  { to: '/hotspots', label: 'Hotspots' },
  { to: '/network', label: 'Network Graph' },
  { to: '/anomalies', label: 'Anomalies' },
  { to: '/cybercrime', label: 'Cybercrime' },
  { to: '/trends', label: 'Trends' },
  { to: '/fir-search', label: 'FIR Search' },
  { to: '/audit', label: 'Audit Trail' },
  { to: '/settings', label: 'Settings' },
];

interface PaletteItem {
  label: string;
  shortcut?: string;
}
interface PaletteSection {
  title: string;
  icon: typeof Clock;
  items: PaletteItem[];
}

const SECTIONS: PaletteSection[] = [
  {
    title: 'Recent Searches',
    icon: Clock,
    items: [
      { label: 'murders Bengaluru last week', shortcut: '↵' },
      { label: 'FIR 442/2026 search', shortcut: '↵' },
    ],
  },
  {
    title: 'Navigation',
    icon: Navigation,
    items: NAV_ITEMS.map((n) => ({ label: `Go to ${n.label}` })),
  },
  {
    title: 'Actions',
    icon: Zap,
    items: [
      { label: 'Drop Pin on Map', shortcut: 'P' },
      { label: 'Export Current View', shortcut: '⇧ E' },
    ],
  },
];

export default function CommandPalette({ open, onClose }: Props) {
  const navigate = useNavigate();
  const [search, setSearch] = useState('');
  const [activeIdx, setActiveIdx] = useState(0);

  const allItems = useMemo(
    () =>
      SECTIONS.flatMap((s) =>
        s.items.map((i) => ({ ...i, section: s.title })),
      ) as (PaletteItem & { section: string })[],
    [],
  );

  const filtered = useMemo(() => {
    if (!search.trim()) return allItems;
    const q = search.toLowerCase();
    return allItems.filter((i) => i.label.toLowerCase().includes(q));
  }, [search, allItems]);

  // Match navigation item by label
  const handleSelect = (label: string) => {
    const navMatch = NAV_ITEMS.find((n) => label === `Go to ${n.label}`);
    if (navMatch) {
      navigate(navMatch.to);
    }
    onClose();
  };

  useEffect(() => {
    if (!open) {
      setSearch('');
      setActiveIdx(0);
    }
  }, [open]);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (!open) return;
      if (e.key === 'Escape') {
        e.preventDefault();
        onClose();
      } else if (e.key === 'ArrowDown') {
        e.preventDefault();
        setActiveIdx((i) => Math.min(i + 1, filtered.length - 1));
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setActiveIdx((i) => Math.max(i - 1, 0));
      } else if (e.key === 'Enter') {
        e.preventDefault();
        const item = filtered[activeIdx];
        if (item) handleSelect(item.label);
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [open, filtered, activeIdx, onClose]);

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[100] flex items-start justify-center pt-[15vh] p-4"
          role="dialog"
          aria-modal="true"
        >
          <div
            className="absolute inset-0 bg-surface-dim/80 backdrop-blur-sm cursor-pointer"
            onClick={onClose}
          />
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: -20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: -20 }}
            transition={{ type: 'spring', stiffness: 320, damping: 30 }}
            className="relative w-full max-w-2xl bg-surface-container-highest/95 backdrop-blur-xl border border-outline-variant/50 rounded-xl shadow-2xl overflow-hidden flex flex-col"
          >
            <div className="flex items-center px-4 border-b border-outline-variant/30">
              <Search className="w-5 h-5 text-outline mr-3" />
              <input
                autoFocus
                className="flex-1 h-14 bg-transparent border-none focus:ring-0 outline-none text-on-surface placeholder:text-outline text-lg font-body"
                placeholder="Search FIRs, districts, accused…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
              <div className="flex items-center gap-1 px-2 py-1 bg-surface-container rounded border border-outline-variant/50 text-[10px] text-outline font-mono">
                <Command className="w-3 h-3" /> K
              </div>
            </div>

            <div className="max-h-[60vh] overflow-y-auto p-2">
              {filtered.length === 0 && (
                <div className="text-center py-8 text-outline text-sm">No matches.</div>
              )}
              {SECTIONS.map((section, sIdx) => {
                const items = filtered.filter((i) => i.section === section.title);
                if (items.length === 0) return null;
                const Icon = section.icon;
                return (
                  <div key={sIdx} className="mb-3">
                    <div className="flex items-center gap-2 px-3 py-2 text-[10px] font-bold text-outline uppercase tracking-widest">
                      <Icon className="w-3.5 h-3.5" /> {section.title}
                    </div>
                    <div className="space-y-1">
                      {items.map((item) => {
                        const globalIdx = filtered.findIndex(
                          (f) => f.label === item.label && f.section === item.section,
                        );
                        const active = globalIdx === activeIdx;
                        return (
                          <button
                            key={`${item.section}-${item.label}`}
                            onMouseEnter={() => setActiveIdx(globalIdx)}
                            onClick={() => handleSelect(item.label)}
                            className={`w-full flex items-center justify-between px-3 py-3 rounded-md text-left transition-all border-l-2 ${
                              active
                                ? 'bg-primary/10 text-primary border-primary'
                                : 'text-on-surface-variant border-transparent hover:bg-surface-variant/50'
                            }`}
                          >
                            <span className="text-sm">{item.label}</span>
                            {item.shortcut && (
                              <span className="text-[10px] font-mono text-outline">
                                {item.shortcut}
                              </span>
                            )}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="p-3 border-t border-outline-variant/30 bg-surface-dim/50 flex justify-between items-center text-[10px] text-outline font-medium">
              <div className="flex gap-4">
                <span>
                  <span className="text-on-surface font-bold">↑↓</span> to navigate
                </span>
                <span>
                  <span className="text-on-surface font-bold">↵</span> to select
                </span>
              </div>
              <span>ESC to close</span>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
