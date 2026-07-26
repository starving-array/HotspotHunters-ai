import axios from 'axios';
import { AuditAction } from '../types/enums';
import type { AuditEvent, Severity } from '../types';

export async function getAuditTrail(filters?: {
  action?: AuditAction | 'all';
  startDate?: string;
  endDate?: string;
}): Promise<AuditEvent[]> {
  const params: Record<string, string | number> = {};
  if (filters?.action && filters.action !== 'all') {
    params.action = filters.action;
  }
  params.limit = 100;

  const res = await axios.get('/api/v1/audit', { params });
  const data = res.data as Array<{
    auditId: string;
    officerId: string;
    actionType: string;
    endpointCalled: string;
    ipAddress: string;
    loggedAt: string;
  }>;

  let out: AuditEvent[] = data.map(d => ({
    id: d.auditId,
    userId: d.officerId,
    action: (d.actionType.toUpperCase() as AuditAction),
    resource: d.endpointCalled,
    ip: d.ipAddress,
    timestamp: d.loggedAt,
  }));

  if (filters?.startDate) {
    out = out.filter((e) => e.timestamp >= filters.startDate!);
  }
  if (filters?.endDate) {
    out = out.filter((e) => e.timestamp <= filters.endDate!);
  }
  return out.sort((a, b) => b.timestamp.localeCompare(a.timestamp));
}
