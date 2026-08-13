'use client';

import { useState } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { 
  Building2, 
  Lock, 
  Unlock, 
  Clock, 
  AlertCircle, 
  Edit3, 
  CheckCircle2, 
  ArrowLeft, 
  Search, 
  ShieldCheck,
  Send,
  FileText
} from 'lucide-react';
import SiteClerkSideNav from '@/components/site-clerk/SiteClerkSideNav';
import SiteClerkNavbar from '@/components/site-clerk/SiteClerkNavbar';

export default function SiteClerkRosterPage() {
  const searchParams = useSearchParams();
  const initialSite = searchParams.get('site') || 'Site A';

  const [selectedSite, setSelectedSite] = useState(initialSite);
  const [isLocked, setIsLocked] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  
  // Modal state for editing shift variances
  const [editingWorker, setEditingWorker] = useState(null);
  const [varianceHours, setVarianceHours] = useState('');
  const [varianceReason, setVarianceReason] = useState('');

  // Initial attendance roster state
  const [roster, setRoster] = useState([
    { id: '1', code: 'EMP-082', name: 'Kabo Tau', role: 'Drill Operator', clockIn: '07:00 AM', clockOut: '04:00 PM', regHours: 8, otHours: 1, status: 'Verified' },
    { id: '2', code: 'EMP-104', name: 'Lame Dube', role: 'Safety Inspector', clockIn: '07:15 AM', clockOut: '04:00 PM', regHours: 8, otHours: 0.75, status: 'Late Arrival' },
    { id: '3', code: 'EMP-019', name: 'Tebogo Moeti', role: 'Haul Driver', clockIn: '07:00 AM', clockOut: '05:30 PM', regHours: 8, otHours: 2.5, status: 'Verified' },
    { id: '4', code: 'EMP-221', name: 'Thato Kgosi', role: 'Plant Technician', clockIn: '08:00 AM', clockOut: '04:00 PM', regHours: 7, otHours: 0, status: 'Variance Flagged' },
    { id: '5', code: 'EMP-309', name: 'Neo Molosiwa', role: 'Site Mechanic', clockIn: '07:00 AM', clockOut: '04:00 PM', regHours: 8, otHours: 0, status: 'Verified' },
  ]);

  const sites = ['Site A', 'Site B', 'Site C', 'Site D', 'Site E'];

  // Handle saving manual variance adjustments
  const handleSaveVariance = (e) => {
    e.preventDefault();
    if (!editingWorker || !varianceReason.trim()) return;

    setRoster(prev => prev.map(worker => {
      if (worker.id === editingWorker.id) {
        return {
          ...worker,
          otHours: parseFloat(varianceHours) || 0,
          status: 'Adjusted & Verified'
        };
      }
      return worker;
    }));

    setEditingWorker(null);
    setVarianceHours('');
    setVarianceReason('');
  };

  // Lock Roster & Submit to HR Action
  const handleLockAndSubmit = () => {
    if (confirm(`Are you sure you want to lock and submit all shift entries for ${selectedSite} to HR? This action freezes timecards for payroll.`)) {
      setIsLocked(true);
    }
  };

  const filteredRoster = roster.filter(w => 
    w.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
    w.code.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-slate-100 text-slate-900 flex flex-col lg:flex-row font-sans">
      {/* Sidebar Navigation */}
      <SiteClerkSideNav />

      {/* Main Content Area */}
      <main className="flex-1 p-4 sm:p-6 lg:p-8 space-y-6 overflow-x-hidden">
        <SiteClerkNavbar title="Shift Log & Roster Lock" siteName={selectedSite} />

        {/* Back Link & Site Switcher */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-4 sm:p-5 rounded-2xl border border-slate-200 shadow-xs">
          <Link
            href="/dashboard/site-clerk"
            className="inline-flex items-center gap-2 text-xs font-bold text-slate-600 hover:text-indigo-600 transition"
          >
            <ArrowLeft className="w-4 h-4" /> Back to Dashboard
          </Link>

          <div className="flex items-center gap-3">
            <span className="text-xs font-semibold text-slate-500">Target Operational Site:</span>
            <select
              value={selectedSite}
              onChange={(e) => setSelectedSite(e.target.value)}
              className="bg-slate-900 text-white text-xs font-bold rounded-xl px-3 py-2 outline-none cursor-pointer focus:ring-2 focus:ring-indigo-500"
            >
              {sites.map((site) => (
                <option key={site} value={site}>{site}</option>
              ))}
            </select>
          </div>
        </div>

        {/* HR Lock Action Banner */}
        <div className={`rounded-3xl p-5 sm:p-6 shadow-md transition-all border ${
          isLocked 
            ? 'bg-slate-900 border-slate-800 text-white' 
            : 'bg-gradient-to-r from-amber-500 to-amber-600 border-amber-400 text-slate-950'
        }`}>
          <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
            <div className="flex items-center gap-3.5">
              <div className={`p-3 rounded-2xl shrink-0 ${isLocked ? 'bg-emerald-500/20 border border-emerald-500/40 text-emerald-400' : 'bg-slate-950/20 text-slate-950'}`}>
                {isLocked ? <Lock className="w-6 h-6" /> : <Unlock className="w-6 h-6" />}
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-xs font-extrabold uppercase tracking-wider opacity-80">Shift Processing Status</span>
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                    isLocked ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40' : 'bg-slate-950/10 text-slate-950 border-slate-950/20'
                  }`}>
                    {isLocked ? 'LOCKED & SUBMITTED' : 'OPEN FOR EDITS'}
                  </span>
                </div>
                <h3 className="text-lg sm:text-xl font-black mt-0.5">
                  {isLocked 
                    ? `${selectedSite} shift entries are locked and submitted to HR compliance.` 
                    : `Finalize shift logs and submit ${selectedSite} hours to HR.`}
                </h3>
              </div>
            </div>

            {!isLocked && (
              <button
                onClick={handleLockAndSubmit}
                className="w-full md:w-auto px-6 py-3 bg-slate-950 hover:bg-slate-900 text-white font-black text-xs uppercase tracking-wider rounded-xl shadow-lg transition flex items-center justify-center gap-2 cursor-pointer active:scale-95 shrink-0"
              >
                <Send className="w-4 h-4 text-emerald-400" /> Submit Shift Roster to HR
              </button>
            )}
          </div>
        </div>

        {/* Daily Attendance Table Section */}
        <div className="bg-white rounded-3xl border border-slate-200 shadow-xs overflow-hidden">
          {/* Table Header Controls */}
          <div className="p-4 sm:p-5 border-b border-slate-100 flex flex-col sm:flex-row items-center justify-between gap-4">
            <div>
              <h4 className="text-base font-extrabold text-slate-900">Daily Attendance Log</h4>
              <p className="text-xs text-slate-500 mt-0.5">Active shift records and calculated hours for {selectedSite}</p>
            </div>

            <div className="relative w-full sm:w-64">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Search worker or ID..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 text-xs rounded-xl pl-9 pr-3 py-2 outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>
          </div>

          {/* Attendance Table */}
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50/80 text-slate-500 text-[11px] font-bold uppercase tracking-wider border-b border-slate-200/80">
                  <th className="py-3.5 px-4">Employee</th>
                  <th className="py-3.5 px-4">Clock In / Out</th>
                  <th className="py-3.5 px-4 text-center">Reg. Hours</th>
                  <th className="py-3.5 px-4 text-center">Overtime</th>
                  <th className="py-3.5 px-4">Status</th>
                  <th className="py-3.5 px-4 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-xs">
                {filteredRoster.map((worker) => (
                  <tr key={worker.id} className="hover:bg-slate-50/50 transition">
                    <td className="py-3.5 px-4">
                      <div className="font-extrabold text-slate-900">{worker.name}</div>
                      <div className="text-[10px] text-slate-400 font-mono">{worker.code} • {worker.role}</div>
                    </td>
                    <td className="py-3.5 px-4">
                      <div className="font-semibold text-slate-800">{worker.clockIn} - {worker.clockOut}</div>
                    </td>
                    <td className="py-3.5 px-4 text-center font-bold text-slate-700">
                      {worker.regHours}h
                    </td>
                    <td className="py-3.5 px-4 text-center font-bold text-amber-600">
                      +{worker.otHours}h
                    </td>
                    <td className="py-3.5 px-4">
                      <span className={`inline-flex items-center gap-1 text-[10px] font-bold px-2.5 py-1 rounded-full border ${
                        worker.status.includes('Verified')
                          ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                          : 'bg-amber-50 text-amber-700 border-amber-200'
                      }`}>
                        {worker.status.includes('Verified') ? <CheckCircle2 className="w-3 h-3" /> : <AlertCircle className="w-3 h-3" />}
                        {worker.status}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 text-right">
                      <button
                        disabled={isLocked}
                        onClick={() => {
                          setEditingWorker(worker);
                          setVarianceHours(worker.otHours.toString());
                        }}
                        className={`inline-flex items-center gap-1 px-3 py-1.5 rounded-lg font-bold text-[11px] transition ${
                          isLocked 
                            ? 'bg-slate-100 text-slate-400 cursor-not-allowed' 
                            : 'bg-indigo-50 hover:bg-indigo-100 text-indigo-700 cursor-pointer'
                        }`}
                      >
                        <Edit3 className="w-3.5 h-3.5" /> Adjust
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Variance & Overtime Modal Drawer */}
        {editingWorker && (
          <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-xs flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-3xl max-w-md w-full p-6 space-y-5 border border-slate-200 shadow-2xl animate-in fade-in zoom-in-95 duration-150">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <div className="flex items-center gap-2">
                  <Clock className="w-5 h-5 text-indigo-600" />
                  <h4 className="text-base font-extrabold text-slate-900">Shift Variance Adjustment</h4>
                </div>
                <button
                  onClick={() => setEditingWorker(null)}
                  className="text-slate-400 hover:text-slate-600 font-bold text-xs"
                >
                  ✕
                </button>
              </div>

              <form onSubmit={handleSaveVariance} className="space-y-4">
                <div className="bg-slate-50 p-3 rounded-2xl border border-slate-200 text-xs">
                  <div className="font-extrabold text-slate-900">{editingWorker.name} ({editingWorker.code})</div>
                  <div className="text-slate-500">{editingWorker.role} • {selectedSite}</div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Overtime Hours Adjustment
                  </label>
                  <input
                    type="number"
                    step="0.25"
                    min="0"
                    max="12"
                    value={varianceHours}
                    onChange={(e) => setVarianceHours(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold outline-none focus:ring-2 focus:ring-indigo-500"
                    placeholder="e.g. 1.5"
                    required
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Mandatory Audit Note / Variance Reason
                  </label>
                  <textarea
                    rows={3}
                    value={varianceReason}
                    onChange={(e) => setVarianceReason(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-xs outline-none focus:ring-2 focus:ring-indigo-500"
                    placeholder="Provide reason for adjustment (e.g. Approved pit breakdown extended shift)..."
                    required
                  />
                </div>

                <div className="flex justify-end gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setEditingWorker(null)}
                    className="px-4 py-2 bg-slate-100 text-slate-700 font-bold text-xs rounded-xl hover:bg-slate-200 transition"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs rounded-xl shadow-xs transition"
                  >
                    Save Variance Entry
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}