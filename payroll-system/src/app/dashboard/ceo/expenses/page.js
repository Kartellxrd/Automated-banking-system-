'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ReceiptText,
  CheckCircle2,
  XCircle,
  Loader2,
  Search,
  AlertCircle,
  ExternalLink,
  RefreshCw,
  Clock3,
} from 'lucide-react';
import CeoNavbar from '@/components/ceo/CeoNavbar';
import CeoSideNav from '@/components/ceo/CeoSideNav';

const money = (value) => `BWP ${Number(value || 0).toLocaleString('en-BW', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
const prettyStatus = (value) => String(value || '').replaceAll('_', ' ');
const formatDateTime = (value) => value ? new Date(value).toLocaleString('en-BW') : 'Not available';

export default function CeoExpenseApprovalPage() {
  const [rows, setRows] = useState([]);
  const [summary, setSummary] = useState({});
  const [selected, setSelected] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('pending');
  const [approvedAmount, setApprovedAmount] = useState('');
  const [rejectReason, setRejectReason] = useState('');
  const [lastUpdated, setLastUpdated] = useState(null);

  const load = useCallback(async (silent = false) => {
    if (silent) setRefreshing(true);
    setError('');
    try {
      const response = await fetch('/api/ceo/expense-requests', { cache: 'no-store' });
      const json = await response.json();
      if (!response.ok || !json.success) throw new Error(json.error || 'Failed to load expense requests.');
      const data = json.data || [];
      setRows(data);
      setSummary(json.summary || {});
      setSelected((current) => current ? data.find((row) => row.id === current.id) || null : null);
      setLastUpdated(new Date());
    } finally {
      if (silent) setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    let mounted = true;
    (async () => {
      try { await load(false); }
      catch (err) { if (mounted) setError(err.message || 'Failed to load expense requests.'); }
      finally { if (mounted) setLoading(false); }
    })();

    const interval = setInterval(() => {
      load(true).catch((err) => setError(err.message || 'Failed to refresh expense requests.'));
    }, 10000);

    return () => {
      mounted = false;
      clearInterval(interval);
    };
  }, [load]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return rows
      .filter((row) => {
        const matchesSearch = !q ||
          row.request_code?.toLowerCase().includes(q) ||
          row.site?.site_name?.toLowerCase().includes(q) ||
          row.category?.category_name?.toLowerCase().includes(q) ||
          row.purpose?.toLowerCase().includes(q) ||
          row.operational_requester_name?.toLowerCase().includes(q) ||
          row.vendor_name?.toLowerCase().includes(q);
        const matchesStatus = statusFilter === 'all'
          ? true
          : statusFilter === 'pending'
            ? row.status === 'pending_ceo'
            : statusFilter === 'approved'
              ? row.status === 'approved'
              : statusFilter === 'rejected'
                ? row.status === 'ceo_rejected'
                : row.status === statusFilter;
        return matchesSearch && matchesStatus;
      })
      .sort((a, b) => {
        if (a.status === 'pending_ceo' && b.status !== 'pending_ceo') return -1;
        if (a.status !== 'pending_ceo' && b.status === 'pending_ceo') return 1;
        return new Date(b.accountant_reviewed_at || b.created_at || 0) - new Date(a.accountant_reviewed_at || a.created_at || 0);
      });
  }, [rows, search, statusFilter]);

  const open = (row) => {
    setSelected(row);
    setApprovedAmount(String(row.accountant_recommended_amount ?? row.requested_amount ?? ''));
    setRejectReason('');
    setError('');
    setSuccess('');
  };

  const review = async (action) => {
    if (!selected) return;
    if (action === 'reject' && !rejectReason.trim()) {
      setError('Enter a rejection reason before rejecting this expense request.');
      return;
    }
    const amount = Number(approvedAmount);
    const maxAllowed = Number(selected.accountant_recommended_amount ?? selected.requested_amount ?? 0);
    if (action === 'approve' && (!Number.isFinite(amount) || amount <= 0)) {
      setError('Enter a valid approved amount greater than zero.');
      return;
    }
    if (action === 'approve' && amount > maxAllowed) {
      setError('The approved amount cannot exceed the Accountant recommendation.');
      return;
    }

    setSubmitting(true);
    setError('');
    setSuccess('');
    const requestCode = selected.request_code;
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
      await load(false);
      setSuccess(action === 'approve'
        ? `${requestCode} was approved and moved to the Payment Center.`
        : `${requestCode} was rejected and removed from the pending CEO queue.`);
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
          {success && <div className="bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-2xl p-4 flex items-start gap-3"><CheckCircle2 className="w-5 h-5 mt-0.5" /><p className="text-sm font-semibold">{success}</p></div>}

          <div className="bg-white border border-slate-200 rounded-3xl p-4 shadow-xs flex flex-col xl:flex-row xl:items-center justify-between gap-4">
            <div className="flex flex-col sm:flex-row gap-3 w-full xl:w-auto">
              <div className="relative w-full sm:w-96">
                <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search request, site, category or purpose..." className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 bg-slate-50 text-sm outline-none focus:border-emerald-500" />
              </div>
              <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm font-bold text-slate-700">
                <option value="pending">Awaiting CEO</option>
                <option value="approved">Approved for Payment</option>
                <option value="rejected">CEO Rejected</option>
                <option value="all">All CEO-visible Requests</option>
              </select>
            </div>
            <div className="flex items-center gap-3 text-xs text-slate-500">
              <span className="inline-flex items-center gap-1.5"><Clock3 className="w-4 h-4" />Auto-refresh every 10s{lastUpdated ? ` · updated ${lastUpdated.toLocaleTimeString('en-BW')}` : ''}</span>
              <button onClick={() => load(true).catch((err) => setError(err.message || 'Failed to refresh expense requests.'))} disabled={refreshing} className="px-3 py-2 rounded-xl border border-slate-200 bg-white font-black text-slate-700 disabled:opacity-50 inline-flex items-center gap-2"><RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />Refresh</button>
            </div>
          </div>

          {loading ? (
            <div className="py-20 flex justify-center items-center gap-2 text-slate-500 font-semibold"><Loader2 className="w-5 h-5 animate-spin" /> Loading expense queue...</div>
          ) : !filtered.length ? (
            <div className="bg-white border border-slate-200 rounded-3xl p-10 text-center text-slate-500">
              {statusFilter === 'pending' ? 'No Accountant-reviewed expense requests are currently waiting for CEO approval.' : 'No expense requests match this filter.'}
            </div>
          ) : (
            <div className="space-y-4">
              {filtered.map((row) => (
                <div key={row.id} className={`bg-white border rounded-3xl p-5 sm:p-6 shadow-xs flex flex-col xl:flex-row xl:items-center justify-between gap-5 ${row.status === 'pending_ceo' ? 'border-amber-300 ring-1 ring-amber-100' : 'border-slate-200'}`}>
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="font-black text-slate-900">{row.request_code}</h3>
                      <Status value={row.status} />
                      {row.status === 'pending_ceo' && <span className="px-2.5 py-1 rounded-lg text-[10px] font-black uppercase bg-indigo-50 text-indigo-700 border border-indigo-200">Received from Accountant</span>}
                    </div>
                    <p className="text-sm text-slate-700 font-semibold mt-2">{row.purpose}</p>
                    <p className="text-xs text-slate-500 mt-1">{row.site?.site_name || 'Unknown site'} · {row.category?.category_name || 'Uncategorised'} · {row.payment_type === 'site_advance' ? 'Site advance' : 'Direct vendor'}</p>
                    {row.accountant_reviewed_at && <p className="text-[11px] text-slate-400 mt-1">Accountant handoff: {formatDateTime(row.accountant_reviewed_at)}</p>}
                  </div>
                  <div className="flex flex-col sm:flex-row sm:items-center gap-4 shrink-0">
                    <div className="sm:text-right"><p className="text-[10px] font-black uppercase tracking-wider text-slate-400">Accountant Recommendation</p><p className="text-xl font-black text-slate-900">{money(row.accountant_recommended_amount ?? row.requested_amount)}</p></div>
                    <button onClick={() => open(row)} className="px-5 py-3 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-sm font-black">{row.status === 'pending_ceo' ? 'Review & Decide' : 'View Request'}</button>
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
                <Row label="Sent to CEO" value={formatDateTime(selected.accountant_reviewed_at)} />
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
                    <input type="number" min="0.01" max={selected.accountant_recommended_amount ?? selected.requested_amount} step="0.01" value={approvedAmount} onChange={(e) => setApprovedAmount(e.target.value)} className="w-full rounded-xl border border-slate-200 bg-slate-50 p-3 text-sm font-bold outline-none focus:border-emerald-500" />
                    <p className="text-xs text-slate-500 mt-1">Maximum allowed: {money(selected.accountant_recommended_amount ?? selected.requested_amount)}. Approval does not move money yet; it moves the request to the Payment Center.</p>
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
