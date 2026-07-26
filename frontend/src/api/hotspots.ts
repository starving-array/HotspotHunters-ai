import axios from 'axios';
import type { HotspotDistrict, Severity } from '../types';

const DISTRICT_NAME_MAP: Record<string, string> = {
  BDR: 'Bidar',
  BGP: 'Bagalkot',
  BJP: 'Bijapur',
  BLG: 'Belgaum',
  BLR_RUR: 'Bangalore Rural',
  BLR_URB: 'Bangalore Urban',
  CHK: 'Chikkaballapur',
  CHM: 'Chamarajanagar',
  CHT: 'Chitradurga',
  DKN: 'Dakshina Kannada',
  DLP: 'Dharwad',
  DVG: 'Davangere',
  GDK: 'Gadag',
  HBL: 'Hassan',
  HVN: 'Haveri',
  HVR: 'Haveri',
  KJP: 'Koppal',
  KLR: 'Kalaburagi',
  KMR: 'Kodagu',
  KNR: 'Kannur',
  MND: 'Mandya',
  MYS: 'Mysuru',
  RBR: 'Raichur',
  RMR: 'Ramanagara',
  SHM: 'Shivamogga',
  TUM: 'Tumakuru',
  UCT: 'Udupi',
  UDU: 'Udupi',
  VJP: 'Vijayapura',
  YDG: 'Yadgir',
};

export function getDistrictName(code: string): string {
  return DISTRICT_NAME_MAP[code] ?? code;
}

export async function getHotspots(): Promise<HotspotDistrict[]> {
  const res = await axios.get('/api/v1/hotspots/live', { params: { limit: 10 } });
  const data = res.data as Array<{ district: string; score: number }>;
  const codes = data.map((item) => item.district).join(',');
  let trends: Record<string, number> = {};
  try {
    const tres = await axios.get('/api/v1/hotspots/trends', { params: { districts: codes } });
    trends = tres.data as Record<string, number>;
  } catch { /* trends unavailable, use 0 */ }
  return data.map((item, i) => ({
    rank: i + 1,
    name: getDistrictName(item.district),
    code: item.district,
    cases: Math.round(item.score),
    trendPct: trends[item.district] ?? 0,
  }));
}

export interface CrimeTypeBreakdownItem {
  type: string;
  count: number;
  pct: number;
}

export interface MonthlyTrendPoint {
  month: string;
  cases: number;
}

export interface PoliceStationSummary {
  name: string;
  cases: number;
}

export interface RecentAlert {
  crimeNo: string;
  crimeType: string;
  date: string;
  severity: Severity;
}

export interface DistrictDetail {
  name: string;
  totalCases: number;
  trendPct: number;
  crimeTypeBreakdown: CrimeTypeBreakdownItem[];
  monthlyTrend: MonthlyTrendPoint[];
  topPoliceStations: PoliceStationSummary[];
  recentAlerts: RecentAlert[];
}

const detailCache = new Map<string, DistrictDetail>();

export async function getHotspotDistrictDetail(districtName: string): Promise<DistrictDetail | null> {
  const cached = detailCache.get(districtName);
  if (cached) return cached;

  try {
    const res = await axios.get('/api/v1/hotspots/detail', { params: { district: districtName } });
    const data = res.data as DistrictDetail;
    detailCache.set(districtName, data);
    return data;
  } catch {
    return null;
  }
}
