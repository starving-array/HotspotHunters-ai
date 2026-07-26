import axios from 'axios';
import type { Alert, CyberAlert } from '../types';

export interface CyberKpi {
  itActCases: number;
  financialFraud: number;
  identityTheft: number;
}

export interface CyberDashboardData {
  kpis: CyberKpi;
  mapAlerts: Alert[];
  patterns: CyberAlert[];
}

export async function getCyberDashboard(): Promise<CyberDashboardData> {
  const [alertsRes, patternsRes] = await Promise.all([
    axios.get('/api/v1/cyber/map'),
    axios.get('/api/v1/cyber/patterns'),
  ]);

  const mapAlerts: Alert[] = (alertsRes.data as Array<{
    id: string; caseMasterId: number; crimeNo: string; crimeType: string;
    district: string; latitude: number; longitude: number;
    severity: string; timestamp: string;
  }>).map((a) => ({
    ...a,
    severity: a.severity as Alert['severity'],
  }));

  const patterns: CyberAlert[] = (patternsRes.data as Array<{
    alertId: number; patternType: string; entityType?: string;
    entityValue?: string; caseCount: number; threatLevel: string;
  }>).map((p) => ({
    ...p,
    threatLevel: p.threatLevel as CyberAlert['threatLevel'],
  }));

  const kpisRes = await axios.get('/api/v1/cyber/dashboard');
  const { kpis } = kpisRes.data as { kpis: CyberKpi };

  return { kpis, mapAlerts, patterns };
}

export async function lookupOsintIndicator(value: string, type: string = 'ip'): Promise<import('../types').OsintResult> {
  const res = await axios.get('/api/v1/osint/lookup', { params: { value, type } });
  return res.data;
}

export async function enrichText(text: string): Promise<Record<string, import('../types').OsintResult[]>> {
  const res = await axios.post('/api/v1/osint/enrich', { text });
  return res.data;
}

export const PATTERN_LABELS: Record<string, string> = {
  ip_cluster: 'IP Cluster',
  domain_cluster: 'Domain Cluster',
  phone_cluster: 'Phone Cluster',
  wallet_cluster: 'Wallet Cluster',
  platform_spike: 'Platform Spike',
  financial_fraud_ring: 'Financial Fraud Ring',
};
