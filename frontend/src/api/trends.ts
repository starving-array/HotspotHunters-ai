import { KarnatakaDistrict } from '../types/enums';
import type { TrendPoint } from '../types';

export interface MoversRow {
  district: string;
  deltaPct: number;
  cases: number;
}

export interface HeatmapCell {
  district: string;
  month: string;
  intensity: number;
}

export interface TrendsData {
  forecast: TrendPoint[];
  heatmap: HeatmapCell[];
  movers: MoversRow[];
}

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

function buildForecast(): TrendPoint[] {
  const out: TrendPoint[] = [];
  const today = new Date('2026-07-23');
  for (let i = -30; i <= 60; i++) {
    const d = new Date(today);
    d.setDate(d.getDate() + i);
    const dateStr = d.toISOString().slice(0, 10);
    const base = 220 + Math.sin(i * 0.18) * 35 + (i > 0 ? i * 1.4 : 0);
    const noise = (i % 7 === 0 ? 18 : 0);
    const actual = i <= 0 ? Math.round(base + noise) : undefined;
    const forecast = i >= 0 ? Math.round(base) : undefined;
    const ci = 12 + (i > 0 ? i * 0.3 : 0);
    out.push({
      date: dateStr,
      actual,
      forecast,
      ciUpper: forecast !== undefined ? Math.round(forecast + ci) : undefined,
      ciLower: forecast !== undefined ? Math.round(forecast - ci) : undefined,
    });
  }
  return out;
}

function buildHeatmap(): HeatmapCell[] {
  const districts = [
    KarnatakaDistrict.BangaloreUrban,
    KarnatakaDistrict.Mysuru,
    KarnatakaDistrict.Kalaburagi,
    KarnatakaDistrict.Dharwad,
    KarnatakaDistrict.DakshinaKannada,
    KarnatakaDistrict.Belgaum,
    KarnatakaDistrict.Tumakuru,
    KarnatakaDistrict.Shivamogga,
  ];
  const out: HeatmapCell[] = [];
  for (const district of districts) {
    for (let m = 0; m < 12; m++) {
      const seed = district.length * 7 + m * 13;
      const intensity = Math.min(100, Math.max(5, ((seed % 90) + (m > 5 ? 18 : 0))));
      out.push({ district, month: MONTHS[m], intensity });
    }
  }
  return out;
}

function buildMovers(): MoversRow[] {
  return [
    { district: KarnatakaDistrict.BangaloreUrban, deltaPct: 14, cases: 412 },
    { district: KarnatakaDistrict.Mysuru, deltaPct: 8, cases: 208 },
    { district: KarnatakaDistrict.DakshinaKannada, deltaPct: 5, cases: 118 },
    { district: KarnatakaDistrict.Davangere, deltaPct: 4, cases: 84 },
    { district: KarnatakaDistrict.Kalaburagi, deltaPct: -3, cases: 164 },
    { district: KarnatakaDistrict.Belgaum, deltaPct: -5, cases: 96 },
    { district: KarnatakaDistrict.Tumakuru, deltaPct: -7, cases: 71 },
    { district: KarnatakaDistrict.Vijayapura, deltaPct: -12, cases: 64 },
  ];
}

const STUB_TRENDS: TrendsData = {
  forecast: buildForecast(),
  heatmap: buildHeatmap(),
  movers: buildMovers(),
};

export async function getTrends(): Promise<TrendsData> {
  await new Promise((r) => setTimeout(r, 60));
  return STUB_TRENDS;
}
