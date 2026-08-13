'use client';

import { useState } from 'react';
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
  ShieldCheck, 
  User, 
  Building2,
  Calendar,
  AlertCircle
} from 'lucide-react';

export default function HRAbsenceReviewPage() {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedStatus, setSelectedStatus] = useState('Pending');
  const [activeDoc, setActiveDoc] = useState(null);
  const [rejectionReason, setRejectionReason] = useState('');

  // Mock Absence & Medical Submissions Data
  const [submissions, setSubmissions] = useState([
    {
      id: 'ABS-501',
      workerName: 'Kago Phuthego',
      workerId: 'EMP-8802',
      site: 'Jwaneng Pit B',
      absenceType: 'Sick Leave / Medical Note',
      submittedDate: '2026-08-12',
      startDate: '2026-08-12',
      endDate: '2026-08-14',
      status: 'Pending',
      doctorName: 'Dr. M. Tau (Gaborone Private Hospital)',
      fileName: 'medical_cert_kago.pdf',
      fileUrl: 'https://images.unsplash.com/photo-1584515979956-d9f6e5d09982?auto=format&fit=crop&q=80&w=800',
      notes: 'Patient diagnosed with severe acute respiratory infection; advised 3 days off shift.',
    },
    {
      id: 'ABS-502',
      workerName: 'Thabo Mokoena',
      workerId: 'EMP-4105',
      site: 'Orapa Shaft 3',
      absenceType: 'Unplanned Emergency Leave',
      submittedDate: '2026-08-11',
      startDate: '2026-08-11',
      endDate: '2026-08-11',
      status: 'Pending',
      doctorName: 'N/A (Personal Emergency)',
      fileName: 'emergency_letter_thabo.png',
      fileUrl: 'https://images.unsplash.com/photo-1554224155-8d04cb21cd6c?auto=format&fit=crop&q=80&w=800',
      notes: 'Family emergency, requested 1 shift absence.',
    },
    {
      id: 'ABS-503',
      workerName: 'Kabelo Sechele',
      workerId: 'EMP-2901',
      site: 'Karowe Diamond Mine',
      absenceType: 'Occupational Injury Note',
      submittedDate: '2026-08-09',
      startDate: '2026-08-09',
      endDate: '2026-08-16',
      status: 'Approved',
      doctorName: 'Dr. O. Kgosi (Mine Clinic)',
      fileName: 'mine_injury_report.pdf',
      fileUrl: 'https://images.unsplash.com/photo-1568602471122-7832951cc4c5?auto=format&fit=crop&q=80&w=800',
      notes: 'Ankle sprain during pit inspection; cleared for light duty post-recovery.',
    },
    {
      id: 'ABS-504',
      workerName: 'Lindiwe Dlamini',
      workerId: 'EMP-6043',
      site: 'Jwaneng Plant 1',
      absenceType: 'Medical Sick Note',
      submittedDate: '2026-08-08',
      startDate: '2026-08-08',
      endDate: '2026-08-09',
      status: 'Rejected',
      doctorName: 'Unverified Clinic Stamp',
      fileName: 'clinic_receipt_unclear.png',
      fileUrl: 'https://images.unsplash.com/photo-1450133064473-71024230f91b?auto=format&fit=crop&q=80&w=800',
      notes: 'Invalid medical stamp, signature missing.',
    },
  ]);

  // Status Filter Tabs
  const statusTabs = ['Pending', 'Approved', 'Rejected', 'All'];

  // Approval Handler
  const handleApprove = (id) => {
    setSubmissions((prev) =>
      prev.map((item) => (item.id === id ? { ...item, status: 'Approved' } : item))
    );
    setActiveDoc(null);
  };

  // Rejection Handler
  const handleReject = (id) => {
    setSubmissions((prev) =>
      prev.map((item) => (item.id === id ? { ...item, status: 'Rejected' } : item))
    );
    setActiveDoc(null);
    setRejectionReason('');
  };

  // Filter Logic
  const filteredSubmissions = submissions.filter((sub) => {
    const matchesStatus = selectedStatus === 'All' || sub.status === selectedStatus;
    const matchesSearch =
      sub.workerName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      sub.workerId.toLowerCase().includes(searchTerm.toLowerCase()) ||
      sub.site.toLowerCase().includes(searchTerm.toLowerCase()) ||
      sub.absenceType.toLowerCase().includes(searchTerm.toLowerCase());
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

            {filteredSubmissions.length === 0 ? (
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
                              <span className="font-bold text-slate-900 block leading-tight">{sub.workerName}</span>
                              <span className="text-[10px] text-slate-400 font-semibold">{sub.workerId} • {sub.site}</span>
                            </div>
                          </div>
                        </td>

                        {/* Absence Type */}
                        <td className="py-4 px-6">
                          <span className="font-bold text-slate-800">{sub.absenceType}</span>
                        </td>

                        {/* Duration */}
                        <td className="py-4 px-6">
                          <div className="flex items-center gap-1.5 text-slate-600 font-semibold">
                            <Calendar className="w-3.5 h-3.5 text-slate-400" />
                            <span>{sub.startDate} to {sub.endDate}</span>
                          </div>
                        </td>

                        {/* Submitted Date */}
                        <td className="py-4 px-6 text-slate-500 font-semibold">
                          {sub.submittedDate}
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
                            onClick={() => setActiveDoc(sub)}
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
                  <h3 className="font-extrabold text-slate-900 text-sm">{activeDoc.absenceType}</h3>
                  <p className="text-[11px] text-slate-500 font-medium">
                    {activeDoc.workerName} ({activeDoc.workerId}) • {activeDoc.site}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setActiveDoc(null)}
                className="p-2 text-slate-400 hover:text-slate-700 hover:bg-slate-200 rounded-xl transition cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Split View */}
            <div className="grid grid-cols-1 lg:grid-cols-2 overflow-y-auto divide-y lg:divide-y-0 lg:divide-x divide-slate-200">
              {/* Document Preview Pane */}
              <div className="p-6 bg-slate-950/5 flex flex-col justify-between space-y-4">
                <div className="bg-white rounded-2xl p-2 border border-slate-200 shadow-sm overflow-hidden flex items-center justify-center min-h-[300px]">
                  <img
                    src={activeDoc.fileUrl}
                    alt={activeDoc.fileName}
                    className="object-contain max-h-[45vh] w-auto rounded-xl"
                  />
                </div>
                <div className="flex items-center justify-between text-xs text-slate-500 font-medium pt-2">
                  <span>File: {activeDoc.fileName}</span>
                  <a
                    href={activeDoc.fileUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1 text-indigo-600 font-bold hover:underline"
                  >
                    <Download className="w-3.5 h-3.5" />
                    Open Original
                  </a>
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
                      <span className="text-slate-500 font-medium">Attending Medical Practitioner:</span>
                      <span className="font-bold text-slate-900">{activeDoc.doctorName}</span>
                    </div>
                    <div className="flex justify-between text-xs">
                      <span className="text-slate-500 font-medium">Exemption Dates:</span>
                      <span className="font-bold text-slate-900">{activeDoc.startDate} to {activeDoc.endDate}</span>
                    </div>
                    <div className="flex justify-between text-xs">
                      <span className="text-slate-500 font-medium">Submission Date:</span>
                      <span className="font-bold text-slate-900">{activeDoc.submittedDate}</span>
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">Doctor's Clinical Notes / Reason</label>
                    <p className="p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-700 font-medium leading-relaxed">
                      "{activeDoc.notes}"
                    </p>
                  </div>
                </div>

                {/* Actions Section */}
                <div className="pt-4 border-t border-slate-100 space-y-3">
                  {activeDoc.status === 'Pending' ? (
                    <div className="flex items-center gap-3">
                      <button
                        onClick={() => handleReject(activeDoc.id)}
                        className="flex-1 py-3 px-4 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 font-bold text-xs rounded-2xl transition cursor-pointer flex items-center justify-center gap-1.5"
                      >
                        <XCircle className="w-4 h-4" />
                        <span>Reject Note</span>
                      </button>
                      <button
                        onClick={() => handleApprove(activeDoc.id)}
                        className="flex-1 py-3 px-4 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-2xl transition shadow-md shadow-emerald-600/20 cursor-pointer flex items-center justify-center gap-1.5"
                      >
                        <CheckCircle2 className="w-4 h-4" />
                        <span>Approve Absence</span>
                      </button>
                    </div>
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