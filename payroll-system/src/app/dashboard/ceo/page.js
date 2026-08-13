'use client';

import { useState } from 'react';
import {
  BarChart3,
  ShieldCheck,
  TrendingUp,
  Building,
  CheckCircle2,
  ArrowUpRight,
  DollarSign
} from 'lucide-react';
import Link from 'next/link';

import CeoNavbar from '@/components/ceo/CeoNavbar';
import CeoSideNav from '@/components/ceo/CeoSideNav';

export default function CeoOverviewPage() {
  const [metrics] = useState({
    totalLaborSpend: 428950.00,
    activeSites: 4,
    totalWorkers: 184,
    pendingAuthCount: 2,
    complianceFlags: 0,
  });

  const [siteExpenditures] = useState([
    { site: 'Jwaneng Open Pit Operation', code: 'JWN-01', laborSpend: 185400.00, workers: 72, variance: '+2.4%' },
    { site: 'Orapa Processing Plant', code: 'ORP-02', laborSpend: 142150.00, workers: 58, variance: '-1.1%' },
    { site: 'Letlhakane Shaft Expansion', code: 'LTK-03', laborSpend: 62400.00, workers: 32, variance: '+0.8%' },
    { site: 'Damtshaa Logistics Hub', code: 'DMT-04', laborSpend: 39000.00, workers: 22, variance: '0.0%' },
  ]);

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col lg:flex-row font-sans">
      {/* Sidebar Navigation */}
      <CeoSideNav />

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Top Navbar Header */}
        <CeoNavbar
          title="Executive Overview"
          subtitle="High-level spending totals, site labor expenditure, and strategic gate controls"
        />

        {/* Page Body Content */}
        <main className="p-4 sm:p-6 lg:p-8 space-y-6 max-w-7xl w-full mx-auto">
          {/* Executive Metric Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-white border border-slate-200 p-6 rounded-3xl shadow-xs">
              <div className="flex items-center justify-between text-slate-500 mb-2">
                <span className="text-xs font-extrabold uppercase tracking-wider">Total Labor Spend</span>
                <div className="p-2 rounded-xl bg-emerald-50 text-emerald-600 border border-emerald-100">
                  <DollarSign className="w-4 h-4" />
                </div>
              </div>
              <h3 className="text-2xl font-black text-slate-900">
                BWP {metrics.totalLaborSpend.toLocaleString('en-BW', { minimumFractionDigits: 2 })}
              </h3>
              <span className="text-[11px] text-emerald-600 font-bold mt-2 inline-flex items-center gap-1">
                <TrendingUp className="w-3.5 h-3.5" /> Within budgeted threshold
              </span>
            </div>

            <div className="bg-white border border-slate-200 p-6 rounded-3xl shadow-xs">
              <div className="flex items-center justify-between text-slate-500 mb-2">
                <span className="text-xs font-extrabold uppercase tracking-wider">Pending Batch Auth</span>
                <div className="p-2 rounded-xl bg-amber-50 text-amber-600 border border-amber-100">
                  <ShieldCheck className="w-4 h-4" />
                </div>
              </div>
              <h3 className="text-2xl font-black text-amber-600">{metrics.pendingAuthCount} Batches</h3>
              <p className="text-[11px] text-slate-500 font-medium mt-2">Awaiting final executive release</p>
            </div>

            <div className="bg-white border border-slate-200 p-6 rounded-3xl shadow-xs">
              <div className="flex items-center justify-between text-slate-500 mb-2">
                <span className="text-xs font-extrabold uppercase tracking-wider">Active Operations</span>
                <div className="p-2 rounded-xl bg-indigo-50 text-indigo-600 border border-indigo-100">
                  <Building className="w-4 h-4" />
                </div>
              </div>
              <h3 className="text-2xl font-black text-slate-900">{metrics.activeSites} Sites</h3>
              <p className="text-[11px] text-slate-500 font-medium mt-2">{metrics.totalWorkers} Active Personnel</p>
            </div>

            <div className="bg-white border border-slate-200 p-6 rounded-3xl shadow-xs">
              <div className="flex items-center justify-between text-slate-500 mb-2">
                <span className="text-xs font-extrabold uppercase tracking-wider">Compliance Status</span>
                <div className="p-2 rounded-xl bg-emerald-50 text-emerald-600 border border-emerald-100">
                  <CheckCircle2 className="w-4 h-4" />
                </div>
              </div>
              <h3 className="text-2xl font-black text-emerald-600">{metrics.complianceFlags} Flags</h3>
              <p className="text-[11px] text-emerald-700 font-bold mt-2">Audited & Verified</p>
            </div>
          </div>

          {/* Strategic Action Callout */}
          <div className="bg-slate-900 text-white p-6 sm:p-8 rounded-3xl shadow-md flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
            <div className="space-y-2">
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/10 text-emerald-400 text-xs font-extrabold uppercase tracking-wider border border-emerald-500/20">
                <ShieldCheck className="w-4 h-4" /> Strategic Gate Active
              </span>
              <h2 className="text-xl font-black tracking-tight">{metrics.pendingAuthCount} Payroll Batches Staged for Final Release</h2>
              <p className="text-xs text-slate-300 max-w-xl">
                Cross-check labor variance and issue dual-key verification before executing payout transfers.
              </p>
            </div>

            <Link
              href="/dashboard/ceo/review"
              className="px-6 py-3.5 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-extrabold text-xs rounded-2xl transition shadow-lg shadow-emerald-500/20 flex items-center gap-2 shrink-0"
            >
              Go to Batch Authorization <ArrowUpRight className="w-4 h-4" />
            </Link>
          </div>

          {/* Site Expenditure Table */}
          <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-xs space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-base font-extrabold text-slate-900">Site-by-Site Labor Expenditure</h3>
                <p className="text-xs text-slate-500">Breakdown of mining operations and active payroll cost allocations</p>
              </div>
              <BarChart3 className="w-5 h-5 text-slate-400" />
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-slate-100 text-[11px] font-black uppercase text-slate-400 tracking-wider">
                    <th className="py-3 px-4">Site Name</th>
                    <th className="py-3 px-4">Site Code</th>
                    <th className="py-3 px-4">Headcount</th>
                    <th className="py-3 px-4">Expenditure (BWP)</th>
                    <th className="py-3 px-4 text-right">Variance vs Budget</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-xs font-medium text-slate-700">
                  {siteExpenditures.map((site) => (
                    <tr key={site.code} className="hover:bg-slate-50/80 transition">
                      <td className="py-3.5 px-4 font-bold text-slate-900">{site.site}</td>
                      <td className="py-3.5 px-4 font-mono text-slate-500">{site.code}</td>
                      <td className="py-3.5 px-4 font-semibold">{site.workers} Personnel</td>
                      <td className="py-3.5 px-4 font-black text-slate-900">
                        BWP {site.laborSpend.toLocaleString('en-BW', { minimumFractionDigits: 2 })}
                      </td>
                      <td className="py-3.5 px-4 text-right">
                        <span
                          className={`inline-block px-2.5 py-1 rounded-lg text-[11px] font-bold ${
                            site.variance.startsWith('+')
                              ? 'bg-amber-50 text-amber-700 border border-amber-200'
                              : 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                          }`}
                        >
                          {site.variance}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}