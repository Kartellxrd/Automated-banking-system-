'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import {
  AlertTriangle,
  ArrowRight,
  Building2,
  CheckCircle2,
  ClipboardCheck,
  Clock3,
  FileUp,
  Loader2,
  RefreshCw,
  ShieldCheck,
  Users,
} from 'lucide-react';
import SiteClerkSideNav from '@/components/site-clerk/SiteClerkSideNav';
import SiteClerkNavbar from '@/components/site-clerk/SiteClerkNavbar';

const STATUS_LABELS = {
  draft: 'Draft',
  submitted_to_hr: 'Submitted to HR',
  approved: 'Approved by HR',
  rejected: 'Rejected by HR',
};

const TIMESHEET_LABELS = {
  uploaded: 'Uploaded',
  extracting: 'Extracting',
  review_ready: 'Ready for Review',
  confirmed: 'Verified',
  failed: 'Needs Manual Review',
};

export default function SiteClerkDashboard() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const loadDashboard = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const response = await fetch('/api/site-clerk/dashboard', { cache: 'no-store' });
      const result = await response.json();
      if (!response.ok || !result.success) throw new Error(result.error || 'Could not load Site Clerk dashboard.');
      setData(result.data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadDashboard(); }, [loadDashboard]);

  const site = data?.site;
  const metrics = data?.metrics || { assignedWorkers: 0, enteredWorkers: 0, missingEntries: 0, totalHours: 0 };
  const rosterStatus = data?.roster?.status || 'draft';
  const paperStatus = data?.timesheet?.processing_status || null;

  return (
    <div className="min-h-screen bg-slate-100 text-slate-900 flex flex-col lg:flex-row font-sans">
      <SiteClerkSideNav />
      <main className="flex-1 p-4 sm:p-6 lg:p-8 space-y-6 overflow-x-hidden">
        <SiteClerkNavbar title="Site Clerk Dashboard" siteName={site?.site_name || 'Assigned Site'} />

        {error && (
          <div className="rounded-2xl border border-rose-200 bg-rose-50 p-4 text-sm font-semibold text-rose-700 flex items-center justify-between gap-3">
            <div className="flex items-center gap-2"><AlertTriangle className="w-4 h-4" />{error}</div>
            <button onClick={loadDashboard} className="inline-flex items-center gap-2 rounded-xl border border-rose-200 bg-white px-3 py-2 text-xs"><RefreshCw className="w-4 h-4" />Retry</button>
          </div>
        )}

        {loading ? (
          <div className="rounded-3xl border border-slate-200 bg-white py-24 flex items-center justify-center gap-2 text-sm text-slate-500"><Loader2 className="w-5 h-5 animate-spin text-indigo-600" />Loading your assigned site...</div>
        ) : data ? (
          <>
            <section className="rounded-3xl bg-slate-950 text-white p-5 sm:p-7 shadow-md flex flex-col md:flex-row md:items-center justify-between gap-5">
              <div className="flex items-center gap-4">
                <div className="rounded-2xl border border-indigo-400/30 bg-indigo-500/15 p-3 text-indigo-300"><Building2 className="w-6 h-6" /></div>
                <div><p className="text-[11px] font-bold uppercase tracking-[0.18em] text-slate-400">Your Assigned Site</p><h2 className="mt-1 text-xl sm:text-2xl font-black">{site.site_name}</h2><p className="mt-1 text-sm text-slate-400">{site.location || 'No location description'}</p></div>
              </div>
              <div className="rounded-2xl border border-slate-700 bg-slate-900 px-4 py-3"><div className="text-[10px] uppercase tracking-wider text-slate-400 font-bold">Today • {data.today}</div><div className="mt-1 text-sm font-bold text-white">Roster: {STATUS_LABELS[rosterStatus] || rosterStatus}</div></div>
            </section>

            <section className="grid grid-cols-2 xl:grid-cols-4 gap-3 sm:gap-4">
              <Metric title="Assigned Workers" value={metrics.assignedWorkers} icon={Users} />
              <Metric title="Attendance Entered" value={metrics.enteredWorkers} icon={ClipboardCheck} />
              <Metric title="Missing Entries" value={metrics.missingEntries} icon={AlertTriangle} warn={metrics.missingEntries > 0} />
              <Metric title="Recorded Hours" value={`${metrics.totalHours}h`} icon={Clock3} />
            </section>

            {data.roster?.status === 'rejected' && (
              <div className="rounded-2xl border border-rose-200 bg-rose-50 p-4"><div className="font-bold text-rose-800 text-sm">HR returned today's roster for correction.</div><div className="mt-1 text-xs text-rose-700">{data.roster.rejection_reason || 'Correct the paper verification/digital roster and resubmit it.'}</div></div>
            )}

            <section className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              <Link href={`/dashboard/site-clerk/timesheet-upload?date=${encodeURIComponent(data.today)}`} className="group rounded-3xl border border-slate-200 bg-white p-6 shadow-sm hover:border-indigo-300 hover:shadow-md transition">
                <div className="flex items-start justify-between gap-4"><div className="rounded-2xl bg-indigo-50 p-3 text-indigo-600"><FileUp className="w-6 h-6" /></div><span className={`rounded-full px-2.5 py-1 text-[10px] font-bold ${paperStatus === 'confirmed' ? 'bg-emerald-50 text-emerald-700' : data.timesheet ? 'bg-amber-50 text-amber-700' : 'bg-slate-100 text-slate-600'}`}>{paperStatus ? TIMESHEET_LABELS[paperStatus] || paperStatus : 'Not uploaded'}</span></div>
                <h3 className="mt-5 text-lg font-black text-slate-950">Paper Timesheet</h3>
                <p className="mt-2 text-sm leading-6 text-slate-500">Upload today's signed JPG, PNG or PDF sheet, extract the handwritten clock times, match rows to assigned workers and verify every entry against the original paper.</p>
                <div className="mt-5 inline-flex items-center gap-2 text-sm font-bold text-indigo-600">{data.timesheet ? 'Continue paper verification' : 'Upload paper timesheet'} <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition" /></div>
              </Link>

              <Link href={`/dashboard/site-clerk/roster?date=${encodeURIComponent(data.today)}`} className="group rounded-3xl border border-slate-200 bg-white p-6 shadow-sm hover:border-indigo-300 hover:shadow-md transition">
                <div className="flex items-start justify-between gap-4"><div className="rounded-2xl bg-slate-100 p-3 text-slate-700"><ClipboardCheck className="w-6 h-6" /></div><span className={`rounded-full px-2.5 py-1 text-[10px] font-bold ${data.roster?.status === 'submitted_to_hr' || data.roster?.status === 'approved' ? 'bg-emerald-50 text-emerald-700' : 'bg-amber-50 text-amber-700'}`}>{STATUS_LABELS[rosterStatus] || 'Draft'}</span></div>
                <h3 className="mt-5 text-lg font-black text-slate-950">Digital Daily Roster</h3>
                <p className="mt-2 text-sm leading-6 text-slate-500">Review the verified attendance calculations, correct an editable draft/rejected roster, and submit the completed roster to HR.</p>
                <div className="mt-5 inline-flex items-center gap-2 text-sm font-bold text-slate-800 group-hover:text-indigo-600">Open digital roster <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition" /></div>
              </Link>
            </section>

            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 flex items-start gap-3"><ShieldCheck className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" /><div><div className="text-xs font-bold text-slate-800">Site scope is enforced on the server.</div><div className="text-xs text-slate-500 mt-1">The clerk cannot switch sites. The uploaded paper is evidence only; employee/site records decide who belongs on the roster, and OCR suggestions require human verification.</div></div></div>
          </>
        ) : null}
      </main>
    </div>
  );
}

function Metric({ title, value, icon: Icon, warn = false }) {
  return <div className="rounded-2xl border border-slate-200 bg-white p-4 sm:p-5 shadow-sm flex items-center justify-between gap-3"><div><p className="text-[10px] sm:text-xs font-bold uppercase tracking-wider text-slate-500">{title}</p><p className={`mt-1 text-2xl font-black ${warn ? 'text-amber-700' : 'text-slate-950'}`}>{value}</p></div><div className={`rounded-xl p-3 ${warn ? 'bg-amber-50 text-amber-600' : 'bg-indigo-50 text-indigo-600'}`}><Icon className="w-5 h-5" /></div></div>;
}
