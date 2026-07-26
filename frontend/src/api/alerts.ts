import type { Alert } from '../types';
import axios from 'axios';

// ============================================================
// Alerts — paginated history + live stream subscription
// ============================================================

export interface PageResponse {
  data: Alert[];
  page: number;
  size: number;
  total: number;
}

export async function getAlertsPaginated(
  page: number,
  size: number,
  _crimeType?: string,
): Promise<PageResponse> {
  const res = await axios.get('/api/v1/alerts', { params: { page, size } });
  const body = res.data;

  // support both paginated wrapper { data, page, size, total } and flat array
  if (Array.isArray(body)) {
    const total = body.length;
    const from = page * size;
    const sliced = body.slice(from, from + size).map(a => ({
      ...a,
      severity: a.severity as Alert['severity'],
    }));
    return { data: sliced, page, size, total };
  }

  return {
    ...body,
    data: (body.data as Alert[]).map(a => ({ ...a, severity: a.severity as Alert['severity'] })),
  };
}

// Live SSE subscription — returns an unsubscribe function.
export function subscribeAlerts(
  onAlert: (alert: Alert) => void,
  onError?: (err: Event) => void,
): () => void {
  const source = new EventSource('/api/v1/alerts/stream');
  source.addEventListener('alert', (ev: MessageEvent) => {
    try {
      const data = JSON.parse(ev.data) as Record<string, unknown>;
      if (!data || !data.fir_id) return;
      const zScore = data.zScore != null ? Number(data.zScore) : undefined;
      const expected = data.expected != null ? Number(data.expected) : undefined;
      const actual = data.actual != null ? Number(data.actual) : undefined;
      onAlert({
        id: String(data.fir_id),
        caseMasterId: 0,
        crimeNo: String(data.fir_id),
        crimeType: String(data.crimeType || data.crime_type || 'FIR'),
        district: String(data.district || ''),
        latitude: 0,
        longitude: 0,
        severity: (String(data.severity || 'low').toLowerCase()) as Alert['severity'],
        timestamp: String(data.incident_ts || new Date().toISOString()),
        zScore,
        expected,
        actual,
      });
    } catch {
      // ignore malformed payload
    }
  });
  source.onerror = (err) => {
    if (onError) onError(err);
  };
  return () => source.close();
}
