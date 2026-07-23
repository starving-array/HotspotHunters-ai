import { useEffect, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { CheckCircle2, Cpu, Database, Activity } from 'lucide-react';
import { getSystemHealth } from '../api/systemHealth';

interface Props {
  open: boolean;
}

export default function SystemHealth({ open }: Props) {
  const [cpuPct, setCpuPct] = useState(0);
  const [ramGb, setRamGb] = useState(0);
  const [services, setServices] = useState<
    Array<{ name: string; sub: string; metric: string; status: string }>
  >([]);

  useEffect(() => {
    getSystemHealth().then((data) => {
      setCpuPct(data.cpuPct);
      setRamGb(data.ramGb);
      setServices(data.services);
    });
  }, []);

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 10 }}
          transition={{ duration: 0.2 }}
          className="absolute bottom-[60px] left-4 w-72 bg-surface-container-highest/95 backdrop-blur-xl border border-outline-variant/50 rounded-lg shadow-2xl z-[70] overflow-hidden"
        >
          <div className="p-4 border-b border-outline-variant/30 flex items-center justify-between bg-surface-dim/40">
            <div className="flex items-center gap-2">
              <Activity className="w-4 h-4 text-primary" />
              <span className="text-xs font-bold tracking-widest text-on-surface uppercase">
                System Health
              </span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-success opacity-75" />
                <span className="relative inline-flex rounded-full h-2 w-2 bg-success" />
              </span>
              <span className="text-[10px] font-bold text-success uppercase tracking-tighter">
                Live
              </span>
            </div>
          </div>

          <div className="p-2 space-y-1">
            {services.map((s, i) => (
              <div
                key={s.name}
                className="flex items-center justify-between p-2 rounded-md hover:bg-surface-variant/50 transition-colors group"
              >
                <div className="flex flex-col">
                  <span className="text-[11px] font-medium text-on-surface">{s.name}</span>
                  <span className="text-[9px] text-outline font-mono">{s.sub}</span>
                </div>
                <div className="flex flex-col items-end">
                  <span className="text-[10px] font-mono text-success bg-success/10 px-1.5 py-0.5 rounded leading-none">
                    {s.metric}
                  </span>
                  <CheckCircle2 className="w-3 h-3 text-success mt-1 opacity-60 group-hover:opacity-100 transition-opacity" />
                </div>
              </div>
            ))}
          </div>

          <div className="p-3 border-t border-outline-variant/30 bg-surface-dim/20">
            <div className="flex items-center justify-between text-[10px] text-outline">
              <span className="flex items-center gap-1.5">
                <Cpu className="w-3 h-3" /> CPU: {cpuPct}%
              </span>
              <span className="flex items-center gap-1.5">
                <Database className="w-3 h-3" /> RAM: {ramGb}GB
              </span>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}