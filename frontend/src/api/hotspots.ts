import axios from 'axios';
import type { HotspotDistrict } from '../types';

export async function getHotspots(): Promise<HotspotDistrict[]> {
  const res = await axios.get('/api/v1/hotspots/live', { params: { limit: 10 } });
  const data = res.data as Array<{ district: string; score: number }>;
  return data.map((item, i) => ({
    rank: i + 1,
    name: item.district,
    cases: Math.round(item.score),
    trendPct: 0,
  }));
}
