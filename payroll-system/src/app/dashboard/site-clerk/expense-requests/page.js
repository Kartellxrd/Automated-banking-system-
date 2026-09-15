'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { AlertTriangle, Banknote, FileText, Loader2, Plus, RefreshCw, RotateCcw, X } from 'lucide-react';
import SiteClerkSideNav from '@/components/site-clerk/SiteClerkSideNav';
import SiteClerkNavbar from '@/components/site-clerk/SiteClerkNavbar';

const EMPTY = { category_id: '', operational_requester_name: '', operational_requester_role: '', purpose: '', requested_amount: '', payment_type: 'site_advance', vendor_name: '', needed_by_date: '', supporting_document: null };

export default function SiteClerkExpenseRequestsPage() {
  const [site, setSite] = useState(null);
  const [categories, setCategories] = useState([]);
  const [requests, setRequests] = useState([]);
  const [outstanding, setOutstanding] = useState(0);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [modal, setModal] = useState(null);
  const [form, setForm] = useState(EMPTY);
  const [reconcile, setReconcile] = useState({ actual_spent: '', returned_amount: '', notes: '', receipt: null, return_proof: null });

  const load = useCallback(async () => {
    setLoading(true); setError('');
    try {
      const res = await fetch('/api/site-clerk/expense-requests', { cache: 'no-store' });
      const json = await res.json();
      if (!res.ok || !json.success) throw new Error(json.error || 'Could not load expense requests.');
      setSite(json.site); setCategories(json.categories || []); setRequests(json.data || []); setOutstanding(Number(json.outstanding_advance || 0));
    } catch (e) { setError(e.message); } finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  const activeCount = useMemo(() => requests.filter((r) => !['reconciled','rejected','ceo_rejected','cancelled'].includes(r.status)).length, [requests]);

  function openCreate() { setForm({ ...EMPTY, category_id: categories[0]?.id || '' }); setModal({ type: 'request' }); }
  function openEdit(row) {
    setForm({ category_id: row.category_id, operational_requester_name: row.operational_requester_name || '', operational_requester_role: row.operational_requester_role || '', purpose: row.purpose || '', requested_amount: row.requested_amount, payment_type: row.payment_type, vendor_name: row.vendor_name || '', needed_by_date: row.needed_by_date || '', supporting_document: null });
    setModal({ type: 'request', row });
  }
  function openReconcile(row) { setReconcile({ actual_spent: '', returned_amount: '', notes: '', receipt: null, return_proof: null }); setModal({ type: 'reconcile', row }); }

  async function submitRequest(e) {
    e.preventDefault(); setSaving(true); setError('');
    try {
      let res;
      if (modal?.row) {
        res = await fetch('/api/site-clerk/expense-requests', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ...form, id: modal.row.id, requested_amount: Number(form.requested_amount) }) });
      } else {
        const fd = new FormData();
        Object.entries(form).forEach(([key, value]) => { if (key !== 'supporting_document' && value !== null && value !== '') fd.append(key, value); });
        if (form.supporting_document) fd.append('supporting_document', form.supporting_document);
        res = await fetch('/api/site-clerk/expense-requests', { method: 'POST', body: fd });
      }
      const json = await res.json();
      if (!res.ok || !json.success) throw new Error(json.error || 'Could not save request.');
      setModal(null); await load();
    } catch (e2) { setError(e2.message); } finally { setSaving(false); }
  }

  async function submitReconciliation(e) {
    e.preventDefault(); setSaving(true); setError('');
    try {
      const fd = new FormData();
      fd.append('actual_spent', reconcile.actual_spent); fd.append('returned_amount', reconcile.returned_amount || '0'); fd.append('notes', reconcile.notes || '');
      if (reconcile.receipt) fd.append('receipt', reconcile.receipt);
      if (reconcile.return_proof) fd.append('return_proof', reconcile.return_proof);
      const res = await fetch(`/api/site-clerk/expense-requests/${modal.row.id}/reconciliation`, { method: 'POST', body: fd });
      const json = await res.json();
      if (!res.ok || !json.success) throw new Error(json.error || 'Could not submit reconciliation.');
      setModal(null); await load();
    } catch (e2) { setError(e2.message); } finally { setSaving(false); }
  }

  return <div className="min-h-screen bg-slate-100 flex flex-col lg:flex-row text-slate-900">
    <SiteClerkSideNav />
    <div className="flex-1 min-w-0"><SiteClerkNavbar /><main className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto space-y-6">
      <section className="rounded-3xl bg-white border border-slate-200 p-6 shadow-sm flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div><p className="text-[11px] uppercase tracking-[0.16em] font-bold text-indigo-600">Company Money Requests</p><h1 className="text-3xl font-black mt-1">Expense Requests</h1><p className="text-sm text-slate-500 mt-1">{site ? `${site.site_name}${site.location ? ` — ${site.location}` : ''}` : 'Assigned Site'} • Site is locked by Admin assignment.</p></div>
        <div className="flex gap-2"><button onClick={load} className="rounded-xl border border-slate-200 px-4 py-2.5 text-xs font-bold flex items-center gap-2"><RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />Refresh</button><button onClick={openCreate} className="rounded-xl bg-indigo-600 px-4 py-2.5 text-xs font-bold text-white flex items-center gap-2"><Plus className="w-4 h-4" />New Request</button></div>
      </section>

      {error && <div className="rounded-2xl border border-rose-200 bg-rose-50 p-4 text-sm font-semibold text-rose-700 flex gap-2"><AlertTriangle className="w-4 h-4 mt-0.5" />{error}</div>}

      <section className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Metric label="Requests" value={requests.length} />
        <Metric label="Active / Open" value={activeCount} />
        <Metric label="Unreconciled Advance" value={`P${outstanding.toLocaleString('en-BW',{minimumFractionDigits:2})}`} warn={outstanding > 0} />
      </section>

      {outstanding > 0 && <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800"><strong>Outstanding company funds:</strong> this Site has P{outstanding.toLocaleString('en-BW',{minimumFractionDigits:2})} not yet fully reconciled. New requests are still allowed, but Accountant and CEO will see this warning.</div>}

      <section className="rounded-3xl bg-white border border-slate-200 shadow-sm overflow-hidden">
        <div className="p-5 border-b border-slate-100"><h2 className="font-black flex items-center gap-2"><Banknote className="w-5 h-5 text-indigo-600" />Site Expense History</h2></div>
        {loading ? <div className="p-16 text-center text-sm text-slate-500"><Loader2 className="w-6 h-6 animate-spin mx-auto mb-2 text-indigo-600" />Loading requests...</div> : requests.length === 0 ? <div className="p-14 text-center text-sm text-slate-500">No expense requests yet.</div> : <div className="overflow-x-auto"><table className="w-full text-left text-sm"><thead className="bg-slate-50 text-[10px] uppercase tracking-wider text-slate-400"><tr><th className="px-5 py-3">Request</th><th className="px-5 py-3">Purpose</th><th className="px-5 py-3">Requested</th><th className="px-5 py-3">Money Flow</th><th className="px-5 py-3">Status</th><th className="px-5 py-3 text-right">Action</th></tr></thead><tbody className="divide-y divide-slate-100">{requests.map((row) => <tr key={row.id}><td className="px-5 py-4"><div className="font-black">{row.request_code}</div><div className="text-[11px] text-slate-400">{row.category?.category_name || '—'} • {row.payment_type === 'site_advance' ? 'Site advance' : 'Direct vendor'}</div></td><td className="px-5 py-4 max-w-sm"><div className="font-semibold">{row.purpose}</div><div className="text-[11px] text-slate-400 mt-1">Requested by {row.operational_requester_name}{row.operational_requester_role ? ` — ${row.operational_requester_role}` : ''}</div>{row.accountant_return_reason && <div className="mt-2 text-xs text-amber-700">Returned: {row.accountant_return_reason}</div>}{row.accountant_rejection_reason && <div className="mt-2 text-xs text-rose-700">Rejected: {row.accountant_rejection_reason}</div>}{row.latest_reconciliation?.issue_reason && <div className="mt-2 text-xs text-rose-700">Reconciliation issue: {row.latest_reconciliation.issue_reason}</div>}</td><td className="px-5 py-4 font-black">P{row.requested_amount.toLocaleString('en-BW',{minimumFractionDigits:2})}</td><td className="px-5 py-4 text-xs"><div>Disbursed: <strong>P{row.total_disbursed.toFixed(2)}</strong></div>{row.latest_reconciliation && <><div>Spent: P{row.latest_reconciliation.actual_spent.toFixed(2)}</div><div>Returned: P{row.latest_reconciliation.returned_amount.toFixed(2)}</div><div className={Math.abs(row.unexplained_amount) > .01 ? 'text-rose-600 font-bold' : 'text-emerald-600 font-bold'}>Unexplained: P{row.unexplained_amount.toFixed(2)}</div></>}</td><td className="px-5 py-4"><Status value={row.status} /></td><td className="px-5 py-4 text-right space-x-2">{row.status === 'returned_for_correction' && <button onClick={() => openEdit(row)} className="rounded-lg bg-amber-50 text-amber-700 px-3 py-2 text-xs font-bold">Correct & Resubmit</button>}{['funded','awaiting_reconciliation','reconciliation_issue'].includes(row.status) && <button onClick={() => openReconcile(row)} className="rounded-lg bg-indigo-600 text-white px-3 py-2 text-xs font-bold">Reconcile</button>}{row.documents?.length > 0 && <a href={row.documents[0].preview_url || '#'} target="_blank" rel="noreferrer" className="inline-flex rounded-lg border border-slate-200 px-3 py-2 text-xs font-bold"><FileText className="w-4 h-4 mr-1" />Proof</a>}</td></tr>)}</tbody></table></div>}
      </section>
    </main></div>

    {modal?.type === 'request' && <Modal title={modal.row ? 'Correct Expense Request' : 'New Expense Request'} onClose={() => setModal(null)}><form onSubmit={submitRequest} className="space-y-4"><div className="grid grid-cols-1 sm:grid-cols-2 gap-4"><Select label="Category" value={form.category_id} onChange={(v)=>setForm({...form,category_id:v})} options={categories.map(c=>[c.id,c.category_name])} required /><Field label="Operational Requester" value={form.operational_requester_name} onChange={(v)=>setForm({...form,operational_requester_name:v})} required placeholder="e.g. Kagiso Phiri" /><Field label="Requester Role" value={form.operational_requester_role} onChange={(v)=>setForm({...form,operational_requester_role:v})} placeholder="e.g. Site Supervisor" /><Field label="Amount Requested (BWP)" type="number" min="0.01" step="0.01" value={form.requested_amount} onChange={(v)=>setForm({...form,requested_amount:v})} required /><Select label="Payment Type" value={form.payment_type} onChange={(v)=>setForm({...form,payment_type:v})} options={[["site_advance","Site / Employee Advance"],["direct_vendor","Direct Vendor Payment"]]} required /><Field label="Vendor (if known)" value={form.vendor_name} onChange={(v)=>setForm({...form,vendor_name:v})} /><Field label="Needed By" type="date" value={form.needed_by_date} onChange={(v)=>setForm({...form,needed_by_date:v})} /></div><label className="block"><span className="text-xs font-bold text-slate-600">Purpose / Business Reason</span><textarea required value={form.purpose} onChange={(e)=>setForm({...form,purpose:e.target.value})} rows={4} className="mt-1 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm" /></label>{!modal.row && <label className="block"><span className="text-xs font-bold text-slate-600">Quote / Proforma / Invoice (optional)</span><input type="file" accept="image/jpeg,image/png,application/pdf" onChange={(e)=>setForm({...form,supporting_document:e.target.files?.[0] || null})} className="mt-1 block w-full text-sm" /></label>}<div className="flex justify-end gap-2"><button type="button" onClick={()=>setModal(null)} className="px-4 py-2.5 text-sm font-bold">Cancel</button><button disabled={saving} className="rounded-xl bg-indigo-600 text-white px-5 py-2.5 text-sm font-bold disabled:opacity-50">{saving ? 'Saving...' : modal.row ? 'Resubmit Request' : 'Submit Request'}</button></div></form></Modal>}

    {modal?.type === 'reconcile' && <Modal title={`Reconcile ${modal.row.request_code}`} onClose={() => setModal(null)}><form onSubmit={submitReconciliation} className="space-y-4"><div className="rounded-2xl bg-slate-50 border border-slate-200 p-4 text-sm"><div>Disbursed: <strong>P{modal.row.total_disbursed.toFixed(2)}</strong></div><div className="text-xs text-slate-500 mt-1">Spent + returned should equal the amount disbursed. Any difference will be flagged by Accountant.</div></div><div className="grid grid-cols-1 sm:grid-cols-2 gap-4"><Field label="Actual Amount Spent" type="number" min="0" step="0.01" value={reconcile.actual_spent} onChange={(v)=>setReconcile({...reconcile,actual_spent:v})} required /><Field label="Amount Returned" type="number" min="0" step="0.01" value={reconcile.returned_amount} onChange={(v)=>setReconcile({...reconcile,returned_amount:v})} required /></div><label className="block"><span className="text-xs font-bold text-slate-600">Notes</span><textarea rows={3} value={reconcile.notes} onChange={(e)=>setReconcile({...reconcile,notes:e.target.value})} className="mt-1 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm" /></label><label className="block"><span className="text-xs font-bold text-slate-600">Receipt / Invoice {Number(reconcile.actual_spent||0)>0 ? '*' : ''}</span><input type="file" accept="image/jpeg,image/png,application/pdf" onChange={(e)=>setReconcile({...reconcile,receipt:e.target.files?.[0]||null})} className="mt-1 block w-full text-sm" /></label><label className="block"><span className="text-xs font-bold text-slate-600">Proof of Returned Balance (optional)</span><input type="file" accept="image/jpeg,image/png,application/pdf" onChange={(e)=>setReconcile({...reconcile,return_proof:e.target.files?.[0]||null})} className="mt-1 block w-full text-sm" /></label><div className="flex justify-end gap-2"><button type="button" onClick={()=>setModal(null)} className="px-4 py-2.5 text-sm font-bold">Cancel</button><button disabled={saving} className="rounded-xl bg-indigo-600 text-white px-5 py-2.5 text-sm font-bold">{saving ? 'Submitting...' : 'Submit Reconciliation'}</button></div></form></Modal>}
  </div>;
}

function Metric({label,value,warn}) { return <div className="rounded-3xl bg-white border border-slate-200 p-5 shadow-sm"><div className="text-[10px] uppercase tracking-wider text-slate-400 font-bold">{label}</div><div className={`text-2xl font-black mt-1 ${warn?'text-amber-700':'text-slate-900'}`}>{value}</div></div>; }
function Status({value}) { const cls = value==='reconciled'?'bg-emerald-50 text-emerald-700':value.includes('rejected')||value==='reconciliation_issue'?'bg-rose-50 text-rose-700':value==='returned_for_correction'?'bg-amber-50 text-amber-700':'bg-indigo-50 text-indigo-700'; return <span className={`rounded-full px-2.5 py-1 text-[10px] font-bold ${cls}`}>{value.replaceAll('_',' ')}</span>; }
function Modal({title,onClose,children}) { return <div className="fixed inset-0 z-50 bg-slate-950/60 p-4 flex items-center justify-center"><div className="w-full max-w-2xl max-h-[92vh] overflow-y-auto rounded-3xl bg-white shadow-2xl"><div className="p-5 border-b border-slate-100 flex justify-between items-center"><h2 className="font-black text-lg">{title}</h2><button onClick={onClose} className="p-2 rounded-xl hover:bg-slate-100"><X className="w-5 h-5" /></button></div><div className="p-5">{children}</div></div></div>; }
function Field({label,value,onChange,required=false,type='text',...props}) { return <label className="block"><span className="text-xs font-bold text-slate-600">{label}</span><input required={required} type={type} value={value} onChange={(e)=>onChange(e.target.value)} className="mt-1 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm" {...props}/></label>; }
function Select({label,value,onChange,options,required=false}) { return <label className="block"><span className="text-xs font-bold text-slate-600">{label}</span><select required={required} value={value} onChange={(e)=>onChange(e.target.value)} className="mt-1 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm"><option value="">Select...</option>{options.map(([v,l])=><option key={v} value={v}>{l}</option>)}</select></label>; }
