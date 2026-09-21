'use client';

import { useCallback, useEffect, useState } from 'react';
import {
  AlertCircle,
  CalendarDays,
  CheckCircle2,
  Clock3,
  CreditCard,
  Landmark,
  Loader2,
  ReceiptText,
  RefreshCw,
  TestTube2,
  Users,
  WalletCards,
  X,
} from 'lucide-react';
import CeoNavbar from '@/components/ceo/CeoNavbar';
import CeoSideNav from '@/components/ceo/CeoSideNav';

const money = (value) => `BWP ${Number(value || 0).toLocaleString('en-BW', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
const pretty = (value) => String(value || '').replaceAll('_', ' ');
const dateLabel = (value) => value ? new Date(`${value}T12:00:00`).toLocaleDateString('en-BW', { day: '2-digit', month: 'short', year: 'numeric' }) : 'Not scheduled';

function paydayState(value) {
  if (!value) return { label: 'No pay date', tone: 'warn' };
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const target = new Date(`${value}T00:00:00`);
  const days = Math.round((target - today) / 86400000);
  if (days < 0) return { label: `${Math.abs(days)} day${Math.abs(days) === 1 ? '' : 's'} overdue`, tone: 'danger' };
  if (days === 0) return { label: 'Pay today', tone: 'good' };
  if (days === 1) return { label: 'Pay tomorrow', tone: 'warn' };
  return { label: `${days} days to payday`, tone: 'neutral' };
}

export default function CeoPaymentCenterPage() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [busyId, setBusyId] = useState(null);
  const [confirmBatch, setConfirmBatch] = useState(null);
  const [confirmExpense, setConfirmExpense] = useState(null);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const load = useCallback(async (silent = false) => {
    if (silent) setRefreshing(true);
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
      catch (e) { if (mounted) setError(e.message); }
      finally { if (mounted) setLoading(false); }
    })();
    const timer = setInterval(() => load(true).catch((e) => setError(e.message)), 10000);
    return () => { mounted = false; clearInterval(timer); };
  }, [load]);

  async function payAll() {
    if (!confirmBatch) return;
    const batch = confirmBatch;
    setBusyId(batch.id);
    setError('');
    setSuccess('');
    try {
      const response = await fetch('/api/ceo/payment-center', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'prepare_payroll', batch_id: batch.id }),
      });
      const json = await response.json();
      if (!response.ok || !json.success) throw new Error(json.error || 'Could not release payroll for payment.');
      setConfirmBatch(null);
      setSuccess(`${json.data.run_code} was released to Finance for payment processing.`);
      await load(true);
    } catch (e) {
      setError(e.message);
    } finally {
      setBusyId(null);
    }
  }

  async function payExpense() {
    if (!confirmExpense) return;
    const expense = confirmExpense;
    setBusyId(expense.id);
    setError('');
    setSuccess('');
    try {
      const response = await fetch('/api/ceo/payment-center', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'prepare_expense', request_id: expense.id }),
      });
      const json = await response.json();
      if (!response.ok || !json.success) throw new Error(json.error || 'Could not release expense payment.');
      setConfirmExpense(null);
      setSuccess(`${expense.request_code} was released to Finance for payment processing.`);
      await load(true);
    } catch (e) {
      setError(e.message);
    } finally {
      setBusyId(null);
    }
  }

  const summary = data?.summary || {};
  const config = data?.payment_configuration || {};
  const testMode = config.environment?.mode !== 'production';
  const activeSource = config.active_sources?.[0] || null;

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col lg:flex-row font-sans text-slate-900">
      <CeoSideNav />
      <div className="flex-1 min-w-0">
        <CeoNavbar title="Payment Center" subtitle="Authorize approved payroll and expenses, then monitor Finance settlement" />
        <main className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto space-y-6 overflow-x-hidden">
          {loading && <div className="py-20 flex justify-center items-center gap-2 text-sm text-slate-500"><Loader2 className="w-5 h-5 animate-spin" />Loading payment center...</div>}
          {!loading && error && <Notice type="error" message={error} onClose={() => setError('')} />}
          {!loading && success && <Notice type="success" message={success} onClose={() => setSuccess('')} />}

          {!loading && data && <>
            <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-5">
                <div className="flex items-start gap-3 min-w-0">
                  <div className={`rounded-xl p-2.5 shrink-0 ${testMode ? 'bg-amber-100 text-amber-700' : 'bg-emerald-100 text-emerald-700'}`}>
                    {testMode ? <TestTube2 className="w-5 h-5" /> : <CheckCircle2 className="w-5 h-5" />}
                  </div>
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <h2 className="text-base font-semibold text-slate-900">{testMode ? 'FNB Test Mode' : 'Production Payments'}</h2>
                      <span className={`rounded-full px-2.5 py-1 text-xs font-medium ${testMode ? 'bg-amber-50 text-amber-700' : 'bg-emerald-50 text-emerald-700'}`}>{testMode ? 'TEST' : 'LIVE'}</span>
                    </div>
                    <p className="text-sm text-slate-500 mt-1 leading-relaxed">{testMode ? 'The CEO can demonstrate payment authorization safely. No automatic live FNB transfer is enabled.' : 'Released payments move to Finance for bank submission and reconciliation.'}</p>
                  </div>
                </div>

                <div className="w-full lg:w-auto rounded-xl border border-slate-200 bg-slate-50 px-4 py-3">
                  <p className="text-xs text-slate-500">Company payment source</p>
                  {activeSource ? <div className="mt-1 flex items-center gap-2 text-sm font-semibold text-slate-900"><Landmark className="w-4 h-4 text-emerald-600 shrink-0" /><span className="truncate">{activeSource.account_name} · {activeSource.institution_name}{activeSource.account_identifier_label ? ` · ${activeSource.account_identifier_label}` : ''}</span></div> : <p className="mt-1 text-sm font-semibold text-rose-700">Not configured — Finance must add one first.</p>}
                </div>
              </div>
            </section>

            <section className="grid grid-cols-2 xl:grid-cols-4 gap-3 sm:gap-4">
              <Stat icon={Users} label="Payroll ready" value={summary.payroll_ready_batches || 0} helper={`${summary.payroll_recipients || 0} employees`} />
              <Stat icon={ReceiptText} label="Expenses ready" value={summary.expense_ready_requests || 0} helper={money(summary.expense_total || 0)} />
              <Stat icon={Clock3} label="In processing" value={summary.active_payment_runs || 0} helper="Released runs" />
              <Stat icon={CheckCircle2} label="Completed" value={summary.completed_payment_runs || 0} helper="Settlement confirmed" />
            </section>

            <section className="space-y-4">
              <SectionTitle title="Payroll ready for release" subtitle="CEO-approved payroll that can now be handed to Finance" onRefresh={() => load(true)} refreshing={refreshing} />
              {!data.payroll.length ? <Empty text="No CEO-approved payroll is waiting for payment release." /> : data.payroll.map((batch) => {
                const payState = paydayState(batch.scheduled_payment_date);
                return <div key={batch.id} className="rounded-2xl border border-slate-200 bg-white p-5 sm:p-6 shadow-sm space-y-4">
                  <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-5">
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <h3 className="text-lg font-semibold text-slate-900">{batch.batch_code}</h3>
                        {batch.payment_ready ? <Badge good text="Ready" /> : <Badge text={`${batch.payment_blockers || 0} blocker(s)`} />}
                        <PaydayBadge state={payState} />
                      </div>
                      <p className="text-sm text-slate-500 mt-2">{batch.pay_period?.period_name || 'Pay period'} · {batch.payable_recipients} employees</p>
                      <p className="text-sm text-slate-600 mt-1 inline-flex items-center gap-1.5"><CalendarDays className="w-4 h-4 text-slate-400" />Scheduled payday: {dateLabel(batch.scheduled_payment_date)}</p>
                      {!batch.payment_ready && (batch.release_blockers || []).length > 0 && <div className="mt-3 space-y-1">{batch.release_blockers.map((text) => <p key={text} className="text-sm text-amber-700">• {text}</p>)}</div>}
                    </div>

                    <div className="w-full xl:w-auto flex flex-col sm:flex-row sm:items-center gap-3 shrink-0">
                      <div className="sm:text-right flex-1 sm:flex-none">
                        <p className="text-xs text-slate-500">Net payroll</p>
                        <p className="text-2xl font-semibold text-slate-900 break-words">{money(batch.net_total)}</p>
                      </div>
                      {batch.payment_run ? <Badge good text={`Released · ${batch.payment_run.run_code}`} /> : <button onClick={() => setConfirmBatch(batch)} disabled={!batch.payment_ready || busyId === batch.id} className="w-full sm:w-auto min-h-11 rounded-xl bg-emerald-600 px-5 py-3 text-sm font-semibold text-white hover:bg-emerald-500 disabled:bg-slate-200 disabled:text-slate-500 inline-flex items-center justify-center gap-2 whitespace-nowrap"><WalletCards className="w-4 h-4" />{testMode ? 'Create Test Run' : 'Release to Finance'}</button>}
                    </div>
                  </div>

                  <div className="flex flex-wrap gap-2">{(batch.channel_breakdown || []).map((row) => <div key={row.provider} className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-600"><span className="font-medium text-slate-800">{row.provider}</span> · {row.recipients} · {money(row.amount)}</div>)}</div>
                </div>;
              })}
            </section>

            <section className="space-y-4">
              <SectionTitle title="Approved expenses" subtitle="Expenses that have passed CEO approval and are ready for payment release" />
              {!data.expenses.length ? <Empty text="No CEO-approved expenses are waiting for payment." /> : data.expenses.map((expense) => <div key={expense.id} className="rounded-2xl border border-slate-200 bg-white p-5 sm:p-6 shadow-sm">
                <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-5">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="text-base font-semibold text-slate-900">{expense.request_code}</h3>
                      {expense.payment_ready ? <Badge good text="Verified payee" /> : <Badge text="Recipient incomplete" />}
                    </div>
                    <p className="text-sm font-medium text-slate-800 mt-2">{expense.purpose}</p>
                    <p className="text-sm text-slate-500 mt-1">{expense.site?.site_name || 'Unknown site'} · {expense.category?.category_name || 'Uncategorised'} · {expense.payment_type === 'site_advance' ? 'Site advance' : 'Direct vendor payment'}</p>
                    {expense.payee && <div className="mt-3 rounded-xl bg-slate-50 border border-slate-200 p-3 text-sm"><p className="font-medium text-slate-800">Pay to: {expense.payee.display_name}</p><p className="text-xs text-slate-500 mt-1">{expense.payee.payout?.provider?.name || 'Provider'} · {expense.payee.payout?.masked_destination || 'No verified destination'}{expense.payee.payout?.branch_code ? ` · Branch ${expense.payee.payout.branch_code}` : ''}</p></div>}
                    {!expense.payment_ready && (expense.payment_blockers || []).map((text) => <p key={text} className="mt-2 text-sm text-amber-700">• {text}</p>)}
                  </div>

                  <div className="w-full xl:w-auto flex flex-col sm:flex-row sm:items-center gap-3 shrink-0">
                    <div className="sm:text-right flex-1 sm:flex-none">
                      <p className="text-xs text-slate-500">Approved amount</p>
                      <p className="text-xl font-semibold text-slate-900">{money(expense.approved_amount)}</p>
                    </div>
                    {expense.payment_run ? <Badge good text={`Released · ${expense.payment_run.run_code}`} /> : <button onClick={() => setConfirmExpense(expense)} disabled={!expense.payment_ready || busyId === expense.id} className="w-full sm:w-auto min-h-11 rounded-xl bg-slate-900 px-5 py-3 text-sm font-semibold text-white hover:bg-slate-800 disabled:bg-slate-200 disabled:text-slate-500 inline-flex items-center justify-center gap-2 whitespace-nowrap"><CreditCard className="w-4 h-4" />{testMode ? 'Create Test Run' : 'Release Expense'}</button>}
                  </div>
                </div>
              </div>)}
            </section>

            <section className="space-y-4">
              <SectionTitle title="Payment status" subtitle="Track payment runs after the CEO releases them to Finance" />
              {!data.payment_runs.length ? <Empty text="No payments have been released yet." /> : data.payment_runs.map((run) => <div key={run.id} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm space-y-4">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="text-base font-semibold text-slate-900">{run.run_code}</h3>
                      <RunStatus value={run.status} />
                      <span className="text-xs text-slate-400">{run.run_type}</span>
                    </div>
                    <p className="text-sm text-slate-500 mt-1">Released {run.authorized_at ? new Date(run.authorized_at).toLocaleString('en-BW') : '—'}</p>
                    {run.batch?.scheduled_payment_date && <p className="text-xs text-slate-500 mt-1">Payroll date: {dateLabel(run.batch.scheduled_payment_date)}</p>}
                    {run.source_account && <p className="text-xs text-slate-500 mt-1 break-words">Source: {run.source_account.account_name} · {run.source_account.institution_name} {run.source_account.account_identifier_label || ''}</p>}
                  </div>
                  <div className="md:text-right">
                    <p className="text-xs text-slate-500">Payment total</p>
                    <p className="text-xl font-semibold text-slate-900">{money(run.total_amount)}</p>
                  </div>
                </div>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  <Progress label="Queued" value={run.progress.queued} />
                  <Progress label="Submitted" value={run.progress.submitted} />
                  <Progress label="Paid" value={run.progress.paid} good />
                  <Progress label="Failed" value={run.progress.failed} danger={run.progress.failed > 0} />
                </div>
              </div>)}
            </section>
          </>}
        </main>
      </div>

      {confirmBatch && <ConfirmModal title={testMode ? 'Create test payroll run?' : 'Release payroll to Finance?'} subtitle={confirmBatch.batch_code} busy={busyId === confirmBatch.id} onClose={() => setConfirmBatch(null)} onConfirm={payAll} confirmLabel={testMode ? 'Create Test Run' : 'Release Payroll'}>
        <div className="grid grid-cols-2 gap-3"><Progress label="Employees" value={confirmBatch.payable_recipients} /><Progress label="Amount" value={money(confirmBatch.net_total)} good /></div>
        <div className="rounded-xl border border-slate-200 bg-slate-50 p-3 text-sm text-slate-600"><p className="font-medium text-slate-900">Scheduled payday: {dateLabel(confirmBatch.scheduled_payment_date)}</p><p className="mt-1 leading-relaxed">{testMode ? 'This creates a locked test payment run for demonstration. It does not automatically move money through FNB.' : 'This is the CEO final release. Finance will process the locked instructions and reconcile the bank result per employee.'}</p></div>
      </ConfirmModal>}

      {confirmExpense && <ConfirmModal title={testMode ? 'Create test expense run?' : 'Release expense to Finance?'} subtitle={confirmExpense.request_code} busy={busyId === confirmExpense.id} onClose={() => setConfirmExpense(null)} onConfirm={payExpense} confirmLabel={testMode ? 'Create Test Run' : 'Release Expense'}>
        <Progress label="Amount" value={money(confirmExpense.approved_amount)} good />
        <div className="rounded-xl bg-slate-50 border border-slate-200 p-3 text-sm"><p className="font-medium text-slate-900">{confirmExpense.payee?.display_name}</p><p className="text-xs text-slate-500 mt-1">{confirmExpense.payee?.payout?.provider?.name} · {confirmExpense.payee?.payout?.masked_destination}</p></div>
        <div className="rounded-xl border border-slate-200 bg-slate-50 p-3 text-sm text-slate-600">{testMode ? 'Test mode creates the payment instruction without moving real money.' : 'Finance will process the approved instruction and record the actual settlement result.'}</div>
      </ConfirmModal>}
    </div>
  );
}

function Stat({ icon: Icon, label, value, helper }) { return <div className="bg-white border border-slate-200 rounded-2xl p-4 sm:p-5 shadow-sm min-w-0"><div className="flex items-center justify-between gap-2"><p className="text-xs text-slate-500">{label}</p><Icon className="w-4 h-4 text-emerald-600 shrink-0" /></div><p className="text-xl sm:text-2xl font-semibold text-slate-900 mt-2 break-words">{value}</p><p className="text-xs text-slate-500 mt-1 break-words">{helper}</p></div>; }
function SectionTitle({ title, subtitle, onRefresh, refreshing }) { return <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-3"><div><h2 className="text-lg font-semibold text-slate-900">{title}</h2><p className="text-sm text-slate-500 mt-1">{subtitle}</p></div>{onRefresh && <button onClick={onRefresh} disabled={refreshing} className="w-full sm:w-auto rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm font-medium inline-flex gap-2 items-center justify-center hover:bg-slate-50 disabled:opacity-50"><RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />Refresh</button>}</div>; }
function Badge({ good = false, text }) { return <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${good ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-amber-50 text-amber-700 border border-amber-200'}`}>{text}</span>; }
function PaydayBadge({ state }) { const cls = state.tone === 'good' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : state.tone === 'danger' ? 'bg-rose-50 text-rose-700 border-rose-200' : state.tone === 'warn' ? 'bg-amber-50 text-amber-700 border-amber-200' : 'bg-slate-50 text-slate-600 border-slate-200'; return <span className={`px-2.5 py-1 rounded-full text-xs font-medium border ${cls}`}>{state.label}</span>; }
function RunStatus({ value }) { const good = value === 'completed'; const bad = ['failed', 'partial_failed'].includes(value); const label = value === 'prepared' ? 'awaiting finance' : value === 'executing' ? 'processing' : pretty(value); return <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${good ? 'bg-emerald-50 text-emerald-700' : bad ? 'bg-rose-50 text-rose-700' : value === 'executing' ? 'bg-indigo-50 text-indigo-700' : 'bg-amber-50 text-amber-700'}`}>{label}</span>; }
function Progress({ label, value, good = false, danger = false }) { return <div className={`rounded-xl border p-3 min-w-0 ${good ? 'border-emerald-200 bg-emerald-50' : danger ? 'border-rose-200 bg-rose-50' : 'border-slate-200 bg-slate-50'}`}><p className="text-xs text-slate-500">{label}</p><p className={`mt-1 font-semibold break-words ${good ? 'text-emerald-800' : danger ? 'text-rose-700' : 'text-slate-900'}`}>{value}</p></div>; }
function Empty({ text }) { return <div className="bg-white border border-slate-200 rounded-2xl p-8 text-center text-sm text-slate-500">{text}</div>; }
function Notice({ type, message, onClose }) { return <div className={`rounded-xl border p-4 flex justify-between gap-3 text-sm ${type === 'success' ? 'border-emerald-200 bg-emerald-50 text-emerald-800' : 'border-rose-200 bg-rose-50 text-rose-700'}`}><span className="flex gap-2 min-w-0">{type === 'success' ? <CheckCircle2 className="w-4 h-4 mt-0.5 shrink-0" /> : <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />}<span className="break-words">{message}</span></span><button onClick={onClose} className="shrink-0"><X className="w-4 h-4" /></button></div>; }
function ConfirmModal({ title, subtitle, busy, onClose, onConfirm, confirmLabel, children }) { return <div className="fixed inset-0 z-[100] bg-slate-950/60 p-3 sm:p-4 flex items-center justify-center font-sans"><div className="w-full max-w-lg max-h-[92vh] rounded-2xl bg-white shadow-2xl overflow-hidden flex flex-col"><div className="p-5 border-b border-slate-100 flex justify-between gap-3 shrink-0"><div className="min-w-0"><p className="text-xs text-emerald-600 font-medium">Final payment authorization</p><h2 className="text-xl font-semibold text-slate-900 mt-1 break-words">{title}</h2><p className="text-sm text-slate-500 mt-1 break-words">{subtitle}</p></div><button disabled={busy} onClick={onClose} className="p-2 rounded-xl hover:bg-slate-100 shrink-0"><X className="w-5 h-5" /></button></div><div className="p-5 space-y-4 overflow-y-auto">{children}</div><div className="p-4 sm:p-5 border-t border-slate-100 bg-white flex flex-col-reverse sm:flex-row sm:justify-end gap-2 shrink-0"><button disabled={busy} onClick={onClose} className="w-full sm:w-auto rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-medium text-slate-600">Cancel</button><button disabled={busy} onClick={onConfirm} className="w-full sm:w-auto rounded-xl bg-emerald-600 px-5 py-2.5 text-sm font-semibold text-white inline-flex items-center justify-center gap-2 disabled:opacity-50">{busy && <Loader2 className="w-4 h-4 animate-spin" />}{confirmLabel}</button></div></div></div>; }
