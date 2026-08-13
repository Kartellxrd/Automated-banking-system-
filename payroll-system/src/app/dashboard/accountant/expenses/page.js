'use client';

import { useState } from 'react';
import {
  Receipt,
  Search,
  Fuel,
  Wrench,
  ShoppingBag,
  Check,
  X,
  Upload,
  AlertTriangle,
  FileCheck,
  ExternalLink
} from 'lucide-react';
import AccNavbar from '@/components/accountant/AccNavbar';
import AccSideNav from '@/components/accountant/AccSideNav';

export default function ExpensesAuditPage() {
  const [filter, setFilter] = useState('ALL');
  const [searchQuery, setSearchQuery] = useState('');

  const [expenses, setExpenses] = useState([
    {
      id: 'EXP-1001',
      category: 'Fuel',
      vendor: 'Engen Petrol Station',
      amount: 1250.00,
      purchaser: 'K. Phuthego',
      site: 'Jwaneng Pit B',
      date: '2026-08-12',
      hasProof: true,
      receiptUrl: 'https://images.unsplash.com/photo-1554224155-8d04cb21cd6c?auto=format&fit=crop&q=80&w=800',
      status: 'Verified',
      notes: 'Fuel voucher approved by site manager.',
    },
    {
      id: 'EXP-1002',
      category: 'Logistics',
      vendor: 'Botswana Courier Express',
      amount: 450.00,
      purchaser: 'T. Mokoena',
      site: 'Orapa Shaft 3',
      date: '2026-08-11',
      hasProof: true,
      receiptUrl: 'https://images.unsplash.com/photo-1584515979956-d9f6e5d09982?auto=format&fit=crop&q=80&w=800',
      status: 'Pending Review',
      notes: 'Waybill attached for drill bits shipment.',
    },
    {
      id: 'EXP-1003',
      category: 'Petty Cash',
      vendor: 'Local Hardware Store',
      amount: 620.00,
      purchaser: 'M. Molefe',
      site: 'Jwaneng Pit B',
      date: '2026-08-10',
      hasProof: false,
      receiptUrl: null,
      status: 'Rejected',
      notes: 'Till slip missing stamp and breakdown.',
    },
  ]);

  const filteredExpenses = expenses.filter((e) => {
    const matchesFilter = filter === 'ALL' || e.category.toUpperCase() === filter;
    const matchesSearch =
      e.vendor.toLowerCase().includes(searchQuery.toLowerCase()) ||
      e.purchaser.toLowerCase().includes(searchQuery.toLowerCase()) ||
      e.id.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesFilter && matchesSearch;
  });

  const handleStatusChange = (id, newStatus) => {
    setExpenses((prev) =>
      prev.map((e) => (e.id === id ? { ...e, status: newStatus } : e))
    );
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col lg:flex-row font-sans">
      {/* Accountant Side Navigation */}
      <AccSideNav />

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0">
        <AccNavbar
          title="Expense Receipts & Outflow Verification"
          subtitle="Audit petrol slips, petty cash vouchers, and logistics receipts"
        />

        <main className="p-4 sm:p-6 lg:p-8 space-y-6 max-w-7xl w-full mx-auto">
          {/* Top Controls & Category Filters */}
          <div className="bg-white p-5 rounded-3xl border border-slate-200/80 shadow-xs flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-2 overflow-x-auto w-full sm:w-auto pb-2 sm:pb-0">
              {['ALL', 'FUEL', 'LOGISTICS', 'PETTY CASH'].map((cat) => (
                <button
                  key={cat}
                  onClick={() => setFilter(cat)}
                  className={`px-4 py-2 rounded-xl text-xs font-bold transition cursor-pointer shrink-0 ${
                    filter === cat
                      ? 'bg-indigo-600 text-white shadow-xs shadow-indigo-600/30'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  {cat}
                </button>
              ))}
            </div>

            <div className="relative w-full sm:w-72">
              <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search vendor, buyer, ID..."
                className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 transition"
              />
            </div>
          </div>

          {/* Expense Grid Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {filteredExpenses.map((exp) => (
              <div
                key={exp.id}
                className="bg-white border border-slate-200/80 rounded-3xl p-5 shadow-xs flex flex-col justify-between space-y-4 hover:border-slate-300 transition"
              >
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-black uppercase text-indigo-600 bg-indigo-50 px-2.5 py-1 rounded-lg border border-indigo-100">
                      {exp.category}
                    </span>
                    <span
                      className={`text-[11px] font-bold px-2.5 py-1 rounded-full ${
                        exp.status === 'Verified'
                          ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                          : exp.status === 'Rejected'
                          ? 'bg-rose-50 text-rose-700 border border-rose-200'
                          : 'bg-amber-50 text-amber-700 border border-amber-200'
                      }`}
                    >
                      {exp.status}
                    </span>
                  </div>

                  <div>
                    <h3 className="font-extrabold text-slate-900 text-sm">{exp.vendor}</h3>
                    <p className="text-xs text-slate-500 mt-0.5">
                      Purchased by <span className="font-bold text-slate-700">{exp.purchaser}</span> ({exp.site})
                    </p>
                  </div>

                  <div className="p-3 bg-slate-50 rounded-2xl border border-slate-100 flex items-center justify-between">
                    <span className="text-xs font-semibold text-slate-500">Outflow Amount:</span>
                    <span className="text-base font-black text-slate-900">BWP {exp.amount.toFixed(2)}</span>
                  </div>

                  {/* Proof Preview Box */}
                  <div className="space-y-1.5">
                    <span className="text-[11px] font-bold text-slate-500">Attached Proof:</span>
                    {exp.hasProof ? (
                      <div className="relative group rounded-xl overflow-hidden border border-slate-200 h-28 bg-slate-100">
                        <img
                          src={exp.receiptUrl}
                          alt="Till slip proof"
                          className="w-full h-full object-cover group-hover:scale-105 transition duration-200"
                        />
                        <a
                          href={exp.receiptUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="absolute inset-0 bg-slate-950/40 opacity-0 group-hover:opacity-100 transition flex items-center justify-center text-white text-xs font-bold gap-1.5"
                        >
                          <ExternalLink className="w-4 h-4" /> Expand Receipt
                        </a>
                      </div>
                    ) : (
                      <div className="h-28 rounded-xl border border-dashed border-rose-200 bg-rose-50/50 flex flex-col items-center justify-center p-4 text-center">
                        <AlertTriangle className="w-6 h-6 text-rose-500 mb-1" />
                        <p className="text-xs font-bold text-rose-700">No Proof Attached</p>
                        <p className="text-[10px] text-rose-500 mt-0.5">Receipt photo required for approval</p>
                      </div>
                    )}
                  </div>
                </div>

                {/* Card Action Footer */}
                <div className="pt-3 border-t border-slate-100 flex items-center gap-2">
                  <button
                    onClick={() => handleStatusChange(exp.id, 'Verified')}
                    disabled={!exp.hasProof}
                    className="flex-1 py-2 bg-emerald-600 hover:bg-emerald-700 disabled:bg-slate-200 text-white font-bold text-xs rounded-xl transition flex items-center justify-center gap-1.5 cursor-pointer disabled:cursor-not-allowed shadow-xs"
                  >
                    <Check className="w-3.5 h-3.5" /> Approve
                  </button>
                  <button
                    onClick={() => handleStatusChange(exp.id, 'Rejected')}
                    className="flex-1 py-2 bg-rose-50 hover:bg-rose-100 text-rose-700 font-bold text-xs rounded-xl border border-rose-200 transition flex items-center justify-center gap-1.5 cursor-pointer"
                  >
                    <X className="w-3.5 h-3.5" /> Reject
                  </button>
                </div>
              </div>
            ))}
          </div>
        </main>
      </div>
    </div>
  );
}