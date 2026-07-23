export interface IOKpi {
  activeIOs: number;
  avgCasesPerIO: number;
  topArrestRate: number;
}

export interface IORow {
  employeeId: number;
  firstName: string;
  rankName: string;
  unitName: string;
  casesCount: number;
  arrestsCount: number;
  clearanceRate: number;
}

export interface IODashboardData {
  kpis: IOKpi;
  leaderboard: IORow[];
}

const STUB_DATA: IODashboardData = {
  kpis: {
    activeIOs: 142,
    avgCasesPerIO: 13,
    topArrestRate: 87,
  },
  leaderboard: [
    { employeeId: 1001, firstName: 'Inspector Prakash Kumar', rankName: 'Inspector', unitName: 'Cyber Crime Cell', casesCount: 38, arrestsCount: 21, clearanceRate: 78 },
    { employeeId: 1002, firstName: 'SI Meena Nair', rankName: 'Sub-Inspector', unitName: 'Women PS', casesCount: 34, arrestsCount: 19, clearanceRate: 71 },
    { employeeId: 1003, firstName: 'ASI Rajesh Gowda', rankName: 'ASI', unitName: 'Mysuru PS', casesCount: 31, arrestsCount: 14, clearanceRate: 64 },
    { employeeId: 1004, firstName: 'HC Suresh Patil', rankName: 'Head Constable', unitName: 'Belgaum PS', casesCount: 29, arrestsCount: 11, clearanceRate: 58 },
    { employeeId: 1005, firstName: 'PC Anita Shetty', rankName: 'Constable', unitName: 'Dakshina Kannada', casesCount: 27, arrestsCount: 9, clearanceRate: 48 },
    { employeeId: 1006, firstName: 'SI Deepak Rao', rankName: 'Sub-Inspector', unitName: 'Kalaburagi PS', casesCount: 25, arrestsCount: 8, clearanceRate: 44 },
    { employeeId: 1007, firstName: 'Inspector Kavya R', rankName: 'Inspector', unitName: 'Economic Offences', casesCount: 24, arrestsCount: 17, clearanceRate: 82 },
    { employeeId: 1008, firstName: 'ASI Vinay Hegde', rankName: 'ASI', unitName: 'Tumakuru PS', casesCount: 22, arrestsCount: 7, clearanceRate: 41 },
    { employeeId: 1009, firstName: 'HC Lakshmi Devi', rankName: 'Head Constable', unitName: 'Hubballi PS', casesCount: 20, arrestsCount: 6, clearanceRate: 36 },
    { employeeId: 1010, firstName: 'PC Manjunath S', rankName: 'Constable', unitName: 'Dharwad PS', casesCount: 18, arrestsCount: 5, clearanceRate: 28 },
  ],
};

export async function getIODashboard(): Promise<IODashboardData> {
  await new Promise((r) => setTimeout(r, 50));
  return STUB_DATA;
}
