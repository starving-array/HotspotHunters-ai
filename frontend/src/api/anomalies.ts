import axios from 'axios';
import type { AnomalyEvent } from '../types';

const CONFIG_KEY = 'ksp_anomaly_config';

export interface AnomalyConfig {
  zScoreThreshold: number;
  lookbackDays: number;
  minCrimeCount: number;
  routing: {
    dashboard: boolean;
    email: boolean;
    sms: boolean;
  };
}

function defaultConfig(): AnomalyConfig {
  return {
    zScoreThreshold: 2.0,
    lookbackDays: 30,
    minCrimeCount: 5,
    routing: { dashboard: true, email: false, sms: false },
  };
}

export async function getAnomalies(): Promise<AnomalyEvent[]> {
  const res = await axios.get('/api/v1/anomalies', { params: { limit: 200 } });
  return (res.data as AnomalyEvent[]).map(a => ({
    ...a,
  }));
}

export async function getAnomalyConfig(): Promise<AnomalyConfig> {
  try {
    const stored = localStorage.getItem(CONFIG_KEY);
    if (stored) return JSON.parse(stored) as AnomalyConfig;
  } catch {}
  return defaultConfig();
}

export async function updateAnomalyConfig(
  config: Partial<AnomalyConfig>,
): Promise<AnomalyConfig> {
  const current = await getAnomalyConfig();
  const updated = { ...current, ...config };
  localStorage.setItem(CONFIG_KEY, JSON.stringify(updated));
  return updated;
}
