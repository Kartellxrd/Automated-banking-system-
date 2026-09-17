'use client';

import { useCallback, useEffect, useState } from 'react';
import {
  AlertCircle,
  Ban,
  CheckCircle2,
  Clock3,
  Loader2,
  LockKeyhole,
  ReceiptText,
  RefreshCw,
  Users,
  WalletCards,
  X,
} from 'lucide-react';
import CeoNavbar from '@/components/ceo/CeoNavbar';
import CeoSideNav from '@/components/ceo/CeoSideNav';

const money = (value) => `BWP ${Number(value || 0).toLocaleString('en-BW', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
const pretty = (value) => String(value || '').replaceAll('_', ' ');

export default function CeoPaymentCenterPage() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [preparingId, setPreparingId] = useState(null);
  const [confirmBatch, setConfirmBatch] = useState(null);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const load = useCallback(async (silent = false) => {
    if (silent) setRefreshing(true);
    setError('');
    try {
      const response = await fetch('/api/ceo/payment-center', { cache: 'no-store' });
      const json = await response.json();
      if (!response.ok || !json.success) throw new Error(json.error || 'Failed to load payment center.');
      setData(json.data);
    } finally {
      if (silent) setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    let mounted = true;
    (async () => {
      try { await load(); }
      catch (err) { if (mounted) setError(err.message || 'Failed to load payment center.'); }
      finally { if (mounted) setLoading(false); }
    })();
    const timer = setInterval(() => load(true).catch((err) => setError(err.message || 'Failed to refresh payment center.')), 10000);
    return () => { mounted = false; clearInterval(timer); };
  }, [load]);

  const authorizePayrollRun = async () => {
    const batch = confirmBatch;
    if (!batch) return;
    setPreparingId(batch.id);
    setError('');
    setSuccess('');
    try {
      const response = await fetch('/api/ceo/payment-center', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'prepare_payroll', batch_id: batch.id }),
      });
      const json = await response.json();
      if (!response.ok || !json.success) throw new Error(json.error || 'Failed to authorize payment run.');
      setConfirmBatch(null);
      setSuccess(`${json.data.run_code} was authorized for Accountant execution. No employee has been marked paid yet.`);
      await load(true);
    } catch (err) {
      setError(err.message || 'Failed to authorize payment run.');
    } finally {
      setPreparingId(null);
    }
  };

  const summary = data?.summary || {};

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col lg:flex-row">
      <CeoSideNav />
      <div className="flex-1 min-w-0">
        <CeoNavbar title="Payment Center" subtitle="Authorize Pay All and track actual payment execution" />
        <main className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto space-y-6">
          {loading && <div className="py-20 flex justify-center items-center gap-2 text-slate-500 font-semibold"><Loader2 className="w-5 h-5 animate-spin" /> Loading payment center...</div>}
          {!loading && error && <Notice type="error" message={error} onClose={() => setError('')} />}
          {!loading && success && <Notice type="success" message={success} onClose={() => setSuccess('')} />}

          {!loading && data && <>
            <div className="grid grid-cols-2 xl:grid-cols-4 gap-4">
              <Stat icon={Users} label="Ready Payroll Batches" value={summary.payroll_ready_batches || 0} helper={`${summary.payroll_recipients || 0} recipients awaiting Pay All`} />
              <Stat icon={WalletCards} label="Payroll Waiting" value={money(summary.payroll_total)} helper="CEO-approved, not yet authorized for execution" />
              <Stat icon={Clock3} label="Active Payment Runs" value={summary.active_payment_runs || 0} helper="Prepared / executing / exception runs" />
              <Stat icon={CheckCircle2} label="Completed Runs" value={summary.completed_payment_runs || 0} helper="All payment items confirmed paid" />
            </div>

            <div className="bg-indigo-50 border border-indigo-200 rounded-3xl p-5 sm:p-6 flex items-start gap-3">
              <LockKeyhole className="w-5 h-5 text-indigo-700 mt-0.5 shrink-0" />
              <div><h2 className="font-black text-indigo-950">Periscope's current payment process is now reflected in V1</h2><p className="text-sm text-indigo-900 mt-1 leading-6">{data.execution.message}</p><p className="text-xs text-indigo-700 mt-2 font-semibold">CEO Pay All is an authorization event. The Accountant performs the real transaction outside the app and records the genuine payment references/results; the CEO sees those results here.</p></div>
            </div>

            <section className="space-y-4">
              <div className="flex items-end justify-between gap-4"><div><p className="text-xs font-black uppercase tracking-wider text-emerald-600">Authorization Queue</p><h2 className="text-xl font-black text-slate-900 mt-1">Approved Payroll Ready for Pay All</h2></div><button onClick={() => load(true)} className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-bold inline-flex items-center gap-2"><RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />Refresh</button></div>

              {!data.payroll.length ? <Empty text="No CEO-approved payroll batches are waiting for Pay All authorization." /> : data.payroll.map((batch) => (
                <div key={batch.id} className="bg-white border border-slate-200 rounded-3xl p-5 sm:p-6 shadow-xs space-y-5">
                  <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-5">
                    <div><div className="flex flex-wrap items-center gap-2"><h3 className="font-black text-slate-900">{batch.batch_code}</h3>{batch.payment_ready ? <Badge good text="Payout preflight passed" /> : <Badge text={`${batch.payment_blockers} blocker(s)`} />}</div><p className="text-sm text-slate-500 mt-2">{batch.pay_period?.period_name || 'Pay period unavailable'} · {batch.payable_recipients} payable employees</p></div>
                    <div className="flex flex-col sm:flex-row sm:items-center gap-4"><div className="sm:text-right"><p className="text-[10px] font-black uppercase tracking-wider text-slate-400">Net Payroll</p><p className="text-2xl font-black text-slate-900">{money(batch.net_total)}</p></div><button onClick={() => setConfirmBatch(batch)} disabled={!batch.payment_ready || preparingId === batch.id} className="px-6 py-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-sm font-black disabled:bg-slate-200 disabled:text-slate-500 flex items-center justify-center gap-2">{preparingId === batch.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <WalletCards className="w-4 h-4" />} AUTHORIZE PAY ALL</button></div>
                  </div>
                  <div className="flex flex-wrap gap-2">{(batch.channel_breakdown || []).map((item) => <div key={item.provider} className="px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-700"><span className="font-black">{item.provider}</span> · {item.recipients} · {money(item.amount)}</div>)}</div>
                </div>
              ))}
            </section>

            <section className="space-y-4">
              <div><p className="text-xs font-black uppercase tracking-wider text-indigo-600">Execution Visibility</p><h2 className="text-xl font-black text-slate-900 mt-1">Payment Run Progress</h2><p className="text-sm text-slate-500 mt-1">Live status recorded by Finance after the actual FNB / mobile-money transactions.</p></div>
              {!data.payment_runs.length ? <Empty text="No payment runs have been authorized yet." /> : data.payment_runs.map((run) => (
                <div key={run.id} className="bg-white border border-slate-200 rounded-3xl p-5 sm:p-6 shadow-xs space-y-4">
                  <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4"><div><div className="flex gap-2 flex-wrap items-center"><h3 className="font-black">{run.run_code}</h3><RunStatus value={run.status} /></div><p className="text-xs text-slate-500 mt-1">{run.batch?.batch_code || 'Payment run'} · {run.batch?.pay_period?.period_name || 'Pay period unavailable'} · Authorized {run.authorized_at ? new Date(run.authorized_at).toLocaleString('en-BW') : '—'}</p>{run.source_account && <p className="text-xs text-slate-500 mt-1">Source: {run.source_account.account_name} — {run.source_account.institution_name}{run.source_account.account_identifier_label ? ` (${run.source_account.account_identifier_label})` : ''}</p>}</div><div className="lg:text-right"><div className="text-[10px] uppercase tracking-wider text-slate-400 font-black">Total</div><div className="text-xl font-black">{money(run.total_amount)}</div></div></div>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3"><Progress label="Queued" value={run.progress.queued} /><Progress label="Submitted" value={run.progress.submitted} /><Progress label="Paid" value={run.progress.paid} good /><Progress label="Failed" value={run.progress.failed} danger={run.progress.failed > 0} /></div>
                </div>
              ))}
            </section>

            <section className="space-y-4">
              <div><p className="text-xs font-black uppercase tracking-wider text-emerald-600">Expenses</p><h2 className="text-xl font-black text-slate-900 mt-1">Approved Expense Payments</h2></div>
              {!data.expenses.length ? <Empty text="No CEO-approved expenses are waiting for payment." /> : data.expenses.map((expense) => (
                <div key={expense.id} className="bg-white border border-slate-200 rounded-3xl p-5 shadow-xs flex flex-col xl:flex-row xl:items-center justify-between gap-5"><div className="min-w-0"><div className="flex flex-wrap items-center gap-2"><h3 className="font-black text-slate-900">{expense.request_code}</h3><Badge text="Payee destination required" /></div><p className="text-sm font-semibold text-slate-700 mt-2">{expense.purpose}</p><p className="text-xs text-slate-500 mt-1">{expense.site?.site_name || 'Unknown site'} · {expense.category?.category_name || 'Uncategorised'} · {expense.payment_type === 'site_advance' ? 'Site advance' : 'Direct vendor'}</p><p className="text-xs text-rose-600 font-semibold mt-2 flex items-center gap-1"><Ban className="w-3.5 h-3.5" /> {expense.payment_blockers?.[0]}</p></div><div className="flex items-center gap-4 shrink-0"><div className="text-right"><p className="text-[10px] font-black uppercase tracking-wider text-slate-400">Approved Amount</p><p className="text-xl font-black text-slate-900">{money(expense.approved_amount)}</p></div><button disabled className="px-5 py-3 rounded-xl bg-slate-200 text-slate-500 text-sm font-black">Pay Expense</button></div></div>
              ))}
            </section>
          </>}
        </main>
      </div>

      {confirmBatch && <div className="fixed inset-0 z-[100] bg-slate-950/60 p-4 flex items-center justify-center"><div className="w-full max-w-lg rounded-3xl bg-white shadow-2xl overflow-hidden"><div className="p-5 sm:p-6 border-b border-slate-100 flex justify-between gap-4"><div><p className="text-[10px] uppercase tracking-wider font-black text-emerald-600">Final Payment Authorization</p><h2 className="text-xl font-black mt-1">Authorize Pay All?</h2><p className="text-sm text-slate-500 mt-1">{confirmBatch.batch_code}</p></div><button disabled={Boolean(preparingId)} onClick={() => setConfirmBatch(null)} className="p-2 rounded-xl hover:bg-slate-100"><X className="w-5 h-5" /></button></div><div className="p-5 sm:p-6 space-y-4"><div className="grid grid-cols-2 gap-3"><Progress label="Employees" value={confirmBatch.payable_recipients} /><Progress label="Amount" value={money(confirmBatch.net_total)} good /></div><div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900"><strong>This does not fake a payment.</strong> It freezes the exact recipient/amount/destination snapshots and authorizes the Accountant to execute the real company payment. Every paid item still needs an actual transaction/batch reference.</div><div className="flex justify-end gap-2"><button disabled={Boolean(preparingId)} onClick={() => setConfirmBatch(null)} className="rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-bold">Cancel</button><button disabled={Boolean(preparingId)} onClick={authorizePayrollRun} className="rounded-xl bg-emerald-600 px-5 py-2.5 text-sm font-black text-white inline-flex items-center gap-2 disabled:opacity-50">{preparingId && <Loader2 className="w-4 h-4 animate-spin" />}Authorize Pay All</button></div></div></div></div>}
    </div>
  );
}

function Stat({ icon: Icon, label, value, helper }) { return <div className="bg-white border border-slate-200 rounded-3xl p-5"><div className="flex items-center justify-between"><p className="text-[10px] font-black uppercase tracking-wider text-slate-400">{label}</p><Icon className="w-4 h-4 text-emerald-600" /></div><p className="text-2xl font-black text-slate-900 mt-2">{value}</p><p className="text-xs text-slate-500 mt-2">{helper}</p></div>; }
function Badge({ good = false, text }) { return <span className={`px-2.5 py-1 rounded-lg text-[10px] font-black uppercase ${good ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-amber-50 text-amber-700 border border-amber-200'}`}>{text}</span>; }
function RunStatus({ value }) { const good = value === 'completed'; const bad = ['partial_failed','failed'].includes(value); return <span className={`px-2.5 py-1 rounded-lg text-[10px] font-black uppercase ${good ? 'bg-emerald-50 text-emerald-700' : bad ? 'bg-rose-50 text-rose-700' : value === 'executing' ? 'bg-indigo-50 text-indigo-700' : 'bg-amber-50 text-amber-700'}`}>{pretty(value)}</span>; }
function Progress({ label, value, good = false, danger = false }) { return <div className={`rounded-xl border p-3 ${good ? 'border-emerald-200 bg-emerald-50' : danger ? 'border-rose-200 bg-rose-50' : 'border-slate-200 bg-slate-50'}`}><p className="text-[10px] uppercase tracking-wider font-black text-slate-400">{label}</p><p className={`mt-1 font-black ${danger ? 'text-rose-700' : good ? 'text-emerald-800' : 'text-slate-900'}`}>{value}</p></div>; }
function Empty({ text }) { return <div className="bg-white border border-slate-200 rounded-3xl p-8 text-center text-sm text-slate-500">{text}</div>; }
function Notice({ type, message, onClose }) { return <div className={`rounded-2xl border p-4 flex items-start justify-between gap-3 ${type === 'success' ? 'bg-emerald-50 border-emerald-200 text-emerald-800' : 'bg-rose-50 border-rose-200 text-rose-700'}`}><span className="flex gap-2 text-sm font-semibold">{type === 'success' ? <CheckCircle2 className="w-5 h-5 shrink-0" /> : <AlertCircle className="w-5 h-5 shrink-0" />}{message}</span><button onClick={onClose}><X className="w-4 h-4" /></button></div>; }
