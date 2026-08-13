'use client';

import { Bell, Search, ShieldCheck, UserCheck } from 'lucide-react';

export default function AccNavbar({ title = "Accountant Financial Portal", subtitle = "Payroll Variance, Expense Audits & Batch Staging" }) {
  return (
    <header className="bg-white border-b border-slate-200 px-6 py-4 sticky top-0 z-30 shadow-2xs">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        {/* Title Section */}
        <div>
          <h1 className="text-xl font-black text-slate-900 tracking-tight">{title}</h1>
          <p className="text-xs text-slate-500 font-medium mt-0.5">{subtitle}</p>
        </div>

        {/* Right Action Icons & Profile Badge */}
        <div className="flex items-center gap-3 self-end sm:self-auto">
          {/* Quick Search */}
          <div className="relative hidden md:block">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search receipts, batches..."
              className="pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 w-48 lg:w-64 transition"
            />
          </div>

          {/* Notifications */}
          <button className="relative p-2.5 text-slate-500 hover:text-indigo-600 bg-slate-50 hover:bg-indigo-50 border border-slate-200 rounded-xl transition cursor-pointer">
            <Bell className="w-4 h-4" />
            <span className="absolute top-2 right-2 w-2 h-2 bg-rose-500 rounded-full ring-2 ring-white"></span>
          </button>

          {/* User Role Badge */}
          <div className="flex items-center gap-3 pl-3 border-l border-slate-200">
            <div className="w-9 h-9 rounded-xl bg-indigo-600 text-white flex items-center justify-center font-black text-xs shadow-xs">
              AC
            </div>
            <div className="hidden xl:block">
              <div className="flex items-center gap-1.5">
                <span className="text-xs font-bold text-slate-900">Finance Reviewer</span>
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
              </div>
              <span className="text-[10px] text-slate-400 font-semibold block">Finance & Payroll</span>
            </div>
          </div>
        </div>
      </div>
    </header>
  );
}