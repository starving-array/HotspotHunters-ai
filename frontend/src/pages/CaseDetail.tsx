import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  ArrowLeft, FileText, MapPin, Calendar, Shield, DollarSign, User, Users, Scale,
  AlertTriangle, Clock, Link2, Activity, Building, BadgeCheck, ChevronRight,
} from 'lucide-react';
import type { CaseDetail as CaseDetailType } from '../types';
import { getCaseDetail } from '../api/cases';
import FullPageLoader from '../components/FullPageLoader';

const SEVERITY_COLORS: Record<string, { dot: string; bg: string; text: string }> = {
  critical: { dot: 'bg-error', bg: 'bg-error/10', text: 'text-error' },
  high: { dot: 'bg-tertiary', bg: 'bg-tertiary/10', text: 'text-tertiary' },
  medium: { dot: 'bg-primary', bg: 'bg-primary/10', text: 'text-primary' },
  low: { dot: 'bg-outline', bg: 'bg-outline/10', text: 'text-outline' },
};

function Label({ icon, text }: { icon: React.ReactNode; text: string }) {
  return (
    <div className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-widest text-outline mb-2">
      {icon}
      <span>{text}</span>
    </div>
  );
}

function Field({ label, value }: { label: string; value: string | number | undefined | null }) {
  const display = value != null && value !== '' ? String(value) : '\u2014';
  return (
    <div>
      <div className="text-[11px] text-outline mb-0.5">{label}</div>
      <div className="text-[13px] text-on-surface font-mono tabular-nums">{display}</div>
    </div>
  );
}

function InfoCard({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={`bg-surface-container/80 backdrop-blur-md border border-outline-variant/50 rounded-xl p-4 ${className}`}>
      {children}
    </div>
  );
}

export default function CaseDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [detail, setDetail] = useState<CaseDetailType | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!id) return;
    setLoading(true);
    setError(null);
    getCaseDetail(Number(id))
      .then(setDetail)
      .catch((e) => {
        if (e?.response?.status === 404) setError('Case not found');
        else setError('Failed to load case details');
      })
      .finally(() => setLoading(false));
  }, [id]);

  if (loading) return <FullPageLoader />;

  if (error || !detail) {
    return (
      <div className="flex flex-col items-center justify-center h-full gap-4">
        <AlertTriangle className="w-10 h-10 text-error" />
        <p className="text-on-surface-variant text-[14px]">{error || 'Case not found'}</p>
        <button
          onClick={() => navigate(-1)}
          className="flex items-center gap-2 h-8 px-3 rounded-lg border border-outline-variant/50 text-on-surface-variant hover:text-on-surface text-[11px] font-semibold"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          Go Back
        </button>
      </div>
    );
  }

  const sev = SEVERITY_COLORS[detail.cyber_severity] || SEVERITY_COLORS.low;

  return (
    <div className="flex flex-col h-full gap-4 overflow-y-auto pr-1">
      <div className="flex items-start gap-4 shrink-0">
        <button
          onClick={() => navigate(-1)}
          className="w-8 h-8 mt-1 flex items-center justify-center rounded-lg border border-outline-variant/30 text-on-surface-variant hover:bg-surface-variant transition-colors shrink-0"
        >
          <ArrowLeft className="w-4 h-4" />
        </button>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-3 mb-1">
            <h1 className="text-[24px] font-semibold text-on-surface tracking-tight truncate font-mono">
              {detail.crime_no}
            </h1>
            {detail.case_no && (
              <span className="text-[13px] text-on-surface-variant font-mono px-2 py-0.5 rounded bg-surface-variant">
                {detail.case_no}
              </span>
            )}
            {detail.cyber_severity && (
              <span className={`text-[10px] font-semibold uppercase tracking-widest px-2 py-0.5 rounded-full ${sev.bg} ${sev.text}`}>
                {detail.cyber_severity}
              </span>
            )}
          </div>
          <div className="flex items-center gap-3 text-[13px] text-on-surface-variant">
            <span className="flex items-center gap-1">
              <Calendar className="w-3.5 h-3.5" />
              {new Date(detail.crime_registered_date).toLocaleDateString('en-IN', { year: 'numeric', month: 'short', day: 'numeric' })}
            </span>
            <span className="text-outline">·</span>
            <span className="flex items-center gap-1">
              <Building className="w-3.5 h-3.5" />
              {detail.police_station_name || detail.district_name}
            </span>
            <span className="text-outline">·</span>
            <span className={`flex items-center gap-1 px-1.5 py-0.5 rounded text-[11px] font-semibold ${detail.case_category ? 'bg-primary/10 text-primary' : 'text-outline'}`}>
              <BadgeCheck className="w-3 h-3" />
              {detail.case_category || 'N/A'}
            </span>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2 space-y-4">
          <InfoCard>
            <Label icon={<FileText className="w-3.5 h-3.5" />} text="Case Information" />
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              <Field label="Crime No." value={detail.crime_no} />
              <Field label="Case No." value={detail.case_no} />
              <Field label="Category" value={detail.case_category} />
              <Field label="Gravity" value={detail.gravity_offence} />
              <Field label="Major Head" value={detail.crime_major_head} />
              <Field label="Minor Head" value={detail.crime_minor_head} />
              <Field label="Status" value={detail.case_status_name} />
              <Field label="Court" value={detail.court_name} />
              <Field label="District" value={detail.district_name} />
              <Field label="Police Station" value={detail.police_station_name} />
              <Field label="IO Name" value={detail.police_person_name} />
              <Field label="Registered Date" value={detail.crime_registered_date} />
            </div>
            {detail.brief_facts && (
              <div className="mt-4 pt-4 border-t border-outline-variant/20">
                <div className="text-[11px] text-outline mb-1.5 font-semibold uppercase tracking-widest">Brief Facts</div>
                <p className="text-[13px] text-on-surface-variant leading-relaxed">{detail.brief_facts}</p>
              </div>
            )}
          </InfoCard>

          <InfoCard>
            <Label icon={<Activity className="w-3.5 h-3.5" />} text="Timeline" />
            <div className="relative pl-5 space-y-0">
              {detail.timeline.map((event, i) => (
                <div key={i} className="relative pb-4 last:pb-0">
                  {i < detail.timeline.length - 1 && (
                    <div className="absolute left-[-11px] top-3 bottom-0 w-px bg-outline-variant/30" />
                  )}
                  <div className="absolute left-[-15px] top-1.5 w-2 h-2 rounded-full bg-primary/60 border-2 border-surface-container" />
                  <div className="text-[11px] text-outline font-mono tabular-nums mb-0.5">
                    {event.date || '\u2014'}
                  </div>
                  <div className="text-[13px] text-on-surface font-semibold">{event.action}</div>
                  <div className="text-[12px] text-on-surface-variant">by {event.actor}</div>
                  {event.description && (
                    <div className="text-[12px] text-on-surface-variant mt-0.5">{event.description}</div>
                  )}
                </div>
              ))}
            </div>
          </InfoCard>

          {detail.related_cases.length > 0 && (
            <InfoCard>
              <Label icon={<Link2 className="w-3.5 h-3.5" />} text="Related Cases" />
              <div className="space-y-2">
                {detail.related_cases.map((rc) => (
                  <div
                    key={rc.case_master_id}
                    onClick={() => navigate(`/cases/${rc.case_master_id}`)}
                    className="flex items-center gap-3 p-3 rounded-lg bg-surface-container-low border border-outline-variant/20 hover:bg-surface-variant cursor-pointer transition-colors group"
                  >
                    <FileText className="w-4 h-4 text-primary shrink-0" />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-[13px] text-primary font-semibold">{rc.crime_no}</span>
                        <span className="text-[10px] text-on-surface-variant bg-surface-variant px-1.5 py-0.5 rounded">{rc.district_name}</span>
                      </div>
                      <div className="text-[12px] text-on-surface-variant mt-0.5">{rc.crime_major_head} — {rc.status}</div>
                    </div>
                    <ChevronRight className="w-4 h-4 text-outline group-hover:text-primary transition-colors shrink-0" />
                  </div>
                ))}
              </div>
            </InfoCard>
          )}
        </div>

        <div className="space-y-4">
          <InfoCard>
            <Label icon={<Users className="w-3.5 h-3.5" />} text="People Involved" />
            <div className="space-y-3">
              <div className="flex items-start gap-3 p-3 rounded-lg bg-surface-container-low border border-outline-variant/20">
                <div className="w-8 h-8 rounded-full bg-primary/15 flex items-center justify-center shrink-0">
                  <User className="w-4 h-4 text-primary" />
                </div>
                <div className="min-w-0">
                  <div className="text-[11px] text-outline font-semibold uppercase tracking-widest">Complainant</div>
                  <div className="text-[13px] text-on-surface font-mono truncate">{detail.complainant_name || '\u2014'}</div>
                </div>
              </div>
              <div className="flex items-start gap-3 p-3 rounded-lg bg-surface-container-low border border-outline-variant/20">
                <div className="w-8 h-8 rounded-full bg-tertiary/15 flex items-center justify-center shrink-0">
                  <User className="w-4 h-4 text-tertiary" />
                </div>
                <div className="min-w-0">
                  <div className="text-[11px] text-outline font-semibold uppercase tracking-widest">Suspect</div>
                  <div className="text-[13px] text-on-surface font-mono truncate">{detail.suspect_name || '\u2014'}</div>
                </div>
              </div>
              <div className="flex items-start gap-3 p-3 rounded-lg bg-surface-container-low border border-outline-variant/20">
                <div className="w-8 h-8 rounded-full bg-error/15 flex items-center justify-center shrink-0">
                  <User className="w-4 h-4 text-error" />
                </div>
                <div className="min-w-0">
                  <div className="text-[11px] text-outline font-semibold uppercase tracking-widest">Victim</div>
                  <div className="text-[13px] text-on-surface font-mono truncate">{detail.victim_name || '\u2014'}</div>
                </div>
              </div>
            </div>
          </InfoCard>

          <InfoCard>
            <Label icon={<MapPin className="w-3.5 h-3.5" />} text="Incident Details" />
            <div className="space-y-3">
              <Field label="From Date" value={detail.incident_from_date} />
              <Field label="To Date" value={detail.incident_to_date} />
              <Field label="Info Received at PS" value={detail.info_received_psdate} />
              {detail.latitude != null && detail.longitude != null && (
                <div>
                  <div className="text-[11px] text-outline mb-0.5">Coordinates</div>
                  <div className="text-[13px] text-on-surface font-mono tabular-nums">
                    {detail.latitude.toFixed(4)}, {detail.longitude.toFixed(4)}
                  </div>
                </div>
              )}
            </div>
          </InfoCard>

          {(detail.chargesheet_date || detail.chargesheet_type) && (
            <InfoCard>
              <Label icon={<Scale className="w-3.5 h-3.5" />} text="Charge Sheet" />
              <div className="space-y-3">
                <Field label="Date" value={detail.chargesheet_date} />
                <Field label="Type" value={detail.chargesheet_type} />
              </div>
            </InfoCard>
          )}

          {detail.is_cybercrime && (
            <InfoCard>
              <Label icon={<Shield className="w-3.5 h-3.5" />} text="Cyber Crime" />
              <div className="space-y-3">
                <Field label="Platform" value={detail.primary_platform} />
                <Field label="Financial Loss" value={detail.financial_loss ? `\u20B9 ${Number(detail.financial_loss).toLocaleString('en-IN')}` : '\u2014'} />
                <div className="flex items-center gap-2">
                  <span className={`w-2 h-2 rounded-full ${sev.dot}`} />
                  <span className="text-[13px] text-on-surface font-mono">Severity: {detail.cyber_severity}</span>
                </div>
              </div>
            </InfoCard>
          )}

          {detail.indicators.length > 0 && (
            <InfoCard>
              <Label icon={<Activity className="w-3.5 h-3.5" />} text={`Indicators (${detail.indicators.length})`} />
              <div className="space-y-2">
                {detail.indicators.map((ind) => (
                  <div key={ind.indicator_id} className="flex items-center gap-2 p-2 rounded bg-surface-container-low border border-outline-variant/20">
                    <span className={`w-1.5 h-1.5 rounded-full ${ind.is_active ? 'bg-error' : 'bg-outline'}`} />
                    <div className="flex-1 min-w-0">
                      <div className="text-[11px] font-mono text-on-surface truncate">{ind.indicator_value}</div>
                      <div className="text-[10px] text-outline uppercase tracking-wider">{ind.indicator_type}</div>
                    </div>
                  </div>
                ))}
              </div>
            </InfoCard>
          )}

          <InfoCard>
            <Label icon={<Clock className="w-3.5 h-3.5" />} text="Last Updated" />
            <div className="text-[13px] text-on-surface font-mono tabular-nums">
              {detail.last_updated ? new Date(detail.last_updated).toLocaleString('en-IN') : '\u2014'}
            </div>
          </InfoCard>
        </div>
      </div>
    </div>
  );
}
