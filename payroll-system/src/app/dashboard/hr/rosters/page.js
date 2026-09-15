'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { ArrowRight, Building2, CalendarDays, CheckCircle2, ClipboardCheck, Filter, Loader2, RefreshCw, Search, XCircle } from 'lucide-react';
import HRSideNav from '@/components/hr/HRSideNav';
import HRNavbar from '@/components/hr/HRNavbar';

const STATUS_LABELS = {
  submitted_to_hr: 'Waiting for HR',
  approved: 'Approved',
  rejected: 'Rejected',
};

export default function HRRosterQueuePage() {
  const [rows, setRows] = useState([]);
  const [sites, setSites] = useState([]);
  const [siteId, setSiteId] = useState('all');
  const [status, setStatus] = useState('submitted_to_hr');
  const [date, setDate] = useState('');
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const params = new URLSearchParams();
      params.set('status', status);
      params.set('site_id', siteId);
      if (date) params.set('date', date);
      const response = await fetch(`/api/hr/rosters?${params.toString()}`, { cache: 'no-store' });
      const result = await response.json();
      if (!response.ok || !result.success) throw new Error(result.error || 'Could not load rosters.');
      setRows(result.data || []);
      setSites(result.sites || []);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [siteId, status, date]);

  useEffect(() => { load(); }, [load]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return rows;
    return rows.filter((row) =>
      row.site?.site_name?.toLowerCase().includes(q) ||
      row.submitted_by_user?.name?.toLowerCase().includes(q) ||
      row.shift_date?.includes(q)
    );
  }, [rows, search]);

  return (
    <div className="min-h-screen bg-slate-100 flex flex-col lg:flex-row text-slate-900">
      <HRSideNav />
      <div className="flex-1 min-w-0">
        <HRNavbar />
        <main className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto space-y-6">
          <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
              <div><p className="text-[11px] uppercase tracking-[0.16em] font-bold text-indigo-600">Attendance Gate</p><h1 className="mt-1 text-2xl sm:text-3xl font-black">Roster Review</h1><p className="mt-1 text-sm text-slate-500">Review submissions from every active site. “All Sites” is the default authority view; filters only narrow the queue.</p></div>
              <button onClick={load} className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-xs font-bold"><RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />Refresh</button>
            </div>
          </div>

          <div className="rounded-3xl border border-slate-200 bg-white p-4 sm:p-5 shadow-sm grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-3">
            <label className="space-y-1"><span className="text-[10px] uppercase tracking-wider font-bold text-slate-500">Site</span><select value={siteId} onChange={(e) => setSiteId(e.target.value)} className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm font-semibold"><option value="all">All Sites</option>{sites.map((site) => <option key={site.id} value={site.id}>{site.site_name}</option>)}</select></label>
            <label className="space-y-1"><span className="text-[10px] uppercase tracking-wider font-bold text-slate-500">Status</span><select value={status} onChange={(e) => setStatus(e.target.value)} className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm font-semibold"><option value="submitted_to_hr">Waiting for HR</option><option value="approved">Approved</option><option value="rejected">Rejected</option><option value="all">All Statuses</option></select></label>
            <label className="space-y-1"><span className="text-[10px] uppercase tracking-wider font-bold text-slate-500">Work Date</span><input type="date" value={date} onChange={(e) => setDate(e.target.value)} className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm font-semibold" /></label>
            <label className="space-y-1"><span className="text-[10px] uppercase tracking-wider font-bold text-slate-500">Search</span><div className="relative"><Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" /><input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Site, clerk, date..." className="w-full rounded-xl border border-slate-200 bg-slate-50 pl-9 pr-3 py-2.5 text-sm" /></div></label>
          </div>

          {error && <div className="rounded-2xl border border-rose-200 bg-rose-50 p-4 text-sm font-semibold text-rose-700">{error}</div>}

          <div className="rounded-3xl border border-slate-200 bg-white shadow-sm overflow-hidden">
            <div className="p-5 border-b border-slate-100 flex items-center justify-between"><h2 className="font-black flex items-center gap-2"><ClipboardCheck className="w-5 h-5 text-indigo-600" />{STATUS_LABELS[status] || 'Roster History'}</h2><span className="text-xs font-bold text-slate-400">{filtered.length} roster{filtered.length === 1 ? '' : 's'}</span></div>
            {loading ? <div className="p-16 flex items-center justify-center gap-2 text-sm text-slate-500"><Loader2 className="w-5 h-5 animate-spin text-indigo-600" />Loading roster queue...</div> : filtered.length === 0 ? <div className="p-14 text-center"><Filter className="w-9 h-9 text-slate-300 mx-auto" /><h3 className="mt-3 font-black">No rosters match these filters</h3><p className="mt-1 text-sm text-slate-500">Try All Sites or All Statuses.</p></div> : <div className="divide-y divide-slate-100">{filtered.map((row) => <RosterRow key={row.id} row={row} />)}</div>}
          </div>
        </main>
      </div>
    </div>
  );
}

function RosterRow({ row }) {
  const Icon = row.status === 'approved' ? CheckCircle2 : row.status === 'rejected' ? XCircle : ClipboardCheck;
  const badge = row.status === 'approved' ? 'bg-emerald-50 text-emerald-700' : row.status === 'rejected' ? 'bg-rose-50 text-rose-700' : 'bg-amber-50 text-amber-700';
  return (
    <div className="p-5 sm:p-6 flex flex-col xl:flex-row xl:items-center justify-between gap-4 hover:bg-slate-50/60">
      <div className="flex items-start gap-3 min-w-0"><div className="rounded-2xl bg-indigo-50 p-3 text-indigo-600"><Building2 className="w-5 h-5" /></div><div className="min-w-0"><div className="flex flex-wrap gap-2 items-center"><h3 className="font-black">{row.site?.site_name || 'Unknown Site'}</h3><span className={`rounded-full px-2.5 py-1 text-[10px] font-bold ${badge}`}>{STATUS_LABELS[row.status] || row.status}</span></div><p className="mt-1 text-xs text-slate-500 flex flex-wrap gap-x-3 gap-y-1"><span className="flex items-center gap-1"><CalendarDays className="w-3.5 h-3.5" />{row.shift_date}</span><span>Version {row.version}</span><span>Submitted by {row.submitted_by_user?.name || 'Unknown clerk'}</span></p></div></div>
      <div className="grid grid-cols-3 gap-2 text-center min-w-[300px]"><Box label="Workers" value={row.totals.workers} /><Box label="Regular" value={`${row.totals.regular_hours}h`} /><Box label="OT" value={`${row.totals.overtime_hours}h`} /></div>
      <Link href={`/dashboard/hr/rosters/${row.id}`} className="inline-flex items-center justify-center gap-2 rounded-xl bg-indigo-600 px-4 py-2.5 text-xs font-bold text-white hover:bg-indigo-700"><Icon className="w-4 h-4" />{row.status === 'submitted_to_hr' ? 'Review Roster' : 'View Details'}<ArrowRight className="w-4 h-4" /></Link>
    </div>
  );
}

function Box({ label, value }) {
  return <div className="rounded-xl border border-slate-100 bg-slate-50 px-3 py-2"><div className="text-[10px] uppercase tracking-wider text-slate-400 font-bold">{label}</div><div className="mt-1 text-sm font-black">{value}</div></div>;
}
