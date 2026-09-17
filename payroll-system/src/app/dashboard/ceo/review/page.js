'use client';

import { useEffect, useMemo, useState } from 'react';
import {
  CalendarDays,
  CheckCircle2,
  XCircle,
  Loader2,
  Search,
  AlertCircle,
  WalletCards,
} from 'lucide-react';
import CeoNavbar from '@/components/ceo/CeoNavbar';
import CeoSideNav from '@/components/ceo/CeoSideNav';

const money = (value) => `BWP ${Number(value || 0).toLocaleString('en-BW', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
const prettyStatus = (value) => String(value || '').replaceAll('_', ' ');
const dateLabel = (value) => value ? new Date(`${value}T12:00:00`).toLocaleDateString('en-BW', { day: '2-digit', month: 'short', year: 'numeric' }) : 'Not scheduled';

export default function CeoPayrollApprovalPage() {
  const [queue, setQueue] = useState([]);
  const [summary, setSummary] = useState({});
  const [selected, setSelected] = useState(null);
  const [loading, setLoading] = useState(true);
  const [detailLoading, setDetailLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [rejectReason, setRejectReason] = useState('');

  const loadQueue = async () => {
    setError('');
    const response = await fetch('/api/ceo/payroll', { cache: 'no-store' });
    const json = await response.json();
    if (!response.ok || !json.success) throw new Error(json.error || 'Failed to load payroll queue.');
    setQueue(json.data || []);
    setSummary(json.summary || {});
  };

  useEffect(() => {
    (async () => {
      try { await loadQueue(); }
      catch (err) { setError(err.message || 'Failed to load payroll queue.'); }
      finally { setLoading(false); }
    })();
  }, []);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return queue;
    return queue.filter((row) =>
      row.batch_code?.toLowerCase().includes(q) ||
      row.pay_period?.period_name?.toLowerCase().includes(q) ||
      row.submitted_by_profile?.name?.toLowerCase().includes(q)
    );
  }, [queue, search]);

  const openBatch = async (id) => {
    setDetailLoading(true);
    setError('');
    setRejectReason('');
    try {
      const response = await fetch(`/api/ceo/payroll/${id}`, { cache: 'no-store' });
      const json = await response.json();
      if (!response.ok || !json.success) throw new Error(json.error || 'Failed to load payroll batch.');
      setSelected(json.data);
    } catch (err) {
      setError(err.message || 'Failed to load payroll batch.');
    } finally {
      setDetailLoading(false);
    }
  };

  const review = async (action) => {
    if (!selected) return;
    if (action === 'reject' && !rejectReason.trim()) {
      setError('Enter a rejection reason before returning this batch.');
      return;
    }
    setSubmitting(true);
    setError('');
    try {
      const response = await fetch(`/api/ceo/payroll/${selected.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action, reason: rejectReason.trim() || null }),
      });
      const json = await response.json();
      if (!response.ok || !json.success) throw new Error(json.error || 'Failed to review payroll batch.');
      setSelected(null);
      setRejectReason('');
      await loadQueue();
    } catch (err) {
      setError(err.message || 'Failed to review payroll batch.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col lg:flex-row">
      <CeoSideNav />
      <div className="flex-1 min-w-0">
        <CeoNavbar title="Payroll Approval" subtitle="Review payroll, target payday and payout readiness before release" />
        <main className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <Stat label="Awaiting CEO" value={summary.awaiting_review || 0} />
            <Stat label="Approved for Payment" value={summary.approved_waiting_payment || 0} />
            <Stat label="Approved Amount Waiting" value={money(summary.approved_waiting_payment_total)} />
          </div>

          {error && <ErrorBox message={error} />}

          <div className="bg-white border border-slate-200 rounded-3xl p-4 shadow-xs">
            <div className="relative max-w-md">
              <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search batch, pay period or Accountant..." className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 bg-slate-50 text-sm outline-none focus:border-emerald-500" />
            </div>
          </div>

          {loading ? (
            <div className="py-20 flex justify-center items-center gap-2 text-slate-500 font-semibold"><Loader2 className="w-5 h-5 animate-spin" /> Loading payroll queue...</div>
          ) : !filtered.length ? (
            <div className="bg-white border border-slate-200 rounded-3xl p-10 text-center text-slate-500">No payroll batches have reached the CEO queue.</div>
          ) : (
            <div className="space-y-4">
              {filtered.map((batch) => (
                <div key={batch.id} className="bg-white border border-slate-200 rounded-3xl p-5 sm:p-6 shadow-xs flex flex-col xl:flex-row xl:items-center justify-between gap-5">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="font-black text-slate-900">{batch.batch_code}</h3>
                      <Status value={batch.status} />
                    </div>
                    <p className="text-sm text-slate-500 mt-2">{batch.pay_period?.period_name || 'Pay period unavailable'} · {batch.total_employees} employees</p>
                    <p className="text-xs text-indigo-700 font-bold mt-1 inline-flex items-center gap-1.5"><CalendarDays className="w-3.5 h-3.5" />Scheduled payday: {dateLabel(batch.scheduled_payment_date)}</p>
                    <p className="text-xs text-slate-400 mt-1">Submitted by {batch.submitted_by_profile?.name || 'Accountant'} {batch.submitted_at ? `· ${new Date(batch.submitted_at).toLocaleString()}` : ''}</p>
                  </div>
                  <div className="flex flex-col sm:flex-row sm:items-center gap-4 shrink-0">
                    <div className="sm:text-right"><p className="text-[10px] font-black uppercase tracking-wider text-slate-400">Net Payroll</p><p className="text-xl font-black text-slate-900">{money(batch.net_total)}</p></div>
                    <button onClick={() => openBatch(batch.id)} disabled={detailLoading} className="px-5 py-3 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-sm font-black disabled:opacity-50">Review Batch</button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </main>
      </div>

      {selected && (
        <div className="fixed inset-0 z-50 bg-slate-950/60 p-4 overflow-y-auto">
          <div className="max-w-5xl mx-auto my-4 bg-white rounded-3xl shadow-2xl border border-slate-200 overflow-hidden">
            <div className="p-5 sm:p-6 border-b border-slate-100 flex items-start justify-between gap-4">
              <div><p className="text-xs font-black uppercase tracking-wider text-emerald-600">CEO Payroll Review</p><h2 className="text-xl font-black text-slate-900 mt-1">{selected.batch_code}</h2><p className="text-sm text-slate-500 mt-1">{selected.pay_period?.period_name || 'Pay period unavailable'}</p></div>
              <button onClick={() => setSelected(null)} className="p-2 rounded-xl hover:bg-slate-100 text-slate-500"><XCircle className="w-5 h-5" /></button>
            </div>

            <div className="p-5 sm:p-6 space-y-6">
              <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
                <Mini label="Employees" value={selected.total_employees} />
                <Mini label="Regular Hours" value={selected.total_regular_hours} />
                <Mini label="Overtime Hours" value={selected.total_overtime_hours} />
                <Mini label="Net Payroll" value={money(selected.net_total)} />
                <Mini label="Pay Date" value={dateLabel(selected.scheduled_payment_date)} />
              </div>

              <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4">
                <div className="flex items-center gap-2 mb-3"><WalletCards className="w-4 h-4 text-emerald-600" /><h3 className="text-sm font-black text-slate-900">Payout Readiness</h3></div>
                {selected.blockers?.missing_payout_profiles > 0 ? (
                  <p className="text-sm text-rose-700 font-semibold">{selected.blockers.missing_payout_profiles} employee payout profile(s) are missing or unverified.</p>
                ) : (
                  <p className="text-sm text-emerald-700 font-semibold">All payable employees have verified payout snapshots.</p>
                )}
                <div className="mt-3 flex flex-wrap gap-2">
                  {(selected.payout_breakdown || []).map((row) => <span key={row.provider} className="px-3 py-1.5 rounded-xl bg-white border border-slate-200 text-xs font-bold text-slate-700">{row.provider}: {row.employees} · {money(row.amount)}</span>)}
                </div>
              </div>

              <div className="overflow-x-auto border border-slate-200 rounded-2xl">
                <table className="min-w-full text-sm">
                  <thead className="bg-slate-50 text-[10px] uppercase tracking-wider text-slate-500"><tr><th className="text-left px-4 py-3">Employee</th><th className="text-left px-4 py-3">Hours</th><th className="text-left px-4 py-3">Provider</th><th className="text-left px-4 py-3">Destination</th><th className="text-right px-4 py-3">Net Pay</th></tr></thead>
                  <tbody className="divide-y divide-slate-100">
                    {(selected.entries || []).map((entry) => (
                      <tr key={entry.id}><td className="px-4 py-3"><p className="font-bold text-slate-900">{entry.employee?.name || 'Unknown employee'}</p><p className="text-xs text-slate-400">{entry.employee?.employee_code || ''}</p></td><td className="px-4 py-3 text-slate-600">{entry.regular_hours} + {entry.overtime_hours} OT</td><td className="px-4 py-3 text-slate-600">{entry.payout_provider_name_snapshot || 'Missing'}</td><td className="px-4 py-3 font-mono text-xs text-slate-600">{entry.payout_destination_masked || 'Missing'}</td><td className="px-4 py-3 text-right font-black text-slate-900">{money(entry.net_pay)}</td></tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {selected.status === 'ready_for_ceo' && (
                <div className="border-t border-slate-100 pt-5 space-y-4">
                  <textarea value={rejectReason} onChange={(e) => setRejectReason(e.target.value)} placeholder="Rejection reason (required only when rejecting)..." rows={3} className="w-full rounded-xl border border-slate-200 bg-slate-50 p-3 text-sm outline-none focus:border-emerald-500" />
                  <div className="flex flex-col sm:flex-row gap-3 sm:justify-end">
                    <button onClick={() => review('reject')} disabled={submitting} className="px-5 py-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 font-black text-sm disabled:opacity-50 flex items-center justify-center gap-2"><XCircle className="w-4 h-4" /> Reject & Return</button>
                    <button onClick={() => review('approve')} disabled={submitting || selected.blockers?.missing_payout_profiles > 0 || !selected.scheduled_payment_date} className="px-5 py-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-black text-sm disabled:opacity-50 flex items-center justify-center gap-2">{submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />} Approve for Payment</button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function Stat({ label, value }) { return <div className="bg-white border border-slate-200 rounded-3xl p-5"><p className="text-[10px] font-black uppercase tracking-wider text-slate-400">{label}</p><p className="text-2xl font-black text-slate-900 mt-2">{value}</p></div>; }
function Mini({ label, value }) { return <div className="bg-slate-50 rounded-2xl p-4"><p className="text-[10px] uppercase font-black tracking-wider text-slate-400">{label}</p><p className="font-black text-slate-900 mt-1">{value}</p></div>; }
function Status({ value }) { const approved = ['approved_by_ceo','paid'].includes(value); const rejected = value === 'rejected_by_ceo'; return <span className={`px-2.5 py-1 rounded-lg text-[10px] font-black uppercase ${approved ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : rejected ? 'bg-rose-50 text-rose-700 border border-rose-200' : 'bg-amber-50 text-amber-700 border border-amber-200'}`}>{prettyStatus(value)}</span>; }
function ErrorBox({ message }) { return <div className="bg-rose-50 border border-rose-200 text-rose-700 rounded-2xl p-4 flex items-start gap-3"><AlertCircle className="w-5 h-5 mt-0.5" /><p className="text-sm font-semibold">{message}</p></div>; }
