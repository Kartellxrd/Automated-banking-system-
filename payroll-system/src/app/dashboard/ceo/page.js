'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import {
  Building2,
  Users,
  ShieldCheck,
  ReceiptText,
  WalletCards,
  ArrowUpRight,
  Loader2,
  AlertCircle,
} from 'lucide-react';
import CeoNavbar from '@/components/ceo/CeoNavbar';
import CeoSideNav from '@/components/ceo/CeoSideNav';

const money = (value) => `BWP ${Number(value || 0).toLocaleString('en-BW', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

export default function CeoOverviewPage() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const response = await fetch('/api/ceo/dashboard', { cache: 'no-store' });
        const json = await response.json();
        if (!response.ok || !json.success) throw new Error(json.error || 'Failed to load dashboard.');
        if (active) setData(json.data);
      } catch (err) {
        if (active) setError(err.message || 'Failed to load dashboard.');
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => { active = false; };
  }, []);

  const metrics = data?.metrics;

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col lg:flex-row">
      <CeoSideNav />
      <div className="flex-1 min-w-0">
        <CeoNavbar title="Executive Overview" subtitle="Live CEO approvals, payment readiness, workforce and site totals" />

        <main className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto space-y-6">
          {loading && (
            <div className="min-h-[320px] flex items-center justify-center text-slate-500 gap-2 text-sm font-semibold">
              <Loader2 className="w-5 h-5 animate-spin" /> Loading live executive data...
            </div>
          )}

          {!loading && error && (
            <div className="bg-rose-50 border border-rose-200 text-rose-700 rounded-2xl p-4 flex items-start gap-3">
              <AlertCircle className="w-5 h-5 mt-0.5" />
              <div><p className="font-bold">Could not load CEO dashboard</p><p className="text-sm mt-1">{error}</p></div>
            </div>
          )}

          {!loading && !error && metrics && (
            <>
              <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
                <MetricCard icon={Building2} label="Active Sites" value={metrics.active_sites} helper={`${metrics.active_employees} active employees`} />
                <MetricCard icon={ShieldCheck} label="Payroll Awaiting Review" value={metrics.payroll_awaiting_review} helper="Accountant-submitted batches" />
                <MetricCard icon={ReceiptText} label="Expenses Awaiting Review" value={metrics.expenses_awaiting_review} helper="Accountant-reviewed requests" />
                <MetricCard icon={WalletCards} label="Approved Outflows" value={metrics.payroll_ready_to_pay + metrics.expenses_ready_to_pay} helper={`${money(metrics.payroll_ready_to_pay_total + metrics.expenses_ready_to_pay_total)} waiting for payment`} />
              </div>

              <div className="grid grid-cols-1 xl:grid-cols-2 gap-5">
                <ActionPanel
                  title="Payroll Approval"
                  description="Review payroll batches prepared from HR-approved rosters before they can enter payment execution."
                  count={metrics.payroll_awaiting_review}
                  href="/dashboard/ceo/review"
                  button="Review Payroll"
                />
                <ActionPanel
                  title="Expense Approval"
                  description="Review site expense requests that the Accountant has checked and recommended for CEO approval."
                  count={metrics.expenses_awaiting_review}
                  href="/dashboard/ceo/expenses"
                  button="Review Expenses"
                />
              </div>

              <div className="bg-slate-900 text-white rounded-3xl p-6 sm:p-8 flex flex-col md:flex-row md:items-center justify-between gap-5">
                <div>
                  <p className="text-xs font-black uppercase tracking-widest text-emerald-400">Payment Center</p>
                  <h2 className="text-xl font-black mt-2">{money(metrics.payroll_ready_to_pay_total + metrics.expenses_ready_to_pay_total)} approved and waiting</h2>
                  <p className="text-sm text-slate-300 mt-2 max-w-2xl">
                    Payroll and approved expenses are separated into payment-ready queues. Live execution stays disabled until a verified corporate payout rail is connected.
                  </p>
                </div>
                <Link href="/dashboard/ceo/payments" className="inline-flex items-center justify-center gap-2 px-5 py-3 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black text-sm shrink-0">
                  Open Payment Center <ArrowUpRight className="w-4 h-4" />
                </Link>
              </div>

              <div className="grid grid-cols-1 xl:grid-cols-2 gap-5">
                <RecentTable title="Recent Payroll" empty="No payroll has reached the CEO yet." rows={(data.recent_payroll || []).map((row) => ({
                  id: row.batch_code,
                  status: row.status,
                  amount: row.net_total,
                }))} />
                <RecentTable title="Recent Expenses" empty="No expense requests have reached the CEO yet." rows={(data.recent_expenses || []).map((row) => ({
                  id: row.request_code,
                  status: row.status,
                  amount: row.approved_amount ?? row.accountant_recommended_amount ?? row.requested_amount,
                }))} />
              </div>
            </>
          )}
        </main>
      </div>
    </div>
  );
}

function MetricCard({ icon: Icon, label, value, helper }) {
  return (
    <div className="bg-white border border-slate-200 rounded-3xl p-5 shadow-xs">
      <div className="flex items-center justify-between gap-3">
        <span className="text-[11px] font-black uppercase tracking-wider text-slate-400">{label}</span>
        <div className="p-2 rounded-xl bg-emerald-50 text-emerald-600 border border-emerald-100"><Icon className="w-4 h-4" /></div>
      </div>
      <p className="text-3xl font-black text-slate-900 mt-3">{value}</p>
      <p className="text-xs text-slate-500 mt-2 font-medium">{helper}</p>
    </div>
  );
}

function ActionPanel({ title, description, count, href, button }) {
  return (
    <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-xs">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h3 className="text-base font-black text-slate-900">{title}</h3>
          <p className="text-sm text-slate-500 mt-2">{description}</p>
        </div>
        <span className="min-w-10 h-10 px-3 rounded-2xl bg-amber-50 text-amber-700 border border-amber-200 flex items-center justify-center font-black">{count}</span>
      </div>
      <Link href={href} className="mt-5 inline-flex items-center gap-2 text-sm font-black text-emerald-700 hover:text-emerald-600">{button} <ArrowUpRight className="w-4 h-4" /></Link>
    </div>
  );
}

function RecentTable({ title, rows, empty }) {
  return (
    <div className="bg-white border border-slate-200 rounded-3xl p-5 shadow-xs">
      <h3 className="font-black text-slate-900">{title}</h3>
      {!rows.length ? <p className="text-sm text-slate-500 mt-4">{empty}</p> : (
        <div className="mt-4 divide-y divide-slate-100">
          {rows.map((row) => (
            <div key={row.id} className="py-3 flex items-center justify-between gap-3">
              <div><p className="text-sm font-bold text-slate-800">{row.id}</p><p className="text-[11px] text-slate-500 mt-0.5">{String(row.status).replaceAll('_', ' ')}</p></div>
              <span className="text-sm font-black text-slate-900">{money(row.amount)}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
