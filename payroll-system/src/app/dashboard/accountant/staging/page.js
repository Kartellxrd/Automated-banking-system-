'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { AlertTriangle, CheckCircle2, FileCheck2, Loader2, RefreshCw, Send, Users } from 'lucide-react';
import AccNavbar from '@/components/accountant/AccNavbar';
import AccSideNav from '@/components/accountant/AccSideNav';

function money(value) {
  return `P${Number(value || 0).toLocaleString('en-BW', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

const STATUS = {
  draft: ['Draft', 'bg-slate-100 text-slate-700'],
  ready_for_ceo: ['Waiting for CEO', 'bg-indigo-50 text-indigo-700'],
  rejected_by_ceo: ['Returned by CEO', 'bg-rose-50 text-rose-700'],
  approved_by_ceo: ['CEO Approved', 'bg-emerald-50 text-emerald-700'],
  executing: ['Payment Running', 'bg-amber-50 text-amber-700'],
  paid: ['Paid', 'bg-emerald-50 text-emerald-700'],
  partial_failed: ['Partial Failure', 'bg-rose-50 text-rose-700'],
  failed: ['Failed', 'bg-rose-50 text-rose-700'],
};

export default function PayrollPreparationPage() {
  const router = useRouter();
  const [rosters, setRosters] = useState([]);
  const [batches, setBatches] = useState([]);
  const [selected, setSelected] = useState([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState('');
  const [siteFilter, setSiteFilter] = useState('all');

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const response = await fetch('/api/accountant/payroll', { cache: 'no-store' });
      const result = await response.json();
      if (!response.ok || !result.success) throw new Error(result.error || 'Could not load payroll data.');
      setRosters(result.rosters || []);
      setBatches(result.batches || []);
      setSelected((current) => current.filter((id) => (result.rosters || []).some((row) => row.id === id)));
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const sites = useMemo(() => {
    const map = new Map();
    rosters.forEach((roster) => { if (roster.site) map.set(roster.site.id, roster.site); });
    return [...map.values()];
  }, [rosters]);

  const visibleRosters = useMemo(() => siteFilter === 'all' ? rosters : rosters.filter((roster) => roster.site?.id === siteFilter), [rosters, siteFilter]);
  const selectedRosters = rosters.filter((roster) => selected.includes(roster.id));
  const selectionGross = selectedRosters.reduce((sum, roster) => sum + Number(roster.estimated_gross || 0), 0);

  function toggle(id) {
    setSelected((current) => current.includes(id) ? current.filter((value) => value !== id) : [...current, id]);
  }

  async function prepareBatch() {
    if (!selected.length) return;
    setCreating(true);
    setError('');
    try {
      const response = await fetch('/api/accountant/payroll', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ roster_ids: selected }),
      });
      const result = await response.json();
      if (!response.ok || !result.success) throw new Error(result.error || 'Could not prepare payroll batch.');
      router.push(`/dashboard/accountant/staging/${result.data.id}`);
    } catch (err) {
      setError(err.message);
    } finally {
      setCreating(false);
    }
  }

  return (
    <div className="min-h-screen bg-slate-100 flex flex-col lg:flex-row text-slate-900">
      <AccSideNav />
      <div className="flex-1 min-w-0">
        <AccNavbar title="Payroll Preparation" subtitle="Select HR-approved rosters, calculate payroll and prepare one CEO batch" />
        <main className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto space-y-6">
          <section className="rounded-3xl bg-slate-950 p-6 sm:p-8 text-white flex flex-col lg:flex-row lg:items-center justify-between gap-5">
            <div><p className="text-[11px] uppercase tracking-[0.18em] text-indigo-300 font-bold">Approved Attendance Only</p><h1 className="text-2xl sm:text-3xl font-black mt-1">Build Payroll Batch</h1><p className="text-sm text-slate-300 mt-2 max-w-2xl">Each selected roster can enter payroll only once. Pay is calculated from its HR-approved shift entries and the hourly-rate snapshot captured when attendance was recorded.</p></div>
            <button onClick={prepareBatch} disabled={!selected.length || creating} className="rounded-xl bg-indigo-600 px-5 py-3 text-sm font-bold disabled:opacity-40 inline-flex items-center justify-center gap-2 shrink-0">{creating ? <Loader2 className="w-4 h-4 animate-spin" /> : <FileCheck2 className="w-4 h-4" />}Prepare {selected.length || ''} Batch</button>
          </section>

          {error && <div className="rounded-2xl border border-rose-200 bg-rose-50 p-4 text-sm font-semibold text-rose-700 flex items-center gap-2"><AlertTriangle className="w-4 h-4" />{error}</div>}

          <section className="rounded-3xl border border-slate-200 bg-white p-4 shadow-sm flex flex-col sm:flex-row gap-3 sm:items-center justify-between">
            <div className="flex gap-3 items-center"><select value={siteFilter} onChange={(e) => setSiteFilter(e.target.value)} className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm font-semibold"><option value="all">All Sites</option>{sites.map((site) => <option key={site.id} value={site.id}>{site.site_name}</option>)}</select><button onClick={load} className="rounded-xl border border-slate-200 p-2.5 text-slate-600"><RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} /></button></div>
            <div className="text-right"><div className="text-xs text-slate-500 font-semibold">Selected estimated gross</div><div className="font-black text-lg">{money(selectionGross)}</div></div>
          </section>

          <section className="rounded-3xl border border-slate-200 bg-white shadow-sm overflow-hidden">
            <div className="p-5 border-b border-slate-100 flex items-center justify-between"><div><h2 className="font-black">Payroll-ready Rosters</h2><p className="text-xs text-slate-500 mt-1">Approved by HR and not yet included in another batch.</p></div><span className="text-xs font-bold text-slate-400">{visibleRosters.length} available</span></div>
            {loading ? <div className="p-14 flex items-center justify-center gap-2 text-sm text-slate-500"><Loader2 className="w-5 h-5 animate-spin text-indigo-600" />Loading approved rosters...</div> : !visibleRosters.length ? <div className="p-14 text-center text-sm text-slate-500">No HR-approved rosters are waiting for payroll.</div> : <div className="overflow-x-auto"><table className="w-full text-left"><thead className="bg-slate-50 text-[10px] uppercase tracking-wider text-slate-400"><tr><th className="px-5 py-3"></th><th className="px-5 py-3">Site / Date</th><th className="px-5 py-3">Workers</th><th className="px-5 py-3">Regular</th><th className="px-5 py-3">OT</th><th className="px-5 py-3">Estimated Gross</th><th className="px-5 py-3">Status</th></tr></thead><tbody className="divide-y divide-slate-100">{visibleRosters.map((roster) => <tr key={roster.id} className={selected.includes(roster.id) ? 'bg-indigo-50/60' : ''}><td className="px-5 py-4"><input type="checkbox" checked={selected.includes(roster.id)} onChange={() => toggle(roster.id)} className="w-4 h-4" /></td><td className="px-5 py-4"><div className="font-bold text-sm">{roster.site?.site_name || 'Unknown Site'}</div><div className="text-xs text-slate-500">{roster.shift_date}</div></td><td className="px-5 py-4 font-bold">{roster.workers}</td><td className="px-5 py-4">{roster.regular_hours.toFixed(2)}h</td><td className="px-5 py-4 text-amber-700 font-bold">{roster.overtime_hours.toFixed(2)}h</td><td className="px-5 py-4 font-black">{money(roster.estimated_gross)}</td><td className="px-5 py-4"><span className="rounded-full bg-emerald-50 px-2.5 py-1 text-[10px] font-bold text-emerald-700 inline-flex items-center gap-1"><CheckCircle2 className="w-3 h-3" />HR Approved</span></td></tr>)}</tbody></table></div>}
          </section>

          <section className="rounded-3xl border border-slate-200 bg-white shadow-sm overflow-hidden">
            <div className="p-5 border-b border-slate-100"><h2 className="font-black">Payroll Batches</h2><p className="text-xs text-slate-500 mt-1">Open a batch to inspect employee calculations and payout readiness.</p></div>
            {!batches.length ? <div className="p-12 text-center text-sm text-slate-500">No new payroll batches yet.</div> : <div className="divide-y divide-slate-100">{batches.map((batch) => { const status = STATUS[batch.status] || [batch.status, 'bg-slate-100']; return <button key={batch.id} onClick={() => router.push(`/dashboard/accountant/staging/${batch.id}`)} className="w-full p-4 text-left flex items-center justify-between gap-4 hover:bg-slate-50"><div className="flex items-center gap-3"><div className="rounded-xl bg-indigo-50 p-2.5 text-indigo-600"><Users className="w-4 h-4" /></div><div><div className="font-bold text-sm">{batch.batch_code}</div><div className="text-xs text-slate-500">{batch.pay_period?.period_name || 'Pay period'} • {batch.total_employees} employees</div></div></div><div className="text-right"><div className="font-black">{money(batch.net_total)}</div><span className={`rounded-full px-2.5 py-1 text-[10px] font-bold ${status[1]}`}>{status[0]}</span></div></button>; })}</div>}
          </section>

          <section className="rounded-3xl border border-amber-100 bg-amber-50 p-4 text-xs text-amber-900 flex items-start gap-2"><Send className="w-4 h-4 mt-0.5" /><p><strong>CEO handoff:</strong> Accountant can only submit a batch once every employee with pay due has verified payout details from HR. Missing bank/mobile-money profiles block submission instead of letting bad payment instructions through.</p></section>
        </main>
      </div>
    </div>
  );
}
