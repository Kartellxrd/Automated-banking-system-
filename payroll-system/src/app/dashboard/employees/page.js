'use client';

import { useState, useEffect } from 'react';
import { UserPlus, Wallet, Building2, Search, Phone, Hash, ShieldCheck, Loader2, X } from 'lucide-react';

export default function EmployeesPage() {
  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // Form state matching 3NF layout
  const [formData, setFormData] = useState({
    employee_code: '',
    first_name: '',
    last_name: '',
    phone_number: '',
    hourly_rate: '',
    payout_provider_id: '1', // Default: FNB
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

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const res = await fetch('/api/employees', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      });
      const result = await res.json();
      if (result.success) {
        setIsModalOpen(false);
        setFormData({
          employee_code: '',
          first_name: '',
          last_name: '',
          phone_number: '',
          hourly_rate: '',
          payout_provider_id: '1',
          account_or_mobile_number: '',
          branch_code: ''
        });
        fetchEmployees();
      } else {
        alert(result.error || 'Failed to create employee');
      }
    } catch (err) {
      alert('Error submitting form: ' + err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const filteredEmployees = employees.filter((emp) => {
    const fullName = `${emp.first_name} ${emp.last_name}`.toLowerCase();
    const code = emp.employee_code.toLowerCase();
    return fullName.includes(searchTerm.toLowerCase()) || code.includes(searchTerm.toLowerCase());
  });

  return (
    <div className="min-h-screen bg-slate-50 p-4 md:p-8 text-slate-800">
      <div className="max-w-7xl mx-auto space-y-6">
        
        {/* HEADER SECTION */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-slate-900">Worker Directory</h1>
            <p className="text-sm text-slate-500 mt-1">
              Manage workforce details and lock in Bank vs. Mobile Money preferences.
            </p>
          </div>
          <button
            onClick={() => setIsModalOpen(true)}
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white font-medium px-5 py-3 rounded-xl transition shadow-sm active:scale-95"
          >
            <UserPlus className="w-5 h-5" />
            <span>Add New Worker</span>
          </button>
        </div>

        {/* SEARCH & FILTER BAR */}
        <div className="relative">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
          <input
            type="text"
            placeholder="Search by worker name or employee ID..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-12 pr-4 py-3 bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 text-slate-900 placeholder-slate-400 shadow-sm"
          />
        </div>

        {/* LOADING INDICATOR */}
        {loading ? (
          <div className="flex flex-col items-center justify-center py-16 bg-white rounded-2xl border border-slate-200">
            <Loader2 className="w-8 h-8 text-indigo-600 animate-spin" />
            <p className="text-slate-500 mt-3 text-sm font-medium">Loading workers...</p>
          </div>
        ) : filteredEmployees.length === 0 ? (
          <div className="text-center py-16 bg-white rounded-2xl border border-slate-200">
            <p className="text-slate-500 text-base font-medium">No workers found.</p>
            <p className="text-slate-400 text-xs mt-1">Click "Add New Worker" to register an employee.</p>
          </div>
        ) : (
          <>
            {/* DESKTOP TABLE VIEW (Hidden on Mobile) */}
            <div className="hidden md:block bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
              <table className="w-full text-left text-sm border-collapse">
                <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold">
                  <tr>
                    <th className="py-4 px-6">ID Code</th>
                    <th className="py-4 px-6">Worker Name</th>
                    <th className="py-4 px-6">Phone</th>
                    <th className="py-4 px-6">Rate (BWP/hr)</th>
                    <th className="py-4 px-6">Payment Preference</th>
                    <th className="py-4 px-6">Account / Wallet No.</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredEmployees.map((emp) => {
                    const profile = emp.employee_payout_profiles?.[0];
                    const provider = profile?.payout_providers;
                    const channel = provider?.payment_channels?.code;

                    return (
                      <tr key={emp.id} className="hover:bg-slate-50/80 transition">
                        <td className="py-4 px-6 font-mono text-indigo-600 font-medium">{emp.employee_code}</td>
                        <td className="py-4 px-6 font-semibold text-slate-900">{emp.first_name} {emp.last_name}</td>
                        <td className="py-4 px-6 text-slate-600">{emp.phone_number}</td>
                        <td className="py-4 px-6 font-semibold text-slate-900">P{parseFloat(emp.hourly_rate).toFixed(2)}</td>
                        <td className="py-4 px-6">
                          {channel === 'MOBILE_WALLET' ? (
                            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                              <Wallet className="w-3.5 h-3.5" />
                              {provider?.name || 'Mobile Wallet'}
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-blue-50 text-blue-700 border border-blue-200">
                              <Building2 className="w-3.5 h-3.5" />
                              {provider?.name || 'Bank'}
                            </span>
                          )}
                        </td>
                        <td className="py-4 px-6 font-mono text-slate-700">{profile?.account_or_mobile_number || 'N/A'}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* MOBILE CARD VIEW (Displayed on Phones) */}
            <div className="grid grid-cols-1 gap-4 md:hidden">
              {filteredEmployees.map((emp) => {
                const profile = emp.employee_payout_profiles?.[0];
                const provider = profile?.payout_providers;
                const channel = provider?.payment_channels?.code;

                return (
                  <div key={emp.id} className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-3">
                    <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                      <div>
                        <span className="text-xs font-mono font-bold text-indigo-600 bg-indigo-50 px-2 py-1 rounded-md">
                          {emp.employee_code}
                        </span>
                        <h3 className="text-lg font-bold text-slate-900 mt-1">{emp.first_name} {emp.last_name}</h3>
                      </div>
                      <div className="text-right">
                        <span className="text-xs text-slate-400 font-medium">Rate</span>
                        <p className="text-base font-bold text-slate-900">P{parseFloat(emp.hourly_rate).toFixed(2)}/hr</p>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-2 text-xs">
                      <div className="space-y-1">
                        <span className="text-slate-400">Phone</span>
                        <p className="font-medium text-slate-700 flex items-center gap-1">
                          <Phone className="w-3 h-3 text-slate-400" />
                          {emp.phone_number}
                        </p>
                      </div>

                      <div className="space-y-1">
                        <span className="text-slate-400">Channel</span>
                        <div>
                          {channel === 'MOBILE_WALLET' ? (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                              <Wallet className="w-3 h-3" />
                              {provider?.name}
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-blue-50 text-blue-700 border border-blue-200">
                              <Building2 className="w-3 h-3" />
                              {provider?.name}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-xs">
                      <span className="text-slate-400">Account / Mobile No:</span>
                      <span className="font-mono font-semibold text-slate-800 bg-slate-100 px-2 py-1 rounded">
                        {profile?.account_or_mobile_number || 'N/A'}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </>
        )}

      </div>

      {/* MOBILE RESPONSIVE REGISTRATION MODAL */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-slate-900/50 backdrop-blur-sm p-0 sm:p-4">
          <div className="w-full sm:max-w-lg bg-white rounded-t-3xl sm:rounded-2xl shadow-xl overflow-hidden max-h-[90vh] flex flex-col animate-in fade-in slide-in-from-bottom-6">
            
            {/* Modal Header */}
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50">
              <h2 className="text-lg font-bold text-slate-900">Register New Worker</h2>
              <button onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-slate-600 p-1">
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Form Content */}
            <form onSubmit={handleSubmit} className="p-6 overflow-y-auto space-y-4 text-sm">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Employee ID Code *</label>
                  <input
                    type="text"
                    name="employee_code"
                    placeholder="e.g. EMP-001"
                    required
                    value={formData.employee_code}
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

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Mobile Phone Number *</label>
                <input
                  type="text"
                  name="phone_number"
                  placeholder="e.g. +267 71 234 567"
                  required
                  value={formData.phone_number}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2.5 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none"
                />
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

              {/* Branch code only for banks */}
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
                  onClick={() => setIsModalOpen(false)}
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
                  Save Worker
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}