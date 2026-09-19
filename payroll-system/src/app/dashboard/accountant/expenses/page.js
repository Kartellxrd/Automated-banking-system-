'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { AlertTriangle, CheckCircle2, FileCheck2, Loader2, RefreshCw, Search, WalletCards } from 'lucide-react';
import AccNavbar from '@/components/accountant/AccNavbar';
import AccSideNav from '@/components/accountant/AccSideNav';

const money = (value) => `P${Number(value || 0).toLocaleString('en-BW', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

export default function ExpensesLedgerPage() {
  const [expenses, setExpenses] = useState([]);
  const [summary, setSummary] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [source, setSource] = useState('all');

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const response = await fetch('/api/accountant/expenses', { cache: 'no-store' });
      const result = await response.json();
      if (!response.ok || !result.success) throw new Error(result.error || 'Could not load expense ledger.');
      setExpenses(result.data || []);
      setSummary(result.summary || {});
    } catch (err) {
      setError(err.message || 'Could not load expense ledger.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return expenses.filter((expense) => {
      const matchesSearch = !q || [
        expense.title,
        expense.vendor,
        expense.description,
        expense.category?.category_name,
        expense.site?.site_name,
        expense.request?.request_code,
        expense.payment_reference,
      ].some((value) => String(value || '').toLowerCase().includes(q));
      const matchesSource = source === 'all' || expense.source_type === source;
      return matchesSearch && matchesSource;
    });
  }, [expenses, search, source]);

  const filteredTotal = filtered.reduce((sum, expense) => sum + Number(expense.amount || 0), 0);

  return (
    <div className="min-h-screen bg-slate-100 flex flex-col lg:flex-row text-slate-900">
      <AccSideNav />
      <div className="flex-1 min-w-0">
        <AccNavbar title="Expenses Ledger" subtitle="Final company spending created from approved expense workflows" />
        <main className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto space-y-6">
          <section className="rounded-3xl bg-slate-950 p-6 sm:p-8 text-white flex flex-col lg:flex-row lg:items-center justify-between gap-5">
            <div>
              <p className="text-[11px] uppercase tracking-[0.18em] text-indigo-300 font-bold">Verified Financial Record</p>
              <h1 className="text-2xl sm:text-3xl font-black mt-1">Expense Ledger</h1>
              <p className="text-sm text-slate-300 mt-2 max-w-3xl">Expenses enter this ledger only after the approved workflow is complete: direct vendor payments appear after confirmed payment, while site advances appear after reconciliation is accepted.</p>
            </div>
            <button onClick={load} className="rounded-xl border border-slate-700 bg-slate-900 px-4 py-3 text-sm font-bold inline-flex items-center justify-center gap-2">
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />Refresh Ledger
            </button>
          </section>

          {error && <div className="rounded-2xl border border-rose-200 bg-rose-50 p-4 text-sm font-semibold text-rose-700 flex items-center gap-2"><AlertTriangle className="w-4 h-4" />{error}</div>}

          <section className="grid grid-cols-2 xl:grid-cols-4 gap-4">
            <Metric label="Ledger Records" value={summary.total_records || 0} />
            <Metric label="Ledger Value" value={money(summary.total_amount || 0)} />
            <Metric label="Direct Vendor" value={summary.direct_vendor || 0} />
            <Metric label="Site Advances" value={summary.site_advance || 0} />
          </section>

          <section className="rounded-3xl border border-slate-200 bg-white p-4 shadow-sm grid grid-cols-1 md:grid-cols-[1fr_230px_220px] gap-3">
            <div className="relative">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search request, payee, site or payment reference..." className="w-full rounded-xl border border-slate-200 bg-slate-50 pl-10 pr-3 py-2.5 text-sm" />
            </div>
            <select value={source} onChange={(e) => setSource(e.target.value)} className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm font-semibold">
              <option value="all">All Sources</option>
              <option value="direct_vendor">Direct Vendor Payments</option>
              <option value="site_advance">Site Advance Reconciliations</option>
              <option value="legacy">Legacy Records</option>
            </select>
            <div className="rounded-xl bg-slate-950 text-white px-4 py-2.5 text-right">
              <div className="text-[10px] uppercase tracking-wider text-slate-400 font-bold">Filtered Total</div>
              <div className="font-black">{money(filteredTotal)}</div>
            </div>
          </section>

          <section className="rounded-3xl border border-slate-200 bg-white shadow-sm overflow-hidden">
            {loading ? (
              <div className="p-16 flex justify-center gap-2 text-sm text-slate-500"><Loader2 className="w-5 h-5 animate-spin text-indigo-600" />Loading expense ledger...</div>
            ) : !filtered.length ? (
              <div className="p-16 text-center text-sm text-slate-500">No finalized expenses match this filter.</div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full min-w-[1050px] text-left">
                  <thead className="bg-slate-50 text-[10px] uppercase tracking-wider text-slate-400">
                    <tr>
                      <th className="px-5 py-3">Source</th>
                      <th className="px-5 py-3">Expense</th>
                      <th className="px-5 py-3">Site</th>
                      <th className="px-5 py-3">Finalized</th>
                      <th className="px-5 py-3">Amount</th>
                      <th className="px-5 py-3">Payment Reference</th>
                      <th className="px-5 py-3">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {filtered.map((expense) => (
                      <tr key={expense.id}>
                        <td className="px-5 py-4">
                          <SourceBadge type={expense.source_type} label={expense.source_label} />
                          {expense.request?.request_code && <div className="text-[11px] font-mono text-slate-400 mt-1">{expense.request.request_code}</div>}
                        </td>
                        <td className="px-5 py-4">
                          <div className="font-bold text-sm">{expense.title}</div>
                          <div className="text-xs text-slate-500 mt-1">{expense.vendor || expense.category?.category_name || 'No payee label'}</div>
                          {expense.category?.category_name && expense.vendor && <div className="text-[11px] text-slate-400 mt-1">{expense.category.category_name}</div>}
                        </td>
                        <td className="px-5 py-4 text-sm">{expense.site?.site_name || '—'}</td>
                        <td className="px-5 py-4 text-sm">
                          <div>{expense.spent_at || '—'}</div>
                          {expense.payment_date && <div className="text-[11px] text-slate-400 mt-1">Payment: {new Date(expense.payment_date).toLocaleString('en-BW')}</div>}
                        </td>
                        <td className="px-5 py-4 font-black">{money(expense.amount)}</td>
                        <td className="px-5 py-4">
                          {expense.payment_reference ? <span className="font-mono text-xs font-bold text-slate-700">{expense.payment_reference}</span> : <span className="text-xs text-slate-400">{expense.source_type === 'legacy' ? 'Not captured in workflow' : 'See reconciliation trail'}</span>}
                        </td>
                        <td className="px-5 py-4"><Status value={expense.status} legacy={expense.source_type === 'legacy'} /></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>

          {summary.legacy > 0 && (
            <section className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-xs text-amber-900 flex items-start gap-2">
              <AlertTriangle className="w-4 h-4 mt-0.5 shrink-0" />
              <p><strong>{summary.legacy} legacy expense record{summary.legacy === 1 ? '' : 's'} remain visible for history.</strong> New expenses cannot bypass the request, CEO approval, payment and reconciliation workflow.</p>
            </section>
          )}
        </main>
      </div>
    </div>
  );
}

function Metric({ label, value }) {
  return <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm"><div className="text-[10px] uppercase tracking-wider text-slate-400 font-bold">{label}</div><div className="text-2xl font-black mt-2">{value}</div></div>;
}

function SourceBadge({ type, label }) {
  const cls = type === 'direct_vendor'
    ? 'bg-indigo-50 text-indigo-700 border-indigo-200'
    : type === 'site_advance'
      ? 'bg-amber-50 text-amber-700 border-amber-200'
      : 'bg-slate-100 text-slate-600 border-slate-200';
  const Icon = type === 'direct_vendor' ? WalletCards : type === 'site_advance' ? FileCheck2 : AlertTriangle;
  return <span className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[10px] font-black uppercase ${cls}`}><Icon className="w-3 h-3" />{label}</span>;
}

function Status({ value, legacy = false }) {
  const verified = value === 'verified';
  return <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[10px] font-black uppercase ${verified ? 'bg-emerald-50 text-emerald-700' : legacy ? 'bg-slate-100 text-slate-600' : 'bg-amber-50 text-amber-700'}`}>{verified && <CheckCircle2 className="w-3 h-3" />}{value}</span>;
}
