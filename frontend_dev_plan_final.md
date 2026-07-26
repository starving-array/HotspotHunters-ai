# KSP Intelligence Portal — Frontend Development Plan (Final)

> **Status:** Approved
> **Commit baseline:** `368830d` (revert with `git reset --hard 368830d`)
> **Source of truth:** `UI_ksp_intelligence_portal/` HTML reference + `design_guide_ui.md`

---

## 1. Locked Decisions

| Domain | Decision | Rationale |
|---|---|---|
| Auth fix | **Out of scope for this UI phase** | File as future follow-up ticket — current auth (no password, JWT in localStorage, SSE permitAll) stays as-is. |
| Design system | **HTML reference** (`#0e1322` bg, cyan `#4cd7f6`, 30-token palette from `DESIGN.md`) | The HTML reference is the polished production look; `design_guide_ui.md` is a secondary spec. |
| Performance | **Day-1 hardening** | `React.lazy` per route + `Suspense` + `ErrorBoundary` + `React.memo` + capped SSE buffer + `@tanstack/react-virtual` for the FIR table. |
| Icons | **`lucide-react`** (npm, no Material Symbols, no CDN) | Per `design_guide_ui.md`. Fully typed, bundle-local. |
| i18n | **Build scaffolding now, defer full translations to U5** | `LanguageContext` with full EN strings + Kn stub (5–10 nav strings); full Kannada translation pass at the end. |
| Fonts | **`@fontsource/inter` + `@fontsource/jetbrains-mono`** (local npm, no CDN) | Offline reliability for control-room deployment, no Google Fonts privacy leak (DPDP Act 2023), matches existing Leaflet-bundled-locally convention. |
| Cadence | **Phase-by-phase approval** | Stop at end of U1, U2, U3, U4, U5 — show files + await approval before next phase. |
| SSE | **Layout-level subscription** | ToastStack subscribes to `/api/v1/alerts/stream` at app boot inside AuthProvider — 1 SSE connection per tab, toasts on every page. |
| Mock data location | **Inline in components** | No abstraction layer; swap out later as backend endpoints arrive. |
| TypeScript | **Strict TS** | Typed interfaces for all data shapes (Case, Alert, District, Officer, CyberIndicator, AuditEvent, TrendPoint, AnomalyEvent, NetworkNode/Link, ShapFeature, Toast, NavItem, Language). |
| Mock realism | **Use real PG names** | Pull actual Karnataka district names (Bengaluru Urban, Mysuru, Belagavi, Kalaburagi…), 8 crime categories, 100 real officer names so the UI looks production-like. |

---

## 2. Tech Stack

### Keep (existing)
- React 18, Vite 5, axios, react-leaflet 4, leaflet 1
- `src/api/axiosConfig.ts` (axios base URL + interceptors)
- `src/context/AuthContext.tsx` (JWT auth — broken but out of scope)

### Add
| Package | Purpose |
|---|---|
| `tailwindcss@4` + `@tailwindcss/vite` | Styling (v4 uses `@import "tailwindcss"` + `@theme` in CSS, no `tailwind.config.js`) |
| `framer-motion` | Animations: command palette, drawer slide-ins, toasts |
| `lucide-react` | Icons (sidebar + buttons + badges) |
| `recharts` | Charts: trends line + anomalies area + heatmap matrix |
| `react-router-dom` | 10-page routing |
| `react-force-graph-2d` | Network graph (canvas-rendered, zoom/pan free) |
| `@tanstack/react-virtual` | Virtualized FIR search table (100K+ rows) |
| `@fontsource/inter` | Inter font (400/500/600/700) |
| `@fontsource/jetbrains-mono` | JetBrains Mono (400/600) — tabular-nums |

### Discard
- All `.tsx/.js` under `frontend/src/components/*` (Login, MapView, LiveAlerts, HotspotLeaderboard, TrendPanel, PredictionPanel, SearchBar, NLQueryBar)
- `frontend/src/App.tsx`

---

## 3. Design System (locked from HTML reference)

### Color tokens (from `UI_ksp_intelligence_portal/DESIGN.md`)
```
surface:           #0e1322   /* primary background */
surface-dim:        #0e1322
surface-bright:     #343949
surface-container:  #1a1f2f
surface-container-low:       #161b2b
surface-container-lowest:    #090e1c
surface-container-high:      #25293a
surface-container-highest:   #2f3445
surface-variant:   #2f3445
on-surface:         #dee1f7   /* primary text */
on-surface-variant: #bcc9cd   /* secondary text */
outline:            #869397
outline-variant:   #3d494c   /* card borders */
primary:            #4cd7f6   /* cyan accent */
on-primary:         #003640
primary-container:  #06b6d4
on-primary-container:#00424f
secondary:          #c0c1ff   /* indigo accent */
tertiary:           #ffb873   /* amber */
error:              #ffb4ab   /* critical red */
error-container:    #93000a
background:         #0e1322   /* page bg */
body-bg-via-html:   #0a0f1e   /* html/body base (lowest layer) */
```

### Typography
- **Inter** (400/500/600/700): UI, headings, labels
- **JetBrains Mono** (400/600): data, numbers, IDs, timestamps — always `tabular-nums`
- **Display-lg**: 32px / 600 / 40px line / -0.02em tracking (KPI summary stats only)
- **Headline-md**: 24px / 600 / 32px line
- **Title-sm**: 18px / 500 / 24px line
- **Body-md**: 14px / 400 / 20px line
- **Label-caps**: 11px / 600 / 16px line / 0.08em tracking (nav items, badges)
- **Data-mono**: 13px / 400 / 18px line (readouts)
- **Data-mono-bold**: 13px / 600 / 18px line
- **CrimeNo format:** `1 0443 0006 2026 00247` (cyan, space-grouped)

### Component styles (strict, do not deviate)
- **Cards/Panels:** `bg-white/5 backdrop-blur-md border border-white/10 rounded-xl`
- **Active cards:** `shadow-[0_0_30px_rgba(76,215,246,0.08)] border-cyan-500/30`
- **Tables:** striped `bg-white/2`, hover `bg-cyan-500/5` + `2px` cyan left border
- **Inputs:** `bg-slate-900 border border-slate-700 focus:border-cyan-500`
- **Buttons:** Primary = solid cyan + black text; Secondary = outlined `#1e3a5f` + cyan text
- **Status chips:** 15% opacity bg tint + high-contrast label color
- **Scrollbars:** 8px wide, dark track `#090e1c`, thumb `#3d494c`, hover `#869397`

### Layout
- **Sidebar:** 240px ↔ 64px collapsed; cyan left border + `bg-cyan-500/10` on active
- **Topbar:** 56px fixed dark
- **Margin:** desktop 24px, mobile 16px
- **Container max:** 1600px
- **Grid:** 12-col desktop, 16px gutters (8px in dense data views)

---

## 4. File Structure (target)

```
frontend/src/
├── api/
│   └── axiosConfig.ts              (KEEP)
├── context/
│   ├── AuthContext.tsx            (KEEP)
│   ├── LanguageContext.tsx        (NEW — i18n scaffolding)
│   └── ToastContext.tsx          (NEW — toast push API)
├── components/
│   ├── Layout.jsx                 (NEW — topbar + sidebar shell + SSE bridge)
│   ├── Sidebar.jsx                (NEW — collapsible nav)
│   ├── Topbar.jsx                 (NEW — 56px bar: search pill, clock, language, avatar)
│   ├── CommandPalette.jsx         (NEW — ⌘K modal)
│   ├── SystemHealth.jsx           (NEW — services popover)
│   ├── ToastStack.jsx             (NEW — toast UI)
│   ├── ErrorBoundary.tsx          (NEW — app-root boundary)
│   ├── FullPageLoader.tsx         (NEW — Suspense fallback)
│   ├── RouteGuard.tsx             (NEW — auth-required wrapper)
│   ├── LiveFIRFeed.jsx            (NEW — Overview feed component)
│   ├── HotspotLeaderboard.jsx     (REBUILD — progress bars)
│   └── KpiCard.jsx                (NEW — reusable KPI tile)
├── pages/
│   ├── Login.jsx                  (REBUILD — dark themed)
│   ├── Overview.jsx               (NEW)
│   ├── OverviewMap.jsx            (REBUILD — Leaflet CartoDB Dark + ping)
│   ├── FIRSearch.jsx              (NEW)
│   ├── NetworkGraph.jsx           (NEW)
│   ├── Trends.jsx                 (REBUILD)
│   ├── Anomalies.jsx              (NEW)
│   ├── IODashboard.jsx            (NEW)
│   ├── Cybercrime.jsx             (NEW)
│   ├── AuditTrail.jsx             (NEW)
│   └── Settings.jsx               (NEW — minimal)
├── types/
│   └── index.ts                   (NEW — all TS interfaces)
├── App.tsx                        (REWRITE — routes + auth gate)
├── main.tsx                       (KEEP)
└── index.css                      (REWRITE — tailwind + fonts + theme + scrollbar)
```

### TypeScript interfaces (`types/index.ts`)
```ts
export interface Case { caseMasterId: number; crimeNo: string; crimeRegisteredDate: string; latitude?: number; longitude?: number; briefFacts?: string; policeStationId?: number; policePersonId?: number; crimeMajorHeadId?: number; crimeMinorHeadId?: number; isCybercrime?: boolean; }
export interface Alert { id: string; caseMasterId: number; crimeNo: string; crimeType: string; district: string; latitude: number; longitude: number; severity: 'low' | 'medium' | 'high' | 'critical'; timestamp: string; }
export interface District { districtId: number; districtName: string; districtCode: string; stateId: number; }
export interface Officer { employeeId: number; firstName: string; rankId?: number; unitId?: number; casesCount?: number; arrestRate?: number; clearanceRate?: number; }
export interface CyberIndicator { indicatorId: number; indicatorType: 'ip' | 'domain' | 'wallet' | 'phone' | 'bank_account' | 'social_handle' | 'email'; indicatorValue: string; platform?: string; }
export interface AuditEvent { id: number; userId: string; action: 'QUERY' | 'LOGIN' | 'EXPORT' | 'VIEW' | 'ALERT'; resource: string; ip: string; timestamp: string; }
export interface TrendPoint { date: string; actual: number; forecast?: number; ci_upper?: number; ci_lower?: number; }
export interface AnomalyEvent { id: number; district: string; zScore: number; expected: number; actual: number; crimeType: string; timestamp: string; }
export interface NetworkNode { id: number; label: string; riskScore: number; riskLevel: 'low' | 'medium' | 'high'; type: 'person' | 'case' | 'ip' | 'district'; }
export interface NetworkLink { source: number; target: number; type: string; }
export interface ShapFeature { feature: string; weight: number; }
export interface Toast { id: string; type: 'info' | 'success' | 'warning' | 'error'; title: string; message: string; }
export interface NavItem { key: string; labelEn: string; labelKn: string; icon: string; path: string; }
export type Locale = 'en' | 'kn';
```

---

## 5. Build Phases

### Phase U1 — Foundation (no inner pages yet)
**Goal:** Working shell + login + 10 lazy-loaded "Coming soon" page stubs. Build must pass.

1. Install deps: `tailwindcss@4`, `@tailwindcss/vite`, `framer-motion`, `lucide-react`, `recharts`, `react-router-dom`, `react-force-graph-2d`, `@tanstack/react-virtual`, `@fontsource/inter`, `@fontsource/jetbrains-mono`
2. `vite.config.ts` — add `@tailwindcss/vite` plugin
3. `index.css` — `@import "tailwindcss"` + `@theme { ...all 30 tokens... }` + `@fontsource` imports + dark scrollbar + LED glow keyframes
4. `App.tsx` — `react-router-dom` `createBrowserRouter` with `React.lazy()` per page + `<Suspense fallback={<FullPageLoader/>}>` + `<ErrorBoundary>` at root
5. `ErrorBoundary.tsx` + `FullPageLoader.tsx`
6. `RouteGuard.tsx` — wraps protected routes, redirects to `/login` if `!isAuthenticated`
7. `LanguageContext.tsx` — full EN strings + 5–10 Kn sample strings + `useLanguage` hook
8. `ToastContext.tsx` + `ToastStack.jsx` — framer-motion AnimatePresence, push/dismiss API
9. `Layout.jsx` (Topbar + Sidebar + `Outlet` + ToastStack + SystemHealth + CommandPalette + SSE bridge to ToastContext)
10. `Topbar.jsx` — search pill (⌘K), JetBrains Mono cyan clock, EN/ಕನ್ನಡ toggle, avatar
11. `Sidebar.jsx` — collapsible 240↔64, lucide icons (LayoutDashboard, Map, Flame, Network, AlertTriangle, Shield, TrendingUp, Search, History, Settings), active = cyan border + `bg-cyan-500/10`, SSE pulsing dot footer
12. `CommandPalette.jsx` — ⌘K + Ctrl+K, framer-motion glassmorphism modal, mock nav suggestions
13. `SystemHealth.jsx` — popover (Kafka/ES/Redis/ML status — mock green)
14. `Login.jsx` — dark-themed login (wraps existing `useAuth().login`; no password fix)
15. 10 page stubs in `pages/`: each shows "Coming soon — {page}" with page layout
16. **`npm run build` must pass** — stop and await approval

### Phase U2 — Primary dashboard (approval gate)
17. `Overview.jsx` — KPI strip 4 cards (FIRs Today, Active Cases, Heinous, Clearance Rate) with JetBrains Mono 52px numbers; bento grid: left col 60% = mini map placeholder, right col 40% = `LiveFIRFeed` (top) + `HotspotLeaderboard` (bottom)
18. `LiveFIRFeed.jsx` — wires to `/api/v1/alerts/stream`, **capped buffer of 100 events, `React.memo` entries**, severity-colored cards, relative timestamps, "new" dot auto-clears after 3s
19. `HotspotLeaderboard.jsx` — top 10 districts, sortable, progress bars cyan→amber→red gradient, trend arrows, sparkline placeholders
20. `OverviewMap.jsx` — Leaflet + `https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png` tiles, mock crime points (Bengaluru Urban, Mysuru, Belagavi, Kalaburagi), **3-ring cyan ping CSS animation** for live events, glassmorphism floating layer-control panel
21. `KpiCard.jsx` — reusable KPI tile (label-caps title, JetBrains Mono 52px value, trend delta, optional icon)
22. **Stop — await approval**

### Phase U3 — Data pages (approval gate)
23. `FIRSearch.jsx` — NLP search bar with lucide `Mic` icon + transparency panel showing parsed (District, Crime, Area, Date) chips + **`@tanstack/react-virtual`** table for results + 420px right-side slide-in details drawer (case facts, timeline, accused stats)
24. `NetworkGraph.jsx` — `react-force-graph-2d` on `<canvas>` with red/amber/emerald nodes by risk score; click node opens right drawer showing **mock SHAP feature-weight bars** (clearly labeled "demo data"; features: `crime_count`, `graph_degree`, `recency_days`, `prior_convictions`)
25. `Anomalies.jsx` — recharts `AreaChart` of Z-scores with red (y=7) and amber (y=4) threshold reference lines; events table sorted by |Z|; config panel with sliders for baseline window (7/14/30d) and sensitivity (σ threshold)

### Phase U4 — Secondary pages (approval gate)
26. `Trends.jsx` — recharts `LineChart` 60-day forecast with shaded CI band; District×Month heatmap matrix (intensity colored); movers table (emerald up, slate/red down)
27. `IODashboard.jsx` — KPI strip (Active IOs, Avg Cases/IO, Top Arrest Rate); leaderboard table ranking officers by caseload + arrests + clearance rate; **flag clearance <50% amber, >70% emerald**
28. `Cybercrime.jsx` — KPI strip (IT Act Cases, Financial Fraud, Identity Theft); split view: cyber-only Leaflet map with monitor icons + pattern clustering table (OTP Fraud, SIM Swap, Phishing domains, etc.) pulling from `cyber_trend_alerts` schema
29. `AuditTrail.jsx` — table with JetBrains Mono for IP + timestamps; color-coded action badges (QUERY=blue, LOGIN=emerald, EXPORT=amber, VIEW=slate, ALERT=red); filter by action type + date range
30. `Settings.jsx` — minimal profile + display prefs + danger zone (logout)

### Phase U5 — Polish
31. Full Kannada translation pass — cover all visible labels in `LanguageContext` (nav, KPI titles, buttons, table headers, toasts)
32. Visual sweep — dark scrollbars, glow on active cards, `tabular-nums` on all numeric columns
33. **`npm run build` must pass** + **`vitest run`** — update or remove broken existing tests
34. Document known issues as inline TODOs:
    - Login has no password; JWT in localStorage (XSS risk)
    - SSE endpoint `/api/v1/alerts/stream` is `permitAll`
    - SHAP drawer uses mock data (ML service not wired)
    - Mock data inline in pages (swap with real API when backend endpoints exist)

---

## 6. Discovery log — Issues acknowledged (filed as future tickets)

The plan was self-reviewed as a senior staff engineer would. Issues that surfaced are acknowledged and either **addressed in-plan** or **explicitly deferred**:

### 🔴 Security — deferred (not in scope for this UI phase)
| # | Issue | Status |
|---|---|---|
| S1 | Login flow has **no password** — `AuthContext.login(uname)` sends only `{ username }` | Deferred to backend ticket |
| S2 | JWT stored in `localStorage` — XSS token theft risk | Deferred — requires httpOnly+Secure+SameSite=Strict cookie migration |
| S3 | `/api/v1/alerts/stream` is `permitAll` in `SecurityConfig.java:62` | Deferred — re-secure with JWT-in-query-param validation |

### 🔴 Performance — addressed in plan
| # | Issue | Resolution in-plan |
|---|---|---|
| P1 | Initial bundle bloated by recharts+leaflet+force-graph | `React.lazy()` per route + `Suspense` (Phase U1 step 4) |
| P2 | FIR search table 100K+ rows will jank | `@tanstack/react-virtual` for virtualization (Phase U3 step 23) |
| P3 | SSE feed will re-render constantly | 100-event capped buffer + `React.memo` on entries (Phase U2 step 18) |

### 🟡 Design — addressed in plan
| # | Issue | Resolution in-plan |
|---|---|---|
| D1 | Two conflicting palettes (HTML ref vs design_guide_ui.md) | Locked to **HTML reference** palette (Section 3 above) |
| D2 | Reference HTML isn't React (Tailwind class soup) | Decompose into proper React components, not transcribe |
| D3 | Reference uses Google Fonts CDN + Material Symbols CDN | **Banned** — use `@fontsource/*` + `lucide-react` (Section 2) |
| D4 | No error boundary / loading states | `ErrorBoundary.tsx` + `FullPageLoader.tsx` (Phase U1) |

### 🟡 Spec — addressed in plan
| # | Issue | Resolution in-plan |
|---|---|---|
| I1 | doc says "9 pages" but lists 11; sidebar has Settings not in doc | 10 pages + Login = 11 routes (Section 4) |
| I2 | Kannada is hard requirement, not nice-to-have | i18n **scaffolding in U1** + **full translations in U5** (Section 5) |

---

## 7. Commit baseline & revert

- **Baseline commit:** `368830d` — `feat: Phase 3c Neo4j + Phase 6a Cybercrime model + security/foundation work` (86 files, no `.md` staged)
- **Revert command:** `git reset --hard 368830d`
- **All `.md` files excluded from commits** per user preference; reference dir `UI_ksp_intelligence_portal/` stays untracked (user will remove after UI ships)

---

## 8. Approval gates

| Gate | After phase | What I'll show before proceeding |
|---|---|---|
| ✅ Start | (plan approval) | This document |
| 🔲 U1 → U2 | Foundation | File list + `npm run build` passing + login screenshot/dir |
| 🔲 U2 → U3 | Overview + Map | Working Overview page with KPIs + live feed + leaderboard + Leaflet dark map |
| 🔲 U3 → U4 | Network + FIR + Anomalies | Three working data pages |
| 🔲 U4 → U5 | Trends + IO + Cyber + Audit + Settings | Five working secondary pages |
| 🔲 Done | U5 polish | Full app + tests passing + i18n complete |
