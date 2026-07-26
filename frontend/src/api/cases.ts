import type { CaseDetail } from '../types';
import axios from 'axios';

export async function getCaseDetail(caseMasterId: number): Promise<CaseDetail> {
  const res = await axios.get(`/api/v1/cases/${caseMasterId}`);
  return res.data;
}
