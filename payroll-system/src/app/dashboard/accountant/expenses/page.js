'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { AlertTriangle, CheckCircle2, ExternalLink, Loader2, Plus, Receipt, RefreshCw, Search, X, XCircle } from 'lucide-react';
import AccNavbar from '@/components/accountant/AccNavbar';
import AccSideNav from '@/components/accountant/AccSideNav';

const EMPTY = { title: '', vendor: '', amount: '', spent_at: new Date().toISOString().slice(0, 10), category_id: '', site_id: '', description: '', notes: '', receipt: null };
const money = (value) => `P${Number(value || 0).toLocaleString('en-BW', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

export default function ExpensesPage() {
  const [expenses, setExpenses] = useState([]);
  const [categories, setCategories] = useState([]);
  const [sites, setSites] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('all');
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState(EMPTY);

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const response = await fetch('/api/accountant/expenses', { cache: 'no-store' });
      const result = await response.json();
      if (!response.ok || !result.success) throw new Error(result.error || 'Could not load expenses.');
      setExpenses(result.data || []);
      setCategories(result.categories || []);
      setSites(result.sites || []);
    } catch (err) { setError(err.message); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  const filtered = useMemo(() => expenses.filter((expense) => {
    const q = search.trim().toLowerCase();
    const matchesSearch = !q || [expense.title, expense.vendor, expense.description, expense.category?.category_name, expense.site?.site_name].some((value) => String(value || '').toLowerCase().includes(q));
    return matchesSearch && (status === 'all' || expense.status === status);
  }), [expenses, search, status]);

  async function createExpense(event) {
    event.preventDefault();
    setSaving(true);
    setError('');
    try {
      const payload = new FormData();
      Object.entries(form).forEach(([key, value]) => { if (value !== null && value !== '') payload.append(key, value); });
      const response = await fetch('/api/accountant/expenses', { method: 'POST', body: payload });
      const result = await response.json();
      if (!response.ok || !result.success) throw new Error(result.error || 'Could not record expense.');
      setOpen(false);
      setForm(EMPTY);
      await load();
    } catch (err) { setError(err.message); }
    finally { setSaving(false); }
  }

  async function changeStatus(id, nextStatus) {
    setError('');
    try {
      const response = await fetch('/api/accountant/expenses', {
        method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id, status: nextStatus }),
      });
      const result = await response.json();
      if (!response.ok || !result.success) throw new Error(result.error || 'Could not update expense.');
      await load();
    } catch (err) { setError(err.message); }
  }

  const total = filtered.reduce((sum, expense) => sum + Number(expense.amount || 0), 0);

  return <div className="min-h-screen bg-slate-100 flex flex-col lg:flex-row text-slate-900">
    <AccSideNav />
    <div className="flex-1 min-w-0">
      <AccNavbar title="Expenses" subtitle="Record and verify operational expenses using real company data" />
      <main className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto space-y-6">
        <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4"><div><p className="text-[11px] uppercase tracking-[0.16em] font-bold text-indigo-600">Financial Records</p><h1 className="text-2xl font-black mt-1">Expense Register</h1><p className="text-sm text-slate-500 mt-1">No demo expenses. Every row below is stored in Supabase and audit logged.</p></div><div className="flex gap-2"><button onClick={load} className="rounded-xl border border-slate-200 p-2.5"><RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} /></button><button onClick={() => setOpen(true)} className="rounded-xl bg-indigo-600 text-white px-4 py-2.5 text-sm font-bold inline-flex items-center gap-2"><Plus className="w-4 h-4" />Record Expense</button></div></section>

        {error && <div className="rounded-2xl border border-rose-200 bg-rose-50 p-4 text-sm font-semibold text-rose-700 flex items-center gap-2"><AlertTriangle className="w-4 h-4" />{error}</div>}

        <section className="rounded-3xl border border-slate-200 bg-white p-4 shadow-sm grid grid-cols-1 md:grid-cols-3 gap-3"><div className="relative"><Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" /><input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search title, vendor, site..." className="w-full rounded-xl border border-slate-200 bg-slate-50 pl-10 pr-3 py-2.5 text-sm" /></div><select value={status} onChange={(e) => setStatus(e.target.value)} className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm font-semibold"><option value="all">All Statuses</option><option value="recorded">Recorded</option><option value="verified">Verified</option><option value="flagged">Flagged</option></select><div className="rounded-xl bg-slate-950 text-white px-4 py-2.5 text-right"><div className="text-[10px] uppercase tracking-wider text-slate-400 font-bold">Filtered Total</div><div className="font-black">{money(total)}</div></div></section>

        <section className="rounded-3xl border border-slate-200 bg-white shadow-sm overflow-hidden">{loading ? <div className="p-16 flex justify-center gap-2 text-sm text-slate-500"><Loader2 className="w-5 h-5 animate-spin text-indigo-600" />Loading expenses...</div> : !filtered.length ? <div className="p-16 text-center text-sm text-slate-500">No expenses recorded for this filter.</div> : <div className="overflow-x-auto"><table className="w-full text-left"><thead className="bg-slate-50 text-[10px] uppercase tracking-wider text-slate-400"><tr><th className="px-5 py-3">Expense</th><th className="px-5 py-3">Site</th><th className="px-5 py-3">Date</th><th className="px-5 py-3">Amount</th><th className="px-5 py-3">Receipt</th><th className="px-5 py-3">Status</th><th className="px-5 py-3 text-right">Action</th></tr></thead><tbody className="divide-y divide-slate-100">{filtered.map((expense) => <tr key={expense.id}><td className="px-5 py-4"><div className="font-bold text-sm">{expense.title}</div><div className="text-xs text-slate-500">{expense.vendor || expense.category?.category_name || 'Uncategorized'}</div></td><td className="px-5 py-4 text-sm">{expense.site?.site_name || '—'}</td><td className="px-5 py-4 text-sm">{expense.spent_at}</td><td className="px-5 py-4 font-black">{money(expense.amount)}</td><td className="px-5 py-4">{expense.receipt_url ? <a href={expense.receipt_url} target="_blank" rel="noreferrer" className="text-xs font-bold text-indigo-600 inline-flex items-center gap-1"><ExternalLink className="w-3 h-3" />Open</a> : <span className="text-xs text-slate-400">No receipt</span>}</td><td className="px-5 py-4"><Status value={expense.status} /></td><td className="px-5 py-4"><div className="flex justify-end gap-2"><button onClick={() => changeStatus(expense.id, 'verified')} className="p-2 rounded-xl text-emerald-600 hover:bg-emerald-50" title="Verify"><CheckCircle2 className="w-4 h-4" /></button><button onClick={() => changeStatus(expense.id, 'flagged')} className="p-2 rounded-xl text-rose-600 hover:bg-rose-50" title="Flag"><XCircle className="w-4 h-4" /></button></div></td></tr>)}</tbody></table></div>}</section>
      </main>
    </div>

    {open && <div className="fixed inset-0 z-50 bg-slate-950/60 p-4 flex items-center justify-center"><div className="bg-white rounded-3xl w-full max-w-2xl max-h-[92vh] overflow-y-auto"><div className="p-5 border-b border-slate-100 flex justify-between"><div><h2 className="font-black text-lg">Record Expense</h2><p className="text-xs text-slate-500 mt-1">Receipt is optional but JPG, PNG and PDF are supported.</p></div><button onClick={() => setOpen(false)}><X className="w-5 h-5" /></button></div><form onSubmit={createExpense} className="p-5 grid grid-cols-1 sm:grid-cols-2 gap-4"><Field required label="Title" value={form.title} onChange={(v) => setForm({ ...form, title: v })} /><Field label="Vendor / Payee" value={form.vendor} onChange={(v) => setForm({ ...form, vendor: v })} /><Field required label="Amount (BWP)" type="number" min="0.01" step="0.01" value={form.amount} onChange={(v) => setForm({ ...form, amount: v })} /><Field required label="Date" type="date" value={form.spent_at} onChange={(v) => setForm({ ...form, spent_at: v })} /><Select label="Category" value={form.category_id} onChange={(v) => setForm({ ...form, category_id: v })} options={categories.map((c) => [c.id, c.category_name])} empty="Uncategorized" /><Select label="Site" value={form.site_id} onChange={(v) => setForm({ ...form, site_id: v })} options={sites.map((s) => [s.id, s.site_name])} empty="No site" /><Field label="Description" value={form.description} onChange={(v) => setForm({ ...form, description: v })} /><Field label="Notes" value={form.notes} onChange={(v) => setForm({ ...form, notes: v })} /><label className="sm:col-span-2 space-y-1"><span className="text-xs font-bold text-slate-600">Receipt</span><input type="file" accept="image/jpeg,image/png,application/pdf" onChange={(e) => setForm({ ...form, receipt: e.target.files?.[0] || null })} className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm" /></label><div className="sm:col-span-2 flex justify-end gap-2"><button type="button" onClick={() => setOpen(false)} className="px-4 py-2.5 text-sm font-bold text-slate-600">Cancel</button><button disabled={saving} className="rounded-xl bg-indigo-600 px-5 py-2.5 text-sm font-bold text-white inline-flex items-center gap-2">{saving && <Loader2 className="w-4 h-4 animate-spin" />}Save Expense</button></div></form></div></div>}
  </div>;
}

function Status({ value }) { const cls = value === 'verified' ? 'bg-emerald-50 text-emerald-700' : value === 'flagged' ? 'bg-rose-50 text-rose-700' : 'bg-slate-100 text-slate-700'; return <span className={`rounded-full px-2.5 py-1 text-[10px] font-bold ${cls}`}>{value}</span>; }
function Field({ label, value, onChange, ...props }) { return <label className="space-y-1"><span className="text-xs font-bold text-slate-600">{label}</span><input value={value} onChange={(e) => onChange(e.target.value)} className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm" {...props} /></label>; }
function Select({ label, value, onChange, options, empty }) { return <label className="space-y-1"><span className="text-xs font-bold text-slate-600">{label}</span><select value={value} onChange={(e) => onChange(e.target.value)} className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm"><option value="">{empty}</option>{options.map(([v, l]) => <option key={v} value={v}>{l}</option>)}</select></label>; }
