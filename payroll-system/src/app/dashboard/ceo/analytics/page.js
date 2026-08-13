'use client';

import { useState } from 'react';
import {
  Building2,
  TrendingUp,
  DollarSign,
  PieChart,
  Calendar,
  Download,
  Filter,
  ArrowUpRight,
  ArrowDownRight
} from 'lucide-react';
import CeoSideNav from '@/components/ceo/CeoSideNav';
import CeoNavbar from '@/components/ceo/CeoNavbar';

export default function CeoLaborAnalyticsPage() {
  const [timeframe, setTimeframe] = useState('august-2026');

  const expenditureBreakdown = [
    { category: 'Base Wages', amount: 284500.00, percentage: '66.3%', status: 'Within Budget' },
    { category: 'Overtime & Night Shifts', amount: 89400.00, percentage: '20.8%', status: 'Audited +2.4%' },
    { category: 'Site Allowances & Travel', amount: 36250.00, percentage: '8.5%', status: 'Standard' },
    { category: 'Statutory Contributions (BWP)', amount: 18800.00, percentage: '4.4%', status: 'Compliant' },
  ];

  const siteComparisons = [
    { site: 'Jwaneng Open Pit', budget: 180000.00, actual: 185400.00, variance: '+3.0%', status: 'OVER' },
    { site: 'Orapa Processing Plant', budget: 150000.00, actual: 142150.00, variance: '-5.2%', status: 'UNDER' },
    { site: 'Letlhakane Shaft Expansion', budget: 65000.00, actual: 62400.00, variance: '-4.0%', status: 'UNDER' },
    { site: 'Damtshaa Logistics Hub', budget: 40000.00, actual: 39000.00, variance: '-2.5%', status: 'UNDER' },
  ];

  return (
    <div className="flex flex-col lg:flex-row min-h-screen bg-slate-50">
      <CeoSideNav />

      <div className="flex-1 flex flex-col min-w-0">
        <CeoNavbar
          title="Labor Expenditure Analytics"
          subtitle="Reviews high-level spending totals and site-by-site labor expenditure metrics"
        />

        <main className="p-4 sm:p-6 lg:p-8 space-y-6 max-w-7xl w-full mx-auto">
          {/* Top Controls */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4 bg-white p-4 rounded-3xl border border-slate-200 shadow-xs">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-2xl bg-emerald-50 text-emerald-600 border border-emerald-100">
                <Building2 className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-sm font-extrabold text-slate-900">Total Labor Expenditure Analysis</h2>
                <p className="text-[11px] text-slate-500 font-medium">Reporting Cycle: August 2026</p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <select
                value={timeframe}
                onChange={(e) => setTimeframe(e.target.value)}
                className="px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-700 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
              >
                <option value="august-2026">August 2026</option>
                <option value="july-2026">July 2026</option>
                <option value="q3-2026">Q3 2026 Forecast</option>
              </select>
              <button className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white font-extrabold text-xs rounded-xl transition flex items-center gap-1.5 cursor-pointer">
                <Download className="w-3.5 h-3.5" /> Export Report
              </button>
            </div>
          </div>

          {/* Category Breakdown Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {expenditureBreakdown.map((item) => (
              <div key={item.category} className="bg-white border border-slate-200 p-6 rounded-3xl shadow-xs space-y-2">
                <div className="flex items-center justify-between text-slate-500">
                  <span className="text-xs font-extrabold uppercase tracking-wider">{item.category}</span>
                  <span className="text-xs font-bold text-slate-400">{item.percentage}</span>
                </div>
                <h3 className="text-2xl font-black text-slate-900">
                  BWP {item.amount.toLocaleString('en-BW', { minimumFractionDigits: 2 })}
                </h3>
                <span className="text-[11px] font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-md inline-block">
                  {item.status}
                </span>
              </div>
            ))}
          </div>

          {/* Site Expenditure Table */}
          <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-xs space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-base font-extrabold text-slate-900">Site-by-Site Budget vs Actual Expenditure</h3>
                <p className="text-xs text-slate-500">Monitored against operational labor caps</p>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-slate-100 text-[11px] font-black uppercase text-slate-400 tracking-wider">
                    <th className="py-3 px-4">Mining Site</th>
                    <th className="py-3 px-4">Allocated Budget</th>
                    <th className="py-3 px-4">Actual Outflow</th>
                    <th className="py-3 px-4">Variance</th>
                    <th className="py-3 px-4 text-right">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-xs font-medium text-slate-700">
                  {siteComparisons.map((row) => (
                    <tr key={row.site} className="hover:bg-slate-50/80 transition">
                      <td className="py-3.5 px-4 font-bold text-slate-900">{row.site}</td>
                      <td className="py-3.5 px-4 font-semibold text-slate-500">
                        BWP {row.budget.toLocaleString('en-BW', { minimumFractionDigits: 2 })}
                      </td>
                      <td className="py-3.5 px-4 font-black text-slate-900">
                        BWP {row.actual.toLocaleString('en-BW', { minimumFractionDigits: 2 })}
                      </td>
                      <td className="py-3.5 px-4 font-bold">
                        <span className={row.status === 'OVER' ? 'text-amber-600' : 'text-emerald-600'}>
                          {row.variance}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 text-right">
                        <span
                          className={`px-2.5 py-1 rounded-lg text-[10px] font-black uppercase tracking-wider ${
                            row.status === 'OVER'
                              ? 'bg-amber-50 text-amber-700 border border-amber-200'
                              : 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                          }`}
                        >
                          {row.status} BUDGET
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