'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { AlertTriangle, Banknote, CheckCircle2, ExternalLink, Loader2, RefreshCw, RotateCcw, Search, Send, ShieldAlert, X, XCircle } from 'lucide-react';
import AccNavbar from '@/components/accountant/AccNavbar';
import AccSideNav from '@/components/accountant/AccSideNav';

export default function AccountantExpenseRequestsPage() {
  const [requests, setRequests] = useState([]);
  const [sites, setSites] = useState([]);
  const [summary, setSummary] = useState({});
  const [outstanding, setOutstanding] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [search, setSearch] = useState('');
  const [siteFilter, setSiteFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [selected, setSelected] = useState(null);
  const [action, setAction] = useState(null);
  const [recommended, setRecommended] = useState('');
  const [reason, setReason] = useState('');
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const res = await fetch('/api/accountant/expense-requests', { cache: 'no-store' });
      const json = await res.json();
      if (!res.ok || !json.success) throw new Error(json.error || 'Could not load expense requests.');
      const data = json.data || [];
      setRequests(data);
      setSites(json.sites || []);
      setSummary(json.summary || {});
      setOutstanding(json.outstanding_by_site || []);
      setSelected((current) => current ? data.find((row) => row.id === current.id) || null : null);
    } catch (e) {
      setError(e.message || 'Could not load expense requests.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return requests.filter((row) => {
      const mSearch = !q || [row.request_code,row.purpose,row.operational_requester_name,row.vendor_name,row.site?.site_name,row.category?.category_name].some((v)=>String(v||'').toLowerCase().includes(q));
      const mSite = siteFilter === 'all' || row.site_id === siteFilter;
      const mStatus = statusFilter === 'all' || row.status === statusFilter;
      return mSearch && mSite && mStatus;
    });
  }, [requests, search, siteFilter, statusFilter]);

  function beginAction(type) {
    setAction(type);
    setReason('');
    setSuccess('');
    setError('');
    setRecommended(selected?.accountant_recommended_amount ?? selected?.requested_amount ?? '');
  }

  async function runAction() {
    if (!selected || !action) return;

    const recommendedAmount = recommended === '' ? null : Number(recommended);
    if (action === 'send_to_ceo') {
      if (!Number.isFinite(recommendedAmount) || recommendedAmount <= 0) {
        setError('Enter a valid recommended amount before sending this request to the CEO.');
        return;
      }
      if (recommendedAmount > Number(selected.requested_amount || 0)) {
        setError('The recommended amount cannot exceed the amount originally requested.');
        return;
      }
    }

    setSaving(true);
    setError('');
    setSuccess('');
    const requestCode = selected.request_code;
    try {
      const res = await fetch('/api/accountant/expense-requests', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: selected.id,
          action,
          reason,
          recommended_amount: recommendedAmount,
        }),
      });
      const json = await res.json();
      if (!res.ok || !json.success) throw new Error(json.error || 'Could not update expense request.');

      const completedAction = action;
      setAction(null);
      await load();

      if (completedAction === 'send_to_ceo') {
        setSelected(null);
        setSuccess(`${requestCode} was sent to the CEO successfully. Its status is now Pending CEO.`);
      } else if (completedAction === 'return') {
        setSuccess(`${requestCode} was returned to the Site Clerk for correction.`);
      } else if (completedAction === 'reject') {
        setSuccess(`${requestCode} was rejected by the Accountant.`);
      } else if (completedAction === 'reconcile') {
        setSuccess(`${requestCode} was reconciled successfully.`);
      } else if (completedAction === 'issue') {
        setSuccess(`${requestCode} was flagged for reconciliation correction.`);
      }
    } catch (e) {
      setError(e.message || 'Could not update expense request.');
    } finally {
      setSaving(false);
    }
  }

  return <div className="min-h-screen bg-slate-100 flex flex-col lg:flex-row text-slate-900">
    <AccSideNav />
    <div className="flex-1 min-w-0"><AccNavbar title="Expense Requests & Reconciliation" subtitle="Review site funding requests, track advances, and reconcile company money" /><main className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto space-y-6">
      <section className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Metric label="Awaiting Review" value={summary.submitted || 0} />
        <Metric label="Waiting for CEO" value={summary.pending_ceo || 0} />
        <Metric label="Reconcile Now" value={summary.reconciliation_submitted || 0} />
        <Metric label="Issues" value={summary.reconciliation_issue || 0} warn={(summary.reconciliation_issue || 0) > 0} />
      </section>

      {error && <div className="rounded-2xl border border-rose-200 bg-rose-50 p-4 text-sm font-semibold text-rose-700 flex gap-2"><AlertTriangle className="w-4 h-4 mt-0.5" />{error}</div>}
      {success && <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-sm font-semibold text-emerald-800 flex gap-2"><CheckCircle2 className="w-4 h-4 mt-0.5" />{success}</div>}

      {outstanding.length > 0 && <section className="rounded-3xl border border-amber-200 bg-amber-50 p-5"><h2 className="font-black text-amber-900 flex items-center gap-2"><ShieldAlert className="w-5 h-5" />Outstanding Site Advances</h2><p className="text-xs text-amber-700 mt-1">Visible warning before approving more company money.</p><div className="mt-3 grid grid-cols-1 md:grid-cols-3 gap-3">{outstanding.map((row)=><div key={row.site?.id || row.site?.site_name} className="rounded-2xl bg-white/80 border border-amber-200 p-4"><div className="font-bold">{row.site?.site_name || 'Unknown Site'}</div><div className="text-xl font-black text-amber-800 mt-1">P{Number(row.outstanding||0).toLocaleString('en-BW',{minimumFractionDigits:2})}</div><div className="text-[11px] text-amber-700">{row.count} open advance{row.count===1?'':'s'}</div></div>)}</div></section>}

      <section className="rounded-3xl bg-white border border-slate-200 p-4 shadow-sm grid grid-cols-1 md:grid-cols-4 gap-3">
        <div className="relative md:col-span-2"><Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" /><input value={search} onChange={(e)=>setSearch(e.target.value)} placeholder="Search request, requester, purpose, vendor..." className="w-full rounded-xl border border-slate-200 bg-slate-50 pl-10 pr-3 py-2.5 text-sm" /></div>
        <select value={siteFilter} onChange={(e)=>setSiteFilter(e.target.value)} className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm font-semibold"><option value="all">All Sites</option>{sites.map(s=><option key={s.id} value={s.id}>{s.site_name}</option>)}</select>
        <div className="flex gap-2"><select value={statusFilter} onChange={(e)=>setStatusFilter(e.target.value)} className="flex-1 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm font-semibold"><option value="all">All Statuses</option><option value="submitted">Submitted</option><option value="pending_ceo">Pending CEO</option><option value="approved">CEO Approved</option><option value="funded">Funded</option><option value="reconciliation_submitted">Reconciliation Submitted</option><option value="reconciliation_issue">Reconciliation Issue</option><option value="reconciled">Reconciled</option><option value="rejected">Rejected</option><option value="ceo_rejected">CEO Rejected</option></select><button onClick={load} className="rounded-xl border border-slate-200 px-3" title="Refresh"><RefreshCw className={`w-4 h-4 ${loading?'animate-spin':''}`} /></button></div>
      </section>

      <section className="rounded-3xl bg-white border border-slate-200 shadow-sm overflow-hidden">
        <div className="p-5 border-b border-slate-100 flex items-center justify-between"><h2 className="font-black flex items-center gap-2"><Banknote className="w-5 h-5 text-indigo-600" />Company Expense Request Queue</h2><span className="text-xs font-bold text-slate-400">{filtered.length} request{filtered.length===1?'':'s'}</span></div>
        {loading ? <div className="p-16 text-center text-sm text-slate-500"><Loader2 className="w-6 h-6 animate-spin mx-auto mb-2 text-indigo-600" />Loading requests...</div> : filtered.length===0 ? <div className="p-14 text-center text-sm text-slate-500">No requests match the current filters.</div> : <div className="overflow-x-auto"><table className="w-full text-left text-sm"><thead className="bg-slate-50 text-[10px] uppercase tracking-wider text-slate-400"><tr><th className="px-5 py-3">Request</th><th className="px-5 py-3">Site / Category</th><th className="px-5 py-3">Requested</th><th className="px-5 py-3">Requester</th><th className="px-5 py-3">Status</th><th className="px-5 py-3 text-right">Review</th></tr></thead><tbody className="divide-y divide-slate-100">{filtered.map(row=><tr key={row.id} className="hover:bg-slate-50"><td className="px-5 py-4"><div className="font-black">{row.request_code}</div><div className="text-xs text-slate-500 max-w-xs truncate">{row.purpose}</div></td><td className="px-5 py-4"><div className="font-bold">{row.site?.site_name || '—'}</div><div className="text-[11px] text-slate-400">{row.category?.category_name || '—'}</div></td><td className="px-5 py-4 font-black">P{row.requested_amount.toLocaleString('en-BW',{minimumFractionDigits:2})}</td><td className="px-5 py-4"><div className="font-semibold">{row.operational_requester_name}</div><div className="text-[11px] text-slate-400">Captured by {row.submitted_by?.name || 'Site Clerk'}</div></td><td className="px-5 py-4"><Status value={row.status} /></td><td className="px-5 py-4 text-right"><button onClick={()=>{setSelected(row);setAction(null);setSuccess('');setError('');}} className="rounded-xl bg-slate-900 text-white px-3 py-2 text-xs font-bold">Open</button></td></tr>)}</tbody></table></div>}
      </section>
    </main></div>

    {selected && <div className="fixed inset-0 z-50 bg-slate-950/60 p-4 flex items-center justify-center"><div className="w-full max-w-4xl max-h-[94vh] overflow-y-auto rounded-3xl bg-white shadow-2xl"><div className="p-5 border-b border-slate-100 flex justify-between items-start"><div><div className="text-[10px] uppercase tracking-wider text-indigo-600 font-bold">{selected.request_code}</div><h2 className="text-xl font-black mt-1">{selected.purpose}</h2><p className="text-xs text-slate-500 mt-1">{selected.site?.site_name} • {selected.category?.category_name}</p></div><button onClick={()=>{setSelected(null);setAction(null);}} className="p-2 rounded-xl hover:bg-slate-100"><X className="w-5 h-5" /></button></div><div className="p-5 space-y-5">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3"><Info label="Requested" value={`P${selected.requested_amount.toFixed(2)}`} /><Info label="Recommended" value={selected.accountant_recommended_amount==null?'—':`P${selected.accountant_recommended_amount.toFixed(2)}`} /><Info label="Approved" value={selected.approved_amount==null?'—':`P${selected.approved_amount.toFixed(2)}`} /><Info label="Disbursed" value={`P${selected.total_disbursed.toFixed(2)}`} /></div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm"><div className="rounded-2xl bg-slate-50 border border-slate-200 p-4 space-y-2"><Row k="Operational requester" v={`${selected.operational_requester_name}${selected.operational_requester_role?` — ${selected.operational_requester_role}`:''}`} /><Row k="System submitted by" v={selected.submitted_by?.name || 'Site Clerk'} /><Row k="Payment type" v={selected.payment_type==='site_advance'?'Site / Employee Advance':'Direct Vendor Payment'} /><Row k="Vendor" v={selected.vendor_name || 'Not specified'} /><Row k="Needed by" v={selected.needed_by_date || 'Not specified'} /></div><div className="rounded-2xl bg-slate-50 border border-slate-200 p-4"><div className="text-xs font-bold text-slate-500 mb-2">Supporting documents</div>{selected.documents?.length ? <div className="space-y-2">{selected.documents.map(doc=><a key={doc.id} href={doc.preview_url||'#'} target="_blank" rel="noreferrer" className="flex items-center justify-between rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-bold text-indigo-600"><span>{doc.document_kind.replaceAll('_',' ')} — {doc.original_filename}</span><ExternalLink className="w-4 h-4" /></a>)}</div> : <div className="text-sm text-slate-400">No supporting files attached.</div>}</div></div>

      {selected.payment_type==='site_advance' && selected.total_disbursed>0 && <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4"><div className="font-black text-amber-900">Money Accountability</div><div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-3 text-sm"><Info label="Disbursed" value={`P${selected.total_disbursed.toFixed(2)}`} /><Info label="Spent" value={selected.latest_reconciliation?`P${selected.latest_reconciliation.actual_spent.toFixed(2)}`:'—'} /><Info label="Returned" value={selected.latest_reconciliation?`P${selected.latest_reconciliation.returned_amount.toFixed(2)}`:'—'} /><Info label="Unexplained" value={`P${selected.unexplained_amount.toFixed(2)}`} danger={Math.abs(selected.unexplained_amount)>.01} /></div>{selected.latest_reconciliation?.notes && <p className="text-xs text-amber-800 mt-3">Site note: {selected.latest_reconciliation.notes}</p>}</div>}

      {selected.status==='submitted' && !action && <div className="flex flex-wrap justify-end gap-2"><button onClick={()=>beginAction('reject')} className="rounded-xl border border-rose-200 bg-rose-50 text-rose-700 px-4 py-2.5 text-sm font-bold flex gap-2 items-center"><XCircle className="w-4 h-4" />Reject</button><button onClick={()=>beginAction('return')} className="rounded-xl border border-amber-200 bg-amber-50 text-amber-700 px-4 py-2.5 text-sm font-bold flex gap-2 items-center"><RotateCcw className="w-4 h-4" />Return for Correction</button><button onClick={()=>beginAction('send_to_ceo')} className="rounded-xl bg-indigo-600 text-white px-4 py-2.5 text-sm font-bold flex gap-2 items-center"><Send className="w-4 h-4" />Review & Send to CEO</button></div>}
      {selected.status==='reconciliation_submitted' && !action && <div className="flex justify-end gap-2"><button onClick={()=>beginAction('issue')} className="rounded-xl border border-rose-200 bg-rose-50 text-rose-700 px-4 py-2.5 text-sm font-bold">Flag Issue</button><button onClick={()=>beginAction('reconcile')} disabled={Math.abs(selected.unexplained_amount)>.01} className="rounded-xl bg-emerald-600 text-white px-4 py-2.5 text-sm font-bold disabled:bg-slate-300"><CheckCircle2 className="w-4 h-4 inline mr-1" />Mark Reconciled</button></div>}
      {selected.status==='pending_ceo' && <div className="rounded-2xl bg-indigo-50 border border-indigo-200 p-4 text-sm text-indigo-800 font-semibold">Sent successfully. This request is now waiting in the CEO Expense Approval queue.</div>}
      {selected.status==='reconciliation_issue' && <div className="rounded-2xl bg-rose-50 border border-rose-200 p-4 text-sm text-rose-800">Returned to Site for explanation / corrected reconciliation.</div>}

      {action && <div className="rounded-2xl border-2 border-indigo-200 bg-indigo-50/60 p-5 space-y-4"><div><div className="font-black text-slate-900 capitalize">{action.replaceAll('_',' ')}</div>{action==='send_to_ceo' && <p className="text-xs text-slate-600 mt-1">Confirm the recommendation below. This is the step that actually hands the request to the CEO.</p>}</div>{action==='send_to_ceo' && <label className="block"><span className="text-xs font-bold text-slate-600">Recommended Amount for CEO</span><input type="number" min="0.01" step="0.01" max={selected.requested_amount} value={recommended} onChange={(e)=>setRecommended(e.target.value)} className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm font-bold" /><span className="mt-1 block text-[11px] text-slate-500">Maximum: P{selected.requested_amount.toLocaleString('en-BW',{minimumFractionDigits:2})}</span></label>}{['return','reject','issue'].includes(action) && <label className="block"><span className="text-xs font-bold text-slate-600">Reason</span><textarea value={reason} onChange={(e)=>setReason(e.target.value)} rows={3} className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm" /></label>}<div className="flex justify-end gap-2"><button onClick={()=>setAction(null)} className="px-4 py-2 text-sm font-bold">Cancel</button><button disabled={saving || (action==='send_to_ceo' && (Number(recommended)<=0 || Number(recommended)>selected.requested_amount)) || (['return','reject','issue'].includes(action)&&!reason.trim())} onClick={runAction} className="rounded-xl bg-slate-900 text-white px-4 py-2 text-sm font-bold disabled:opacity-40 flex items-center gap-2">{saving?<><Loader2 className="w-4 h-4 animate-spin" />Saving...</>:action==='send_to_ceo'?<><Send className="w-4 h-4" />Confirm & Send to CEO</>:'Confirm'}</button></div></div>}
    </div></div></div>}
  </div>;
}

function Metric({label,value,warn}) { return <div className="rounded-3xl bg-white border border-slate-200 p-5 shadow-sm"><div className="text-[10px] uppercase tracking-wider text-slate-400 font-bold">{label}</div><div className={`text-2xl font-black mt-1 ${warn?'text-rose-700':''}`}>{value}</div></div>; }
function Status({value}) { const cls=value==='reconciled'?'bg-emerald-50 text-emerald-700':value.includes('reject')||value==='reconciliation_issue'?'bg-rose-50 text-rose-700':value==='returned_for_correction'?'bg-amber-50 text-amber-700':'bg-indigo-50 text-indigo-700'; return <span className={`rounded-full px-2.5 py-1 text-[10px] font-bold ${cls}`}>{value.replaceAll('_',' ')}</span>; }
function Info({label,value,danger}) { return <div className="rounded-xl bg-white border border-slate-200 p-3"><div className="text-[10px] uppercase tracking-wider text-slate-400 font-bold">{label}</div><div className={`font-black mt-1 ${danger?'text-rose-700':''}`}>{value}</div></div>; }
function Row({k,v}) { return <div className="flex justify-between gap-4"><span className="text-slate-500">{k}</span><span className="font-semibold text-right">{v}</span></div>; }
