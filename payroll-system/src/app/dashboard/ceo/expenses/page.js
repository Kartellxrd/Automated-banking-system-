'use client';

import { useEffect, useMemo, useState } from 'react';
import {
  ReceiptText,
  CheckCircle2,
  XCircle,
  Loader2,
  Search,
  AlertCircle,
  ExternalLink,
} from 'lucide-react';
import CeoNavbar from '@/components/ceo/CeoNavbar';
import CeoSideNav from '@/components/ceo/CeoSideNav';

const money = (value) => `BWP ${Number(value || 0).toLocaleString('en-BW', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
const prettyStatus = (value) => String(value || '').replaceAll('_', ' ');

export default function CeoExpenseApprovalPage() {
  const [rows, setRows] = useState([]);
  const [summary, setSummary] = useState({});
  const [selected, setSelected] = useState(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [approvedAmount, setApprovedAmount] = useState('');
  const [rejectReason, setRejectReason] = useState('');

  const load = async () => {
    setError('');
    const response = await fetch('/api/ceo/expense-requests', { cache: 'no-store' });
    const json = await response.json();
    if (!response.ok || !json.success) throw new Error(json.error || 'Failed to load expense requests.');
    setRows(json.data || []);
    setSummary(json.summary || {});
  };

  useEffect(() => {
    (async () => {
      try { await load(); }
      catch (err) { setError(err.message || 'Failed to load expense requests.'); }
      finally { setLoading(false); }
    })();
  }, []);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return rows;
    return rows.filter((row) =>
      row.request_code?.toLowerCase().includes(q) ||
      row.site?.site_name?.toLowerCase().includes(q) ||
      row.category?.category_name?.toLowerCase().includes(q) ||
      row.purpose?.toLowerCase().includes(q)
    );
  }, [rows, search]);

  const open = (row) => {
    setSelected(row);
    setApprovedAmount(String(row.accountant_recommended_amount ?? row.requested_amount ?? ''));
    setRejectReason('');
    setError('');
  };

  const review = async (action) => {
    if (!selected) return;
    if (action === 'reject' && !rejectReason.trim()) {
      setError('Enter a rejection reason before rejecting this expense request.');
      return;
    }
    const amount = Number(approvedAmount);
    if (action === 'approve' && (!Number.isFinite(amount) || amount <= 0)) {
      setError('Enter a valid approved amount greater than zero.');
      return;
    }

    setSubmitting(true);
    setError('');
    try {
      const response = await fetch('/api/ceo/expense-requests', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: selected.id,
          action,
          approved_amount: action === 'approve' ? amount : null,
          reason: rejectReason.trim() || null,
        }),
      });
      const json = await response.json();
      if (!response.ok || !json.success) throw new Error(json.error || 'Failed to review expense request.');
      setSelected(null);
      await load();
    } catch (err) {
      setError(err.message || 'Failed to review expense request.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col lg:flex-row">
      <CeoSideNav />
      <div className="flex-1 min-w-0">
        <CeoNavbar title="Expense Approval" subtitle="Final review of Accountant-recommended site expense requests" />
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
              <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search request, site, category or purpose..." className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 bg-slate-50 text-sm outline-none focus:border-emerald-500" />
            </div>
          </div>

          {loading ? (
            <div className="py-20 flex justify-center items-center gap-2 text-slate-500 font-semibold"><Loader2 className="w-5 h-5 animate-spin" /> Loading expense queue...</div>
          ) : !filtered.length ? (
            <div className="bg-white border border-slate-200 rounded-3xl p-10 text-center text-slate-500">No expense requests have reached the CEO queue.</div>
          ) : (
            <div className="space-y-4">
              {filtered.map((row) => (
                <div key={row.id} className="bg-white border border-slate-200 rounded-3xl p-5 sm:p-6 shadow-xs flex flex-col xl:flex-row xl:items-center justify-between gap-5">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="font-black text-slate-900">{row.request_code}</h3>
                      <Status value={row.status} />
                    </div>
                    <p className="text-sm text-slate-700 font-semibold mt-2">{row.purpose}</p>
                    <p className="text-xs text-slate-500 mt-1">{row.site?.site_name || 'Unknown site'} · {row.category?.category_name || 'Uncategorised'} · {row.payment_type === 'site_advance' ? 'Site advance' : 'Direct vendor'}</p>
                  </div>
                  <div className="flex flex-col sm:flex-row sm:items-center gap-4 shrink-0">
                    <div className="sm:text-right"><p className="text-[10px] font-black uppercase tracking-wider text-slate-400">Accountant Recommendation</p><p className="text-xl font-black text-slate-900">{money(row.accountant_recommended_amount ?? row.requested_amount)}</p></div>
                    <button onClick={() => open(row)} className="px-5 py-3 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-sm font-black">Review Request</button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </main>
      </div>

      {selected && (
        <div className="fixed inset-0 z-50 bg-slate-950/60 p-4 overflow-y-auto">
          <div className="max-w-3xl mx-auto my-6 bg-white rounded-3xl shadow-2xl border border-slate-200 overflow-hidden">
            <div className="p-5 sm:p-6 border-b border-slate-100 flex items-start justify-between gap-4">
              <div><p className="text-xs font-black uppercase tracking-wider text-emerald-600">CEO Expense Review</p><h2 className="text-xl font-black text-slate-900 mt-1">{selected.request_code}</h2><p className="text-sm text-slate-500 mt-1">{selected.site?.site_name || 'Unknown site'}</p></div>
              <button onClick={() => setSelected(null)} className="p-2 rounded-xl hover:bg-slate-100 text-slate-500"><XCircle className="w-5 h-5" /></button>
            </div>

            <div className="p-5 sm:p-6 space-y-6">
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                <Mini label="Requested" value={money(selected.requested_amount)} />
                <Mini label="Recommended" value={money(selected.accountant_recommended_amount ?? selected.requested_amount)} />
                <Mini label="Payment Type" value={selected.payment_type === 'site_advance' ? 'Site advance' : 'Direct vendor'} />
                <Mini label="Needed By" value={selected.needed_by_date || 'Not specified'} />
              </div>

              <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 space-y-3 text-sm">
                <Row label="Purpose" value={selected.purpose} />
                <Row label="Operational requester" value={`${selected.operational_requester_name || 'Unknown'}${selected.operational_requester_role ? ` (${selected.operational_requester_role})` : ''}`} />
                <Row label="Vendor" value={selected.vendor_name || 'Not specified'} />
                <Row label="Accountant reviewer" value={selected.accountant_reviewed_by_profile?.name || 'Accountant'} />
              </div>

              <div>
                <h3 className="text-sm font-black text-slate-900 flex items-center gap-2"><ReceiptText className="w-4 h-4 text-emerald-600" /> Supporting Documents</h3>
                <div className="mt-3 flex flex-wrap gap-2">
                  {(selected.documents || []).length ? selected.documents.map((doc) => (
                    <a key={doc.id} href={doc.preview_url || '#'} target="_blank" rel="noreferrer" className="px-3 py-2 rounded-xl border border-slate-200 bg-white text-xs font-bold text-slate-700 inline-flex items-center gap-2">{doc.original_filename}<ExternalLink className="w-3 h-3" /></a>
                  )) : <p className="text-sm text-slate-500">No supporting document attached.</p>}
                </div>
              </div>

              {selected.status === 'pending_ceo' && (
                <div className="border-t border-slate-100 pt-5 space-y-4">
                  <div>
                    <label className="block text-xs font-black uppercase tracking-wider text-slate-500 mb-2">CEO Approved Amount</label>
                    <input type="number" min="0" step="0.01" value={approvedAmount} onChange={(e) => setApprovedAmount(e.target.value)} className="w-full rounded-xl border border-slate-200 bg-slate-50 p-3 text-sm font-bold outline-none focus:border-emerald-500" />
                    <p className="text-xs text-slate-500 mt-1">Cannot exceed the Accountant recommendation or original request.</p>
                  </div>
                  <textarea value={rejectReason} onChange={(e) => setRejectReason(e.target.value)} placeholder="Rejection reason (required only when rejecting)..." rows={3} className="w-full rounded-xl border border-slate-200 bg-slate-50 p-3 text-sm outline-none focus:border-emerald-500" />
                  <div className="flex flex-col sm:flex-row gap-3 sm:justify-end">
                    <button onClick={() => review('reject')} disabled={submitting} className="px-5 py-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 font-black text-sm disabled:opacity-50 flex items-center justify-center gap-2"><XCircle className="w-4 h-4" /> Reject Expense</button>
                    <button onClick={() => review('approve')} disabled={submitting} className="px-5 py-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-black text-sm disabled:opacity-50 flex items-center justify-center gap-2">{submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />} Approve for Payment</button>
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
function Mini({ label, value }) { return <div className="bg-slate-50 rounded-2xl p-4"><p className="text-[10px] uppercase font-black tracking-wider text-slate-400">{label}</p><p className="font-black text-slate-900 mt-1 break-words">{value}</p></div>; }
function Row({ label, value }) { return <div className="grid grid-cols-3 gap-3"><span className="text-slate-500 font-semibold">{label}</span><span className="col-span-2 text-slate-900 font-bold">{value}</span></div>; }
function Status({ value }) { const approved = ['approved','funded','reconciled'].includes(value); const rejected = value === 'ceo_rejected'; return <span className={`px-2.5 py-1 rounded-lg text-[10px] font-black uppercase ${approved ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : rejected ? 'bg-rose-50 text-rose-700 border border-rose-200' : 'bg-amber-50 text-amber-700 border border-amber-200'}`}>{prettyStatus(value)}</span>; }
function ErrorBox({ message }) { return <div className="bg-rose-50 border border-rose-200 text-rose-700 rounded-2xl p-4 flex items-start gap-3"><AlertCircle className="w-5 h-5 mt-0.5" /><p className="text-sm font-semibold">{message}</p></div>; }
