import { useCallback, useEffect, useState } from 'react';
import { Outlet } from 'react-router-dom';
import Sidebar from './Sidebar';
import Topbar from './Topbar';
import ToastStack from './ToastStack';
import CommandPalette from './CommandPalette';
import SystemHealth from './SystemHealth';
import { useOnNewAlert } from '../context/AlertContext';
import { useToasts } from '../context/ToastContext';

export default function Layout() {
  const { pushToast } = useToasts();
  const [collapsed, setCollapsed] = useState(false);
  const [paletteOpen, setPaletteOpen] = useState(false);
  const [systemHealthOpen, setSystemHealthOpen] = useState(false);

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

  // Layout-level alert bridge → toasts on every page (per U1 decision).
  // Single SSE connection is managed by AlertProvider; we just subscribe.
  useOnNewAlert(useCallback((data) => {
    pushToast({
      type: data.severity === 'critical' ? 'error'
          : data.severity === 'high' ? 'warning' : 'info',
      title: `New ${data.crimeType || 'FIR'}`,
      message: `${data.crimeNo || ''} — ${data.district || 'Unknown district'}`,
      durationMs: 5000,
    });
  }, [pushToast]));

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
        className="flex-1 mt-[56px] h-[calc(100vh-56px)] overflow-hidden bg-background transition-all duration-300 ease-in-out p-margin-desktop"
        style={{ marginLeft: collapsed ? 64 : 240 }}
      >
        <div className="max-w-[1600px] mx-auto h-full flex flex-col">
          <Outlet />
        </div>
      </main>
    </div>
  );
}
