import type { AnomalyEvent } from '../types';

export interface AnomalyConfig {
  zScoreThreshold: number;
  lookbackDays: number;
  minCrimeCount: number;
}

const STUB_ANOMALIES: AnomalyEvent[] = Array.from({ length: 30 }, (_, i) => {
  const base = Math.sin(i * 1.2) * 1.5 + Math.random() * 0.8;
  const day = new Date(2026, 6, 23 - i);
  return {
    id: i + 1,
    district: ['Bengaluru Urban', 'Mysuru', 'Kalaburagi', 'Dharwad', 'Dakshina Kannada'][i % 5],
    zScore: parseFloat(base.toFixed(2)),
    expected: parseFloat((20 + Math.sin(i * 0.5) * 5).toFixed(1)),
    actual: parseFloat((20 + Math.sin(i * 0.5) * 5 + base * 3).toFixed(1)),
    crimeType: ['Cyber Crime', 'Crimes Against Women', 'Property', 'Economic Offences'][i % 4],
    timestamp: day.toISOString(),
  };
});

const STUB_CONFIG: AnomalyConfig = {
  zScoreThreshold: 2.0,
  lookbackDays: 30,
  minCrimeCount: 5,
};

export async function getAnomalies(): Promise<AnomalyEvent[]> {
  await new Promise((r) => setTimeout(r, 50));
  return STUB_ANOMALIES;
}

export async function getAnomalyConfig(): Promise<AnomalyConfig> {
  await new Promise((r) => setTimeout(r, 20));
  return STUB_CONFIG;
}

export async function updateAnomalyConfig(
  config: Partial<AnomalyConfig>,
): Promise<AnomalyConfig> {
  await new Promise((r) => setTimeout(r, 30));
  return { ...STUB_CONFIG, ...config };
}
