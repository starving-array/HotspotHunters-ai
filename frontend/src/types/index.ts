// ============================================================
// KSP Intelligence Portal — Shared TypeScript interfaces
// Single source of truth for all page/component prop types.
// ============================================================

export type Severity = 'low' | 'medium' | 'high' | 'critical';
export type RiskLevel = 'low' | 'medium' | 'high';
export type Locale = 'en' | 'kn';
export type ToastType = 'info' | 'success' | 'warning' | 'error';
export type AuditAction = 'QUERY' | 'LOGIN' | 'EXPORT' | 'VIEW' | 'ALERT';
export type IndicatorType =
  | 'ip'
  | 'domain'
  | 'wallet'
  | 'phone'
  | 'bank_account'
  | 'social_handle'
  | 'email'
  | 'upi_id'
  | 'device_id';

// ============================================================
// Domain types
// ============================================================

export interface Case {
  caseMasterId: number;
  crimeNo: string;
  caseNo?: string;
  crimeRegisteredDate: string;
  policeStationId?: number;
  policePersonId?: number;
  crimeMajorHeadId?: number;
  crimeMinorHeadId?: number;
  caseStatusId?: number;
  courtId?: number;
  incidentFromDate?: string;
  incidentToDate?: string;
  latitude?: number;
  longitude?: number;
  briefFacts?: string;
  isCybercrime?: boolean;
  primaryPlatform?: string;
  financialLoss?: number;
  cyberSeverity?: Severity;
}

export interface Alert {
  id: string;
  caseMasterId: number;
  crimeNo: string;
  crimeType: string;
  district: string;
  latitude: number;
  longitude: number;
  severity: Severity;
  timestamp: string;
  zScore?: number;
  expected?: number;
  actual?: number;
}

export interface District {
  districtId: number;
  districtName: string;
  districtCode: string;
  stateId: number;
  active: boolean;
}

export interface Officer {
  employeeId: number;
  firstName: string;
  rankId?: number;
  unitId?: number;
  casesCount?: number;
  arrestsCount?: number;
  clearanceRate?: number;
}

export interface CyberIndicator {
  indicatorId: number;
  casemasterId: number;
  indicatorType: IndicatorType;
  indicatorValue: string;
  platform?: string;
  firstSeen: string;
  lastSeen: string;
  isActive: boolean;
}

export interface CyberAlert {
  alertId: number;
  patternType: string;
  entityType?: string;
  entityValue?: string;
  caseCount: number;
  threatLevel: Severity;
}

export interface AuditEvent {
  id: string;
  userId: string;
  action: AuditAction;
  resource: string;
  ip: string;
  timestamp: string;
}

export interface TrendPoint {
  date: string;
  actual?: number;
  forecast?: number;
  ciUpper?: number;
  ciLower?: number;
}

export interface AnomalyEvent {
  id: number;
  district: string;
  zScore: number;
  expected: number;
  actual: number;
  crimeType: string;
  timestamp: string;
}

export interface NetworkNode {
  id: number;
  label: string;
  riskScore: number;
  riskLevel: RiskLevel;
  type: 'person' | 'case' | 'ip' | 'district';
}

export interface NetworkLink {
  source: number | NetworkNode;
  target: number | NetworkNode;
  type: string;
}

export interface ShapFeature {
  feature: string;
  weight: number;
  value?: number;
}

export interface Toast {
  id: string;
  type: ToastType;
  title: string;
  message: string;
}

// ============================================================
// Nav + i18n
// ============================================================

export interface NavItem {
  key: string;
  labelEn: string;
  labelKn: string;
  icon: string;
  path: string;
  badge?: number;
}

export interface SystemService {
  name: string;
  sub: string;
  metric: string;
  status: 'healthy' | 'degraded' | 'down';
}

export interface OsintResult {
  indicatorType: string;
  indicatorValue: string;
  malicious: boolean;
  confidence: string;
  reports: number;
  categories: string[];
  tags: string[];
  reputation: number;
  source: string;
  country?: string;
  asn?: string;
  enrichedAt: string;
  error?: string;
}

export interface KPIData {
  label: string;
  value: string | number;
  delta?: string;
  trend?: 'up' | 'down' | 'flat';
  icon?: 'fir' | 'active' | 'heinous' | 'clearance' | 'cyber' | 'fraud' | 'identity';
  severity?: Severity;
}

export interface HotspotDistrict {
  rank: number;
  name: string;
  code: string;
  cases: number;
  trendPct: number;
}

export interface SystemHealthSummary {
  services: SystemService[];
  cpuPct: number;
  ramGb: number;
}

// ============================================================
// Case Detail / Investigation Panel
// ============================================================

export interface CaseIndicator {
  indicator_id: number;
  indicator_type: string;
  indicator_value: string;
  platform?: string;
  first_seen: string;
  last_seen: string;
  is_active: boolean;
}

export interface RelatedCase {
  case_master_id: number;
  crime_no: string;
  district_name: string;
  status: string;
  crime_major_head: string;
}

export interface TimelineEvent {
  date: string;
  action: string;
  actor: string;
  description: string;
}

export interface CaseDetail {
  case_master_id: number;
  crime_no: string;
  case_no: string;
  crime_registered_date: string;
  case_category: string;
  gravity_offence: string;
  crime_major_head: string;
  crime_minor_head: string;
  case_status_name: string;
  court_name: string;
  district_name: string;
  police_station_name: string;
  police_person_name: string;
  incident_from_date: string;
  incident_to_date: string;
  info_received_psdate: string;
  latitude: number;
  longitude: number;
  brief_facts: string;
  complainant_name: string;
  suspect_name: string;
  victim_name: string;
  is_cybercrime: boolean;
  primary_platform: string;
  financial_loss: number;
  cyber_severity: Severity;
  indicators: CaseIndicator[];
  chargesheet_date: string;
  chargesheet_type: string;
  timeline: TimelineEvent[];
  related_cases: RelatedCase[];
  last_updated: string;
}
