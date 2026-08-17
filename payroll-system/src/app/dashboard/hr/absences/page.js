'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import HRSideNav from '@/components/hr/HRSideNav';
import HRNavbar from '@/components/hr/HRNavbar';
import { 
  FileSearch, 
  Search, 
  Eye, 
  Download, 
  X, 
  CheckCircle2, 
  XCircle, 
  Clock, 
  FileText, 
  User, 
  Calendar,
  AlertCircle,
  Loader2
} from 'lucide-react';

export default function HRAbsenceReviewPage() {
  const [submissions, setSubmissions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedStatus, setSelectedStatus] = useState('Pending');
  const [activeDoc, setActiveDoc] = useState(null);
  const [showRejectInput, setShowRejectInput] = useState(false);
  const [rejectionReason, setRejectionReason] = useState('');
  const [actionLoading, setActionLoading] = useState(false);

  // Status Filter Tabs
  const statusTabs = ['Pending', 'Approved', 'Rejected', 'All'];

  // 1. Fetch Submissions from Supabase
  const fetchSubmissions = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('absence_records')
      .select('*')
      .order('submitted_date', { ascending: false });

    if (error) {
      console.error('Error fetching absence records:', error.message);
    } else if (data) {
      setSubmissions(data);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchSubmissions();
  }, []);

  // Modal Close Handler
  const closeModal = () => {
    setActiveDoc(null);
    setShowRejectInput(false);
    setRejectionReason('');
  };

  // 2. Approve Submission in Supabase
  const handleApprove = async (id) => {
    setActionLoading(true);
    const { error } = await supabase
      .from('absence_records')
      .update({ status: 'Approved', rejection_reason: null })
      .eq('id', id);

    if (error) {
      console.error('Failed to approve record:', error.message);
    } else {
      setSubmissions((prev) =>
        prev.map((item) => (item.id === id ? { ...item, status: 'Approved', rejection_reason: null } : item))
      );
      closeModal();
    }
    setActionLoading(false);
  };

  // 3. Reject Submission in Supabase
  const handleConfirmReject = async (id) => {
    if (!rejectionReason.trim()) return;
    setActionLoading(true);

    const { error } = await supabase
      .from('absence_records')
      .update({ status: 'Rejected', rejection_reason: rejectionReason.trim() })
      .eq('id', id);

    if (error) {
      console.error('Failed to reject record:', error.message);
    } else {
      setSubmissions((prev) =>
        prev.map((item) =>
          item.id === id ? { ...item, status: 'Rejected', rejection_reason: rejectionReason.trim() } : item
        )
      );
      closeModal();
    }
    setActionLoading(false);
  };

  // Filter Logic
  const filteredSubmissions = submissions.filter((sub) => {
    const matchesStatus = selectedStatus === 'All' || sub.status === selectedStatus;
    const searchLower = searchTerm.toLowerCase();
    const matchesSearch =
      (sub.worker_name || '').toLowerCase().includes(searchLower) ||
      (sub.worker_id || '').toLowerCase().includes(searchLower) ||
      (sub.site || '').toLowerCase().includes(searchLower) ||
      (sub.absence_type || '').toLowerCase().includes(searchLower);
    return matchesStatus && matchesSearch;
  });

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col lg:flex-row font-sans">
      {/* HR Side Navigation */}
      <HRSideNav />

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0">
        <HRNavbar />

        <main className="p-4 sm:p-6 lg:p-8 space-y-6 max-w-7xl mx-auto w-full">
          {/* Header Banner */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-6 rounded-3xl border border-slate-200/80 shadow-xs">
            <div>
              <div className="flex items-center gap-2 text-xs font-extrabold text-indigo-600 uppercase tracking-wider mb-1">
                <FileSearch className="w-4 h-4" />
                <span>Absence & Medical Verification</span>
              </div>
              <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
                Document & Absence Review
              </h1>
              <p className="text-slate-500 text-sm mt-1">
                Inspect medical certificates and sick notes submitted by field clerks before locking attendance hours.
              </p>
            </div>
          </div>

          {/* Controls: Search & Status Filters */}
          <div className="bg-white p-4 sm:p-5 rounded-3xl border border-slate-200/80 shadow-xs flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4">
            {/* Search Input */}
            <div className="relative flex-1 max-w-md">
              <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Search worker name, site, or absence type..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-2xl text-xs font-medium text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white transition"
              />
            </div>

            {/* Status Tabs */}
            <div className="flex items-center gap-1.5 overflow-x-auto pb-1 md:pb-0 scrollbar-none">
              {statusTabs.map((tab) => (
                <button
                  key={tab}
                  onClick={() => setSelectedStatus(tab)}
                  className={`px-4 py-2 rounded-xl text-xs font-extrabold transition shrink-0 cursor-pointer ${
                    selectedStatus === tab
                      ? 'bg-indigo-600 text-white shadow-xs'
                      : 'bg-slate-100 text-slate-600 hover:bg-indigo-50 hover:text-indigo-600'
                  }`}
                >
                  {tab}
                </button>
              ))}
            </div>
          </div>

          {/* Submissions Table */}
          <div className="bg-white rounded-3xl border border-slate-200/80 shadow-xs overflow-hidden">
            <div className="p-5 border-b border-slate-100 flex items-center justify-between">
              <h2 className="text-base font-black text-slate-900 flex items-center gap-2">
                <FileText className="w-5 h-5 text-indigo-600" />
                <span>Absence Records ({filteredSubmissions.length})</span>
              </h2>
            </div>

            {loading ? (
              <div className="p-12 text-center flex flex-col items-center justify-center space-y-3">
                <Loader2 className="w-8 h-8 text-indigo-600 animate-spin" />
                <p className="text-slate-500 text-xs font-semibold">Fetching records from Supabase...</p>
              </div>
            ) : filteredSubmissions.length === 0 ? (
              <div className="p-12 text-center space-y-3">
                <div className="w-12 h-12 bg-slate-100 rounded-2xl text-slate-400 flex items-center justify-center mx-auto">
                  <FileSearch className="w-6 h-6" />
                </div>
                <p className="text-slate-600 text-sm font-bold">No absence reviews match this filter.</p>
                <p className="text-slate-400 text-xs">Switch tabs or clear your search query.</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-slate-50/70 border-b border-slate-100 text-[11px] font-extrabold text-slate-400 uppercase tracking-wider">
                      <th className="py-3.5 px-6">Worker & Site</th>
                      <th className="py-3.5 px-6">Absence Type</th>
                      <th className="py-3.5 px-6">Leave Duration</th>
                      <th className="py-3.5 px-6">Submitted Date</th>
                      <th className="py-3.5 px-6">Status</th>
                      <th className="py-3.5 px-6 text-right">Review Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-xs font-medium text-slate-700">
                    {filteredSubmissions.map((sub) => (
                      <tr key={sub.id} className="hover:bg-indigo-50/30 transition">
                        {/* Worker Info */}
                        <td className="py-4 px-6">
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-xl bg-indigo-100 text-indigo-700 font-bold flex items-center justify-center text-xs shrink-0">
                              <User className="w-4 h-4" />
                            </div>
                            <div>
                              <span className="font-bold text-slate-900 block leading-tight">{sub.worker_name}</span>
                              <span className="text-[10px] text-slate-400 font-semibold">{sub.worker_id} • {sub.site}</span>
                            </div>
                          </div>
                        </td>

                        {/* Absence Type */}
                        <td className="py-4 px-6">
                          <span className="font-bold text-slate-800">{sub.absence_type}</span>
                        </td>

                        {/* Duration */}
                        <td className="py-4 px-6">
                          <div className="flex items-center gap-1.5 text-slate-600 font-semibold">
                            <Calendar className="w-3.5 h-3.5 text-slate-400" />
                            <span>{sub.start_date} to {sub.end_date}</span>
                          </div>
                        </td>

                        {/* Submitted Date */}
                        <td className="py-4 px-6 text-slate-500 font-semibold">
                          {sub.submitted_date}
                        </td>

                        {/* Status */}
                        <td className="py-4 px-6">
                          {sub.status === 'Approved' && (
                            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-extrabold bg-emerald-50 text-emerald-700 border border-emerald-200">
                              <CheckCircle2 className="w-3 h-3" />
                              Approved
                            </span>
                          )}
                          {sub.status === 'Pending' && (
                            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-extrabold bg-amber-50 text-amber-700 border border-amber-200">
                              <Clock className="w-3 h-3" />
                              Pending
                            </span>
                          )}
                          {sub.status === 'Rejected' && (
                            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-extrabold bg-rose-50 text-rose-700 border border-rose-200">
                              <XCircle className="w-3 h-3" />
                              Rejected
                            </span>
                          )}
                        </td>

                        {/* Review Action */}
                        <td className="py-4 px-6 text-right">
                          <button
                            onClick={() => {
                              setActiveDoc(sub);
                              setShowRejectInput(false);
                            }}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold transition shadow-xs cursor-pointer"
                          >
                            <Eye className="w-3.5 h-3.5" />
                            <span>Inspect & Review</span>
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

      {/* ========================================================= */}
      {/* INLINE INSPECT & REVIEW MODAL */}
      {/* ========================================================= */}
      {activeDoc && (
        <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-4 sm:p-6 animate-in fade-in duration-200">
          <div className="bg-white w-full max-w-5xl rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh] border border-slate-200">
            {/* Modal Header */}
            <div className="p-4 sm:p-5 border-b border-slate-200 flex items-center justify-between bg-slate-50">
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-2xl bg-indigo-50 text-indigo-600 border border-indigo-100">
                  <FileSearch className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-extrabold text-slate-900 text-sm">{activeDoc.absence_type}</h3>
                  <p className="text-[11px] text-slate-500 font-medium">
                    {activeDoc.worker_name} ({activeDoc.worker_id}) • {activeDoc.site}
                  </p>
                </div>
              </div>
              <button
                onClick={closeModal}
                className="p-2 text-slate-400 hover:text-slate-700 hover:bg-slate-200 rounded-xl transition cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Split View */}
            <div className="grid grid-cols-1 lg:grid-cols-2 overflow-y-auto divide-y lg:divide-y-0 lg:divide-x divide-slate-200">
              {/* Document Preview Pane */}
              <div className="p-6 bg-slate-950/5 flex flex-col justify-between space-y-4">
                <div className="bg-white rounded-2xl p-2 border border-slate-200 shadow-xs overflow-hidden flex items-center justify-center min-h-[300px]">
                  {activeDoc.file_url ? (
                    <img
                      src={activeDoc.file_url}
                      alt={activeDoc.file_name || 'Medical Document'}
                      className="object-contain max-h-[45vh] w-auto rounded-xl"
                    />
                  ) : (
                    <div className="text-center p-6 text-slate-400">
                      <FileText className="w-12 h-12 mx-auto mb-2 opacity-50" />
                      <p className="text-xs font-semibold">No file preview attached</p>
                    </div>
                  )}
                </div>
                <div className="flex items-center justify-between text-xs text-slate-500 font-medium pt-2">
                  <span>File: {activeDoc.file_name || 'N/A'}</span>
                  {activeDoc.file_url && (
                    <a
                      href={activeDoc.file_url}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center gap-1 text-indigo-600 font-bold hover:underline"
                    >
                      <Download className="w-3.5 h-3.5" />
                      Open Original
                    </a>
                  )}
                </div>
              </div>

              {/* Details & Decision Form Pane */}
              <div className="p-6 space-y-6 flex flex-col justify-between bg-white">
                <div className="space-y-4">
                  <h4 className="text-xs font-black text-slate-400 uppercase tracking-wider">
                    Medical & Absence Breakdown
                  </h4>

                  <div className="bg-slate-50 p-4 rounded-2xl space-y-3 border border-slate-100">
                    <div className="flex justify-between text-xs">
                      <span className="text-slate-500 font-medium">Attending Practitioner:</span>
                      <span className="font-bold text-slate-900">{activeDoc.doctor_name || 'N/A'}</span>
                    </div>
                    <div className="flex justify-between text-xs">
                      <span className="text-slate-500 font-medium">Exemption Dates:</span>
                      <span className="font-bold text-slate-900">{activeDoc.start_date} to {activeDoc.end_date}</span>
                    </div>
                    <div className="flex justify-between text-xs">
                      <span className="text-slate-500 font-medium">Submission Date:</span>
                      <span className="font-bold text-slate-900">{activeDoc.submitted_date}</span>
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">Clinical Notes / Reason</label>
                    <p className="p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-700 font-medium leading-relaxed">
                      "{activeDoc.notes || 'No specific notes provided.'}"
                    </p>
                  </div>

                  {/* Show Rejection Reason if already rejected */}
                  {activeDoc.status === 'Rejected' && activeDoc.rejection_reason && (
                    <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl space-y-1">
                      <div className="flex items-center gap-1.5 text-xs font-extrabold text-rose-700">
                        <AlertCircle className="w-4 h-4" />
                        <span>Rejection Reason</span>
                      </div>
                      <p className="text-xs text-rose-600 font-medium">{activeDoc.rejection_reason}</p>
                    </div>
                  )}
                </div>

                {/* Actions Section */}
                <div className="pt-4 border-t border-slate-100 space-y-3">
                  {activeDoc.status === 'Pending' ? (
                    showRejectInput ? (
                      <div className="space-y-3 animate-in fade-in duration-150">
                        <label className="block text-xs font-bold text-rose-700">
                          State Rejection Reason (Required)
                        </label>
                        <textarea
                          rows={2}
                          value={rejectionReason}
                          onChange={(e) => setRejectionReason(e.target.value)}
                          placeholder="e.g. Unclear signature, missing clinic stamp, invalid dates..."
                          className="w-full p-3 bg-slate-50 border border-rose-200 rounded-xl text-xs text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-rose-500"
                        />
                        <div className="flex gap-2">
                          <button
                            onClick={() => setShowRejectInput(false)}
                            disabled={actionLoading}
                            className="flex-1 py-2.5 px-3 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl transition cursor-pointer"
                          >
                            Cancel
                          </button>
                          <button
                            onClick={() => handleConfirmReject(activeDoc.id)}
                            disabled={!rejectionReason.trim() || actionLoading}
                            className="flex-1 py-2.5 px-3 bg-rose-600 hover:bg-rose-700 disabled:opacity-50 text-white font-bold text-xs rounded-xl transition shadow-xs cursor-pointer flex items-center justify-center gap-1.5"
                          >
                            {actionLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <XCircle className="w-4 h-4" />}
                            <span>Confirm Rejection</span>
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div className="flex items-center gap-3">
                        <button
                          onClick={() => setShowRejectInput(true)}
                          disabled={actionLoading}
                          className="flex-1 py-3 px-4 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 font-bold text-xs rounded-2xl transition cursor-pointer flex items-center justify-center gap-1.5"
                        >
                          <XCircle className="w-4 h-4" />
                          <span>Reject Note</span>
                        </button>
                        <button
                          onClick={() => handleApprove(activeDoc.id)}
                          disabled={actionLoading}
                          className="flex-1 py-3 px-4 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-2xl transition shadow-md shadow-emerald-600/20 cursor-pointer flex items-center justify-center gap-1.5"
                        >
                          {actionLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
                          <span>Approve Absence</span>
                        </button>
                      </div>
                    )
                  ) : (
                    <div className="p-3 bg-slate-100 rounded-2xl text-center text-xs font-bold text-slate-600">
                      This submission has been finalized as <span className="uppercase text-indigo-600">{activeDoc.status}</span>.
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}