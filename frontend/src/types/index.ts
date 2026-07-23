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
  id: number;
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

export interface KPIData {
  label: string;
  value: string | number;
  delta?: string;
  trend?: 'up' | 'down' | 'flat';
  icon?: 'fir' | 'active' | 'heinous' | 'clearance' | 'cyber' | 'fraud' | 'identity';
  severity?: Severity;
}
