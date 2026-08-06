'use client';

import { useState, useEffect } from 'react';
import { 
  Clock, 
  Save, 
  Loader2, 
  CheckCircle, 
  FileText, 
  AlertCircle, 
  AlertTriangle, 
  Upload, 
  Filter, 
  Calendar 
} from 'lucide-react';

export default function PaperHoursPage() {
  const [payPeriodId, setPayPeriodId] = useState(null);
  const [records, setRecords] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [selectedSite, setSelectedSite] = useState('ALL');
  const [docketFile, setDocketFile] = useState(null);

  // Fetch hours entries from backend
  const fetchHoursData = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/hours');
      const result = await res.json();
      if (result.success) {
        setPayPeriodId(result.pay_period_id);
        
        // Map backend records to include separate regular & OT hours
        const initializedRecords = (result.data || []).map((rec) => {
          const regHours = parseFloat(rec.regular_hours) || parseFloat(rec.total_hours_worked) || 0;
          const otHours = parseFloat(rec.overtime_hours) || 0;
          const baseRate = parseFloat(rec.hourly_rate) || 0;
          const otRate = rec.overtime_rate ? parseFloat(rec.overtime_rate) : baseRate * 1.5;
          const gross = (regHours * baseRate) + (otHours * otRate);

          return {
            ...rec,
            regular_hours: regHours,
            overtime_hours: otHours,
            hourly_rate: baseRate,
            overtime_rate: otRate,
            gross_pay: gross,
            site: rec.site || 'Site A' // Fallback site tag
          };
        });

        setRecords(initializedRecords);
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

  // Keyboard shortcut: Ctrl+S / Cmd+S to trigger save
  useEffect(() => {
    const handleKeyDown = (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 's') {
        e.preventDefault();
        if (!saving && !loading) {
          handleSaveHours(e);
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [records, saving, loading]);

  // Dynamic hours calculation handler
  const handleHoursChange = (employeeId, field, value) => {
    setRecords((prev) =>
      prev.map((rec) => {
        if (rec.employee_id === employeeId) {
          const updatedVal = Math.max(0, parseFloat(value) || 0);
          const regHours = field === 'regular_hours' ? updatedVal : (parseFloat(rec.regular_hours) || 0);
          const otHours = field === 'overtime_hours' ? updatedVal : (parseFloat(rec.overtime_hours) || 0);
          
          const baseRate = parseFloat(rec.hourly_rate) || 0;
          const otRate = parseFloat(rec.overtime_rate) || (baseRate * 1.5);
          
          const computedGross = (regHours * baseRate) + (otHours * otRate);

          return {
            ...rec,
            [field]: value,
            gross_pay: computedGross
          };
        }
        return rec;
      })
    );
  };

  // Submit recorded hours to backend
  const handleSaveHours = async (e) => {
    if (e) e.preventDefault();
    setSaving(true);
    setSaveSuccess(false);

    try {
      const payload = {
        pay_period_id: payPeriodId,
        entries: records.map((rec) => ({
          employee_id: rec.employee_id,
          regular_hours: parseFloat(rec.regular_hours) || 0,
          overtime_hours: parseFloat(rec.overtime_hours) || 0,
          total_hours_worked: (parseFloat(rec.regular_hours) || 0) + (parseFloat(rec.overtime_hours) || 0),
          hourly_rate: rec.hourly_rate,
          gross_pay: rec.gross_pay
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

  // Filter records based on selected site
  const filteredRecords = records.filter(
    (r) => selectedSite === 'ALL' || r.site === selectedSite
  );

  // Aggregate totals
  const totalRegularHours = filteredRecords.reduce((sum, r) => sum + (parseFloat(r.regular_hours) || 0), 0);
  const totalOtHours = filteredRecords.reduce((sum, r) => sum + (parseFloat(r.overtime_hours) || 0), 0);
  const totalHoursWorked = totalRegularHours + totalOtHours;
  const totalEstimatedPayout = filteredRecords.reduce((sum, r) => sum + (parseFloat(r.gross_pay) || 0), 0);

  // High-hour anomalies check for visual warning
  const hasAnomalies = filteredRecords.some(
    (r) => (parseFloat(r.regular_hours) || 0) > 160 || (parseFloat(r.overtime_hours) || 0) > 40
  );

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
              <span className="bg-slate-100 text-slate-600 text-xs font-medium px-2.5 py-1 rounded-full flex items-center gap-1">
                <Calendar className="w-3.5 h-3.5" /> Current Cycle: Aug 2026
              </span>
            </div>
            <h1 className="text-2xl font-bold tracking-tight text-slate-900 mt-2">Logbook Hours Entry</h1>
            <p className="text-sm text-slate-500 mt-1">
              Batch enter base and overtime hours directly off site paper logbooks.
            </p>
          </div>

          <div className="flex items-center gap-3">
            {/* Paper Sheet Scan Attachment Button */}
            <label className="cursor-pointer inline-flex items-center gap-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-medium px-4 py-3 rounded-xl transition text-sm">
              <Upload className="w-4 h-4 text-slate-500" />
              <span>{docketFile ? docketFile.name : 'Attach Docket Scan'}</span>
              <input 
                type="file" 
                accept="image/*,application/pdf" 
                className="hidden" 
                onChange={(e) => setDocketFile(e.target.files[0])} 
              />
            </label>

            {/* Save Button */}
            <button
              onClick={handleSaveHours}
              disabled={saving || loading}
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white font-medium px-6 py-3 rounded-xl transition shadow-sm active:scale-95 disabled:opacity-50"
            >
              {saving ? <Loader2 className="w-5 h-5 animate-spin" /> : <Save className="w-5 h-5" />}
              <span>Save Hours Entry</span>
            </button>
          </div>
        </div>

        {/* ANOMALY & SUCCESS ALERTS */}
        {saveSuccess && (
          <div className="bg-emerald-50 border border-emerald-200 text-emerald-800 px-4 py-3 rounded-xl flex items-center gap-2 text-sm font-medium animate-in fade-in">
            <CheckCircle className="w-5 h-5 text-emerald-600" />
            <span>Paper logbook hours saved successfully! Auto-calculated gross totals updated.</span>
          </div>
        )}

        {hasAnomalies && (
          <div className="bg-amber-50 border border-amber-200 text-amber-900 px-4 py-3 rounded-xl flex items-center gap-2 text-sm font-medium">
            <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0" />
            <span>High hour values detected (&gt;160 hrs regular or &gt;40 hrs OT). Please verify entries before saving.</span>
          </div>
        )}

        {/* SUMMARY STAT CARDS & FILTERS */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex items-center justify-between">
            <div>
              <span className="text-xs font-medium text-slate-400 uppercase tracking-wider">Total Hours (Base / OT)</span>
              <p className="text-2xl font-bold text-slate-900 mt-1">
                {totalHoursWorked.toFixed(1)} <span className="text-xs text-slate-400 font-normal">({totalRegularHours.toFixed(1)} Reg / {totalOtHours.toFixed(1)} OT)</span>
              </p>
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

          {/* SITE FILTER */}
          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex flex-col justify-between">
            <span className="text-xs font-medium text-slate-400 uppercase tracking-wider flex items-center gap-1">
              <Filter className="w-3.5 h-3.5" /> Filter by Site
            </span>
            <select
              value={selectedSite}
              onChange={(e) => setSelectedSite(e.target.value)}
              className="mt-2 w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl font-medium text-slate-900 focus:bg-white focus:ring-2 focus:ring-indigo-500 outline-none text-sm"
            >
              <option value="ALL">All Sites / Departments</option>
              <option value="Site A">Site A</option>
              <option value="Site B">Site B</option>
              <option value="General">General Staff</option>
            </select>
          </div>
        </div>

        {/* MAIN DATA INPUT CONTAINER */}
        {loading ? (
          <div className="flex flex-col items-center justify-center py-16 bg-white rounded-2xl border border-slate-200">
            <Loader2 className="w-8 h-8 text-indigo-600 animate-spin" />
            <p className="text-slate-500 mt-3 text-sm font-medium">Loading paper logbook records...</p>
          </div>
        ) : filteredRecords.length === 0 ? (
          <div className="text-center py-16 bg-white rounded-2xl border border-slate-200">
            <AlertCircle className="w-10 h-10 text-slate-300 mx-auto" />
            <p className="text-slate-600 font-medium mt-2">No active workers found for this selection.</p>
            <p className="text-slate-400 text-xs mt-1">Add workers under Worker Directory or clear site filter.</p>
          </div>
        ) : (
          <form onSubmit={handleSaveHours}>
            
            {/* DESKTOP SPREADSHEET TABLE */}
            <div className="hidden md:block bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
              <table className="w-full text-left text-sm border-collapse">
                <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold">
                  <tr>
                    <th className="py-4 px-6">ID Code</th>
                    <th className="py-4 px-6">Worker Name</th>
                    <th className="py-4 px-6">Base / OT Rate</th>
                    <th className="py-4 px-4 w-36">Regular Hours</th>
                    <th className="py-4 px-4 w-36">OT Hours (1.5x)</th>
                    <th className="py-4 px-6 text-right">Computed Gross Pay</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredRecords.map((rec) => {
                    const isHighReg = (parseFloat(rec.regular_hours) || 0) > 160;
                    const isHighOt = (parseFloat(rec.overtime_hours) || 0) > 40;

                    return (
                      <tr key={rec.employee_id} className="hover:bg-slate-50/80 transition">
                        <td className="py-4 px-6 font-mono text-indigo-600 font-medium">
                          {rec.employee_code}
                          <span className="block text-[10px] text-slate-400">{rec.site}</span>
                        </td>
                        <td className="py-4 px-6 font-semibold text-slate-900">
                          {rec.first_name} {rec.last_name}
                        </td>
                        <td className="py-4 px-6 text-slate-600 text-xs">
                          <div>Base: <span className="font-semibold text-slate-800">P{parseFloat(rec.hourly_rate).toFixed(2)}</span></div>
                          <div>OT: <span className="font-semibold text-slate-800">P{parseFloat(rec.overtime_rate).toFixed(2)}</span></div>
                        </td>
                        
                        {/* REGULAR HOURS INPUT */}
                        <td className="py-3 px-4">
                          <div className="relative">
                            <input
                              type="number"
                              step="0.5"
                              min="0"
                              placeholder="0.0"
                              value={rec.regular_hours}
                              onChange={(e) => handleHoursChange(rec.employee_id, 'regular_hours', e.target.value)}
                              className={`w-full px-3 py-2 border rounded-xl font-bold text-slate-900 focus:bg-white focus:ring-2 focus:ring-indigo-500 outline-none ${
                                isHighReg ? 'bg-amber-50 border-amber-400 text-amber-900' : 'bg-slate-50 border-slate-300'
                              }`}
                            />
                            <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-slate-400">hrs</span>
                          </div>
                        </td>

                        {/* OT HOURS INPUT */}
                        <td className="py-3 px-4">
                          <div className="relative">
                            <input
                              type="number"
                              step="0.5"
                              min="0"
                              placeholder="0.0"
                              value={rec.overtime_hours}
                              onChange={(e) => handleHoursChange(rec.employee_id, 'overtime_hours', e.target.value)}
                              className={`w-full px-3 py-2 border rounded-xl font-bold text-slate-900 focus:bg-white focus:ring-2 focus:ring-indigo-500 outline-none ${
                                isHighOt ? 'bg-amber-50 border-amber-400 text-amber-900' : 'bg-slate-50 border-slate-300'
                              }`}
                            />
                            <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-slate-400">hrs</span>
                          </div>
                        </td>

                        <td className="py-4 px-6 text-right font-bold text-slate-900">
                          P{parseFloat(rec.gross_pay || 0).toFixed(2)}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* MOBILE CARDS VIEW */}
            <div className="grid grid-cols-1 gap-4 md:hidden">
              {filteredRecords.map((rec) => (
                <div key={rec.employee_id} className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-4">
                  <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                    <div>
                      <span className="text-xs font-mono font-bold text-indigo-600 bg-indigo-50 px-2 py-1 rounded-md">
                        {rec.employee_code}
                      </span>
                      <h3 className="text-base font-bold text-slate-900 mt-1">{rec.first_name} {rec.last_name}</h3>
                    </div>
                    <span className="text-xs font-medium text-slate-500">P{parseFloat(rec.hourly_rate).toFixed(2)} / hr</span>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <label className="text-xs font-semibold text-slate-700">Regular Hours:</label>
                      <input
                        type="number"
                        step="0.5"
                        min="0"
                        placeholder="0.0"
                        value={rec.regular_hours}
                        onChange={(e) => handleHoursChange(rec.employee_id, 'regular_hours', e.target.value)}
                        className="w-full px-3 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-base font-bold text-slate-900 focus:bg-white focus:ring-2 focus:ring-indigo-500 outline-none"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-xs font-semibold text-slate-700">OT Hours (1.5x):</label>
                      <input
                        type="number"
                        step="0.5"
                        min="0"
                        placeholder="0.0"
                        value={rec.overtime_hours}
                        onChange={(e) => handleHoursChange(rec.employee_id, 'overtime_hours', e.target.value)}
                        className="w-full px-3 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-base font-bold text-slate-900 focus:bg-white focus:ring-2 focus:ring-indigo-500 outline-none"
                      />
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