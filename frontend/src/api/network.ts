import axios from 'axios';
import type { NetworkNode, NetworkLink, ShapFeature } from '../types';

export interface GraphData {
  nodes: NetworkNode[];
  links: NetworkLink[];
}

export async function getGraphData(): Promise<GraphData> {
  const res = await axios.get('/api/v1/network/graph');
  const data = res.data as { nodes: NetworkNode[]; links: NetworkLink[] };
  return {
    nodes: data.nodes.map(n => ({
      ...n,
      riskLevel: n.riskLevel as NetworkNode['riskLevel'],
      type: n.type as NetworkNode['type'],
    })),
    links: data.links.map(l => ({
      source: l.source as number,
      target: l.target as number,
      type: l.type,
    })),
  };
}

export async function getShapFeatures(offenderId: string): Promise<ShapFeature[]> {
  const res = await axios.get(`/api/v1/network/${offenderId}/shap`);
  return (res.data as ShapFeature[]).map(f => ({
    ...f,
  }));
}

export interface FirSimilarityResult {
  firId: string;
  similar: { firId: string; score: number }[];
}

export async function getFirSimilarity(firId: string, topK: number = 10): Promise<FirSimilarityResult> {
  const res = await axios.get(`/api/v1/network/fir-similar/${firId}`, { params: { topK } });
  return res.data;
}
