'use client';

import React, { useState, useEffect } from 'react';
import HRSideNav from '@/components/hr/HRSideNav';
import HRNavbar from '@/components/hr/HRNavbar';
import { 
  FileText, 
  Search, 
  User, 
  Eye, 
  ExternalLink, 
  Download, 
  RefreshCw,
  FolderOpen,
  AlertCircle,
  Plus,
  Upload,
  X,
  CheckCircle2
} from 'lucide-react';

const DOCUMENT_TYPES = [
  'National ID / Passport',
  'Medical Examination',
  'Driver License',
  'Employment Contract',
  'Academic Certificate',
  'Banking Details Proof',
  'Tax Form',
  'Other'
];

export default function HRDocumentsDocketPage() {
  const [employees, setEmployees] = useState([]);
  const [documents, setDocuments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  
  // Filtering states
  const [selectedEmployeeId, setSelectedEmployeeId] = useState('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  
  // Selected Document for Side Preview Panel
  const [selectedDoc, setSelectedDoc] = useState(null);

  // Modal & Form Upload States
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadForm, setUploadForm] = useState({
    employee_id: '',
    document_type: DOCUMENT_TYPES[0],
    title: '',
    file: null
  });

  // Fetch Employees & Documents
  const fetchData = async () => {
    setLoading(true);
    setErrorMessage('');
    try {
      const [empRes, docRes] = await Promise.all([
        fetch('/api/hr/employees'),
        fetch('/api/hr/documents')
      ]);

      const empData = await empRes.json();
      const docData = await docRes.json();

      if (empData.success) {
        setEmployees(empData.data || []);
      }

      if (docData.success) {
        const fetchedDocs = docData.data || [];
        setDocuments(fetchedDocs);
        if (fetchedDocs.length > 0) {
          setSelectedDoc(fetchedDocs[0]);
        }
      } else {
        setErrorMessage(docData.error || 'Failed to retrieve documents.');
      }
    } catch (err) {
      console.error('Error fetching docket data:', err);
      setErrorMessage(err.message || 'Network error fetching data.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  // Handle Upload Submission
  const handleUploadSubmit = async (e) => {
    e.preventDefault();
    if (!uploadForm.employee_id || !uploadForm.file) {
      setErrorMessage('Please select an employee and choose a file to upload.');
      return;
    }

    setUploading(true);
    setErrorMessage('');
    setSuccessMessage('');

    try {
      const formData = new FormData();
      formData.append('employee_id', uploadForm.employee_id);
      formData.append('document_type', uploadForm.document_type);
      formData.append('title', uploadForm.title || uploadForm.document_type);
      formData.append('file', uploadForm.file);

      const res = await fetch('/api/hr/documents', {
        method: 'POST',
        body: formData,
      });

      const data = await res.json();

      if (data.success) {
        setSuccessMessage('Document uploaded successfully!');
        setIsUploadModalOpen(false);
        setUploadForm({
          employee_id: '',
          document_type: DOCUMENT_TYPES[0],
          title: '',
          file: null
        });
        await fetchData(); // Refresh list to view newly uploaded doc
      } else {
        setErrorMessage(data.error || 'Failed to upload document.');
      }
    } catch (err) {
      setErrorMessage(err.message || 'Error occurred while uploading.');
    } finally {
      setUploading(false);
    }
  };

  // Filter Documents based on Employee Dropdown and Search Input
  const filteredDocs = documents.filter((doc) => {
    const matchesEmployee =
      selectedEmployeeId === 'ALL' ||
      String(doc.employee_id) === String(selectedEmployeeId);

    const matchesSearch =
      doc.employee_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      doc.document_type?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      doc.title?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      doc.file_name?.toLowerCase().includes(searchQuery.toLowerCase());

    return matchesEmployee && matchesSearch;
  });

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 flex flex-col lg:flex-row">
      <HRSideNav />

      <div className="flex-1 flex flex-col min-w-0">
        <HRNavbar />

        <main className="flex-1 p-4 sm:p-6 lg:p-8 overflow-y-auto">
          {/* Header Bar */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6 pb-6 border-b border-slate-200 bg-white p-6 rounded-2xl border shadow-xs">
            <div>
              <h1 className="text-2xl font-black text-slate-900 tracking-tight flex items-center gap-2">
                <FileText className="w-7 h-7 text-indigo-600" />
                Employee Document Vault
              </h1>
              <p className="text-xs text-slate-500 mt-1">
                Upload, store, and review personnel compliance records (IDs, contracts, medicals, licenses).
              </p>
            </div>

            <div className="flex items-center gap-3">
              <button
                onClick={() => setIsUploadModalOpen(true)}
                className="inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-xl transition shadow-xs"
              >
                <Plus className="w-4 h-4" />
                <span>Upload New Document</span>
              </button>

              <button
                onClick={fetchData}
                className="inline-flex items-center justify-center p-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl transition border border-slate-200"
                title="Refresh Vault"
              >
                <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
              </button>
            </div>
          </div>

          {/* Feedback Messages */}
          {errorMessage && (
            <div className="mb-6 p-4 bg-rose-50 border border-rose-200 rounded-2xl flex items-center justify-between text-rose-700 text-xs font-semibold">
              <div className="flex items-center gap-3">
                <AlertCircle className="w-5 h-5 text-rose-500 shrink-0" />
                <span>{errorMessage}</span>
              </div>
              <button onClick={() => setErrorMessage('')}><X className="w-4 h-4" /></button>
            </div>
          )}

          {successMessage && (
            <div className="mb-6 p-4 bg-emerald-50 border border-emerald-200 rounded-2xl flex items-center justify-between text-emerald-700 text-xs font-semibold">
              <div className="flex items-center gap-3">
                <CheckCircle2 className="w-5 h-5 text-emerald-500 shrink-0" />
                <span>{successMessage}</span>
              </div>
              <button onClick={() => setSuccessMessage('')}><X className="w-4 h-4" /></button>
            </div>
          )}

          {/* Filter Bar */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6 bg-white p-4 sm:p-6 rounded-2xl border border-slate-200 shadow-xs">
            <div>
              <label className="block text-[11px] font-extrabold text-slate-500 uppercase tracking-wider mb-2">
                Filter by Personnel
              </label>
              <div className="relative">
                <select
                  value={selectedEmployeeId}
                  onChange={(e) => setSelectedEmployeeId(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-300 rounded-xl px-4 py-3 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500 font-semibold appearance-none"
                >
                  <option value="ALL">All Active Employees ({employees.length})</option>
                  {employees.map((emp) => (
                    <option key={emp.id} value={emp.id}>
                      {emp.first_name} {emp.last_name} — [{emp.employee_code || 'No Code'}]
                    </option>
                  ))}
                </select>
                <User className="w-4 h-4 text-slate-400 absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none" />
              </div>
            </div>

            <div>
              <label className="block text-[11px] font-extrabold text-slate-500 uppercase tracking-wider mb-2">
                Search Documents
              </label>
              <div className="relative">
                <input
                  type="text"
                  placeholder="Search by name, document type..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-300 rounded-xl px-4 py-3 pl-10 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
                <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              </div>
            </div>
          </div>

          {/* Side-By-Side Split Workspace */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
            
            {/* LEFT COLUMN: Document Cards (5 Columns) */}
            <div className="lg:col-span-5 space-y-3">
              <h2 className="text-xs font-extrabold text-slate-500 uppercase tracking-wider mb-3 px-1">
                Vault Records ({filteredDocs.length})
              </h2>

              {loading ? (
                <div className="p-12 text-center bg-white rounded-2xl border border-slate-200 shadow-xs">
                  <RefreshCw className="w-6 h-6 text-indigo-600 animate-spin mx-auto mb-2" />
                  <p className="text-xs font-medium text-slate-500">Loading documents...</p>
                </div>
              ) : filteredDocs.length === 0 ? (
                <div className="p-10 text-center bg-white rounded-2xl border border-dashed border-slate-300 shadow-xs">
                  <FolderOpen className="w-8 h-8 text-slate-400 mx-auto mb-2" />
                  <p className="text-sm font-bold text-slate-800">No records found</p>
                  <p className="text-xs text-slate-500 mt-1">
                    Upload a new document for an employee using the button above.
                  </p>
                </div>
              ) : (
                <div className="space-y-3 max-h-[680px] overflow-y-auto pr-1">
                  {filteredDocs.map((doc) => {
                    const isSelected = selectedDoc?.id === doc.id;
                    return (
                      <div
                        key={doc.id}
                        onClick={() => setSelectedDoc(doc)}
                        className={`p-4 rounded-2xl border cursor-pointer transition-all ${
                          isSelected
                            ? 'bg-indigo-50/80 border-indigo-500 shadow-sm ring-2 ring-indigo-500/20'
                            : 'bg-white hover:bg-slate-50 border-slate-200'
                        }`}
                      >
                        <div className="flex items-start justify-between gap-2 mb-2">
                          <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-indigo-100 text-indigo-700 border border-indigo-200">
                            {doc.document_type || 'Document'}
                          </span>
                          <span className="text-[10px] font-bold text-slate-400">
                            {doc.created_at ? new Date(doc.created_at).toLocaleDateString() : ''}
                          </span>
                        </div>

                        <h3 className="font-bold text-slate-900 text-sm line-clamp-1">
                          {doc.title || doc.file_name || 'Uploaded File'}
                        </h3>

                        <p className="text-xs text-slate-600 mt-1 flex items-center gap-1.5">
                          <User className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                          <span className="truncate font-semibold text-slate-700">
                            {doc.employee_name}
                          </span>
                        </p>

                        <div className="mt-3 pt-2.5 border-t border-slate-100 flex items-center justify-between text-[11px] font-bold">
                          <span className={isSelected ? 'text-indigo-600' : 'text-slate-400'}>
                            {isSelected ? 'Active Previewing' : 'Click to preview'}
                          </span>
                          <Eye className={`w-4 h-4 ${isSelected ? 'text-indigo-600' : 'text-slate-400'}`} />
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* RIGHT COLUMN: Document Viewer (7 Columns) */}
            <div className="lg:col-span-7 bg-white border border-slate-200 rounded-3xl p-4 sm:p-6 lg:sticky lg:top-8 h-[680px] flex flex-col shadow-xs">
              {selectedDoc ? (
                <>
                  <div className="flex items-center justify-between gap-4 pb-4 border-b border-slate-200 shrink-0">
                    <div className="min-w-0">
                      <h2 className="font-extrabold text-slate-900 text-base truncate">
                        {selectedDoc.title || selectedDoc.file_name}
                      </h2>
                      <p className="text-xs font-semibold text-indigo-600 mt-0.5 truncate">
                        {selectedDoc.employee_name} ({selectedDoc.employee_code || 'N/A'})
                      </p>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      <a
                        href={selectedDoc.file_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="p-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl transition border border-slate-200"
                        title="Open in new window"
                      >
                        <ExternalLink className="w-4 h-4" />
                      </a>
                      <a
                        href={selectedDoc.file_url}
                        download
                        className="p-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl transition shadow-xs"
                        title="Download file"
                      >
                        <Download className="w-4 h-4" />
                      </a>
                    </div>
                  </div>

                  <div className="flex-1 mt-4 bg-slate-100 rounded-2xl border border-slate-200 overflow-hidden flex items-center justify-center relative">
                    {selectedDoc.file_url?.match(/\.(jpeg|jpg|gif|png|webp)/i) ? (
                      <img
                        src={selectedDoc.file_url}
                        alt="Document Preview"
                        className="max-h-full max-w-full object-contain p-2"
                      />
                    ) : (
                      <iframe
                        src={selectedDoc.file_url}
                        className="w-full h-full bg-white border-none"
                        title="Document Viewer"
                      />
                    )}
                  </div>
                </>
              ) : (
                <div className="flex-1 flex flex-col items-center justify-center text-center p-8 border-2 border-dashed border-slate-200 rounded-2xl bg-slate-50">
                  <FileText className="w-12 h-12 text-slate-300 mb-3" />
                  <h3 className="text-base font-bold text-slate-700">No Document Selected</h3>
                  <p className="text-xs text-slate-500 mt-1 max-w-xs">
                    Select a document card from the list to preview its contents here.
                  </p>
                </div>
              )}
            </div>

          </div>
        </main>
      </div>

      {/* UPLOAD DOCUMENT MODAL */}
      {isUploadModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-xs p-4">
          <div className="bg-white w-full max-w-md rounded-3xl p-6 shadow-2xl border border-slate-100 relative">
            <button 
              onClick={() => setIsUploadModalOpen(false)}
              className="absolute right-5 top-5 p-2 text-slate-400 hover:text-slate-600 rounded-xl hover:bg-slate-100 transition"
            >
              <X className="w-5 h-5" />
            </button>

            <h2 className="text-lg font-black text-slate-900 flex items-center gap-2 mb-1">
              <Upload className="w-5 h-5 text-indigo-600" />
              Upload Personnel Document
            </h2>
            <p className="text-xs text-slate-500 mb-6">
              Attach official records for active employees in your roster.
            </p>

            <form onSubmit={handleUploadSubmit} className="space-y-4">
              {/* Select Employee */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Employee <span className="text-rose-500">*</span>
                </label>
                <select
                  required
                  value={uploadForm.employee_id}
                  onChange={(e) => setUploadForm({ ...uploadForm, employee_id: e.target.value })}
                  className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2.5 text-xs text-slate-900 focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                >
                  <option value="">Select Employee...</option>
                  {employees.map((emp) => (
                    <option key={emp.id} value={emp.id}>
                      {emp.first_name} {emp.last_name} ({emp.employee_code || 'No Code'})
                    </option>
                  ))}
                </select>
              </div>

              {/* Select Document Category */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Document Type <span className="text-rose-500">*</span>
                </label>
                <select
                  value={uploadForm.document_type}
                  onChange={(e) => setUploadForm({ ...uploadForm, document_type: e.target.value })}
                  className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2.5 text-xs text-slate-900 focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                >
                  {DOCUMENT_TYPES.map((type) => (
                    <option key={type} value={type}>
                      {type}
                    </option>
                  ))}
                </select>
              </div>

              {/* Title / Description */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Document Title
                </label>
                <input
                  type="text"
                  placeholder="e.g., Signed 2026 Contract / Driver License Front"
                  value={uploadForm.title}
                  onChange={(e) => setUploadForm({ ...uploadForm, title: e.target.value })}
                  className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2.5 text-xs text-slate-900 focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                />
              </div>

              {/* File Attachment */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Attach File (PDF, PNG, JPG) <span className="text-rose-500">*</span>
                </label>
                <input
                  type="file"
                  required
                  accept=".pdf,image/*"
                  onChange={(e) => setUploadForm({ ...uploadForm, file: e.target.files[0] })}
                  className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-xs text-slate-600 file:mr-3 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-indigo-50 file:text-indigo-700 hover:file:bg-indigo-100"
                />
              </div>

              {/* Submit Buttons */}
              <div className="pt-2 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsUploadModalOpen(false)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={uploading}
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-xl transition flex items-center gap-2"
                >
                  {uploading && <RefreshCw className="w-3.5 h-3.5 animate-spin" />}
                  <span>{uploading ? 'Uploading...' : 'Save Document'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}