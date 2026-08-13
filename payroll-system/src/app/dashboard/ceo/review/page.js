'use client';

import { useState } from 'react';
import {
  ShieldCheck,
  Building,
  CheckCircle2,
  ArrowRight,
  Loader2,
  Search,
  FileText,
  Printer,
  Download,
  ExternalLink
} from 'lucide-react';
import CeoNavbar from '@/components/ceo/CeoNavbar';
import CeoSideNav from '@/components/ceo/CeoSideNav';

export default function CeoBatchAuthorizationPage() {
  const [batches, setBatches] = useState([
    {
      id: 'STG-B201',
      batchName: 'August Mid-Month Payroll - Jwaneng Cluster',
      totalWorkers: 42,
      grossPayout: 88450.00,
      bankProvider: 'First National Bank Botswana (FNBB)',
      stagedBy: 'Kago Phuthego',
      stagedAt: 'Today at 08:30 AM',
      overtimeVariance: '+17.07%',
      status: 'PENDING',
      receipt: null,
    },
    {
      id: 'STG-B202',
      batchName: 'Orapa Shaft Operations & Fuel Reimbursements',
      totalWorkers: 28,
      grossPayout: 61200.00,
      bankProvider: 'Absa Bank Botswana',
      stagedBy: 'Kago Phuthego',
      stagedAt: 'Today at 09:15 AM',
      overtimeVariance: '+7.5%',
      status: 'PENDING',
      receipt: null,
    },
  ]);

  const [selectedBatch, setSelectedBatch] = useState(null);
  const [pin, setPin] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [receiptData, setReceiptData] = useState(null);

  const handleAuthorize = async (e) => {
    e.preventDefault();
    if (!pin || pin.length < 4) {
      alert('Please enter your 4-digit executive security PIN.');
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch('/api/ceo/approve', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          batchId: selectedBatch.id,
          pin,
          amount: selectedBatch.grossPayout,
          batchName: selectedBatch.batchName,
          bankProvider: selectedBatch.bankProvider,
        }),
      });
      const json = await res.json();

      if (json.success) {
        // Update batch state to RELEASED and store its generated receipt
        setBatches((prev) =>
          prev.map((b) =>
            b.id === selectedBatch.id
              ? { ...b, status: 'RELEASED', receipt: json.receipt }
              : b
          )
        );
        
        // Open receipt modal immediately
        setReceiptData(json.receipt);
        setSelectedBatch(null);
        setPin('');
      } else {
        alert(json.message || 'Authorization failed.');
      }
    } catch (err) {
      alert('Network error during authorization.');
    } finally {
      setSubmitting(false);
    }
  };

  const filteredBatches = batches.filter(
    (b) =>
      b.batchName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      b.id.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col lg:flex-row font-sans">
      <CeoSideNav />

      <div className="flex-1 flex flex-col min-w-0">
        <CeoNavbar
          title="Batch Authorization (Strategic Gate)"
          subtitle="Verify zero compliance flags and execute final batch payout transfers"
        />

        <main className="p-4 sm:p-6 lg:p-8 space-y-6 max-w-7xl w-full mx-auto">
          {/* Search Toolbar */}
          <div className="bg-white p-4 rounded-3xl border border-slate-200 shadow-xs flex items-center justify-between gap-4">
            <div className="relative w-full sm:w-80">
              <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search batch or ID..."
                className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-700 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600 transition"
              />
            </div>
            <span className="text-xs font-bold text-slate-500">
              {batches.filter((b) => b.status === 'PENDING').length} Pending Execution
            </span>
          </div>

          {/* Batch List */}
          <div className="space-y-4">
            {filteredBatches.map((b) => (
              <div
                key={b.id}
                className="bg-white border border-slate-200 rounded-3xl p-6 shadow-xs flex flex-col lg:flex-row lg:items-center justify-between gap-6"
              >
                <div className="space-y-2">
                  <div className="flex items-center gap-3">
                    <span className="font-extrabold text-slate-900 text-base">{b.batchName}</span>
                    <span className="text-[10px] font-black text-slate-500 bg-slate-100 px-2.5 py-0.5 rounded-md border border-slate-200">
                      {b.id}
                    </span>
                  </div>
                  <p className="text-xs text-slate-500 font-medium">
                    Staged by <span className="font-bold text-slate-700">{b.stagedBy}</span> ({b.stagedAt})
                  </p>
                  <div className="flex items-center gap-4 text-xs font-semibold text-slate-600">
                    <span className="flex items-center gap-1">
                      <Building className="w-3.5 h-3.5 text-emerald-600" /> {b.bankProvider}
                    </span>
                    <span>•</span>
                    <span>{b.totalWorkers} Personnel</span>
                    <span>•</span>
                    <span className="text-amber-600 font-bold">{b.overtimeVariance} Overtime Variance</span>
                  </div>
                </div>

                <div className="flex items-center justify-between lg:justify-end gap-6 border-t lg:border-t-0 border-slate-100 pt-4 lg:pt-0">
                  <div className="text-left lg:text-right">
                    <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider block">
                      Gross Release Outflow
                    </span>
                    <span className="text-xl font-black text-slate-900">
                      BWP {b.grossPayout.toLocaleString('en-BW', { minimumFractionDigits: 2 })}
                    </span>
                  </div>

                  {b.status === 'RELEASED' ? (
                    <button
                      onClick={() => setReceiptData(b.receipt)}
                      className="px-5 py-2.5 bg-emerald-50 border border-emerald-200 text-emerald-700 font-extrabold text-xs rounded-xl flex items-center gap-1.5 cursor-pointer hover:bg-emerald-100 transition"
                    >
                      <CheckCircle2 className="w-4 h-4 text-emerald-600" /> View Receipt
                    </button>
                  ) : (
                    <button
                      onClick={() => setSelectedBatch(b)}
                      className="px-5 py-3 bg-slate-900 hover:bg-slate-800 text-white font-extrabold text-xs rounded-xl transition cursor-pointer flex items-center gap-2"
                    >
                      Audit & Authorize <ArrowRight className="w-4 h-4" />
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>

          {/* Authorization Modal */}
          {selectedBatch && (
            <div className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-xs flex items-center justify-center p-4">
              <div className="bg-white border border-slate-200 rounded-3xl p-6 sm:p-8 max-w-lg w-full shadow-2xl space-y-6">
                <div className="flex items-center justify-between border-b border-slate-100 pb-4">
                  <div className="flex items-center gap-3">
                    <div className="p-2.5 bg-emerald-50 text-emerald-600 border border-emerald-100 rounded-2xl">
                      <ShieldCheck className="w-5 h-5" />
                    </div>
                    <div>
                      <h3 className="font-extrabold text-slate-900 text-base">Executive Sign-Off Gate</h3>
                      <p className="text-[11px] text-slate-500 font-medium">{selectedBatch.id}</p>
                    </div>
                  </div>
                  <button
                    onClick={() => setSelectedBatch(null)}
                    className="text-slate-400 hover:text-slate-600 text-sm font-bold"
                  >
                    ✕
                  </button>
                </div>

                <div className="space-y-3 bg-slate-50 p-4 rounded-2xl text-xs">
                  <div className="flex justify-between text-slate-600">
                    <span>Batch Name:</span>
                    <span className="font-bold text-slate-900">{selectedBatch.batchName}</span>
                  </div>
                  <div className="flex justify-between text-slate-600">
                    <span>Total Disbursement:</span>
                    <span className="font-black text-emerald-700">
                      BWP {selectedBatch.grossPayout.toLocaleString('en-BW', { minimumFractionDigits: 2 })}
                    </span>
                  </div>
                  <div className="flex justify-between text-slate-600">
                    <span>Gateway Partner:</span>
                    <span className="font-bold text-slate-800 flex items-center gap-1">
                      Flutterwave Sandbox API <ExternalLink className="w-3 h-3 text-slate-400" />
                    </span>
                  </div>
                </div>

                <form onSubmit={handleAuthorize} className="space-y-4">
                  <div>
                    <label className="block text-xs font-extrabold text-slate-700 uppercase tracking-wider mb-2">
                      Enter Executive Security PIN (Test PIN: 1234)
                    </label>
                    <input
                      type="password"
                      maxLength={4}
                      value={pin}
                      onChange={(e) => setPin(e.target.value)}
                      placeholder="••••"
                      className="w-full text-center text-2xl font-black tracking-widest bg-slate-50 border border-slate-200 rounded-2xl py-3 text-emerald-700 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600 transition"
                    />
                  </div>

                  <div className="flex gap-3">
                    <button
                      type="button"
                      onClick={() => setSelectedBatch(null)}
                      className="w-1/2 py-3 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl transition cursor-pointer"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={submitting}
                      className="w-1/2 py-3 bg-emerald-600 hover:bg-emerald-500 text-white font-extrabold text-xs rounded-xl transition cursor-pointer flex items-center justify-center gap-2"
                    >
                      {submitting ? (
                        <>
                          <Loader2 className="w-4 h-4 animate-spin" /> Routing Gateway...
                        </>
                      ) : (
                        'Execute Release'
                      )}
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}

          {/* DIGITAL AUDIT RECEIPT MODAL */}
          {receiptData && (
            <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-md flex items-center justify-center p-4">
              <div className="bg-white border border-slate-200 rounded-3xl p-6 sm:p-8 max-w-lg w-full shadow-2xl space-y-6 animate-in fade-in zoom-in duration-200">
                {/* Header Badge */}
                <div className="flex items-center justify-between border-b border-slate-100 pb-4">
                  <div className="flex items-center gap-3">
                    <div className="p-3 bg-emerald-100 text-emerald-700 rounded-2xl">
                      <FileText className="w-6 h-6" />
                    </div>
                    <div>
                      <span className="text-[10px] font-black tracking-widest uppercase text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200">
                        Payment Confirmation
                      </span>
                      <h3 className="font-extrabold text-slate-900 text-lg mt-0.5">Disbursement Receipt</h3>
                    </div>
                  </div>
                  <button
                    onClick={() => setReceiptData(null)}
                    className="text-slate-400 hover:text-slate-600 font-bold text-sm"
                  >
                    ✕
                  </button>
                </div>

                {/* Receipt Details Box */}
                <div className="bg-slate-50 border border-slate-200 rounded-2xl p-5 space-y-3 font-mono text-xs text-slate-700">
                  <div className="flex justify-between border-b border-slate-200 pb-2">
                    <span className="text-slate-500">Receipt Ref:</span>
                    <span className="font-bold text-slate-900">{receiptData.receiptNumber}</span>
                  </div>

                  <div className="flex justify-between border-b border-slate-200 pb-2">
                    <span className="text-slate-500">Gateway Ref:</span>
                    <span className="font-bold text-slate-900 truncate max-w-[200px]" title={receiptData.transactionRef}>
                      {receiptData.transactionRef}
                    </span>
                  </div>

                  <div className="flex justify-between border-b border-slate-200 pb-2">
                    <span className="text-slate-500">Batch Identifier:</span>
                    <span className="font-bold text-slate-900">{receiptData.batchId}</span>
                  </div>

                  <div className="flex justify-between border-b border-slate-200 pb-2">
                    <span className="text-slate-500">Bank Destination:</span>
                    <span className="font-bold text-slate-900">{receiptData.bankProvider}</span>
                  </div>

                  <div className="flex justify-between border-b border-slate-200 pb-2">
                    <span className="text-slate-500">Executing Node:</span>
                    <span className="font-bold text-slate-900">Flutterwave Sandbox API</span>
                  </div>

                  <div className="flex justify-between border-b border-slate-200 pb-2">
                    <span className="text-slate-500">Execution Time:</span>
                    <span className="font-bold text-slate-900">
                      {new Date(receiptData.timestamp).toLocaleTimeString()} ({new Date(receiptData.timestamp).toLocaleDateString()})
                    </span>
                  </div>

                  <div className="flex justify-between pt-1 text-sm font-sans">
                    <span className="font-extrabold text-slate-900">Total Released:</span>
                    <span className="font-black text-emerald-700 text-base">
                      BWP {receiptData.amount?.toLocaleString('en-BW', { minimumFractionDigits: 2 })}
                    </span>
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="flex gap-3 pt-2">
                  <button
                    onClick={() => window.print()}
                    className="w-1/2 py-3 bg-slate-100 hover:bg-slate-200 text-slate-800 font-extrabold text-xs rounded-xl transition flex items-center justify-center gap-2 cursor-pointer"
                  >
                    <Printer className="w-4 h-4" /> Print Receipt
                  </button>
                  <button
                    onClick={() => setReceiptData(null)}
                    className="w-1/2 py-3 bg-slate-900 hover:bg-slate-800 text-white font-extrabold text-xs rounded-xl transition flex items-center justify-center gap-2 cursor-pointer"
                  >
                    Done & Close
                  </button>
                </div>
              </div>
            </div>
          )}
        </main>
      </div>
    </div>
  );
}