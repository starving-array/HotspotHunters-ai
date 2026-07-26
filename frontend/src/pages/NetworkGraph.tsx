import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Plus, Minus, Maximize, X, Info, AlertTriangle } from 'lucide-react';
import { useLanguage } from '../context/LanguageContext';


// Risk colour mapping used by the design mock
const RISK_COLOR: Record<string, string> = {
  high: '#ffb4ab',
  med: '#e89337',
  low: '#52d9a0',
};

export default function NetworkIntelligenceGraphPage() {
  const { t } = useLanguage();
  const [transform, setTransform] = useState({ x: 0, y: 0, scale: 1 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const [graphData, setGraphData] = useState<{ nodes: any[]; links: any[] }>({ nodes: [], links: [] });
  const svgRef = useRef<SVGSVGElement>(null);

  // Load graph data from API and assign deterministic positions
  useEffect(() => {
    async function load() {
      const { nodes, links } = await import('../api/network').then(m => m.getGraphData());
      // Assign simple grid positions for demonstration (replace with real layout if needed)
      const positioned = nodes.map((n, i) => ({
        ...n,
        x: (i % 5) * 200 + 100,
        y: Math.floor(i / 5) * 200 + 100,
      }));
      setGraphData({ nodes: positioned, links });
    }
    load();
  }, []);

  const handleMouseDown = (e: React.MouseEvent) => {
    if ((e.target as Element).tagName !== 'svg' && (e.target as Element).tagName !== 'g' && (e.target as Element).tagName !== 'rect') return;
    setIsDragging(true);
    setDragStart({ x: e.clientX - transform.x, y: e.clientY - transform.y });
  };

  const handleMouseMove = useCallback((e: MouseEvent) => {
    if (!isDragging) return;
    setTransform(prev => ({ ...prev, x: e.clientX - dragStart.x, y: e.clientY - dragStart.y }));
  }, [isDragging, dragStart]);

  const handleMouseUp = useCallback(() => setIsDragging(false), []);

  useEffect(() => {
    if (isDragging) {
      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleMouseUp);
    } else {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    }
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isDragging, handleMouseMove, handleMouseUp]);

  // Zoom with mouse wheel
  useEffect(() => {
    const svg = svgRef.current;
    if (!svg) return;
    const handleWheel = (e: WheelEvent) => {
      e.preventDefault();
      const scaleFactor = e.deltaY > 0 ? 0.9 : 1.1;
      const rect = svg.getBoundingClientRect();
      const mouseX = e.clientX - rect.left;
      const mouseY = e.clientY - rect.top;
      setTransform(prev => {
        const newScale = Math.min(Math.max(prev.scale * scaleFactor, 0.2), 5);
        const newX = mouseX - (mouseX - prev.x) * (newScale / prev.scale);
        const newY = mouseY - (mouseY - prev.y) * (newScale / prev.scale);
        return { x: newX, y: newY, scale: newScale };
      });
    };
    svg.addEventListener('wheel', handleWheel, { passive: false });
    return () => svg.removeEventListener('wheel', handleWheel);
  }, []);

  const handleZoomIn = () => setTransform(p => ({ ...p, scale: Math.min(p.scale * 1.2, 5) }));
  const handleZoomOut = () => setTransform(p => ({ ...p, scale: Math.max(p.scale / 1.2, 0.2) }));
  const handleFit = () => setTransform({ x: 0, y: 0, scale: 1 });

  const getNode = (id: string) => graphData.nodes.find(n => n.id === id);

  return (
    <div className="flex flex-col h-full">
      <header className="mb-4 flex items-center justify-between">
        <div>
          <h1 className="text-[24px] font-semibold text-on-surface mb-1 tracking-tight">{t('networkGraphTitle')}</h1>
          <p className="text-[14px] text-on-surface-variant">{t('networkGraphSubtitle')}</p>
        </div>
      </header>

      <div className="flex-1 relative bg-[#0a0f1e] overflow-hidden">
        {/* Grid background */}
        <div className="absolute inset-0 bg-[linear-gradient(to_right,#1e3a5f1a_1px,transparent_1px),linear-gradient(to_bottom,#1e3a5f1a_1px,transparent_1px)] bg-[size:24px_24px]"></div>
        <div className="absolute inset-0 bg-[linear-gradient(to_right,#1e3a5f33_1px,transparent_1px),linear-gradient(to_bottom,#1e3a5f33_1px,transparent_1px)] bg-[size:120px_120px]"></div>

        <svg
          ref={svgRef}
          className={`absolute inset-0 w-full h-full ${isDragging ? 'cursor-grabbing' : 'cursor-grab'}`}
          onMouseDown={handleMouseDown}
        >
          <defs>
            <filter id="glow-red" x="-20%" y="-20%" width="140%" height="140%">
              <feGaussianBlur stdDeviation="4" result="blur" />
              <feComposite in="SourceGraphic" in2="blur" operator="over" />
            </filter>
          </defs>
          <g transform={`translate(${transform.x}, ${transform.y}) scale(${transform.scale})`}>
            {/* Edges */}
            <g className="opacity-60" strokeWidth="1.5">
              {graphData.links.map(edge => {
                const source = getNode(edge.source);
                const target = getNode(edge.target);
                if (!source || !target) return null;
                let stroke = '#bcc9cd';
                let dash = 'none';
                if (edge.type === 'arrested_together') { stroke = '#06b6d4'; dash = '6,4'; }
                else if (edge.type === 'similar_mo') { stroke = '#e89337'; dash = '2,4'; }
                return (
                  <line
                    key={edge.id}
                    x1={source.x}
                    y1={source.y}
                    x2={target.x}
                    y2={target.y}
                    stroke={stroke}
                    strokeDasharray={dash}
                  />
                );
              })}
            </g>
            {/* Nodes */}
            <g>
              {graphData.nodes.map(node => {
                const isSelected = selectedNodeId === node.id;
                if (node.type === 'police_station') {
                  return (
                    <g key={node.id} transform={`translate(${node.x}, ${node.y})`}>
                      <polygon points="0,-15 13,-7 13,8 0,15 -13,8 -13,-7" fill="#090e1c" stroke="#4cd7f6" strokeWidth="2" />
                      <text y="30" fill="#bcc9cd" fontSize="10" fontFamily="JetBrains Mono" textAnchor="middle">{node.label}</text>
                    </g>
                  );
                }
                if (node.type === 'fir') {
                  return (
                    <g key={node.id} transform={`translate(${node.x}, ${node.y})`}>
                      <rect x="-10" y="-10" width="20" height="20" rx="2" fill="#090e1c" stroke="#869397" strokeWidth="1.5" />
                      <text y="25" fill="#bcc9cd" fontSize="10" fontFamily="JetBrains Mono" textAnchor="middle">{node.label}</text>
                    </g>
                  );
                }
                // accused nodes
                let stroke = '#4cd7f6';
                let radius = 12;
                let filter = 'none';
                if (node.risk === 'high') { stroke = '#ffb4ab'; radius = 22; filter = isSelected ? 'url(#glow-red)' : 'none'; }
                else if (node.risk === 'med') { stroke = '#e89337'; radius = 16; }
                return (
                  <g
                    key={node.id}
                    transform={`translate(${node.x}, ${node.y})`}
                    onClick={e => { e.stopPropagation(); if (node.type === 'accused') setSelectedNodeId(node.id); }}
                    className="cursor-pointer"
                  >
                    <circle r={radius} fill="#090e1c" stroke={stroke} strokeWidth={isSelected ? 3 : 2} filter={filter} />
                    {isSelected && <circle r="6" fill={stroke} />}
                    <text y={radius + 15} fill={isSelected ? '#dee1f7' : '#bcc9cd'} fontSize={isSelected ? '12' : '11'} fontWeight={isSelected ? '600' : '400'} fontFamily="Inter" textAnchor="middle">{node.label}</text>
                    {node.subLabel && (
                      <text y={radius + 30} fill={stroke} fontSize="10" fontFamily="JetBrains Mono" textAnchor="middle">{node.subLabel}</text>
                    )}
                  </g>
                );
              })}
            </g>
          </g>
        </svg>

        {/* Legend */}
        <div className="absolute bottom-6 left-6 w-[280px] bg-surface/90 glass-panel border border-outline-variant p-4 rounded-xl shadow-2xl pointer-events-none">
          <h4 className="font-semibold text-[11px] tracking-widest uppercase text-on-surface-variant mb-3 border-b border-outline-variant/50 pb-2">Graph Legend</h4>
          <div className="space-y-4">
            <div>
              <div className="text-xs text-on-surface mb-2 font-medium">Nodes</div>
              <div className="grid grid-cols-2 gap-2 text-xs font-mono text-on-surface-variant">
                <div className="flex items-center gap-2"><div className="w-3 h-3 rounded-full border-2 border-error bg-surface-container-lowest shadow-[0_0_8px_rgba(255,180,171,0.3)]"></div><span>High Risk</span></div>
                <div className="flex items-center gap-2"><div className="w-3 h-3 rounded-full border-2 border-tertiary-container bg-surface-container-lowest"></div><span>Med Risk</span></div>
                <div className="flex items-center gap-2"><div className="w-3 h-3 rounded-full border-2 border-primary bg-surface-container-lowest"></div><span>Low Risk</span></div>
                <div className="flex items-center gap-2"><div className="w-3 h-3 rounded border-2 border-outline bg-surface-container-lowest"></div><span>FIR/Case</span></div>
                <div className="flex items-center gap-2 col-span-2 mt-1"><div className="w-4 h-4 flex items-center justify-center"><svg width="12" height="12" viewBox="0 0 12 12"><polygon points="6,0 12,3 12,9 6,12 0,9 0,3" fill="none" stroke="#4cd7f6" strokeWidth="2"></polygon></svg></div><span>Police Station</span></div>
              </div>
            </div>
            <div>
              <div className="text-xs text-on-surface mb-2 font-medium">Relationships (Edges)</div>
              <div className="space-y-2 text-xs font-mono text-on-surface-variant">
                <div className="flex items-center gap-3"><div className="w-6 border-t border-on-surface-variant"></div><span>Co-accused</span></div>
                <div className="flex items-center gap-3"><div className="w-6 border-t border-primary-container border-dashed"></div><span>Arrested together</span></div>
                <div className="flex items-center gap-3"><div className="w-6 border-t border-tertiary-container border-dotted border-[1.5px]"></div><span>Similar MO</span></div>
              </div>
            </div>
          </div>
        </div>

        {/* Zoom Controls */}
        <div className="absolute right-6 bottom-6 flex flex-col gap-2 bg-surface border border-outline-variant rounded-lg p-1 z-10">
          <button onClick={handleZoomIn} className="w-8 h-8 flex items-center justify-center text-on-surface hover:bg-surface-variant rounded transition-colors cursor-pointer"><Plus className="w-5 h-5" /></button>
          <div className="w-6 h-px bg-outline-variant mx-auto"></div>
          <button onClick={handleZoomOut} className="w-8 h-8 flex items-center justify-center text-on-surface hover:bg-surface-variant rounded transition-colors cursor-pointer"><Minus className="w-5 h-5" /></button>
          <div className="w-6 h-px bg-outline-variant mx-auto"></div>
          <button onClick={handleFit} className="w-8 h-8 flex items-center justify-center text-primary hover:bg-surface-variant rounded transition-colors cursor-pointer"><Maximize className="w-4 h-4" /></button>
        </div>
      </div>
    </div>
  );
}
