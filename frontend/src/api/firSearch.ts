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

// ============================================================
// Alias maps — resolve loose user input to canonical enum values
// (KarnatakaDistrict / CrimeCategory are the single source of truth).
// ============================================================
const DISTRICT_ALIASES: Record<string, KarnatakaDistrict> = {
  bengaluru: KarnatakaDistrict.BangaloreUrban,
  bangalore: KarnatakaDistrict.BangaloreUrban,
  'bengaluru urban': KarnatakaDistrict.BangaloreUrban,
  'bangalore urban': KarnatakaDistrict.BangaloreUrban,
  'bengaluru rural': KarnatakaDistrict.BangaloreRural,
  'bangalore rural': KarnatakaDistrict.BangaloreRural,
  mysuru: KarnatakaDistrict.Mysuru,
  mysore: KarnatakaDistrict.Mysuru,
  kalaburagi: KarnatakaDistrict.Kalaburagi,
  gulbarga: KarnatakaDistrict.Kalaburagi,
  dharwad: KarnatakaDistrict.Dharwad,
  belgaum: KarnatakaDistrict.Belgaum,
  belagavi: KarnatakaDistrict.Belgaum,
  tumakuru: KarnatakaDistrict.Tumakuru,
  tumkur: KarnatakaDistrict.Tumakuru,
  mangaluru: KarnatakaDistrict.DakshinaKannada,
  'dakshina kannada': KarnatakaDistrict.DakshinaKannada,
  hubballi: KarnatakaDistrict.Dharwad,
  hubli: KarnatakaDistrict.Dharwad,
};

const CRIME_ALIASES: Record<string, CrimeCategory> = {
  cyber: CrimeCategory.CyberCrimes,
  'cyber crime': CrimeCategory.CyberCrimes,
  'cybercrime': CrimeCategory.CyberCrimes,
  property: CrimeCategory.CrimesAgainstProperty,
  theft: CrimeCategory.CrimesAgainstProperty,
  burglary: CrimeCategory.CrimesAgainstProperty,
  robbery: CrimeCategory.CrimesAgainstProperty,
  women: CrimeCategory.CrimesAgainstWomen,
  'crimes against women': CrimeCategory.CrimesAgainstWomen,
  harassment: CrimeCategory.CrimesAgainstWomen,
  children: CrimeCategory.CrimesAgainstChildren,
  body: CrimeCategory.CrimesAgainstBody,
  assault: CrimeCategory.CrimesAgainstBody,
  murder: CrimeCategory.CrimesAgainstBody,
  economic: CrimeCategory.EconomicOffences,
  fraud: CrimeCategory.EconomicOffences,
  'economic offences': CrimeCategory.EconomicOffences,
  drug: CrimeCategory.DrugRelatedOffences,
  drugs: CrimeCategory.DrugRelatedOffences,
};

const AREA_KEYWORDS = ['urban', 'rural', 'city', 'town', 'station', 'village'];
const DATE_KEYWORDS = ['today', 'yesterday', 'last week', 'last month', 'this week', 'this month', 'last year'];

const STUB_RESULTS: FIRSearchResult[] = [
  { caseMasterId: 421, crimeNo: '1 0443 0006 2026 00421', crimeType: CrimeCategory.CyberCrimes, district: KarnatakaDistrict.BangaloreUrban, policeStation: 'Cyber Crime PS', registeredDate: '2026-07-21T14:30:00', briefFacts: 'Phishing attack targeting 40+ bank customers using cloned SBI portal', severity: 'high' },
  { caseMasterId: 422, crimeNo: '1 0443 0006 2026 00422', crimeType: CrimeCategory.CrimesAgainstWomen, district: KarnatakaDistrict.Mysuru, policeStation: 'Women PS', registeredDate: '2026-07-21T12:15:00', briefFacts: 'Harassment via anonymous social media accounts, 14 identified victims', severity: 'critical' },
  { caseMasterId: 423, crimeNo: '2 0112 0045 2026 00423', crimeType: CrimeCategory.CrimesAgainstProperty, district: KarnatakaDistrict.Belgaum, policeStation: 'Town PS', registeredDate: '2026-07-21T10:00:00', briefFacts: 'Commercial burglary, CCTV footage shows organised gang of 4', severity: 'medium' },
  { caseMasterId: 424, crimeNo: '1 0882 0012 2026 00424', crimeType: CrimeCategory.EconomicOffences, district: KarnatakaDistrict.DakshinaKannada, policeStation: 'Economic Offences Wing', registeredDate: '2026-07-20T09:45:00', briefFacts: 'Ponzi scheme involving 200+ investors, total loss estimated 2.3Cr', severity: 'high' },
  { caseMasterId: 425, crimeNo: '3 0551 0099 2026 00425', crimeType: CrimeCategory.DrugRelatedOffences, district: KarnatakaDistrict.Kalaburagi, policeStation: 'Gulbarga PS', registeredDate: '2026-07-20T08:20:00', briefFacts: 'Seizure of 5kg MDMA, international trafficking ring suspected', severity: 'critical' },
  { caseMasterId: 426, crimeNo: '1 0223 0005 2026 00426', crimeType: CrimeCategory.CrimesAgainstBody, district: KarnatakaDistrict.Dharwad, policeStation: 'Dharwad PS', registeredDate: '2026-07-19T16:00:00', briefFacts: 'Assault during land dispute, victim in ICU', severity: 'high' },
  { caseMasterId: 427, crimeNo: '2 0119 0044 2026 00427', crimeType: CrimeCategory.OtherCrimes, district: KarnatakaDistrict.Dharwad, policeStation: 'Traffic PS', registeredDate: '2026-07-19T14:10:00', briefFacts: 'Hit-and-run on NH 48, suspect vehicle identified via toll plaza cam', severity: 'medium' },
  { caseMasterId: 428, crimeNo: '1 0443 0006 2026 00428', crimeType: CrimeCategory.CyberCrimes, district: KarnatakaDistrict.BangaloreUrban, policeStation: 'Cyber Crime PS', registeredDate: '2026-07-19T11:30:00', briefFacts: 'Ransomware attack on hospital chain, 12K patient records encrypted', severity: 'critical' },
  { caseMasterId: 429, crimeNo: '1 0443 0006 2026 00429', crimeType: CrimeCategory.CrimesAgainstChildren, district: KarnatakaDistrict.DakshinaKannada, policeStation: 'Mangaluru PS', registeredDate: '2026-07-18T15:20:00', briefFacts: 'Online grooming case, suspect posed as minor on gaming platform', severity: 'critical' },
  { caseMasterId: 430, crimeNo: '2 0112 0045 2026 00430', crimeType: CrimeCategory.CrimesAgainstProperty, district: KarnatakaDistrict.Tumakuru, policeStation: 'Tumkur PS', registeredDate: '2026-07-18T09:00:00', briefFacts: 'Gold jewellery theft from temple, CCTV shows insider involvement', severity: 'medium' },
  { caseMasterId: 431, crimeNo: '1 0882 0012 2026 00431', crimeType: CrimeCategory.EconomicOffences, district: KarnatakaDistrict.Mysuru, policeStation: 'White Collar PS', registeredDate: '2026-07-17T13:40:00', briefFacts: 'Insurance fraud ring busted, 35 fake claims filed across 3 districts', severity: 'high' },
  { caseMasterId: 432, crimeNo: '3 0551 0099 2026 00432', crimeType: CrimeCategory.CrimesAgainstWomen, district: KarnatakaDistrict.Belgaum, policeStation: 'Women PS', registeredDate: '2026-07-17T10:15:00', briefFacts: 'Dowry harassment case, victim rescued by Mahila Samanvaya cell', severity: 'medium' },
];

const STUB_DETAILS: Record<number, FIRDetail> = {
  421: { caseMasterId: 421, crimeNo: '1 0443 0006 2026 00421', crimeType: CrimeCategory.CyberCrimes, district: KarnatakaDistrict.BangaloreUrban, policeStation: 'Cyber Crime PS', registeredDate: '2026-07-21T14:30:00', incidentFromDate: '2026-07-15T00:00:00', incidentToDate: '2026-07-20T23:59:00', briefFacts: 'Phishing attack targeting 40+ bank customers using cloned SBI portal. Investigation traced 3 mule accounts and a Romanian IP origin.', severity: 'high', complainantName: 'SBI Fraud Dept', accusedName: 'Unknown / John Doe alias', status: CaseStatus.UnderInvestigation, isCybercrime: true, financialLoss: 1875000 },
  422: { caseMasterId: 422, crimeNo: '1 0443 0006 2026 00422', crimeType: CrimeCategory.CrimesAgainstWomen, district: KarnatakaDistrict.Mysuru, policeStation: 'Women PS', registeredDate: '2026-07-21T12:15:00', incidentFromDate: '2026-06-01T00:00:00', incidentToDate: '2026-07-20T23:59:00', briefFacts: 'Harassment via anonymous social media accounts, 14 identified victims. 6 accounts traced to 3 IPs in Bengaluru.', severity: 'critical', complainantName: 'Anita R (14 victims collective)', accusedName: 'StalkerNet handle', status: CaseStatus.UnderInvestigation, isCybercrime: true },
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
  for (const alias of Object.keys(CRIME_ALIASES)) {
    if (lower.includes(alias)) {
      parsed.crimeCategory = CRIME_ALIASES[alias];
      break;
    }
  }
  const foundArea = AREA_KEYWORDS.find((a) => lower.includes(a));
  if (foundArea) parsed.area = foundArea;
  const foundDate = DATE_KEYWORDS.find((d) => lower.includes(d));
  if (foundDate) parsed.dateRange = foundDate;
  return parsed;
}

export async function searchFIR(query: string): Promise<SearchResponse> {
  await new Promise((r) => setTimeout(r, 150));
  const q = query.toLowerCase();
  const parsed = parseQuery(query);
  let filtered = STUB_RESULTS;
  if (q) {
    filtered = STUB_RESULTS.filter(
      (r) =>
        r.crimeNo.toLowerCase().includes(q) ||
        r.district.toLowerCase().includes(q) ||
        r.crimeType.toLowerCase().includes(q) ||
        r.briefFacts.toLowerCase().includes(q),
    );
    if (parsed.district) {
      filtered = filtered.filter((r) =>
        r.district.toLowerCase().includes(parsed.district!.toLowerCase().split(' ')[0]),
      );
    }
    if (parsed.crimeCategory) {
      filtered = filtered.filter((r) =>
        r.crimeType.toLowerCase().includes(parsed.crimeCategory!.toLowerCase().split(' ')[0]),
      );
    }
  }
  return { results: filtered, parsed };
}

export async function getFIRDetail(id: number): Promise<FIRDetail | null> {
  await new Promise((r) => setTimeout(r, 80));
  return STUB_DETAILS[id] || STUB_DETAILS[421];
}
