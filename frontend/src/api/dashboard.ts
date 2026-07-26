import axios from 'axios';
import type { KPIData } from '../types';

export async function getKPIs(): Promise<KPIData[]> {
  const res = await axios.get('/api/v1/dashboard/kpis');
  return res.data as KPIData[];
}
