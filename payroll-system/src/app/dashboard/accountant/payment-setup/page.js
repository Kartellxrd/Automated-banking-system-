'use client';

import { useCallback, useEffect, useState } from 'react';
import {
  AlertTriangle,
  CheckCircle2,
  Landmark,
  Loader2,
  Plus,
  RefreshCw,
  ShieldCheck,
  TestTube2,
  ToggleLeft,
  ToggleRight,
  X,
} from 'lucide-react';
import AccNavbar from '@/components/accountant/AccNavbar';
import AccSideNav from '@/components/accountant/AccSideNav';

export default function AccountantPaymentSetupPage() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [form, setForm] = useState({
    account_name: 'Periscope Payroll Account',
    institution_name: 'First National Bank Botswana',
    account_type: 'bank',
    last_four: '',
    currency: 'BWP',
    notes: '',
  });

  const load = useCallback(async (silent = false) => {
    if (silent) setRefreshing(true); else setLoading(true);
    setError('');
    try {
      const response = await fetch('/api/accountant/payment-setup', { cache: 'no-store' });
      const json = await response.json();
      if (!response.ok || !json.success) throw new Error(json.error || 'Could not load payment setup.');
      setData(json.data);
    } catch (err) {
      setError(err.message || 'Could not load payment setup.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  async function addSource(event) {
    event.preventDefault();
    setSaving(true); setError(''); setSuccess('');
    try {
      const response = await fetch('/api/accountant/payment-setup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });
      const json = await response.json();
      if (!response.ok || !json.success) throw new Error(json.error || 'Could not add payment source.');
      setSuccess('Company payment source added and made available to the CEO Payment Center.');
      setOpen(false);
      setForm({ account_name: 'Periscope Payroll Account', institution_name: 'First National Bank Botswana', account_type: 'bank', last_four: '', currency: 'BWP', notes: '' });
      await load(true);
    } catch (err) {
      setError(err.message || 'Could not add payment source.');
    } finally {
      setSaving(false);
    }
  }

  async function toggle(account) {
    setSaving(true); setError(''); setSuccess('');
    try {
      const response = await fetch('/api/accountant/payment-setup', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: account.id, is_active: !account.is_active }),
      });
      const json = await response.json();
      if (!response.ok || !json.success) throw new Error(json.error || 'Could not update payment source.');
      setSuccess(`${account.account_name} ${json.data.is_active ? 'activated' : 'deactivated'}.`);
      await load(true);
    } catch (err) {
      setError(err.message || 'Could not update payment source.');
    } finally {
      setSaving(false);
    }
  }

  const env = data?.environment;
  const readiness = data?.readiness || {};
  const accounts = data?.accounts || [];
  const testMode = env?.mode !== 'production';

  return (
    <div className="min-h-screen bg-slate-100 flex flex-col lg:flex-row text-slate-900">
      <AccSideNav />
      <div className="flex-1 min-w-0">
        <AccNavbar title="Payment Setup" subtitle="Configure the company payment source used for CEO-released payroll and expenses" />
        <main className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto space-y-6">
          {error && <Notice type="error" text={error} onClose={() => setError('')} />}
          {success && <Notice type="success" text={success} onClose={() => setSuccess('')} />}

          {loading ? <div className="py-20 flex items-center justify-center gap-2 text-slate-500"><Loader2 className="w-5 h-5 animate-spin" />Loading payment setup...</div> : data && <>
            <section className={`rounded-3xl border p-5 sm:p-6 ${testMode ? 'border-amber-200 bg-amber-50' : 'border-emerald-200 bg-emerald-50'}`}>
              <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                <div className="flex items-start gap-3">
                  <div className={`rounded-2xl p-3 ${testMode ? 'bg-amber-100 text-amber-700' : 'bg-emerald-100 text-emerald-700'}`}>{testMode ? <TestTube2 className="w-5 h-5" /> : <ShieldCheck className="w-5 h-5" />}</div>
                  <div>
                    <p className="text-xs font-black uppercase tracking-wider text-slate-500">Environment</p>
                    <h2 className="font-black text-lg mt-1">{testMode ? 'FNB Test Mode' : 'Production Mode'}</h2>
                    <p className="text-sm text-slate-600 mt-1">{testMode ? 'No automatic live bank transfer is enabled. Test payment runs and generic instruction exports are safe to use.' : 'Production controls are enabled. Bank transmission still requires an approved FNB connection or official file upload process.'}</p>
                  </div>
                </div>
                <button onClick={() => load(true)} disabled={refreshing} className="w-full lg:w-auto rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-xs font-black inline-flex items-center justify-center gap-2"><RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />Refresh</button>
              </div>
            </section>

            <section className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <StatusCard label="Active company sources" value={readiness.active_source_count || 0} ok={readiness.has_active_source} />
              <StatusCard label="FNB Bulk method" value={readiness.fnb_bulk_method_available ? 'Available' : 'Missing'} ok={readiness.fnb_bulk_method_available} />
              <StatusCard label="Official FNB file template" value={readiness.official_fnb_file_template_installed ? 'Installed' : 'Pending'} ok={readiness.official_fnb_file_template_installed} />
            </section>

            <section className="rounded-3xl border border-slate-200 bg-white shadow-sm overflow-hidden">
              <div className="p-5 sm:p-6 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <p className="text-xs font-black uppercase tracking-wider text-indigo-600">Company Banking</p>
                  <h2 className="text-xl font-black mt-1">Payment Sources</h2>
                  <p className="text-sm text-slate-500 mt-1">Store only safe account metadata here. Online-banking passwords, PINs, OTPs and API secrets must never be stored in this table.</p>
                </div>
                <button onClick={() => setOpen(true)} className="w-full sm:w-auto rounded-xl bg-indigo-600 px-4 py-3 text-sm font-black text-white inline-flex items-center justify-center gap-2"><Plus className="w-4 h-4" />Add FNB Source</button>
              </div>

              {!accounts.length ? <div className="p-10 text-center text-sm text-slate-500">No company payment source exists yet. Add the Periscope FNB payroll account before the CEO releases payments.</div> : <div className="divide-y divide-slate-100">
                {accounts.map((account) => <div key={account.id} className="p-5 sm:p-6 flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                  <div className="flex items-start gap-3 min-w-0">
                    <div className="rounded-2xl bg-indigo-50 p-3 text-indigo-600 shrink-0"><Landmark className="w-5 h-5" /></div>
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2"><h3 className="font-black break-words">{account.account_name}</h3><span className={`rounded-full px-2.5 py-1 text-[10px] font-black uppercase ${account.is_active ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-100 text-slate-500'}`}>{account.is_active ? 'Active' : 'Inactive'}</span></div>
                      <p className="text-sm text-slate-600 mt-1 break-words">{account.institution_name} · {account.currency || 'BWP'} · {account.account_type?.replaceAll('_', ' ')}</p>
                      <p className="text-xs text-slate-400 mt-1">{account.account_identifier_label || 'No masked identifier stored'}</p>
                      {account.notes && <p className="text-xs text-slate-500 mt-2">{account.notes}</p>}
                    </div>
                  </div>
                  <button disabled={saving} onClick={() => toggle(account)} className={`w-full lg:w-auto rounded-xl border px-4 py-2.5 text-xs font-black inline-flex items-center justify-center gap-2 ${account.is_active ? 'border-slate-200 bg-white text-slate-700' : 'border-emerald-200 bg-emerald-50 text-emerald-700'}`}>{account.is_active ? <ToggleRight className="w-4 h-4" /> : <ToggleLeft className="w-4 h-4" />}{account.is_active ? 'Deactivate' : 'Activate'}</button>
                </div>)}
              </div>}
            </section>

            <section className="rounded-3xl border border-indigo-200 bg-indigo-50 p-5 sm:p-6">
              <h2 className="font-black text-indigo-950">How FNB V1 will work</h2>
              <p className="text-sm text-indigo-900 mt-2">CEO releases an approved payment run → Accountant chooses this active company source → the system exports the locked recipient instructions → Finance submits them through the approved FNB bulk-payment process → settlement results are recorded per recipient. We will replace the generic instruction CSV with the official FNB format only after we have the bank's exact template/specification.</p>
            </section>
          </>}
        </main>
      </div>

      {open && <div className="fixed inset-0 z-[100] bg-slate-950/60 p-3 sm:p-4 flex items-center justify-center"><div className="w-full max-w-lg max-h-[92vh] rounded-3xl bg-white shadow-2xl overflow-hidden flex flex-col"><div className="p-5 border-b border-slate-100 flex justify-between gap-3"><div><p className="text-xs font-black uppercase tracking-wider text-indigo-600">Company Payment Source</p><h2 className="text-xl font-black mt-1">Add FNB Payroll Account</h2></div><button disabled={saving} onClick={() => setOpen(false)} className="p-2 rounded-xl hover:bg-slate-100"><X className="w-5 h-5" /></button></div><form onSubmit={addSource} className="flex min-h-0 flex-col"><div className="p-5 space-y-4 overflow-y-auto">
        <Field label="Account label *" value={form.account_name} onChange={(value) => setForm({ ...form, account_name: value })} placeholder="Periscope Payroll Account" />
        <Field label="Bank / institution *" value={form.institution_name} onChange={(value) => setForm({ ...form, institution_name: value })} placeholder="First National Bank Botswana" />
        <label className="block"><span className="text-xs font-bold text-slate-600">Account type</span><select value={form.account_type} onChange={(e) => setForm({ ...form, account_type: e.target.value })} className="mt-1 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm"><option value="bank">Bank account</option><option value="mobile_wallet">Mobile wallet</option><option value="other">Other</option></select></label>
        <Field label="Last 4 digits only" value={form.last_four} onChange={(value) => setForm({ ...form, last_four: value.replace(/\D/g, '').slice(0, 4) })} placeholder="4182" inputMode="numeric" />
        <label className="block"><span className="text-xs font-bold text-slate-600">Currency</span><select value={form.currency} onChange={(e) => setForm({ ...form, currency: e.target.value })} className="mt-1 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm"><option value="BWP">BWP — Botswana Pula</option></select></label>
        <label className="block"><span className="text-xs font-bold text-slate-600">Notes</span><textarea value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} rows={3} className="mt-1 w-full rounded-xl border border-slate-200 bg-slate-50 p-3 text-sm" placeholder="Optional internal description" /></label>
        <div className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-xs text-amber-800"><strong>Do not enter:</strong> FNB online-banking password, PIN, OTP, API secret, certificate private key or full source account number.</div>
      </div><div className="p-4 sm:p-5 border-t border-slate-100 bg-white flex flex-col-reverse sm:flex-row sm:justify-end gap-2"><button type="button" disabled={saving} onClick={() => setOpen(false)} className="w-full sm:w-auto rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-bold">Cancel</button><button type="submit" disabled={saving} className="w-full sm:w-auto rounded-xl bg-indigo-600 px-5 py-2.5 text-sm font-black text-white inline-flex items-center justify-center gap-2">{saving && <Loader2 className="w-4 h-4 animate-spin" />}Add Source</button></div></form></div></div>}
    </div>
  );
}

function Field({ label, value, onChange, placeholder = '', inputMode }) { return <label className="block"><span className="text-xs font-bold text-slate-600">{label}</span><input required={label.includes('*')} value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} inputMode={inputMode} className="mt-1 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm" /></label>; }
function StatusCard({ label, value, ok }) { return <div className="rounded-3xl border border-slate-200 bg-white p-5"><div className="flex items-start justify-between gap-3"><div><p className="text-[10px] font-black uppercase tracking-wider text-slate-400">{label}</p><p className="text-xl font-black mt-2">{value}</p></div>{ok ? <CheckCircle2 className="w-5 h-5 text-emerald-600" /> : <AlertTriangle className="w-5 h-5 text-amber-600" />}</div></div>; }
function Notice({ type, text, onClose }) { return <div className={`rounded-2xl border p-4 flex justify-between gap-3 text-sm font-semibold ${type === 'success' ? 'border-emerald-200 bg-emerald-50 text-emerald-800' : 'border-rose-200 bg-rose-50 text-rose-700'}`}><span>{text}</span><button onClick={onClose}><X className="w-4 h-4" /></button></div>; }
