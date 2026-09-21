'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import {
  AlertTriangle,
  CheckCircle2,
  ChevronRight,
  Download,
  Landmark,
  Loader2,
  PlayCircle,
  RefreshCw,
  RotateCcw,
  Search,
  Send,
  TestTube2,
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
  const [workflow, setWorkflow] = useState({});
  const [setup, setSetup] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('open');
  const [selected, setSelected] = useState(null);
  const [startOpen, setStartOpen] = useState(false);
  const [itemAction, setItemAction] = useState(null);
  const [saving, setSaving] = useState(false);
  const [startForm, setStartForm] = useState({ source_account_id: '', notes: '' });
  const [itemForm, setItemForm] = useState({ execution_method_id: '', reference: '', error: '' });

  const load = useCallback(async (silent = false) => {
    if (silent) setRefreshing(true); else setLoading(true);
    setError('');
    try {
      const [paymentsResponse, setupResponse] = await Promise.all([
        fetch('/api/accountant/payments', { cache: 'no-store' }),
        fetch('/api/accountant/payment-setup', { cache: 'no-store' }),
      ]);
      const [paymentsJson, setupJson] = await Promise.all([paymentsResponse.json(), setupResponse.json()]);
      if (!paymentsResponse.ok || !paymentsJson.success) throw new Error(paymentsJson.error || 'Could not load payment processing queue.');
      if (!setupResponse.ok || !setupJson.success) throw new Error(setupJson.error || 'Could not load payment setup.');

      setRuns(paymentsJson.data || []);
      setAccounts(paymentsJson.accounts || []);
      setMethods(paymentsJson.methods || []);
      setSummary(paymentsJson.summary || {});
      setWorkflow(paymentsJson.workflow || {});
      setSetup(setupJson.data || null);
      setSelected((current) => current ? (paymentsJson.data || []).find((row) => row.id === current.id) || null : null);
    } catch (err) {
      setError(err.message || 'Could not load payment processing queue.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    const openStatuses = new Set(['prepared', 'executing', 'partial_failed', 'failed']);
    return runs.filter((run) => {
      const matchesSearch = !q || [run.run_code, run.batch?.batch_code, run.batch?.pay_period?.period_name].some((value) => String(value || '').toLowerCase().includes(q));
      const matchesStatus = statusFilter === 'all' ? true : statusFilter === 'open' ? openStatuses.has(run.status) : run.status === statusFilter;
      return matchesSearch && matchesStatus;
    });
  }, [runs, search, statusFilter]);

  const activeAccounts = accounts.filter((row) => row.is_active !== false);
  const activeSource = activeAccounts[0] || null;
  const testMode = (setup?.environment?.mode || workflow?.environment?.mode || 'test') !== 'production';
  const officialTemplateReady = Boolean(setup?.readiness?.official_fnb_file_template_installed);
  const settlementEnabled = Boolean(workflow?.settlement_recording_enabled) && !testMode;

  function openStart(run) {
    setSelected(run);
    setStartForm({ source_account_id: run.source_payment_account_id || activeSource?.id || '', notes: run.execution_notes || '' });
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
      if (!response.ok || !json.success) throw new Error(json.error || 'Could not start payment processing.');
      setSuccess(`${selected.run_code} is open for Finance processing. Export the locked instruction file when ready.`);
      setStartOpen(false);
      await load(true);
    } catch (err) {
      setError(err.message || 'Could not start payment processing.');
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
      if (!response.ok || !json.success) throw new Error(json.error || 'Could not update payment result.');
      setSuccess(`${item.payee_name_snapshot || 'Payment'} is now ${json.data.status}.`);
      setItemAction(null);
      await load(true);
    } catch (err) {
      setError(err.message || 'Could not update payment result.');
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
      setSuccess(`${itemAction.item.payee_name_snapshot || 'Payment'} returned to the processing queue.`);
      setItemAction(null);
      await load(true);
    } catch (err) {
      setError(err.message || 'Could not retry payment item.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col lg:flex-row text-slate-900 font-sans">
      <AccSideNav />
      <div className="flex-1 min-w-0">
        <AccNavbar title="Payment Processing" subtitle="Process CEO-released payroll and expenses through the approved company payment source" />
        <main className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto space-y-6 overflow-x-hidden">
          {error && <Notice type="error" text={error} onClose={() => setError('')} />}
          {success && <Notice type="success" text={success} onClose={() => setSuccess('')} />}

          {!loading && (
            <section className={`rounded-2xl border p-5 ${testMode ? 'border-amber-200 bg-amber-50' : 'border-emerald-200 bg-emerald-50'}`}>
              <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                <div className="flex items-start gap-3 min-w-0">
                  <div className={`rounded-xl p-2.5 shrink-0 ${testMode ? 'bg-amber-100 text-amber-700' : 'bg-emerald-100 text-emerald-700'}`}>
                    {testMode ? <TestTube2 className="w-5 h-5" /> : <CheckCircle2 className="w-5 h-5" />}
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-slate-900">{testMode ? 'FNB payment testing' : 'Live payment processing'}</p>
                    <p className="text-sm text-slate-600 mt-1">{testMode ? 'You can prepare and export CEO-released runs. Settlement controls are disabled so a demo cannot mark real payroll as paid.' : 'Record bank results only after the real FNB or approved payment process confirms settlement.'}</p>
                  </div>
                </div>
                <div className="w-full lg:w-auto rounded-xl border border-white/80 bg-white/80 px-4 py-3">
                  <p className="text-xs text-slate-500">Active company source</p>
                  {activeSource ? <p className="mt-1 text-sm font-semibold text-slate-900 flex items-center gap-2"><Landmark className="w-4 h-4 text-indigo-600 shrink-0" /><span className="truncate">{activeSource.account_name} · {activeSource.institution_name}{activeSource.account_identifier_label ? ` · ${activeSource.account_identifier_label}` : ''}</span></p> : <Link href="/dashboard/accountant/payment-setup" className="mt-1 text-sm font-semibold text-rose-700 inline-flex items-center gap-1">Configure payment source <ChevronRight className="w-4 h-4" /></Link>}
                </div>
              </div>
            </section>
          )}

          <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
              <div>
                <h2 className="text-base font-semibold text-slate-900">Finance payment flow</h2>
                <p className="text-sm text-slate-500 mt-1">Payment Setup is configuration. This page is only for actual CEO-released payment runs.</p>
              </div>
              <Link href="/dashboard/accountant/payment-setup" className="w-full lg:w-auto rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 inline-flex items-center justify-center gap-2 hover:bg-slate-50"><Landmark className="w-4 h-4" />Payment Setup</Link>
            </div>
            <div className="mt-5 grid grid-cols-1 md:grid-cols-4 gap-3">
              <FlowStep number="1" title="CEO releases" text="Only authorized runs enter Finance." />
              <FlowStep number="2" title="Start processing" text="Select the active company source." />
              <FlowStep number="3" title="Export instructions" text={officialTemplateReady ? 'Generate the approved bank file.' : 'Use the generic locked CSV until FNB gives the official template.'} />
              <FlowStep number="4" title="Reconcile" text="Record paid or failed only from real bank results." />
            </div>
          </section>

          <section className="grid grid-cols-2 xl:grid-cols-5 gap-3 sm:gap-4">
            <Metric label="Awaiting Finance" value={summary.awaiting_start || 0} />
            <Metric label="Processing" value={summary.executing || 0} />
            <Metric label="Partial Failed" value={summary.partial_failed || 0} warn />
            <Metric label="Completed" value={summary.completed || 0} />
            <Metric label="Open Value" value={money(summary.pending_amount || 0)} />
          </section>

          <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm flex flex-col xl:flex-row xl:items-center justify-between gap-3">
            <div className="flex flex-col md:flex-row gap-3 flex-1">
              <div className="relative flex-1 max-w-md">
                <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search run, batch or pay period..." className="w-full rounded-xl border border-slate-200 bg-slate-50 pl-10 pr-3 py-2.5 text-sm outline-none focus:border-indigo-400" />
              </div>
              <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm font-medium outline-none focus:border-indigo-400">
                <option value="open">Open payments</option>
                <option value="prepared">Awaiting Finance</option>
                <option value="executing">Processing</option>
                <option value="partial_failed">Partial failed</option>
                <option value="failed">Failed</option>
                <option value="completed">Completed</option>
                <option value="all">All</option>
              </select>
            </div>
            <button onClick={() => load(true)} disabled={refreshing} className="w-full xl:w-auto rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold inline-flex items-center justify-center gap-2 hover:bg-slate-50 disabled:opacity-50"><RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />Refresh</button>
          </section>

          <section className="space-y-4">
            {loading ? <div className="p-16 text-center text-slate-500"><Loader2 className="w-6 h-6 animate-spin mx-auto mb-2" />Loading released payments...</div> : filtered.length === 0 ? <div className="rounded-2xl border border-slate-200 bg-white p-12 text-center text-sm text-slate-500">No payment runs match the current filter.</div> : filtered.map((run) => (
              <div key={run.id} className="rounded-2xl border border-slate-200 bg-white p-5 sm:p-6 shadow-sm space-y-5">
                <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-5">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <h2 className="text-lg font-semibold text-slate-900">{run.run_code}</h2>
                      <Status value={run.status} />
                      <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-500">{run.run_type}</span>
                    </div>
                    <p className="text-sm text-slate-500 mt-2">{run.batch?.batch_code || (run.run_type === 'expense' ? 'Expense payment' : 'Payroll batch')} · {run.batch?.pay_period?.period_name || (run.run_type === 'expense' ? 'CEO released' : 'Pay period unavailable')}</p>
                    <p className="text-xs text-slate-400 mt-1">CEO released {run.authorized_at ? new Date(run.authorized_at).toLocaleString('en-BW') : '—'}{run.source_payment_account_id ? ' · Finance source selected' : ''}</p>
                  </div>
                  <div className="w-full xl:w-auto flex flex-col sm:flex-row sm:items-center gap-2">
                    <div className="sm:mr-2 sm:text-right">
                      <p className="text-xs text-slate-500">Payment total</p>
                      <p className="text-xl font-semibold text-slate-900">{money(run.total_amount)}</p>
                    </div>
                    <button onClick={() => setSelected(run)} className="w-full sm:w-auto rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50">View recipients</button>
                    {run.status === 'prepared' && <button onClick={() => openStart(run)} disabled={!activeAccounts.length} className="w-full sm:w-auto rounded-xl bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white disabled:bg-slate-300 inline-flex items-center justify-center gap-2"><PlayCircle className="w-4 h-4" />Start FNB processing</button>}
                    {run.source_payment_account_id && <a href={`/api/accountant/payments/export?run_id=${encodeURIComponent(run.id)}`} className="w-full sm:w-auto rounded-xl bg-emerald-600 px-4 py-2.5 text-sm font-semibold text-white inline-flex items-center justify-center gap-2"><Download className="w-4 h-4" />Export instructions</a>}
                  </div>
                </div>

                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  <Mini label="Queued" value={run.progress.queued} />
                  <Mini label="Submitted" value={run.progress.submitted} />
                  <Mini label="Paid" value={run.progress.paid} good />
                  <Mini label="Failed" value={run.progress.failed} danger={run.progress.failed > 0} />
                </div>

                {run.status === 'prepared' && !activeAccounts.length && <div className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800">No active company payment source is configured. <Link href="/dashboard/accountant/payment-setup" className="font-semibold underline underline-offset-2">Open Payment Setup</Link>.</div>}
                {run.source_payment_account_id && !officialTemplateReady && <div className="rounded-xl border border-slate-200 bg-slate-50 p-3 text-xs text-slate-600">The current export is a locked generic payment-instruction CSV for testing and controlled manual processing. It is not being presented as the official FNB upload format.</div>}
              </div>
            ))}
          </section>
        </main>
      </div>

      {selected && <div className="fixed inset-0 z-50 bg-slate-950/60 p-3 sm:p-4 overflow-y-auto font-sans"><div className="max-w-6xl mx-auto my-4 rounded-2xl bg-white shadow-2xl overflow-hidden"><div className="p-5 border-b border-slate-100 flex justify-between gap-4"><div className="min-w-0"><p className="text-xs font-medium text-indigo-600">Payment run</p><h2 className="text-xl font-semibold text-slate-900 mt-1">{selected.run_code}</h2><p className="text-sm text-slate-500 mt-1">{selected.batch?.batch_code || selected.run_type} · {money(selected.total_amount)}</p></div><button onClick={() => setSelected(null)} className="p-2 rounded-xl hover:bg-slate-100 shrink-0"><X className="w-5 h-5" /></button></div>
        {testMode && <div className="mx-5 mt-5 rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800">TEST mode: recipient settlement buttons are disabled. This prevents a demonstration from marking real payroll or expenses as paid.</div>}
        <div className="p-5 overflow-x-auto"><table className="w-full min-w-[980px] text-sm"><thead className="bg-slate-50 text-xs text-slate-500"><tr><th className="px-4 py-3 text-left font-medium">Payee</th><th className="px-4 py-3 text-left font-medium">Destination</th><th className="px-4 py-3 text-left font-medium">Amount</th><th className="px-4 py-3 text-left font-medium">Status</th><th className="px-4 py-3 text-left font-medium">Reference / Error</th><th className="px-4 py-3 text-right font-medium">Reconciliation</th></tr></thead><tbody className="divide-y divide-slate-100">{selected.items.map((item) => <tr key={item.id}><td className="px-4 py-4"><div className="font-medium text-slate-900">{item.payee_name_snapshot}</div><div className="text-xs text-slate-400 mt-0.5">{item.payout_provider_name_snapshot || 'Provider not labelled'}</div></td><td className="px-4 py-4"><div className="font-mono text-xs">{item.destination_masked || '—'}</div><div className="text-xs text-slate-400 mt-0.5">Branch {item.branch_code_snapshot || '—'}</div></td><td className="px-4 py-4 font-semibold">{money(item.amount)}</td><td className="px-4 py-4"><Status value={item.status} /></td><td className="px-4 py-4"><div className="text-xs font-medium">{item.payment_reference || '—'}</div>{item.payment_error && <div className="text-xs text-rose-600 mt-1">{item.payment_error}</div>}</td><td className="px-4 py-4 text-right">{settlementEnabled ? <div className="inline-flex flex-wrap justify-end gap-1.5">{['queued','failed'].includes(item.status) && selected.status === 'executing' && <button onClick={() => beginItemAction(item, 'submitted')} className="rounded-lg bg-indigo-50 px-2.5 py-2 text-xs font-medium text-indigo-700"><Send className="w-3.5 h-3.5 inline mr-1" />Submitted</button>}{['queued','submitted','failed'].includes(item.status) && selected.status === 'executing' && <button onClick={() => beginItemAction(item, 'paid')} className="rounded-lg bg-emerald-50 px-2.5 py-2 text-xs font-medium text-emerald-700"><CheckCircle2 className="w-3.5 h-3.5 inline mr-1" />Paid</button>}{['queued','submitted'].includes(item.status) && selected.status === 'executing' && <button onClick={() => beginItemAction(item, 'failed')} className="rounded-lg bg-rose-50 px-2.5 py-2 text-xs font-medium text-rose-700"><XCircle className="w-3.5 h-3.5 inline mr-1" />Failed</button>}{item.status === 'failed' && ['partial_failed','failed','executing'].includes(selected.status) && <button onClick={() => beginItemAction(item, 'retry')} className="rounded-lg bg-amber-50 px-2.5 py-2 text-xs font-medium text-amber-700"><RotateCcw className="w-3.5 h-3.5 inline mr-1" />Retry</button>}</div> : <span className="text-xs text-slate-400">Disabled in test mode</span>}</td></tr>)}</tbody></table></div></div></div>}

      {startOpen && selected && <Modal title="Start Finance Processing" subtitle={`${selected.run_code} · ${money(selected.total_amount)}`} onClose={() => !saving && setStartOpen(false)}><form onSubmit={startRun} className="space-y-4"><label className="block"><span className="text-sm font-medium text-slate-700">Company payment source *</span><select required value={startForm.source_account_id} onChange={(e) => setStartForm({ ...startForm, source_account_id: e.target.value })} className="mt-1.5 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm outline-none focus:border-indigo-400"><option value="">Select payment source</option>{activeAccounts.map((row) => <option key={row.id} value={row.id}>{row.account_name} — {row.institution_name}{row.account_identifier_label ? ` (${row.account_identifier_label})` : ''}</option>)}</select></label><label className="block"><span className="text-sm font-medium text-slate-700">Processing notes</span><textarea value={startForm.notes} onChange={(e) => setStartForm({ ...startForm, notes: e.target.value })} rows={3} className="mt-1.5 w-full rounded-xl border border-slate-200 bg-slate-50 p-3 text-sm outline-none focus:border-indigo-400" placeholder="Optional notes for this payment run" /></label><div className="rounded-xl border border-slate-200 bg-slate-50 p-3 text-sm text-slate-600">This opens the CEO-released run for Finance and locks in the selected company source. It does not mark any recipient as paid.</div><Actions busy={saving} onCancel={() => setStartOpen(false)} label="Start Processing" /></form></Modal>}

      {itemAction && <Modal title={itemAction.action === 'retry' ? 'Retry Failed Payment' : itemAction.action === 'submitted' ? 'Record Bank Submission' : itemAction.action === 'paid' ? 'Confirm Settled Payment' : 'Record Failed Payment'} subtitle={`${itemAction.item.payee_name_snapshot} · ${money(itemAction.item.amount)}`} onClose={() => !saving && setItemAction(null)}><form onSubmit={itemAction.action === 'retry' ? (e) => { e.preventDefault(); retryItem(); } : saveItemAction} className="space-y-4">{itemAction.action !== 'retry' && <><label className="block"><span className="text-sm font-medium text-slate-700">Payment method *</span><select required value={itemForm.execution_method_id} onChange={(e) => setItemForm({ ...itemForm, execution_method_id: e.target.value })} className="mt-1.5 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm"><option value="">Select method</option>{methods.map((method) => <option key={method.id} value={method.id}>{method.name}</option>)}</select></label>{itemAction.action !== 'failed' && <Field required label="Bank / transaction reference *" value={itemForm.reference} onChange={(value) => setItemForm({ ...itemForm, reference: value })} placeholder="Reference from the bank or approved payment channel" />}{itemAction.action === 'failed' && <><Field label="Reference (if one exists)" value={itemForm.reference} onChange={(value) => setItemForm({ ...itemForm, reference: value })} /><label className="block"><span className="text-sm font-medium text-slate-700">Failure reason *</span><textarea required value={itemForm.error} onChange={(e) => setItemForm({ ...itemForm, error: e.target.value })} rows={3} className="mt-1.5 w-full rounded-xl border border-slate-200 bg-slate-50 p-3 text-sm" /></label></>}</>}{itemAction.action === 'retry' && <div className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">Only this failed instruction returns to the queue. Already-paid recipients are not included again.</div>}<Actions busy={saving} onCancel={() => setItemAction(null)} label={itemAction.action === 'retry' ? 'Queue Retry' : 'Save Result'} /></form></Modal>}
    </div>
  );
}

function FlowStep({ number, title, text }) { return <div className="rounded-xl border border-slate-200 bg-slate-50 p-4"><div className="flex items-center gap-2"><span className="w-6 h-6 rounded-full bg-indigo-600 text-white text-xs font-semibold flex items-center justify-center">{number}</span><p className="text-sm font-semibold text-slate-900">{title}</p></div><p className="text-xs text-slate-500 mt-2 leading-relaxed">{text}</p></div>; }
function Metric({ label, value, warn = false }) { return <div className="rounded-2xl border border-slate-200 bg-white p-4 sm:p-5 shadow-sm min-w-0"><div className="text-xs text-slate-500">{label}</div><div className={`text-xl sm:text-2xl font-semibold mt-1 break-words ${warn ? 'text-rose-700' : 'text-slate-900'}`}>{value}</div></div>; }
function Mini({ label, value, good = false, danger = false }) { return <div className={`rounded-xl border p-3 min-w-0 ${danger ? 'border-rose-200 bg-rose-50' : good ? 'border-emerald-200 bg-emerald-50' : 'border-slate-200 bg-slate-50'}`}><div className="text-xs text-slate-500">{label}</div><div className={`font-semibold mt-1 break-words ${good ? 'text-emerald-800' : danger ? 'text-rose-700' : 'text-slate-900'}`}>{value}</div></div>; }
function Status({ value }) { const good = ['completed','paid'].includes(value); const bad = ['failed','partial_failed'].includes(value); const label = value === 'prepared' ? 'awaiting finance' : value === 'executing' ? 'processing' : pretty(value); return <span className={`rounded-full px-2.5 py-1 text-xs font-medium ${good ? 'bg-emerald-50 text-emerald-700' : bad ? 'bg-rose-50 text-rose-700' : value === 'executing' || value === 'submitted' ? 'bg-indigo-50 text-indigo-700' : 'bg-amber-50 text-amber-700'}`}>{label}</span>; }
function Notice({ type, text, onClose }) { return <div className={`rounded-xl border p-4 flex items-start justify-between gap-3 text-sm ${type === 'success' ? 'border-emerald-200 bg-emerald-50 text-emerald-800' : 'border-rose-200 bg-rose-50 text-rose-800'}`}><span className="flex gap-2 min-w-0">{type === 'success' ? <CheckCircle2 className="w-4 h-4 mt-0.5 shrink-0" /> : <AlertTriangle className="w-4 h-4 mt-0.5 shrink-0" />}<span className="break-words">{text}</span></span><button onClick={onClose} className="shrink-0"><X className="w-4 h-4" /></button></div>; }
function Modal({ title, subtitle, onClose, children }) { return <div className="fixed inset-0 z-[90] bg-slate-950/60 p-3 sm:p-4 flex items-center justify-center font-sans"><div className="w-full max-w-lg max-h-[92vh] rounded-2xl bg-white shadow-2xl overflow-hidden flex flex-col"><div className="p-5 border-b border-slate-100 flex justify-between gap-4 shrink-0"><div className="min-w-0"><h2 className="font-semibold text-lg text-slate-900">{title}</h2><p className="text-sm text-slate-500 mt-1 break-words">{subtitle}</p></div><button onClick={onClose} className="p-2 rounded-xl hover:bg-slate-100 shrink-0"><X className="w-5 h-5" /></button></div><div className="p-5 overflow-y-auto">{children}</div></div></div>; }
function Actions({ busy, onCancel, label }) { return <div className="flex flex-col-reverse sm:flex-row sm:justify-end gap-2 pt-2"><button type="button" disabled={busy} onClick={onCancel} className="w-full sm:w-auto rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-medium text-slate-600">Cancel</button><button disabled={busy} className="w-full sm:w-auto inline-flex items-center justify-center gap-2 rounded-xl bg-indigo-600 px-5 py-2.5 text-sm font-semibold text-white disabled:opacity-50">{busy && <Loader2 className="w-4 h-4 animate-spin" />}{label}</button></div>; }
function Field({ label, value, onChange, required = false, placeholder = '' }) { return <label className="block"><span className="text-sm font-medium text-slate-700">{label}</span><input required={required} value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} className="mt-1.5 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm" /></label>; }
