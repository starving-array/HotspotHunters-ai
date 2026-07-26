import { useCallback, useEffect, useRef, useState } from 'react';
import ForceGraph2D from 'react-force-graph-2d';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Info, AlertTriangle } from 'lucide-react';
import type { NetworkNode, NetworkLink, ShapFeature } from '../types';
import { getGraphData, getShapFeatures } from '../api/network';
import { useLanguage } from '../context/LanguageContext';

const RISK_COLOR: Record<string, string> = {
  low: '#52d9a0',
  medium: '#ffb873',
  high: '#ffb4ab',
};

const NODE_RADIUS: Record<string, number> = {
  person: 8,
  case: 6,
  ip: 5,
  district: 10,
};

const NODE_LABEL: Record<string, string> = {
  person: 'Person',
  case: 'FIR',
  ip: 'IP Address',
  district: 'District',
};

function Drawer({
  node,
  shap,
  onClose,
  t,
}: {
  node: NetworkNode | null;
  shap: ShapFeature[];
  onClose: () => void;
  t: (key: import('../context/LanguageContext').TranslationKey) => string;
}) {
  return (
    <AnimatePresence>
      {node && (
        <motion.aside
          initial={{ x: 420 }}
          animate={{ x: 0 }}
          exit={{ x: 420 }}
          transition={{ type: 'spring', stiffness: 300, damping: 32 }}
          className="absolute top-0 right-0 h-full w-[420px] bg-surface-container/95 backdrop-blur-xl border-l border-outline-variant z-50 flex flex-col"
        >
          <div className="flex items-center justify-between p-4 border-b border-outline-variant/30">
            <div className="flex items-center gap-3">
              <Info className="w-4 h-4 text-primary" />
              <h2 className="text-[13px] font-semibold uppercase tracking-widest text-on-surface">
                {t('nodeInspection')}
              </h2>
            </div>
            <button
              onClick={onClose}
              className="w-7 h-7 flex items-center justify-center rounded hover:bg-surface-variant transition-colors"
            >
              <X className="w-4 h-4 text-on-surface-variant" />
            </button>
          </div>

          <div className="flex-1 overflow-y-auto p-4 space-y-5">
            <section>
              <div className="flex items-center gap-3 mb-3">
                <span
                  className="w-3 h-3 rounded-full"
                  style={{ backgroundColor: RISK_COLOR[node.riskLevel] || RISK_COLOR.low }}
                />
                <div>
                  <h3 className="text-[16px] font-semibold text-on-surface">{node.label}</h3>
                  <span className="text-[11px] font-mono text-outline uppercase tracking-widest">
                    {NODE_LABEL[node.type]} · ID {node.id}
                  </span>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3 mt-4">
                <div className="bg-surface-container-low rounded p-3">
                  <div className="text-[11px] text-outline uppercase tracking-widest mb-1">{t('riskScore')}</div>
                  <div className="font-mono text-[20px] font-semibold tabular-nums tracking-tight" style={{ color: RISK_COLOR[node.riskLevel] }}>
                    {(node.riskScore * 100).toFixed(0)}%
                  </div>
                </div>
                <div className="bg-surface-container-low rounded p-3">
                  <div className="text-[11px] text-outline uppercase tracking-widest mb-1">{t('entityType')}</div>
                  <div className="font-mono text-[14px] text-on-surface font-semibold uppercase">{NODE_LABEL[node.type]}</div>
                </div>
              </div>
            </section>

            {node.riskScore > 0.5 && (
              <section className="bg-error/5 border border-error/20 rounded-lg p-3 flex items-start gap-2">
                <AlertTriangle className="w-4 h-4 text-error shrink-0 mt-0.5" />
                <p className="text-[12px] text-error leading-relaxed">
                  This entity exceeds the risk threshold. Review linked cases and indicators for potential intervention.
                </p>
              </section>
            )}

            {shap.length > 0 && (
              <section>
                <div className="flex items-center justify-between mb-3">
                  <h4 className="text-[11px] font-semibold uppercase tracking-widest text-outline">
                    {t('shapAttribution')}
                  </h4>
                </div>
                <div className="space-y-2">
                  {shap.map((f) => (
                    <div key={f.feature}>
                      <div className="flex justify-between text-[12px] mb-1">
                        <span className="text-on-surface-variant font-mono">{f.feature.replace(/_/g, ' ')}</span>
                        <span className="font-mono tabular-nums text-on-surface">{(f.weight * 100).toFixed(0)}%</span>
                      </div>
                      <div className="h-1.5 bg-surface-container-highest rounded-full overflow-hidden">
                        <div
                          className="h-full rounded-full bg-gradient-to-r from-primary to-tertiary transition-all duration-500"
                          style={{ width: `${Math.abs(f.weight * 100)}%` }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </section>
            )}
          </div>
        </motion.aside>
      )}
    </AnimatePresence>
  );
}

function GraphLegend({ t }: { t: (key: import('../context/LanguageContext').TranslationKey) => string }) {
  const items = [
    { color: RISK_COLOR.high, label: t('highRisk') },
    { color: RISK_COLOR.medium, label: t('mediumRisk') },
    { color: RISK_COLOR.low, label: t('lowRisk') },
  ];
  return (
    <div className="absolute bottom-4 left-4 bg-surface-container/80 backdrop-blur-md border border-outline-variant rounded-lg p-3 z-10 flex gap-4 text-[11px]">
      {items.map((i) => (
        <div key={i.label} className="flex items-center gap-2">
          <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: i.color }} />
          <span className="text-on-surface-variant font-mono uppercase tracking-widest">{i.label}</span>
        </div>
      ))}
    </div>
  );
}

export default function NetworkIntelligenceGraphPage() {
  const { t } = useLanguage();
  const [graphData, setGraphData] = useState<{ nodes: NetworkNode[]; links: NetworkLink[] }>({ nodes: [], links: [] });
  const [selectedNode, setSelectedNode] = useState<NetworkNode | null>(null);
  const [shapFeatures, setShapFeatures] = useState<ShapFeature[]>([]);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    getGraphData().then(setGraphData);
  }, []);

  const handleNodeClick = useCallback((node: NetworkNode) => {
    setSelectedNode(node);
    if (node.type === 'person') {
      getShapFeatures(String(node.id)).then(setShapFeatures);
    } else {
      setShapFeatures([]);
    }
  }, []);

  return (
    <div className="flex flex-col h-full">
      <header className="mb-4 flex items-center justify-between">
        <div>
          <h1 className="text-[24px] font-semibold text-on-surface mb-1 tracking-tight">
            {t('networkGraphTitle')}
          </h1>
          <p className="text-[14px] text-on-surface-variant">
            {t('networkGraphSubtitle')}
          </p>
        </div>
      </header>

      <div ref={containerRef} className="flex-1 relative bg-surface-container-lowest border border-outline-variant/30 rounded-lg overflow-hidden min-h-[500px]">
        {graphData.nodes.length > 0 && (
          <ForceGraph2D<NetworkNode, NetworkLink>
            graphData={graphData}
            width={containerRef.current?.clientWidth || 900}
            height={containerRef.current?.clientHeight || 600}
            nodeColor={(n) => RISK_COLOR[n.riskLevel] || RISK_COLOR.low}
            nodeRelSize={1}
            nodeVal={(n) => NODE_RADIUS[n.type] || 6}
            linkColor={() => 'rgba(76, 215, 246, 0.15)'}
            linkWidth={0.5}
            linkLabel={(l) => {
              const src = typeof l.source === 'object' ? l.source.label : l.source;
              const tgt = typeof l.target === 'object' ? l.target.label : l.target;
              return `${l.type}: ${src} → ${tgt}`;
            }}
            nodeLabel={(n) => `${n.label}\n${NODE_LABEL[n.type]} · Risk: ${(n.riskScore * 100).toFixed(0)}%`}
            onNodeClick={handleNodeClick}
            backgroundColor="transparent"
            d3AlphaDecay={0.02}
            d3VelocityDecay={0.3}
            cooldownTicks={100}
            enableNodeDrag={true}
            enableZoomInteraction={true}
            enablePanInteraction={true}
          />
        )}

        <GraphLegend t={t} />

        <Drawer
          node={selectedNode}
          shap={shapFeatures}
          onClose={() => setSelectedNode(null)}
          t={t}
        />
      </div>
    </div>
  );
}
