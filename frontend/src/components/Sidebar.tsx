import { NavLink } from 'react-router-dom';
import {
  LayoutDashboard,
  Map,
  Flame,
  Network,
  AlertTriangle,
  Shield,
  TrendingUp,
  Search,
  History,
  Settings,
  type LucideIcon,
} from 'lucide-react';
import { useLanguage } from '../context/LanguageContext';
import type { TranslationKey } from '../context/LanguageContext';

interface NavDef {
  to: string;
  icon: LucideIcon;
  labelKey: TranslationKey;
}

const NAV: NavDef[] = [
  { to: '/', icon: LayoutDashboard, labelKey: 'overview' },
  { to: '/map', icon: Map, labelKey: 'liveMap' },
  { to: '/hotspots', icon: Flame, labelKey: 'hotspots' },
  { to: '/network', icon: Network, labelKey: 'networkGraph' },
  { to: '/anomalies', icon: AlertTriangle, labelKey: 'anomalies' },
  { to: '/cybercrime', icon: Shield, labelKey: 'cybercrime' },
  { to: '/trends', icon: TrendingUp, labelKey: 'trends' },
  { to: '/fir-search', icon: Search, labelKey: 'firSearch' },
  { to: '/audit', icon: History, labelKey: 'auditTrail' },
];

interface Props {
  collapsed: boolean;
  systemHealthOpen: boolean;
  onToggleSystemHealth: () => void;
}

export default function Sidebar({ collapsed, systemHealthOpen, onToggleSystemHealth }: Props) {
  const { t } = useLanguage();

  return (
    <nav
      className={`fixed left-0 top-0 h-full ${
        collapsed ? 'w-[64px]' : 'w-[240px]'
      } z-[60] border-r border-outline-variant/30 text-on-surface bg-surface-container transition-all duration-300 ease-in-out flex flex-col pt-[56px] pb-4`}
    >
      {/* Sidebar header */}
      <div
        className={`p-4 border-b border-outline-variant/30 flex items-center gap-3 overflow-hidden whitespace-nowrap min-h-[72px] ${
          collapsed ? 'justify-center' : ''
        }`}
      >
        <div className="flex-shrink-0 w-10 h-10 rounded-full bg-surface-variant border border-primary/30 flex items-center justify-center">
          <span className="text-[10px] font-bold text-primary font-mono tracking-tighter">KSP</span>
        </div>
        {!collapsed && (
          <div className="flex flex-col">
            <span className="font-headline-md text-headline-md text-on-surface text-[16px] leading-tight">
              KSP OPS
            </span>
            <span className="text-[10px] font-semibold tracking-widest text-outline uppercase">
              Karnataka State
            </span>
          </div>
        )}
      </div>

      {/* Nav links */}
      <div className="flex-1 overflow-y-auto py-2 flex flex-col gap-1 px-2">
        {NAV.map(({ to, icon: Icon, labelKey }) => (
          <NavLink
            key={to}
            to={to}
            end={to === '/'}
            className={({ isActive }) =>
              `flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all w-full border-l-2 relative group ${
                isActive
                  ? 'text-primary bg-primary/10 border-primary font-bold'
                  : 'text-on-surface-variant border-transparent hover:bg-surface-variant hover:text-on-surface hover:border-outline-variant/50 font-medium'
              } ${collapsed ? 'justify-center' : ''}`
            }
            title={collapsed ? t(labelKey) : undefined}
          >
            {({ isActive }) => (
              <>
                <Icon className="w-5 h-5 flex-shrink-0" />
                {!collapsed && (
                  <span className="text-[11px] font-semibold tracking-widest uppercase truncate">
                    {t(labelKey)}
                  </span>
                )}
                {isActive && !collapsed && (
                  <div className="absolute inset-0 bg-primary/5 blur-[4px] rounded-lg -z-10 opacity-50" />
                )}
              </>
            )}
          </NavLink>
        ))}

        <div className="mt-auto mb-2 border-t border-outline-variant/30 pt-2 w-full" />

        <NavLink
          to="/settings"
          className={({ isActive }) =>
            `flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all w-full border-l-2 ${
              isActive
                ? 'text-primary bg-primary/10 border-primary font-bold'
                : 'text-on-surface-variant border-transparent hover:bg-surface-variant hover:text-on-surface hover:border-outline-variant/50 font-medium'
            } ${collapsed ? 'justify-center' : ''}`
          }
          title={collapsed ? t('settings') : undefined}
        >
          <Settings className="w-5 h-5 flex-shrink-0" />
          {!collapsed && (
            <span className="text-[11px] font-semibold tracking-widest uppercase truncate">
              {t('settings')}
            </span>
          )}
        </NavLink>
      </div>

      {/* Sidebar footer */}
      <div className="px-4 pt-4 pb-2 border-t border-outline-variant/30 flex flex-col gap-3 whitespace-nowrap overflow-visible relative">
        <div
          className={`flex items-center gap-2 text-on-surface-variant ${
            collapsed ? 'justify-center' : ''
          }`}
        >
          <span className="relative flex h-2.5 w-2.5">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75" />
            <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-primary" />
          </span>
          {!collapsed && (
            <span className="text-[10px] font-semibold tracking-widest text-outline uppercase">
              {t('liveConnection')}
            </span>
          )}
        </div>

        <button
          onClick={onToggleSystemHealth}
          className={`w-full bg-surface-variant hover:bg-surface-bright border border-outline-variant/50 rounded-md py-2 flex justify-center items-center gap-2 transition-colors ${
            collapsed ? 'justify-center' : ''
          }`}
        >
          <Settings className="w-4 h-4 text-outline hover:text-primary transition-colors" />
          {!collapsed && (
            <span className="text-[11px] font-semibold tracking-widest uppercase text-on-surface">
              {t('systemHealth')}
            </span>
          )}
        </button>

        {!collapsed && systemHealthOpen && null}
      </div>
    </nav>
  );
}
