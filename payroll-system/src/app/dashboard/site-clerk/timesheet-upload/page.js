'use client';

import { useState, useEffect, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { 
  UploadCloud, 
  FileText, 
  CheckCircle2, 
  Clock, 
  Loader2, 
  Eye, 
  ArrowLeft,
  ShieldAlert,
  Send
} from 'lucide-react';
import Link from 'next/link';
import SiteClerkSideNav from '@/components/site-clerk/SiteClerkSideNav';
import SiteClerkNavbar from '@/components/site-clerk/SiteClerkNavbar';

function UploadContent() {
  const searchParams = useSearchParams();
  const siteParam = searchParams.get('site') || 'Debete Site';

  const [selectedFile, setSelectedFile] = useState(null);
  const [filePreviewUrl, setFilePreviewUrl] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [committing, setCommitting] = useState(false);
  const [parsedData, setParsedData] = useState(null);
  const [submitSuccess, setSubmitSuccess] = useState(false);

  // Clean up object URLs to prevent memory leaks
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

      const res = await fetch('/api/site-clerk/timesheets/upload', {
        method: 'POST',
        body: formData,
      });

      const data = await res.json();

      if (res.ok) {
        setParsedData(data.parsedWorkers || []);
      } else {
        console.error('Upload Failed:', data.error);
      }
    } catch (err) {
      console.error('Error uploading sheet:', err);
    } finally {
      setUploading(false);
    }
  };

  const handleFinalSubmit = async () => {
    if (!parsedData || parsedData.length === 0) return;

    try {
      setCommitting(true);
      const res = await fetch('/api/site-clerk/timesheets/confirm', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          records: parsedData,
          siteName: siteParam,
          shiftDate: '2026-08-20',
        }),
      });

      if (res.ok) {
        setSubmitSuccess(true);
      } else {
        const err = await res.json();
        console.error('Failed to commit shift logs:', err.error);
      }
    } catch (err) {
      console.error('Submission error:', err);
    } finally {
      setCommitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-100 text-slate-900 flex flex-col lg:flex-row font-sans">
      {/* Sidebar Navigation */}
      <SiteClerkSideNav />

      {/* Main Content Area Container */}
      <main className="flex-1 p-4 sm:p-6 lg:p-8 space-y-6 overflow-x-hidden">
        {/* Navbar */}
        <SiteClerkNavbar title="Timesheet Ingestion" siteName={siteParam} />

        {/* Back Link */}
        <div>
          <Link
            href="/dashboard/site-clerk"
            className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-600 hover:text-indigo-600 transition"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Back to Field Overview</span>
          </Link>
        </div>

        {/* Main Grid: Upload & Verification */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* File Upload Section */}
          <div className="lg:col-span-5 space-y-4">
            <div className="bg-white border border-slate-200 rounded-3xl p-5 shadow-xs space-y-4">
              <div>
                <h3 className="text-sm font-bold text-slate-900">Upload Physical Sheet</h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Supported formats: JPEG, PNG, or PDF attendance images for {siteParam}.
                </p>
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
                      <span>Parsing & Digitizing Log...</span>
                    </>
                  ) : (
                    <span>Process & Extract Records</span>
                  )}
                </button>
              )}
            </div>

            {/* Document Preview Box */}
            {filePreviewUrl && (
              <div className="bg-white border border-slate-200 rounded-3xl p-4 shadow-xs space-y-2">
                <div className="flex items-center justify-between text-xs font-bold text-slate-700">
                  <span className="flex items-center gap-1.5">
                    <Eye className="w-4 h-4 text-indigo-600" /> Document Preview
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

          {/* Side-by-Side Audit / Verification Table */}
          <div className="lg:col-span-7">
            <div className="bg-white border border-slate-200 rounded-3xl p-5 shadow-xs space-y-5">
              <div className="flex items-center justify-between border-b border-slate-100 pb-4">
                <div>
                  <h3 className="text-sm font-bold text-slate-900">Extracted Attendance Audit</h3>
                  <p className="text-xs text-slate-500">
                    Cross-examine parsed values before committing to shift_logs.
                  </p>
                </div>
                {parsedData && (
                  <span className="text-xs font-bold bg-indigo-50 text-indigo-700 px-3 py-1 rounded-full border border-indigo-200">
                    {parsedData.length} Workers Detected
                  </span>
                )}
              </div>

              {submitSuccess ? (
                <div className="p-6 bg-emerald-50 border border-emerald-200 rounded-2xl text-center space-y-3">
                  <div className="p-3 bg-emerald-100 text-emerald-700 rounded-full w-12 h-12 flex items-center justify-center mx-auto">
                    <CheckCircle2 className="w-6 h-6" />
                  </div>
                  <h4 className="text-base font-bold text-emerald-900">Timesheet Logs Locked</h4>
                  <p className="text-xs text-emerald-700 max-w-md mx-auto">
                    Shift entries for {siteParam} have been stored in shift_logs for payroll calculation.
                  </p>
                  <div className="pt-2">
                    <Link
                      href="/dashboard/site-clerk"
                      className="inline-flex items-center gap-2 bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-semibold px-4 py-2.5 rounded-xl transition"
                    >
                      Return to Dashboard
                    </Link>
                  </div>
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
                          <th className="p-3">Status</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {parsedData.map((worker) => (
                          <tr key={worker.id} className="hover:bg-slate-50/80 transition">
                            <td className="p-3 font-semibold text-slate-900">
                              <div>{worker.worker_name}</div>
                              <div className="text-[10px] text-slate-400 font-normal">{worker.employee_code}</div>
                            </td>
                            <td className="p-3 font-mono">{worker.timeInStr}</td>
                            <td className="p-3 font-mono">{worker.timeOutStr}</td>
                            <td className="p-3 font-bold text-slate-800">{worker.regular_hours}h</td>
                            <td className="p-3">
                              {worker.status === 'completed' && (
                                <span className="inline-flex items-center gap-1 text-[10px] font-bold bg-emerald-50 text-emerald-700 px-2 py-0.5 rounded-md border border-emerald-200">
                                  <CheckCircle2 className="w-3 h-3" /> Completed
                                </span>
                              )}
                              {worker.status === 'late' && (
                                <span className="inline-flex items-center gap-1 text-[10px] font-bold bg-amber-50 text-amber-700 px-2 py-0.5 rounded-md border border-amber-200">
                                  <Clock className="w-3 h-3" /> Late Shift
                                </span>
                              )}
                              {worker.status === 'flagged' && (
                                <span className="inline-flex items-center gap-1 text-[10px] font-bold bg-red-50 text-red-700 px-2 py-0.5 rounded-md border border-red-200">
                                  <ShieldAlert className="w-3 h-3" /> Flagged
                                </span>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  <div className="flex items-center justify-end gap-3 pt-2">
                    <button
                      onClick={() => setParsedData(null)}
                      className="px-4 py-2.5 rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-50 text-xs font-semibold transition cursor-pointer"
                    >
                      Re-upload
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
                  <p className="text-xs font-bold text-slate-700">No Document Parsed Yet</p>
                  <p className="text-[11px] text-slate-400 max-w-xs">
                    Select a scanned timesheet image or PDF on the left and click process to generate side-by-side audit metrics.
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