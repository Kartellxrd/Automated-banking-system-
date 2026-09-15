'use client';

import { useCallback, useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { AlertTriangle, ArrowLeft, CheckCircle2, FileText, Loader2, RefreshCw, Send, WalletCards, XCircle } from 'lucide-react';
import AccNavbar from '@/components/accountant/AccNavbar';
import AccSideNav from '@/components/accountant/AccSideNav';

function money(value) {
  return `P${Number(value || 0).toLocaleString('en-BW', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function label(status) {
  return {
    draft: 'Draft', ready_for_ceo: 'Waiting for CEO', rejected_by_ceo: 'Returned by CEO', approved_by_ceo: 'CEO Approved', executing: 'Payment Running', paid: 'Paid', partial_failed: 'Partial Failure', failed: 'Failed',
  }[status] || status;
}

export default function PayrollBatchDetailPage() {
  const params = useParams();
  const router = useRouter();
  const id = params?.id;
  const [batch, setBatch] = useState(null);
  const [loading, setLoading] = useState(true);
  const [working, setWorking] = useState('');
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    setError('');
    try {
      const response = await fetch(`/api/accountant/payroll/${id}`, { cache: 'no-store' });
      const result = await response.json();
      if (!response.ok || !result.success) throw new Error(result.error || 'Could not load payroll batch.');
      setBatch(result.data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => { load(); }, [load]);

  async function act(action) {
    setWorking(action);
    setError('');
    try {
      const response = await fetch(`/api/accountant/payroll/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action }),
      });
      const result = await response.json();
      if (!response.ok || !result.success) throw new Error(result.error || 'Payroll action failed.');
      if (result.data?.entries) setBatch(result.data); else await load();
    } catch (err) {
      setError(err.message);
    } finally {
      setWorking('');
    }
  }

  return (
    <div className="min-h-screen bg-slate-100 flex flex-col lg:flex-row text-slate-900">
      <AccSideNav />
      <div className="flex-1 min-w-0">
        <AccNavbar title="Payroll Batch Review" subtitle="Verify employee calculations and payout readiness before CEO handoff" />
        <main className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto space-y-6">
          <button onClick={() => router.push('/dashboard/accountant/staging')} className="inline-flex items-center gap-2 text-sm font-bold text-slate-600"><ArrowLeft className="w-4 h-4" />Payroll Preparation</button>

          {error && <div className="rounded-2xl border border-rose-200 bg-rose-50 p-4 text-sm font-semibold text-rose-700 flex items-center gap-2"><AlertTriangle className="w-4 h-4" />{error}</div>}

          {loading ? <div className="p-20 flex justify-center gap-2 text-slate-500"><Loader2 className="w-5 h-5 animate-spin text-indigo-600" />Loading payroll batch...</div> : batch && <>
            <section className="rounded-3xl bg-slate-950 text-white p-6 sm:p-8 flex flex-col xl:flex-row xl:items-center justify-between gap-6">
              <div><p className="text-[11px] uppercase tracking-[0.18em] font-bold text-indigo-300">{label(batch.status)}</p><h1 className="text-2xl sm:text-3xl font-black mt-1">{batch.batch_code}</h1><p className="text-sm text-slate-300 mt-2">{batch.pay_period?.period_name} • {batch.total_employees} employees • {batch.rosters.length} approved roster{batch.rosters.length === 1 ? '' : 's'}</p>{batch.ceo_rejection_reason && <p className="mt-3 rounded-xl bg-rose-950/50 border border-rose-800 px-3 py-2 text-xs text-rose-200">CEO return reason: {batch.ceo_rejection_reason}</p>}</div>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-right"><Summary label="Regular" value={`${batch.total_regular_hours.toFixed(2)}h`} /><Summary label="OT" value={`${batch.total_overtime_hours.toFixed(2)}h`} /><Summary label="Gross" value={money(batch.gross_total)} /><Summary label="Net Batch" value={money(batch.net_total)} /></div>
            </section>

            <section className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="rounded-3xl border border-slate-200 bg-white p-5"><div className="text-xs font-bold text-slate-500">Payout Readiness</div><div className="text-3xl font-black mt-2">{batch.blockers.missing_payout_profiles === 0 ? 'Ready' : `${batch.blockers.missing_payout_profiles} blocked`}</div><p className="text-xs text-slate-500 mt-2">Employees with pay due must have a verified HR payout profile.</p></div>
              <div className="rounded-3xl border border-slate-200 bg-white p-5"><div className="text-xs font-bold text-slate-500">Deductions</div><div className="text-3xl font-black mt-2">{money(batch.deductions_total)}</div><p className="text-xs text-slate-500 mt-2">No automatic tax rule is being invented; current prepared entries retain configured deductions only.</p></div>
              <div className="rounded-3xl border border-slate-200 bg-white p-5"><div className="text-xs font-bold text-slate-500">Source Rosters</div><div className="mt-2 space-y-1">{batch.rosters.map((roster) => <div key={roster.id} className="text-sm font-bold">{roster.site?.site_name || 'Site'} • {roster.shift_date}</div>)}</div></div>
            </section>

            <section className="rounded-3xl border border-slate-200 bg-white shadow-sm overflow-hidden">
              <div className="p-5 border-b border-slate-100 flex items-center justify-between"><div><h2 className="font-black flex items-center gap-2"><FileText className="w-5 h-5 text-indigo-600" />Employee Payroll Entries</h2><p className="text-xs text-slate-500 mt-1">Exact gross = regular pay + overtime pay. OT multiplier is 1.5× on each source shift.</p></div><button onClick={() => act('refresh_payouts')} disabled={working || !['draft','rejected_by_ceo'].includes(batch.status)} className="rounded-xl border border-slate-200 px-3 py-2 text-xs font-bold inline-flex items-center gap-2 disabled:opacity-40"><RefreshCw className={`w-4 h-4 ${working === 'refresh_payouts' ? 'animate-spin' : ''}`} />Refresh HR Payouts</button></div>
              <div className="overflow-x-auto"><table className="w-full text-left"><thead className="bg-slate-50 text-[10px] uppercase tracking-wider text-slate-400"><tr><th className="px-5 py-3">Employee</th><th className="px-5 py-3">Hours</th><th className="px-5 py-3">Regular Pay</th><th className="px-5 py-3">OT Pay</th><th className="px-5 py-3">Net Pay</th><th className="px-5 py-3">Payout</th></tr></thead><tbody className="divide-y divide-slate-100">{batch.entries.map((entry) => <tr key={entry.id}><td className="px-5 py-4"><div className="font-bold text-sm">{entry.employee?.name || 'Unknown Employee'}</div><div className="text-xs text-slate-500">{entry.employee?.employee_code} • {entry.employee?.job_role || 'No role'}</div>{entry.has_multiple_rates && <span className="text-[10px] font-bold text-amber-700">Multiple rate snapshots</span>}</td><td className="px-5 py-4 text-sm"><div>{entry.regular_hours.toFixed(2)}h regular</div><div className="text-amber-700 font-bold">{entry.overtime_hours.toFixed(2)}h OT</div></td><td className="px-5 py-4 font-bold">{money(entry.regular_pay)}</td><td className="px-5 py-4 font-bold text-amber-700">{money(entry.overtime_pay)}</td><td className="px-5 py-4 font-black">{money(entry.net_pay)}</td><td className="px-5 py-4">{entry.payout_ready ? <div><span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2.5 py-1 text-[10px] font-bold text-emerald-700"><CheckCircle2 className="w-3 h-3" />Verified</span><div className="text-xs mt-1 text-slate-500">{entry.payout_provider_name_snapshot}<br />••••{String(entry.payout_account_snapshot || '').slice(-4)}</div></div> : <span className="inline-flex items-center gap-1 rounded-full bg-rose-50 px-2.5 py-1 text-[10px] font-bold text-rose-700"><XCircle className="w-3 h-3" />Missing HR payout</span>}</td></tr>)}</tbody></table></div>
            </section>

            <section className="rounded-3xl border border-indigo-100 bg-white p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4"><div className="flex items-start gap-3"><WalletCards className="w-5 h-5 text-indigo-600 mt-0.5" /><div><h3 className="font-black text-sm">Submit the whole batch to CEO</h3><p className="text-xs text-slate-500 mt-1">Once submitted, Accountant can no longer change the batch unless CEO returns it.</p></div></div><button onClick={() => act('submit_to_ceo')} disabled={!batch.can_submit_to_ceo || working} className="rounded-xl bg-indigo-600 px-5 py-3 text-sm font-bold text-white disabled:opacity-40 inline-flex items-center justify-center gap-2">{working === 'submit_to_ceo' ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}Submit Batch to CEO</button></section>
          </>}
        </main>
      </div>
    </div>
  );
}

function Summary({ label, value }) { return <div><div className="text-[10px] uppercase tracking-wider text-slate-400 font-bold">{label}</div><div className="font-black text-lg mt-1">{value}</div></div>; }
