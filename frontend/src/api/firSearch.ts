import axios from 'axios';
import type { Severity } from '../types';
import { KarnatakaDistrict, CrimeCategory, CaseStatus } from '../types/enums';

export interface FIRSearchResult {
  caseMasterId: number;
  crimeNo: string;
  crimeType: string;
  district: string;
  policeStation: string;
  registeredDate: string;
  briefFacts: string;
  severity: Severity;
}

export interface FIRDetail {
  caseMasterId: number;
  crimeNo: string;
  crimeType: string;
  district: string;
  policeStation: string;
  registeredDate: string;
  incidentFromDate: string;
  incidentToDate: string;
  briefFacts: string;
  severity: Severity;
  complainantName: string;
  accusedName: string;
  status: string;
  isCybercrime: boolean;
  financialLoss?: number;
}

export interface ParsedQuery {
  raw: string;
  district?: string;
  crimeCategory?: string;
  area?: string;
  dateRange?: string;
}

export interface SearchResponse {
  results: FIRSearchResult[];
  parsed: ParsedQuery;
}

const DISTRICT_ALIASES: Record<string, string> = {
  bengaluru: 'Bangalore Urban',
  bangalore: 'Bangalore Urban',
  'bengaluru urban': 'Bangalore Urban',
  'bangalore urban': 'Bangalore Urban',
  mysuru: 'Mysuru',
  mysore: 'Mysuru',
  kalaburagi: 'Kalaburagi',
  dharwad: 'Dharwad',
};

function parseQuery(q: string): ParsedQuery {
  const lower = q.toLowerCase();
  const parsed: ParsedQuery = { raw: q };
  for (const alias of Object.keys(DISTRICT_ALIASES)) {
    if (lower.includes(alias)) {
      parsed.district = DISTRICT_ALIASES[alias];
      break;
    }
  }
  return parsed;
}

export async function searchFIR(query: string): Promise<SearchResponse> {
  const res = await axios.get('/api/v1/fir-search', { params: { q: query } });
  const results = (res.data.results as FIRSearchResult[]).map(r => ({
    ...r,
    severity: r.severity as Severity,
  }));
  return { results, parsed: parseQuery(query) };
}

export async function getFIRDetail(id: number): Promise<FIRDetail | null> {
  const res = await axios.get('/api/v1/fir-search', { params: { q: String(id) } });
  const results = res.data.results as FIRSearchResult[];
  if (results.length === 0) return null;
  const r = results[0];
  return {
    ...r,
    severity: r.severity as Severity,
    incidentFromDate: '',
    incidentToDate: '',
    complainantName: '',
    accusedName: '',
    status: CaseStatus.UnderInvestigation,
    isCybercrime: r.crimeType.includes('Cyber'),
    financialLoss: 0,
  };
}
