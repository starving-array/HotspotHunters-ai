import { useEffect, useRef, useState } from 'react';
import { Outlet } from 'react-router-dom';
import Sidebar from './Sidebar';
import Topbar from './Topbar';
import ToastStack from './ToastStack';
import CommandPalette from './CommandPalette';
import SystemHealth from './SystemHealth';
import { useAuth } from '../context/AuthContext';
import { useToasts } from '../context/ToastContext';

const SSE_EVENT_BUFFER_MAX = 100;

export default function Layout() {
  const { token } = useAuth();
  const { pushToast } = useToasts();
  const [collapsed, setCollapsed] = useState(false);
  const [paletteOpen, setPaletteOpen] = useState(false);
  const [systemHealthOpen, setSystemHealthOpen] = useState(false);
  const bufferCount = useRef(0);

  // Listen for ⌘K / Ctrl+K to open the command palette
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setPaletteOpen((p) => !p);
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, []);

  // Layout-level SSE bridge → toasts on every page (per U1 decision).
  // Caps SSE by design — 1 connection per browser tab. Each event
  // fires one toast AND we hard-stop after buffer max to keep memory bounded.
  useEffect(() => {
    if (!token) return;
    const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:8080';
    const url = `${apiUrl}/api/v1/alerts/stream`;
    let source: EventSource | null = null;
    try {
      source = new EventSource(url);
      source.onopen = () => {
        pushToast({
          type: 'info',
          title: 'Live Uplink',
          message: 'Real-time telemetry channel established.',
          durationMs: 3000,
        });
      };
      source.onmessage = (ev) => {
        if (bufferCount.current >= SSE_EVENT_BUFFER_MAX) return;
        bufferCount.current += 1;
        try {
          const data = JSON.parse(ev.data) as {
            crimeNo?: string;
            crimeType?: string;
            district?: string;
            severity?: string;
          };
          pushToast({
            type:
              data.severity === 'critical'
                ? 'error'
                : data.severity === 'high'
                  ? 'warning'
                  : 'info',
            title: `New ${data.crimeType || 'FIR'}`,
            message: `${data.crimeNo || ''} — ${data.district || 'Unknown district'}`,
            durationMs: 5000,
          });
        } catch {
          // ignore malformed payloads
        }
      };
      source.onerror = () => {
        // EventSource auto-reconnects; silent on direct user-facing toast
        // to avoid noise during transient outages.
      };
    } catch {
      // SSE unsupported in this environment — degrade gracefully.
    }
    return () => {
      if (source) {
        source.close();
        source = null;
      }
      bufferCount.current = 0;
    };
  }, [token, pushToast]);

  return (
    <div className="text-on-surface antialiased overflow-hidden flex h-screen bg-background">
      <ToastStack />
      <CommandPalette open={paletteOpen} onClose={() => setPaletteOpen(false)} />
      <Topbar
        onToggleSidebar={() => setCollapsed((c) => !c)}
        onOpenCommandPalette={() => setPaletteOpen(true)}
      />
      <Sidebar
        collapsed={collapsed}
        systemHealthOpen={systemHealthOpen}
        onToggleSystemHealth={() => setSystemHealthOpen((s) => !s)}
      />
      <div
        className={`fixed left-0 bottom-0 z-[65] pointer-events-none ${
          systemHealthOpen ? 'block' : 'hidden'
        }`}
        style={{ width: collapsed ? 64 : 240, paddingLeft: collapsed ? 8 : 16 }}
      >
        <div className="pointer-events-auto">
          <SystemHealth open={systemHealthOpen} />
        </div>
      </div>

      <main
        className="flex-1 mt-[56px] h-[calc(100vh-56px)] overflow-y-auto bg-background transition-all duration-300 ease-in-out p-margin-desktop"
        style={{ marginLeft: collapsed ? 64 : 240 }}
      >
        <div className="max-w-[1600px] mx-auto space-y-6">
          <Outlet />
        </div>
      </main>
    </div>
  );
}
