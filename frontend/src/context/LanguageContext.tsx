import React, { createContext, useContext, useMemo, useState, type ReactNode } from 'react';

// ============================================================
// i18n — KSP Intelligence Portal
// Full Kannada translation pass (Phase U5). Covers nav, page
// titles, KPI labels, buttons, table headers, toasts, and
// common UI strings. EN = complete, KN = complete.
// ============================================================
// NOTE: Numeric formats, IDs, and crime codes (e.g. "1 0443
// 0006 2026 00421") are NOT translated — only display strings.

export const translations = {
  en: {
    // Nav
    overview: 'Overview',
    liveMap: 'Live Map',
    hotspots: 'Hotspots',
    networkGraph: 'Network Graph',
    anomalies: 'Anomalies',
    cybercrime: 'Cybercrime',
    trends: 'Trends',
    firSearch: 'FIR Search',
    ioDashboard: 'IO Dashboard',
    auditTrail: 'Audit Trail',
    settings: 'Settings',

    // Topbar
    searchPlaceholder: 'Search FIR, Hotspots, Subjects…',
    languageToggle: 'EN | ಕನ್ನಡ',
    kspAnalytics: 'KSP ANALYTICS',
    commandPaletteHint: '⌘K',

    // Sidebar footer
    liveConnection: 'Live Connection',
    systemHealth: 'System Health',

    // Page titles + subtitles
    overviewTitle: 'Overview',
    overviewSubtitle: 'Real-time intelligence and monitoring',
    liveMapTitle: 'Live Intelligence Map',
    liveMapSubtitle: 'Karnataka-wide incident telemetry',
    networkGraphTitle: 'Network Intelligence Graph',
    networkGraphSubtitle: 'Force-directed graph of persons, FIRs, IPs, and districts — click a node for SHAP attribution',
    anomaliesTitle: 'Anomalies Detection',
    anomaliesSubtitle: 'Z-score based anomaly detection across crime categories and districts',
    cybercrimeTitle: 'Cybercrime Intelligence',
    cybercrimeSubtitle: 'IT Act cases, financial fraud clusters, and platform-spike monitoring',
    trendsTitle: 'Trends & Forecasts',
    trendsSubtitle: '60-day forecast with 95% confidence band — District/Month intensity and movers',
    firSearchTitle: 'FIR Intelligence Search',
    firSearchSubtitle: 'Natural language search across all registered FIRs',
    ioDashboardTitle: 'Investigating Officer Dashboard',
    ioDashboardSubtitle: 'Officer performance leaderboard — clearance rate flagged',
    auditTrailTitle: 'Audit Trail',
    auditTrailSubtitle: 'Immutable log of all user actions across the portal',
    settingsTitle: 'Settings',
    settingsSubtitle: 'Profile, display preferences, and session controls',

    // Overview KPI labels
    firsToday: 'FIRs Today',
    activeCases: 'Active Cases',
    heinousCrimes: 'Heinous Crimes',
    clearanceRate: 'Clearance Rate',
    acrossDistricts: 'Across 31 districts',
    inLastHour: 'in last hour',
    chargesheeted: 'chargesheeted',

    // Sections
    liveFeed: 'Live Feed',
    unread: 'unread',
    hotspotDistricts: 'Hotspot Districts',
    liveTelemetryMap: 'Live Telemetry Map',
    layerCompositor: 'Layer Compositor',
    liveEvents: 'Live Events',
    heatmap: 'Heatmap',
    districtBoundaries: 'District Boundaries',
    waitingForTelemetry: 'Waiting for live telemetry…',

    // Network graph
    nodeInspection: 'Node Inspection',
    riskScore: 'Risk Score',
    entityType: 'Entity Type',
    shapAttribution: 'SHAP Feature Attribution',
    highRisk: 'High Risk',
    mediumRisk: 'Medium Risk',
    lowRisk: 'Low Risk',

    // Anomalies
    zScoreTimeline: 'Z-Score Timeline (30-day rolling)',
    detectionConfig: 'Detection Config',
    zScoreThreshold: 'Z-Score Threshold',
    sensitivity: 'sensitive',
    strict: 'strict',
    lookbackDays: 'Baseline Window',
    minCrimeCount: 'Min Crime Count',
    applyConfig: 'Apply Config',
    alertsCount: 'Alerts',
    noAnomalies: 'No anomalies above threshold',

    // FIR search
    searchPlaceholderFir: 'Search by crime number, district, crime type, or keywords…',
    search: 'Search',
    searching: 'Searching…',
    enterQuery: 'Enter a search query to find FIRs',
    transparencyParsed: 'Transparency — parsed query entities',
    noEntities: 'No structured entities detected — full-text search only',
    firDetail: 'FIR Detail',
    caseSummary: 'Case Summary',
    complainant: 'Complainant',
    accused: 'Accused',
    status: 'Status',

    // IO Dashboard
    activeIOs: 'Active IOs',
    avgCasesPerIO: 'Avg Cases / IO',
    topArrestRate: 'Top Arrest Rate',
    officerLeaderboard: 'Officer Leaderboard',
    rank: 'Rank',
    officer: 'Officer',
    rankTitle: 'Rank Title',
    unit: 'Unit',
    cases: 'Cases',
    arrests: 'Arrests',
    clearance: 'Clearance',

    // Cybercrime
    itActCases: 'IT Act Cases',
    financialFraud: 'Financial Fraud',
    identityTheft: 'Identity Theft',
    patternClustering: 'Pattern Clustering',
    pattern: 'Pattern',
    type: 'Type',
    entity: 'Entity',
    threat: 'Threat',
    active: 'active',

    // Trends
    forecastChart: '60-Day Forecast (Karnataka aggregate)',
    today: 'Today',
    districtMonthDensity: 'District × Month Incident Density',
    districtLabel: 'District',
    monthLabel: 'Month',
    moversUp: 'Movers Up',
    moversDown: 'Movers Down',
    delta: 'Δ%',

    // Audit trail
    filters: 'Filters',
    all: 'All',
    query: 'Query',
    login: 'Login',
    export: 'Export',
    view: 'View',
    alert: 'Alert',
    from: 'From',
    to: 'To',
    apply: 'Apply',
    events: 'events',
    timestamp: 'Timestamp',
    action: 'Action',
    user: 'User',
    ipAddress: 'IP',
    resource: 'Resource',
    noEventsMatch: 'No events match the current filters',

    // Settings
    profile: 'Profile',
    role: 'Role',
    clearanceLevel: 'Clearance',
    displayPreferences: 'Display Preferences',
    language: 'Language',
    languageHint: 'Toggle between English and Kannada',
    darkTheme: 'Dark theme',
    criticalIncidentToasts: 'Critical incident toasts',
    liveSseFeed: 'Live SSE feed',
    session: 'Session',
    jwtAuth: 'JWT Auth',
    ssePermitAll: 'SSE Permit-all',
    autoRefresh: 'Auto-refresh',
    dangerZone: 'Danger Zone',
    logoutMessage: 'Signing out clears your JWT from local storage and disconnects the live alert stream.',
    sessionActive: 'active',
    sessionOpen: 'open (per U2 plan)',
    sessionMinutes: '5 min',
    themeOn: 'On (SOC)',
    toastOn: 'On',
    autoAuto: 'Auto',

    // Common UI
    comingSoon: 'Coming soon',
    exportReport: 'Export Report',
    deployUnit: 'Deploy Unit',
    retry: 'Retry',
    close: 'Close',

    // System health
    telemetryStatus: 'Telemetry Status',
    nominal: 'NOMINAL',
    healthy: 'Healthy',
    degraded: 'Degraded',
    down: 'Down',

    // Auth
    signIn: 'Sign In',
    username: 'Username',
    signingIn: 'Establishing secure session…',
    logout: 'Sign Out',
  },
  kn: {
    // Nav
    overview: 'ಅವಲೋಕನ',
    liveMap: 'ಲೈವ್ ನಕ್ಷೆ',
    hotspots: 'ಹಾಟ್‌ಸ್ಪಾಟ್‌ಗಳು',
    networkGraph: 'ನೆಟ್‌ವರ್ಕ್ ಗ್ರಾಫ್',
    anomalies: 'ವೈಪರೀತ್ಯಗಳು',
    cybercrime: 'ಸೈಬರ್ ಅಪರಾಧ',
    trends: 'ಪ್ರವೃತ್ತಿಗಳು',
    firSearch: 'ಎಫ್‌ಐಆರ್ ಹುಡುಕಿ',
    ioDashboard: 'ಐಒ ಡ್ಯಾಶ್‌ಬೋರ್ಡ್',
    auditTrail: 'ಆಡಿಟ್ ಟ್ರಯಲ್',
    settings: 'ಸೆಟ್ಟಿಂಗ್‌ಗಳು',

    // Topbar
    searchPlaceholder: 'ಎಫ್‌ಐಆರ್, ಹಾಟ್‌ಸ್ಪಾಟ್‌ಗಳು, ವಿಷಯಗಳನ್ನು ಹುಡುಕಿ…',
    languageToggle: 'EN | ಕನ್ನಡ',
    kspAnalytics: 'KSP ಅನಾಲಿಟಿಕ್ಸ್',
    commandPaletteHint: '⌘K',

    // Sidebar footer
    liveConnection: 'ಲೈವ್ ಸಂಪರ್ಕ',
    systemHealth: 'ಸಿಸ್ಟಮ್ ಆರೋಗ್ಯ',

    // Page titles + subtitles
    overviewTitle: 'ಅವಲೋಕನ',
    overviewSubtitle: 'ನೈಜ-ಸಮಯ ಬುದ್ಧಿಮತ್ತೆ ಮತ್ತು ಮೇಲ್ವಿಚಾರಣೆ',
    liveMapTitle: 'ಲೈವ್ ಬುದ್ಧಿಮತ್ತೆ ನಕ್ಷೆ',
    liveMapSubtitle: 'ಕರ್ನಾಟಕಾದ್ಯಂತ ಘಟನೆ ಟೆಲಿಮೆಟ್ರಿ',
    networkGraphTitle: 'ನೆಟ್‌ವರ್ಕ್ ಬುದ್ಧಿಮತ್ತೆ ಗ್ರಾಫ್',
    networkGraphSubtitle: 'ವ್ಯಕ್ತಿಗಳು, ಎಫ್‌ಐಆರ್‌ಗಳು, ಐಪಿ ಮತ್ತು ಜಿಲ್ಲೆಗಳ ಫೋರ್ಸ್-ಡೈರೆಕ್ಟೆಡ್ ಗ್ರಾಫ್ — SHAP ಗಾಗಿ ನೋಡ್ ಕ್ಲಿಕ್ ಮಾಡಿ',
    anomaliesTitle: 'ವೈಪರೀತ್ಯ ಪತ್ತೆ',
    anomaliesSubtitle: 'ಅಪರಾಧ ವರ್ಗಗಳು ಮತ್ತು ಜಿಲ್ಲೆಗಳಾದ್ಯಂತ Z-ಸ್ಕೋರ್ ಆಧಾರಿತ ವೈಪರೀತ್ಯ ಪತ್ತೆ',
    cybercrimeTitle: 'ಸೈಬರ್ ಅಪರಾಧ ಬುದ್ಧಿಮತ್ತೆ',
    cybercrimeSubtitle: 'ಐಟಿ ಕಾಯ್ದೆ ಪ್ರಕರಣಗಳು, ಹಣಕಾಸಿನ ವಂಚನೆ ಕ್ಲಸ್ಟರ್‌ಗಳು, ಮತ್ತು ಪ್ಲಾಟ್‌ಫಾರ್ಮ್-ಸ್ಪೈಕ್ ಮೇಲ್ವಿಚಾರಣೆ',
    trendsTitle: 'ಪ್ರವೃತ್ತಿಗಳು ಮತ್ತು ಮುನ್ಸೂಚಕಗಳು',
    trendsSubtitle: '60-ದಿನ ಮುನ್ಸೂಚನೆ 95% ವಿಶ್ವಾಸ ಬ್ಯಾಂಡ್‌ನೊಂದಿಗೆ — ಜಿಲ್ಲೆ/ತಿಂಗಳು ತೀವ್ರತೆ ಮತ್ತು ಮೂವರ್ಸ್',
    firSearchTitle: 'ಎಫ್‌ಐಆರ್ ಬುದ್ಧಿಮತ್ತೆ ಹುಡುಕಾಟ',
    firSearchSubtitle: 'ನೋಂದಾಯಿಸಲಾದ ಎಲ್ಲಾ ಎಫ್‌ಐಆರ್‌ಗಳಲ್ಲಿ ಸ್ವಾಭಾವಿಕ ಭಾಷೆ ಹುಡುಕಾಟ',
    ioDashboardTitle: 'ತನಿಖಾ ಅಧಿಕಾರಿ ಡ್ಯಾಶ್‌ಬೋರ್ಡ್',
    ioDashboardSubtitle: 'ಅಧಿಕಾರಿಗಳ ಕಾರ್ಯಕ್ಷಮತೆ ಲೀಡರ್‌ಬೋರ್ಡ್ — ಕ್ಲಿಯರೆನ್ಸ್ ದರ ಗುರುತಿಸಲಾಗಿದೆ',
    auditTrailTitle: 'ಆಡಿಟ್ ಟ್ರಯಲ್',
    auditTrailSubtitle: 'ಪೋರ್ಟಲ್‌ನಾದ್ಯಂತ ಎಲ್ಲಾ ಬಳಕೆದಾರ ಕ್ರಿಯೆಗಳ ಬದಲಾಯಿಸಲಾಗದ ಲಾಗ್',
    settingsTitle: 'ಸೆಟ್ಟಿಂಗ್‌ಗಳು',
    settingsSubtitle: 'ಪ್ರೊಫೈಲ್, ಪ್ರದರ್ಶನ ಆದ್ಯತೆಗಳು, ಮತ್ತು ಸೆಷನ್ ನಿಯಂತ್ರಣಗಳು',

    // Overview KPI labels
    firsToday: 'ಇಂದಿನ ಎಫ್‌ಐಆರ್‌ಗಳು',
    activeCases: 'ಸಕ್ರಿಯ ಪ್ರಕರಣಗಳು',
    heinousCrimes: 'ಭೀಕರ ಅಪರಾಧಗಳು',
    clearanceRate: 'ಕ್ಲಿಯರೆನ್ಸ್ ದರ',
    acrossDistricts: '31 ಜಿಲ್ಲೆಗಳಾದ್ಯಂತ',
    inLastHour: 'ಕಳೆದ ಗಂಟೆಯಲ್ಲಿ',
    chargesheeted: 'ಆರೋಪಪತ್ರ ದಾಖಲಾಗಿದೆ',

    // Sections
    liveFeed: 'ಲೈವ್ ಫೀಡ್',
    unread: 'ಓದದ',
    hotspotDistricts: 'ಹಾಟ್‌ಸ್ಪಾಟ್ ಜಿಲ್ಲೆಗಳು',
    liveTelemetryMap: 'ಲೈವ್ ಟೆಲಿಮೆಟ್ರಿ ನಕ್ಷೆ',
    layerCompositor: 'ಲೇಯರ್ ಕಂಪೋಸಿಟರ್',
    liveEvents: 'ಲೈವ್ ಘಟನೆಗಳು',
    heatmap: 'ಹೀಟ್‌ಮ್ಯಾಪ್',
    districtBoundaries: 'ಜಿಲ್ಲಾ ಗಡಿಗಳು',
    waitingForTelemetry: 'ಲೈವ್ ಟೆಲಿಮೆಟ್ರಿಗಾಗಿ ಕಾಯುತ್ತಿದೆ…',

    // Network graph
    nodeInspection: 'ನೋಡ್ ತಪಾಸಣೆ',
    riskScore: 'ಅಪಾಯ ಸ್ಕೋರ್',
    entityType: 'ಘಟಕ ಪ್ರಕಾರ',
    shapAttribution: 'SHAP ವೈಶಿಷ್ಟ್ಯ ಆರೋಪಣ',
    highRisk: 'ಅಧಿಕ ಅಪಾಯ',
    mediumRisk: 'ಮಧ್ಯಮ ಅಪಾಯ',
    lowRisk: 'ಕಡಿಮೆ ಅಪಾಯ',

    // Anomalies
    zScoreTimeline: 'Z-ಸ್ಕೋರ್ ಸಮಯಗತಿ (30-ದಿನ ರೋಲಿಂಗ್)',
    detectionConfig: 'ಪತ್ತೆ ಸಂರಚನೆ',
    zScoreThreshold: 'Z-ಸ್ಕೋರ್ ಮಿತಿ',
    sensitivity: 'ಸೂಕ್ಷ್ಮ',
    strict: 'ಕಟ್ಟುನಿಟ್ಟು',
    lookbackDays: 'ಬೇಸ್‌ಲೈನ್ ವಿಂಡೋ',
    minCrimeCount: 'ಕನಿಷ್ಠ ಅಪರಾಧ ಎಣಿಕೆ',
    applyConfig: 'ಸಂರಚನೆ ಅನ್ವಯಿಸಿ',
    alertsCount: 'ಎಚ್ಚರಿಕೆಗಳು',
    noAnomalies: 'ಮಿತಿಗಿಂತ ಹೆಚ್ಚು ವೈಪರೀತ್ಯಗಳಿಲ್ಲ',

    // FIR search
    searchPlaceholderFir: 'ಅಪರಾಧ ಸಂಖ್ಯೆ, ಜಿಲ್ಲೆ, ಅಪರಾಧ ಪ್ರಕಾರ, ಅಥವಾ ಕೀವರ್ಡ್‌ಗಳಿಂದ ಹುಡುಕಿ…',
    search: 'ಹುಡುಕಿ',
    searching: 'ಹುಡುಕುತ್ತಿದೆ…',
    enterQuery: 'ಎಫ್‌ಐಆರ್‌ಗಳನ್ನು ಹುಡುಕಲು ಪ್ರಶ್ನೆ ನಮೂದಿಸಿ',
    transparencyParsed: 'ಪಾರದರ್ಶಕತೆ — ಪಾರ್ಸ್ ಮಾಡಲಾದ ಪ್ರಶ್ನೆ ಘಟಕಗಳು',
    noEntities: 'ಯಾವುದೇ ರಚನಾತ್ಮಕ ಘಟಕಗಳು ಪತ್ತೆಯಾಗಿಲ್ಲ — ಪೂರ್ಣ-ಪಠ್ಯ ಹುಡುಕಾಟ ಮಾತ್ರ',
    firDetail: 'ಎಫ್‌ಐಆರ್ ವಿವರ',
    caseSummary: 'ಪ್ರಕರಣ ಸಾರಾಂಶ',
    complainant: 'ದೂರುದಾರ',
    accused: 'ಆರೋಪಿ',
    status: 'ಸ್ಥಿತಿ',

    // IO Dashboard
    activeIOs: 'ಸಕ್ರಿಯ ಐಒಗಳು',
    avgCasesPerIO: 'ಸರಾಸರಿ ಪ್ರಕರಣಗಳು / ಐಒ',
    topArrestRate: 'ಅಗ್ರ ಬಂಧನ ದರ',
    officerLeaderboard: 'ಅಧಿಕಾರಿ ಲೀಡರ್‌ಬೋರ್ಡ್',
    rank: 'ಶ್ರೇಣಿ',
    officer: 'ಅಧಿಕಾರಿ',
    rankTitle: 'ಹುದ್ದೆ',
    unit: 'ಘಟಕ',
    cases: 'ಪ್ರಕರಣಗಳು',
    arrests: 'ಬಂಧನಗಳು',
    clearance: 'ಕ್ಲಿಯರೆನ್ಸ್',

    // Cybercrime
    itActCases: 'ಐಟಿ ಕಾಯ್ದೆ ಪ್ರಕರಣಗಳು',
    financialFraud: 'ಹಣಕಾಸಿನ ವಂಚನೆ',
    identityTheft: 'ಗುರುತು ಕಳ್ಳತನ',
    patternClustering: 'ಪ್ಯಾಟರ್ನ್ ಕ್ಲಸ್ಟರಿಂಗ್',
    pattern: 'ಪ್ಯಾಟರ್ನ್',
    type: 'ಪ್ರಕಾರ',
    entity: 'ಘಟಕ',
    threat: 'ಬೆದರಿಕೆ',
    active: 'ಸಕ್ರಿಯ',

    // Trends
    forecastChart: '60-ದಿನ ಮುನ್ಸೂಚನೆ (ಕರ್ನಾಟಕ ಒಟ್ಟು)',
    today: 'ಇಂದು',
    districtMonthDensity: 'ಜಿಲ್ಲೆ × ತಿಂಗಳು ಘಟನೆ ಸಾಂದ್ರತೆ',
    districtLabel: 'ಜಿಲ್ಲೆ',
    monthLabel: 'ತಿಂಗಳು',
    moversUp: 'ಏರಿಕೆ',
    moversDown: 'ಇಳಿಕೆ',
    delta: 'Δ%',

    // Audit trail
    filters: 'ಫಿಲ್ಟರ್‌ಗಳು',
    all: 'ಎಲ್ಲಾ',
    query: 'ಪ್ರಶ್ನೆ',
    login: 'ಲಾಗಿನ್',
    export: 'ರಫ್ತು',
    view: 'ವೀಕ್ಷಣೆ',
    alert: 'ಎಚ್ಚರಿಕೆ',
    from: 'ಇಂದ',
    to: 'ಇಂದ',
    apply: 'ಅನ್ವಯಿಸಿ',
    events: 'ಘಟನೆಗಳು',
    timestamp: 'ಸಮಯಮುದ್ರೆ',
    action: 'ಕ್ರಿಯೆ',
    user: 'ಬಳಕೆದಾರ',
    ipAddress: 'ಐಪಿ',
    resource: 'ಸಂಪನ್ಮೂಲ',
    noEventsMatch: 'ಪ್ರಸ್ತುತ ಫಿಲ್ಟರ್‌ಗಳಿಗೆ ಯಾವುದೇ ಘಟನೆಗಳು ಹೊಂದುತ್ತಿಲ್ಲ',

    // Settings
    profile: 'ಪ್ರೊಫೈಲ್',
    role: 'ಪಾತ್ರ',
    clearanceLevel: 'ಕ್ಲಿಯರೆನ್ಸ್',
    displayPreferences: 'ಪ್ರದರ್ಶನ ಆದ್ಯತೆಗಳು',
    language: 'ಭಾಷೆ',
    languageHint: 'ಇಂಗ್ಲಿಷ್ ಮತ್ತು ಕನ್ನಡ ನಡುವೆ ಟಾಗಲ್ ಮಾಡಿ',
    darkTheme: 'ಡಾರ್ಕ್ ಥೀಮ್',
    criticalIncidentToasts: 'ಗಂಭೀರ ಘಟನೆ ಟೋಸ್ಟ್‌ಗಳು',
    liveSseFeed: 'ಲೈವ್ SSE ಫೀಡ್',
    session: 'ಸೆಷನ್',
    jwtAuth: 'JWT ದೃಢೀಕರಣ',
    ssePermitAll: 'SSE ಪರ್ಮಿಟ್-ಆಲ್',
    autoRefresh: 'ಸ್ವಯಂ-ರಿಫ್ರೆಶ್',
    dangerZone: 'ಅಪಾಯ ವಲಯ',
    logoutMessage: 'ಸೈನ್ ಔಟ್ ನಿಮ್ಮ JWT ಅನ್ನು ಲೋಕಲ್ ಸ್ಟೋರೇಜ್‌ನಿಂದ ತೆರವುಗೊಳಿಸುತ್ತದೆ ಮತ್ತು ಲೈವ್ ಎಚ್ಚರಿಕೆ ಸ್ಟ್ರೀಮ್ ಅನ್ನು ಸಂಪರ್ಕ ಕಡಿಯುತ್ತದೆ.',
    sessionActive: 'ಸಕ್ರಿಯ',
    sessionOpen: 'ತೆರೆಯಲಾಗಿದೆ (U2 ಯೋಜನೆ ಪ್ರಕಾರ)',
    sessionMinutes: '5 ನಿಮಿಷ',
    themeOn: 'ಆನ್ (SOC)',
    toastOn: 'ಆನ್',
    autoAuto: 'ಸ್ವಯಂ',

    // Common UI
    comingSoon: 'ಶೀಘ್ರದಲ್ಲಿ',
    exportReport: 'ವರದಿ ರಫ್ತು',
    deployUnit: 'ಘಟಕ ನಿಯೋಜಿಸಿ',
    retry: 'ಮರುಪ್ರಯತ್ನಿಸಿ',
    close: 'ಮುಚ್ಚಿ',

    // System health
    telemetryStatus: 'ಟೆಲಿಮೆಟ್ರಿ ಸ್ಥಿತಿ',
    nominal: 'ಸಾಮಾನ್ಯ',
    healthy: 'ಆರೋಗ್ಯಕರ',
    degraded: 'ಕುಸಿತ',
    down: 'ಸ್ಥಗಿತ',

    // Auth
    signIn: 'ಸೈನ್ ಇನ್',
    username: 'ಬಳಕೆದಾರ',
    signingIn: 'ಸುರಕ್ಷಿತ ಅಧಿವೇಶನ ಸ್ಥಾಪಿಸಲಾಗುತ್ತಿದೆ…',
    logout: 'ಸೈನ್ ಔಟ್',
  },
} as const;

export type TranslationKey = keyof typeof translations.en;
export type Locale = 'en' | 'kn';

interface LanguageContextValue {
  locale: Locale;
  t: (key: TranslationKey) => string;
  setLocale: (l: Locale) => void;
  toggleLocale: () => void;
}

const LanguageContext = createContext<LanguageContextValue | null>(null);

export const LanguageProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [locale, setLocale] = useState<Locale>(() => {
    const saved = typeof localStorage !== 'undefined' ? localStorage.getItem('ksp_locale') : null;
    return saved === 'kn' ? 'kn' : 'en';
  });

  // Persist locale
  useEffectPersist(locale);

  const t = useMemo(
    () =>
      (key: TranslationKey): string => {
        const dict = translations[locale] as Record<string, string>;
        // Fall back to EN if a Kn key is missing (defensive).
        return dict[key] || translations.en[key] || key;
      },
    [locale],
  );

  const toggleLocale = () => setLocale((p) => (p === 'en' ? 'kn' : 'en'));

  const value = useMemo<LanguageContextValue>(
    () => ({ locale, t, setLocale, toggleLocale }),
    [locale, t],
  );

  return <LanguageContext.Provider value={value}>{children}</LanguageContext.Provider>;
};

// Persist locale to localStorage. Kept as a separate hook so the provider
// effect array is minimal + testable.
function useEffectPersist(locale: Locale) {
  React.useEffect(() => {
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem('ksp_locale', locale);
    }
  }, [locale]);
}

export const useLanguage = (): LanguageContextValue => {
  const ctx = useContext(LanguageContext);
  if (!ctx) throw new Error('useLanguage must be used within LanguageProvider');
  return ctx;
};

export default LanguageContext;
