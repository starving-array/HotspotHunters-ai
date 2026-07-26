// ============================================================
// KSP Intelligence Portal — Domain enums
// Single source of truth for fixed vocabulary values.
// Use these instead of inline string literals throughout the app.
// ============================================================

// Severity — used by alerts, cyber indicators, anomaly events, KPIs
export enum Severity {
  Low = 'low',
  Medium = 'medium',
  High = 'high',
  Critical = 'critical',
}

// Risk level — used by network graph nodes, offender scores
export enum RiskLevel {
  Low = 'low',
  Medium = 'medium',
  High = 'high',
}

// Locale — i18n toggle
export enum Locale {
  English = 'en',
  Kannada = 'kn',
}

// Toast type — UI-only classification
export enum ToastType {
  Info = 'info',
  Success = 'success',
  Warning = 'warning',
  Error = 'error',
}

// Audit action — strict coloring for Audit Trail page
export enum AuditAction {
  Query = 'QUERY',
  Login = 'LOGIN',
  Export = 'EXPORT',
  View = 'VIEW',
  Alert = 'ALERT',
}

// Cybercrime indicator type — mirrors the
// CHECK constraint in infra/postgres/migrations/006_cybercrime_model.sql
export enum IndicatorType {
  Ip = 'ip',
  Domain = 'domain',
  Wallet = 'wallet',
  Phone = 'phone',
  BankAccount = 'bank_account',
  SocialHandle = 'social_handle',
  Email = 'email',
  UpiId = 'upi_id',
  DeviceId = 'device_id',
}

// Cybercrime pattern type — mirrors cyber_trend_alerts.pattern_type CHECK
export enum CyberPatternType {
  IpCluster = 'ip_cluster',
  DomainCluster = 'domain_cluster',
  PhoneCluster = 'phone_cluster',
  WalletCluster = 'wallet_cluster',
  PlatformSpike = 'platform_spike',
  FinancialFraudRing = 'financial_fraud_ring',
}

// Indian states — fixed vocabulary. KSP operates inside Karnataka but cross-
// border cases may reference other states.
export enum IndianState {
  Karnataka = 'karnataka',
  AndhraPradesh = 'andhra_pradesh',
  Telangana = 'telangana',
  TamilNadu = 'tamil_nadu',
  Kerala = 'kerala',
  Maharashtra = 'maharashtra',
  Goa = 'goa',
}

// Karnataka districts — fixed vocabulary per PG `district.districtname`
// (verified against DB: 30 distinct rows; Haveri + Udupi are duplicated in
// seed data and should be de-duped in a future data cleanup).
//
// NOTE: DB uses British spellings ("Bangalore Urban") and these enum values
// match the district table's `districtname` column exactly so this enum
// doubles as a backend-interop dictionary.
//
// NOTE: `Kannur` was a Kerala district that appeared in the Karnataka
// district table — handled in migration 009 (marked inactive).
export enum KarnatakaDistrict {
  Bagalkot = 'Bagalkot',
  BangaloreRural = 'Bangalore Rural',
  BangaloreUrban = 'Bangalore Urban',
  Belgaum = 'Belgaum',
  Bidar = 'Bidar',
  Bijapur = 'Bijapur',
  Chamarajanagar = 'Chamarajanagar',
  Chikkaballapur = 'Chikkaballapur',
  Chitradurga = 'Chitradurga',
  DakshinaKannada = 'Dakshina Kannada',
  Davangere = 'Davangere',
  Dharwad = 'Dharwad',
  Gadag = 'Gadag',
  Hassan = 'Hassan',
  Haveri = 'Haveri',
  Kalaburagi = 'Kalaburagi',
  Kodagu = 'Kodagu',
  Koppal = 'Koppal',
  Mandya = 'Mandya',
  Mysuru = 'Mysuru',
  Raichur = 'Raichur',
  Ramanagara = 'Ramanagara',
  Shivamogga = 'Shivamogga',
  Tumakuru = 'Tumakuru',
  Udupi = 'Udupi',
  Vijayapura = 'Vijayapura',
  Yadgir = 'Yadgir',
}

// Crime category — mirrors the 8 crimehead rows seeded in PG
export enum CrimeCategory {
  CrimesAgainstBody = 'Crimes Against Body',
  CrimesAgainstProperty = 'Crimes Against Property',
  CrimesAgainstWomen = 'Crimes Against Women',
  CrimesAgainstChildren = 'Crimes Against Children',
  CyberCrimes = 'Cyber Crimes',
  EconomicOffences = 'Economic Offences',
  DrugRelatedOffences = 'Drug Related Offences',
  OtherCrimes = 'Other Crimes',
}

// Case status — mirrors casestatusmaster rows
export enum CaseStatus {
  UnderInvestigation = 'Under Investigation',
  Chargesheeted = 'Chargesheeted',
  Closed = 'Closed',
  Pending = 'Pending',
}

// Nav keys — used by CommandPalette + Sidebar + Topbar (avoids string drift)
export enum NavKey {
  Overview = 'overview',
  LiveMap = 'liveMap',
  Hotspots = 'hotspots',
  NetworkGraph = 'networkGraph',
  Anomalies = 'anomalies',
  Cybercrime = 'cybercrime',
  Trends = 'trends',
  FirSearch = 'firSearch',
  AuditTrail = 'auditTrail',
  Settings = 'settings',
}
