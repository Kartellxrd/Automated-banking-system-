'use client';

import { useState, useEffect } from 'react';
import HRSideNav from '@/components/hr/HRSideNav';
import HRNavbar from '@/components/hr/HRNavbar';
import { 
  FolderOpen, 
  Search, 
  X, 
  CheckCircle2, 
  UploadCloud,
  User,
  UserPlus,
  Loader2,
  Building2,
  AlertCircle
} from 'lucide-react';

const INITIAL_FORM_STATE = {
  name: '',
  role: '',
  site: '',
  rate: '',
  nationalId: '',
  bankName: '',
  accountNumber: '',
};

export default function HREmployeesPage() {
  const [searchTerm, setSearchTerm] = useState('');
  const [activeTab, setActiveTab] = useState('employees'); // 'employees' | 'documents'

  // Dynamic DB State
  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [notification, setNotification] = useState(null);

  // Modals & Form State
  const [uploadModalOpen, setUploadModalOpen] = useState(false);
  const [addEmployeeModalOpen, setAddEmployeeModalOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const [newEmployee, setNewEmployee] = useState(INITIAL_FORM_STATE);

  // Temporary toast notification handler
  const triggerNotification = (message) => {
    setNotification(message);
    setTimeout(() => {
      setNotification(null);
    }, 4000);
  };

  // Fetch Employees from Database Route
  const fetchEmployeeData = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/employees', { cache: 'no-store' });
      const json = await res.json();

      if (!res.ok) {
        throw new Error(json.error || 'Failed to fetch employee roster.');
      }

      // Handle standard API responses returning either array or nested data object
      const employeeRecords = Array.isArray(json) ? json : json.data || [];
      setEmployees(employeeRecords);
    } catch (err) {
      console.error('Database query error:', err);
      setError(err.message || 'Network error while connecting to database.');
    } font-medium {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchEmployeeData();
  }, []);

  // Handle Create Employee in DB
  const handleCreateEmployee = async (e) => {
    e.preventDefault();

    if (!newEmployee.name.trim() || !newEmployee.site.trim() || !newEmployee.role.trim()) {
      alert('Please fill in required fields: Name, Role, and Site Location.');
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch('/api/employees', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          full_name: newEmployee.name,
          job_title: newEmployee.role,
          site_location: newEmployee.site,
          hourly_rate: parseFloat(newEmployee.rate) || 0.00,
          national_id: newEmployee.nationalId,
          bank_name: newEmployee.bankName,
          account_number: newEmployee.accountNumber,
        }),
      });

      const json = await res.json();

      if (!res.ok || !json.success) {
        throw new Error(json.error || 'Failed to persist employee record.');
      }

      setAddEmployeeModalOpen(false);
      setNewEmployee(INITIAL_FORM_STATE);

      triggerNotification(`Employee "${newEmployee.name}" registered successfully!`);
      await fetchEmployeeData();
    } catch (err) {
      console.error('Submission failed:', err);
      alert(err.message || 'Error submitting employee record to database.');
    } finally {
      setSubmitting(false);
    }
  };

  // Dynamic Search Filter based on live fields
  const filteredEmployees = employees.filter((emp) => {
    const query = searchTerm.toLowerCase();
    const name = emp.full_name || emp.name || '';
    const role = emp.job_title || emp.role || '';
    const site = emp.site_location || emp.site || '';
    const id = emp.id || '';

    return (
      name.toLowerCase().includes(query) ||
      role.toLowerCase().includes(query) ||
      site.toLowerCase().includes(query) ||
      id.toString().toLowerCase().includes(query)
    );
  });

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col lg:flex-row font-sans text-slate-900 relative">
      {/* Toast Notification */}
      {notification && (
        <div className="fixed top-5 right-5 z-50 animate-in fade-in slide-in-from-top-4 duration-300">
          <div className="bg-emerald-900 text-emerald-100 border border-emerald-700 px-5 py-3.5 rounded-2xl shadow-2xl flex items-center gap-3">
            <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
            <span className="text-xs font-bold">{notification}</span>
            <button 
              onClick={() => setNotification(null)}
              className="text-emerald-400 hover:text-white transition ml-2 cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      <HRSideNav />

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
              <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
                Employee Directory & Documents
              </h1>
              <p className="text-slate-500 text-sm mt-1">
                Manage active site personnel rosters, rate cards, and attached compliance forms.
              </p>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              <button
                onClick={() => setAddEmployeeModalOpen(true)}
                className="inline-flex items-center justify-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-sm px-5 py-3 rounded-2xl transition shadow-md shadow-indigo-600/20 active:scale-95 cursor-pointer"
              >
                <UserPlus className="w-4 h-4" />
                <span>Add New Employee</span>
              </button>
            </div>
          </div>

          {/* Controls */}
          <div className="bg-white p-4 sm:p-5 rounded-3xl border border-slate-200/80 shadow-xs flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4">
            <div className="relative flex-1 max-w-md">
              <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Search by name, role, site, or ID..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-2xl text-xs font-medium text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white transition"
              />
            </div>

            <div className="flex items-center gap-1.5 p-1 bg-slate-100 rounded-2xl shrink-0">
              <button
                onClick={() => setActiveTab('employees')}
                className={`px-4 py-2 rounded-xl text-xs font-bold transition cursor-pointer ${
                  activeTab === 'employees' ? 'bg-white text-indigo-600 shadow-xs' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Active Personnel ({employees.length})
              </button>
              <button
                onClick={() => setActiveTab('documents')}
                className={`px-4 py-2 rounded-xl text-xs font-bold transition cursor-pointer ${
                  activeTab === 'documents' ? 'bg-white text-indigo-600 shadow-xs' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Document Archive
              </button>
            </div>
          </div>

          {error && (
            <div className="bg-rose-50 border border-rose-200 text-rose-700 p-4 rounded-2xl text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* TAB 1: EMPLOYEES DIRECTORY */}
          {activeTab === 'employees' && (
            <div className="bg-white rounded-3xl border border-slate-200/80 shadow-xs overflow-hidden">
              <div className="p-5 border-b border-slate-100 flex items-center justify-between">
                <h2 className="text-base font-black text-slate-900 flex items-center gap-2">
                  <User className="w-5 h-5 text-indigo-600" />
                  <span>Personnel Directory ({filteredEmployees.length})</span>
                </h2>
              </div>

              {loading ? (
                <div className="p-12 text-center text-xs text-slate-400 flex items-center justify-center gap-2 font-medium">
                  <Loader2 className="w-5 h-5 animate-spin text-indigo-600" /> Loading live records from database...
                </div>
              ) : filteredEmployees.length === 0 ? (
                <div className="p-12 text-center space-y-3">
                  <User className="w-8 h-8 text-slate-300 mx-auto" />
                  <p className="text-slate-600 text-sm font-bold">No employee profiles found.</p>
                  <p className="text-slate-400 text-xs">Click "Add New Employee" above to register personnel to your database.</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="bg-slate-50/70 border-b border-slate-100 text-[11px] font-extrabold text-slate-400 uppercase tracking-wider">
                        <th className="py-3.5 px-6">Employee</th>
                        <th className="py-3.5 px-6">Role & Designation</th>
                        <th className="py-3.5 px-6">Assigned Site</th>
                        <th className="py-3.5 px-6">Base Contract Rate</th>
                        <th className="py-3.5 px-6">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 text-xs font-medium text-slate-700">
                      {filteredEmployees.map((employee) => {
                        const name = employee.full_name || employee.name || 'Unnamed Employee';
                        const role = employee.job_title || employee.role || 'N/A';
                        const site = employee.site_location || employee.site || 'Unassigned';
                        const rate = employee.hourly_rate ?? employee.rate ?? 0;
                        const nationalId = employee.national_id || employee.nationalId || 'No ID';

                        return (
                          <tr key={employee.id} className="hover:bg-indigo-50/30 transition">
                            <td className="py-4 px-6">
                              <div className="flex items-center gap-3">
                                <div className="w-9 h-9 rounded-xl bg-indigo-100 text-indigo-700 font-bold flex items-center justify-center text-xs shrink-0">
                                  {name.charAt(0).toUpperCase()}
                                </div>
                                <div>
                                  <span className="font-bold text-slate-900 block leading-tight">{name}</span>
                                  <span className="text-[10px] text-slate-400 font-semibold">{nationalId}</span>
                                </div>
                              </div>
                            </td>
                            <td className="py-4 px-6 font-bold text-slate-800">{role}</td>
                            <td className="py-4 px-6 text-slate-600">
                              <span className="inline-flex items-center gap-1">
                                <Building2 className="w-3.5 h-3.5 text-slate-400" /> {site}
                              </span>
                            </td>
                            <td className="py-4 px-6 font-black text-slate-900">{Number(rate).toFixed(2)} BWP/hr</td>
                            <td className="py-4 px-6">
                              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-extrabold bg-emerald-50 text-emerald-700 border border-emerald-200">
                                <CheckCircle2 className="w-3 h-3" />
                                {employee.status || 'Active'}
                              </span>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {/* TAB 2: COMPLIANCE DOCUMENTS */}
          {activeTab === 'documents' && (
            <div className="bg-white rounded-3xl border border-slate-200/80 shadow-xs p-8 text-center space-y-4">
              <UploadCloud className="w-10 h-10 text-indigo-500 mx-auto" />
              <h3 className="text-base font-bold text-slate-900">Document Storage Ready</h3>
              <p className="text-xs text-slate-500 max-w-md mx-auto">
                Documents attached to registered employees are encrypted and mapped directly to employee national IDs in storage.
              </p>
              <button
                onClick={() => setUploadModalOpen(true)}
                className="px-4 py-2.5 bg-indigo-50 text-indigo-600 font-bold text-xs rounded-xl hover:bg-indigo-100 transition cursor-pointer"
              >
                Upload Compliance File
              </button>
            </div>
          )}
        </main>
      </div>

      {/* MODAL: REGISTER EMPLOYEE */}
      {addEmployeeModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="bg-white w-full max-w-lg rounded-3xl shadow-2xl p-6 space-y-5 border border-slate-200 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-100 pb-4">
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-2xl bg-indigo-50 text-indigo-600">
                  <UserPlus className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-extrabold text-slate-900 text-sm">Register Site Employee</h3>
                  <p className="text-[11px] text-slate-500 font-medium">Add record directly to live database</p>
                </div>
              </div>
              <button
                onClick={() => setAddEmployeeModalOpen(false)}
                className="p-2 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-xl transition cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateEmployee} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Full Name *</label>
                <input
                  type="text"
                  required
                  placeholder="Enter employee full name"
                  value={newEmployee.name}
                  onChange={(e) => setNewEmployee({ ...newEmployee, name: e.target.value })}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-900 focus:ring-2 focus:ring-indigo-500 focus:bg-white transition"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Job Designation *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Site Supervisor"
                    value={newEmployee.role}
                    onChange={(e) => setNewEmployee({ ...newEmployee, role: e.target.value })}
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-900 focus:ring-2 focus:ring-indigo-500 focus:bg-white transition"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Site Location *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Main Operations Site"
                    value={newEmployee.site}
                    onChange={(e) => setNewEmployee({ ...newEmployee, site: e.target.value })}
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-900 focus:ring-2 focus:ring-indigo-500 focus:bg-white transition"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Hourly Rate (BWP) *</label>
                  <input
                    type="number"
                    step="0.01"
                    required
                    placeholder="0.00"
                    value={newEmployee.rate}
                    onChange={(e) => setNewEmployee({ ...newEmployee, rate: e.target.value })}
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-900 focus:ring-2 focus:ring-indigo-500 focus:bg-white transition"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">National ID / Omang</label>
                  <input
                    type="text"
                    placeholder="Identification Number"
                    value={newEmployee.nationalId}
                    onChange={(e) => setNewEmployee({ ...newEmployee, nationalId: e.target.value })}
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-900 focus:ring-2 focus:ring-indigo-500 focus:bg-white transition"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3 pt-2 border-t border-slate-100">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Bank Name</label>
                  <input
                    type="text"
                    placeholder="Banking Institution"
                    value={newEmployee.bankName}
                    onChange={(e) => setNewEmployee({ ...newEmployee, bankName: e.target.value })}
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-900 focus:ring-2 focus:ring-indigo-500 focus:bg-white transition"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Account Number</label>
                  <input
                    type="text"
                    placeholder="Bank Account Number"
                    value={newEmployee.accountNumber}
                    onChange={(e) => setNewEmployee({ ...newEmployee, accountNumber: e.target.value })}
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-900 focus:ring-2 focus:ring-indigo-500 focus:bg-white transition"
                  />
                </div>
              </div>

              <div className="pt-3 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setAddEmployeeModalOpen(false)}
                  className="px-4 py-2.5 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-xl transition cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs rounded-xl transition shadow-md shadow-indigo-600/20 flex items-center gap-2 cursor-pointer disabled:opacity-50"
                >
                  {submitting && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                  <span>Save Profile</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}