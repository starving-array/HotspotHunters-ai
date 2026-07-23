import { useEffect, useState } from 'react';
import { Menu, Search, Command } from 'lucide-react';
import { useLanguage } from '../context/LanguageContext';

interface Props {
  onToggleSidebar: () => void;
  onOpenCommandPalette: () => void;
}

export default function Topbar({ onToggleSidebar, onOpenCommandPalette }: Props) {
  const { t, locale, toggleLocale } = useLanguage();
  const [clock, setClock] = useState('');

  useEffect(() => {
    const tick = () => {
      const now = new Date();
      const iso = now.toISOString().substring(11, 19);
      setClock(`${iso} UTC`);
    };
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, []);

  return (
    <header className="fixed top-0 w-full h-[56px] z-[50] border-b border-outline-variant/30 flex justify-between items-center px-margin-desktop bg-surface/80 backdrop-blur-xl">
      <div className="flex items-center gap-4">
        <button
          onClick={onToggleSidebar}
          className="text-on-surface-variant hover:text-on-surface p-1 rounded-md hover:bg-surface-variant/50 transition-colors"
          aria-label="Toggle sidebar"
        >
          <Menu className="w-5 h-5" />
        </button>
        <div className="font-headline-md text-headline-md text-primary tracking-tighter font-semibold">
          {t('kspAnalytics')}
        </div>
      </div>

      <button
        onClick={onOpenCommandPalette}
        className="hidden md:flex flex-1 max-w-md mx-4 relative items-center gap-2 cursor-text group"
      >
        <span className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
          <Search className="w-4 h-4 text-outline group-hover:text-primary transition-colors" />
        </span>
        <div className="w-full bg-surface-container-high/50 border border-outline-variant/50 rounded-full py-1.5 pl-10 pr-16 text-left text-body font-body-md text-outline flex items-center hover:border-primary/50 transition-all">
          {t('searchPlaceholder')}
        </div>
        <div className="absolute inset-y-0 right-0 flex items-center pr-2 pointer-events-none">
          <div className="border border-outline-variant/50 rounded px-1.5 py-0.5 text-[10px] font-mono text-outline bg-surface-container flex items-center gap-0.5">
            <Command className="w-3 h-3" /> K
          </div>
        </div>
      </button>

      <div className="flex items-center gap-4">
        <div className="hidden lg:block font-mono font-semibold text-primary tracking-tight text-[13px] tabular-nums">
          {clock}
        </div>
        <button
          onClick={toggleLocale}
          className="hidden sm:block text-on-surface-variant text-[11px] font-semibold tracking-widest uppercase cursor-pointer hover:text-on-surface transition-colors"
        >
          {locale === 'en' ? 'EN | ಕನ್ನಡ' : 'ಕನ್ನಡ | EN'}
        </button>
        <div className="h-6 w-[1px] bg-outline-variant/50 hidden sm:block" />
        <div className="relative cursor-pointer hover:ring-2 hover:ring-primary/50 rounded-full transition-all flex items-center justify-center h-8 w-8 bg-surface-variant border border-outline-variant/50">
          <span className="text-[11px] font-bold text-primary font-mono">KSP</span>
        </div>
      </div>
    </header>
  );
}
