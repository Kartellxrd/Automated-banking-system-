'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { AlertTriangle, CheckCircle2, Loader2, Plus, RefreshCw, UserCheck, WalletCards } from 'lucide-react';
import AccNavbar from '@/components/accountant/AccNavbar';
import AccSideNav from '@/components/accountant/AccSideNav';

const emptyForm = { display_name: '', payee_type: 'vendor', payout_provider_id: '', account_or_mobile_number: '', branch_code: '', registration_or_id: '', phone: '', notes: '' };

export default function ExpensePayeesPage() {
  const [payees, setPayees] = useState([]);
  const [providers, setProviders] = useState([]);
  const [requests, setRequests] = useState([]);
  const [form, setForm] = useState(emptyForm);
  const [assignments, setAssignments] = useState({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState({ type: '', text: '' });

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/accountant/expense-payees', { cache: 'no-store' });
      const json = await res.json();
      if (!res.ok || !json.success) throw new Error(json.error || 'Could not load expense payees.');
      setPayees(json.data || []);
      setProviders(json.providers || []);
      setRequests(json.requests || []);
      setAssignments(Object.fromEntries((json.requests || []).map((r) => [r.id, r.payee_id || ''])));
      setForm((current) => ({ ...current, payout_provider_id: current.payout_provider_id || String(json.providers?.[0]?.id || '') }));
    } catch (error) {
      setMessage({ type: 'error', text: error.message });
    } finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  const activePayees = useMemo(() => payees.filter((p) => p.is_active !== false && p.payout_profiles?.some((x) => x.is_primary && x.is_verified)), [payees]);

  async function createPayee(event) {
    event.preventDefault();
    setSaving(true); setMessage({ type: '', text: '' });
    try {
      const res = await fetch('/api/accountant/expense-payees', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(form) });
      const json = await res.json();
      if (!res.ok || !json.success) throw new Error(json.error || 'Could not create payee.');
      setForm({ ...emptyForm, payout_provider_id: String(providers[0]?.id || '') });
      setMessage({ type: 'success', text: 'Verified expense payee created.' });
      await load();
    } catch (error) { setMessage({ type: 'error', text: error.message }); }
    finally { setSaving(false); }
  }

  async function assignPayee(requestId) {
    const payeeId = assignments[requestId];
    if (!payeeId) { setMessage({ type: 'error', text: 'Select a verified payee first.' }); return; }
    setSaving(true); setMessage({ type: '', text: '' });
    try {
      const res = await fetch('/api/accountant/expense-payees', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ request_id: requestId, payee_id: payeeId }) });
      const json = await res.json();
      if (!res.ok || !json.success) throw new Error(json.error || 'Could not assign payee.');
      setMessage({ type: 'success', text: json.message });
      await load();
    } catch (error) { setMessage({ type: 'error', text: error.message }); }
    finally { setSaving(false); }
  }

  return <div className="min-h-screen bg-slate-100 flex flex-col lg:flex-row text-slate-900">
    <AccSideNav />
    <div className="flex-1 min-w-0"><AccNavbar title="Expense Payees" subtitle="Verify who company expense money is actually being paid to" />
      <main className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto space-y-6">
        <section className="rounded-3xl border border-indigo-200 bg-indigo-50 p-5 text-sm text-indigo-900">
          <div className="font-black">Why this is required</div>
          <p className="mt-1 leading-6">The CEO cannot authorize an expense payment to a typed name alone. Finance first creates a normalized payee, verifies the bank/mobile destination, then assigns that payee to the expense request. The CEO sees the verified destination before authorizing payment.</p>
        </section>

        {message.text && <div className={`rounded-2xl border p-4 text-sm font-semibold flex gap-2 ${message.type === 'success' ? 'border-emerald-200 bg-emerald-50 text-emerald-800' : 'border-rose-200 bg-rose-50 text-rose-700'}`}>{message.type === 'success' ? <CheckCircle2 className="w-4 h-4 mt-0.5" /> : <AlertTriangle className="w-4 h-4 mt-0.5" />}{message.text}</div>}

        <section className="grid grid-cols-1 xl:grid-cols-2 gap-6">
          <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="flex items-center gap-2"><WalletCards className="w-5 h-5 text-indigo-600" /><h2 className="font-black">Create Verified Payee</h2></div>
            <form onSubmit={createPayee} className="mt-5 grid grid-cols-1 sm:grid-cols-2 gap-3">
              <Field label="Payee / Vendor Name"><input required value={form.display_name} onChange={(e)=>setForm({...form,display_name:e.target.value})} className="input" /></Field>
              <Field label="Type"><select value={form.payee_type} onChange={(e)=>setForm({...form,payee_type:e.target.value})} className="input"><option value="vendor">Vendor</option><option value="site_custodian">Site Custodian</option><option value="employee">Employee</option><option value="other">Other</option></select></Field>
              <Field label="Provider"><select required value={form.payout_provider_id} onChange={(e)=>setForm({...form,payout_provider_id:e.target.value})} className="input"><option value="">Select provider</option>{providers.map((p)=><option key={p.id} value={p.id}>{p.name}</option>)}</select></Field>
              <Field label="Account / Mobile Number"><input required value={form.account_or_mobile_number} onChange={(e)=>setForm({...form,account_or_mobile_number:e.target.value})} className="input font-mono" /></Field>
              <Field label="Branch Code"><input value={form.branch_code} onChange={(e)=>setForm({...form,branch_code:e.target.value})} className="input" /></Field>
              <Field label="Registration / ID"><input value={form.registration_or_id} onChange={(e)=>setForm({...form,registration_or_id:e.target.value})} className="input" /></Field>
              <div className="sm:col-span-2 flex justify-end"><button disabled={saving} className="rounded-xl bg-indigo-600 px-5 py-2.5 text-sm font-bold text-white inline-flex items-center gap-2 disabled:opacity-50">{saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}Create & Verify</button></div>
            </form>
          </div>

          <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="flex items-center justify-between"><div className="flex items-center gap-2"><UserCheck className="w-5 h-5 text-emerald-600" /><h2 className="font-black">Verified Payees</h2></div><button onClick={load} className="p-2 rounded-xl border border-slate-200"><RefreshCw className={`w-4 h-4 ${loading?'animate-spin':''}`} /></button></div>
            <div className="mt-4 space-y-2 max-h-[420px] overflow-y-auto">{activePayees.length ? activePayees.map((p)=>{const profile=p.payout_profiles.find((x)=>x.is_primary&&x.is_verified);return <div key={p.id} className="rounded-2xl border border-slate-200 p-4"><div className="font-bold">{p.display_name}</div><div className="text-xs text-slate-500 mt-1">{profile?.provider?.name || 'Provider'} · {profile?.masked_destination || '—'}{profile?.branch_code ? ` · Branch ${profile.branch_code}` : ''}</div><div className="text-[10px] uppercase tracking-wider text-emerald-600 font-black mt-2">Verified</div></div>}) : <div className="text-sm text-slate-500 py-10 text-center">No verified expense payees yet.</div>}</div>
          </div>
        </section>

        <section className="rounded-3xl border border-slate-200 bg-white shadow-sm overflow-hidden">
          <div className="p-5 border-b border-slate-100"><h2 className="font-black">Assign Payment Recipient to Expense</h2><p className="text-xs text-slate-500 mt-1">Use this before CEO payment authorization.</p></div>
          <div className="overflow-x-auto"><table className="w-full min-w-[850px] text-sm"><thead className="bg-slate-50 text-[10px] uppercase tracking-wider text-slate-400"><tr><th className="px-5 py-3 text-left">Request</th><th className="px-5 py-3 text-left">Site</th><th className="px-5 py-3 text-left">Amount</th><th className="px-5 py-3 text-left">Status</th><th className="px-5 py-3 text-left">Verified Payee</th><th className="px-5 py-3"></th></tr></thead><tbody className="divide-y divide-slate-100">{requests.map((r)=><tr key={r.id}><td className="px-5 py-4"><div className="font-black">{r.request_code}</div><div className="text-xs text-slate-500 max-w-xs truncate">{r.purpose}</div></td><td className="px-5 py-4">{r.site?.site_name || '—'}</td><td className="px-5 py-4 font-black">P{Number(r.approved_amount ?? r.accountant_recommended_amount ?? r.requested_amount).toFixed(2)}</td><td className="px-5 py-4">{r.status.replaceAll('_',' ')}</td><td className="px-5 py-4"><select value={assignments[r.id] || ''} onChange={(e)=>setAssignments({...assignments,[r.id]:e.target.value})} className="input"><option value="">Select verified payee</option>{activePayees.map((p)=><option key={p.id} value={p.id}>{p.display_name}</option>)}</select></td><td className="px-5 py-4 text-right"><button onClick={()=>assignPayee(r.id)} disabled={saving || !assignments[r.id]} className="rounded-xl bg-slate-900 px-4 py-2 text-xs font-bold text-white disabled:opacity-40">Assign</button></td></tr>)}</tbody></table></div>
        </section>
      </main>
    </div>
    <style jsx>{`.input{width:100%;border:1px solid #e2e8f0;background:#f8fafc;border-radius:.75rem;padding:.65rem .75rem;font-size:.875rem;outline:none}.input:focus{border-color:#6366f1;background:white}`}</style>
  </div>;
}

function Field({label,children}){return <label className="block"><span className="block text-xs font-bold text-slate-600 mb-1.5">{label}</span>{children}</label>}
