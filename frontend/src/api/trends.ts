import axios from 'axios';
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

export async function getTrends(): Promise<TrendsData> {
  const res = await axios.get('/api/v1/trends/overview');
  return res.data as TrendsData;
}
