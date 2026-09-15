'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { AlertTriangle, CheckCircle2, CreditCard, FileText, Loader2, Pencil, RefreshCw, Search, ShieldCheck, X } from 'lucide-react';
import HRSideNav from '@/components/hr/HRSideNav';
import HRNavbar from '@/components/hr/HRNavbar';

export default function HRPayoutDetailsPage() {
  const [employees, setEmployees] = useState([]);
  const [providers, setProviders] = useState([]);
  const [profiles, setProfiles] = useState([]);
  const [documents, setDocuments] = useState([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState({ provider_id: '', account_or_mobile_number: '', branch_code: '', proof_document_id: '' });
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const [employeeResponse, payoutResponse, documentResponse] = await Promise.all([
        fetch('/api/hr/employees', { cache: 'no-store' }),
        fetch('/api/hr/payout-profiles', { cache: 'no-store' }),
        fetch('/api/hr/documents', { cache: 'no-store' }),
      ]);
      const [employeeResult, payoutResult, documentResult] = await Promise.all([employeeResponse.json(), payoutResponse.json(), documentResponse.json()]);
      if (!employeeResponse.ok || !employeeResult.success) throw new Error(employeeResult.error || 'Could not load employees.');
      if (!payoutResponse.ok || !payoutResult.success) throw new Error(payoutResult.error || 'Could not load payout profiles.');
      if (!documentResponse.ok || !documentResult.success) throw new Error(documentResult.error || 'Could not load payment proof documents.');
      setEmployees(employeeResult.data || []);
      setProviders(payoutResult.providers || []);
      setProfiles(payoutResult.profiles || []);
      setDocuments(documentResult.data || []);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const profileMap = useMemo(() => new Map(profiles.map((profile) => [profile.employee_id, profile])), [profiles]);
  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return employees.filter((employee) => employee.status !== 'Terminated' && (!q || [employee.name, employee.employee_code, employee.site?.site_name, employee.job_role].some((value) => String(value || '').toLowerCase().includes(q))));
  }, [employees, search]);

  function openEdit(employee) {
    const profile = profileMap.get(employee.id);
    setEditing(employee);
    setForm({
      provider_id: profile?.payout_provider_id ? String(profile.payout_provider_id) : '',
      account_or_mobile_number: profile?.account_or_mobile_number || '',
      branch_code: profile?.branch_code === 'N/A' ? '' : profile?.branch_code || '',
      proof_document_id: profile?.proof_document_id || '',
    });
  }

  async function save(event) {
    event.preventDefault();
    if (!editing) return;
    setSaving(true);
    setError('');
    try {
      const response = await fetch('/api/hr/payout-profiles', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ employee_id: editing.id, ...form, provider_id: Number(form.provider_id) }),
      });
      const result = await response.json();
      if (!response.ok || !result.success) throw new Error(result.error || 'Could not save payout details.');
      setEditing(null);
      await load();
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  }

  const proofDocs = editing ? documents.filter((doc) => doc.employee_id === editing.id) : [];
  const selectedProvider = providers.find((provider) => String(provider.id) === String(form.provider_id));

  return (
    <div className="min-h-screen bg-slate-100 flex flex-col lg:flex-row text-slate-900">
      <HRSideNav />
      <div className="flex-1 min-w-0">
        <HRNavbar />
        <main className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto space-y-6">
          <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm flex flex-col lg:flex-row lg:items-center justify-between gap-4">
            <div><p className="text-[11px] uppercase tracking-[0.16em] font-bold text-indigo-600">Onboarding & Payment Readiness</p><h1 className="mt-1 text-2xl sm:text-3xl font-black">Employee Payment Details</h1><p className="mt-1 text-sm text-slate-500">HR verifies where each employee should be paid. Accountant will consume these details later but will not edit them.</p></div>
            <button onClick={load} className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-xs font-bold"><RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />Refresh</button>
          </section>

          {error && <div className="rounded-2xl border border-rose-200 bg-rose-50 p-4 text-sm font-semibold text-rose-700 flex items-center gap-2"><AlertTriangle className="w-4 h-4" />{error}</div>}

          <section className="rounded-3xl border border-slate-200 bg-white p-4 shadow-sm"><div className="relative"><Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" /><input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search employee, code, role or site..." className="w-full rounded-xl border border-slate-200 bg-slate-50 pl-10 pr-3 py-2.5 text-sm" /></div></section>

          <section className="rounded-3xl border border-slate-200 bg-white shadow-sm overflow-hidden">
            <div className="p-5 border-b border-slate-100 flex items-center justify-between"><h2 className="font-black flex items-center gap-2"><CreditCard className="w-5 h-5 text-indigo-600" />Payout Readiness</h2><span className="text-xs font-bold text-slate-400">{filtered.length} employees</span></div>
            {loading ? <div className="p-16 flex items-center justify-center gap-2 text-sm text-slate-500"><Loader2 className="w-5 h-5 animate-spin text-indigo-600" />Loading payout profiles...</div> : <div className="overflow-x-auto"><table className="w-full text-left"><thead className="bg-slate-50 text-[10px] uppercase tracking-wider text-slate-400"><tr><th className="px-5 py-3">Employee</th><th className="px-5 py-3">Site</th><th className="px-5 py-3">Provider</th><th className="px-5 py-3">Account / Mobile</th><th className="px-5 py-3">Verified</th><th className="px-5 py-3 text-right">Action</th></tr></thead><tbody className="divide-y divide-slate-100">{filtered.map((employee) => <PayoutRow key={employee.id} employee={employee} profile={profileMap.get(employee.id)} onEdit={() => openEdit(employee)} />)}</tbody></table></div>}
          </section>
        </main>
      </div>

      {editing && <div className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-sm p-4 flex items-center justify-center"><div className="w-full max-w-lg rounded-3xl bg-white shadow-2xl"><div className="p-5 border-b border-slate-100 flex items-center justify-between"><div><h2 className="font-black text-lg">Payment Details</h2><p className="text-xs text-slate-500 mt-1">{editing.name} • {editing.employee_code || 'No code'}</p></div><button onClick={() => setEditing(null)} className="p-2 rounded-xl hover:bg-slate-100"><X className="w-5 h-5" /></button></div><form onSubmit={save} className="p-5 space-y-4"><label className="block space-y-1"><span className="text-xs font-bold text-slate-600">Payout Provider *</span><select required value={form.provider_id} onChange={(e) => setForm({ ...form, provider_id: e.target.value })} className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm"><option value="">Select provider</option>{providers.map((provider) => <option key={provider.id} value={provider.id}>{provider.name} — {String(provider.channel_type || '').replaceAll('_', ' ')}</option>)}</select></label><label className="block space-y-1"><span className="text-xs font-bold text-slate-600">{selectedProvider?.channel_type === 'mobile_money' ? 'Mobile Number' : 'Account / Mobile Number'} *</span><input required value={form.account_or_mobile_number} onChange={(e) => setForm({ ...form, account_or_mobile_number: e.target.value })} className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm" /></label>{selectedProvider?.channel_type === 'bank' && <label className="block space-y-1"><span className="text-xs font-bold text-slate-600">Branch Code</span><input value={form.branch_code} onChange={(e) => setForm({ ...form, branch_code: e.target.value })} className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm" /></label>}<label className="block space-y-1"><span className="text-xs font-bold text-slate-600">Payment Proof Document</span><select value={form.proof_document_id} onChange={(e) => setForm({ ...form, proof_document_id: e.target.value })} className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm"><option value="">No proof attached</option>{proofDocs.map((doc) => <option key={doc.id} value={doc.id}>{doc.file_name} — {doc.document_type.replaceAll('_', ' ')}</option>)}</select></label><div className="rounded-2xl border border-indigo-100 bg-indigo-50 p-4 text-xs text-indigo-800 flex items-start gap-2"><ShieldCheck className="w-4 h-4 shrink-0 mt-0.5" /><span>Saving this marks the payout destination as HR-verified. Accountant later reads it for payroll preparation; it is not a payment action.</span></div><div className="flex justify-end gap-2"><button type="button" onClick={() => setEditing(null)} className="rounded-xl px-4 py-2.5 text-sm font-bold text-slate-600">Cancel</button><button disabled={saving} className="inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-5 py-2.5 text-sm font-bold text-white disabled:opacity-50">{saving && <Loader2 className="w-4 h-4 animate-spin" />}Verify & Save</button></div></form></div></div>}
    </div>
  );
}

function PayoutRow({ employee, profile, onEdit }) {
  const masked = profile?.account_or_mobile_number ? mask(profile.account_or_mobile_number) : 'Not configured';
  return <tr className="text-sm hover:bg-slate-50/60"><td className="px-5 py-4"><div className="font-bold text-slate-900">{employee.name}</div><div className="text-[11px] text-slate-400">{employee.employee_code || 'No code'} • {employee.job_role || 'No role'}</div></td><td className="px-5 py-4">{employee.site?.site_name || 'Unassigned'}</td><td className="px-5 py-4 font-semibold">{profile?.provider?.name || <span className="text-amber-700">Missing</span>}</td><td className="px-5 py-4 font-mono text-xs">{masked}</td><td className="px-5 py-4">{profile?.verified_at ? <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-2.5 py-1 text-[10px] font-bold text-emerald-700"><CheckCircle2 className="w-3 h-3" />Verified</span> : <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-50 px-2.5 py-1 text-[10px] font-bold text-amber-700"><AlertTriangle className="w-3 h-3" />Needs setup</span>}</td><td className="px-5 py-4 text-right"><button onClick={onEdit} className="p-2 rounded-xl text-slate-500 hover:bg-indigo-50 hover:text-indigo-600" title="Edit payment details"><Pencil className="w-4 h-4" /></button></td></tr>;
}

function mask(value) {
  const text = String(value || '');
  if (text.length <= 4) return text;
  return `${'•'.repeat(Math.max(4, text.length - 4))}${text.slice(-4)}`;
}
