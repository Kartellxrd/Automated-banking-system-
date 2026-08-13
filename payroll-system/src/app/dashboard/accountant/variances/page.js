'use client';

import { useState } from 'react';
import {
  TrendingUp,
  AlertTriangle,
  Clock,
  CheckCircle2,
  XCircle,
  Search,
  Filter,
  DollarSign,
  UserCheck,
  Building2
} from 'lucide-react';
import AccNavbar from '../AccNavbar';

export default function VariancesPage() {
  const [searchQuery, setSearchQuery] = useState('');
  const [filter, setFilter] = useState('ALL');

  const [variances, setVariances] = useState([
    {
      id: 'VAR-301',
      workerName: 'Thabo Mokoena',
      workerId: 'EMP-4105',
      site: 'Orapa Shaft 3',
      jobTitle: 'Underground Blaster',
      regularHours: 160,
      overtimeHours: 24,
      normalRate: 145.00,
      billedRate: 165.00,
      budgetedAmount: 23200.00,
      stagedAmount: 27160.00,
      variancePercentage: +17.07,
      spikeReason: 'Weekend emergency shaft clearance authorized verbally by site lead.',
      status: 'Flagged',
    },
    {
      id: 'VAR-302',
      workerName: 'Kago Phuthego',
      workerId: 'EMP-8802',
      site: 'Jwaneng Pit B',
      jobTitle: 'Heavy Machinery Operator',
      regularHours: 160,
      overtimeHours: 8,
      normalRate: 120.00,
      billedRate: 120.00,
      budgetedAmount: 19200.00,
      stagedAmount: 20640.00,
      variancePercentage: +7.5,
      spikeReason: 'Standard scheduled shift extension.',
      status: 'Audited',
    },
    {
      id: 'VAR-303',
      workerName: 'Mpho Molefe',
      workerId: 'EMP-1109',
      site: 'Letlhakane Mine',
      jobTitle: 'Safety Inspector',
      regularHours: 160,
      overtimeHours: 32,
      normalRate: 135.00,
      billedRate: 135.00,
      budgetedAmount: 21600.00,
      stagedAmount: 28080.00,
      variancePercentage: +30.0,
      spikeReason: 'Unplanned compliance audit during weekend shut-down.',
      status: 'Flagged',
    },
  ]);

  const handleAction = (id, newStatus) => {
    setVariances((prev) =>
      prev.map((v) => (v.id === id ? { ...v, status: newStatus } : v))
    );
  };

  const filteredVariances = variances.filter((v) => {
    const matchesFilter = filter === 'ALL' || v.status.toUpperCase() === filter;
    const matchesSearch =
      v.workerName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      v.site.toLowerCase().includes(searchQuery.toLowerCase()) ||
      v.id.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesFilter && matchesSearch;
  });

  return (
    <div className="min-h-screen bg-slate-50/50 flex flex-col">
      <AccNavbar
        title="Payroll Variance & Overtime Spike Audit"
        subtitle="Detect cost overruns, unauthorized overtime hours, and rate mismatches"
      />

      <main className="p-4 sm:p-6 lg:p-8 space-y-6 max-w-7xl w-full mx-auto">
        {/* Metric Cards Header */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="bg-white p-5 rounded-3xl border border-slate-200 shadow-xs flex items-center justify-between">
            <div>
              <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">Total Overtime Hours</p>
              <h3 className="text-2xl font-black text-slate-900 mt-1">64 Hours</h3>
              <p className="text-[11px] text-amber-600 font-semibold mt-1 flex items-center gap-1">
                <Clock className="w-3.5 h-3.5" /> Across 3 active sites
              </p>
            </div>
            <div className="p-3.5 bg-amber-50 border border-amber-100 rounded-2xl text-amber-600">
              <Clock className="w-6 h-6" />
            </div>
          </div>

          <div className="bg-white p-5 rounded-3xl border border-slate-200 shadow-xs flex items-center justify-between">
            <div>
              <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">Total Budget Variance</p>
              <h3 className="text-2xl font-black text-slate-900 mt-1">+BWP 11,880.00</h3>
              <p className="text-[11px] text-rose-600 font-semibold mt-1">
                Exceeds base forecast
              </p>
            </div>
            <div className="p-3.5 bg-rose-50 border border-rose-100 rounded-2xl text-rose-600">
              <TrendingUp className="w-6 h-6" />
            </div>
          </div>

          <div className="bg-white p-5 rounded-3xl border border-slate-200 shadow-xs flex items-center justify-between">
            <div>
              <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">Flagged Spikes</p>
              <h3 className="text-2xl font-black text-slate-900 mt-1">2 Spikes</h3>
              <p className="text-[11px] text-slate-500 font-semibold mt-1">
                Requires supervisor sign-off
              </p>
            </div>
            <div className="p-3.5 bg-indigo-50 border border-indigo-100 rounded-2xl text-indigo-600">
              <AlertTriangle className="w-6 h-6" />
            </div>
          </div>
        </div>

        {/* Filter Controls */}
        <div className="bg-white p-5 rounded-3xl border border-slate-200 shadow-xs flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2 overflow-x-auto w-full sm:w-auto pb-2 sm:pb-0">
            {['ALL', 'FLAGGED', 'AUDITED'].map((st) => (
              <button
                key={st}
                onClick={() => setFilter(st)}
                className={`px-4 py-2 rounded-xl text-xs font-bold transition cursor-pointer shrink-0 ${
                  filter === st
                    ? 'bg-indigo-600 text-white shadow-xs shadow-indigo-600/30'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                {st}
              </button>
            ))}
          </div>

          <div className="relative w-full sm:w-72">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search worker, site, ID..."
              className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 transition"
            />
          </div>
        </div>

        {/* Variance Table */}
        <div className="bg-white border border-slate-200 rounded-3xl shadow-xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50/80 border-b border-slate-200/80 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                  <th className="py-3.5 px-6">Worker & Site</th>
                  <th className="py-3.5 px-6">Base / OT Hours</th>
                  <th className="py-3.5 px-6">Budgeted vs Staged</th>
                  <th className="py-3.5 px-6">Variance %</th>
                  <th className="py-3.5 px-6">Spike Justification</th>
                  <th className="py-3.5 px-6 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-xs font-medium text-slate-700">
                {filteredVariances.map((v) => (
                  <tr key={v.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="py-4 px-6">
                      <div className="font-bold text-slate-900">{v.workerName}</div>
                      <div className="text-[11px] text-slate-500">{v.jobTitle} • <span className="font-semibold text-slate-700">{v.site}</span></div>
                    </td>
                    <td className="py-4 px-6">
                      <div className="font-semibold text-slate-900">{v.regularHours} hrs Reg</div>
                      <div className="text-[11px] font-extrabold text-amber-600">+{v.overtimeHours} hrs OT</div>
                    </td>
                    <td className="py-4 px-6">
                      <div className="text-slate-500 line-through text-[11px]">BWP {v.budgetedAmount.toFixed(2)}</div>
                      <div className="font-black text-slate-900">BWP {v.stagedAmount.toFixed(2)}</div>
                    </td>
                    <td className="py-4 px-6">
                      <span className={`inline-flex items-center gap-1 font-bold text-xs px-2.5 py-1 rounded-full ${
                        v.variancePercentage > 15
                          ? 'bg-rose-50 text-rose-700 border border-rose-200'
                          : 'bg-amber-50 text-amber-700 border border-amber-200'
                      }`}>
                        +{v.variancePercentage}%
                      </span>
                    </td>
                    <td className="py-4 px-6 max-w-xs">
                      <p className="text-slate-600 text-[11px] truncate" title={v.spikeReason}>
                        {v.spikeReason}
                      </p>
                    </td>
                    <td className="py-4 px-6 text-right">
                      <div className="flex items-center justify-end gap-2">
                        {v.status === 'Flagged' ? (
                          <>
                            <button
                              onClick={() => handleAction(v.id, 'Audited')}
                              className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-[11px] rounded-xl transition cursor-pointer flex items-center gap-1 shadow-xs"
                            >
                              <CheckCircle2 className="w-3.5 h-3.5" /> Pass Audit
                            </button>
                            <button
                              onClick={() => handleAction(v.id, 'Rejected')}
                              className="p-1.5 text-rose-600 hover:bg-rose-50 border border-rose-200 rounded-xl transition cursor-pointer"
                              title="Reject Overtime"
                            >
                              <XCircle className="w-4 h-4" />
                            </button>
                          </>
                        ) : (
                          <span className="text-emerald-700 font-extrabold text-[11px] bg-emerald-50 border border-emerald-200 px-2.5 py-1 rounded-lg">
                            ✓ {v.status}
                          </span>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </main>
    </div>
  );
}