'use client';

import Link from 'next/link';
import HRSideNav from '@/components/hr/HRSideNav';
import HRNavbar from '@/components/hr/HRNavbar';
import { 
  FileSearch, 
  ShieldCheck, 
  CheckSquare, 
  FolderOpen,
  AlertCircle, 
  CheckCircle2, 
  ArrowRight,
  UserCheck,
  Clock
} from 'lucide-react';

export default function HRDashboardPage() {
  // Summary Compliance Stats
  const stats = [
    { name: 'Pending Sick Notes', value: '12', change: 'Requires inline review', color: 'bg-amber-500', icon: FileSearch, href: '/dashboard/hr/absences' },
    { name: 'Unmatched Rate Cards', value: '5', change: 'Locked site hours waiting', color: 'bg-indigo-600', icon: ShieldCheck, href: '/dashboard/hr/compliance' },
    { name: 'Ready for Staging', value: '148', change: 'Timesheets verified', color: 'bg-emerald-600', icon: CheckSquare, href: '/dashboard/hr/staging' },
    { name: 'Expiring IDs / Certs', value: '3', change: 'Requires upload', color: 'bg-rose-500', icon: FolderOpen, href: '/dashboard/hr/employees' },
  ];

  const pendingQueue = [
    { id: '1', worker: 'Kago Phuthego', type: 'Medical Certificate', site: 'Jwaneng Pit B', status: 'Pending Review', date: 'Today, 08:30 AM' },
    { id: '2', worker: 'Thabo Mokoena', type: 'Contract Rate Pair', site: 'Orapa Underground', status: 'Rate Mismatch', date: 'Yesterday' },
    { id: '3', worker: 'Kabelo Sechele', type: 'E-Wallet Validation', site: 'Karowe Diamond Mine', status: 'Bank Unverified', date: 'Yesterday' },
  ];

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col lg:flex-row font-sans">
      {/* HR Side Navigation */}
      <HRSideNav />

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0">
        <HRNavbar />

        <main className="p-4 sm:p-6 lg:p-8 space-y-8 max-w-7xl mx-auto w-full">
          {/* Header Banner */}
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-6 rounded-3xl border border-slate-200/80 shadow-xs">
            <div>
              <div className="flex items-center gap-2 text-xs font-extrabold text-indigo-600 uppercase tracking-wider mb-1">
                <UserCheck className="w-4 h-4" />
                <span>Compliance & Gatekeeping</span>
              </div>
              <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">HR Control Center</h1>
              <p className="text-slate-500 text-sm mt-1">Review field documents, pair locked site hours with contract rates, and stage verified payrolls.</p>
            </div>
            <Link
              href="/dashboard/hr/employees"
              className="inline-flex items-center justify-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-sm px-5 py-3 rounded-2xl transition shadow-md shadow-indigo-600/20 active:scale-95 shrink-0"
            >
              <FolderOpen className="w-4 h-4" />
              <span>Manage Employee Files</span>
            </Link>
          </div>

          {/* Metric Cards Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {stats.map((stat) => {
              const Icon = stat.icon;
              return (
                <Link
                  key={stat.name}
                  href={stat.href}
                  className="bg-white p-5 rounded-3xl border border-slate-200/80 shadow-xs hover:border-indigo-300 transition group flex flex-col justify-between space-y-4"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-500">{stat.name}</span>
                    <div className={`p-2.5 rounded-2xl ${stat.color} text-white shadow-xs group-hover:scale-110 transition-transform`}>
                      <Icon className="w-5 h-5" />
                    </div>
                  </div>
                  <div>
                    <div className="text-3xl font-black text-slate-900">{stat.value}</div>
                    <p className="text-[11px] font-semibold text-slate-400 mt-1">{stat.change}</p>
                  </div>
                </Link>
              );
            })}
          </div>

          {/* Workflow Modules Overview */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Quick Actions / Main Compliance Filters */}
            <div className="lg:col-span-2 space-y-6">
              <div className="bg-white p-6 rounded-3xl border border-slate-200/80 shadow-xs">
                <h2 className="text-lg font-black text-slate-900 mb-4 flex items-center gap-2">
                  <AlertCircle className="w-5 h-5 text-indigo-600" />
                  <span>Immediate Action Required</span>
                </h2>
                
                <div className="divide-y divide-slate-100">
                  {pendingQueue.map((item) => (
                    <div key={item.id} className="py-4 first:pt-0 last:pb-0 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-slate-900 text-sm">{item.worker}</span>
                          <span className="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold bg-amber-50 text-amber-700 border border-amber-200">
                            {item.status}
                          </span>
                        </div>
                        <p className="text-xs text-slate-500 font-medium">{item.type} • <span className="text-slate-700">{item.site}</span></p>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="text-[11px] text-slate-400 font-medium flex items-center gap-1">
                          <Clock className="w-3.5 h-3.5" />
                          {item.date}
                        </span>
                        <Link
                          href="/dashboard/hr/absences"
                          className="p-2 text-indigo-600 hover:bg-indigo-50 rounded-xl transition"
                        >
                          <ArrowRight className="w-4 h-4" />
                        </Link>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Stage Status Summary Card */}
            <div className="bg-gradient-to-br from-indigo-900 to-slate-900 text-white p-6 rounded-3xl shadow-xl flex flex-col justify-between space-y-6">
              <div className="space-y-3">
                <div className="p-3 bg-indigo-500/20 border border-indigo-400/30 rounded-2xl w-fit text-indigo-300">
                  <CheckCircle2 className="w-6 h-6" />
                </div>
                <h3 className="text-xl font-black">Payroll Staging Gate</h3>
                <p className="text-indigo-200/80 text-xs leading-relaxed">
                  All verified site hours paired with contracts automatically feed directly into Finance draft payrolls upon staging approval.
                </p>
              </div>

              <div className="space-y-3 pt-4 border-t border-indigo-800/60">
                <div className="flex justify-between text-xs font-bold text-indigo-200">
                  <span>Current Period Readiness</span>
                  <span>94%</span>
                </div>
                <div className="w-full bg-indigo-950 rounded-full h-2 overflow-hidden border border-indigo-800/50">
                  <div className="bg-emerald-400 h-full rounded-full w-[94%]"></div>
                </div>
                <Link
                  href="/dashboard/hr/staging"
                  className="w-full mt-2 inline-flex items-center justify-center gap-2 bg-indigo-500 hover:bg-indigo-400 text-white font-bold text-xs py-3 rounded-2xl transition active:scale-95"
                >
                  <span>Open Staging Queue</span>
                  <ArrowRight className="w-4 h-4" />
                </Link>
              </div>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}