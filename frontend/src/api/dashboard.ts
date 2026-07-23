import type { KPIData } from '../types';

// ============================================================
// Dashboard KPIs
// ============================================================
// TODO(U5): replace stub implementation with real axios call:
//   return axios.get('/api/v1/dashboard/kpis').then(r => r.data)
// Backend endpoint /api/v1/dashboard/kpis does not exist yet;
// build it when wiring this in U5.

const STUB_KPIS: KPIData[] = [
  {
    label: 'FIRs Today',
    value: 247,
    delta: '12%',
    trend: 'up',
    icon: 'fir',
  },
  {
    label: 'Active Cases',
    value: '1,842',
    delta: '3%',
    trend: 'down',
    icon: 'active',
  },
  {
    label: 'Heinous Crimes',
    value: 23,
    delta: '8 in last hour',
    trend: 'flat',
    icon: 'heinous',
    severity: 'critical',
  },
  {
    label: 'Clearance Rate',
    value: '67%',
    delta: '1,203 / 1,796',
    trend: 'flat',
    icon: 'clearance',
  },
];

export async function getKPIs(): Promise<KPIData[]> {
  // Stub: simulate tiny async delay so Suspense/memoization paths fire honestly
  await new Promise((r) => setTimeout(r, 50));
  return STUB_KPIS;
}
