import { useNavigate } from 'react-router-dom';
import { User, Globe, Bell, Moon, Wifi, Shield, LogOut, AlertTriangle } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';

export default function SettingsPage() {
  const { logout } = useAuth();
  const { locale, setLocale, toggleLocale, t } = useLanguage();
  const navigate = useNavigate();

  function handleLogout() {
    logout();
    navigate('/login', { replace: true });
  }

  return (
    <div className="flex flex-col h-full overflow-y-auto pr-1">
      <header className="mb-4">
        <h1 className="text-[24px] font-semibold text-on-surface mb-1 tracking-tight">
          {t('settings')}
        </h1>
        <p className="text-[14px] text-on-surface-variant">
          Profile, display preferences, and session controls
        </p>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 max-w-[1100px]">
        <section className="bg-surface-container/80 backdrop-blur-md border border-outline-variant rounded-lg p-5">
          <div className="flex items-center gap-2 mb-4">
            <User className="w-4 h-4 text-primary" />
            <h2 className="text-[11px] font-semibold uppercase tracking-widest text-on-surface">
              Profile
            </h2>
          </div>
          <div className="flex items-center gap-4 mb-4">
            <div className="w-16 h-16 rounded-full bg-primary/15 border border-primary/30 flex items-center justify-center">
              <User className="w-7 h-7 text-primary" />
            </div>
            <div>
              <div className="text-[16px] font-semibold text-on-surface">DSP Murali Krishnan</div>
              <div className="text-[12px] font-mono text-on-surface-variant">DySP · Cyber Crime Cell</div>
              <div className="text-[11px] text-outline font-mono mt-1">
                EMP-ID 1001 · Bengaluru Urban
              </div>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3 text-[12px]">
            <div className="bg-surface-container-low rounded p-3">
              <div className="text-[10px] text-outline uppercase tracking-widest mb-1">Role</div>
              <div className="text-on-surface font-mono">Investigating Officer</div>
            </div>
            <div className="bg-surface-container-low rounded p-3">
              <div className="text-[10px] text-outline uppercase tracking-widest mb-1">Clearance</div>
              <div className="text-on-surface font-mono">Level 3 — Classified</div>
            </div>
          </div>
        </section>

        <section className="bg-surface-container/80 backdrop-blur-md border border-outline-variant rounded-lg p-5">
          <div className="flex items-center gap-2 mb-4">
            <Globe className="w-4 h-4 text-primary" />
            <h2 className="text-[11px] font-semibold uppercase tracking-widest text-on-surface">
              Display Preferences
            </h2>
          </div>
          <div className="space-y-3">
            <div className="flex items-center justify-between p-3 bg-surface-container-low rounded">
              <div>
                <div className="text-[13px] text-on-surface">Language</div>
                <div className="text-[11px] text-outline font-mono mt-0.5">EN working, Kn nav stubbed (full in U5)</div>
              </div>
              <button
                onClick={toggleLocale}
                className="px-3 py-1 bg-primary/10 border border-primary/30 rounded text-[11px] font-mono uppercase tracking-widest text-primary hover:bg-primary/20"
              >
                {locale === 'en' ? 'English' : 'ಕನ್ನಡ'}
              </button>
            </div>

            <div className="flex items-center justify-between p-3 bg-surface-container-low rounded">
              <div className="flex items-center gap-2">
                <Moon className="w-3.5 h-3.5 text-on-surface-variant" />
                <span className="text-[13px] text-on-surface">Dark theme</span>
              </div>
              <span className="text-[10px] font-mono uppercase tracking-widest text-emerald-400 bg-emerald-400/10 px-2 py-0.5 rounded">
                On (SOC)
              </span>
            </div>

            <div className="flex items-center justify-between p-3 bg-surface-container-low rounded">
              <div className="flex items-center gap-2">
                <Bell className="w-3.5 h-3.5 text-on-surface-variant" />
                <span className="text-[13px] text-on-surface">Critical incident toasts</span>
              </div>
              <span className="text-[10px] font-mono uppercase tracking-widest text-emerald-400 bg-emerald-400/10 px-2 py-0.5 rounded">
                On
              </span>
            </div>

            <div className="flex items-center justify-between p-3 bg-surface-container-low rounded">
              <div className="flex items-center gap-2">
                <Wifi className="w-3.5 h-3.5 text-on-surface-variant" />
                <span className="text-[13px] text-on-surface">Live SSE feed</span>
              </div>
              <span className="text-[10px] font-mono uppercase tracking-widest text-tertiary bg-tertiary/10 px-2 py-0.5 rounded">
                Auto
              </span>
            </div>
          </div>
        </section>

        <section className="bg-surface-container/80 backdrop-blur-md border border-outline-variant rounded-lg p-5">
          <div className="flex items-center gap-2 mb-4">
            <Shield className="w-4 h-4 text-primary" />
            <h2 className="text-[11px] font-semibold uppercase tracking-widest text-on-surface">
              Session
            </h2>
          </div>
          <div className="space-y-3 text-[12px]">
            <div className="flex justify-between p-3 bg-surface-container-low rounded">
              <span className="text-on-surface-variant">JWT Auth</span>
              <span className="text-emerald-400 font-mono">active</span>
            </div>
            <div className="flex justify-between p-3 bg-surface-container-low rounded">
              <span className="text-on-surface-variant">SSE Permit-all</span>
              <span className="text-tertiary font-mono">open (per U2 plan)</span>
            </div>
            <div className="flex justify-between p-3 bg-surface-container-low rounded">
              <span className="text-on-surface-variant">Auto-refresh</span>
              <span className="text-on-surface font-mono">5 min</span>
            </div>
          </div>
        </section>

        <section className="bg-error/5 border border-error/30 rounded-lg p-5">
          <div className="flex items-center gap-2 mb-4">
            <AlertTriangle className="w-4 h-4 text-error" />
            <h2 className="text-[11px] font-semibold uppercase tracking-widest text-error">
              Danger Zone
            </h2>
          </div>
          <p className="text-[12px] text-on-surface-variant mb-4">
            Signing out clears your JWT from local storage and disconnects the live alert stream.
          </p>
          <button
            onClick={handleLogout}
            className="px-4 py-2 bg-error/10 border border-error/40 rounded text-[11px] font-semibold uppercase tracking-widest text-error hover:bg-error/20 flex items-center gap-2"
          >
            <LogOut className="w-3.5 h-3.5" />
            {t('logout')}
          </button>
        </section>
      </div>
    </div>
  );
}
