'use client';

import { useState, useEffect, useCallback } from 'react';
import HRSideNav from '@/components/hr/HRSideNav';
import HRNavbar from '@/components/hr/HRNavbar';
import { 
  ShieldCheck, 
  Search, 
  CheckCircle2, 
  AlertTriangle, 
  Clock, 
  FileCheck, 
  User, 
  ArrowRight,
  AlertCircle,
  X,
  Loader2
} from 'lucide-react';

export default function HRComplianceMatchingPage() {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedFilter, setSelectedFilter] = useState('All');
  const [activeMatch, setActiveMatch] = useState(null);
  const [records, setRecords] = useState([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [error, setError] = useState(null);

  const filterTabs = ['All', 'Matched', 'Rate Mismatch', 'Cert Expired'];

  // Fetch compliance records directly from Supabase API endpoint
  const fetchRecords = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      if (selectedFilter !== 'All') params.append('status', selectedFilter);
      if (searchTerm.trim()) params.append('search', searchTerm.trim());

      const res = await fetch(`/api/hr/complaince?${params.toString()}`);
      const result = await res.json();

      if (!res.ok || !result.success) {
        throw new Error(result.error || 'Failed to fetch compliance records');
      }

      setRecords(result.data || []);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [selectedFilter, searchTerm]);

  // Debounce API requests on search and tab changes
  useEffect(() => {
    const timer = setTimeout(() => {
      fetchRecords();
    }, 300);

    return () => clearTimeout(timer);
  }, [fetchRecords]);

  // Force Align Action Handler
  const handleApproveMatch = async (id) => {
    setActionLoading(true);
    try {
      const res = await fetch('/api/hr/complaince', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, action: 'FORCE_ALIGN' }),
      });

      const result = await res.json();

      if (!res.ok || !result.success) {
        throw new Error(result.error || 'Failed to align record');
      }

      // Optimistically update status in state
      setRecords((prev) =>
        prev.map((item) =>
          item.id === id ? { ...item, complianceStatus: 'Matched', mismatchDetails: null } : item
        )
      );
      setActiveMatch(null);
    } catch (err) {
      alert(`Action failed: ${err.message}`);
    } finally {
      setActionLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col lg:flex-row font-sans">
      <HRSideNav />

      <div className="flex-1 flex flex-col min-w-0">
        <HRNavbar />

        <main className="p-4 sm:p-6 lg:p-8 space-y-6 max-w-7xl mx-auto w-full">
          {/* Header Banner */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-6 rounded-3xl border border-slate-200/80 shadow-xs">
            <div>
              <div className="flex items-center gap-2 text-xs font-extrabold text-indigo-600 uppercase tracking-wider mb-1">
                <ShieldCheck className="w-4 h-4" />
                <span>Rate Card & Certification Verification</span>
              </div>
              <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
                Compliance Matching
              </h1>
              <p className="text-slate-500 text-sm mt-1">
                Verify logged site hours against binding employment contracts and safety certifications before sending records to staging.
              </p>
            </div>
          </div>

          {/* Controls: Search & Filter Tabs */}
          <div className="bg-white p-4 sm:p-5 rounded-3xl border border-slate-200/80 shadow-xs flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4">
            <div className="relative flex-1 max-w-md">
              <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Search worker name, ID, site, or job title..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-2xl text-xs font-medium text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white transition"
              />
            </div>

            <div className="flex items-center gap-1.5 overflow-x-auto pb-1 md:pb-0 scrollbar-none">
              {filterTabs.map((tab) => (
                <button
                  key={tab}
                  onClick={() => setSelectedFilter(tab)}
                  className={`px-3.5 py-2 rounded-xl text-xs font-extrabold transition shrink-0 cursor-pointer ${
                    selectedFilter === tab
                      ? 'bg-indigo-600 text-white shadow-xs'
                      : 'bg-slate-100 text-slate-600 hover:bg-indigo-50 hover:text-indigo-600'
                  }`}
                >
                  {tab}
                </button>
              ))}
            </div>
          </div>

          {/* Compliance Records Table */}
          <div className="bg-white rounded-3xl border border-slate-200/80 shadow-xs overflow-hidden">
            <div className="p-5 border-b border-slate-100 flex items-center justify-between">
              <h2 className="text-base font-black text-slate-900 flex items-center gap-2">
                <FileCheck className="w-5 h-5 text-indigo-600" />
                <span>Compliance Entries ({records.length})</span>
              </h2>
            </div>

            {loading ? (
              <div className="p-12 text-center space-y-3">
                <Loader2 className="w-6 h-6 text-indigo-600 animate-spin mx-auto" />
                <p className="text-slate-500 text-xs font-semibold">Fetching compliance data from database...</p>
              </div>
            ) : error ? (
              <div className="p-12 text-center space-y-2">
                <AlertCircle className="w-6 h-6 text-rose-500 mx-auto" />
                <p className="text-slate-900 text-sm font-bold">Failed to load records</p>
                <p className="text-slate-500 text-xs">{error}</p>
              </div>
            ) : records.length === 0 ? (
              <div className="p-12 text-center space-y-3">
                <div className="w-12 h-12 bg-slate-100 rounded-2xl text-slate-400 flex items-center justify-center mx-auto">
                  <ShieldCheck className="w-6 h-6" />
                </div>
                <p className="text-slate-600 text-sm font-bold">No compliance matching entries found.</p>
                <p className="text-slate-400 text-xs">Try adjusting your filters or search term.</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-slate-50/70 border-b border-slate-100 text-[11px] font-extrabold text-slate-400 uppercase tracking-wider">
                      <th className="py-3.5 px-6">Worker & Site</th>
                      <th className="py-3.5 px-6">Role & Hours</th>
                      <th className="py-3.5 px-6">Contract Rate</th>
                      <th className="py-3.5 px-6">Billed Rate</th>
                      <th className="py-3.5 px-6">Status</th>
                      <th className="py-3.5 px-6 text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-xs font-medium text-slate-700">
                    {records.map((rec) => (
                      <tr key={rec.id} className="hover:bg-indigo-50/30 transition">
                        <td className="py-4 px-6">
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-xl bg-indigo-100 text-indigo-700 font-bold flex items-center justify-center text-xs shrink-0">
                              <User className="w-4 h-4" />
                            </div>
                            <div>
                              <span className="font-bold text-slate-900 block leading-tight">{rec.workerName}</span>
                              <span className="text-[10px] text-slate-400 font-semibold">{rec.workerId} • {rec.site}</span>
                            </div>
                          </div>
                        </td>

                        <td className="py-4 px-6">
                          <div>
                            <span className="font-bold text-slate-800 block">{rec.jobTitle}</span>
                            <span className="text-[10px] text-slate-400 font-semibold">{rec.loggedHours} hrs logged</span>
                          </div>
                        </td>

                        <td className="py-4 px-6 font-bold text-slate-900">
                          {rec.contractRate}
                        </td>

                        <td className="py-4 px-6 font-bold text-slate-900">
                          {rec.timesheetRate}
                        </td>

                        <td className="py-4 px-6">
                          {rec.complianceStatus === 'Matched' && (
                            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-extrabold bg-emerald-50 text-emerald-700 border border-emerald-200">
                              <CheckCircle2 className="w-3 h-3" />
                              Matched
                            </span>
                          )}
                          {rec.complianceStatus === 'Rate Mismatch' && (
                            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-extrabold bg-amber-50 text-amber-700 border border-amber-200">
                              <AlertTriangle className="w-3 h-3" />
                              Rate Mismatch
                            </span>
                          )}
                          {rec.complianceStatus === 'Cert Expired' && (
                            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-extrabold bg-rose-50 text-rose-700 border border-rose-200">
                              <AlertCircle className="w-3 h-3" />
                              Cert Expired
                            </span>
                          )}
                        </td>

                        <td className="py-4 px-6 text-right">
                          <button
                            onClick={() => setActiveMatch(rec)}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold transition shadow-xs cursor-pointer"
                          >
                            <span>Inspect & Pair</span>
                            <ArrowRight className="w-3.5 h-3.5" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </main>
      </div>

      {/* INSPECT & RATE PAIRING MODAL */}
      {activeMatch && (
        <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-4 sm:p-6 animate-in fade-in duration-200">
          <div className="bg-white w-full max-w-2xl rounded-3xl shadow-2xl overflow-hidden flex flex-col border border-slate-200">
            <div className="p-4 sm:p-5 border-b border-slate-200 flex items-center justify-between bg-slate-50">
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-2xl bg-indigo-50 text-indigo-600 border border-indigo-100">
                  <ShieldCheck className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-extrabold text-slate-900 text-sm">Rate & Certification Pair Review</h3>
                  <p className="text-[11px] text-slate-500 font-medium">
                    {activeMatch.workerName} ({activeMatch.workerId}) • {activeMatch.site}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setActiveMatch(null)}
                disabled={actionLoading}
                className="p-2 text-slate-400 hover:text-slate-700 hover:bg-slate-200 rounded-xl transition cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-6 bg-white">
              <div className="grid grid-cols-2 gap-4 bg-slate-50 p-4 rounded-2xl border border-slate-100">
                <div>
                  <span className="text-[10px] font-black text-slate-400 uppercase">Contract Rate</span>
                  <p className="text-base font-black text-slate-900 mt-0.5">{activeMatch.contractRate}</p>
                </div>
                <div>
                  <span className="text-[10px] font-black text-slate-400 uppercase">Timesheet Billed Rate</span>
                  <p className={`text-base font-black mt-0.5 ${activeMatch.contractRate !== activeMatch.timesheetRate ? 'text-amber-600' : 'text-slate-900'}`}>
                    {activeMatch.timesheetRate}
                  </p>
                </div>
              </div>

              {activeMatch.mismatchDetails && (
                <div className="p-4 bg-amber-50 border border-amber-200 rounded-2xl space-y-1">
                  <div className="flex items-center gap-2 text-amber-800 font-bold text-xs">
                    <AlertTriangle className="w-4 h-4 text-amber-600" />
                    <span>Compliance Discrepancy Flag</span>
                  </div>
                  <p className="text-xs text-amber-700 font-medium pl-6">{activeMatch.mismatchDetails}</p>
                </div>
              )}

              <div className="space-y-3">
                <div className="flex justify-between items-center text-xs py-2 border-b border-slate-100">
                  <span className="text-slate-500 font-medium">Job Role:</span>
                  <span className="font-bold text-slate-900">{activeMatch.jobTitle}</span>
                </div>
                <div className="flex justify-between items-center text-xs py-2 border-b border-slate-100">
                  <span className="text-slate-500 font-medium">Total Billed Shift Hours:</span>
                  <span className="font-bold text-slate-900">{activeMatch.loggedHours} Hours</span>
                </div>
                <div className="flex justify-between items-center text-xs py-2 border-b border-slate-100">
                  <span className="text-slate-500 font-medium">Mine Safety Certification:</span>
                  <span className={`font-bold ${activeMatch.certStatus === 'Valid' ? 'text-emerald-600' : 'text-rose-600'}`}>
                    {activeMatch.certStatus} (Expires: {activeMatch.certExpiry})
                  </span>
                </div>
              </div>
            </div>

            <div className="p-4 sm:p-5 border-t border-slate-100 bg-slate-50 flex items-center justify-end gap-3">
              <button
                onClick={() => setActiveMatch(null)}
                disabled={actionLoading}
                className="px-4 py-2.5 text-xs font-bold text-slate-600 hover:bg-slate-200 rounded-xl transition disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                onClick={() => handleApproveMatch(activeMatch.id)}
                disabled={actionLoading}
                className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs rounded-xl transition shadow-md shadow-indigo-600/20 flex items-center gap-2 disabled:opacity-50 cursor-pointer"
              >
                {actionLoading && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                <span>Force Align & Confirm Match</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}