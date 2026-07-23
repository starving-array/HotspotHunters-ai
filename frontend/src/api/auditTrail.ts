import { AuditAction } from '../types/enums';
import type { AuditEvent } from '../types';

const STUB_AUDIT: AuditEvent[] = [
  { id: 9001, userId: 'dsp_murali', action: AuditAction.Query, resource: '/api/v1/fir-search?q=cyber', ip: '10.0.42.18', timestamp: '2026-07-23T14:32:11' },
  { id: 9002, userId: 'io_anita', action: AuditAction.Login, resource: 'web-portal', ip: '10.0.42.24', timestamp: '2026-07-23T14:28:04' },
  { id: 9003, userId: 'sp_kumar', action: AuditAction.Export, resource: '/api/v1/reports/hotspots.csv', ip: '10.0.42.07', timestamp: '2026-07-23T14:15:52' },
  { id: 9004, userId: 'dsp_murali', action: AuditAction.View, resource: '/network', ip: '10.0.42.18', timestamp: '2026-07-23T14:02:33' },
  { id: 9005, userId: 'sys_alert', action: AuditAction.Alert, resource: 'cyber#501 critical', ip: '127.0.0.1', timestamp: '2026-07-23T13:54:21' },
  { id: 9006, userId: 'io_anita', action: AuditAction.Query, resource: '/api/v1/cases/422', ip: '10.0.42.24', timestamp: '2026-07-23T13:48:09' },
  { id: 9007, userId: 'ig_office', action: AuditAction.View, resource: '/overview', ip: '10.0.42.01', timestamp: '2026-07-23T13:30:00' },
  { id: 9008, userId: 'sp_kumar', action: AuditAction.Login, resource: 'web-portal', ip: '10.0.42.07', timestamp: '2026-07-23T13:12:45' },
  { id: 9009, userId: 'io_rohit', action: AuditAction.Export, resource: '/api/v1/reports/io-leaderboard.csv', ip: '10.0.42.31', timestamp: '2026-07-23T12:58:30' },
  { id: 9010, userId: 'sys_alert', action: AuditAction.Alert, resource: 'anomaly#88 z-score spike', ip: '127.0.0.1', timestamp: '2026-07-23T12:42:18' },
  { id: 9011, userId: 'io_anita', action: AuditAction.Query, resource: '/api/v1/fir-search?q=Bengaluru', ip: '10.0.42.24', timestamp: '2026-07-23T11:20:14' },
  { id: 9012, userId: 'dsp_murali', action: AuditAction.Login, resource: 'web-portal', ip: '10.0.42.18', timestamp: '2026-07-23T09:05:00' },
];

export async function getAuditTrail(filters?: {
  action?: AuditAction | 'all';
  startDate?: string;
  endDate?: string;
}): Promise<AuditEvent[]> {
  await new Promise((r) => setTimeout(r, 50));
  let out = STUB_AUDIT.slice();
  if (filters?.action && filters.action !== 'all') {
    out = out.filter((e) => e.action === filters.action);
  }
  if (filters?.startDate) {
    out = out.filter((e) => e.timestamp >= filters.startDate!);
  }
  if (filters?.endDate) {
    out = out.filter((e) => e.timestamp <= filters.endDate!);
  }
  return out.sort((a, b) => b.timestamp.localeCompare(a.timestamp));
}
