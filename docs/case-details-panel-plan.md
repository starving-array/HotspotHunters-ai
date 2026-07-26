# Case Details Investigation Panel — Implementation Plan

## Constraint
No changes to the Police FIR System ER diagram schema. All backend work is pure Java DTOs + service layer + read-only repository queries. No `CREATE TABLE`, no `ALTER TABLE`, no new JPA entities.

## Architecture

```
┌──────────────────────────────────────────────────────────────┐
│                        Overview Page                         │
│                                                              │
│  ┌───────────────────────────────┬────────────────────────┐  │
│  │                               │  CaseDetailsPanel      │  │
│  │          MapView              │  (slide-over drawer)   │  │
│  │  ┌───┐          ┌───┐        │                        │  │
│  │  │ ● │ ← click  │ ● │        │  ● FIR: 1 0443...     │  │
│  │  └───┘          └───┘        │  ● Crime: Murder       │  │
│  │        flyTo                  │  ● District: Bengaluru │  │
│  │        highlight              │  ● Status: Under Inves │  │
│  │                               │  ● Timeline: 4 events  │  │
│  │  markers ← AlertContext       │  ● Indicators: 3 items │  │
│  │                               │  ● Export buttons      │  │
│  └───────────────────────────────┴────────────────────────┘  │
│                                                              │
│  State: CaseDetailContext                                     │
│  Cache: Redis (12h TTL)                                      │
│  Data: PostgreSQL via CaseMasterRepository                   │
└──────────────────────────────────────────────────────────────┘
```

## File Inventory (19 files)

| # | Phase | Action | File |
|---|-------|--------|------|
| 1 | P1 | Create | `api/.../dto/CaseDetailDto.java` |
| 2 | P1 | Create | `api/.../dto/TimelineEventDto.java` |
| 3 | P1 | Create | `api/.../dto/CaseIndicatorDto.java` |
| 4 | P1 | Create | `api/.../dto/RelatedCaseDto.java` |
| 5 | P1 | Create | `api/.../service/CaseDetailService.java` |
| 6 | P1 | Create | `api/.../controller/CaseDetailController.java` |
| 7 | P1 | Modify | `api/.../repository/CaseMasterRepository.java` |
| 8 | P2 | Modify | `frontend/src/types/index.ts` |
| 9 | P2 | Create | `frontend/src/api/cases.ts` |
| 10 | P2 | Modify | `frontend/src/api/alerts.ts` |
| 11 | P3 | Create | `frontend/src/context/CaseDetailContext.tsx` |
| 12 | P4 | Modify | `frontend/src/components/MapView.tsx` |
| 13 | P5 | Create | `frontend/src/components/CaseDetailsPanel.tsx` |
| 14 | P5 | Create | `frontend/src/components/CaseTimeline.tsx` |
| 15 | P5 | Create | `frontend/src/components/IndicatorBadge.tsx` |
| 16 | P6 | Create | `frontend/src/utils/exportUtils.ts` |
| 17 | P6 | Create | `frontend/src/utils/reportTemplate.ts` |
| 18 | P7 | Modify | `frontend/src/pages/Overview.tsx` |
| 19 | P7 | Modify | `frontend/src/pages/OverviewMap.tsx` |

## Phase 1 — Backend

### 1.1 CaseDetailDto.java
Pure response DTO. Fields from CaseMaster + joins: caseMasterId, crimeNo, caseNo, crimeRegisteredDate, caseCategory, gravityOffence, crimeMajorHead, crimeMinorHead, caseStatusName, courtName, districtName, policeStationName, policePersonName, incidentFromDate, incidentToDate, infoReceivedPSDate, latitude, longitude, briefFacts, complainantName, suspectName, victimName, isCybercrime, primaryPlatform, financialLoss, cyberSeverity, indicators[], chargesheetDate, chargesheetType, timeline[], relatedCases[], lastUpdated

### 1.2 TimelineEventDto.java
date, action, actor, description

### 1.3 CaseIndicatorDto.java
indicatorType, indicatorValue, platform, firstSeen, lastSeen, isActive

### 1.4 RelatedCaseDto.java
caseMasterId, crimeNo, crimeMajorHead, districtName, status

### 1.5 CaseDetailService.java
1. Check Redis `case:detail:{caseMasterId}` → HIT = deserialize + return
2. MISS → query PostgreSQL (single native SQL join of 8 tables)
3. Build DTO, derive timeline from date fields
4. Fetch indicators from CyberIndicator table
5. Fetch related cases (same CrimeMajorHeadID)
6. Store in Redis with 12h TTL
7. Return

### 1.6 CaseDetailController.java
`GET /api/v1/cases/{caseMasterId}` → 200 + CaseDetailDto or 404

### 1.7 CaseMasterRepository.java
Add 3 native queries: findFullDetailById, findIndicatorsByCaseMasterId, findRelatedCases

## Phase 2 — Frontend Types & API

### 2.1 types/index.ts
Add CaseDetail, TimelineEvent, CaseIndicator, RelatedCase interfaces

### 2.2 api/cases.ts
`getCaseDetail(caseMasterId: number): Promise<CaseDetail>`

### 2.3 api/alerts.ts
Fix subscribeAlerts() to pass through caseMasterId, latitude, longitude from SSE

## Phase 3 — CaseDetailContext
selectedAlert, selectedCase, isPanelOpen, loading, error, selectedIndex
Actions: selectAlert, clearSelection, navigateNext, navigatePrev, closePanel

## Phase 4 — MapView modifications
Add optional props: selectedAlertId, onMarkerClick
buildSelectedIcon() — 24px glow marker
flyTo on selection
Re-render markers with selection state

## Phase 5 — Case Details Panel

### 5.1 CaseDetailsPanel.tsx
11 sections: Header, Quick Actions, Crime Info, Severity & Risk, Parties, Description (searchable), Indicators, Timeline, Related Cases, Metadata, Export
3 states: Empty, Loading (skeleton), Error, Loaded
3 responsive modes: Desktop (384px drawer), Tablet (320px collapsible), Mobile (bottom sheet)
framer-motion animations

### 5.2 CaseTimeline.tsx
Vertical stepper with icons per action type

### 5.3 IndicatorBadge.tsx
Clickable chip per indicator type, copy-to-clipboard

## Phase 6 — Export
exportJSON, exportCSV, exportPDF (jspdf), generatePrintableReport (window.print)

## Phase 7 — Page Integration
Wrap Overview and OverviewMap in CaseDetailProvider, add CaseDetailsPanel next to MapView

## Execution Order
1. P1 Backend (~2 hrs)
2. P2 Types + API (~20 min)
3. P3 Context (~20 min)
4. P5 Panel components (~3 hrs)
5. P4 MapView (~30 min)
6. P6 Export (~45 min)
7. P7 Pages (~15 min)
