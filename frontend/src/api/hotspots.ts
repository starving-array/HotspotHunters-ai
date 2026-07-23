// HotspotLeaderboard data shape (kept here so api/hotspots.ts and components
// share one definition without circular imports).
export interface HotspotDistrict {
  rank: number;
  name: string;
  cases: number;
  trendPct: number;
}

// ============================================================
// Hotspot leaderboard
// ============================================================
// TODO(U5): replace stub with axios.get('/api/v1/hotspots').
// Backend HotspotController.java already exists; need to confirm the
// response shape (districtName + caseCount + trendPct) before swapping.

const STUB_HOTSPOTS: HotspotDistrict[] = [
  { rank: 1, name: 'Bangalore Urban', cases: 412, trendPct: 8 },
  { rank: 2, name: 'Mysuru', cases: 208, trendPct: 3 },
  { rank: 3, name: 'Kalaburagi', cases: 164, trendPct: -2 },
  { rank: 4, name: 'Dharwad', cases: 142, trendPct: 5 },
  { rank: 5, name: 'Dakshina Kannada', cases: 118, trendPct: 0 },
  { rank: 6, name: 'Belgaum', cases: 96, trendPct: -1 },
  { rank: 7, name: 'Davangere', cases: 84, trendPct: 4 },
  { rank: 8, name: 'Tumakuru', cases: 71, trendPct: -3 },
  { rank: 9, name: 'Vijayapura', cases: 64, trendPct: 2 },
  { rank: 10, name: 'Shivamogga', cases: 52, trendPct: 1 },
];

export async function getHotspots(): Promise<HotspotDistrict[]> {
  await new Promise((r) => setTimeout(r, 30));
  return STUB_HOTSPOTS;
}
