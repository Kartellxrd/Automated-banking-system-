'use client';

import { useState, useEffect, useCallback, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { 
  Building2, 
  UploadCloud, 
  FileText, 
  CheckCircle2, 
  AlertCircle, 
  ArrowLeft, 
  Trash2, 
  ExternalLink,
  Loader2,
  ShieldCheck,
  UserCheck
} from 'lucide-react';
import SiteClerkSideNav from '@/components/site-clerk/SiteClerkSideNav';
import SiteClerkNavbar from '@/components/site-clerk/SiteClerkNavbar';

function SiteClerkDocumentsContent() {
  const searchParams = useSearchParams();
  const initialSite = searchParams.get('site') || 'Site A';

  const [sites, setSites] = useState([]);
  const [selectedSite, setSelectedSite] = useState(initialSite);
  const [employees, setEmployees] = useState([]);
  const [selectedEmployeeId, setSelectedEmployeeId] = useState('');
  const [documentType, setDocumentType] = useState('Medical Certificate');
  const [file, setFile] = useState(null);
  
  const [isLoading, setIsLoading] = useState(true);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadMessage, setUploadMessage] = useState(null);
  const [errorMessage, setErrorMessage] = useState(null);
  const [recentUploads, setRecentUploads] = useState([]);

  // Fetch site-specific employees and recent uploads dynamically
  const loadSiteData = useCallback(async () => {
    setIsLoading(true);
    try {
      const res = await fetch(`/api/site-clerk/documents?site=${encodeURIComponent(selectedSite)}`);
      const json = await res.json();

      if (!res.ok || !json.success) {
        throw new Error(json.error || 'Failed to fetch site document data');
      }

      if (json.sites && json.sites.length > 0) {
        setSites(json.sites);
      }
      setEmployees(json.employees || []);
      setRecentUploads(json.documents || []);
    } catch (err) {
      console.error('Error fetching document portal data:', err);
    } finally {
      setIsLoading(false);
    }
  }, [selectedSite]);

  useEffect(() => {
    loadSiteData();
    setSelectedEmployeeId(''); // Reset selected worker when site changes
  }, [loadSiteData, selectedSite]);

  const handleFileChange = (e) => {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0]);
    }
  };

  const handleUploadSubmit = async (e) => {
    e.preventDefault();
    if (!file || !selectedEmployeeId) {
      setErrorMessage('Please select an assigned worker and attach a proof document.');
      return;
    }

    setIsUploading(true);
    setUploadMessage(null);
    setErrorMessage(null);

    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('employee_id', selectedEmployeeId);
      formData.append('document_type', documentType);

      const res = await fetch('/api/site-clerk/documents', {
        method: 'POST',
        body: formData,
      });

      const json = await res.json();

      if (!res.ok || !json.success) {
        throw new Error(json.error || 'Failed to upload document.');
      }

      setUploadMessage('Proof document attached successfully and uploaded to sick-notes bucket.');
      setFile(null);
      setSelectedEmployeeId('');

      // Reload fresh documents stream
      loadSiteData();
    } catch (err) {
      setErrorMessage(err.message);
    } finally {
      setIsUploading(false);
    }
  };

  const handleDeleteDoc = async (docId) => {
    if (!confirm('Are you sure you want to remove this medical/leave document?')) return;

    try {
      const res = await fetch(`/api/site-clerk/documents?id=${docId}`, {
        method: 'DELETE',
      });
      const json = await res.json();

      if (json.success) {
        setRecentUploads((prev) => prev.filter((doc) => doc.id !== docId));
      } else {
        alert(json.error || 'Failed to delete document');
      }
    } catch (err) {
      console.error('Delete document error:', err);
    }
  };

  return (
    <div className="min-h-screen bg-slate-100 text-slate-900 flex flex-col lg:flex-row font-sans">
      <SiteClerkSideNav />

      <main className="flex-1 p-4 sm:p-6 lg:p-8 space-y-6 overflow-x-hidden">
        <SiteClerkNavbar title="Medical & Absence Proof Upload" siteName={selectedSite} />

        {/* Header Controls */}
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
              {sites.length > 0 ? (
                sites.map((site) => (
                  <option key={site} value={site}>{site}</option>
                ))
              ) : (
                <option value={selectedSite}>{selectedSite}</option>
              )}
            </select>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Upload Form Card */}
          <div className="lg:col-span-6 bg-white p-6 rounded-3xl border border-slate-200 shadow-xs space-y-5">
            <div className="border-b border-slate-100 pb-3 flex items-center justify-between">
              <div>
                <h3 className="text-base font-extrabold text-slate-900">Upload Site Absence Proof</h3>
                <p className="text-xs text-slate-500">Attach medical certificates or leave proof straight from {selectedSite}</p>
              </div>
              <div className="p-2 bg-blue-50 text-blue-600 rounded-xl">
                <UploadCloud className="w-5 h-5" />
              </div>
            </div>

            {uploadMessage && (
              <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs rounded-2xl flex items-center gap-2 font-medium">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>{uploadMessage}</span>
              </div>
            )}

            {errorMessage && (
              <div className="p-3 bg-red-50 border border-red-200 text-red-800 text-xs rounded-2xl flex items-center gap-2 font-medium">
                <AlertCircle className="w-4 h-4 text-red-600 shrink-0" />
                <span>{errorMessage}</span>
              </div>
            )}

            <form onSubmit={handleUploadSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  1. Select Absent Worker ({selectedSite})
                </label>
                <div className="relative">
                  <select
                    value={selectedEmployeeId}
                    onChange={(e) => setSelectedEmployeeId(e.target.value)}
                    disabled={isLoading}
                    className="w-full bg-slate-50 border border-slate-200 text-xs font-bold rounded-xl px-3 py-2.5 outline-none focus:ring-2 focus:ring-indigo-500 appearance-none cursor-pointer disabled:opacity-50"
                    required
                  >
                    <option value="">
                      {isLoading ? 'Loading workers...' : `-- Choose Worker from ${selectedSite} --`}
                    </option>
                    {employees.map((emp) => (
                      <option key={emp.id} value={emp.id}>
                        {emp.first_name} {emp.last_name} ({emp.employee_code}) - {emp.job_role || 'Worker'}
                      </option>
                    ))}
                  </select>
                  <UserCheck className="w-4 h-4 text-slate-400 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  2. Document Category
                </label>
                <select
                  value={documentType}
                  onChange={(e) => setDocumentType(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 text-xs font-bold rounded-xl px-3 py-2.5 outline-none focus:ring-2 focus:ring-indigo-500 cursor-pointer"
                >
                  <option value="Medical Certificate">Medical Certificate / Sick Note</option>
                  <option value="Casual Leave Approval">Casual Leave Approval</option>
                  <option value="Injury Report">Site Injury / Incident Report</option>
                  <option value="General Document">General Compliance Document</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  3. Attachment File (PDF or Image)
                </label>
                <div className="border-2 border-dashed border-slate-200 hover:border-indigo-400 rounded-2xl p-6 text-center bg-slate-50/50 hover:bg-slate-50 transition flex flex-col items-center justify-center space-y-2 cursor-pointer relative">
                  <input
                    type="file"
                    accept="image/*,application/pdf"
                    onChange={handleFileChange}
                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                    required
                  />
                  <div className="p-3 bg-indigo-50 text-indigo-600 rounded-full">
                    <FileText className="w-6 h-6" />
                  </div>
                  {file ? (
                    <div>
                      <p className="text-xs font-extrabold text-indigo-600">{file.name}</p>
                      <p className="text-[10px] text-slate-400">{(file.size / 1024).toFixed(1)} KB • Ready to upload</p>
                    </div>
                  ) : (
                    <div>
                      <p className="text-xs font-bold text-slate-700">Click or Drag & Drop file here</p>
                      <p className="text-[10px] text-slate-400">Uploads to sick-notes bucket (PDF, PNG, JPG)</p>
                    </div>
                  )}
                </div>
              </div>

              <button
                type="submit"
                disabled={isUploading}
                className="w-full py-3.5 bg-indigo-600 hover:bg-indigo-700 active:scale-[0.99] text-white font-extrabold text-xs rounded-xl shadow-xs transition flex items-center justify-center gap-2 disabled:opacity-50 cursor-pointer"
              >
                {isUploading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Saving to sick-notes bucket...</span>
                  </>
                ) : (
                  <>
                    <UploadCloud className="w-4 h-4" />
                    <span>Upload Proof Document</span>
                  </>
                )}
              </button>
            </form>
          </div>

          {/* Recent Submissions Feed */}
          <div className="lg:col-span-6 bg-white p-6 rounded-3xl border border-slate-200 shadow-xs flex flex-col justify-between space-y-4">
            <div className="border-b border-slate-100 pb-3 flex items-center justify-between">
              <div>
                <h3 className="text-base font-extrabold text-slate-900">Recent {selectedSite} Documents</h3>
                <p className="text-xs text-slate-500">Live feed from sick-notes storage bucket</p>
              </div>
              <span className="text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200 px-2.5 py-1 rounded-full">
                Bucket: sick-notes
              </span>
            </div>

            <div className="space-y-3 flex-1 overflow-y-auto max-h-[420px] pr-1">
              {isLoading ? (
                <div className="py-12 text-center text-slate-400">
                  <Loader2 className="w-5 h-5 animate-spin mx-auto text-indigo-600 mb-2" />
                  <p className="text-xs font-medium">Fetching documents for {selectedSite}...</p>
                </div>
              ) : recentUploads.length === 0 ? (
                <div className="p-8 text-center text-slate-400 space-y-2">
                  <FileText className="w-8 h-8 mx-auto opacity-50" />
                  <p className="text-xs font-semibold">No documents uploaded for {selectedSite} yet.</p>
                </div>
              ) : (
                recentUploads.map((doc) => (
                  <div
                    key={doc.id}
                    className="p-3 bg-slate-50 border border-slate-200 rounded-2xl flex items-center justify-between gap-3 hover:bg-slate-100/60 transition"
                  >
                    <div className="flex items-center gap-3">
                      <div className="p-2.5 bg-indigo-50 text-indigo-600 rounded-xl shrink-0">
                        <FileText className="w-4 h-4" />
                      </div>
                      <div className="truncate">
                        <h5 className="text-xs font-extrabold text-slate-900 truncate">{doc.employee_name}</h5>
                        <div className="flex items-center gap-2 text-[10px] text-slate-500 mt-0.5">
                          <span className="font-mono">{doc.employee_code}</span>
                          <span>•</span>
                          <span className="font-bold text-slate-700">{doc.document_type}</span>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      {doc.document_url && (
                        <a
                          href={doc.document_url}
                          target="_blank"
                          rel="noreferrer"
                          className="p-2 bg-white hover:bg-indigo-50 text-slate-600 hover:text-indigo-600 rounded-lg border border-slate-200 transition"
                          title="Preview Document"
                        >
                          <ExternalLink className="w-3.5 h-3.5" />
                        </a>
                      )}
                      <button
                        onClick={() => handleDeleteDoc(doc.id)}
                        className="p-2 bg-white hover:bg-red-50 text-slate-400 hover:text-red-600 rounded-lg border border-slate-200 transition"
                        title="Delete Document"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>

            <div className="p-3 bg-slate-100/70 rounded-2xl border border-slate-200/80 flex items-center gap-2 text-[11px] text-slate-600">
              <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>All uploads sync directly with employee profiles for HR verification.</span>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}

export default function SiteClerkDocumentsPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex justify-center items-center bg-slate-100 text-xs font-bold text-slate-400">
          <Loader2 className="w-5 h-5 animate-spin text-indigo-600 mr-2" />
          Loading Document Portal...
        </div>
      }
    >
      <SiteClerkDocumentsContent />
    </Suspense>
  );
}