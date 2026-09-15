'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { AlertTriangle, Banknote, CheckCircle2, FileCheck2, Loader2, Receipt, RefreshCw, Send, Users } from 'lucide-react';
import AccNavbar from '@/components/accountant/AccNavbar';
import AccSideNav from '@/components/accountant/AccSideNav';

function money(value) {
  return `P${Number(value || 0).toLocaleString('en-BW', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function statusLabel(status) {
  return {
    draft: 'Draft',
    ready_for_ceo: 'Waiting for CEO',
    rejected_by_ceo: 'Returned by CEO',
    approved_by_ceo: 'CEO Approved',
    executing: 'Payment Running',
    paid: 'Paid',
    partial_failed: 'Partial Failure',
    failed: 'Failed',
  }[status] || status;
}

export default function AccountantDashboardPage() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const response = await fetch('/api/accountant/dashboard', { cache: 'no-store' });
      const result = await response.json();
      if (!response.ok || !result.success) throw new Error(result.error || 'Could not load Accountant dashboard.');
      setData(result);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const stats = data?.stats || {};

  return (
    <div className="min-h-screen bg-slate-100 flex flex-col lg:flex-row text-slate-900">
      <AccSideNav />
      <div className="flex-1 min-w-0">
        <AccNavbar title="Accountant Control Center" subtitle="HR-approved attendance → payroll preparation → CEO handoff" />
        <main className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto space-y-6">
          <section className="rounded-3xl bg-slate-950 text-white p-6 sm:p-8 flex flex-col lg:flex-row lg:items-center justify-between gap-5">
            <div>
              <p className="text-[11px] uppercase tracking-[0.18em] font-bold text-indigo-300">Payroll Gate</p>
              <h1 className="text-2xl sm:text-3xl font-black mt-1">Prepare, verify, then send one batch to CEO</h1>
              <p className="text-sm text-slate-300 mt-2 max-w-2xl">Only HR-approved attendance enters payroll. Accountant verifies hours, rate snapshots and payout readiness; final approval and payment execution remain outside the Accountant role.</p>
            </div>
            <div className="flex gap-2 shrink-0">
              <button onClick={load} className="rounded-xl border border-slate-700 px-4 py-2.5 text-xs font-bold inline-flex items-center gap-2"><RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />Refresh</button>
              <Link href="/dashboard/accountant/staging" className="rounded-xl bg-indigo-600 px-4 py-2.5 text-xs font-bold inline-flex items-center gap-2"><FileCheck2 className="w-4 h-4" />Prepare Payroll</Link>
            </div>
          </section>

          {error && <div className="rounded-2xl border border-rose-200 bg-rose-50 p-4 text-sm font-semibold text-rose-700 flex items-center gap-2"><AlertTriangle className="w-4 h-4" />{error}</div>}

          <section className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
            <Metric icon={Users} label="Payroll-ready Rosters" value={stats.payroll_ready_rosters || 0} note="Approved by HR, not yet batched" />
            <Metric icon={FileCheck2} label="Draft Batches" value={stats.draft_batches || 0} note="Still controlled by Accountant" />
            <Metric icon={Send} label="Waiting for CEO" value={stats.awaiting_ceo || 0} note="Submitted for final approval" />
            <Metric icon={Receipt} label="Recorded Expenses" value={stats.recorded_expenses || 0} note={money(stats.recorded_expense_total)} />
          </section>

          <section className="grid grid-cols-1 xl:grid-cols-2 gap-6">
            <div className="rounded-3xl border border-slate-200 bg-white shadow-sm overflow-hidden">
              <div className="p-5 border-b border-slate-100 flex items-center justify-between"><div><h2 className="font-black">HR-approved attendance waiting for payroll</h2><p className="text-xs text-slate-500 mt-1">These rosters have not been used in any payroll batch.</p></div><Link href="/dashboard/accountant/staging" className="text-xs font-bold text-indigo-600">Open Payroll →</Link></div>
              {loading ? <Loading /> : !data?.payroll_ready_rosters?.length ? <Empty text="No approved rosters are waiting for payroll." /> : <div className="divide-y divide-slate-100">{data.payroll_ready_rosters.map((roster) => <div key={roster.id} className="p-4 flex items-center justify-between gap-4"><div><div className="font-bold text-sm">{roster.site?.site_name || 'Unknown Site'}</div><div className="text-xs text-slate-500">{roster.shift_date} • Version {roster.version}</div></div><span className="rounded-full bg-emerald-50 px-3 py-1 text-[10px] font-bold text-emerald-700 inline-flex items-center gap-1"><CheckCircle2 className="w-3 h-3" />HR Approved</span></div>)}</div>}
            </div>

            <div className="rounded-3xl border border-slate-200 bg-white shadow-sm overflow-hidden">
              <div className="p-5 border-b border-slate-100"><h2 className="font-black">Recent Payroll Batches</h2><p className="text-xs text-slate-500 mt-1">Drafts, CEO queue and completed batches.</p></div>
              {loading ? <Loading /> : !data?.recent_batches?.length ? <Empty text="No payroll batches have been prepared yet." /> : <div className="divide-y divide-slate-100">{data.recent_batches.map((batch) => <Link key={batch.id} href={`/dashboard/accountant/staging/${batch.id}`} className="p-4 flex items-center justify-between gap-4 hover:bg-slate-50"><div><div className="font-bold text-sm">{batch.batch_code}</div><div className="text-xs text-slate-500">{batch.pay_period?.period_name || 'Pay period'} • {batch.total_employees} employees</div></div><div className="text-right"><div className="font-black text-sm">{money(batch.net_total)}</div><div className="text-[10px] font-bold text-indigo-600">{statusLabel(batch.status)}</div></div></Link>)}</div>}
            </div>
          </section>

          <section className="rounded-3xl border border-indigo-100 bg-indigo-50 p-5 flex items-start gap-3"><Banknote className="w-5 h-5 text-indigo-700 mt-0.5" /><div><h3 className="font-black text-sm text-indigo-950">Payment boundary</h3><p className="text-xs text-indigo-800 mt-1">Accountant never sends money. A prepared batch is handed to CEO as one unit. The CEO payment module will later execute all employee instructions from that batch together and track each result independently.</p></div></section>
        </main>
      </div>
    </div>
  );
}

function Metric({ icon: Icon, label, value, note }) {
  return <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm"><div className="flex items-center justify-between"><span className="text-xs font-bold text-slate-500">{label}</span><div className="rounded-2xl bg-indigo-50 p-2.5 text-indigo-600"><Icon className="w-5 h-5" /></div></div><div className="mt-4 text-3xl font-black">{value}</div><p className="text-[11px] text-slate-400 mt-1">{note}</p></div>;
}
function Loading() { return <div className="p-10 flex items-center justify-center gap-2 text-sm text-slate-500"><Loader2 className="w-4 h-4 animate-spin text-indigo-600" />Loading...</div>; }
function Empty({ text }) { return <div className="p-10 text-center text-sm text-slate-500">{text}</div>; }
