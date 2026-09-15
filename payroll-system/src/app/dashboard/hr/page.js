'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { AlertTriangle, ArrowRight, Building2, CheckCircle2, ClipboardCheck, Loader2, RefreshCw, Users, XCircle } from 'lucide-react';
import HRSideNav from '@/components/hr/HRSideNav';
import HRNavbar from '@/components/hr/HRNavbar';

const STATUS = {
  submitted_to_hr: { label: 'Waiting for HR', className: 'bg-amber-50 text-amber-700 border-amber-200' },
  approved: { label: 'Approved', className: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
  rejected: { label: 'Rejected', className: 'bg-rose-50 text-rose-700 border-rose-200' },
};

export default function HRDashboardPage() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const response = await fetch('/api/hr/dashboard', { cache: 'no-store' });
      const result = await response.json();
      if (!response.ok || !result.success) throw new Error(result.error || 'Could not load HR dashboard.');
      setData(result.data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const stats = data?.stats || {};
  const pending = data?.pending_rosters || [];

  return (
    <div className="min-h-screen bg-slate-100 flex flex-col lg:flex-row text-slate-900">
      <HRSideNav />
      <div className="flex-1 min-w-0">
        <HRNavbar />
        <main className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto space-y-6">
          <section className="rounded-3xl bg-slate-950 text-white p-6 sm:p-7 shadow-md flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <p className="text-[11px] uppercase tracking-[0.18em] font-bold text-indigo-300">HR & Workforce Control</p>
              <h1 className="mt-2 text-2xl sm:text-3xl font-black">Review attendance. Manage employees. Protect the payroll gate.</h1>
              <p className="mt-2 text-sm text-slate-400 max-w-2xl">Site Clerks submit verified paper-backed rosters here. HR approves or rejects them before Accountant can use the attendance for payroll.</p>
            </div>
            <Link href="/dashboard/hr/employees" className="inline-flex items-center justify-center gap-2 rounded-2xl bg-indigo-600 px-5 py-3 text-sm font-bold hover:bg-indigo-500 shrink-0"><Users className="w-4 h-4" />Manage Employees</Link>
          </section>

          {error && <div className="rounded-2xl border border-rose-200 bg-rose-50 p-4 flex items-center justify-between gap-3 text-sm font-semibold text-rose-700"><span className="flex items-center gap-2"><AlertTriangle className="w-4 h-4" />{error}</span><button onClick={load} className="rounded-xl bg-white border border-rose-200 px-3 py-2 text-xs flex items-center gap-2"><RefreshCw className="w-4 h-4" />Retry</button></div>}

          <section className="grid grid-cols-2 xl:grid-cols-4 gap-3 sm:gap-4">
            <Metric title="Active Employees" value={stats.active_employees ?? 0} icon={Users} />
            <Metric title="Waiting for HR" value={stats.pending_rosters ?? 0} icon={ClipboardCheck} warn={Number(stats.pending_rosters || 0) > 0} />
            <Metric title="Approved Rosters" value={stats.approved_rosters ?? 0} icon={CheckCircle2} />
            <Metric title="Rejected Rosters" value={stats.rejected_rosters ?? 0} icon={XCircle} />
          </section>

          <section className="rounded-3xl border border-slate-200 bg-white shadow-sm overflow-hidden">
            <div className="p-5 sm:p-6 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div><h2 className="text-lg font-black">Rosters Waiting for Review</h2><p className="text-xs text-slate-500 mt-1">All active sites feed into this queue. Site selection is a filter, not an authority boundary.</p></div>
              <Link href="/dashboard/hr/rosters" className="inline-flex items-center gap-2 text-sm font-bold text-indigo-600">Open full queue <ArrowRight className="w-4 h-4" /></Link>
            </div>

            {loading ? (
              <div className="p-16 flex items-center justify-center gap-2 text-sm text-slate-500"><Loader2 className="w-5 h-5 animate-spin text-indigo-600" />Loading submitted rosters...</div>
            ) : pending.length === 0 ? (
              <div className="p-12 text-center"><CheckCircle2 className="w-9 h-9 text-emerald-500 mx-auto" /><h3 className="mt-3 font-black">Nothing waiting for HR</h3><p className="mt-1 text-sm text-slate-500">New Site Clerk submissions will appear here automatically.</p></div>
            ) : (
              <div className="divide-y divide-slate-100">
                {pending.map((roster) => {
                  const status = STATUS[roster.status] || STATUS.submitted_to_hr;
                  return (
                    <div key={roster.id} className="p-5 sm:p-6 flex flex-col lg:flex-row lg:items-center justify-between gap-4 hover:bg-slate-50/60">
                      <div className="flex items-start gap-3">
                        <div className="rounded-2xl bg-indigo-50 p-3 text-indigo-600"><Building2 className="w-5 h-5" /></div>
                        <div><div className="flex flex-wrap items-center gap-2"><h3 className="font-black">{roster.site_name}</h3><span className={`rounded-full border px-2.5 py-1 text-[10px] font-bold ${status.className}`}>{status.label}</span></div><p className="mt-1 text-xs text-slate-500">{roster.shift_date} • Version {roster.version} • submitted by {roster.submitted_by_name}</p></div>
                      </div>
                      <div className="grid grid-cols-3 gap-2 min-w-[300px] text-center">
                        <Mini label="Workers" value={roster.total_workers} />
                        <Mini label="Regular" value={`${roster.total_regular_hours}h`} />
                        <Mini label="OT" value={`${roster.total_overtime_hours}h`} />
                      </div>
                      <Link href={`/dashboard/hr/rosters/${roster.id}`} className="inline-flex items-center justify-center gap-2 rounded-xl bg-indigo-600 px-4 py-2.5 text-xs font-bold text-white hover:bg-indigo-700">Review Roster <ArrowRight className="w-4 h-4" /></Link>
                    </div>
                  );
                })}
              </div>
            )}
          </section>
        </main>
      </div>
    </div>
  );
}

function Metric({ title, value, icon: Icon, warn = false }) {
  return <div className="rounded-2xl border border-slate-200 bg-white p-4 sm:p-5 shadow-sm flex items-center justify-between gap-3"><div><p className="text-[10px] sm:text-xs font-bold uppercase tracking-wider text-slate-500">{title}</p><p className={`mt-1 text-2xl font-black ${warn ? 'text-amber-700' : 'text-slate-950'}`}>{value}</p></div><div className={`rounded-xl p-3 ${warn ? 'bg-amber-50 text-amber-600' : 'bg-indigo-50 text-indigo-600'}`}><Icon className="w-5 h-5" /></div></div>;
}

function Mini({ label, value }) {
  return <div className="rounded-xl bg-slate-50 border border-slate-100 px-3 py-2"><div className="text-[10px] uppercase tracking-wider text-slate-400 font-bold">{label}</div><div className="mt-1 text-sm font-black text-slate-800">{value}</div></div>;
}
