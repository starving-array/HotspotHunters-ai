import axios from 'axios';

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

export async function getIODashboard(): Promise<IODashboardData> {
  const res = await axios.get('/api/v1/io/dashboard');
  return res.data as IODashboardData;
}
