import type { NetworkNode, NetworkLink, ShapFeature } from '../types';

export interface GraphData {
  nodes: NetworkNode[];
  links: NetworkLink[];
}

const STUB_GRAPH: GraphData = {
  nodes: [
    { id: 1, label: 'Ravi Kumar', riskScore: 0.87, riskLevel: 'high', type: 'person' },
    { id: 2, label: 'Cyber Crime Cell', riskScore: 0, riskLevel: 'low', type: 'district' },
    { id: 3, label: 'FIR #00421', riskScore: 0.65, riskLevel: 'medium', type: 'case' },
    { id: 4, label: '192.168.1.45', riskScore: 0.92, riskLevel: 'high', type: 'ip' },
    { id: 5, label: 'Anita Shetty', riskScore: 0.32, riskLevel: 'low', type: 'person' },
    { id: 6, label: 'FIR #00892', riskScore: 0.71, riskLevel: 'medium', type: 'case' },
    { id: 7, label: '10.0.0.12', riskScore: 0.45, riskLevel: 'medium', type: 'ip' },
    { id: 8, label: 'Mangaluru', riskScore: 0, riskLevel: 'low', type: 'district' },
    { id: 9, label: 'Suresh Patil', riskScore: 0.78, riskLevel: 'high', type: 'person' },
    { id: 10, label: 'FIR #00315', riskScore: 0.59, riskLevel: 'medium', type: 'case' },
    { id: 11, label: '172.16.0.88', riskScore: 0.34, riskLevel: 'low', type: 'ip' },
    { id: 12, label: 'Bengaluru Urban', riskScore: 0, riskLevel: 'low', type: 'district' },
  ],
  links: [
    { source: 1, target: 2, type: 'REGISTERED_AT' },
    { source: 1, target: 3, type: 'INVOLVES' },
    { source: 1, target: 4, type: 'USES_IP' },
    { source: 5, target: 6, type: 'INVOLVES' },
    { source: 5, target: 7, type: 'USES_IP' },
    { source: 6, target: 8, type: 'REGISTERED_AT' },
    { source: 9, target: 10, type: 'INVOLVES' },
    { source: 9, target: 11, type: 'USES_IP' },
    { source: 10, target: 12, type: 'REGISTERED_AT' },
    { source: 3, target: 4, type: 'SHARES_IP' },
    { source: 6, target: 7, type: 'SHARES_IP' },
    { source: 4, target: 7, type: 'COMMUNICATES' },
    { source: 1, target: 9, type: 'ASSOCIATE' },
  ],
};

const STUB_SHAP: ShapFeature[] = [
  { feature: 'crime_count', weight: 0.34 },
  { feature: 'graph_degree', weight: 0.28 },
  { feature: 'recency_days', weight: 0.18 },
  { feature: 'prior_convictions', weight: 0.12 },
  { feature: 'co_accused_links', weight: 0.08 },
];

export async function getGraphData(): Promise<GraphData> {
  await new Promise((r) => setTimeout(r, 50));
  return STUB_GRAPH;
}

export async function getShapFeatures(): Promise<ShapFeature[]> {
  await new Promise((r) => setTimeout(r, 20));
  return STUB_SHAP;
}
