'use client';

import { useCallback, useEffect, useState } from 'react';
import { AlertCircle, CalendarDays, CheckCircle2, Clock3, CreditCard, Loader2, ReceiptText, RefreshCw, Users, WalletCards, X } from 'lucide-react';
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
    (async () => { try { await load(); } catch (e) { if (mounted) setError(e.message); } finally { if (mounted) setLoading(false); } })();
    const timer = setInterval(() => load(true).catch((e) => setError(e.message)), 10000);
    return () => { mounted = false; clearInterval(timer); };
  }, [load]);

  async function payAll() {
    if (!confirmBatch) return;
    const batch = confirmBatch;
    setBusyId(batch.id); setError(''); setSuccess('');
    try {
      const res = await fetch('/api/ceo/payment-center', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'prepare_payroll', batch_id: batch.id }) });
      const json = await res.json();
      if (!res.ok || !json.success) throw new Error(json.error || 'Could not release payroll for payment.');
      setConfirmBatch(null);
      setSuccess(`${json.data.run_code} released for payment. The locked batch is ready for bank/mobile submission.`);
      await load(true);
    } catch (e) { setError(e.message); } finally { setBusyId(null); }
  }

  async function payExpense() {
    if (!confirmExpense) return;
    const expense = confirmExpense;
    setBusyId(expense.id); setError(''); setSuccess('');
    try {
      const res = await fetch('/api/ceo/payment-center', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'prepare_expense', request_id: expense.id }) });
      const json = await res.json();
      if (!res.ok || !json.success) throw new Error(json.error || 'Could not release expense payment.');
      setConfirmExpense(null);
      setSuccess(`${expense.request_code} released for payment to ${expense.payee?.display_name}.`);
      await load(true);
    } catch (e) { setError(e.message); } finally { setBusyId(null); }
  }

  const summary = data?.summary || {};

  return <div className="min-h-screen bg-slate-50 flex flex-col lg:flex-row">
    <CeoSideNav />
    <div className="flex-1 min-w-0">
      <CeoNavbar title="Payment Center" subtitle="Release approved payroll and expenses and monitor settlement" />
      <main className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto space-y-6">
        {loading && <div className="py-20 flex justify-center gap-2 text-slate-500"><Loader2 className="w-5 h-5 animate-spin" />Loading payment center...</div>}
        {!loading && error && <Notice type="error" message={error} onClose={()=>setError('')} />}
        {!loading && success && <Notice type="success" message={success} onClose={()=>setSuccess('')} />}

        {!loading && data && <>
          <section className="grid grid-cols-2 xl:grid-cols-4 gap-4">
            <Stat icon={Users} label="Payroll Ready" value={summary.payroll_ready_batches || 0} helper={`${summary.payroll_recipients || 0} employees`} />
            <Stat icon={ReceiptText} label="Expenses Ready" value={summary.expense_ready_requests || 0} helper={money(summary.expense_total || 0)} />
            <Stat icon={Clock3} label="In Processing" value={summary.active_payment_runs || 0} helper="Released payment batches" />
            <Stat icon={CheckCircle2} label="Completed" value={summary.completed_payment_runs || 0} helper="Settlement confirmed" />
          </section>

          <section className="space-y-4">
            <SectionTitle eyebrow="Payroll" title="Payroll Ready for Release" onRefresh={()=>load(true)} refreshing={refreshing} />
            {!data.payroll.length ? <Empty text="No CEO-approved payroll is waiting for payment release." /> : data.payroll.map((batch)=>{
              const payState = paydayState(batch.scheduled_payment_date);
              return <div key={batch.id} className="rounded-3xl border border-slate-200 bg-white p-5 sm:p-6 shadow-sm space-y-4">
                <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-5">
                  <div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className="font-black text-lg">{batch.batch_code}</h3>
                      {batch.payment_ready ? <Badge good text="Ready"/> : <Badge text={`${batch.payment_blockers || 0} payout blocker(s)`}/>} 
                      <PaydayBadge state={payState} />
                    </div>
                    <p className="text-sm text-slate-500 mt-2">{batch.pay_period?.period_name || 'Pay period'} · {batch.payable_recipients} employees</p>
                    <p className="text-xs text-indigo-700 font-bold mt-1 inline-flex items-center gap-1.5"><CalendarDays className="w-3.5 h-3.5" />Scheduled payday: {dateLabel(batch.scheduled_payment_date)}</p>
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="text-right"><p className="text-[10px] uppercase tracking-wider font-black text-slate-400">Net payroll</p><p className="text-2xl font-black">{money(batch.net_total)}</p></div>
                    {batch.payment_run ? <Badge good text={`Released · ${batch.payment_run.run_code}`}/> : <button onClick={()=>setConfirmBatch(batch)} disabled={!batch.payment_ready || busyId===batch.id} className="rounded-xl bg-emerald-600 px-5 py-3 text-sm font-black text-white disabled:bg-slate-200 disabled:text-slate-500 inline-flex items-center gap-2"><WalletCards className="w-4 h-4" />PAY ALL</button>}
                  </div>
                </div>
                <div className="flex flex-wrap gap-2">{(batch.channel_breakdown||[]).map((x)=><div key={x.provider} className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs"><strong>{x.provider}</strong> · {x.recipients} · {money(x.amount)}</div>)}</div>
              </div>;
            })}
          </section>

          <section className="space-y-4">
            <SectionTitle eyebrow="Expenses" title="Approved Expenses Ready for Payment" />
            {!data.expenses.length ? <Empty text="No CEO-approved expenses are waiting for payment." /> : data.expenses.map((expense)=><div key={expense.id} className="rounded-3xl border border-slate-200 bg-white p-5 sm:p-6 shadow-sm">
              <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-5">
                <div>
                  <div className="flex items-center gap-2 flex-wrap"><h3 className="font-black">{expense.request_code}</h3>{expense.payment_ready?<Badge good text="Verified payee"/>:<Badge text="Recipient incomplete"/>}</div>
                  <p className="font-semibold mt-2">{expense.purpose}</p>
                  <p className="text-xs text-slate-500 mt-1">{expense.site?.site_name || 'Unknown site'} · {expense.category?.category_name || 'Uncategorised'} · {expense.payment_type==='site_advance'?'Site advance':'Direct vendor payment'}</p>
                  {expense.payee ? <div className="mt-3 rounded-2xl bg-slate-50 border border-slate-200 p-3 text-xs"><div className="font-black text-slate-700">Pay to: {expense.payee.display_name}</div><div className="mt-1 text-slate-500">{expense.payee.payout?.provider?.name || 'Provider'} · {expense.payee.payout?.masked_destination || 'No verified destination'}{expense.payee.payout?.branch_code ? ` · Branch ${expense.payee.payout.branch_code}` : ''}</div></div> : <p className="mt-2 text-xs font-semibold text-amber-700">{expense.payment_blockers?.[0]}</p>}
                </div>
                <div className="flex items-center gap-4">
                  <div className="text-right"><p className="text-[10px] uppercase tracking-wider font-black text-slate-400">Approved</p><p className="text-xl font-black">{money(expense.approved_amount)}</p></div>
                  {expense.payment_run ? <Badge good text={`Released · ${expense.payment_run.run_code}`}/> : <button onClick={()=>setConfirmExpense(expense)} disabled={!expense.payment_ready || busyId===expense.id} className="rounded-xl bg-indigo-600 px-5 py-3 text-sm font-black text-white disabled:bg-slate-200 disabled:text-slate-500 inline-flex items-center gap-2"><CreditCard className="w-4 h-4" />PAY EXPENSE</button>}
                </div>
              </div>
            </div>)}
          </section>

          <section className="space-y-4">
            <SectionTitle eyebrow="Payments" title="Payment Status" />
            {!data.payment_runs.length ? <Empty text="No payments have been released yet." /> : data.payment_runs.map((run)=><div key={run.id} className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm space-y-4">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
                <div>
                  <div className="flex items-center gap-2"><h3 className="font-black">{run.run_code}</h3><RunStatus value={run.status}/><span className="text-[10px] uppercase font-black text-slate-400">{run.run_type}</span></div>
                  <p className="text-xs text-slate-500 mt-1">Released {run.authorized_at?new Date(run.authorized_at).toLocaleString('en-BW'):'—'}</p>
                  {run.batch?.scheduled_payment_date && <p className="text-xs font-bold text-indigo-700 mt-1">Payroll date: {dateLabel(run.batch.scheduled_payment_date)}</p>}
                  {run.source_account&&<p className="text-xs text-slate-500 mt-1">Source: {run.source_account.account_name} · {run.source_account.institution_name} {run.source_account.account_identifier_label||''}</p>}
                </div>
                <div className="text-right"><div className="text-[10px] uppercase text-slate-400 font-black">Payment total</div><div className="text-xl font-black">{money(run.total_amount)}</div></div>
              </div>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3"><Progress label="Queued" value={run.progress.queued}/><Progress label="Submitted" value={run.progress.submitted}/><Progress label="Paid" value={run.progress.paid} good/><Progress label="Failed" value={run.progress.failed} danger={run.progress.failed>0}/></div>
            </div>)}
          </section>
        </>}
      </main>
    </div>

    {confirmBatch && <ConfirmModal title="Release Payroll Payment?" subtitle={confirmBatch.batch_code} busy={busyId===confirmBatch.id} onClose={()=>setConfirmBatch(null)} onConfirm={payAll} confirmLabel="Pay All">
      <div className="grid grid-cols-2 gap-3"><Progress label="Employees" value={confirmBatch.payable_recipients}/><Progress label="Amount" value={money(confirmBatch.net_total)} good/></div>
      <div className="rounded-xl border border-indigo-100 bg-indigo-50 p-3 text-sm"><div className="font-black text-indigo-950">Scheduled payday: {dateLabel(confirmBatch.scheduled_payment_date)}</div><p className="text-xs text-indigo-800 mt-1">This is the CEO's final release of the locked payroll batch. Finance submits the released instructions to FNB or the approved mobile channel; settlement status is then recorded against each employee.</p></div>
    </ConfirmModal>}

    {confirmExpense && <ConfirmModal title="Release Expense Payment?" subtitle={confirmExpense.request_code} busy={busyId===confirmExpense.id} onClose={()=>setConfirmExpense(null)} onConfirm={payExpense} confirmLabel="Pay Expense">
      <div className="space-y-3"><Progress label="Amount" value={money(confirmExpense.approved_amount)} good/><div className="rounded-xl bg-slate-50 border border-slate-200 p-3 text-sm"><div className="font-black">{confirmExpense.payee?.display_name}</div><div className="text-xs text-slate-500 mt-1">{confirmExpense.payee?.payout?.provider?.name} · {confirmExpense.payee?.payout?.masked_destination}</div></div></div>
      <div className="rounded-xl border border-indigo-100 bg-indigo-50 p-3 text-xs text-indigo-800">The CEO releases this approved expense to the verified payee. Finance submits the instruction using the company payment account and records the bank/mobile result.</div>
    </ConfirmModal>}
  </div>;
}

function Stat({icon:Icon,label,value,helper}){return <div className="bg-white border border-slate-200 rounded-3xl p-5"><div className="flex justify-between"><p className="text-[10px] uppercase tracking-wider font-black text-slate-400">{label}</p><Icon className="w-4 h-4 text-indigo-600"/></div><p className="text-2xl font-black mt-2">{value}</p><p className="text-xs text-slate-500 mt-2">{helper}</p></div>}
function SectionTitle({eyebrow,title,onRefresh,refreshing}){return <div className="flex items-end justify-between"><div><p className="text-xs font-black uppercase tracking-wider text-indigo-600">{eyebrow}</p><h2 className="text-xl font-black mt-1">{title}</h2></div>{onRefresh&&<button onClick={onRefresh} className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-bold inline-flex gap-2 items-center"><RefreshCw className={`w-4 h-4 ${refreshing?'animate-spin':''}`}/>Refresh</button>}</div>}
function Badge({good=false,text}){return <span className={`px-2.5 py-1 rounded-lg text-[10px] font-black uppercase ${good?'bg-emerald-50 text-emerald-700 border border-emerald-200':'bg-amber-50 text-amber-700 border border-amber-200'}`}>{text}</span>}
function PaydayBadge({state}){const cls=state.tone==='good'?'bg-emerald-50 text-emerald-700 border-emerald-200':state.tone==='danger'?'bg-rose-50 text-rose-700 border-rose-200':state.tone==='warn'?'bg-amber-50 text-amber-700 border-amber-200':'bg-slate-50 text-slate-600 border-slate-200';return <span className={`px-2.5 py-1 rounded-lg text-[10px] font-black uppercase border ${cls}`}>{state.label}</span>}
function RunStatus({value}){const good=value==='completed';const bad=['failed','partial_failed'].includes(value);const label=value==='prepared'?'released':value==='executing'?'processing':pretty(value);return <span className={`px-2.5 py-1 rounded-lg text-[10px] font-black uppercase ${good?'bg-emerald-50 text-emerald-700':bad?'bg-rose-50 text-rose-700':value==='executing'?'bg-indigo-50 text-indigo-700':'bg-amber-50 text-amber-700'}`}>{label}</span>}
function Progress({label,value,good=false,danger=false}){return <div className={`rounded-xl border p-3 ${good?'border-emerald-200 bg-emerald-50':danger?'border-rose-200 bg-rose-50':'border-slate-200 bg-slate-50'}`}><p className="text-[10px] uppercase tracking-wider font-black text-slate-400">{label}</p><p className={`mt-1 font-black ${good?'text-emerald-800':danger?'text-rose-700':'text-slate-900'}`}>{value}</p></div>}
function Empty({text}){return <div className="bg-white border border-slate-200 rounded-3xl p-8 text-center text-sm text-slate-500">{text}</div>}
function Notice({type,message,onClose}){return <div className={`rounded-2xl border p-4 flex justify-between gap-3 text-sm font-semibold ${type==='success'?'border-emerald-200 bg-emerald-50 text-emerald-800':'border-rose-200 bg-rose-50 text-rose-700'}`}><span className="flex gap-2">{type==='success'?<CheckCircle2 className="w-4 h-4 mt-0.5"/>:<AlertCircle className="w-4 h-4 mt-0.5"/>}{message}</span><button onClick={onClose}><X className="w-4 h-4"/></button></div>}
function ConfirmModal({title,subtitle,busy,onClose,onConfirm,confirmLabel,children}){return <div className="fixed inset-0 z-[100] bg-slate-950/60 p-4 flex items-center justify-center"><div className="w-full max-w-lg rounded-3xl bg-white shadow-2xl overflow-hidden"><div className="p-5 border-b border-slate-100 flex justify-between"><div><p className="text-[10px] uppercase tracking-wider font-black text-indigo-600">Final Payment Release</p><h2 className="text-xl font-black mt-1">{title}</h2><p className="text-sm text-slate-500 mt-1">{subtitle}</p></div><button disabled={busy} onClick={onClose} className="p-2 rounded-xl hover:bg-slate-100"><X className="w-5 h-5"/></button></div><div className="p-5 space-y-4">{children}<div className="flex justify-end gap-2"><button disabled={busy} onClick={onClose} className="rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-bold">Cancel</button><button disabled={busy} onClick={onConfirm} className="rounded-xl bg-indigo-600 px-5 py-2.5 text-sm font-black text-white inline-flex items-center gap-2">{busy&&<Loader2 className="w-4 h-4 animate-spin"/>}{confirmLabel}</button></div></div></div></div>}
