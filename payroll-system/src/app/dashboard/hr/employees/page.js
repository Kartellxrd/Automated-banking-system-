'use client';

import { useState, useEffect } from 'react';
import HRSideNav from '@/components/hr/HRSideNav';
import HRNavbar from '@/components/hr/HRNavbar';
import { 
  FolderOpen, 
  Search, 
  X, 
  CheckCircle2, 
  User,
  UserPlus,
  Loader2,
  Building2,
  AlertCircle,
  PlusCircle,
  CreditCard,
  Briefcase,
  ChevronRight,
  ChevronLeft,
  FileCheck,
  Smartphone,
  Banknote,
  Upload
} from 'lucide-react';

const INITIAL_FORM_STATE = {
  first_name: '',
  last_name: '',
  employee_code: '',
  nationalId: '',
  phone: '',
  role: '',
  site: '',
  rate: '',
  paymentChannel: 'EFT', // 'EFT' | 'MOBILE_MONEY' | 'CASH'
  bankName: 'FNB Botswana',
  accountNumber: '',
  branchCode: '',
  mobileProvider: 'Orange Money',
  mobileNumber: '',
  documents: {
    omangCopy: null,
    signedContract: null,
    safetyClearance: null,
    medicalFitness: null,
  }
};

export default function HREmployeesPage() {
  const [searchTerm, setSearchTerm] = useState('');
  const [activeTab, setActiveTab] = useState('employees');

  const [employees, setEmployees] = useState([]);
  const [sitesList, setSitesList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [notification, setNotification] = useState(null);

  const [addEmployeeModalOpen, setAddEmployeeModalOpen] = useState(false);
  const [currentStep, setCurrentStep] = useState(1);
  const [submitting, setSubmitting] = useState(false);

  const [newEmployee, setNewEmployee] = useState(INITIAL_FORM_STATE);

  const [showAddSiteInput, setShowAddSiteInput] = useState(false);
  const [newSiteName, setNewSiteName] = useState('');

  const triggerNotification = (message) => {
    setNotification(message);
    setTimeout(() => setNotification(null), 4000);
  };

  const fetchEmployeeData = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/hr/employees', { cache: 'no-store' });
      const json = await res.json();

      if (!res.ok) {
        throw new Error(json.error || 'Failed to fetch employee roster.');
      }

      const employeeRecords = json.data || [];
      setEmployees(employeeRecords);
      
      const derivedSites = Array.from(
        new Set(employeeRecords.map(e => e.site).filter(s => s && s !== 'Unassigned'))
      );
      if (derivedSites.length > 0) {
        setSitesList(derivedSites);
      }
    } catch (err) {
      console.error('Database query error:', err);
      setError(err.message || 'Network error while connecting to database.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchEmployeeData();
  }, []);

  const handleAddNewSite = (e) => {
    e.preventDefault();
    if (!newSiteName.trim()) return;

    const formattedSiteName = newSiteName.trim();
    if (!sitesList.includes(formattedSiteName)) {
      setSitesList((prev) => [...prev, formattedSiteName]);
    }
    setNewEmployee((prev) => ({ ...prev, site: formattedSiteName }));
    setNewSiteName('');
    setShowAddSiteInput(false);
    triggerNotification(`New site "${formattedSiteName}" set!`);
  };

  const handleNextStep = () => {
    if (currentStep === 1) {
      if (!newEmployee.first_name.trim() || !newEmployee.last_name.trim()) {
        alert('Please fill in both First Name and Last Name.');
        return;
      }
      if (!newEmployee.role.trim() || !newEmployee.site.trim() || !newEmployee.rate) {
        alert('Please complete the Job Title, Mine Site, and Base Hourly Rate.');
        return;
      }
    } else if (currentStep === 2) {
      if (newEmployee.paymentChannel === 'EFT' && (!newEmployee.bankName || !newEmployee.accountNumber)) {
        alert('Please provide the Bank Name and Account Number.');
        return;
      }
      if (newEmployee.paymentChannel === 'MOBILE_MONEY' && (!newEmployee.mobileProvider || !newEmployee.mobileNumber)) {
        alert('Please select Mobile Provider and provide Registered Mobile Number.');
        return;
      }
    }
    setCurrentStep((prev) => Math.min(prev + 1, 3));
  };

  const handlePrevStep = () => {
    setCurrentStep((prev) => Math.max(prev - 1, 1));
  };

  const handleFileUpload = (fieldKey, file) => {
    setNewEmployee((prev) => ({
      ...prev,
      documents: {
        ...prev.documents,
        [fieldKey]: file,
      },
    }));
  };

  const handleCreateEmployee = async (e) => {
    e.preventDefault();

    if (!newEmployee.documents.omangCopy || !newEmployee.documents.signedContract) {
      alert('Please attach both the National ID/Omang Copy and Signed Employment Contract before completing.');
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch('/api/hr/employees', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          first_name: newEmployee.first_name,
          last_name: newEmployee.last_name,
          nationalId: newEmployee.nationalId,
          phone: newEmployee.phone,
          employeeCode: newEmployee.employee_code || null,
          role: newEmployee.role,
          site: newEmployee.site,
          rate: parseFloat(newEmployee.rate) || 0.00,
          paymentChannel: newEmployee.paymentChannel,
          bankName: newEmployee.bankName,
          accountNumber: newEmployee.accountNumber,
          branchCode: newEmployee.branchCode,
          mobileProvider: newEmployee.mobileProvider,
          mobileNumber: newEmployee.mobileNumber,
        }),
      });

      const json = await res.json();

      if (!res.ok || !json.success) {
        throw new Error(json.error || 'Failed to save employee record.');
      }

      setAddEmployeeModalOpen(false);
      setNewEmployee(INITIAL_FORM_STATE);
      setCurrentStep(1);

      triggerNotification(`Employee "${newEmployee.first_name} ${newEmployee.last_name}" registered successfully!`);
      await fetchEmployeeData();
    } catch (err) {
      console.error('Submission error:', err);
      alert(err.message || 'Error submitting employee record.');
    } finally {
      setSubmitting(false);
    }
  };

  const filteredEmployees = employees.filter((emp) => {
    const query = searchTerm.toLowerCase();
    const fullName = `${emp.first_name || ''} ${emp.last_name || ''}`.trim() || emp.name || '';
    return (
      fullName.toLowerCase().includes(query) ||
      (emp.role || '').toLowerCase().includes(query) ||
      (emp.site || '').toLowerCase().includes(query) ||
      (emp.employee_code || '').toLowerCase().includes(query)
    );
  });

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col lg:flex-row font-sans text-slate-900 relative">
      {notification && (
        <div className="fixed top-5 right-5 z-50 animate-in fade-in slide-in-from-top-4 duration-300">
          <div className="bg-emerald-900 text-emerald-100 border border-emerald-700 px-5 py-3.5 rounded-2xl shadow-2xl flex items-center gap-3">
            <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
            <span className="text-xs font-bold">{notification}</span>
            <button onClick={() => setNotification(null)} className="text-emerald-400 hover:text-white transition ml-2 cursor-pointer">
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      <HRSideNav />

      <div className="flex-1 flex flex-col min-w-0">
        <HRNavbar />

        <main className="p-4 sm:p-6 lg:p-8 space-y-6 max-w-7xl mx-auto w-full">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-6 rounded-3xl border border-slate-200/80 shadow-xs">
            <div>
              <div className="flex items-center gap-2 text-xs font-extrabold text-indigo-600 uppercase tracking-wider mb-1">
                <FolderOpen className="w-4 h-4" />
                <span>Personnel Compliance Archive</span>
              </div>
              <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
                Employee Directory & Onboarding
              </h1>
              <p className="text-slate-500 text-sm mt-1">
                Manage site rosters, payment preference channels, and attached legal compliance files.
              </p>
            </div>

            <button
              onClick={() => {
                setCurrentStep(1);
                setAddEmployeeModalOpen(true);
              }}
              className="inline-flex items-center justify-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-sm px-5 py-3 rounded-2xl transition shadow-md shadow-indigo-600/20 active:scale-95 cursor-pointer"
            >
              <UserPlus className="w-4 h-4" />
              <span>Add New Employee</span>
            </button>
          </div>

          <div className="bg-white p-4 sm:p-5 rounded-3xl border border-slate-200/80 shadow-xs flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4">
            <div className="relative flex-1 max-w-md">
              <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Search by name, role, site, or code..."
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

          {activeTab === 'employees' && (
            <div className="bg-white rounded-3xl border border-slate-200/80 shadow-xs overflow-hidden">
              <div className="p-5 border-b border-slate-100 flex items-center justify-between">
                <h2 className="text-base font-black text-slate-900 flex items-center gap-2">
                  <User className="w-5 h-5 text-indigo-600" />
                  <span>Personnel Roster ({filteredEmployees.length})</span>
                </h2>
              </div>

              {loading ? (
                <div className="p-12 text-center text-xs text-slate-400 flex items-center justify-center gap-2 font-medium">
                  <Loader2 className="w-5 h-5 animate-spin text-indigo-600" /> Fetching live personnel data...
                </div>
              ) : filteredEmployees.length === 0 ? (
                <div className="p-12 text-center space-y-3">
                  <User className="w-8 h-8 text-slate-300 mx-auto" />
                  <p className="text-slate-600 text-sm font-bold">No employees found.</p>
                  <p className="text-slate-400 text-xs">Click "Add New Employee" above to register personnel.</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="bg-slate-50/70 border-b border-slate-100 text-[11px] font-extrabold text-slate-400 uppercase tracking-wider">
                        <th className="py-3.5 px-6">Code</th>
                        <th className="py-3.5 px-6">Employee Name</th>
                        <th className="py-3.5 px-6">Job Title</th>
                        <th className="py-3.5 px-6">Mine Site</th>
                        <th className="py-3.5 px-6">Base Hourly Rate</th>
                        <th className="py-3.5 px-6">Payment Method</th>
                        <th className="py-3.5 px-6">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 text-xs font-medium text-slate-700">
                      {filteredEmployees.map((emp) => {
                        const displayName = `${emp.first_name} ${emp.last_name}`.trim() || emp.name;
                        return (
                          <tr key={emp.id} className="hover:bg-indigo-50/30 transition">
                            <td className="py-4 px-6 font-mono font-bold text-indigo-600">
                              {emp.employee_code || `EMP-${emp.id}`}
                            </td>
                            <td className="py-4 px-6">
                              <div className="flex items-center gap-3">
                                <div className="w-9 h-9 rounded-xl bg-indigo-100 text-indigo-700 font-bold flex items-center justify-center text-xs shrink-0">
                                  {displayName.charAt(0).toUpperCase()}
                                </div>
                                <div>
                                  <span className="font-bold text-slate-900 block leading-tight">{displayName}</span>
                                  <span className="text-[10px] text-slate-400 font-semibold">{emp.nationalId || 'No Omang ID'}</span>
                                </div>
                              </div>
                            </td>
                            <td className="py-4 px-6 font-bold text-slate-800">{emp.role}</td>
                            <td className="py-4 px-6 text-slate-600">
                              <span className="inline-flex items-center gap-1 bg-slate-100 px-2.5 py-1 rounded-lg font-semibold text-slate-700">
                                <Building2 className="w-3.5 h-3.5 text-indigo-500" /> {emp.site}
                              </span>
                            </td>
                            <td className="py-4 px-6 font-black text-slate-900">BWP {Number(emp.rate).toFixed(2)}/hr</td>
                            <td className="py-4 px-6">
                              <span className="inline-flex items-center gap-1 font-semibold text-slate-700">
                                {emp.paymentChannel === 'MOBILE_MONEY' && <Smartphone className="w-3.5 h-3.5 text-amber-500" />}
                                {emp.paymentChannel === 'CASH' && <Banknote className="w-3.5 h-3.5 text-emerald-500" />}
                                {(emp.paymentChannel === 'EFT' || !emp.paymentChannel) && <CreditCard className="w-3.5 h-3.5 text-indigo-500" />}
                                {emp.paymentChannel || 'EFT'}
                              </span>
                            </td>
                            <td className="py-4 px-6">
                              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-extrabold bg-emerald-50 text-emerald-700 border border-emerald-200">
                                <CheckCircle2 className="w-3 h-3" />
                                {emp.status || 'Active'}
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

          {activeTab === 'documents' && (
            <div className="bg-white rounded-3xl border border-slate-200/80 shadow-xs p-8 text-center space-y-4">
              <FileCheck className="w-10 h-10 text-indigo-500 mx-auto" />
              <h3 className="text-base font-bold text-slate-900">Document Archive Vault</h3>
              <p className="text-xs text-slate-500 max-w-md mx-auto">
                Attached contracts, Omang copies, and safety certificates are mapped to respective employee records.
              </p>
            </div>
          )}
        </main>
      </div>

      {/* 3-STEP WIZARD MODAL */}
      {addEmployeeModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="bg-white w-full max-w-xl rounded-3xl shadow-2xl p-6 space-y-6 border border-slate-200 max-h-[90vh] overflow-y-auto">
            
            <div className="flex items-center justify-between border-b border-slate-100 pb-4">
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-2xl bg-indigo-50 text-indigo-600">
                  <UserPlus className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-extrabold text-slate-900 text-sm">Register Mine Site Employee</h3>
                  <p className="text-[11px] text-slate-500 font-medium">Step {currentStep} of 3</p>
                </div>
              </div>
              <button
                onClick={() => setAddEmployeeModalOpen(false)}
                className="p-2 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-xl transition cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Stepper Header */}
            <div className="grid grid-cols-3 gap-2 text-center">
              <div className={`p-2 rounded-xl text-[10px] font-bold ${currentStep === 1 ? 'bg-indigo-600 text-white' : 'bg-slate-100 text-slate-500'}`}>
                1. Personal & Position
              </div>
              <div className={`p-2 rounded-xl text-[10px] font-bold ${currentStep === 2 ? 'bg-indigo-600 text-white' : 'bg-slate-100 text-slate-500'}`}>
                2. Payment Details
              </div>
              <div className={`p-2 rounded-xl text-[10px] font-bold ${currentStep === 3 ? 'bg-indigo-600 text-white' : 'bg-slate-100 text-slate-500'}`}>
                3. Compliance Files
              </div>
            </div>

            <form onSubmit={handleCreateEmployee} className="space-y-5">
              
              {/* STEP 1: PERSONAL & POSITION INFO */}
              {currentStep === 1 && (
                <div className="space-y-4 animate-in fade-in">
                  <div className="flex items-center gap-2 text-xs font-bold text-slate-700 border-b border-slate-100 pb-2">
                    <User className="w-4 h-4 text-indigo-600" />
                    <span>Personal Details & Mine Assignment</span>
                  </div>

                  {/* Separated First Name & Last Name */}
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">First Name *</label>
                      <input
                        type="text"
                        required
                        placeholder="e.g. Kgosi"
                        value={newEmployee.first_name}
                        onChange={(e) => setNewEmployee({ ...newEmployee, first_name: e.target.value })}
                        className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-900 focus:ring-2 focus:ring-indigo-500 focus:bg-white transition"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">Last Name *</label>
                      <input
                        type="text"
                        required
                        placeholder="e.g. Motsamai"
                        value={newEmployee.last_name}
                        onChange={(e) => setNewEmployee({ ...newEmployee, last_name: e.target.value })}
                        className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-900 focus:ring-2 focus:ring-indigo-500 focus:bg-white transition"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">Omang / National ID *</label>
                      <input
                        type="text"
                        placeholder="e.g. 123412345"
                        value={newEmployee.nationalId}
                        onChange={(e) => setNewEmployee({ ...newEmployee, nationalId: e.target.value })}
                        className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-900 focus:ring-2 focus:ring-indigo-500 focus:bg-white transition"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">Contact Phone</label>
                      <input
                        type="text"
                        placeholder="e.g. +267 71 234 567"
                        value={newEmployee.phone}
                        onChange={(e) => setNewEmployee({ ...newEmployee, phone: e.target.value })}
                        className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-900 focus:ring-2 focus:ring-indigo-500 focus:bg-white transition"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">Job Title / Role *</label>
                      <input
                        type="text"
                        required
                        placeholder="e.g. Heavy Equipment Operator"
                        value={newEmployee.role}
                        onChange={(e) => setNewEmployee({ ...newEmployee, role: e.target.value })}
                        className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-900 focus:ring-2 focus:ring-indigo-500 focus:bg-white transition"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">Base Hourly Rate (BWP/hr) *</label>
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
                  </div>

                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <label className="text-xs font-bold text-slate-700">Mine Site Location *</label>
                      <button
                        type="button"
                        onClick={() => setShowAddSiteInput(!showAddSiteInput)}
                        className="text-[11px] font-bold text-indigo-600 hover:text-indigo-800 flex items-center gap-1 cursor-pointer"
                      >
                        <PlusCircle className="w-3.5 h-3.5" />
                        <span>Add New Site</span>
                      </button>
                    </div>

                    {showAddSiteInput && (
                      <div className="flex items-center gap-2 p-2 bg-indigo-50/50 rounded-xl border border-indigo-100 mb-2">
                        <input
                          type="text"
                          placeholder="Enter new mine site name..."
                          value={newSiteName}
                          onChange={(e) => setNewSiteName(e.target.value)}
                          className="flex-1 px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-xs"
                        />
                        <button
                          type="button"
                          onClick={handleAddNewSite}
                          className="px-3 py-1.5 bg-indigo-600 text-white font-bold text-xs rounded-lg hover:bg-indigo-700 transition"
                        >
                          Add
                        </button>
                      </div>
                    )}

                    <select
                      required
                      value={newEmployee.site}
                      onChange={(e) => setNewEmployee({ ...newEmployee, site: e.target.value })}
                      className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-900 focus:ring-2 focus:ring-indigo-500 focus:bg-white transition"
                    >
                      <option value="">-- Select Assigned Mine Site --</option>
                      {sitesList.map((siteName, idx) => (
                        <option key={idx} value={siteName}>{siteName}</option>
                      ))}
                      <option value="Jwaneng Mine Site">Jwaneng Mine Site</option>
                      <option value="Orapa Mine Site">Orapa Mine Site</option>
                      <option value="Karowe Diamond Mine">Karowe Diamond Mine</option>
                      <option value="Gaborone North Base">Gaborone North Base</option>
                    </select>
                  </div>
                </div>
              )}

              {/* STEP 2: PAYMENT DETAILS & PREFERRED CHANNELS */}
              {currentStep === 2 && (
                <div className="space-y-4 animate-in fade-in">
                  <div className="flex items-center gap-2 text-xs font-bold text-slate-700 border-b border-slate-100 pb-2">
                    <CreditCard className="w-4 h-4 text-indigo-600" />
                    <span>Payment Channel & Bank/Wallet Configuration</span>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-2">Preferred Payment Channel</label>
                    <div className="grid grid-cols-3 gap-2">
                      <button
                        type="button"
                        onClick={() => setNewEmployee({ ...newEmployee, paymentChannel: 'EFT' })}
                        className={`p-3 rounded-xl border text-center transition flex flex-col items-center gap-1.5 cursor-pointer ${
                          newEmployee.paymentChannel === 'EFT'
                            ? 'border-indigo-600 bg-indigo-50/50 text-indigo-900 font-bold'
                            : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
                        }`}
                      >
                        <CreditCard className="w-5 h-5 text-indigo-600" />
                        <span className="text-xs">Bank Transfer (EFT)</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => setNewEmployee({ ...newEmployee, paymentChannel: 'MOBILE_MONEY' })}
                        className={`p-3 rounded-xl border text-center transition flex flex-col items-center gap-1.5 cursor-pointer ${
                          newEmployee.paymentChannel === 'MOBILE_MONEY'
                            ? 'border-amber-500 bg-amber-50/50 text-amber-900 font-bold'
                            : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
                        }`}
                      >
                        <Smartphone className="w-5 h-5 text-amber-600" />
                        <span className="text-xs">Mobile Money</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => setNewEmployee({ ...newEmployee, paymentChannel: 'CASH' })}
                        className={`p-3 rounded-xl border text-center transition flex flex-col items-center gap-1.5 cursor-pointer ${
                          newEmployee.paymentChannel === 'CASH'
                            ? 'border-emerald-600 bg-emerald-50/50 text-emerald-900 font-bold'
                            : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
                        }`}
                      >
                        <Banknote className="w-5 h-5 text-emerald-600" />
                        <span className="text-xs">Cash / Envelope</span>
                      </button>
                    </div>
                  </div>

                  {/* CONDITIONAL FIELDS: EFT */}
                  {newEmployee.paymentChannel === 'EFT' && (
                    <div className="space-y-3 p-4 bg-slate-50 rounded-2xl border border-slate-200/80">
                      <div>
                        <label className="block text-xs font-bold text-slate-700 mb-1">Bank Name</label>
                        <select
                          value={newEmployee.bankName}
                          onChange={(e) => setNewEmployee({ ...newEmployee, bankName: e.target.value })}
                          className="w-full px-3.5 py-2.5 bg-white border border-slate-200 rounded-xl text-xs font-medium text-slate-900"
                        >
                          <option value="First National Bank (FNB)">First National Bank (FNB)</option>
                          <option value="Absa Bank Botswana">Absa Bank Botswana</option>
                          <option value="Stanbic Bank Botswana">Stanbic Bank Botswana</option>
                          <option value="Nedbank Botswana">Nedbank Botswana</option>
                          <option value="Bank Gaborone">Bank Gaborone</option>
                          <option value="BancABC">BancABC</option>
                        </select>
                      </div>

                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="block text-xs font-bold text-slate-700 mb-1">Account Number *</label>
                          <input
                            type="text"
                            placeholder="Bank Account Number"
                            value={newEmployee.accountNumber}
                            onChange={(e) => setNewEmployee({ ...newEmployee, accountNumber: e.target.value })}
                            className="w-full px-3.5 py-2.5 bg-white border border-slate-200 rounded-xl text-xs font-medium text-slate-900"
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-bold text-slate-700 mb-1">Branch Code</label>
                          <input
                            type="text"
                            placeholder="e.g. 281428"
                            value={newEmployee.branchCode}
                            onChange={(e) => setNewEmployee({ ...newEmployee, branchCode: e.target.value })}
                            className="w-full px-3.5 py-2.5 bg-white border border-slate-200 rounded-xl text-xs font-medium text-slate-900"
                          />
                        </div>
                      </div>
                    </div>
                  )}

                  {/* CONDITIONAL FIELDS: MOBILE MONEY */}
                  {newEmployee.paymentChannel === 'MOBILE_MONEY' && (
                    <div className="space-y-3 p-4 bg-slate-50 rounded-2xl border border-slate-200/80">
                      <div>
                        <label className="block text-xs font-bold text-slate-700 mb-1">Mobile Network Provider</label>
                        <select
                          value={newEmployee.mobileProvider}
                          onChange={(e) => setNewEmployee({ ...newEmployee, mobileProvider: e.target.value })}
                          className="w-full px-3.5 py-2.5 bg-white border border-slate-200 rounded-xl text-xs font-medium text-slate-900"
                        >
                          <option value="Orange Money">Orange Money</option>
                          <option value="BTC Smega">BTC Smega</option>
                          <option value="MyZaka (Mascom)">MyZaka (Mascom)</option>
                        </select>
                      </div>

                      <div>
                        <label className="block text-xs font-bold text-slate-700 mb-1">Registered Phone Number *</label>
                        <input
                          type="text"
                          placeholder="e.g. +267 72 000 000"
                          value={newEmployee.mobileNumber}
                          onChange={(e) => setNewEmployee({ ...newEmployee, mobileNumber: e.target.value })}
                          className="w-full px-3.5 py-2.5 bg-white border border-slate-200 rounded-xl text-xs font-medium text-slate-900"
                        />
                      </div>
                    </div>
                  )}

                  {/* CONDITIONAL NOTE: CASH */}
                  {newEmployee.paymentChannel === 'CASH' && (
                    <div className="p-4 bg-emerald-50 text-emerald-800 rounded-2xl border border-emerald-200 text-xs font-medium">
                      Employee payout will be prepared as cash envelope on site paydays. Ensure site supervisor sign-off sheets are verified.
                    </div>
                  )}
                </div>
              )}

              {/* STEP 3: REQUIRED COMPLIANCE & LEGAL DOCUMENTS */}
              {currentStep === 3 && (
                <div className="space-y-4 animate-in fade-in">
                  <div className="flex items-center gap-2 text-xs font-bold text-slate-700 border-b border-slate-100 pb-2">
                    <FileCheck className="w-4 h-4 text-indigo-600" />
                    <span>Upload Mandatory Compliance Documents</span>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    {/* Mandatory Slot 1 */}
                    <div className="border border-dashed border-slate-300 rounded-2xl p-3 bg-slate-50 text-center">
                      <label className="block text-xs font-bold text-slate-800 mb-1">National ID / Omang *</label>
                      <input
                        type="file"
                        id="omang-upload"
                        className="hidden"
                        onChange={(e) => handleFileUpload('omangCopy', e.target.files[0])}
                      />
                      <label htmlFor="omang-upload" className="cursor-pointer flex flex-col items-center gap-1 text-[11px] font-semibold text-indigo-600 hover:text-indigo-800">
                        <Upload className="w-4 h-4" />
                        <span>{newEmployee.documents.omangCopy ? newEmployee.documents.omangCopy.name : 'Upload Copy'}</span>
                      </label>
                    </div>

                    {/* Mandatory Slot 2 */}
                    <div className="border border-dashed border-slate-300 rounded-2xl p-3 bg-slate-50 text-center">
                      <label className="block text-xs font-bold text-slate-800 mb-1">Signed Contract *</label>
                      <input
                        type="file"
                        id="contract-upload"
                        className="hidden"
                        onChange={(e) => handleFileUpload('signedContract', e.target.files[0])}
                      />
                      <label htmlFor="contract-upload" className="cursor-pointer flex flex-col items-center gap-1 text-[11px] font-semibold text-indigo-600 hover:text-indigo-800">
                        <Upload className="w-4 h-4" />
                        <span>{newEmployee.documents.signedContract ? newEmployee.documents.signedContract.name : 'Upload Contract'}</span>
                      </label>
                    </div>

                    {/* Optional Slot 3 */}
                    <div className="border border-dashed border-slate-200 rounded-2xl p-3 bg-slate-50/50 text-center">
                      <label className="block text-xs font-bold text-slate-600 mb-1">Safety Clearance (Optional)</label>
                      <input
                        type="file"
                        id="safety-upload"
                        className="hidden"
                        onChange={(e) => handleFileUpload('safetyClearance', e.target.files[0])}
                      />
                      <label htmlFor="safety-upload" className="cursor-pointer flex flex-col items-center gap-1 text-[11px] font-semibold text-slate-500 hover:text-slate-800">
                        <Upload className="w-4 h-4" />
                        <span>{newEmployee.documents.safetyClearance ? newEmployee.documents.safetyClearance.name : 'Upload File'}</span>
                      </label>
                    </div>

                    {/* Optional Slot 4 */}
                    <div className="border border-dashed border-slate-200 rounded-2xl p-3 bg-slate-50/50 text-center">
                      <label className="block text-xs font-bold text-slate-600 mb-1">Medical Fitness (Optional)</label>
                      <input
                        type="file"
                        id="medical-upload"
                        className="hidden"
                        onChange={(e) => handleFileUpload('medicalFitness', e.target.files[0])}
                      />
                      <label htmlFor="medical-upload" className="cursor-pointer flex flex-col items-center gap-1 text-[11px] font-semibold text-slate-500 hover:text-slate-800">
                        <Upload className="w-4 h-4" />
                        <span>{newEmployee.documents.medicalFitness ? newEmployee.documents.medicalFitness.name : 'Upload File'}</span>
                      </label>
                    </div>
                  </div>
                </div>
              )}

              {/* Wizard Nav Controls */}
              <div className="pt-4 border-t border-slate-100 flex items-center justify-between">
                {currentStep > 1 ? (
                  <button
                    type="button"
                    onClick={handlePrevStep}
                    className="px-4 py-2.5 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-xl transition flex items-center gap-1 cursor-pointer"
                  >
                    <ChevronLeft className="w-4 h-4" /> Back
                  </button>
                ) : <div />}

                {currentStep < 3 ? (
                  <button
                    type="button"
                    onClick={handleNextStep}
                    className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs rounded-xl transition shadow-md shadow-indigo-600/20 flex items-center gap-1 cursor-pointer"
                  >
                    Next <ChevronRight className="w-4 h-4" />
                  </button>
                ) : (
                  <button
                    type="submit"
                    disabled={submitting}
                    className="px-6 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs rounded-xl transition shadow-md shadow-indigo-600/20 flex items-center gap-2 cursor-pointer disabled:opacity-50"
                  >
                    {submitting && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                    <span>Complete Onboarding</span>
                  </button>
                )}
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}