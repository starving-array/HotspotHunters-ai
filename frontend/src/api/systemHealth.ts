import type { SystemService } from '../types';

// ============================================================
// System health (sidebar popover)
// ============================================================
// TODO(U5): replace stub with axios.get('/actuator/health').
// Spring Boot Actuator is already configured and Prometheus scrapes it —
// just need to add a thin endpoint that returns aggregated service statuses.

const STUB_SERVICES: SystemService[] = [
  { name: 'Kafka Consumer', sub: 'indexing-service', metric: '2 msgs/s', status: 'healthy' },
  { name: 'ElasticSearch', sub: 'crime-index', metric: '94,847 docs', status: 'healthy' },
  { name: 'Redis Cache', sub: 'hotspots:live', metric: '31 keys', status: 'healthy' },
  { name: 'Neo4j Graph', sub: 'crime-network', metric: '100K nodes', status: 'healthy' },
  { name: 'ML Inference', sub: 'prediction-engine', metric: '142ms avg', status: 'healthy' },
];

export interface SystemHealthSummary {
  services: SystemService[];
  cpuPct: number;
  ramGb: number;
}

const STUB_SUMMARY: SystemHealthSummary = {
  services: STUB_SERVICES,
  cpuPct: 12,
  ramGb: 4.2,
};

export async function getSystemHealth(): Promise<SystemHealthSummary> {
  await new Promise((r) => setTimeout(r, 30));
  return STUB_SUMMARY;
}
