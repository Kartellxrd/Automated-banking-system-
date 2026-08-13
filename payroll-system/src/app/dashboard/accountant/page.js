'use client';

import { useState, useEffect } from 'react';
import {
  TrendingUp,
  Receipt,
  AlertTriangle,
  FileCheck2,
  CheckCircle2,
  XCircle,
  Eye,
  ArrowUpRight,
  Filter,
  RefreshCw,
  Fuel,
  CreditCard
} from 'lucide-react';
import AccNavbar from './AccNavbar';

export default function AccountantDashboardPage() {
  const [loading, setLoading] = useState(true);
  const [expenseData, setExpenseData] = useState([]);
  const [selectedReceipt, setSelectedReceipt] = useState(null);

  // Stats calculation
  const totalPendingExpenses = expenseData
    .filter((e) => e.status === 'Pending')
    .reduce((acc, curr) => acc + curr.amount, 0);

  const pendingCount = expenseData.filter((e) => e.status === 'Pending').length;

  useEffect(() => {
    // Mock data initial load - replace with fetch('/api/accountant/expenses')
    setTimeout(() => {
      setExpenseData([
        {
          id: 'EXP-801',
          category: 'Fuel / Petrol',
          description: 'Refueling Site Transport Van - Jwaneng Fleet',
          amount: 1450.00,
          currency: 'BWP',
          submittedBy: 'M. Molefe (Site Supervisor)',
          site: 'Jwaneng Pit B',
          date: '2026-08-12',
          status: 'Pending',
          receiptUrl: 'https://images.unsplash.com/photo-1554224155-8d04cb21cd6c?auto=format&fit=crop&q=80&w=800',
          hasProof: true,
          notes: 'Engen Service Station receipt attached.',
        },
        {
          id: 'EXP-802',
          category: 'Equipment Maintenance',
          description: 'Emergency Hydraulics Hose Repair',
          amount: 3200.00,
          currency: 'BWP',
          submittedBy: 'K. Sebele (Site Maintenance)',
          site: 'Orapa Shaft 3',
          date: '2026-08-11',
          status: 'Pending',
          receiptUrl: 'https://images.unsplash.com/photo-1584515979956-d9f6e5d09982?auto=format&fit=crop&q=80&w=800',
          hasProof: true,
          notes: 'Invoice #4409 from Hydraulic Services Ltd.',
        },
        {
          id: 'EXP-803',
          category: 'Site Petty Cash',
          description: 'Safety Goggles and Water Rations',
          amount: 850.00,
          currency: 'BWP',
          submittedBy: 'T. Mokoena',
          site: 'Jwaneng Pit B',
          date: '2026-08-10',
          status: 'Approved',
          receiptUrl: 'https://images.unsplash.com/photo-1554224155-8d04cb21cd6c?auto=format&fit=crop&q=80&w=800',
          hasProof: true,
          notes: 'Till slip verified and matched.',
        },
        {
          id: 'EXP-804',
          category: 'Fuel / Petrol',
          description: 'Diesel Batch for Generator B',
          amount: 2100.00,
          currency: 'BWP',
          submittedBy: 'P. Botha',
          site: 'Letlhakane Mine',
          date: '2026-08-09',
          status: 'Flagged',
          receiptUrl: null,
          hasProof: false,
          notes: 'Missing fuel pump transaction receipt image.',
        },
      ]);
      setLoading(false);
    }, 600);
  }, []);

  const handleAuditAction = (id, newStatus) => {
    setExpenseData((prev) =>
      prev.map((item) => (item.id === id ? { ...item, status: newStatus } : item))
    );
  };

  return (
    <div className="min-h-screen bg-slate-50/50 flex flex-col">
      <AccNavbar
        title="Financial & Expense Dashboard"
        subtitle="Real-time outflow tracking, receipt verification, and variance audits"
      />

      <main className="p-4 sm:p-6 lg:p-8 space-y-6 max-w-7xl w-full mx-auto">
        {/* Metric Overview Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-white p-5 rounded-3xl border border-slate-200 shadow-xs flex items-center justify-between">
            <div>
              <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">Unverified Expenses</p>
              <h3 className="text-2xl font-black text-slate-900 mt-1">BWP {totalPendingExpenses.toLocaleString('en-BW', { minimumFractionDigits: 2 })}</h3>
              <p className="text-[11px] text-amber-600 font-semibold mt-1 flex items-center gap-1">
                <AlertTriangle className="w-3.5 h-3.5" /> {pendingCount} claims need proof check
              </p>
            </div>
            <div className="p-3.5 bg-amber-50 border border-amber-100 rounded-2xl text-amber-600">
              <Receipt className="w-6 h-6" />
            </div>
          </div>

          <div className="bg-white p-5 rounded-3xl border border-slate-200 shadow-xs flex items-center justify-between">
            <div>
              <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">Fuel & Logistics Outflow</p>
              <h3 className="text-2xl font-black text-slate-900 mt-1">BWP 3,550.00</h3>
              <p className="text-[11px] text-indigo-600 font-semibold mt-1">
                2 Active Site Accounts
              </p>
            </div>
            <div className="p-3.5 bg-indigo-50 border border-indigo-100 rounded-2xl text-indigo-600">
              <Fuel className="w-6 h-6" />
            </div>
          </div>

          <div className="bg-white p-5 rounded-3xl border border-slate-200 shadow-xs flex items-center justify-between">
            <div>
              <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">Payroll Variance</p>
              <h3 className="text-2xl font-black text-slate-900 mt-1">+4.2%</h3>
              <p className="text-[11px] text-emerald-600 font-semibold mt-1">
                Within 5% threshold
              </p>
            </div>
            <div className="p-3.5 bg-emerald-50 border border-emerald-100 rounded-2xl text-emerald-600">
              <TrendingUp className="w-6 h-6" />
            </div>
          </div>

          <div className="bg-white p-5 rounded-3xl border border-slate-200 shadow-xs flex items-center justify-between">
            <div>
              <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">Batches Staged</p>
              <h3 className="text-2xl font-black text-slate-900 mt-1">2 Batches</h3>
              <p className="text-[11px] text-slate-500 font-semibold mt-1">
                Ready for Exec Review
              </p>
            </div>
            <div className="p-3.5 bg-blue-50 border border-blue-100 rounded-2xl text-blue-600">
              <FileCheck2 className="w-6 h-6" />
            </div>
          </div>
        </div>

        {/* Operational Expenses Audit Queue Section */}
        <div className="bg-white border border-slate-200 rounded-3xl shadow-xs overflow-hidden">
          <div className="p-5 sm:p-6 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h2 className="text-base font-extrabold text-slate-900 flex items-center gap-2">
                <CreditCard className="w-5 h-5 text-indigo-600" />
                Operational Expense & Proof Verification Queue
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Audit cash outflows, fuel slips, and logistics claims before approving staging payouts
              </p>
            </div>
            <div className="flex items-center gap-2 self-start sm:self-auto">
              <button className="flex items-center gap-2 px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl transition cursor-pointer">
                <Filter className="w-3.5 h-3.5" /> Filter Category
              </button>
            </div>
          </div>

          {/* Expenses Table */}
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50/80 border-b border-slate-200/80 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                  <th className="py-3.5 px-6">Claim ID & Category</th>
                  <th className="py-3.5 px-6">Submitted By / Site</th>
                  <th className="py-3.5 px-6">Amount (BWP)</th>
                  <th className="py-3.5 px-6">Proof Attached</th>
                  <th className="py-3.5 px-6">Audit Status</th>
                  <th className="py-3.5 px-6 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-xs font-medium text-slate-700">
                {loading ? (
                  <tr>
                    <td colSpan="6" className="py-12 text-center text-slate-400">
                      <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2 text-indigo-600" />
                      Loading financial claims data...
                    </td>
                  </tr>
                ) : expenseData.length === 0 ? (
                  <tr>
                    <td colSpan="6" className="py-8 text-center text-slate-400">
                      No expense claims pending review.
                    </td>
                  </tr>
                ) : (
                  expenseData.map((item) => (
                    <tr key={item.id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="py-4 px-6">
                        <div className="font-bold text-slate-900">{item.id}</div>
                        <span className="text-[11px] text-slate-500 font-semibold">{item.category}</span>
                      </td>
                      <td className="py-4 px-6">
                        <div className="font-semibold text-slate-900">{item.submittedBy}</div>
                        <div className="text-[11px] text-slate-500">{item.site}</div>
                      </td>
                      <td className="py-4 px-6 font-extrabold text-slate-900">
                        BWP {item.amount.toFixed(2)}
                      </td>
                      <td className="py-4 px-6">
                        {item.hasProof ? (
                          <button
                            onClick={() => setSelectedReceipt(item)}
                            className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-indigo-50 border border-indigo-100 text-indigo-700 font-bold text-[11px] rounded-lg hover:bg-indigo-100 transition cursor-pointer"
                          >
                            <Eye className="w-3.5 h-3.5" /> View Receipt
                          </button>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-rose-50 border border-rose-100 text-rose-700 font-bold text-[11px] rounded-lg">
                            <AlertTriangle className="w-3.5 h-3.5" /> Missing Proof
                          </span>
                        )}
                      </td>
                      <td className="py-4 px-6">
                        <span
                          className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold ${
                            item.status === 'Approved'
                              ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                              : item.status === 'Flagged'
                              ? 'bg-rose-50 text-rose-700 border border-rose-200'
                              : 'bg-amber-50 text-amber-700 border border-amber-200'
                          }`}
                        >
                          {item.status}
                        </span>
                      </td>
                      <td className="py-4 px-6 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={() => handleAuditAction(item.id, 'Approved')}
                            className="p-1.5 text-emerald-600 hover:bg-emerald-50 border border-emerald-200 rounded-lg transition active:scale-95 cursor-pointer"
                            title="Approve Outflow"
                          >
                            <CheckCircle2 className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleAuditAction(item.id, 'Flagged')}
                            className="p-1.5 text-rose-600 hover:bg-rose-50 border border-rose-200 rounded-lg transition active:scale-95 cursor-pointer"
                            title="Flag / Request Proof"
                          >
                            <XCircle className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </main>

      {/* Modal for Receipt / Till Slip Image Proof */}
      {selectedReceipt && (
        <div className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white border border-slate-200 rounded-3xl max-w-lg w-full p-6 space-y-4 shadow-2xl animate-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <h3 className="font-extrabold text-slate-900 text-sm">Receipt Verification</h3>
                <p className="text-xs text-slate-500">{selectedReceipt.id} - {selectedReceipt.category}</p>
              </div>
              <button
                onClick={() => setSelectedReceipt(null)}
                className="p-1.5 text-slate-400 hover:text-slate-700 rounded-lg bg-slate-100 transition cursor-pointer"
              >
                ✕
              </button>
            </div>

            <div className="space-y-3">
              <div className="aspect-video bg-slate-100 rounded-2xl overflow-hidden border border-slate-200 relative flex items-center justify-center">
                {selectedReceipt.receiptUrl ? (
                  <img
                    src={selectedReceipt.receiptUrl}
                    alt="Expense Proof"
                    className="object-cover w-full h-full"
                  />
                ) : (
                  <span className="text-xs text-slate-400">No Image Uploaded</span>
                )}
              </div>
              <div className="p-3.5 bg-slate-50 rounded-2xl border border-slate-200 space-y-1">
                <p className="text-xs font-bold text-slate-900">Audit Notes:</p>
                <p className="text-xs text-slate-600">{selectedReceipt.notes}</p>
              </div>
            </div>

            <div className="pt-2 flex gap-3">
              <button
                onClick={() => setSelectedReceipt(null)}
                className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs rounded-xl transition cursor-pointer shadow-sm shadow-indigo-600/30"
              >
                Close Preview
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}