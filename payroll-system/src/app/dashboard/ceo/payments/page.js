'use client';

import { useEffect, useState } from 'react';
import {
  WalletCards,
  Users,
  ReceiptText,
  Loader2,
  AlertCircle,
  LockKeyhole,
  CheckCircle2,
  Ban,
  Layers3,
} from 'lucide-react';
import CeoNavbar from '@/components/ceo/CeoNavbar';
import CeoSideNav from '@/components/ceo/CeoSideNav';

const money = (value) => `BWP ${Number(value || 0).toLocaleString('en-BW', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

export default function CeoPaymentCenterPage() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [preparingId, setPreparingId] = useState(null);
  const [error, setError] = useState('');

  const load = async () => {
    setError('');
    const response = await fetch('/api/ceo/payment-center', { cache: 'no-store' });
    const json = await response.json();
    if (!response.ok || !json.success) throw new Error(json.error || 'Failed to load payment center.');
    setData(json.data);
  };

  useEffect(() => {
    (async () => {
      try { await load(); }
      catch (err) { setError(err.message || 'Failed to load payment center.'); }
      finally { setLoading(false); }
    })();
  }, []);

  const preparePayrollRun = async (batchId) => {
    setPreparingId(batchId);
    setError('');
    try {
      const response = await fetch('/api/ceo/payment-center', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'prepare_payroll', batch_id: batchId }),
      });
      const json = await response.json();
      if (!response.ok || !json.success) throw new Error(json.error || 'Failed to prepare payment run.');
      await load();
    } catch (err) {
      setError(err.message || 'Failed to prepare payment run.');
    } finally {
      setPreparingId(null);
    }
  };

  const summary = data?.summary;

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col lg:flex-row">
      <CeoSideNav />
      <div className="flex-1 min-w-0">
        <CeoNavbar title="Payment Center" subtitle="Approved payroll and expenses waiting for controlled payment execution" />

        <main className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto space-y-6">
          {loading && <div className="py-20 flex justify-center items-center gap-2 text-slate-500 font-semibold"><Loader2 className="w-5 h-5 animate-spin" /> Loading payment center...</div>}
          {!loading && error && <ErrorBox message={error} />}

          {!loading && data && (
            <>
              <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
                <Stat icon={Users} label="Payroll Recipients" value={summary.payroll_recipients} helper={`${summary.payroll_batches} approved batch(es)`} />
                <Stat icon={WalletCards} label="Payroll Waiting" value={money(summary.payroll_total)} helper={`${summary.payroll_ready_batches} batch(es) pass payout preflight`} />
                <Stat icon={Layers3} label="Prepared Payment Runs" value={summary.prepared_payment_runs} helper="Immutable payroll execution plans" />
                <Stat icon={ReceiptText} label="Expenses Waiting" value={money(summary.expense_total)} helper={`${summary.expense_requests} approved request(s)`} />
              </div>

              <div className="bg-amber-50 border border-amber-200 rounded-3xl p-5 sm:p-6 flex items-start gap-3">
                <LockKeyhole className="w-5 h-5 text-amber-700 mt-0.5 shrink-0" />
                <div>
                  <h2 className="font-black text-amber-900">Payment orchestration is live; fund movement is not</h2>
                  <p className="text-sm text-amber-800 mt-1">{data.execution.message}</p>
                  <p className="text-xs text-amber-700 mt-2 font-semibold">The CEO can prepare and lock a channel-aware payroll run now. The final Execute Pay All action will be enabled only after the company confirms a real corporate payout rail.</p>
                </div>
              </div>

              <section className="space-y-4">
                <div><p className="text-xs font-black uppercase tracking-wider text-emerald-600">Payroll</p><h2 className="text-xl font-black text-slate-900 mt-1">Approved Payroll Batches</h2></div>

                {!data.payroll.length ? (
                  <Empty text="No CEO-approved payroll batches are waiting for payment." />
                ) : data.payroll.map((batch) => (
                  <div key={batch.id} className="bg-white border border-slate-200 rounded-3xl p-5 sm:p-6 shadow-xs space-y-5">
                    <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-5">
                      <div>
                        <div className="flex flex-wrap items-center gap-2">
                          <h3 className="font-black text-slate-900">{batch.batch_code}</h3>
                          {batch.payment_run ? <Badge good text={`Run ${batch.payment_run.run_code} prepared`} /> : batch.payment_ready ? <Badge good text="Payout preflight passed" /> : <Badge text={`${batch.payment_blockers} blocker(s)`} />}
                        </div>
                        <p className="text-sm text-slate-500 mt-2">{batch.pay_period?.period_name || 'Pay period unavailable'} · {batch.payable_recipients} payable employees</p>
                        {batch.payment_run && <p className="text-xs text-slate-500 mt-1">Prepared {new Date(batch.payment_run.prepared_at).toLocaleString()} · {batch.payment_run.total_items} items · {money(batch.payment_run.total_amount)}</p>}
                      </div>
                      <div className="flex flex-col sm:flex-row sm:items-center gap-4">
                        <div className="sm:text-right"><p className="text-[10px] font-black uppercase tracking-wider text-slate-400">Net Payroll</p><p className="text-2xl font-black text-slate-900">{money(batch.net_total)}</p></div>
                        {batch.payment_run ? (
                          <button disabled className="px-6 py-3 rounded-xl bg-slate-200 text-slate-500 text-sm font-black cursor-not-allowed">EXECUTION AWAITS ADAPTER</button>
                        ) : (
                          <button onClick={() => preparePayrollRun(batch.id)} disabled={!batch.payment_ready || preparingId === batch.id} className="px-6 py-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-sm font-black disabled:bg-slate-200 disabled:text-slate-500 disabled:cursor-not-allowed flex items-center justify-center gap-2">
                            {preparingId === batch.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <Layers3 className="w-4 h-4" />} PREPARE PAY ALL
                          </button>
                        )}
                      </div>
                    </div>

                    <div className="flex flex-wrap gap-2">
                      {(batch.channel_breakdown || []).map((item) => (
                        <div key={item.provider} className="px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-700">
                          <span className="font-black">{item.provider}</span> · {item.recipients} · {money(item.amount)}
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </section>

              <section className="space-y-4">
                <div><p className="text-xs font-black uppercase tracking-wider text-emerald-600">Expenses</p><h2 className="text-xl font-black text-slate-900 mt-1">Approved Expense Payments</h2></div>

                {!data.expenses.length ? (
                  <Empty text="No CEO-approved expenses are waiting for payment." />
                ) : data.expenses.map((expense) => (
                  <div key={expense.id} className="bg-white border border-slate-200 rounded-3xl p-5 shadow-xs flex flex-col xl:flex-row xl:items-center justify-between gap-5">
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2"><h3 className="font-black text-slate-900">{expense.request_code}</h3><Badge text="Payee destination required" /></div>
                      <p className="text-sm font-semibold text-slate-700 mt-2">{expense.purpose}</p>
                      <p className="text-xs text-slate-500 mt-1">{expense.site?.site_name || 'Unknown site'} · {expense.category?.category_name || 'Uncategorised'} · {expense.payment_type === 'site_advance' ? 'Site advance' : 'Direct vendor'}</p>
                      <p className="text-xs text-rose-600 font-semibold mt-2 flex items-center gap-1"><Ban className="w-3.5 h-3.5" /> {expense.payment_blockers?.[0]}</p>
                    </div>
                    <div className="flex flex-col sm:flex-row sm:items-center gap-4 shrink-0">
                      <div className="sm:text-right"><p className="text-[10px] font-black uppercase tracking-wider text-slate-400">Approved Amount</p><p className="text-xl font-black text-slate-900">{money(expense.approved_amount)}</p></div>
                      <button disabled className="px-5 py-3 rounded-xl bg-slate-200 text-slate-500 text-sm font-black cursor-not-allowed">Pay Expense</button>
                    </div>
                  </div>
                ))}
              </section>
            </>
          )}
        </main>
      </div>
    </div>
  );
}

function Stat({ icon: Icon, label, value, helper }) { return <div className="bg-white border border-slate-200 rounded-3xl p-5"><div className="flex items-center justify-between"><p className="text-[10px] font-black uppercase tracking-wider text-slate-400">{label}</p><Icon className="w-4 h-4 text-emerald-600" /></div><p className="text-2xl font-black text-slate-900 mt-2">{value}</p><p className="text-xs text-slate-500 mt-2">{helper}</p></div>; }
function Badge({ good = false, text }) { return <span className={`px-2.5 py-1 rounded-lg text-[10px] font-black uppercase ${good ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-amber-50 text-amber-700 border border-amber-200'}`}>{text}</span>; }
function Empty({ text }) { return <div className="bg-white border border-slate-200 rounded-3xl p-8 text-center text-sm text-slate-500">{text}</div>; }
function ErrorBox({ message }) { return <div className="bg-rose-50 border border-rose-200 text-rose-700 rounded-2xl p-4 flex items-start gap-3"><AlertCircle className="w-5 h-5 mt-0.5" /><p className="text-sm font-semibold">{message}</p></div>; }
