import { useEffect, useRef, useState } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import type { Alert } from '../types';

// Karnataka centroid (per reference HTML)
const KARNATAKA_CENTER: [number, number] = [15.3173, 75.7139];
const INITIAL_ZOOM = 7;

// Inline the popup + marker CSS the reference uses (so the cartodb dark map
// respects our deep-space palette).
const MAP_CUSTOM_CSS = `
.leaflet-container {
  background: #0a0f1e !important;
  font-family: 'Inter', sans-serif;
}
.leaflet-popup-content-wrapper {
  background-color: #0e1322 !important;
  border: 1px solid rgba(30, 58, 95, 1);
  color: #dee1f7 !important;
  border-radius: 8px;
  box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.5), 0 2px 4px -1px rgba(0, 0, 0, 0.3);
}
.leaflet-popup-tip {
  background-color: #0e1322 !important;
  border-bottom: 1px solid rgba(30, 58, 95, 1);
  border-right: 1px solid rgba(30, 58, 95, 1);
}
.leaflet-popup-content { margin: 12px; }
.leaflet-control-zoom { border: none !important; box-shadow: none !important; }
.leaflet-control-zoom a {
  background-color: rgba(26, 31, 47, 0.8) !important;
  backdrop-filter: blur(4px);
  color: #dee1f7 !important;
  border: 1px solid rgba(61, 73, 76, 0.5) !important;
  border-radius: 4px !important;
  width: 32px !important;
  height: 32px !important;
  line-height: 30px !important;
  transition: all 0.2s;
}
.leaflet-control-zoom a:hover { background-color: #2f3445 !important; }
.leaflet-control-attribution {
  background: rgba(14, 19, 34, 0.7) !important;
  color: #869397 !important;
  font-size: 10px;
}
.leaflet-control-attribution a { color: #4cd7f6 !important; }
.marker-pulse { position: relative; }
.marker-pulse::before, .marker-pulse::after {
  content: '';
  position: absolute;
  top: 50%; left: 50%;
  transform: translate(-50%, -50%);
  width: 200%; height: 200%;
  border-radius: 50%;
  border: 2px solid #4cd7f6;
  animation: mapPulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite;
}
.marker-pulse::after {
  width: 300%; height: 300%;
  border: 1px solid rgba(76, 215, 246, 0.5);
  animation-delay: 0.3s;
}
@keyframes mapPulse {
  0%   { transform: translate(-50%, -50%) scale(0.5); opacity: 1; }
  100% { transform: translate(-50%, -50%) scale(2);   opacity: 0; }
}
`;

const COLOR_BY_SEVERITY: Record<Alert['severity'], string> = {
  critical: '#ffb4ab',
  high: '#ffb4ab',
  medium: '#ffb873',
  low: '#4cd7f6',
};

export const SEED_MAP_ALERTS: Alert[] = [
  {
    id: 'm1',
    caseMasterId: 247,
    crimeNo: '1 0443 0006 2026 00247',
    crimeType: 'Cyber Crime',
    district: 'Bengaluru Urban',
    latitude: 12.9716,
    longitude: 77.5946,
    severity: 'low',
    timestamp: new Date().toISOString(),
  },
  {
    id: 'm2',
    caseMasterId: 122,
    crimeNo: '1 0882 0012 2026 00122',
    crimeType: 'Crimes vs Women',
    district: 'Mysuru',
    latitude: 12.2958,
    longitude: 76.6394,
    severity: 'medium',
    timestamp: new Date(Date.now() - 2 * 3600 * 1000).toISOString(),
  },
  {
    id: 'm3',
    caseMasterId: 84,
    crimeNo: '2 0119 0044 2026 00084',
    crimeType: 'Murder',
    district: 'Hubballi',
    latitude: 15.3647,
    longitude: 75.124,
    severity: 'critical',
    timestamp: new Date(Date.now() - 5 * 3600 * 1000).toISOString(),
  },
  {
    id: 'm4',
    caseMasterId: 411,
    crimeNo: '1 0223 0005 2026 00411',
    crimeType: 'Property',
    district: 'Mangaluru',
    latitude: 12.9141,
    longitude: 74.856,
    severity: 'low',
    timestamp: new Date(Date.now() - 24 * 3600 * 1000).toISOString(),
  },
  {
    id: 'm5',
    caseMasterId: 12,
    crimeNo: '3 0551 0099 2026 00012',
    crimeType: 'Assault',
    district: 'Kalaburagi',
    latitude: 17.3297,
    longitude: 76.8343,
    severity: 'high',
    timestamp: new Date(Date.now() - 2 * 24 * 3600 * 1000).toISOString(),
  },
];

function buildIcon(color: string, pulse: boolean): L.DivIcon {
  return L.divIcon({
    className: 'custom-marker',
    html: `<div class="${pulse ? 'marker-pulse' : ''}" style="width: 12px; height: 12px; background-color: ${color}; border-radius: 50%; box-shadow: 0 0 10px ${color}; border: 1px solid #fff;"></div>`,
    iconSize: [12, 12],
    iconAnchor: [6, 6],
    popupAnchor: [0, -6],
  });
}

function popupHtml(a: Alert): string {
  const status =
    a.severity === 'critical' ? 'Critical' : a.severity === 'high' ? 'Critical' : 'Filed';
  return `
    <div style="padding: 8px; min-width: 240px; font-family: Inter, sans-serif;">
      <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px;">
        <span style="font-family: 'JetBrains Mono', monospace; font-weight: 600; color: #4cd7f6;">${a.crimeNo}</span>
        <span style="padding: 2px 6px; background: rgba(49, 49, 192, 0.3); border: 1px solid rgba(49,49,192,1); border-radius: 4px; font-size: 10px; color: #c0c1ff; text-transform: uppercase; letter-spacing: 0.08em; font-weight: 600;">${status}</span>
      </div>
      <div style="margin-bottom: 16px; font-size: 13px;">
        <div style="display: flex; justify-content: space-between; margin-bottom: 4px;"><span style="color: #bcc9cd;">Location:</span> <span>${a.district}</span></div>
        <div style="display: flex; justify-content: space-between; margin-bottom: 4px;"><span style="color: #bcc9cd;">Category:</span> <span>${a.crimeType}</span></div>
      </div>
    </div>
  `;
}

interface Props {
  alerts?: Alert[];
  showLayerPanel?: boolean;
  heightClass?: string;
}

export default function MapView({
  alerts = SEED_MAP_ALERTS,
  showLayerPanel = true,
  heightClass,
}: Props) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<L.Map | null>(null);
  const layerRef = useRef<L.LayerGroup | null>(null);
  const [layers, setLayers] = useState({
    liveEvents: true,
    heatmap: true,
    districtBoundaries: false,
  });

  // Inject the dark theme CSS once
  useEffect(() => {
    const id = 'ksp-leaflet-dark-theme';
    if (document.getElementById(id)) return;
    const style = document.createElement('style');
    style.id = id;
    style.textContent = MAP_CUSTOM_CSS;
    document.head.appendChild(style);
  }, []);

  // Init map
  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;
    const map = L.map(containerRef.current, {
      zoomControl: false,
      attributionControl: false,
    }).setView(KARNATAKA_CENTER, INITIAL_ZOOM);

    L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
      maxZoom: 19,
    }).addTo(map);

    L.control.zoom({ position: 'bottomright' }).addTo(map);
    L.control
      .attribution({ position: 'bottomleft', prefix: false })
      .addAttribution('&copy; <a href="https://carto.com/">CARTO</a> · &copy; OpenStreetMap')
      .addTo(map);

    layerRef.current = L.layerGroup().addTo(map);
    mapRef.current = map;

    // Force Leaflet to recalculate size after the parent flex container settles.
    // Guard against the map being torn down before the timer fires.
    setTimeout(() => {
      if (mapRef.current === map) {
        try { map.invalidateSize(); } catch { /* map removed */ }
      }
    }, 200);

    return () => {
      map.remove();
      mapRef.current = null;
      layerRef.current = null;
    };
  }, []);

  // Re-render markers on alerts/layers change
  useEffect(() => {
    if (!mapRef.current || !layerRef.current) return;
    layerRef.current.clearLayers();
    if (!layers.liveEvents) return;

    alerts.forEach((a, idx) => {
      const color = COLOR_BY_SEVERITY[a.severity] || COLOR_BY_SEVERITY.low;
      const pulse = idx === 0;
      L.marker([a.latitude, a.longitude], { icon: buildIcon(color, pulse) })
        .addTo(layerRef.current!)
        .bindPopup(popupHtml(a), { closeButton: false, minWidth: 260 });
    });
  }, [alerts, layers.liveEvents]);

  return (
    <section
      className={`bg-surface-container/80 backdrop-blur-md border border-outline-variant rounded-lg flex flex-col relative overflow-hidden z-0 ${heightClass || 'h-full'}`}
    >
      <div className="p-4 border-b border-outline-variant/30 flex justify-between items-center bg-surface-container-low/50 z-10 relative">
        <h2 className="text-[18px] font-semibold text-on-surface">Live Telemetry Map</h2>
      </div>
      <div ref={containerRef} className="flex-1 w-full bg-[#0a0f1e] z-0" />

      {showLayerPanel && (
        <div className="absolute top-16 right-4 z-[400] flex flex-col gap-2">
          <div className="bg-surface-container/80 backdrop-blur-md border border-outline-variant rounded p-3 text-sm flex flex-col gap-2 min-w-[180px]">
            <h3 className="text-[11px] font-semibold uppercase tracking-widest text-on-surface-variant mb-1">
              Layer Compositor
            </h3>
            {[
              { key: 'liveEvents' as const, label: 'Live Events' },
              { key: 'heatmap' as const, label: 'Heatmap' },
              { key: 'districtBoundaries' as const, label: 'District Boundaries' },
            ].map((layer) => (
              <label
                key={layer.key}
                className="flex items-center gap-2 cursor-pointer group"
              >
                <input
                  type="checkbox"
                  checked={layers[layer.key]}
                  onChange={() =>
                    setLayers((p) => ({ ...p, [layer.key]: !p[layer.key] }))
                  }
                  className="rounded border-outline-variant bg-surface-container text-primary focus:ring-primary/50"
                />
                <span className="text-[13px] text-on-surface group-hover:text-primary transition-colors">
                  {layer.label}
                </span>
              </label>
            ))}
          </div>
        </div>
      )}
    </section>
  );
}
