'use client';

import { useState, useEffect } from 'react';
import {
  Users,
  Clock,
  UserCheck,
  UserX,
  Search,
  Plus,
  RefreshCw,
  CheckCircle2,
  AlertCircle,
  X,
  QrCode,
  MapPin,
  Calendar,
  LogOut,
  Send
} from 'lucide-react';
import { supabase } from '@/lib/supabase';
import SiteClerkSideNav from '@/components/site-clerk/SiteClerkSideNav';
import SiteClerkNavbar from '@/components/site-clerk/SiteClerkNavbar';

export default function SiteClerkDashboardPage() {
  const [attendance, setAttendance] = useState([]);
  const [allProfiles, setAllProfiles] = useState([]);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState({ type: '', text: '' });

  // Search & Filter
  const [searchQuery, setSearchQuery] = useState('');

  // Manual Override Modal
  const [isManualModalOpen, setIsManualModalOpen] = useState(false);
  const [manualData, setManualData] = useState({
    employee_id: '',
    action_type: 'clock_in', // 'clock_in' or 'clock_out'
    site_location: 'Debete Site'
  });

  useEffect(() => {
    fetchTodayData();
  }, []);

  const fetchTodayData = async () => {
    setLoading(true);
    try {
      // 1. Fetch all profiles for manual selection lookup
      const { data: profilesData, error: profilesError } = await supabase
        .from('profiles')
        .select('*');

      if (profilesError) throw profilesError;
      setAllProfiles(profilesData || []);

      // 2. Fetch today's attendance logs
      const startOfDay = new Date();
      startOfDay.setHours(0, 0, 0, 0);

      const { data: attendanceData, error: attendanceError } = await supabase
        .from('site_attendance')
        .select(`
          *,
          profiles (
            first_name,
            last_name,
            email,
            role
          )
        `)
        .gte('created_at', startOfDay.toISOString())
        .order('clock_in', { ascending: false });

      if (attendanceError) throw attendanceError;
      setAttendance(attendanceData || []);
    } catch (err) {
      console.error('Error loading shift data:', err);
      setMessage({ type: 'error', text: err.message || 'Failed to fetch attendance logs' });
    } fontFinally: {
      setLoading(false);
    }
  };

  // Manual Override Clock-In / Clock-Out
  const handleManualAction = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    setMessage({ type: '', text: '' });

    try {
      if (!manualData.employee_id) {
        throw new Error('Please select an employee');
      }

      const now = new Date().toISOString();

      if (manualData.action_type === 'clock_in') {
        // Create new clock-in entry
        const { error } = await supabase
          .from('site_attendance')
          .insert([
            {
              employee_id: manualData.employee_id,
              site_location: manualData.site_location,
              clock_in: now,
              status: 'on_time'
            }
          ]);

        if (error) throw error;
        setMessage({ type: 'success', text: 'Worker manually clocked IN successfully!' });
      } else {
        // Find existing open session and clock out
        const openSession = attendance.find(
          (a) => a.employee_id === manualData.employee_id && !a.clock_out
        );

        if (!openSession) {
          throw new Error('No active clock-in session found for this worker today.');
        }

        const { error } = await supabase
          .from('site_attendance')
          .update({ clock_out: now })
          .eq('id', openSession.id);

        if (error) throw error;
        setMessage({ type: 'success', text: 'Worker manually clocked OUT successfully!' });
      }

      setIsManualModalOpen(false);
      setManualData({ employee_id: '', action_type: 'clock_in', site_location: 'Debete Site' });
      fetchTodayData();
    } catch (err) {
      setMessage({ type: 'error', text: err.message });
    } finally {
      setSubmitting(false);
    }
  };

  // Quick One-Tap Clock Out from Table
  const handleQuickClockOut = async (attendanceId) => {
    try {
      const now = new Date().toISOString();
      const { error } = await supabase
        .from('site_attendance')
        .update({ clock_out: now })
        .eq('id', attendanceId);

      if (error) throw error;
      setMessage({ type: 'success', text: 'Clocked out worker.' });
      fetchTodayData();
    } catch (err) {
      setMessage({ type: 'error', text: err.message });
    }
  };

  // Filter attendance table by search query
  const filteredAttendance = attendance.filter((item) => {
    const workerName = `${item.profiles?.first_name || ''} ${item.profiles?.last_name || ''}`.toLowerCase();
    const query = searchQuery.toLowerCase();
    return workerName.includes(query);
  });

  // Calculate Shift Metrics
  const totalClockedIn = attendance.length;
  const currentlyOnSite = attendance.filter((a) => !a.clock_out).length;
  const completedShifts = attendance.filter((a) => a.clock_out).length;

  return (
    <div className="min-h-screen bg-slate-100 text-slate-900 flex flex-col lg:flex-row font-sans">
      {/* 1. Sidebar */}
      <SiteClerkSideNav />

      {/* 2. Main Work Area */}
      <main className="flex-1 p-4 sm:p-6 lg:p-8 space-y-6 overflow-x-hidden">
        {/* Top Header */}
        <SiteClerkNavbar title="Shift Overview & Attendance" siteName="Debete Site" />

        {/* Global Toast Notification */}
        {message.text && (
          <div
            className={`p-4 rounded-2xl text-xs font-semibold flex items-center justify-between shadow-xs transition animate-in fade-in ${
              message.type === 'success'
                ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                : 'bg-rose-50 text-rose-800 border border-rose-200'
            }`}
          >
            <div className="flex items-center gap-2.5">
              {message.type === 'success' ? (
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              ) : (
                <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
              )}
              <span>{message.text}</span>
            </div>
            <button onClick={() => setMessage({ type: '', text: '' })} className="p-1 hover:opacity-75">
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* Metrics Row */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="bg-white border border-slate-200 p-5 rounded-2xl flex items-center justify-between shadow-xs">
            <div>
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Currently On Site</p>
              <p className="text-2xl font-bold text-indigo-600 mt-1">{currentlyOnSite}</p>
            </div>
            <div className="p-3 bg-indigo-50 border border-indigo-100 rounded-xl text-indigo-600">
              <UserCheck className="w-5 h-5" />
            </div>
          </div>

          <div className="bg-white border border-slate-200 p-5 rounded-2xl flex items-center justify-between shadow-xs">
            <div>
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Completed Shifts</p>
              <p className="text-2xl font-bold text-emerald-600 mt-1">{completedShifts}</p>
            </div>
            <div className="p-3 bg-emerald-50 border border-emerald-100 rounded-xl text-emerald-600">
              <Clock className="w-5 h-5" />
            </div>
          </div>

          <div className="bg-white border border-slate-200 p-5 rounded-2xl flex items-center justify-between shadow-xs">
            <div>
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Total Shift Logs</p>
              <p className="text-2xl font-bold text-slate-900 mt-1">{totalClockedIn}</p>
            </div>
            <div className="p-3 bg-slate-100 border border-slate-200 rounded-xl text-slate-600">
              <Users className="w-5 h-5" />
            </div>
          </div>
        </div>

        {/* Live Roster Directory */}
        <div className="bg-white p-5 sm:p-6 rounded-2xl border border-slate-200 space-y-4 shadow-xs">
          
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 pb-4">
            <div>
              <h2 className="font-bold text-slate-900 text-base">Today's Site Roster</h2>
              <p className="text-[11px] text-slate-500 font-medium">Live attendance log for active shift</p>
            </div>

            <div className="flex flex-wrap items-center gap-2.5">
              {/* Search */}
              <div className="relative">
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search worker name..."
                  className="pl-8 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 outline-none focus:border-indigo-600 focus:bg-white transition"
                />
                <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-3" />
              </div>

              {/* Refresh */}
              <button
                onClick={fetchTodayData}
                className="p-2 text-slate-600 hover:text-indigo-600 rounded-xl transition bg-slate-50 hover:bg-slate-100 border border-slate-200"
                title="Refresh Table Data"
              >
                <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin text-indigo-600' : ''}`} />
              </button>

              {/* Manual Override Button */}
              <button
                onClick={() => setIsManualModalOpen(true)}
                className="flex items-center gap-2 bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold px-4 py-2 rounded-xl transition shadow-xs"
              >
                <Plus className="w-4 h-4" />
                <span>Manual Entry</span>
              </button>
            </div>
          </div>

          {/* Desktop Roster Table */}
          <div className="hidden sm:block overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-500 font-bold border-b border-slate-200 uppercase tracking-wider">
                <tr>
                  <th className="py-3.5 px-3">Worker Name</th>
                  <th className="py-3.5 px-3">Role</th>
                  <th className="py-3.5 px-3">Clock In</th>
                  <th className="py-3.5 px-3">Clock Out</th>
                  <th className="py-3.5 px-3">Status</th>
                  <th className="py-3.5 px-3 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredAttendance.length === 0 ? (
                  <tr>
                    <td colSpan="6" className="py-8 text-center text-slate-400 font-medium">
                      {loading ? 'Fetching roster...' : 'No workers clocked in today yet.'}
                    </td>
                  </tr>
                ) : (
                  filteredAttendance.map((item) => (
                    <tr key={item.id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="py-3.5 px-3 font-semibold text-slate-900">
                        {item.profiles?.first_name} {item.profiles?.last_name}
                      </td>
                      <td className="py-3.5 px-3 text-slate-500 font-medium uppercase text-[10px]">
                        {item.profiles?.role || 'Worker'}
                      </td>
                      <td className="py-3.5 px-3 text-slate-700 font-mono">
                        {new Date(item.clock_in).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </td>
                      <td className="py-3.5 px-3 text-slate-700 font-mono">
                        {item.clock_out ? (
                          new Date(item.clock_out).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                        ) : (
                          <span className="text-amber-600 font-sans font-semibold">Active Shift</span>
                        )}
                      </td>
                      <td className="py-3.5 px-3">
                        <span className="px-2.5 py-1 rounded-full text-[10px] font-bold uppercase bg-emerald-50 text-emerald-700 border border-emerald-200">
                          {item.status || 'On Time'}
                        </span>
                      </td>
                      <td className="py-3.5 px-3 text-right">
                        {!item.clock_out && (
                          <button
                            onClick={() => handleQuickClockOut(item.id)}
                            className="text-xs font-semibold px-3 py-1 bg-rose-50 text-rose-700 border border-rose-200 rounded-lg hover:bg-rose-100 transition"
                          >
                            Clock Out
                          </button>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </main>

      {/* Manual Clock In / Clock Out Modal */}
      {isManualModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white border border-slate-200 rounded-2xl w-full max-w-md p-6 space-y-5 shadow-2xl relative animate-in fade-in zoom-in duration-150">
            <button
              onClick={() => setIsManualModalOpen(false)}
              className="absolute top-4 right-4 p-1.5 text-slate-400 hover:text-slate-700 rounded-lg hover:bg-slate-100 transition"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center gap-3 border-b border-slate-200 pb-4">
              <div className="p-2.5 bg-indigo-50 border border-indigo-100 rounded-xl text-indigo-600">
                <Plus className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-900">Manual Attendance Entry</h3>
                <p className="text-xs text-slate-500">Record clock-in/out for workers without phones</p>
              </div>
            </div>

            <form onSubmit={handleManualAction} className="space-y-4 text-xs">
              <div>
                <label className="block text-slate-700 font-semibold mb-1">Select Worker</label>
                <select
                  required
                  value={manualData.employee_id}
                  onChange={(e) => setManualData({ ...manualData, employee_id: e.target.value })}
                  className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:border-indigo-600 focus:bg-white text-slate-900 transition font-medium"
                >
                  <option value="">-- Choose Employee --</option>
                  {allProfiles.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.first_name} {p.last_name} ({p.email})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-slate-700 font-semibold mb-1">Action Type</label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setManualData({ ...manualData, action_type: 'clock_in' })}
                    className={`py-2.5 rounded-xl font-bold border transition ${
                      manualData.action_type === 'clock_in'
                        ? 'bg-indigo-600 text-white border-indigo-600'
                        : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                    }`}
                  >
                    Clock In
                  </button>
                  <button
                    type="button"
                    onClick={() => setManualData({ ...manualData, action_type: 'clock_out' })}
                    className={`py-2.5 rounded-xl font-bold border transition ${
                      manualData.action_type === 'clock_out'
                        ? 'bg-rose-600 text-white border-rose-600'
                        : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                    }`}
                  >
                    Clock Out
                  </button>
                </div>
              </div>

              <div className="pt-2 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setIsManualModalOpen(false)}
                  className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold rounded-xl transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold rounded-xl transition flex items-center gap-2 shadow-md shadow-indigo-600/20 disabled:opacity-50"
                >
                  {submitting ? <RefreshCw className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
                  <span>Save Entry</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}