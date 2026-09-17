'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  AlertTriangle,
  Banknote,
  CheckCircle2,
  Download,
  Loader2,
  PlayCircle,
  Plus,
  RefreshCw,
  RotateCcw,
  Search,
  Send,
  WalletCards,
  X,
  XCircle,
} from 'lucide-react';
import AccNavbar from '@/components/accountant/AccNavbar';
import AccSideNav from '@/components/accountant/AccSideNav';

const money = (value) => `P${Number(value || 0).toLocaleString('en-BW', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
const pretty = (value) => String(value || '').replaceAll('_', ' ');

export default function AccountantPaymentsPage() {
  const [runs, setRuns] = useState([]);
  const [accounts, setAccounts] = useState([]);
  const [methods, setMethods] = useState([]);
  const [summary, setSummary] = useState({});
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('open');
  const [selected, setSelected] = useState(null);
  const [startOpen, setStartOpen] = useState(false);
  const [accountOpen, setAccountOpen] = useState(false);
  const [itemAction, setItemAction] = useState(null);
  const [saving, setSaving] = useState(false);
  const [startForm, setStartForm] = useState({ source_account_id: '', notes: '' });
  const [accountForm, setAccountForm] = useState({ account_name: '', institution_name: 'First National Bank Botswana', account_type: 'bank', account_identifier_label: '', notes: '' });
  const [itemForm, setItemForm] = useState({ execution_method_id: '', reference: '', error: '' });

  const load = useCallback(async (silent = false) => {
    if (silent) setRefreshing(true); else setLoading(true);
    setError('');
    try {
      const response = await fetch('/api/accountant/payments', { cache: 'no-store' });
      const json = await response.json();
      if (!response.ok || !json.success) throw new Error(json.error || 'Could not load payment execution queue.');
      setRuns(json.data || []);
      setAccounts(json.accounts || []);
      setMethods(json.methods || []);
      setSummary(json.summary || {});
      setSelected((current) => current ? (json.data || []).find((row) => row.id === current.id) || null : null);
    } catch (err) {
      setError(err.message || 'Could not load payment execution queue.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    const openStatuses = new Set(['prepared','executing','partial_failed','failed']);
    return runs.filter((run) => {
      const matchesSearch = !q || [run.run_code, run.batch?.batch_code, run.batch?.pay_period?.period_name].some((value) => String(value || '').toLowerCase().includes(q));
      const matchesStatus = statusFilter === 'all' ? true : statusFilter === 'open' ? openStatuses.has(run.status) : run.status === statusFilter;
      return matchesSearch && matchesStatus;
    });
  }, [runs, search, statusFilter]);

  function openStart(run) {
    const firstAccount = accounts.find((row) => row.is_active !== false);
    setSelected(run);
    setStartForm({ source_account_id: run.source_payment_account_id || firstAccount?.id || '', notes: run.execution_notes || '' });
    setStartOpen(true);
    setError('');
    setSuccess('');
  }

  async function startRun(event) {
    event.preventDefault();
    if (!selected || !startForm.source_account_id) return;
    setSaving(true);
    setError('');
    try {
      const response = await fetch('/api/accountant/payments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'start_run', run_id: selected.id, ...startForm }),
      });
      const json = await response.json();
      if (!response.ok || !json.success) throw new Error(json.error || 'Could not start payment run.');
      setSuccess(`${selected.run_code} is now in execution. Record only real payment results and references.`);
      setStartOpen(false);
      await load(true);
    } catch (err) {
      setError(err.message || 'Could not start payment run.');
    } finally {
      setSaving(false);
    }
  }

  async function createAccount(event) {
    event.preventDefault();
    setSaving(true);
    setError('');
    try {
      const response = await fetch('/api/accountant/payments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'create_source_account', ...accountForm }),
      });
      const json = await response.json();
      if (!response.ok || !json.success) throw new Error(json.error || 'Could not create company payment source.');
      setSuccess('Company payment source added.');
      setAccountOpen(false);
      setAccountForm({ account_name: '', institution_name: 'First National Bank Botswana', account_type: 'bank', account_identifier_label: '', notes: '' });
      await load(true);
    } catch (err) {
      setError(err.message || 'Could not create company payment source.');
    } finally {
      setSaving(false);
    }
  }

  function beginItemAction(item, action) {
    setItemAction({ item, action });
    const preferred = methods.find((method) => method.code === 'FNB_BULK') || methods[0];
    setItemForm({ execution_method_id: item.execution_method_id || preferred?.id || '', reference: item.payment_reference || '', error: item.payment_error || '' });
    setError('');
  }

  async function saveItemAction(event) {
    event.preventDefault();
    if (!itemAction) return;
    const { item, action } = itemAction;
    setSaving(true);
    setError('');
    try {
      const response = await fetch('/api/accountant/payments', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action, item_id: item.id, ...itemForm }),
      });
      const json = await response.json();
      if (!response.ok || !json.success) throw new Error(json.error || 'Could not update payment item.');
      setSuccess(`${item.payee_name_snapshot || 'Payment'} is now ${json.data.status}.`);
      setItemAction(null);
      await load(true);
    } catch (err) {
      setError(err.message || 'Could not update payment item.');
    } finally {
      setSaving(false);
    }
  }

  async function retryItem() {
    if (!itemAction) return;
    setSaving(true);
    setError('');
    try {
      const response = await fetch('/api/accountant/payments', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'retry', item_id: itemAction.item.id }),
      });
      const json = await response.json();
      if (!response.ok || !json.success) throw new Error(json.error || 'Could not queue failed payment for retry.');
      setSuccess(`${itemAction.item.payee_name_snapshot || 'Payment'} returned to the execution queue.`);
      setItemAction(null);
      await load(true);
    } catch (err) {
      setError(err.message || 'Could not retry payment item.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="min-h-screen bg-slate-100 flex flex-col lg:flex-row text-slate-900">
      <AccSideNav />
      <div className="flex-1 min-w-0">
        <AccNavbar title="Payment Execution" subtitle="Execute only CEO-authorized payroll using the real company payment process" />
        <main className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto space-y-6">
          <section className="grid grid-cols-2 xl:grid-cols-5 gap-4">
            <Metric label="Awaiting Start" value={summary.awaiting_start || 0} />
            <Metric label="Executing" value={summary.executing || 0} />
            <Metric label="Partial Failed" value={summary.partial_failed || 0} warn />
            <Metric label="Completed" value={summary.completed || 0} />
            <Metric label="Open Value" value={money(summary.pending_amount || 0)} />
          </section>

          <section className="rounded-3xl border border-indigo-200 bg-indigo-50 p-5 text-sm text-indigo-900">
            <div className="font-black">Current Periscope V1 payment operation</div>
            <p className="mt-1 leading-6">CEO authorizes the payment run. The Accountant then executes the real payment using FNB bulk or the approved manual mobile-money method and records the actual reference/result here. The system never turns an item to Paid merely because a button was clicked.</p>
          </section>

          {error && <Notice type="error" text={error} onClose={() => setError('')} />}
          {success && <Notice type="success" text={success} onClose={() => setSuccess('')} />}

          <section className="rounded-3xl border border-slate-200 bg-white p-4 shadow-sm flex flex-col xl:flex-row xl:items-center justify-between gap-3">
            <div className="flex flex-col md:flex-row gap-3 flex-1">
              <div className="relative flex-1 max-w-md"><Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" /><input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search run, batch or pay period..." className="w-full rounded-xl border border-slate-200 bg-slate-50 pl-10 pr-3 py-2.5 text-sm" /></div>
              <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm font-semibold"><option value="open">Open Runs</option><option value="prepared">Prepared</option><option value="executing">Executing</option><option value="partial_failed">Partial Failed</option><option value="failed">Failed</option><option value="completed">Completed</option><option value="all">All</option></select>
            </div>
            <div className="flex gap-2"><button onClick={() => load(true)} className="rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-xs font-bold inline-flex items-center gap-2"><RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />Refresh</button><button onClick={() => setAccountOpen(true)} className="rounded-xl bg-slate-900 px-4 py-2.5 text-xs font-bold text-white inline-flex items-center gap-2"><Plus className="w-4 h-4" />Payment Source</button></div>
          </section>

          <section className="space-y-4">
            {loading ? <div className="p-16 text-center text-slate-500"><Loader2 className="w-6 h-6 animate-spin mx-auto mb-2" />Loading authorized payment runs...</div> : filtered.length === 0 ? <div className="rounded-3xl border border-slate-200 bg-white p-12 text-center text-slate-500">No payment runs match the current filter.</div> : filtered.map((run) => (
              <div key={run.id} className="rounded-3xl border border-slate-200 bg-white p-5 sm:p-6 shadow-sm space-y-4">
                <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-4">
                  <div><div className="flex flex-wrap items-center gap-2"><h2 className="font-black text-lg">{run.run_code}</h2><Status value={run.status} /></div><p className="text-sm text-slate-500 mt-1">{run.batch?.batch_code || 'No payroll batch'} · {run.batch?.pay_period?.period_name || 'Pay period unavailable'} · CEO authorized {run.authorized_at ? new Date(run.authorized_at).toLocaleString('en-BW') : '—'}</p></div>
                  <div className="flex flex-wrap gap-2 items-center"><div className="mr-2"><div className="text-[10px] uppercase text-slate-400 font-bold">Run Total</div><div className="text-xl font-black">{money(run.total_amount)}</div></div><button onClick={() => setSelected(run)} className="rounded-xl border border-slate-200 px-4 py-2.5 text-xs font-bold">View {run.total_items} Payments</button>{run.status === 'prepared' && <button onClick={() => openStart(run)} disabled={!accounts.some((row) => row.is_active !== false)} className="rounded-xl bg-indigo-600 px-4 py-2.5 text-xs font-bold text-white disabled:bg-slate-300 inline-flex items-center gap-2"><PlayCircle className="w-4 h-4" />Start Execution</button>}<a href={`/api/accountant/payments/export?run_id=${encodeURIComponent(run.id)}`} className="rounded-xl bg-emerald-600 px-4 py-2.5 text-xs font-bold text-white inline-flex items-center gap-2"><Download className="w-4 h-4" />Instruction CSV</a></div>
                </div>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3"><Mini label="Queued" value={run.progress.queued} /><Mini label="Submitted" value={run.progress.submitted} /><Mini label="Paid" value={run.progress.paid} good /><Mini label="Failed" value={run.progress.failed} danger={run.progress.failed > 0} /></div>
                {run.status === 'prepared' && !accounts.some((row) => row.is_active !== false) && <div className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-xs font-semibold text-amber-800">Add the company payment source first. We know the same company account is used, but its identifying label must be entered rather than hardcoded.</div>}
              </div>
            ))}
          </section>
        </main>
      </div>

      {selected && <div className="fixed inset-0 z-50 bg-slate-950/60 p-4 overflow-y-auto"><div className="max-w-6xl mx-auto my-5 rounded-3xl bg-white shadow-2xl"><div className="p-5 border-b border-slate-100 flex justify-between gap-4"><div><div className="text-xs uppercase tracking-wider font-black text-indigo-600">Payment Run</div><h2 className="text-xl font-black mt-1">{selected.run_code}</h2><p className="text-xs text-slate-500 mt-1">{selected.batch?.batch_code} · {money(selected.total_amount)}</p></div><button onClick={() => setSelected(null)} className="p-2 rounded-xl hover:bg-slate-100"><X className="w-5 h-5" /></button></div><div className="p-5 overflow-x-auto"><table className="w-full min-w-[1000px] text-sm"><thead className="bg-slate-50 text-[10px] uppercase tracking-wider text-slate-400"><tr><th className="px-4 py-3 text-left">Payee</th><th className="px-4 py-3 text-left">Destination</th><th className="px-4 py-3 text-left">Amount</th><th className="px-4 py-3 text-left">Status</th><th className="px-4 py-3 text-left">Reference / Error</th><th className="px-4 py-3 text-right">Action</th></tr></thead><tbody className="divide-y divide-slate-100">{selected.items.map((item) => <tr key={item.id}><td className="px-4 py-4"><div className="font-bold">{item.payee_name_snapshot}</div><div className="text-[11px] text-slate-400">{item.payout_provider_name_snapshot || 'Provider not labelled'}</div></td><td className="px-4 py-4"><div className="font-mono text-xs">{item.destination_masked || '—'}</div><div className="text-[11px] text-slate-400">Branch {item.branch_code_snapshot || '—'}</div></td><td className="px-4 py-4 font-black">{money(item.amount)}</td><td className="px-4 py-4"><Status value={item.status} /></td><td className="px-4 py-4"><div className="text-xs font-semibold">{item.payment_reference || '—'}</div>{item.payment_error && <div className="text-[11px] text-rose-600 mt-1">{item.payment_error}</div>}</td><td className="px-4 py-4 text-right"><div className="inline-flex gap-1.5">{['queued','failed'].includes(item.status) && selected.status === 'executing' && <button onClick={() => beginItemAction(item, 'submitted')} className="rounded-lg bg-indigo-50 px-2.5 py-2 text-[11px] font-bold text-indigo-700"><Send className="w-3.5 h-3.5 inline mr-1" />Submitted</button>}{['queued','submitted','failed'].includes(item.status) && selected.status === 'executing' && <button onClick={() => beginItemAction(item, 'paid')} className="rounded-lg bg-emerald-50 px-2.5 py-2 text-[11px] font-bold text-emerald-700"><CheckCircle2 className="w-3.5 h-3.5 inline mr-1" />Paid</button>}{['queued','submitted'].includes(item.status) && selected.status === 'executing' && <button onClick={() => beginItemAction(item, 'failed')} className="rounded-lg bg-rose-50 px-2.5 py-2 text-[11px] font-bold text-rose-700"><XCircle className="w-3.5 h-3.5 inline mr-1" />Failed</button>}{item.status === 'failed' && ['partial_failed','failed','executing'].includes(selected.status) && <button onClick={() => beginItemAction(item, 'retry')} className="rounded-lg bg-amber-50 px-2.5 py-2 text-[11px] font-bold text-amber-700"><RotateCcw className="w-3.5 h-3.5 inline mr-1" />Retry</button>}</div></td></tr>)}</tbody></table></div></div></div>}

      {startOpen && selected && <Modal title="Start Authorized Payment Run" subtitle={`${selected.run_code} · ${money(selected.total_amount)}`} onClose={() => !saving && setStartOpen(false)}><form onSubmit={startRun} className="space-y-4"><label className="block"><span className="text-xs font-bold text-slate-600">Company payment source *</span><select required value={startForm.source_account_id} onChange={(e) => setStartForm({ ...startForm, source_account_id: e.target.value })} className="mt-1 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm"><option value="">Select payment source</option>{accounts.filter((row) => row.is_active !== false).map((row) => <option key={row.id} value={row.id}>{row.account_name} — {row.institution_name}{row.account_identifier_label ? ` (${row.account_identifier_label})` : ''}</option>)}</select></label><label className="block"><span className="text-xs font-bold text-slate-600">Execution notes</span><textarea value={startForm.notes} onChange={(e) => setStartForm({ ...startForm, notes: e.target.value })} rows={3} className="mt-1 w-full rounded-xl border border-slate-200 bg-slate-50 p-3 text-sm" placeholder="Optional notes for this payment cycle" /></label><div className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-xs text-amber-800">Starting execution does not mark anyone paid. Each real transaction must be recorded with its actual reference.</div><Actions busy={saving} onCancel={() => setStartOpen(false)} label="Start Execution" /></form></Modal>}

      {accountOpen && <Modal title="Add Company Payment Source" subtitle="Store a safe source label only; do not hardcode banking credentials in the application." onClose={() => !saving && setAccountOpen(false)}><form onSubmit={createAccount} className="space-y-4"><Field label="Account label *" value={accountForm.account_name} onChange={(value) => setAccountForm({ ...accountForm, account_name: value })} placeholder="e.g. Main Payroll Account" /><Field label="Institution *" value={accountForm.institution_name} onChange={(value) => setAccountForm({ ...accountForm, institution_name: value })} placeholder="e.g. First National Bank Botswana" /><label className="block"><span className="text-xs font-bold text-slate-600">Account type</span><select value={accountForm.account_type} onChange={(e) => setAccountForm({ ...accountForm, account_type: e.target.value })} className="mt-1 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm"><option value="bank">Bank</option><option value="mobile_wallet">Mobile Wallet</option><option value="other">Other</option></select></label><Field label="Safe identifier" value={accountForm.account_identifier_label} onChange={(value) => setAccountForm({ ...accountForm, account_identifier_label: value })} placeholder="e.g. ending 4821 (optional)" /><label className="block"><span className="text-xs font-bold text-slate-600">Notes</span><textarea value={accountForm.notes} onChange={(e) => setAccountForm({ ...accountForm, notes: e.target.value })} rows={2} className="mt-1 w-full rounded-xl border border-slate-200 bg-slate-50 p-3 text-sm" /></label><Actions busy={saving} onCancel={() => setAccountOpen(false)} label="Add Payment Source" /></form></Modal>}

      {itemAction && <Modal title={itemAction.action === 'retry' ? 'Retry Failed Payment' : `Record Payment as ${pretty(itemAction.action)}`} subtitle={`${itemAction.item.payee_name_snapshot} · ${money(itemAction.item.amount)}`} onClose={() => !saving && setItemAction(null)}><form onSubmit={itemAction.action === 'retry' ? (e) => { e.preventDefault(); retryItem(); } : saveItemAction} className="space-y-4">{itemAction.action !== 'retry' && <><label className="block"><span className="text-xs font-bold text-slate-600">Execution method *</span><select required value={itemForm.execution_method_id} onChange={(e) => setItemForm({ ...itemForm, execution_method_id: e.target.value })} className="mt-1 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm"><option value="">Select method</option>{methods.map((method) => <option key={method.id} value={method.id}>{method.name}</option>)}</select></label>{itemAction.action !== 'failed' && <Field required label="Real payment / batch reference *" value={itemForm.reference} onChange={(value) => setItemForm({ ...itemForm, reference: value })} placeholder="Reference from FNB / OM / P2C / eWallet" />}{itemAction.action === 'failed' && <><Field label="Reference (if one exists)" value={itemForm.reference} onChange={(value) => setItemForm({ ...itemForm, reference: value })} /><label className="block"><span className="text-xs font-bold text-slate-600">Failure reason *</span><textarea required value={itemForm.error} onChange={(e) => setItemForm({ ...itemForm, error: e.target.value })} rows={3} className="mt-1 w-full rounded-xl border border-slate-200 bg-slate-50 p-3 text-sm" /></label></>}</>}{itemAction.action === 'retry' && <div className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">This clears the failed result and places the payment back in the execution queue. It does not create or send a new transaction by itself.</div>}<Actions busy={saving} onCancel={() => setItemAction(null)} label={itemAction.action === 'retry' ? 'Queue Retry' : 'Save Real Result'} /></form></Modal>}
    </div>
  );
}

function Metric({ label, value, warn = false }) { return <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm"><div className="text-[10px] uppercase tracking-wider text-slate-400 font-bold">{label}</div><div className={`text-2xl font-black mt-1 ${warn ? 'text-rose-700' : ''}`}>{value}</div></div>; }
function Mini({ label, value, good = false, danger = false }) { return <div className={`rounded-xl border p-3 ${danger ? 'border-rose-200 bg-rose-50' : good ? 'border-emerald-200 bg-emerald-50' : 'border-slate-200 bg-slate-50'}`}><div className="text-[10px] uppercase text-slate-400 font-bold">{label}</div><div className="font-black mt-1">{value}</div></div>; }
function Status({ value }) { const good = ['completed','paid'].includes(value); const bad = ['failed','partial_failed'].includes(value); return <span className={`rounded-full px-2.5 py-1 text-[10px] font-black uppercase ${good ? 'bg-emerald-50 text-emerald-700' : bad ? 'bg-rose-50 text-rose-700' : value === 'executing' || value === 'submitted' ? 'bg-indigo-50 text-indigo-700' : 'bg-amber-50 text-amber-700'}`}>{pretty(value)}</span>; }
function Notice({ type, text, onClose }) { return <div className={`rounded-2xl border p-4 flex items-start justify-between gap-3 text-sm font-semibold ${type === 'success' ? 'border-emerald-200 bg-emerald-50 text-emerald-800' : 'border-rose-200 bg-rose-50 text-rose-800'}`}><span className="flex gap-2">{type === 'success' ? <CheckCircle2 className="w-4 h-4 mt-0.5" /> : <AlertTriangle className="w-4 h-4 mt-0.5" />}{text}</span><button onClick={onClose}><X className="w-4 h-4" /></button></div>; }
function Modal({ title, subtitle, onClose, children }) { return <div className="fixed inset-0 z-[90] bg-slate-950/60 p-4 flex items-center justify-center"><div className="w-full max-w-lg rounded-3xl bg-white shadow-2xl max-h-[92vh] overflow-y-auto"><div className="p-5 border-b border-slate-100 flex justify-between gap-4"><div><h2 className="font-black text-lg">{title}</h2><p className="text-xs text-slate-500 mt-1">{subtitle}</p></div><button onClick={onClose} className="p-2 rounded-xl hover:bg-slate-100"><X className="w-5 h-5" /></button></div><div className="p-5">{children}</div></div></div>; }
function Actions({ busy, onCancel, label }) { return <div className="flex justify-end gap-2 pt-2"><button type="button" disabled={busy} onClick={onCancel} className="rounded-xl px-4 py-2.5 text-sm font-bold text-slate-600">Cancel</button><button disabled={busy} className="inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-5 py-2.5 text-sm font-bold text-white disabled:opacity-50">{busy && <Loader2 className="w-4 h-4 animate-spin" />}{label}</button></div>; }
function Field({ label, value, onChange, required = false, placeholder = '' }) { return <label className="block"><span className="text-xs font-bold text-slate-600">{label}</span><input required={required} value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} className="mt-1 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm" /></label>; }
