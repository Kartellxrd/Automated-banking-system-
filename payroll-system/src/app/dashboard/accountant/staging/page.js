'use client';

import { useState, useEffect } from 'react';
import {
  FileCheck2,
  Building,
  CreditCard,
  Send,
  CheckCircle,
  AlertCircle,
  ShieldCheck,
  Search,
  ChevronRight,
  Loader2,
  RefreshCw
} from 'lucide-react';

import AccNavbar from '@/components/accountant/AccNavbar';
import AccSideNav from '@/components/accountant/AccSideNav';

export default function BatchStagingPage() {
  const [batches, setBatches] = useState([]);
  const [selectedBatches, setSelectedBatches] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);

  // Fetch initial batch data from API route
  const fetchBatches = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/accountant/staging');
      const json = await res.json();
      if (json.success) {
        setBatches(json.data);
      } else {
        setError(json.message || 'Failed to load batches');
      }
    } catch (err) {
      setError('Network error fetching batch staging records');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBatches();
  }, []);

  const toggleSelect = (id) => {
    setSelectedBatches((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  // Stage an individual batch via API
  const handleStageBatch = async (id) => {
    try {
      const res = await fetch(`/api/accountant/staging/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'Staged for Exec Review' }),
      });
      const json = await res.json();

      if (json.success) {
        setBatches((prev) =>
          prev.map((b) => (b.id === id ? { ...b, status: 'Staged for Exec Review' } : b))
        );
      } else {
        alert(json.message || 'Failed to stage batch');
      }
    } catch (err) {
      alert('Network error while staging batch');
    }
  };

  // Push all selected batches to Executive Review via bulk API
  const handlePushToExec = async () => {
    if (selectedBatches.length === 0) return;

    setSubmitting(true);
    try {
      const res = await fetch('/api/accountant/staging/push-to-exec', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ batchIds: selectedBatches }),
      });
      const json = await res.json();

      if (json.success) {
        // Optimistically update status on UI
        setBatches((prev) =>
          prev.map((b) =>
            selectedBatches.includes(b.id)
              ? { ...b, status: 'Staged for Exec Review' }
              : b
          )
        );
        setSelectedBatches([]);
      } else {
        alert(json.message || 'Failed to push batches to executive review');
      }
    } catch (err) {
      alert('Error transferring batches to Executive Review');
    } finally {
      setSubmitting(false);
    }
  };

  const filteredBatches = batches.filter(
    (b) =>
      b.batchName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      b.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
      b.bankProvider.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col lg:flex-row font-sans">
      {/* Sidebar Navigation Component */}
      <AccSideNav />

      {/* Main Area */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Top Header Component */}
        <AccNavbar
          title="Batch Staging & Banking Routing"
          subtitle="Verify bank codes, account details, and route payout batches for executive authorization"
        />

        {/* Page Content */}
        <main className="p-4 sm:p-6 lg:p-8 space-y-6 max-w-7xl w-full mx-auto">
          {/* Header Summary */}
          <div className="bg-indigo-950 text-white rounded-3xl p-6 sm:p-8 shadow-xl flex flex-col md:flex-row items-start md:items-center justify-between gap-6 relative overflow-hidden">
            <div className="space-y-2 z-10">
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-indigo-800/80 text-indigo-200 text-xs font-extrabold uppercase tracking-wider">
                <ShieldCheck className="w-4 h-4 text-emerald-400" /> Banking Gateway Audit
              </span>
              <h2 className="text-2xl font-black tracking-tight">Stage Batches to Executive Review</h2>
              <p className="text-xs text-indigo-200/80 max-w-xl">
                Ensure all employee account numbers, branch codes, and reimbursement claims have been cross-checked before transferring control to Executive Review.
              </p>
            </div>

            <div className="z-10 shrink-0">
              <button
                onClick={handlePushToExec}
                disabled={selectedBatches.length === 0 || submitting}
                className="px-6 py-3.5 bg-indigo-600 hover:bg-indigo-500 disabled:bg-slate-800 text-white font-extrabold text-xs rounded-2xl transition shadow-lg shadow-indigo-600/40 flex items-center gap-2 cursor-pointer disabled:cursor-not-allowed"
              >
                {submitting ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" /> Transferring...
                  </>
                ) : (
                  <>
                    <Send className="w-4 h-4" /> Push {selectedBatches.length} Batch(es) to Executive
                  </>
                )}
              </button>
            </div>
          </div>

          {/* Toolbar: Search and Refresh */}
          <div className="bg-white p-4 rounded-3xl border border-slate-200 shadow-xs flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="relative w-full sm:w-80">
              <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search batch, bank, or ID..."
                className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 transition"
              />
            </div>

            <button
              onClick={fetchBatches}
              className="p-2 text-slate-500 hover:bg-slate-100 border border-slate-200 rounded-xl transition cursor-pointer self-end sm:self-auto"
              title="Refresh Batches"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            </button>
          </div>

          {/* Staging List */}
          {loading ? (
            <div className="p-12 text-center bg-white rounded-3xl border border-slate-200">
              <Loader2 className="w-8 h-8 text-indigo-600 animate-spin mx-auto mb-2" />
              <p className="text-xs font-semibold text-slate-500">Loading payout batches from API...</p>
            </div>
          ) : error ? (
            <div className="p-8 text-center bg-rose-50 border border-rose-200 rounded-3xl text-rose-700 text-xs font-medium">
              {error}
            </div>
          ) : (
            <div className="space-y-4">
              {filteredBatches.map((b) => (
                <div
                  key={b.id}
                  className={`bg-white border rounded-3xl p-6 shadow-xs transition ${
                    selectedBatches.includes(b.id)
                      ? 'border-indigo-600 ring-2 ring-indigo-600/10'
                      : 'border-slate-200 hover:border-slate-300'
                  }`}
                >
                  <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
                    <div className="flex items-start gap-4">
                      <input
                        type="checkbox"
                        checked={selectedBatches.includes(b.id)}
                        onChange={() => toggleSelect(b.id)}
                        disabled={!b.routingVerified || b.status === 'Staged for Exec Review'}
                        className="mt-1 h-5 w-5 rounded-lg border-slate-300 text-indigo-600 focus:ring-indigo-500 transition cursor-pointer disabled:cursor-not-allowed"
                      />
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <span className="font-extrabold text-slate-900 text-base">{b.batchName}</span>
                          <span className="text-[11px] font-bold text-slate-500 bg-slate-100 px-2.5 py-0.5 rounded-md">
                            {b.id}
                          </span>
                        </div>
                        <p className="text-xs text-slate-500 font-medium">
                          Pay Period: <span className="font-bold text-slate-700">{b.period}</span> • {b.totalWorkers} Workers
                        </p>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 lg:gap-8 border-t lg:border-t-0 border-slate-100 pt-4 lg:pt-0">
                      <div>
                        <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">Gross Outflow</span>
                        <span className="text-base font-black text-slate-900">
                          BWP {b.grossPayout.toLocaleString('en-BW', { minimumFractionDigits: 2 })}
                        </span>
                      </div>

                      <div>
                        <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">Payout Institution</span>
                        <span className="text-xs font-extrabold text-slate-800 flex items-center gap-1.5 mt-0.5">
                          <Building className="w-3.5 h-3.5 text-indigo-600" /> {b.bankProvider}
                        </span>
                        <span className="text-[10px] text-slate-400 font-semibold">Branch Code: {b.branchCode}</span>
                      </div>

                      <div className="col-span-2 sm:col-span-1 flex flex-col justify-center">
                        <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">Status</span>
                        {b.routingVerified ? (
                          <span className="text-xs font-bold text-emerald-600 flex items-center gap-1 mt-0.5">
                            <CheckCircle className="w-3.5 h-3.5" /> Routing Verified
                          </span>
                        ) : (
                          <span className="text-xs font-bold text-rose-600 flex items-center gap-1 mt-0.5">
                            <AlertCircle className="w-3.5 h-3.5" /> Unverified Code
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-2 border-t lg:border-t-0 border-slate-100 pt-4 lg:pt-0">
                      {b.status === 'Staged for Exec Review' ? (
                        <span className="text-xs font-extrabold text-indigo-600 bg-indigo-50 border border-indigo-200 px-4 py-2.5 rounded-xl w-full text-center">
                          ✓ Staged
                        </span>
                      ) : (
                        <button
                          onClick={() => handleStageBatch(b.id)}
                          disabled={!b.routingVerified}
                          className="w-full lg:w-auto px-4 py-2.5 bg-slate-900 hover:bg-slate-800 disabled:bg-slate-200 text-white font-bold text-xs rounded-xl transition cursor-pointer disabled:cursor-not-allowed flex items-center justify-center gap-1"
                        >
                          Stage Batch <ChevronRight className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </main>
      </div>
    </div>
  );
}