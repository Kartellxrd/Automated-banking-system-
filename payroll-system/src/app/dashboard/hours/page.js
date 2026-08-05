'use client';

import { useState, useEffect } from 'react';
import { Clock, Save, Loader2, CheckCircle, FileText, AlertCircle } from 'lucide-react';

export default function PaperHoursPage() {
  const [payPeriodId, setPayPeriodId] = useState(null);
  const [records, setRecords] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

  // Fetch hours entries from backend
  const fetchHoursData = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/hours');
      const result = await res.json();
      if (result.success) {
        setPayPeriodId(result.pay_period_id);
        setRecords(result.data || []);
      }
    } catch (err) {
      console.error('Error fetching hours data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchHoursData();
  }, []);

  // Handle total hours typing change
  const handleHoursChange = (employeeId, value) => {
    setRecords((prev) =>
      prev.map((rec) => {
        if (rec.employee_id === employeeId) {
          const hours = parseFloat(value) || 0;
          const gross = hours * parseFloat(rec.hourly_rate);
          return {
            ...rec,
            total_hours_worked: value,
            gross_pay: gross
          };
        }
        return rec;
      })
    );
  };

  // Submit recorded hours to backend
  const handleSaveHours = async (e) => {
    e.preventDefault();
    setSaving(true);
    setSaveSuccess(false);

    try {
      const payload = {
        pay_period_id: payPeriodId,
        entries: records.map((rec) => ({
          employee_id: rec.employee_id,
          total_hours_worked: rec.total_hours_worked,
          hourly_rate: rec.hourly_rate
        }))
      };

      const res = await fetch('/api/hours', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      const result = await res.json();
      if (result.success) {
        setSaveSuccess(true);
        setTimeout(() => setSaveSuccess(false), 4000);
      } else {
        alert(result.error || 'Failed to save hours');
      }
    } catch (err) {
      alert('Error saving hours: ' + err.message);
    } finally {
      setSaving(false);
    }
  };

  // Calculate totals across all workers
  const totalHoursWorked = records.reduce((sum, r) => sum + (parseFloat(r.total_hours_worked) || 0), 0);
  const totalEstimatedPayout = records.reduce((sum, r) => sum + (parseFloat(r.gross_pay) || 0), 0);

  return (
    <div className="min-h-screen bg-slate-50 p-4 md:p-8 text-slate-800">
      <div className="max-w-6xl mx-auto space-y-6">
        
        {/* HEADER SECTION */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
          <div>
            <div className="flex items-center gap-2">
              <span className="bg-amber-100 text-amber-800 text-xs font-semibold px-2.5 py-1 rounded-full flex items-center gap-1">
                <FileText className="w-3.5 h-3.5" /> Paper Sheet Sync
              </span>
            </div>
            <h1 className="text-2xl font-bold tracking-tight text-slate-900 mt-2">Logbook Hours Entry</h1>
            <p className="text-sm text-slate-500 mt-1">
              Type in the total worked hours directly off physical sign-in paper logbooks.
            </p>
          </div>

          <button
            onClick={handleSaveHours}
            disabled={saving || loading}
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white font-medium px-6 py-3 rounded-xl transition shadow-sm active:scale-95 disabled:opacity-50"
          >
            {saving ? (
              <Loader2 className="w-5 h-5 animate-spin" />
            ) : (
              <Save className="w-5 h-5" />
            )}
            <span>Save Hours Entry</span>
          </button>
        </div>

        {/* SUCCESS NOTIFICATION */}
        {saveSuccess && (
          <div className="bg-emerald-50 border border-emerald-200 text-emerald-800 px-4 py-3 rounded-xl flex items-center gap-2 text-sm font-medium animate-in fade-in">
            <CheckCircle className="w-5 h-5 text-emerald-600" />
            <span>Paper logbook hours saved successfully! Auto-calculated calculations updated.</span>
          </div>
        )}

        {/* SUMMARY STAT CARDS */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex items-center justify-between">
            <div>
              <span className="text-xs font-medium text-slate-400 uppercase tracking-wider">Total Logbook Hours</span>
              <p className="text-2xl font-bold text-slate-900 mt-1">{totalHoursWorked.toFixed(1)} hrs</p>
            </div>
            <div className="p-3 bg-indigo-50 text-indigo-600 rounded-xl">
              <Clock className="w-6 h-6" />
            </div>
          </div>

          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex items-center justify-between">
            <div>
              <span className="text-xs font-medium text-slate-400 uppercase tracking-wider">Est. Gross Payroll</span>
              <p className="text-2xl font-bold text-slate-900 mt-1">P{totalEstimatedPayout.toFixed(2)}</p>
            </div>
            <div className="p-3 bg-emerald-50 text-emerald-600 rounded-xl">
              <span className="font-bold text-lg">BWP</span>
            </div>
          </div>
        </div>

        {/* MAIN DATA INPUT CONTAINER */}
        {loading ? (
          <div className="flex flex-col items-center justify-center py-16 bg-white rounded-2xl border border-slate-200">
            <Loader2 className="w-8 h-8 text-indigo-600 animate-spin" />
            <p className="text-slate-500 mt-3 text-sm font-medium">Loading paper logbook records...</p>
          </div>
        ) : records.length === 0 ? (
          <div className="text-center py-16 bg-white rounded-2xl border border-slate-200">
            <AlertCircle className="w-10 h-10 text-slate-300 mx-auto" />
            <p className="text-slate-600 font-medium mt-2">No active workers found.</p>
            <p className="text-slate-400 text-xs mt-1">Add workers under Worker Directory first.</p>
          </div>
        ) : (
          <form onSubmit={handleSaveHours}>
            
            {/* DESKTOP SPREADSHEET TABLE (Hidden on Mobile) */}
            <div className="hidden md:block bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
              <table className="w-full text-left text-sm border-collapse">
                <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold">
                  <tr>
                    <th className="py-4 px-6">ID Code</th>
                    <th className="py-4 px-6">Worker Name</th>
                    <th className="py-4 px-6">Rate (BWP/hr)</th>
                    <th className="py-4 px-6 w-48">Hours Off Paper Sheet</th>
                    <th className="py-4 px-6 text-right">Computed Gross Pay</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {records.map((rec) => (
                    <tr key={rec.employee_id} className="hover:bg-slate-50/80 transition">
                      <td className="py-4 px-6 font-mono text-indigo-600 font-medium">{rec.employee_code}</td>
                      <td className="py-4 px-6 font-semibold text-slate-900">{rec.first_name} {rec.last_name}</td>
                      <td className="py-4 px-6 text-slate-600 font-medium">P{parseFloat(rec.hourly_rate).toFixed(2)}</td>
                      <td className="py-3 px-6">
                        <div className="relative">
                          <input
                            type="number"
                            step="0.5"
                            min="0"
                            placeholder="0.0"
                            value={rec.total_hours_worked}
                            onChange={(e) => handleHoursChange(rec.employee_id, e.target.value)}
                            className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl font-bold text-slate-900 focus:bg-white focus:ring-2 focus:ring-indigo-500 outline-none"
                          />
                          <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-slate-400">hrs</span>
                        </div>
                      </td>
                      <td className="py-4 px-6 text-right font-bold text-slate-900">
                        P{parseFloat(rec.gross_pay || 0).toFixed(2)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* MOBILE CARDS VIEW (Displayed on Phones) */}
            <div className="grid grid-cols-1 gap-4 md:hidden">
              {records.map((rec) => (
                <div key={rec.employee_id} className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-3">
                  <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                    <div>
                      <span className="text-xs font-mono font-bold text-indigo-600 bg-indigo-50 px-2 py-1 rounded-md">
                        {rec.employee_code}
                      </span>
                      <h3 className="text-base font-bold text-slate-900 mt-1">{rec.first_name} {rec.last_name}</h3>
                    </div>
                    <span className="text-xs font-medium text-slate-500">P{parseFloat(rec.hourly_rate).toFixed(2)} / hr</span>
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-slate-700">Hours Recorded on Paper Logbook:</label>
                    <div className="relative">
                      <input
                        type="number"
                        step="0.5"
                        min="0"
                        placeholder="0.0"
                        value={rec.total_hours_worked}
                        onChange={(e) => handleHoursChange(rec.employee_id, e.target.value)}
                        className="w-full px-4 py-3 bg-slate-50 border border-slate-300 rounded-xl text-lg font-bold text-slate-900 focus:bg-white focus:ring-2 focus:ring-indigo-500 outline-none"
                      />
                      <span className="absolute right-4 top-1/2 -translate-y-1/2 text-sm text-slate-400 font-medium">hrs</span>
                    </div>
                  </div>

                  <div className="pt-2 flex items-center justify-between text-xs border-t border-slate-100">
                    <span className="text-slate-400 font-medium">Auto Gross Total:</span>
                    <span className="text-base font-extrabold text-slate-900">
                      P{parseFloat(rec.gross_pay || 0).toFixed(2)}
                    </span>
                  </div>
                </div>
              ))}
            </div>

            {/* BOTTOM FLOATING SAVE BUTTON FOR MOBILE */}
            <div className="mt-6 md:hidden">
              <button
                type="submit"
                disabled={saving}
                className="w-full flex items-center justify-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-3.5 rounded-xl transition shadow-md active:scale-95"
              >
                {saving ? <Loader2 className="w-5 h-5 animate-spin" /> : <Save className="w-5 h-5" />}
                <span>Save All Logbook Hours</span>
              </button>
            </div>

          </form>
        )}

      </div>
    </div>
  );
}