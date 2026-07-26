import axios from 'axios';
import type { AnomalyEvent } from '../types';

export interface AnomalyConfig {
  zScoreThreshold: number;
  lookbackDays: number;
  minCrimeCount: number;
}

export async function getAnomalies(): Promise<AnomalyEvent[]> {
  const res = await axios.get('/api/v1/anomalies', { params: { limit: 50 } });
  return (res.data as AnomalyEvent[]).map(a => ({
    ...a,
  }));
}

export async function getAnomalyConfig(): Promise<AnomalyConfig> {
  return { zScoreThreshold: 2.0, lookbackDays: 30, minCrimeCount: 5 };
}

export async function updateAnomalyConfig(
  config: Partial<AnomalyConfig>,
): Promise<AnomalyConfig> {
  return { ...await getAnomalyConfig(), ...config };
}
