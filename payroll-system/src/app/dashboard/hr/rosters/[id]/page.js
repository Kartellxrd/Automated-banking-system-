'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { AlertTriangle, ArrowLeft, Building2, CheckCircle2, Clock3, ExternalLink, FileText, Loader2, RefreshCw, Send, Users, XCircle } from 'lucide-react';
import HRSideNav from '@/components/hr/HRSideNav';
import HRNavbar from '@/components/hr/HRNavbar';

function formatDateTime(value) {
  if (!value) return '—';
  try { return new Date(value).toLocaleString(); } catch { return value; }
}

function formatTime(value) {
  if (!value) return '—';
  try { return new Date(value).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }); } catch { return value; }
}

export default function HRRosterDetailPage() {
  const params = useParams();
  const router = useRouter();
  const id = params?.id;
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [decisionLoading, setDecisionLoading] = useState(false);
  const [rejecting, setRejecting] = useState(false);
  const [reason, setReason] = useState('');

  const load = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    setError('');
    try {
      const response = await fetch(`/api/hr/rosters/${id}`, { cache: 'no-store' });
      const result = await response.json();
      if (!response.ok || !result.success) throw new Error(result.error || 'Could not load roster.');
      setData(result.data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => { load(); }, [load]);

  const canDecide = data?.roster?.status === 'submitted_to_hr';
  const title = data ? `${data.site?.site_name || 'Site'} • ${data.roster.shift_date}` : 'Roster Review';

  const submitDecision = async (decision) => {
    if (decision === 'reject' && !reason.trim()) {
      setError('Enter a rejection reason before returning the roster.');
      return;
    }
    setDecisionLoading(true);
    setError('');
    try {
      const response = await fetch(`/api/hr/rosters/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ decision, reason: reason.trim() }),
      });
      const result = await response.json();
      if (!response.ok || !result.success) throw new Error(result.error || 'Roster review failed.');
      setRejecting(false);
      setReason('');
      await load();
    } catch (err) {
      setError(err.message);
    } finally {
      setDecisionLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-100 flex flex-col lg:flex-row text-slate-900">
      <HRSideNav />
      <div className="flex-1 min-w-0">
        <HRNavbar />
        <main className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <Link href="/dashboard/hr/rosters" className="inline-flex items-center gap-2 text-sm font-bold text-slate-600 hover:text-indigo-600"><ArrowLeft className="w-4 h-4" />Back to roster queue</Link>
            <button onClick={load} className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-xs font-bold"><RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />Refresh</button>
          </div>

          {error && <div className="rounded-2xl border border-rose-200 bg-rose-50 p-4 text-sm font-semibold text-rose-700 flex items-center gap-2"><AlertTriangle className="w-4 h-4" />{error}</div>}

          {loading ? (
            <div className="rounded-3xl border border-slate-200 bg-white p-20 flex items-center justify-center gap-2 text-sm text-slate-500"><Loader2 className="w-5 h-5 animate-spin text-indigo-600" />Loading roster evidence...</div>
          ) : data ? (
            <>
              <section className="rounded-3xl bg-slate-950 text-white p-6 shadow-md flex flex-col lg:flex-row lg:items-center justify-between gap-5">
                <div className="flex items-start gap-4"><div className="rounded-2xl bg-indigo-500/15 border border-indigo-400/20 p-3 text-indigo-300"><Building2 className="w-6 h-6" /></div><div><p className="text-[10px] uppercase tracking-[0.18em] text-slate-400 font-bold">Roster Evidence Review</p><h1 className="mt-1 text-2xl font-black">{title}</h1><p className="mt-2 text-sm text-slate-400">Submitted by {data.submitted_by?.name || 'Unknown Site Clerk'} • {formatDateTime(data.roster.submitted_at)} • Version {data.roster.version}</p></div></div>
                <StatusBadge status={data.roster.status} />
              </section>

              {data.roster.status === 'rejected' && <div className="rounded-2xl border border-rose-200 bg-rose-50 p-4"><div className="font-black text-rose-800">Rejection reason</div><p className="mt-1 text-sm text-rose-700">{data.roster.rejection_reason}</p></div>}

              <section className="grid grid-cols-2 lg:grid-cols-4 gap-3"><Metric label="Workers" value={data.totals.workers} icon={Users} /><Metric label="Worked Hours" value={`${data.totals.worked_hours}h`} icon={Clock3} /><Metric label="Regular Hours" value={`${data.totals.regular_hours}h`} icon={CheckCircle2} /><Metric label="Overtime" value={`${data.totals.overtime_hours}h`} icon={Clock3} /></section>

              <section className="grid grid-cols-1 xl:grid-cols-12 gap-6 items-start">
                <div className="xl:col-span-5 rounded-3xl border border-slate-200 bg-white p-5 shadow-sm xl:sticky xl:top-24">
                  <div className="flex items-center justify-between gap-3 pb-4 border-b border-slate-100"><div><h2 className="font-black flex items-center gap-2"><FileText className="w-5 h-5 text-indigo-600" />Original Paper Timesheet</h2><p className="text-xs text-slate-500 mt-1">Uploaded evidence from the Site Clerk workflow.</p></div>{data.upload?.preview_url && <a href={data.upload.preview_url} target="_blank" rel="noreferrer" className="p-2.5 rounded-xl bg-slate-100 text-slate-600"><ExternalLink className="w-4 h-4" /></a>}</div>
                  <div className="mt-4 rounded-2xl border border-slate-200 bg-slate-100 overflow-hidden min-h-[520px] flex items-center justify-center">
                    {!data.upload?.preview_url ? <div className="p-8 text-center text-sm text-slate-500"><FileText className="w-10 h-10 text-slate-300 mx-auto mb-3" />No uploaded paper is attached to this roster.</div> : data.upload.mime_type === 'application/pdf' ? <iframe src={data.upload.preview_url} title="Original paper timesheet" className="w-full h-[620px] bg-white" /> : <img src={data.upload.preview_url} alt="Original paper timesheet" className="max-w-full max-h-[700px] object-contain" />}
                  </div>
                  {data.upload && <div className="mt-3 text-xs text-slate-500"><span className="font-bold text-slate-700">{data.upload.original_filename}</span><br />Uploaded {formatDateTime(data.upload.uploaded_at)}</div>}
                </div>

                <div className="xl:col-span-7 rounded-3xl border border-slate-200 bg-white shadow-sm overflow-hidden">
                  <div className="p-5 border-b border-slate-100"><h2 className="font-black">Digital Attendance</h2><p className="text-xs text-slate-500 mt-1">Compare each entry against the original paper before making a decision.</p></div>
                  <div className="overflow-x-auto"><table className="w-full text-left"><thead className="bg-slate-50 text-[10px] uppercase tracking-wider text-slate-400"><tr><th className="px-4 py-3">Employee</th><th className="px-4 py-3">State</th><th className="px-4 py-3">In</th><th className="px-4 py-3">Out</th><th className="px-4 py-3">Regular</th><th className="px-4 py-3">OT</th><th className="px-4 py-3">Rate Snapshot</th></tr></thead><tbody className="divide-y divide-slate-100">{data.entries.map((entry) => <tr key={entry.id} className="text-sm"><td className="px-4 py-4"><div className="font-bold text-slate-900">{entry.employee?.name || 'Unknown employee'}</div><div className="text-[11px] text-slate-400">{entry.employee?.employee_code || 'No code'} • {entry.employee?.job_role || 'No role'}</div></td><td className="px-4 py-4 capitalize font-semibold">{entry.attendance_state}</td><td className="px-4 py-4 font-mono text-xs">{formatTime(entry.clock_in)}</td><td className="px-4 py-4 font-mono text-xs">{formatTime(entry.clock_out)}</td><td className="px-4 py-4 font-bold">{Number(entry.regular_hours || 0).toFixed(2)}h</td><td className="px-4 py-4 font-bold text-amber-700">{Number(entry.overtime_hours || 0).toFixed(2)}h</td><td className="px-4 py-4 font-bold">P{Number(entry.hourly_rate_snapshot || 0).toFixed(2)}</td></tr>)}</tbody></table></div>
                </div>
              </section>

              {canDecide && (
                <section className="rounded-3xl border border-slate-200 bg-white p-5 sm:p-6 shadow-sm">
                  <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4"><div><h2 className="font-black">HR Decision</h2><p className="mt-1 text-sm text-slate-500">Approve only after comparing the paper evidence and digital attendance. Reject instead of editing Site Clerk hours yourself.</p></div><div className="flex flex-col sm:flex-row gap-3"><button disabled={decisionLoading} onClick={() => setRejecting(true)} className="inline-flex items-center justify-center gap-2 rounded-xl border border-rose-200 bg-rose-50 px-5 py-3 text-sm font-bold text-rose-700 disabled:opacity-50"><XCircle className="w-4 h-4" />Reject Roster</button><button disabled={decisionLoading} onClick={() => submitDecision('approve')} className="inline-flex items-center justify-center gap-2 rounded-xl bg-emerald-600 px-5 py-3 text-sm font-bold text-white hover:bg-emerald-700 disabled:opacity-50">{decisionLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}Approve for Payroll</button></div></div>

                  {rejecting && <div className="mt-5 rounded-2xl border border-rose-200 bg-rose-50 p-4"><label className="text-xs font-bold text-rose-800">Rejection reason *</label><textarea value={reason} onChange={(e) => setReason(e.target.value)} rows={3} placeholder="Explain exactly what the Site Clerk must correct..." className="mt-2 w-full rounded-xl border border-rose-200 bg-white p-3 text-sm outline-none" /><div className="mt-3 flex justify-end gap-2"><button onClick={() => { setRejecting(false); setReason(''); }} className="rounded-xl px-4 py-2 text-xs font-bold text-slate-600">Cancel</button><button disabled={decisionLoading || !reason.trim()} onClick={() => submitDecision('reject')} className="inline-flex items-center gap-2 rounded-xl bg-rose-600 px-4 py-2 text-xs font-bold text-white disabled:opacity-50">{decisionLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}Return to Site Clerk</button></div></div>}
                </section>
              )}
            </>
          ) : null}
        </main>
      </div>
    </div>
  );
}

function StatusBadge({ status }) {
  const map = {
    submitted_to_hr: ['Waiting for HR', 'bg-amber-500/15 text-amber-300 border-amber-400/20'],
    approved: ['Approved', 'bg-emerald-500/15 text-emerald-300 border-emerald-400/20'],
    rejected: ['Rejected', 'bg-rose-500/15 text-rose-300 border-rose-400/20'],
  };
  const [label, className] = map[status] || [status, 'bg-slate-700 text-slate-200 border-slate-600'];
  return <span className={`rounded-full border px-3 py-1.5 text-xs font-bold ${className}`}>{label}</span>;
}

function Metric({ label, value, icon: Icon }) {
  return <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm flex items-center justify-between gap-3"><div><div className="text-[10px] uppercase tracking-wider font-bold text-slate-500">{label}</div><div className="mt-1 text-xl font-black">{value}</div></div><div className="rounded-xl bg-indigo-50 text-indigo-600 p-2.5"><Icon className="w-5 h-5" /></div></div>;
}
