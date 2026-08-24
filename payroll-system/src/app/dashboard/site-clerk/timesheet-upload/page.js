'use client';

import { useState, useEffect, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { 
  UploadCloud, 
  FileText, 
  CheckCircle2, 
  Loader2, 
  Eye, 
  ArrowLeft,
  Send,
  Calendar,
  Users,
  AlertTriangle
} from 'lucide-react';
import Link from 'next/link';
import SiteClerkSideNav from '@/components/site-clerk/SiteClerkSideNav';
import SiteClerkNavbar from '@/components/site-clerk/SiteClerkNavbar';

function UploadContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const siteParam = searchParams.get('site') || 'Debete Site';

  const [shiftDate, setShiftDate] = useState('2026-08-24');
  const [selectedFile, setSelectedFile] = useState(null);
  const [filePreviewUrl, setFilePreviewUrl] = useState(null);
  const [documentUrl, setDocumentUrl] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [committing, setCommitting] = useState(false);
  const [parsedData, setParsedData] = useState(null);
  const [submitSuccess, setSubmitSuccess] = useState(false);
  const [siteMismatchCount, setSiteMismatchCount] = useState(0);

  useEffect(() => {
    return () => {
      if (filePreviewUrl) URL.revokeObjectURL(filePreviewUrl);
    };
  }, [filePreviewUrl]);

  const handleFileSelect = (e) => {
    const file = e.target.files[0];
    if (file) {
      setSelectedFile(file);
      setParsedData(null);
      setSubmitSuccess(false);
      setSiteMismatchCount(0);

      if (file.type.startsWith('image/')) {
        setFilePreviewUrl(URL.createObjectURL(file));
      } else {
        setFilePreviewUrl(null);
      }
    }
  };

  const handleProcessUpload = async () => {
    if (!selectedFile) return;

    try {
      setUploading(true);
      const formData = new FormData();
      formData.append('file', selectedFile);
      formData.append('siteName', siteParam);
      formData.append('shiftDate', shiftDate);

      const res = await fetch('/api/site-clerk/timesheets/upload', {
        method: 'POST',
        body: formData,
      });

      const data = await res.json();

      if (res.ok) {
        const workers = data.parsedWorkers || [];
        setParsedData(workers);
        setDocumentUrl(data.documentUrl || null);

        // Check for cross-site allocation warnings
        const mismatches = workers.filter(
          (w) => w.assigned_site && w.assigned_site.toLowerCase() !== siteParam.toLowerCase()
        ).length;
        setSiteMismatchCount(mismatches);
      } else {
        console.error('Failed to load roster:', data.error);
        alert(data.error || 'Failed to upload timesheet.');
      }
    } catch (err) {
      console.error('Error attaching file & fetching roster:', err);
    } finally {
      setUploading(false);
    }
  };

  // Helper to calculate Reg & Overtime hours automatically when clock-out changes
  const calculateHoursFromTimes = (timeInStr, timeOutStr) => {
    try {
      if (!timeOutStr || timeOutStr === '--:--') return { reg: 0, ot: 0 };
      const [outHours, outMins] = timeOutStr.split(':').map(Number);
      if (isNaN(outHours)) return { reg: 8.0, ot: 0.0 };

      // Standard finish is 16:00 (4:00 PM)
      const finishDecimal = outHours + (outMins || 0) / 60;
      const standardFinishDecimal = 16.0;

      if (finishDecimal > standardFinishDecimal) {
        const ot = Number((finishDecimal - standardFinishDecimal).toFixed(2));
        return { reg: 8.0, ot };
      }
      return { reg: Number(Math.min(finishDecimal - 7.0, 8.0).toFixed(2)), ot: 0.0 };
    } catch {
      return { reg: 8.0, ot: 0.0 };
    }
  };

  const handleWorkerChange = (id, field, value) => {
    setParsedData((prev) =>
      prev.map((worker) => {
        if (worker.id !== id) return worker;

        const updated = { ...worker, [field]: value };

        // Handle Status Exceptions
        if (field === 'status' && ['sick_leave', 'awol', 'on_leave'].includes(value)) {
          updated.timeInStr = '--:--';
          updated.timeOutStr = '--:--';
          updated.regular_hours = 0;
          updated.overtime_hours = 0;
        }

        // Handle Automatic OT Calculation on Time Out Change
        if (field === 'timeOutStr') {
          const { reg, ot } = calculateHoursFromTimes(updated.timeInStr, value);
          updated.regular_hours = reg;
          updated.overtime_hours = ot;
        }

        return updated;
      })
    );
  };

  const handleFinalSubmit = async () => {
    if (!parsedData || parsedData.length === 0) return;

    try {
      setCommitting(true);
      const res = await fetch('/api/site-clerk/timesheets/confirm', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          parsedWorkers: parsedData,
          siteName: siteParam,
          shiftDate: shiftDate,
          documentUrl: documentUrl,
        }),
      });

      const data = await res.json();

      if (res.ok) {
        setSubmitSuccess(true);
        // Phase 2 Auto-redirect to Roster Dashboard
        if (data.redirectUrl) {
          router.push(data.redirectUrl);
        }
      } else {
        console.error('Failed to commit shift logs:', data.error);
        alert(`Error locking shift logs: ${data.error}`);
      }
    } catch (err) {
      console.error('Submission error:', err);
    } finally {
      setCommitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-100 text-slate-900 flex flex-col lg:flex-row font-sans">
      <SiteClerkSideNav />

      <main className="flex-1 p-4 sm:p-6 lg:p-8 space-y-6 overflow-x-hidden">
        <SiteClerkNavbar title="Timesheet Ingestion" siteName={siteParam} />

        <div>
          <Link
            href="/dashboard/site-clerk"
            className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-600 hover:text-indigo-600 transition"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Back to Field Overview</span>
          </Link>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* File Upload Section */}
          <div className="lg:col-span-5 space-y-4">
            <div className="bg-white border border-slate-200 rounded-3xl p-5 shadow-xs space-y-4">
              <div>
                <h3 className="text-sm font-bold text-slate-900">Attach Physical Sheet</h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Upload scanned JPEG, PNG, or PDF sheet for audit records ({siteParam}).
                </p>
              </div>

              {/* Shift Date Picker */}
              <div className="space-y-1">
                <label className="text-[11px] font-bold text-slate-600 flex items-center gap-1">
                  <Calendar className="w-3.5 h-3.5 text-indigo-600" /> Target Shift Date
                </label>
                <input
                  type="date"
                  value={shiftDate}
                  onChange={(e) => setShiftDate(e.target.value)}
                  className="w-full text-xs font-semibold bg-slate-50 border border-slate-200 rounded-xl p-2.5 outline-none focus:border-indigo-500 text-slate-800"
                />
              </div>

              {/* Dropzone Container */}
              <label className="border-2 border-dashed border-slate-300 hover:border-indigo-500 bg-slate-50/50 hover:bg-slate-50 rounded-2xl p-6 flex flex-col items-center justify-center text-center cursor-pointer transition space-y-3 block">
                <input
                  type="file"
                  accept="image/*,application/pdf"
                  onChange={handleFileSelect}
                  className="hidden"
                />
                <div className="p-3 bg-indigo-50 text-indigo-600 rounded-2xl">
                  <UploadCloud className="w-8 h-8" />
                </div>
                <div>
                  <p className="text-xs font-bold text-slate-800">
                    {selectedFile ? selectedFile.name : 'Click to select or drag document'}
                  </p>
                  <p className="text-[11px] text-slate-400 mt-1">Maximum size: 10MB</p>
                </div>
              </label>

              {selectedFile && !parsedData && (
                <button
                  onClick={handleProcessUpload}
                  disabled={uploading}
                  className="w-full flex items-center justify-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold py-3 rounded-xl transition shadow-xs disabled:opacity-50 cursor-pointer"
                >
                  {uploading ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Fetching Site Roster...</span>
                    </>
                  ) : (
                    <>
                      <Users className="w-4 h-4" />
                      <span>Load Site Roster & Review</span>
                    </>
                  )}
                </button>
              )}
            </div>

            {/* Document Preview Box */}
            {filePreviewUrl && (
              <div className="bg-white border border-slate-200 rounded-3xl p-4 shadow-xs space-y-2">
                <div className="flex items-center justify-between text-xs font-bold text-slate-700">
                  <span className="flex items-center gap-1.5">
                    <Eye className="w-4 h-4 text-indigo-600" /> Attached Sheet Preview
                  </span>
                </div>
                <div className="rounded-2xl overflow-hidden border border-slate-200 bg-slate-900 flex justify-center max-h-80">
                  <img
                    src={filePreviewUrl}
                    alt="Timesheet Preview"
                    className="object-contain w-full h-full"
                  />
                </div>
              </div>
            )}
          </div>

          {/* Verification Table Side */}
          <div className="lg:col-span-7">
            <div className="bg-white border border-slate-200 rounded-3xl p-5 shadow-xs space-y-5">
              <div className="flex items-center justify-between border-b border-slate-100 pb-4">
                <div>
                  <h3 className="text-sm font-bold text-slate-900">Shift Attendance Verification</h3>
                  <p className="text-xs text-slate-500">
                    Verify pre-filled worker list against attached paper sheet and adjust exceptions.
                  </p>
                </div>
                {parsedData && (
                  <span className="text-xs font-bold bg-indigo-50 text-indigo-700 px-3 py-1 rounded-full border border-indigo-200">
                    {parsedData.length} Roster Workers
                  </span>
                )}
              </div>

              {/* Site Mismatch Warning Banner */}
              {siteMismatchCount > 0 && (
                <div className="p-3 bg-amber-50 border border-amber-200 rounded-2xl flex items-center gap-2.5 text-xs text-amber-800 font-medium">
                  <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
                  <span>
                    <strong>{siteMismatchCount} worker(s)</strong> on this sheet are mapped to a different site than <strong>{siteParam}</strong>. Confirming will record them under this active station.
                  </span>
                </div>
              )}

              {submitSuccess ? (
                <div className="p-6 bg-emerald-50 border border-emerald-200 rounded-2xl text-center space-y-3">
                  <div className="p-3 bg-emerald-100 text-emerald-700 rounded-full w-12 h-12 flex items-center justify-center mx-auto">
                    <CheckCircle2 className="w-6 h-6" />
                  </div>
                  <h4 className="text-base font-bold text-emerald-900">Timesheet Logs Locked</h4>
                  <p className="text-xs text-emerald-700 max-w-md mx-auto">
                    Redirecting to Roster Dashboard for final adjustments...
                  </p>
                </div>
              ) : parsedData ? (
                <div className="space-y-4">
                  <div className="overflow-x-auto border border-slate-200 rounded-2xl">
                    <table className="w-full text-left text-xs text-slate-700">
                      <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 font-bold uppercase tracking-wider text-[10px]">
                        <tr>
                          <th className="p-3">Worker Name</th>
                          <th className="p-3">Time In</th>
                          <th className="p-3">Time Out</th>
                          <th className="p-3">Reg. Hours</th>
                          <th className="p-3">OT Hours</th>
                          <th className="p-3">Status / Exception</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {parsedData.map((worker) => {
                          const isInactive = ['sick_leave', 'awol', 'on_leave'].includes(worker.status);
                          return (
                            <tr key={worker.id} className="hover:bg-slate-50/80 transition">
                              <td className="p-3 font-semibold text-slate-900">
                                <div>{worker.worker_name}</div>
                                <div className="text-[10px] text-slate-400 font-normal">{worker.employee_code}</div>
                              </td>
                              <td className="p-3">
                                <input
                                  type="text"
                                  disabled={isInactive}
                                  value={worker.timeInStr || ''}
                                  onChange={(e) => handleWorkerChange(worker.id, 'timeInStr', e.target.value)}
                                  className="w-16 font-mono text-xs bg-slate-50 border border-slate-200 rounded p-1 text-center disabled:opacity-40"
                                />
                              </td>
                              <td className="p-3">
                                <input
                                  type="text"
                                  disabled={isInactive}
                                  value={worker.timeOutStr || ''}
                                  onChange={(e) => handleWorkerChange(worker.id, 'timeOutStr', e.target.value)}
                                  className="w-16 font-mono text-xs bg-slate-50 border border-slate-200 rounded p-1 text-center disabled:opacity-40"
                                />
                              </td>
                              <td className="p-3">
                                <input
                                  type="number"
                                  disabled={isInactive}
                                  value={worker.regular_hours ?? 0}
                                  onChange={(e) => handleWorkerChange(worker.id, 'regular_hours', Number(e.target.value))}
                                  className="w-12 font-bold text-xs bg-slate-50 border border-slate-200 rounded p-1 text-center disabled:opacity-40"
                                />
                              </td>
                              <td className="p-3 font-bold text-amber-600">
                                {worker.overtime_hours > 0 ? `+${worker.overtime_hours}h` : '0h'}
                              </td>
                              <td className="p-3">
                                <select
                                  value={worker.status || 'completed'}
                                  onChange={(e) => handleWorkerChange(worker.id, 'status', e.target.value)}
                                  className="text-xs font-bold bg-slate-50 border border-slate-200 rounded-lg p-1 text-slate-800 outline-none"
                                >
                                  <option value="completed">Completed</option>
                                  <option value="late">Late</option>
                                  <option value="sick_leave">Sick Leave</option>
                                  <option value="awol">AWOL</option>
                                  <option value="on_leave">On Leave</option>
                                  <option value="iod">Injury (IOD)</option>
                                </select>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>

                  <div className="flex items-center justify-end gap-3 pt-2">
                    <button
                      onClick={() => setParsedData(null)}
                      className="px-4 py-2.5 rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-50 text-xs font-semibold transition cursor-pointer"
                    >
                      Re-select File
                    </button>
                    <button
                      onClick={handleFinalSubmit}
                      disabled={committing}
                      className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold px-5 py-2.5 rounded-xl transition shadow-xs cursor-pointer disabled:opacity-50"
                    >
                      {committing ? (
                        <>
                          <Loader2 className="w-4 h-4 animate-spin" />
                          <span>Saving to shift_logs...</span>
                        </>
                      ) : (
                        <>
                          <Send className="w-4 h-4" />
                          <span>Confirm & Lock to Shift Logs</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>
              ) : (
                <div className="p-12 border-2 border-dashed border-slate-200 rounded-2xl flex flex-col items-center justify-center text-center space-y-2">
                  <div className="p-3 bg-slate-100 text-slate-400 rounded-2xl">
                    <FileText className="w-8 h-8" />
                  </div>
                  <p className="text-xs font-bold text-slate-700">No Roster Loaded</p>
                  <p className="text-[11px] text-slate-400 max-w-xs">
                    Select a scanned timesheet photo on the left and click "Load Site Roster & Review" to pull pre-filled active workers for this site.
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}

export default function TimesheetUploadPage() {
  return (
    <Suspense fallback={<div className="p-8 text-xs text-slate-500">Loading Ingestion Portal...</div>}>
      <UploadContent />
    </Suspense>
  );
}