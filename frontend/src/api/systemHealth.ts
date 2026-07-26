import axios from 'axios';
import type { SystemHealthSummary } from '../types';

export async function getSystemHealth(): Promise<SystemHealthSummary> {
  const res = await axios.get('/api/v1/system/health');
  return res.data as SystemHealthSummary;
}
