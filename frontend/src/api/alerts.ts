import type { Alert } from '../types';

// ============================================================
// Alerts — initial feed + live stream subscription
// ============================================================
// The live stream IS already wired (Layout.tsx subscribes to SSE
// /api/v1/alerts/stream and emits a toast per event in U1). This module
// just provides the typed accessor used by Overview's LiveFIRFeed + MapView.
//
// TODO(U3/U5): elevate the SSE state to a context (AlertContext) so the
// Layout-level subscription and the Overview feed share ONE EventSource.

// TODO(known-issue S3): SSE endpoint /api/v1/alerts/stream is permitAll in
// SecurityConfig.java:62 — re-secure with JWT-in-query-param validation.
// 
export const SEED_ALERTS: Alert[] = [
  {
    id: 'seed-1',
    caseMasterId: 251,
    crimeNo: '1 0443 0006 2026 00251',
    crimeType: 'Crimes vs Women',
    district: 'Bengaluru Urban',
    latitude: 12.9716,
    longitude: 77.5946,
    severity: 'critical',
    timestamp: new Date(Date.now() - 2 * 60 * 1000).toISOString(),
  },
  {
    id: 'seed-2',
    caseMasterId: 249,
    crimeNo: '1 0443 0006 2026 00249',
    crimeType: 'Property',
    district: 'Mysuru',
    latitude: 12.2958,
    longitude: 76.6394,
    severity: 'medium',
    timestamp: new Date(Date.now() - 15 * 60 * 1000).toISOString(),
  },
  {
    id: 'seed-3',
    caseMasterId: 892,
    crimeNo: '2 0112 0045 2026 00892',
    crimeType: 'Traffic',
    district: 'Bengaluru Rural',
    latitude: 12.9141,
    longitude: 77.5603,
    severity: 'low',
    timestamp: new Date(Date.now() - 42 * 60 * 1000).toISOString(),
  },
];

// Initial fetch (stub returns SEED_ALERTS).
// TODO(U5): axios.get('/api/v1/alerts?since=24h') returning the last 100 events.
export async function getInitialAlerts(): Promise<Alert[]> {
  await new Promise((r) => setTimeout(r, 30));
  return SEED_ALERTS;
}

// Live SSE subscription — returns an unsubscribe function.
// Already production-ready (not a stub): uses the same SSE endpoint
// the Layout toasts use.
export function subscribeAlerts(
  onAlert: (alert: Alert) => void,
  onError?: (err: Event) => void,
): () => void {
  const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:8080';
  const source = new EventSource(`${apiUrl}/api/v1/alerts/stream`);
  source.onmessage = (ev) => {
    try {
      const data = JSON.parse(ev.data) as Partial<Alert>;
      if (data && (data.caseMasterId || data.crimeNo)) {
        onAlert({
          id: String(data.caseMasterId || data.crimeNo),
          caseMasterId: data.caseMasterId || 0,
          crimeNo: data.crimeNo || '',
          crimeType: data.crimeType || 'FIR',
          district: data.district || '',
          latitude: data.latitude || 0,
          longitude: data.longitude || 0,
          severity: data.severity || 'low',
          timestamp: data.timestamp || new Date().toISOString(),
        });
      }
    } catch {
      // ignore malformed payload
    }
  };
  source.onerror = (err) => {
    if (onError) onError(err);
  };
  return () => source.close();
}
