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
  AlertTriangle,
  MapPin,
  Printer,
  Download,
  ExternalLink
} from 'lucide-react';
import Link from 'next/link';
import SiteClerkSideNav from '@/components/site-clerk/SiteClerkSideNav';
import SiteClerkNavbar from '@/components/site-clerk/SiteClerkNavbar';
import { generateTimesheetPDF } from '@/lib/generateTimesheetPDF';

function UploadContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const initialSiteParam = searchParams.get('site') || '';

  const [sites, setSites] = useState([]);
  const [sitesLoading, setSitesLoading] = useState(true);
  const [activeSite, setActiveSite] = useState(initialSiteParam);

  const [shiftDate, setShiftDate] = useState('2026-08-24');
  const [selectedFile, setSelectedFile] = useState(null);
  const [filePreviewUrl, setFilePreviewUrl] = useState(null);
  const [documentUrl, setDocumentUrl] = useState(null);
  
  const [uploading, setUploading] = useState(false);
  const [committing, setCommitting] = useState(false);
  const [exportingPdf, setExportingPdf] = useState(false);
  const [fetchingExisting, setFetchingExisting] = useState(false);
  
  const [parsedData, setParsedData] = useState(null);
  const [submitSuccess, setSubmitSuccess] = useState(false);
  const [siteMismatchCount, setSiteMismatchCount] = useState(0);

  // 1. Fetch Dynamic Sites List
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
            setActiveSite(defaultSite);
          }
        }
      } catch (err) {
        console.error('Error connecting to sites API:', err);
      } finally {
        setSitesLoading(false);
      }
    }

    fetchSites();
  }, [initialSiteParam]);

  // 2. Fetch Existing Uploaded Document and Log Data for activeSite & shiftDate
  useEffect(() => {
    if (!activeSite || !shiftDate) return;

    async function fetchExistingTimesheet() {
      try {
        setFetchingExisting(true);
        const res = await fetch(
          `/api/site-clerk/timesheets?site=${encodeURIComponent(activeSite)}&date=${shiftDate}`
        );
        const data = await res.json();

        if (res.ok && data.success) {
          if (data.workers && data.workers.length > 0) {
            setParsedData(data.workers);
          }
          if (data.documentUrl) {
            setDocumentUrl(data.documentUrl);
          } else {
            setDocumentUrl(null);
          }
        }
      } catch (err) {
        console.error('Error loading stored timesheet:', err);
      } finally {
        setFetchingExisting(false);
      }
    }

    fetchExistingTimesheet();
  }, [activeSite, shiftDate]);

  // Handle preview URL cleanup
  useEffect(() => {
    return () => {
      if (filePreviewUrl && filePreviewUrl.startsWith('blob:')) {
        URL.revokeObjectURL(filePreviewUrl);
      }
    };
  }, [filePreviewUrl]);

  const handleSiteChange = (newSite) => {
    setActiveSite(newSite);
    router.replace(`?site=${encodeURIComponent(newSite)}`);
  };

  const handleFileSelect = (e) => {
    const file = e.target.files[0];
    if (file) {
      setSelectedFile(file);
      setSubmitSuccess(false);

      if (file.type.startsWith('image/')) {
        const localUrl = URL.createObjectURL(file);
        setFilePreviewUrl(localUrl);
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
      formData.append('siteName', activeSite);
      formData.append('shiftDate', shiftDate);

      const res = await fetch('/api/site-clerk/timesheets/upload', {
        method: 'POST',
        body: formData,
      });

      const data = await res.json();

      if (res.ok) {
        const workers = data.parsedWorkers || [];
        setParsedData(workers);
        if (data.documentUrl) {
          setDocumentUrl(data.documentUrl);
        }

        const mismatches = workers.filter(
          (w) => w.assigned_site && w.assigned_site.toLowerCase() !== activeSite.toLowerCase()
        ).length;
        setSiteMismatchCount(mismatches);
      } else {
        alert(data.error || 'Failed to process timesheet upload.');
      }
    } catch (err) {
      console.error('Error attaching file & fetching roster:', err);
    } finally {
      setUploading(false);
    }
  };

  const calculateHoursFromTimes = (timeInStr, timeOutStr) => {
    try {
      if (!timeOutStr || timeOutStr === '--:--') return { reg: 0, ot: 0 };
      const [outHours, outMins] = timeOutStr.split(':').map(Number);
      if (isNaN(outHours)) return { reg: 8.0, ot: 0.0 };

      const finishDecimal = outHours + (outMins || 0) / 60;
      const standardFinishDecimal = 16.0;

      if (finishDecimal > standardFinishDecimal) {
        const ot = Number((finishDecimal - standardFinishDecimal).toFixed(2));
        return { reg: 8.0, ot };
      }
      return { reg: Number(Math.max(0, Math.min(finishDecimal - 7.0, 8.0)).toFixed(2)), ot: 0.0 };
    } catch {
      return { reg: 8.0, ot: 0.0 };
    }
  };

  const handleWorkerChange = (id, field, value) => {
    setParsedData((prev) =>
      prev.map((worker) => {
        if (worker.id !== id) return worker;

        const updated = { ...worker, [field]: value };

        if (field === 'status' && ['sick_leave', 'awol', 'on_leave'].includes(value)) {
          updated.timeInStr = '--:--';
          updated.timeOutStr = '--:--';
          updated.regular_hours = 0;
          updated.overtime_hours = 0;
        }

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
          siteName: activeSite,
          shiftDate: shiftDate,
          documentUrl: documentUrl || filePreviewUrl,
        }),
      });

      const data = await res.json();

      if (res.ok) {
        setSubmitSuccess(true);
        if (data.redirectUrl) {
          router.push(data.redirectUrl);
        }
      } else {
        alert(`Error locking shift logs: ${data.error}`);
      }
    } catch (err) {
      console.error('Submission error:', err);
    } finally {
      setCommitting(false);
    }
  };

  const handleExportPDF = async () => {
    if (!parsedData || parsedData.length === 0) return;
    try {
      setExportingPdf(true);
      await generateTimesheetPDF({
        siteName: activeSite,
        shiftDate,
        workers: parsedData,
        totals: {
          regularHours: totalRegHours,
          overtimeHours: totalOtHours,
          combinedHours: totalHoursCombined,
        },
      });
    } catch (err) {
      console.error('Error exporting PDF:', err);
      alert('Failed to generate PDF document.');
    } finally {
      setExportingPdf(false);
    }
  };

  const totalRegHours = parsedData
    ? parsedData.reduce((acc, w) => acc + (Number(w.regular_hours) || 0), 0)
    : 0;
  const totalOtHours = parsedData
    ? parsedData.reduce((acc, w) => acc + (Number(w.overtime_hours) || 0), 0)
    : 0;
  const totalHoursCombined = totalRegHours + totalOtHours;

  const activeDisplayUrl = filePreviewUrl || documentUrl;

  return (
    <div className="min-h-screen bg-slate-100 text-slate-900 flex flex-col lg:flex-row font-sans">
      <SiteClerkSideNav />

      <main className="flex-1 p-4 sm:p-6 lg:p-8 space-y-6 overflow-x-hidden">
        <SiteClerkNavbar title="Timesheet Ingestion" siteName={activeSite || 'Loading...'} />

        <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-indigo-50 text-indigo-600 rounded-xl">
              <MapPin className="w-5 h-5" />
            </div>
            <div>
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Active Location</p>
              <p className="text-sm font-bold text-slate-800">{activeSite || 'Fetching site location...'}</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold text-slate-500 hidden md:inline">Switch Station:</span>
            {sitesLoading ? (
              <div className="flex items-center gap-2 text-xs text-slate-500 bg-slate-50 border border-slate-200 rounded-xl px-3 py-2">
                <Loader2 className="w-3.5 h-3.5 animate-spin text-indigo-600" />
                <span>Loading sites...</span>
              </div>
            ) : (
              <select
                value={activeSite}
                onChange={(e) => handleSiteChange(e.target.value)}
                className="text-xs font-bold bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-slate-800 outline-none focus:border-indigo-500 cursor-pointer"
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
          <div className="lg:col-span-5 space-y-4">
            <div className="bg-white border border-slate-200 rounded-3xl p-5 shadow-xs space-y-4">
              <div>
                <h3 className="text-sm font-bold text-slate-900">Attach Physical Sheet</h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Upload scanned JPEG, PNG, or PDF sheet for audit records ({activeSite}).
                </p>
              </div>

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

              {selectedFile && (
                <button
                  onClick={handleProcessUpload}
                  disabled={uploading}
                  className="w-full flex items-center justify-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold py-3 rounded-xl transition shadow-xs disabled:opacity-50 cursor-pointer"
                >
                  {uploading ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Uploading & Ingesting...</span>
                    </>
                  ) : (
                    <>
                      <Users className="w-4 h-4" />
                      <span>Upload & Extract Data</span>
                    </>
                  )}
                </button>
              )}
            </div>

            {/* Restored Document Preview Panel */}
            <div className="bg-white border border-slate-200 rounded-3xl p-4 shadow-xs space-y-3">
              <div className="flex items-center justify-between text-xs font-bold text-slate-700">
                <span className="flex items-center gap-1.5">
                  <Eye className="w-4 h-4 text-indigo-600" /> Stored Preview ({activeSite})
                </span>
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-mono text-slate-400 bg-slate-100 px-2 py-0.5 rounded">
                    {shiftDate}
                  </span>
                  {activeDisplayUrl && (
                    <a
                      href={activeDisplayUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="text-slate-500 hover:text-indigo-600"
                      title="Open full preview"
                    >
                      <ExternalLink className="w-3.5 h-3.5" />
                    </a>
                  )}
                </div>
              </div>

              <div className="rounded-2xl overflow-hidden border border-slate-200 bg-slate-900 flex items-center justify-center min-h-64 max-h-96 relative">
                {fetchingExisting ? (
                  <div className="text-center p-6 space-y-2">
                    <Loader2 className="w-6 h-6 animate-spin text-white mx-auto" />
                    <p className="text-xs text-slate-300">Fetching stored document...</p>
                  </div>
                ) : activeDisplayUrl ? (
                  activeDisplayUrl.endsWith('.pdf') ? (
                    <iframe
                      src={activeDisplayUrl}
                      className="w-full h-80"
                      title="Uploaded PDF Timesheet"
                    />
                  ) : (
                    <img
                      src={activeDisplayUrl}
                      alt={`Timesheet ${activeSite} ${shiftDate}`}
                      className="object-contain w-full h-full max-h-80"
                    />
                  )
                ) : (
                  <div className="text-center p-6 space-y-2">
                    <FileText className="w-8 h-8 text-slate-600 mx-auto" />
                    <p className="text-xs text-slate-400 font-medium">No uploaded sheet found for this date</p>
                    <p className="text-[10px] text-slate-500">Select an image or PDF file above to upload</p>
                  </div>
                )}
              </div>
            </div>
          </div>

          <div className="lg:col-span-7">
            <div className="bg-white border border-slate-200 rounded-3xl p-5 shadow-xs space-y-5">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-4">
                <div>
                  <h3 className="text-sm font-bold text-slate-900">Shift Attendance Verification</h3>
                  <p className="text-xs text-slate-500">
                    Verify worker logs against attached paper sheet and adjust exceptions.
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  {parsedData && (
                    <button
                      onClick={handleExportPDF}
                      disabled={exportingPdf}
                      className="inline-flex items-center gap-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold px-3 py-1.5 rounded-xl transition cursor-pointer disabled:opacity-50"
                    >
                      {exportingPdf ? (
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      ) : (
                        <Printer className="w-3.5 h-3.5" />
                      )}
                      <span>{exportingPdf ? 'Generating...' : 'Export PDF'}</span>
                    </button>
                  )}
                  {parsedData && (
                    <span className="text-xs font-bold bg-indigo-50 text-indigo-700 px-3 py-1.5 rounded-xl border border-indigo-200">
                      {parsedData.length} Workers
                    </span>
                  )}
                </div>
              </div>

              {siteMismatchCount > 0 && (
                <div className="p-3 bg-amber-50 border border-amber-200 rounded-2xl flex items-center gap-2.5 text-xs text-amber-800 font-medium">
                  <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
                  <span>
                    <strong>{siteMismatchCount} worker(s)</strong> on this sheet are mapped to a different site than <strong>{activeSite}</strong>. Confirming will record them under this active station.
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

                  {/* Summary Bar at Bottom */}
                  <div className="grid grid-cols-3 gap-3 bg-slate-900 text-white rounded-2xl p-4 text-center">
                    <div>
                      <p className="text-[10px] font-bold text-slate-400 uppercase">Regular Hours</p>
                      <p className="text-base font-bold">{totalRegHours.toFixed(1)}h</p>
                    </div>
                    <div className="border-x border-slate-800">
                      <p className="text-[10px] font-bold text-slate-400 uppercase">Overtime Hours</p>
                      <p className="text-base font-bold text-amber-400">+{totalOtHours.toFixed(1)}h</p>
                    </div>
                    <div>
                      <p className="text-[10px] font-bold text-slate-400 uppercase">Total Shift Hours</p>
                      <p className="text-base font-bold text-indigo-400">{totalHoursCombined.toFixed(1)}h</p>
                    </div>
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
                    Select a scanned timesheet photo on the left and click "Upload & Extract Data" to pull active workers for {activeSite || 'active site'}.
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