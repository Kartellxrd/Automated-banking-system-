'use client';

import { useState } from 'react';
import HRSideNav from '@/components/hr/HRSideNav';
import HRNavbar from '@/components/hr/HRNavbar';
import { 
  FolderOpen, 
  Search, 
  Plus, 
  FileText, 
  Eye, 
  Download, 
  X, 
  CheckCircle2, 
  Clock, 
  AlertCircle,
  UploadCloud,
  User,
  ShieldCheck,
  FileCheck
} from 'lucide-react';

export default function HREmployeesPage() {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [previewDoc, setPreviewDoc] = useState(null);
  const [uploadModalOpen, setUploadModalOpen] = useState(false);

  // Mock Employee Documents Database
  const [documents, setDocuments] = useState([
    {
      id: 'DOC-101',
      employeeName: 'Kago Phuthego',
      employeeId: 'EMP-8802',
      docType: 'National ID Copy',
      category: 'Identity',
      fileName: 'kago_national_id.pdf',
      fileUrl: 'https://images.unsplash.com/photo-1568602471122-7832951cc4c5?auto=format&fit=crop&q=80&w=800', // Mock Image Preview
      fileType: 'image',
      uploadDate: '2026-08-10',
      status: 'Verified',
    },
    {
      id: 'DOC-102',
      employeeName: 'Thabo Mokoena',
      employeeId: 'EMP-4105',
      docType: 'Employment Contract (Full-Time)',
      category: 'Contract',
      fileName: 'thabo_contract_signed.pdf',
      fileUrl: 'https://images.unsplash.com/photo-1554224155-8d04cb21cd6c?auto=format&fit=crop&q=80&w=800',
      fileType: 'image',
      uploadDate: '2026-08-01',
      status: 'Verified',
    },
    {
      id: 'DOC-103',
      employeeName: 'Kabelo Sechele',
      employeeId: 'EMP-2901',
      docType: 'Annual Mine Fitness Medical',
      category: 'Medical',
      fileName: 'kabelo_fitness_cert.png',
      fileUrl: 'https://images.unsplash.com/photo-1584515979956-d9f6e5d09982?auto=format&fit=crop&q=80&w=800',
      fileType: 'image',
      uploadDate: '2026-08-12',
      status: 'Pending Review',
    },
    {
      id: 'DOC-104',
      employeeName: 'Lindiwe Dlamini',
      employeeId: 'EMP-6043',
      docType: 'Bank Account Confirmation',
      category: 'Banking',
      fileName: 'lindiwe_bank_letter.pdf',
      fileUrl: 'https://images.unsplash.com/photo-1450133064473-71024230f91b?auto=format&fit=crop&q=80&w=800',
      fileType: 'image',
      uploadDate: '2026-07-28',
      status: 'Verified',
    },
  ]);

  // Categories
  const categories = ['All', 'Identity', 'Contract', 'Medical', 'Banking'];

  // Filter Logic
  const filteredDocs = documents.filter((doc) => {
    const matchesCategory = selectedCategory === 'All' || doc.category === selectedCategory;
    const matchesSearch = doc.employeeName.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          doc.employeeId.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          doc.docType.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col lg:flex-row font-sans">
      {/* HR Side Navigation */}
      <HRSideNav />

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0">
        <HRNavbar />

        <main className="p-4 sm:p-6 lg:p-8 space-y-6 max-w-7xl mx-auto w-full">
          {/* Header Banner */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-6 rounded-3xl border border-slate-200/80 shadow-xs">
            <div>
              <div className="flex items-center gap-2 text-xs font-extrabold text-indigo-600 uppercase tracking-wider mb-1">
                <FolderOpen className="w-4 h-4" />
                <span>Personnel Compliance Archive</span>
              </div>
              <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">Employee Files & Documents</h1>
              <p className="text-slate-500 text-sm mt-1">Upload and review employee national IDs, signed contracts, medical fitness forms, and bank proofs.</p>
            </div>
            <button
              onClick={() => setUploadModalOpen(true)}
              className="inline-flex items-center justify-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-sm px-5 py-3 rounded-2xl transition shadow-md shadow-indigo-600/20 active:scale-95 shrink-0 cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>Upload Document</span>
            </button>
          </div>

          {/* Controls: Search & Category Filters */}
          <div className="bg-white p-4 sm:p-5 rounded-3xl border border-slate-200/80 shadow-xs flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4">
            {/* Search Input */}
            <div className="relative flex-1 max-w-md">
              <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Search worker name, ID (e.g. EMP-8802), or doc type..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-2xl text-xs font-medium text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white transition"
              />
            </div>

            {/* Category Filter Pills */}
            <div className="flex items-center gap-1.5 overflow-x-auto pb-1 md:pb-0 scrollbar-none">
              {categories.map((cat) => (
                <button
                  key={cat}
                  onClick={() => setSelectedCategory(cat)}
                  className={`px-3.5 py-2 rounded-xl text-xs font-extrabold transition shrink-0 cursor-pointer ${
                    selectedCategory === cat
                      ? 'bg-indigo-600 text-white shadow-xs'
                      : 'bg-slate-100 text-slate-600 hover:bg-indigo-50 hover:text-indigo-600'
                  }`}
                >
                  {cat}
                </button>
              ))}
            </div>
          </div>

          {/* Document Table / Card Grid */}
          <div className="bg-white rounded-3xl border border-slate-200/80 shadow-xs overflow-hidden">
            <div className="p-5 border-b border-slate-100 flex items-center justify-between">
              <h2 className="text-base font-black text-slate-900 flex items-center gap-2">
                <FileCheck className="w-5 h-5 text-indigo-600" />
                <span>Uploaded Employee Files ({filteredDocs.length})</span>
              </h2>
            </div>

            {filteredDocs.length === 0 ? (
              <div className="p-12 text-center space-y-3">
                <div className="w-12 h-12 bg-slate-100 rounded-2xl text-slate-400 flex items-center justify-center mx-auto">
                  <FolderOpen className="w-6 h-6" />
                </div>
                <p className="text-slate-600 text-sm font-bold">No documents match your query.</p>
                <p className="text-slate-400 text-xs">Try clearing search filters or uploading a new document.</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-slate-50/70 border-b border-slate-100 text-[11px] font-extrabold text-slate-400 uppercase tracking-wider">
                      <th className="py-3.5 px-6">Employee</th>
                      <th className="py-3.5 px-6">Document Type</th>
                      <th className="py-3.5 px-6">Category</th>
                      <th className="py-3.5 px-6">Upload Date</th>
                      <th className="py-3.5 px-6">Status</th>
                      <th className="py-3.5 px-6 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-xs font-medium text-slate-700">
                    {filteredDocs.map((doc) => (
                      <tr key={doc.id} className="hover:bg-indigo-50/30 transition">
                        {/* Employee Details */}
                        <td className="py-4 px-6">
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-xl bg-indigo-100 text-indigo-700 font-bold flex items-center justify-center text-xs shrink-0">
                              <User className="w-4 h-4" />
                            </div>
                            <div>
                              <span className="font-bold text-slate-900 block leading-tight">{doc.employeeName}</span>
                              <span className="text-[10px] text-slate-400 font-semibold">{doc.employeeId}</span>
                            </div>
                          </div>
                        </td>

                        {/* Doc Type */}
                        <td className="py-4 px-6">
                          <div className="flex items-center gap-2">
                            <FileText className="w-4 h-4 text-slate-400 shrink-0" />
                            <span className="font-bold text-slate-800">{doc.docType}</span>
                          </div>
                        </td>

                        {/* Category */}
                        <td className="py-4 px-6">
                          <span className="px-2.5 py-1 rounded-lg text-[10px] font-bold bg-slate-100 text-slate-600 border border-slate-200">
                            {doc.category}
                          </span>
                        </td>

                        {/* Upload Date */}
                        <td className="py-4 px-6 text-slate-500 font-semibold">
                          {doc.uploadDate}
                        </td>

                        {/* Status */}
                        <td className="py-4 px-6">
                          {doc.status === 'Verified' ? (
                            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-extrabold bg-emerald-50 text-emerald-700 border border-emerald-200">
                              <CheckCircle2 className="w-3 h-3" />
                              Verified
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-extrabold bg-amber-50 text-amber-700 border border-amber-200">
                              <Clock className="w-3 h-3" />
                              Pending Review
                            </span>
                          )}
                        </td>

                        {/* Action Buttons */}
                        <td className="py-4 px-6 text-right">
                          <div className="flex items-center justify-end gap-2">
                            <button
                              onClick={() => setPreviewDoc(doc)}
                              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-indigo-50 hover:bg-indigo-600 text-indigo-700 hover:text-white rounded-xl text-xs font-bold transition cursor-pointer"
                            >
                              <Eye className="w-3.5 h-3.5" />
                              <span>Preview</span>
                            </button>
                            <a
                              href={doc.fileUrl}
                              target="_blank"
                              rel="noreferrer"
                              className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-xl transition cursor-pointer"
                              title="Download document"
                            >
                              <Download className="w-4 h-4" />
                            </a>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </main>
      </div>

      {/* DOCUMENT PREVIEW MODAL */}
      {previewDoc && (
        <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-4 sm:p-6 animate-in fade-in duration-200">
          <div className="bg-white w-full max-w-4xl rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh] border border-slate-200">
            {/* Modal Topbar */}
            <div className="p-4 sm:p-5 border-b border-slate-200 flex items-center justify-between bg-slate-50">
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-2xl bg-indigo-50 text-indigo-600 border border-indigo-100">
                  <FileText className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-extrabold text-slate-900 text-sm">{previewDoc.docType}</h3>
                  <p className="text-[11px] text-slate-500 font-medium">
                    {previewDoc.employeeName} ({previewDoc.employeeId}) • Uploaded {previewDoc.uploadDate}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <a
                  href={previewDoc.fileUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-1.5 px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition"
                >
                  <Download className="w-4 h-4" />
                  <span className="hidden sm:inline">Download</span>
                </a>
                <button
                  onClick={() => setPreviewDoc(null)}
                  className="p-2 text-slate-400 hover:text-slate-700 hover:bg-slate-200 rounded-xl transition cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Modal Preview Body */}
            <div className="p-6 overflow-y-auto bg-slate-950/5 flex items-center justify-center min-h-[350px]">
              <div className="max-w-full max-h-[60vh] rounded-2xl overflow-hidden border border-slate-200 shadow-md bg-white">
                <img
                  src={previewDoc.fileUrl}
                  alt={previewDoc.docType}
                  className="object-contain max-h-[60vh] w-auto mx-auto"
                />
              </div>
            </div>

            {/* Modal Footer Controls */}
            <div className="p-4 border-t border-slate-200 bg-white flex flex-col sm:flex-row items-center justify-between gap-3">
              <div className="flex items-center gap-2 text-xs text-slate-500">
                <ShieldCheck className="w-4 h-4 text-indigo-600" />
                <span>Verified Compliance Document • Stored encrypted in Supabase Vault</span>
              </div>
              <button
                onClick={() => setPreviewDoc(null)}
                className="w-full sm:w-auto px-6 py-2.5 bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs rounded-xl transition cursor-pointer"
              >
                Close Preview
              </button>
            </div>
          </div>
        </div>
      )}

      {/* UPLOAD DOCUMENT MODAL */}
      {uploadModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="bg-white w-full max-w-lg rounded-3xl shadow-2xl p-6 space-y-6 border border-slate-200">
            <div className="flex items-center justify-between border-b border-slate-100 pb-4">
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-2xl bg-indigo-50 text-indigo-600">
                  <UploadCloud className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-extrabold text-slate-900 text-sm">Upload Employee Document</h3>
                  <p className="text-[11px] text-slate-500 font-medium">Attach verified personnel records to employee profile</p>
                </div>
              </div>
              <button
                onClick={() => setUploadModalOpen(false)}
                className="p-2 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-xl transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form className="space-y-4" onSubmit={(e) => { e.preventDefault(); setUploadModalOpen(false); }}>
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Select Employee</label>
                <select className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500">
                  <option value="EMP-8802">Kago Phuthego (EMP-8802)</option>
                  <option value="EMP-4105">Thabo Mokoena (EMP-4105)</option>
                  <option value="EMP-2901">Kabelo Sechele (EMP-2901)</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Document Category</label>
                <select className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500">
                  <option value="Identity">Identity (National ID / Passport)</option>
                  <option value="Contract">Contract (Rates & Agreement)</option>
                  <option value="Medical">Medical Fitness Certificate</option>
                  <option value="Banking">Banking / E-Wallet Confirmation</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">File Attachment (PDF, PNG, JPG)</label>
                <div className="border-2 border-dashed border-slate-200 rounded-2xl p-6 text-center hover:border-indigo-400 transition cursor-pointer bg-slate-50/50">
                  <UploadCloud className="w-8 h-8 text-indigo-500 mx-auto mb-2" />
                  <p className="text-xs font-bold text-slate-700">Click to browse or drop file here</p>
                  <p className="text-[10px] text-slate-400 mt-1">Maximum file size 15MB</p>
                </div>
              </div>

              <div className="pt-2 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setUploadModalOpen(false)}
                  className="px-4 py-2.5 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-xl transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs rounded-xl transition shadow-md shadow-indigo-600/20"
                >
                  Confirm & Upload
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}