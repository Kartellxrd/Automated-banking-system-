'use client';

import { useState, useEffect, useCallback, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
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
  Loader2,
  Calendar,
  MapPin
} from 'lucide-react';
import SiteClerkSideNav from '@/components/site-clerk/SiteClerkSideNav';
import SiteClerkNavbar from '@/components/site-clerk/SiteClerkNavbar';

function RosterLockContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const initialSiteParam = searchParams.get('site') || '';

  // Dynamic Site State (Fetched from API)
  const [sites, setSites] = useState([]);
  const [sitesLoading, setSitesLoading] = useState(true);
  const [selectedSite, setSelectedSite] = useState(initialSiteParam);
  const [shiftDate, setShiftDate] = useState('2026-08-24');

  const [roster, setRoster] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isLocked, setIsLocked] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  // Modal state for editing shift variances
  const [editingWorker, setEditingWorker] = useState(null);
  const [varianceHours, setVarianceHours] = useState('');
  const [varianceReason, setVarianceReason] = useState('');

  // 1. Fetch Dynamic Sites List from API
  useEffect(() => {
    async function fetchSites() {
      try {
        setSitesLoading(true);
        const res = await fetch('/api/site-clerk/dashboard');
        const data = await res.json();

        if (res.ok && data.sites?.length > 0) {
          setSites(data.sites);
          if (!initialSiteParam) {
            const defaultSite = data.selectedSite || data.sites[0].name;
            setSelectedSite(defaultSite);
          }
        } else {
          console.error('Failed to load sites:', data.error);
        }
      } catch (err) {
        console.error('Error fetching sites:', err);
      } finally {
        setSitesLoading(false);
      }
    }

    fetchSites();
  }, [initialSiteParam]);

  // Sync site change with URL parameters
  const handleSiteChange = (newSite) => {
    setSelectedSite(newSite);
    router.replace(`?site=${encodeURIComponent(newSite)}`);
  };

  // 2. Fetch Employees and Timecards via API route
  const loadSiteRoster = useCallback(async () => {
    if (!selectedSite) return;

    setIsLoading(true);
    try {
      const res = await fetch(
        `/api/site-clerk/roster?site=${encodeURIComponent(selectedSite)}&date=${shiftDate}`
      );
      const data = await res.json();

      if (!res.ok) throw new Error(data.error || 'Failed to fetch roster');

      setIsLocked(data.isLocked || false);

      const dbEmployees = data.employees || [];
      const dbAttendance = data.attendance || [];

      const formattedRoster = dbEmployees.map((emp) => {
        const att = dbAttendance.find((a) => a.employee_id === emp.id);

        return {
          id: emp.id,
          attendance_id: att?.id || null,
          code: emp.employee_code || `EMP-${emp.id}`,
          name: `${emp.first_name} ${emp.last_name}`,
          role: emp.job_title || 'General Worker',
          clockIn: att?.clock_in || '07:00 AM',
          clockOut: att?.clock_out || '04:00 PM',
          regHours: att?.regular_hours ?? 8,
          otHours: att?.overtime_hours ?? 0,
          status: att?.status || (att ? 'Verified' : 'Pending Entry'),
          auditNote: att?.audit_note || '',
        };
      });

      setRoster(formattedRoster);
    } catch (err) {
      console.error('Error fetching site roster:', err);
    } finally {
      setIsLoading(false);
    }
  }, [selectedSite, shiftDate]);

  useEffect(() => {
    loadSiteRoster();
  }, [loadSiteRoster]);

  // 3. Save variance adjustments via PATCH API
  const handleSaveVariance = async (e) => {
    e.preventDefault();
    if (!editingWorker || !varianceReason.trim()) return;

    const newOtHours = parseFloat(varianceHours) || 0;

    try {
      const res = await fetch('/api/site-clerk/roster', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          attendanceId: editingWorker.attendance_id,
          employeeId: editingWorker.id,
          site: selectedSite,
          date: shiftDate,
          clockIn: editingWorker.clockIn,
          clockOut: editingWorker.clockOut,
          regHours: editingWorker.regHours,
          otHours: newOtHours,
          auditNote: varianceReason,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to update variance');

      setRoster((prev) =>
        prev.map((worker) => {
          if (worker.id === editingWorker.id) {
            return {
              ...worker,
              attendance_id: data.attendance?.id || worker.attendance_id,
              otHours: newOtHours,
              status: 'Adjusted & Verified',
              auditNote: varianceReason,
            };
          }
          return worker;
        })
      );

      setEditingWorker(null);
      setVarianceHours('');
      setVarianceReason('');
    } catch (err) {
      console.error('Failed to update variance:', err);
      alert(err.message || 'Failed to save variance entry to database.');
    }
  };

  // 4. Lock Roster & Submit to HR via POST API
  const handleLockAndSubmit = async () => {
    if (
      !confirm(
        `Are you sure you want to lock and submit all shift entries for ${selectedSite} on ${shiftDate} to HR? This action freezes timecards for payroll.`
      )
    ) {
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await fetch('/api/site-clerk/roster', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          site: selectedSite,
          date: shiftDate,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to lock shift');

      setIsLocked(true);
    } catch (err) {
      console.error('Failed to lock shift roster:', err);
      alert(err.message || 'Could not lock shift roster. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const filteredRoster = roster.filter(
    (w) =>
      w.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      w.code.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-slate-100 text-slate-900 flex flex-col lg:flex-row font-sans">
      <SiteClerkSideNav />

      <main className="flex-1 p-4 sm:p-6 lg:p-8 space-y-6 overflow-x-hidden">
        <SiteClerkNavbar title="Shift Log & Roster Lock" siteName={selectedSite || 'Loading...'} />

        {/* Back Link, Date Selector & Dynamic Site Switcher */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-4 sm:p-5 rounded-2xl border border-slate-200 shadow-xs">
          <Link
            href="/dashboard/site-clerk"
            className="inline-flex items-center gap-2 text-xs font-bold text-slate-600 hover:text-indigo-600 transition"
          >
            <ArrowLeft className="w-4 h-4" /> Back to Dashboard
          </Link>

          <div className="flex flex-wrap items-center gap-3">
            <div className="flex items-center gap-2 bg-slate-50 border border-slate-200 rounded-xl px-3 py-1.5">
              <Calendar className="w-4 h-4 text-slate-400" />
              <input
                type="date"
                value={shiftDate}
                onChange={(e) => setShiftDate(e.target.value)}
                className="bg-transparent text-xs font-bold text-slate-700 outline-none cursor-pointer"
              />
            </div>

            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold text-slate-500">Target Station:</span>
              {sitesLoading ? (
                <div className="flex items-center gap-2 text-xs text-slate-500 bg-slate-50 border border-slate-200 rounded-xl px-3 py-1.5">
                  <Loader2 className="w-3.5 h-3.5 animate-spin text-indigo-600" />
                  <span>Loading...</span>
                </div>
              ) : (
                <select
                  value={selectedSite}
                  onChange={(e) => handleSiteChange(e.target.value)}
                  className="bg-slate-900 text-white text-xs font-bold rounded-xl px-3 py-2 outline-none cursor-pointer focus:ring-2 focus:ring-indigo-500"
                >
                  {sites.map((site) => (
                    <option key={site.id || site.name} value={site.name}>
                      {site.name}
                    </option>
                  ))}
                </select>
              )}
            </div>
          </div>
        </div>

        {/* HR Lock Action Banner */}
        <div
          className={`rounded-3xl p-5 sm:p-6 shadow-md transition-all border ${
            isLocked
              ? 'bg-slate-900 border-slate-800 text-white'
              : 'bg-gradient-to-r from-amber-500 to-amber-600 border-amber-400 text-slate-950'
          }`}
        >
          <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
            <div className="flex items-center gap-3.5">
              <div
                className={`p-3 rounded-2xl shrink-0 ${
                  isLocked
                    ? 'bg-emerald-500/20 border border-emerald-500/40 text-emerald-400'
                    : 'bg-slate-950/20 text-slate-950'
                }`}
              >
                {isLocked ? <Lock className="w-6 h-6" /> : <Unlock className="w-6 h-6" />}
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-xs font-extrabold uppercase tracking-wider opacity-80">
                    Shift Processing Status
                  </span>
                  <span
                    className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                      isLocked
                        ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
                        : 'bg-slate-950/10 text-slate-950 border-slate-950/20'
                    }`}
                  >
                    {isLocked ? 'LOCKED & SUBMITTED' : 'OPEN FOR EDITS'}
                  </span>
                </div>
                <h3 className="text-lg sm:text-xl font-black mt-0.5">
                  {isLocked
                    ? `${selectedSite} shift entries for ${shiftDate} are locked and submitted to HR compliance.`
                    : `Finalize shift logs and submit ${selectedSite} hours for ${shiftDate} to HR.`}
                </h3>
              </div>
            </div>

            {!isLocked && (
              <button
                disabled={isSubmitting}
                onClick={handleLockAndSubmit}
                className="w-full md:w-auto px-6 py-3 bg-slate-950 hover:bg-slate-900 text-white font-black text-xs uppercase tracking-wider rounded-xl shadow-lg transition flex items-center justify-center gap-2 cursor-pointer active:scale-95 shrink-0 disabled:opacity-50"
              >
                {isSubmitting ? (
                  <Loader2 className="w-4 h-4 animate-spin text-amber-400" />
                ) : (
                  <Send className="w-4 h-4 text-emerald-400" />
                )}
                Submit Shift Roster to HR
              </button>
            )}
          </div>
        </div>

        {/* Daily Attendance Table Section */}
        <div className="bg-white rounded-3xl border border-slate-200 shadow-xs overflow-hidden">
          <div className="p-4 sm:p-5 border-b border-slate-100 flex flex-col sm:flex-row items-center justify-between gap-4">
            <div>
              <h4 className="text-base font-extrabold text-slate-900">Daily Attendance Log</h4>
              <p className="text-xs text-slate-500 mt-0.5">
                Active shift records and calculated hours for {selectedSite} ({shiftDate})
              </p>
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
                {isLoading ? (
                  <tr>
                    <td colSpan={6} className="py-8 text-center text-slate-400">
                      <div className="flex justify-center items-center gap-2">
                        <Loader2 className="w-5 h-5 animate-spin text-indigo-600" />
                        <span>Loading {selectedSite} roster...</span>
                      </div>
                    </td>
                  </tr>
                ) : filteredRoster.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-8 text-center text-slate-400 font-medium">
                      No personnel records found for {selectedSite}.
                    </td>
                  </tr>
                ) : (
                  filteredRoster.map((worker) => (
                    <tr key={worker.id} className="hover:bg-slate-50/50 transition">
                      <td className="py-3.5 px-4">
                        <div className="font-extrabold text-slate-900">{worker.name}</div>
                        <div className="text-[10px] text-slate-400 font-mono">
                          {worker.code} • {worker.role}
                        </div>
                      </td>
                      <td className="py-3.5 px-4">
                        <div className="font-semibold text-slate-800">
                          {worker.clockIn} - {worker.clockOut}
                        </div>
                      </td>
                      <td className="py-3.5 px-4 text-center font-bold text-slate-700">
                        {worker.regHours}h
                      </td>
                      <td className="py-3.5 px-4 text-center font-bold text-amber-600">
                        +{worker.otHours}h
                      </td>
                      <td className="py-3.5 px-4">
                        <span
                          className={`inline-flex items-center gap-1 text-[10px] font-bold px-2.5 py-1 rounded-full border ${
                            worker.status.includes('Verified')
                              ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                              : 'bg-amber-50 text-amber-700 border-amber-200'
                          }`}
                        >
                          {worker.status.includes('Verified') ? (
                            <CheckCircle2 className="w-3 h-3" />
                          ) : (
                            <AlertCircle className="w-3 h-3" />
                          )}
                          {worker.status}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 text-right">
                        <button
                          disabled={isLocked}
                          onClick={() => {
                            setEditingWorker(worker);
                            setVarianceHours(worker.otHours.toString());
                            setVarianceReason(worker.auditNote || '');
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
                  ))
                )}
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
                  <div className="font-extrabold text-slate-900">
                    {editingWorker.name} ({editingWorker.code})
                  </div>
                  <div className="text-slate-500">
                    {editingWorker.role} • {selectedSite}
                  </div>
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
                    placeholder="Provide reason for adjustment..."
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

export default function SiteClerkRosterPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex justify-center items-center bg-slate-100 text-xs text-slate-400 font-bold">
          <Loader2 className="w-5 h-5 animate-spin text-indigo-600 mr-2" />
          Loading Roster Page...
        </div>
      }
    >
      <RosterLockContent />
    </Suspense>
  );
}