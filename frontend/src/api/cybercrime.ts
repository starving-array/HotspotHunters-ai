import type { Alert, CyberAlert } from '../types';
import { CyberPatternType } from '../types/enums';

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

const STUB_MAP_ALERTS: Alert[] = [
  { id: 'c1', caseMasterId: 501, crimeNo: '1 0443 0006 2026 00501', crimeType: 'Cyber Crime', district: 'Bengaluru Urban', latitude: 12.9716, longitude: 77.5946, severity: 'critical', timestamp: new Date(Date.now() - 4 * 3600 * 1000).toISOString() },
  { id: 'c2', caseMasterId: 502, crimeNo: '1 0443 0006 2026 00502', crimeType: 'Cyber Crime', district: 'Bengaluru Urban', latitude: 12.9352, longitude: 77.6245, severity: 'high', timestamp: new Date(Date.now() - 7 * 3600 * 1000).toISOString() },
  { id: 'c3', caseMasterId: 503, crimeNo: '1 0443 0006 2026 00503', crimeType: 'Cyber Crime', district: 'Mysuru', latitude: 12.2958, longitude: 76.6394, severity: 'medium', timestamp: new Date(Date.now() - 14 * 3600 * 1000).toISOString() },
  { id: 'c4', caseMasterId: 504, crimeNo: '1 0443 0006 2026 00504', crimeType: 'Cyber Crime', district: 'Mangaluru', latitude: 12.9141, longitude: 74.856, severity: 'high', timestamp: new Date(Date.now() - 22 * 3600 * 1000).toISOString() },
  { id: 'c5', caseMasterId: 505, crimeNo: '1 0443 0006 2026 00505', crimeType: 'Cyber Crime', district: 'Kalaburagi', latitude: 17.3297, longitude: 76.8343, severity: 'low', timestamp: new Date(Date.now() - 30 * 3600 * 1000).toISOString() },
  { id: 'c6', caseMasterId: 506, crimeNo: '1 0443 0006 2026 00506', crimeType: 'Cyber Crime', district: 'Hubballi', latitude: 15.3647, longitude: 75.124, severity: 'medium', timestamp: new Date(Date.now() - 38 * 3600 * 1000).toISOString() },
];

const STUB_PATTERNS: CyberAlert[] = [
  { alertId: 1, patternType: CyberPatternType.PlatformSpike, entityType: 'platform', entityValue: 'WhatsApp', caseCount: 47, threatLevel: 'critical' },
  { alertId: 2, patternType: CyberPatternType.FinancialFraudRing, entityType: 'wallet', entityValue: 'UPI:9886xxxxxx@okaxis', caseCount: 31, threatLevel: 'high' },
  { alertId: 3, patternType: CyberPatternType.IpCluster, entityType: 'ip', entityValue: '103.245.86.0/24', caseCount: 24, threatLevel: 'high' },
  { alertId: 4, patternType: CyberPatternType.DomainCluster, entityType: 'domain', entityValue: 'sbibank-verify*.in', caseCount: 19, threatLevel: 'medium' },
  { alertId: 5, patternType: CyberPatternType.PhoneCluster, entityType: 'phone', entityValue: '+91 79xxxxxx12', caseCount: 18, threatLevel: 'medium' },
  { alertId: 6, patternType: CyberPatternType.WalletCluster, entityType: 'wallet', entityValue: 'BTC:bc1qxy2kgdygjrsqtzq2n0yrf2493', caseCount: 12, threatLevel: 'high' },
];

const STUB_DATA: CyberDashboardData = {
  kpis: {
    itActCases: 1247,
    financialFraud: 384,
    identityTheft: 219,
  },
  mapAlerts: STUB_MAP_ALERTS,
  patterns: STUB_PATTERNS,
};

export async function getCyberDashboard(): Promise<CyberDashboardData> {
  await new Promise((r) => setTimeout(r, 60));
  return STUB_DATA;
}

export const PATTERN_LABELS: Record<string, string> = {
  [CyberPatternType.PlatformSpike]: 'Platform Spike',
  [CyberPatternType.FinancialFraudRing]: 'Financial Fraud Ring',
  [CyberPatternType.IpCluster]: 'IP Cluster',
  [CyberPatternType.DomainCluster]: 'Domain Cluster',
  [CyberPatternType.PhoneCluster]: 'Phone Cluster',
  [CyberPatternType.WalletCluster]: 'Wallet Cluster',
};
