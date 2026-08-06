'use client';

import { useState, useEffect } from 'react';
import { 
  UserPlus, Wallet, Building2, Search, Phone, FileText, Loader2, X, 
  UploadCloud, ExternalLink, Trash2, Eye, File, ShieldCheck 
} from 'lucide-react';

export default function EmployeesPage() {
  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterDepartment, setFilterDepartment] = useState('ALL');
  const [isRegisterModalOpen, setIsRegisterModalOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // Document Modal State
  const [selectedWorker, setSelectedWorker] = useState(null);
  const [isDocModalOpen, setIsDocModalOpen] = useState(false);
  const [uploadingDoc, setUploadingDoc] = useState(false);
  const [docType, setDocType] = useState('Omang / ID Scan');
  const [selectedFile, setSelectedFile] = useState(null);
  const [previewDocUrl, setPreviewDocUrl] = useState(null);

  const [formData, setFormData] = useState({
    employee_code: '',
    national_id: '',
    first_name: '',
    last_name: '',
    phone_number: '',
    job_role: '',
    department: 'Site A',
    hourly_rate: '',
    overtime_rate: '',
    payout_provider_id: '1',
    account_or_mobile_number: '',
    branch_code: ''
  });

  const fetchEmployees = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/employees');
      const data = await res.json();
      if (data.success) {
        setEmployees(data.data || []);
        
        // If doc modal is active, refresh the active worker's document array
        if (selectedWorker) {
          const updated = data.data.find(e => e.id === selectedWorker.id);
          if (updated) setSelectedWorker(updated);
        }
      }
    } catch (err) {
      console.error('Failed to fetch employees:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchEmployees();
  }, []);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleToggleStatus = async (id, currentStatus) => {
    try {
      const res = await fetch('/api/employees', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, is_active: !currentStatus })
      });
      const data = await res.json();
      if (data.success) fetchEmployees();
    } catch (err) {
      alert('Failed to update status');
    }
  };

  const handleRegisterSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const res = await fetch('/api/employees', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      });
      
      const result = await res.json();
      if (res.ok && result.success) {
        setIsRegisterModalOpen(false);
        setFormData({
          employee_code: '',
          national_id: '',
          first_name: '',
          last_name: '',
          phone_number: '',
          job_role: '',
          department: 'Site A',
          hourly_rate: '',
          overtime_rate: '',
          payout_provider_id: '1',
          account_or_mobile_number: '',
          branch_code: ''
        });
        fetchEmployees();
      } else {
        alert(result.error || 'Failed to create employee profile.');
      }
    } catch (err) {
      alert('Submission error: ' + err.message);
    } finally {
      setSubmitting(false);
    }
  };

  // Open Document Modal
  const handleOpenDocModal = (worker) => {
    setSelectedWorker(worker);
    setIsDocModalOpen(true);
    setPreviewDocUrl(null);
    setSelectedFile(null);
  };

  // Handle New Document Upload
  const handleDocUploadSubmit = async (e) => {
    e.preventDefault();
    if (!selectedFile || !selectedWorker) return;

    setUploadingDoc(true);
    const data = new FormData();
    data.append('file', selectedFile);
    data.append('employee_id', selectedWorker.id);
    data.append('document_type', docType);

    try {
      const res = await fetch('/api/employees/documents', {
        method: 'POST',
        body: data
      });
      const result = await res.json();

      if (result.success) {
        setSelectedFile(null);
        fetchEmployees();
      } else {
        alert(result.error || 'Document upload failed.');
      }
    } catch (err) {
      alert('Upload error: ' + err.message);
    } finally {
      setUploadingDoc(false);
    }
  };

  // Handle Document Delete
  const handleDocDelete = async (docId) => {
    if (!confirm('Are you sure you want to remove this document?')) return;

    try {
      const res = await fetch(`/api/employees/documents?id=${docId}`, {
        method: 'DELETE'
      });
      const result = await res.json();
      if (result.success) {
        if (previewDocUrl) setPreviewDocUrl(null);
        fetchEmployees();
      } else {
        alert(result.error || 'Delete failed.');
      }
    } catch (err) {
      alert('Delete error: ' + err.message);
    }
  };

  const filteredEmployees = employees.filter((emp) => {
    const fullName = `${emp.first_name} ${emp.last_name}`.toLowerCase();
    const code = (emp.employee_code || '').toLowerCase();
    const natId = (emp.national_id || '').toLowerCase();
    const matchesSearch = fullName.includes(searchTerm.toLowerCase()) || code.includes(searchTerm.toLowerCase()) || natId.includes(searchTerm.toLowerCase());
    const matchesDept = filterDepartment === 'ALL' || emp.department === filterDepartment;
    return matchesSearch && matchesDept;
  });

  return (
    <div className="min-h-screen bg-slate-50 p-4 md:p-8 text-slate-800">
      <div className="max-w-7xl mx-auto space-y-6">
        
        {/* HEADER */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-slate-900">Worker Directory & Docket Hub</h1>
            <p className="text-sm text-slate-500 mt-1">
              Centralized workforce profiles, digital dockets, and payment preferences.
            </p>
          </div>
          <button
            onClick={() => setIsRegisterModalOpen(true)}
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white font-medium px-5 py-3 rounded-xl transition shadow-sm active:scale-95"
          >
            <UserPlus className="w-5 h-5" />
            <span>Add New Worker</span>
          </button>
        </div>

        {/* SEARCH & FILTERS */}
        <div className="flex flex-col md:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
            <input
              type="text"
              placeholder="Search by worker name, ID code, or Omang/ID..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-12 pr-4 py-3 bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 text-slate-900 placeholder-slate-400 shadow-sm text-sm"
            />
          </div>
          <select
            value={filterDepartment}
            onChange={(e) => setFilterDepartment(e.target.value)}
            className="px-4 py-3 bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 text-slate-800 shadow-sm text-sm font-medium"
          >
            <option value="ALL">All Departments / Sites</option>
            <option value="Site A">Site A</option>
            <option value="Site B">Site B</option>
            <option value="Administration">Administration</option>
          </select>
        </div>

        {/* WORKER TABLE */}
        {loading ? (
          <div className="flex flex-col items-center justify-center py-16 bg-white rounded-2xl border border-slate-200">
            <Loader2 className="w-8 h-8 text-indigo-600 animate-spin" />
            <p className="text-slate-500 mt-3 text-sm font-medium">Loading directory...</p>
          </div>
        ) : filteredEmployees.length === 0 ? (
          <div className="text-center py-16 bg-white rounded-2xl border border-slate-200">
            <p className="text-slate-500 text-base font-medium">No workers found matching criteria.</p>
          </div>
        ) : (
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
            <table className="w-full text-left text-sm border-collapse">
              <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold text-xs uppercase tracking-wider">
                <tr>
                  <th className="py-4 px-5">ID / Omang</th>
                  <th className="py-4 px-5">Worker Name</th>
                  <th className="py-4 px-5">Role & Dept</th>
                  <th className="py-4 px-5">Rates (BWP)</th>
                  <th className="py-4 px-5">Payout Channel</th>
                  <th className="py-4 px-5">Docket Files</th>
                  <th className="py-4 px-5">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredEmployees.map((emp) => {
                  const profile = emp.employee_payout_profiles?.[0];
                  const provider = profile?.payout_providers;
                  const channel = provider?.payment_channels?.code;
                  const docCount = emp.employee_documents?.length || 0;

                  return (
                    <tr key={emp.id} className={`hover:bg-slate-50/80 transition ${!emp.is_active ? 'opacity-60 bg-slate-50/50' : ''}`}>
                      <td className="py-4 px-5">
                        <div className="font-mono text-indigo-600 font-bold">{emp.employee_code}</div>
                        <div className="text-xs text-slate-400 font-mono">{emp.national_id || 'No ID'}</div>
                      </td>
                      <td className="py-4 px-5">
                        <div className="font-semibold text-slate-900">{emp.first_name} {emp.last_name}</div>
                        <div className="text-xs text-slate-500 flex items-center gap-1 mt-0.5">
                          <Phone className="w-3 h-3 text-slate-400" />
                          {emp.phone_number}
                        </div>
                      </td>
                      <td className="py-4 px-5">
                        <div className="font-medium text-slate-800">{emp.job_role || 'General Worker'}</div>
                        <span className="inline-block text-[10px] font-semibold bg-slate-100 text-slate-600 px-2 py-0.5 rounded mt-0.5">
                          {emp.department || 'General'}
                        </span>
                      </td>
                      <td className="py-4 px-5">
                        <div className="font-bold text-slate-900">P{parseFloat(emp.hourly_rate).toFixed(2)}/hr</div>
                        <div className="text-[11px] text-slate-400">OT: P{parseFloat(emp.overtime_rate || emp.hourly_rate * 1.5).toFixed(2)}</div>
                      </td>
                      <td className="py-4 px-5">
                        {channel === 'MOBILE_WALLET' ? (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                            <Wallet className="w-3.5 h-3.5" />
                            {provider?.name}
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-blue-50 text-blue-700 border border-blue-200">
                            <Building2 className="w-3.5 h-3.5" />
                            {provider?.name}
                          </span>
                        )}
                        <div className="font-mono text-xs text-slate-500 mt-1">{profile?.account_or_mobile_number || 'N/A'}</div>
                      </td>
                      <td className="py-4 px-5">
                        {/* Interactive Docket Button */}
                        <button
                          onClick={() => handleOpenDocModal(emp)}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border border-indigo-200 bg-indigo-50/50 hover:bg-indigo-100/70 text-indigo-700 transition active:scale-95 shadow-sm"
                        >
                          <FileText className="w-3.5 h-3.5 text-indigo-600" />
                          <span>{docCount} Docs</span>
                        </button>
                      </td>
                      <td className="py-4 px-5">
                        <button
                          onClick={() => handleToggleStatus(emp.id, emp.is_active)}
                          className={`px-2.5 py-1 rounded-full text-xs font-semibold transition ${
                            emp.is_active ? 'bg-emerald-100 text-emerald-800 hover:bg-emerald-200' : 'bg-slate-200 text-slate-600 hover:bg-slate-300'
                          }`}
                        >
                          {emp.is_active ? 'Active' : 'Inactive'}
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

      </div>

      {/* DOCUMENT MANAGEMENT & PREVIEW MODAL */}
      {isDocModalOpen && selectedWorker && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4">
          <div className="w-full max-w-4xl bg-white rounded-2xl shadow-2xl overflow-hidden max-h-[90vh] flex flex-col border border-slate-200">
            
            {/* Modal Header */}
            <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between bg-slate-50">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-indigo-100 text-indigo-700 rounded-xl">
                  <FileText className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="text-base font-bold text-slate-900">
                    Docket Files: {selectedWorker.first_name} {selectedWorker.last_name}
                  </h2>
                  <p className="text-xs text-slate-500 font-mono">
                    ID: {selectedWorker.employee_code} • {selectedWorker.national_id || 'No Omang ID'}
                  </p>
                </div>
              </div>
              <button 
                onClick={() => setIsDocModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 p-1.5 rounded-lg hover:bg-slate-100 transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body: Split view (Upload/List vs Preview) */}
            <div className="flex-1 overflow-y-auto p-6 grid grid-cols-1 lg:grid-cols-12 gap-6">
              
              {/* Left Column: Upload Form & Attached Documents */}
              <div className="lg:col-span-6 space-y-5">
                
                {/* Upload Box */}
                <form onSubmit={handleDocUploadSubmit} className="bg-slate-50 border-2 border-dashed border-slate-200 p-4 rounded-xl space-y-3">
                  <span className="text-xs font-bold uppercase tracking-wider text-slate-600 flex items-center gap-1.5">
                    <UploadCloud className="w-4 h-4 text-indigo-600" /> Upload New Document
                  </span>

                  <div>
                    <label className="block text-[11px] font-semibold text-slate-600 mb-1">Document Category</label>
                    <select
                      value={docType}
                      onChange={(e) => setDocType(e.target.value)}
                      className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-xs font-medium focus:ring-2 focus:ring-indigo-500 outline-none"
                    >
                      <option value="Omang / ID Scan">Omang / ID Scan</option>
                      <option value="Employment Contract">Employment Contract</option>
                      <option value="Safety Certification">Safety Certification</option>
                      <option value="Bank Details Confirmation">Bank Details Confirmation</option>
                      <option value="Other">Other</option>
                    </select>
                  </div>

                  <div>
                    <input
                      type="file"
                      required
                      onChange={(e) => setSelectedFile(e.target.files[0] || null)}
                      className="w-full text-xs text-slate-500 file:mr-3 file:py-2 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-indigo-50 file:text-indigo-700 hover:file:bg-indigo-100 cursor-pointer"
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={uploadingDoc || !selectedFile}
                    className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-700 disabled:bg-slate-300 text-white font-medium rounded-lg text-xs transition flex items-center justify-center gap-2"
                  >
                    {uploadingDoc && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                    <span>Upload to Worker Docket</span>
                  </button>
                </form>

                {/* Document List */}
                <div className="space-y-2">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500">
                    Attached Files ({selectedWorker.employee_documents?.length || 0})
                  </h3>

                  {(!selectedWorker.employee_documents || selectedWorker.employee_documents.length === 0) ? (
                    <div className="text-center py-8 bg-slate-50 rounded-xl border border-slate-100 text-slate-400 text-xs">
                      No documents uploaded yet.
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {selectedWorker.employee_documents.map((doc) => (
                        <div key={doc.id} className="flex items-center justify-between p-3 bg-white border border-slate-200 rounded-xl hover:border-indigo-200 transition shadow-sm">
                          <div className="flex items-center gap-2.5 overflow-hidden">
                            <File className="w-4 h-4 text-indigo-500 shrink-0" />
                            <div className="truncate">
                              <p className="text-xs font-semibold text-slate-800 truncate">{doc.document_type}</p>
                              <span className="text-[10px] text-emerald-600 flex items-center gap-0.5">
                                <ShieldCheck className="w-3 h-3" /> Valid Document
                              </span>
                            </div>
                          </div>

                          <div className="flex items-center gap-1 shrink-0">
                            <button
                              onClick={() => setPreviewDocUrl(doc.document_url)}
                              className="p-1.5 text-slate-600 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition"
                              title="Preview Document"
                            >
                              <Eye className="w-4 h-4" />
                            </button>
                            <a
                              href={doc.document_url}
                              target="_blank"
                              rel="noreferrer"
                              className="p-1.5 text-slate-600 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition"
                              title="Open External"
                            >
                              <ExternalLink className="w-4 h-4" />
                            </a>
                            <button
                              onClick={() => handleDocDelete(doc.id)}
                              className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition"
                              title="Delete Document"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

              </div>

              {/* Right Column: Live Document Preview */}
              <div className="lg:col-span-6 bg-slate-100 border border-slate-200 rounded-xl flex flex-col items-center justify-center min-h-[300px] overflow-hidden p-2">
                {previewDocUrl ? (
                  <iframe 
                    src={previewDocUrl} 
                    className="w-full h-full min-h-[380px] rounded-lg border-0 bg-white" 
                    title="Document Preview"
                  />
                ) : (
                  <div className="text-center p-6 text-slate-400 space-y-2">
                    <Eye className="w-8 h-8 mx-auto text-slate-300" />
                    <p className="text-xs font-medium">Select a document's eye icon to preview it live here.</p>
                  </div>
                )}
              </div>

            </div>

            {/* Modal Footer */}
            <div className="px-6 py-3 bg-slate-50 border-t border-slate-200 flex justify-end">
              <button
                onClick={() => setIsDocModalOpen(false)}
                className="px-4 py-2 bg-white border border-slate-200 text-slate-700 text-xs font-semibold rounded-xl hover:bg-slate-100 transition"
              >
                Done
              </button>
            </div>

          </div>
        </div>
      )}

      {/* NEW WORKER REGISTRATION MODAL */}
      {isRegisterModalOpen && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-slate-900/50 backdrop-blur-sm p-0 sm:p-4">
          <div className="w-full sm:max-w-xl bg-white rounded-t-3xl sm:rounded-2xl shadow-xl overflow-hidden max-h-[90vh] flex flex-col">
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50">
              <h2 className="text-lg font-bold text-slate-900">Register New Worker</h2>
              <button onClick={() => setIsRegisterModalOpen(false)} className="text-slate-400 hover:text-slate-600 p-1">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleRegisterSubmit} className="p-6 overflow-y-auto space-y-4 text-sm">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Employee ID Code *</label>
                  <input
                    type="text"
                    name="employee_code"
                    placeholder="e.g. EMP-004"
                    required
                    value={formData.employee_code}
                    onChange={handleInputChange}
                    className="w-full px-3 py-2.5 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Omang / National ID</label>
                  <input
                    type="text"
                    name="national_id"
                    placeholder="e.g. 123412345"
                    value={formData.national_id}
                    onChange={handleInputChange}
                    className="w-full px-3 py-2.5 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none font-mono"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">First Name *</label>
                  <input
                    type="text"
                    name="first_name"
                    required
                    value={formData.first_name}
                    onChange={handleInputChange}
                    className="w-full px-3 py-2.5 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Last Name *</label>
                  <input
                    type="text"
                    name="last_name"
                    required
                    value={formData.last_name}
                    onChange={handleInputChange}
                    className="w-full px-3 py-2.5 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Job Role / Position</label>
                  <input
                    type="text"
                    name="job_role"
                    placeholder="e.g. Site Supervisor"
                    value={formData.job_role}
                    onChange={handleInputChange}
                    className="w-full px-3 py-2.5 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Department / Site</label>
                  <select
                    name="department"
                    value={formData.department}
                    onChange={handleInputChange}
                    className="w-full px-3 py-2.5 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none bg-white"
                  >
                    <option value="Site A">Site A</option>
                    <option value="Site B">Site B</option>
                    <option value="Administration">Administration</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Mobile Phone *</label>
                  <input
                    type="text"
                    name="phone_number"
                    placeholder="e.g. +26771234567"
                    required
                    value={formData.phone_number}
                    onChange={handleInputChange}
                    className="w-full px-3 py-2.5 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Hourly Rate (BWP) *</label>
                  <input
                    type="number"
                    step="0.01"
                    name="hourly_rate"
                    placeholder="e.g. 45.00"
                    required
                    value={formData.hourly_rate}
                    onChange={handleInputChange}
                    className="w-full px-3 py-2.5 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">OT Rate (BWP)</label>
                  <input
                    type="number"
                    step="0.01"
                    name="overtime_rate"
                    placeholder="Default 1.5x"
                    value={formData.overtime_rate}
                    onChange={handleInputChange}
                    className="w-full px-3 py-2.5 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none"
                  />
                </div>
              </div>

              <div className="pt-2 border-t border-slate-100">
                <label className="block text-xs font-semibold text-slate-700 mb-1">Payout Channel / Provider *</label>
                <select
                  name="payout_provider_id"
                  value={formData.payout_provider_id}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2.5 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none bg-white font-medium text-slate-800"
                >
                  <optgroup label="Bank Transfers">
                    <option value="1">First National Bank (FNB)</option>
                    <option value="2">ABSA Bank</option>
                    <option value="3">Stanbic Bank</option>
                  </optgroup>
                  <optgroup label="Mobile Wallets">
                    <option value="4">Orange Money</option>
                    <option value="5">Smega (BTC)</option>
                    <option value="6">MyZigo</option>
                  </optgroup>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Account or Wallet Phone Number *</label>
                <input
                  type="text"
                  name="account_or_mobile_number"
                  placeholder="Bank Account # OR Wallet Phone #"
                  required
                  value={formData.account_or_mobile_number}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2.5 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none font-mono"
                />
              </div>

              {['1', '2', '3'].includes(formData.payout_provider_id) && (
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Branch Code</label>
                  <input
                    type="text"
                    name="branch_code"
                    placeholder="e.g. 281411"
                    value={formData.branch_code}
                    onChange={handleInputChange}
                    className="w-full px-3 py-2.5 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none font-mono"
                  />
                </div>
              )}

              <div className="pt-4 flex items-center justify-end gap-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsRegisterModalOpen(false)}
                  className="px-4 py-2.5 rounded-xl border border-slate-200 text-slate-600 font-medium hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-medium inline-flex items-center gap-2"
                >
                  {submitting && <Loader2 className="w-4 h-4 animate-spin" />}
                  Save Worker Profile
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}