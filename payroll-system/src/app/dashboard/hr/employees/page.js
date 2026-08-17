'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import HRSideNav from '@/components/hr/HRSideNav';
import HRNavbar from '@/components/hr/HRNavbar';
import { 
  Users, 
  Plus, 
  Search, 
  CreditCard, 
  Smartphone, 
  Banknote, 
  FileText, 
  Edit3, 
  Loader2, 
  ExternalLink,
  X 
} from 'lucide-react';

export default function EmployeeDirectoryPage() {
  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [activeTab, setActiveTab] = useState('roster'); // 'roster' | 'documents'
  
  // Edit Employee State
  const [editingEmp, setEditingEmp] = useState(null);
  const [saving, setSaving] = useState(false);

  const fetchEmployees = async () => {
    try {
      // FIX: Changed endpoint from /api/employees to /api/hr/employees
      const res = await fetch('/api/hr/employees');
      
      if (!res.ok) {
        throw new Error(`Server returned status ${res.status}`);
      }

      const json = await res.json();
      if (json.success) {
        setEmployees(json.data || []);
      }
    } catch (err) {
      console.error('Failed to load employees:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchEmployees();
  }, []);

  const handleUpdateEmployee = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      // FIX: Changed endpoint to /api/hr/employees
      const res = await fetch('/api/hr/employees', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(editingEmp),
      });

      if (!res.ok) {
        throw new Error(`Server error: ${res.status}`);
      }

      const json = await res.json();
      if (json.success) {
        setEditingEmp(null);
        fetchEmployees();
      } else {
        alert(json.error || 'Failed to update employee details');
      }
    } catch (err) {
      alert('Error updating employee details. Check server logs.');
    } finally {
      setSaving(false);
    }
  };

  const filteredEmployees = employees.filter((emp) => {
    const q = search.toLowerCase();
    return (
      emp.name.toLowerCase().includes(q) ||
      emp.role.toLowerCase().includes(q) ||
      emp.site.toLowerCase().includes(q) ||
      (emp.employee_code && emp.employee_code.toLowerCase().includes(q))
    );
  });

  const renderPaymentBadge = (channel) => {
    const ch = (channel || 'EFT').toUpperCase();
    if (ch.includes('MOBILE')) {
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-amber-50 text-amber-700 border border-amber-200">
          <Smartphone className="w-3.5 h-3.5 text-amber-600" /> Mobile Money
        </span>
      );
    }
    if (ch.includes('CASH')) {
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
          <Banknote className="w-3.5 h-3.5 text-emerald-600" /> Cash
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-indigo-50 text-indigo-700 border border-indigo-200">
        <CreditCard className="w-3.5 h-3.5 text-indigo-600" /> EFT
      </span>
    );
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col lg:flex-row text-slate-900 font-sans">
      <HRSideNav />

      <div className="flex-1 flex flex-col min-w-0">
        <HRNavbar />

        <main className="p-4 sm:p-6 lg:p-8 space-y-6 max-w-7xl mx-auto w-full">
          {/* Header */}
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-6 rounded-3xl border border-slate-200/80 shadow-xs">
            <div>
              <div className="flex items-center gap-2 text-xs font-extrabold text-indigo-600 uppercase tracking-wider mb-1">
                <Users className="w-4 h-4" /> Personnel Compliance Archive
              </div>
              <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
                Employee Directory & Onboarding
              </h1>
              <p className="text-slate-500 text-sm mt-1">
                Manage site rosters, payment preference channels, and attached legal compliance files.
              </p>
            </div>
            <Link
              href="/dashboard/hr/employees/new"
              className="inline-flex items-center justify-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-sm px-5 py-3 rounded-2xl transition shadow-md shadow-indigo-600/20 active:scale-95 shrink-0"
            >
              <Plus className="w-4 h-4" /> Add New Employee
            </Link>
          </div>

          {/* Search & Tabs */}
          <div className="bg-white p-4 rounded-3xl border border-slate-200/80 shadow-xs space-y-4">
            <div className="relative">
              <Search className="w-4 h-4 text-slate-400 absolute left-4 top-3.5" />
              <input
                type="text"
                placeholder="Search by name, role, site, or code..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full pl-11 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-medium focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition"
              />
            </div>

            <div className="flex items-center gap-2 border-b border-slate-100 pb-2">
              <button
                onClick={() => setActiveTab('roster')}
                className={`px-4 py-2 rounded-xl text-xs font-extrabold transition cursor-pointer ${
                  activeTab === 'roster'
                    ? 'bg-indigo-50 text-indigo-700 border border-indigo-200'
                    : 'text-slate-500 hover:text-slate-800'
                }`}
              >
                Active Personnel ({filteredEmployees.length})
              </button>
              <button
                onClick={() => setActiveTab('documents')}
                className={`px-4 py-2 rounded-xl text-xs font-extrabold transition cursor-pointer ${
                  activeTab === 'documents'
                    ? 'bg-indigo-50 text-indigo-700 border border-indigo-200'
                    : 'text-slate-500 hover:text-slate-800'
                }`}
              >
                Document Vault Quick View
              </button>
            </div>
          </div>

          {/* Main Table */}
          <div className="bg-white rounded-3xl border border-slate-200/80 shadow-xs overflow-hidden">
            {loading ? (
              <div className="p-12 text-center text-xs text-slate-400 flex items-center justify-center gap-2">
                <Loader2 className="w-4 h-4 animate-spin" /> Loading personnel records...
              </div>
            ) : filteredEmployees.length === 0 ? (
              <div className="p-12 text-center text-xs text-slate-500 font-medium">
                No employees found matching your search.
              </div>
            ) : activeTab === 'roster' ? (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm text-slate-600">
                  <thead className="bg-slate-50/80 text-[11px] uppercase tracking-wider font-extrabold text-slate-400 border-b border-slate-100">
                    <tr>
                      <th className="px-6 py-4">Code</th>
                      <th className="px-6 py-4">Employee Name</th>
                      <th className="px-6 py-4">Job Title</th>
                      <th className="px-6 py-4">Mine Site</th>
                      <th className="px-6 py-4">Base Hourly Rate</th>
                      <th className="px-6 py-4">Payment Method</th>
                      <th className="px-6 py-4 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 font-medium">
                    {filteredEmployees.map((emp) => (
                      <tr key={emp.id} className="hover:bg-slate-50/60 transition">
                        <td className="px-6 py-4 font-bold text-indigo-600 text-xs">
                          {emp.employee_code || `EMP-${emp.id.substring(0, 4)}`}
                        </td>
                        <td className="px-6 py-4">
                          <div className="font-bold text-slate-900">{emp.name}</div>
                          <div className="text-[11px] text-slate-400">{emp.nationalId || 'No ID Logged'}</div>
                        </td>
                        <td className="px-6 py-4 text-slate-700 font-semibold">{emp.role}</td>
                        <td className="px-6 py-4">
                          <span className="px-2.5 py-1 rounded-lg text-xs font-bold bg-slate-100 text-slate-700">
                            {emp.site}
                          </span>
                        </td>
                        <td className="px-6 py-4 font-bold text-slate-900">{emp.formatted_rate}</td>
                        <td className="px-6 py-4">{renderPaymentBadge(emp.paymentChannel)}</td>
                        <td className="px-6 py-4 text-right">
                          <div className="flex items-center justify-end gap-2">
                            <button
                              onClick={() => setEditingEmp(emp)}
                              className="p-2 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-xl transition cursor-pointer"
                              title="Edit Employee HR Details"
                            >
                              <Edit3 className="w-4 h-4" />
                            </button>
                            <Link
                              href={`/dashboard/hr/documents?employeeId=${emp.id}`}
                              className="p-2 text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 rounded-xl transition inline-flex items-center gap-1"
                              title="View Document Vault"
                            >
                              <FileText className="w-4 h-4" />
                            </Link>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              /* Quick Document Vault View */
              <div className="p-6 space-y-4">
                <div className="flex justify-between items-center pb-2 border-b border-slate-100">
                  <h3 className="font-extrabold text-sm text-slate-900">Personnel Compliance Files</h3>
                  <Link
                    href="/dashboard/hr/documents"
                    className="text-xs font-bold text-indigo-600 hover:underline flex items-center gap-1"
                  >
                    Open Documents Archive <ExternalLink className="w-3.5 h-3.5" />
                  </Link>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {filteredEmployees.map((emp) => (
                    <div key={emp.id} className="p-4 rounded-2xl border border-slate-200 bg-slate-50/50 flex justify-between items-center">
                      <div>
                        <div className="font-bold text-slate-900 text-sm">{emp.name}</div>
                        <div className="text-xs text-slate-500">{emp.role} • {emp.site}</div>
                      </div>
                      <Link
                        href={`/dashboard/hr/documents?employeeId=${emp.id}`}
                        className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold transition flex items-center gap-1.5"
                      >
                        <FileText className="w-3.5 h-3.5" /> View Documents
                      </Link>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </main>
      </div>

      {/* Edit Employee Modal */}
      {editingEmp && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 space-y-4 shadow-2xl border border-slate-100">
            <div className="flex justify-between items-center pb-2 border-b border-slate-100">
              <h3 className="font-extrabold text-slate-900 text-lg">Update Employee HR Details</h3>
              <button onClick={() => setEditingEmp(null)} className="text-slate-400 hover:text-slate-600 cursor-pointer">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleUpdateEmployee} className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-bold text-slate-600">First Name</label>
                  <input
                    type="text"
                    value={editingEmp.first_name}
                    onChange={(e) => setEditingEmp({ ...editingEmp, first_name: e.target.value })}
                    className="w-full mt-1 p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium focus:ring-2 focus:ring-indigo-500/20"
                    required
                  />
                </div>
                <div>
                  <label className="text-xs font-bold text-slate-600">Last Name</label>
                  <input
                    type="text"
                    value={editingEmp.last_name}
                    onChange={(e) => setEditingEmp({ ...editingEmp, last_name: e.target.value })}
                    className="w-full mt-1 p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium focus:ring-2 focus:ring-indigo-500/20"
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-bold text-slate-600">Job Title</label>
                  <input
                    type="text"
                    value={editingEmp.role}
                    onChange={(e) => setEditingEmp({ ...editingEmp, role: e.target.value })}
                    className="w-full mt-1 p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium focus:ring-2 focus:ring-indigo-500/20"
                    required
                  />
                </div>
                <div>
                  <label className="text-xs font-bold text-slate-600">Hourly Rate (BWP)</label>
                  <input
                    type="number"
                    step="0.01"
                    value={editingEmp.rate}
                    onChange={(e) => setEditingEmp({ ...editingEmp, rate: e.target.value })}
                    className="w-full mt-1 p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium focus:ring-2 focus:ring-indigo-500/20"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="text-xs font-bold text-slate-600">Payment Channel</label>
                <select
                  value={editingEmp.paymentChannel}
                  onChange={(e) => setEditingEmp({ ...editingEmp, paymentChannel: e.target.value })}
                  className="w-full mt-1 p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 focus:ring-2 focus:ring-indigo-500/20"
                >
                  <option value="EFT">Bank EFT Transfer</option>
                  <option value="MOBILE_MONEY">Mobile Money Transfer</option>
                  <option value="CASH">Cash Disbursement</option>
                </select>
              </div>

              <div className="flex items-center justify-end gap-2 pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setEditingEmp(null)}
                  className="px-4 py-2 rounded-xl text-xs font-bold text-slate-500 hover:bg-slate-100"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold transition flex items-center gap-1.5"
                >
                  {saving && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                  Save Changes
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}