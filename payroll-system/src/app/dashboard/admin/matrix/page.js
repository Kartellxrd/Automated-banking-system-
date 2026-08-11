'use client';

import { useState, useEffect } from 'react';
import {
  ShieldCheck,
  Shield,
  Save,
  RefreshCw,
  CheckCircle2,
  AlertCircle,
  Lock,
  Eye,
  FileText,
  Users,
  Building2,
  DollarSign,
  Settings,
  HelpCircle,
  X,
  Info
} from 'lucide-react';
import { supabase } from '@/lib/supabase';
import AdminNavbar from '@/components/admin/AdminNavbar';
import AdminSideNav from '@/components/admin/AdminSideNav';

// System Roles Definition
const ROLES = [
  { id: 'site_clerk', label: 'Site Clerk', desc: 'Field loggers logging shifts & fuel' },
  { id: 'hr', label: 'HR Manager', desc: 'Personnel, attendance & payroll' },
  { id: 'accountant', label: 'Accountant', desc: 'Financial records & disbursements' },
  { id: 'ceo', label: 'CEO / Exec', desc: 'Executive overwatch & audit reports' },
  { id: 'admin', label: 'System Admin', desc: 'Full root access & access management' }
];

// System Permission Matrix Structure
const DEFAULT_PERMISSIONS = [
  {
    category: 'Shift & Operation Logging',
    items: [
      { id: 'shifts.create', label: 'Create New Shift Logs', roles: ['site_clerk', 'admin'] },
      { id: 'shifts.read', label: 'View Operational Shift Logs', roles: ['site_clerk', 'hr', 'accountant', 'ceo', 'admin'] },
      { id: 'shifts.update', label: 'Edit Unclosed Shift Logs', roles: ['site_clerk', 'admin'] },
      { id: 'shifts.approve', label: 'Approve Shift Discrepancies', roles: ['hr', 'ceo', 'admin'] }
    ]
  },
  {
    category: 'Personnel & HR Management',
    items: [
      { id: 'hr.employees.view', label: 'View Employee Master Profiles', roles: ['hr', 'ceo', 'admin'] },
      { id: 'hr.attendance.manage', label: 'Manage Attendance & Clock-ins', roles: ['hr', 'admin'] },
      { id: 'hr.payroll.prepare', label: 'Prepare Payroll Documents', roles: ['hr', 'accountant', 'admin'] },
      { id: 'hr.payroll.approve', label: 'Approve Payroll & Disburse', roles: ['ceo', 'admin'] }
    ]
  },
  {
    category: 'Finance & Expense Auditing',
    items: [
      { id: 'finance.expenses.log', label: 'Log Operational Expenses', roles: ['accountant', 'site_clerk', 'admin'] },
      { id: 'finance.expenses.view', label: 'Access Ledger & Balance Sheets', roles: ['accountant', 'ceo', 'admin'] },
      { id: 'finance.disburse', label: 'Execute Vendor Disbursements', roles: ['accountant', 'admin'] }
    ]
  },
  {
    category: 'System Governance & Administration',
    items: [
      { id: 'admin.users.provision', label: 'Provision New User Identities', roles: ['admin'] },
      { id: 'admin.roles.update', label: 'Modify Access & Role Matrix', roles: ['admin'] },
      { id: 'admin.logs.audit', label: 'Access System Security Audit Logs', roles: ['admin', 'ceo'] }
    ]
  }
];

export default function AccessRoleMatrixPage() {
  const [matrix, setMatrix] = useState(DEFAULT_PERMISSIONS);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState({ type: '', text: '' });
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);

  useEffect(() => {
    fetchMatrixConfig();
  }, []);

  // Fetch Matrix State from Backend / Supabase
  const fetchMatrixConfig = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('system_settings')
        .select('*')
        .eq('key', 'role_matrix')
        .single();

      if (error && error.code !== 'PGRST116') { // Ignore missing row error on fresh DB
        console.warn('Backend matrix table not ready yet, loading default fallback layout:', error);
      } else if (data?.value) {
        setMatrix(data.value);
      }
    } catch (err) {
      console.error('Error loading access matrix:', err);
    } finally {
      setLoading(false);
      setHasUnsavedChanges(false);
    }
  };

  // Toggle Matrix Permission Checkbox
  const handleTogglePermission = (categoryId, permId, roleId) => {
    // Lock Admin from losing admin system governance permissions
    if (roleId === 'admin' && permId.startsWith('admin.')) {
      setMessage({ type: 'error', text: 'System Admin access rules cannot be disabled for security reasons.' });
      return;
    }

    setMatrix((prevMatrix) =>
      prevMatrix.map((cat) => {
        if (cat.category !== categoryId) return cat;

        return {
          ...cat,
          items: cat.items.map((item) => {
            if (item.id !== permId) return item;

            const hasRole = item.roles.includes(roleId);
            const updatedRoles = hasRole
              ? item.roles.filter((r) => r !== roleId)
              : [...item.roles, roleId];

            return { ...item, roles: updatedRoles };
          })
        };
      })
    );

    setHasUnsavedChanges(true);
  };

  // Save Role Matrix to Backend / Supabase
  const handleSaveMatrix = async () => {
    setSaving(true);
    setMessage({ type: '', text: '' });

    try {
      const { error } = await supabase
        .from('system_settings')
        .upsert({ key: 'role_matrix', value: matrix, updated_at: new Date().toISOString() }, { onConflict: 'key' });

      if (error) throw error;

      setMessage({ type: 'success', text: 'Access and Role Matrix saved successfully!' });
      setHasUnsavedChanges(false);
    } catch (err) {
      setMessage({ type: 'error', text: err.message || 'Failed to save access configurations.' });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-100 text-slate-900 flex flex-col lg:flex-row font-sans">
      {/* 1. Modular Side Navigation */}
      <AdminSideNav />

      {/* 2. Main Work Area (Sits strictly between Sidebar and Navbar) */}
      <main className="flex-1 p-4 sm:p-6 lg:p-8 space-y-6 overflow-x-hidden">
        
        {/* 3. Modular Top Navbar */}
        <AdminNavbar title="Access Control & Privilege Matrix" />

        {/* Dynamic Notification Toast */}
        {message.text && (
          <div
            className={`p-4 rounded-2xl text-xs font-semibold flex items-center justify-between shadow-xs transition animate-in fade-in ${
              message.type === 'success'
                ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                : 'bg-rose-50 text-rose-800 border border-rose-200'
            }`}
          >
            <div className="flex items-center gap-2.5">
              {message.type === 'success' ? (
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              ) : (
                <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
              )}
              <span>{message.text}</span>
            </div>
            <button onClick={() => setMessage({ type: '', text: '' })} className="p-1 hover:opacity-75">
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* Page Overview Header & Actions */}
        <div className="bg-white p-5 sm:p-6 rounded-2xl border border-slate-200 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-indigo-50 border border-indigo-100 rounded-xl text-indigo-600">
              <ShieldCheck className="w-6 h-6" />
            </div>
            <div>
              <h2 className="font-bold text-slate-900 text-base">Role Capability Matrix</h2>
              <p className="text-xs text-slate-500 font-medium">
                Configure global access controls and module permissions for system roles
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={fetchMatrixConfig}
              disabled={loading || saving}
              className="p-2.5 text-slate-600 hover:text-indigo-600 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-xl transition"
              title="Reset Changes / Reload Matrix"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin text-indigo-600' : ''}`} />
            </button>

            <button
              onClick={handleSaveMatrix}
              disabled={saving || !hasUnsavedChanges}
              className={`flex items-center gap-2 text-xs font-semibold px-5 py-2.5 rounded-xl transition shadow-sm ${
                hasUnsavedChanges
                  ? 'bg-indigo-600 hover:bg-indigo-700 text-white shadow-indigo-600/20'
                  : 'bg-slate-100 text-slate-400 cursor-not-allowed border border-slate-200'
              }`}
            >
              {saving ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
              <span>{saving ? 'Saving...' : 'Save Permissions Matrix'}</span>
            </button>
          </div>
        </div>

        {/* Matrix Container */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
          
          {/* Unsaved Changes Banner */}
          {hasUnsavedChanges && (
            <div className="bg-amber-50 border-b border-amber-200 px-5 py-2.5 text-amber-800 text-xs font-semibold flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Info className="w-4 h-4 text-amber-600 shrink-0" />
                <span>You have unsaved privilege alterations. Remember to save changes before leaving.</span>
              </div>
            </div>
          )}

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              {/* Table Header: Roles List */}
              <thead className="bg-slate-50 border-b border-slate-200">
                <tr>
                  <th className="py-4 px-5 text-slate-700 font-bold uppercase tracking-wider min-w-[280px]">
                    System Module & Capability
                  </th>
                  {ROLES.map((role) => (
                    <th key={role.id} className="py-4 px-4 text-center min-w-[120px] border-l border-slate-200/60">
                      <div className="font-bold text-slate-900 text-xs">{role.label}</div>
                      <div className="text-[10px] text-slate-400 font-normal mt-0.5 line-clamp-1 max-w-[120px] mx-auto">
                        {role.desc}
                      </div>
                    </th>
                  ))}
                </tr>
              </thead>

              {/* Table Body: Grouped Categories & Permissions */}
              <tbody className="divide-y divide-slate-100">
                {matrix.map((cat) => (
                  <tr key={cat.category} className="contents">
                    {/* Category Divider Row */}
                    <tr>
                      <td
                        colSpan={ROLES.length + 1}
                        className="bg-slate-100/70 border-y border-slate-200/80 px-5 py-2.5 font-bold text-slate-700 text-xs tracking-wider"
                      >
                        {cat.category}
                      </td>
                    </tr>

                    {/* Permission Items */}
                    {cat.items.map((perm) => (
                      <tr key={perm.id} className="hover:bg-slate-50/80 transition-colors">
                        <td className="py-3.5 px-5 font-semibold text-slate-800 flex items-center justify-between gap-2">
                          <span>{perm.label}</span>
                          <span className="font-mono text-[10px] text-slate-400 bg-slate-100 px-2 py-0.5 rounded border border-slate-200">
                            {perm.id}
                          </span>
                        </td>

                        {ROLES.map((role) => {
                          const isChecked = perm.roles.includes(role.id);
                          const isLocked = role.id === 'admin' && perm.id.startsWith('admin.');

                          return (
                            <td key={role.id} className="py-3.5 px-4 text-center border-l border-slate-100">
                              <label className="inline-flex items-center justify-center cursor-pointer p-1">
                                <input
                                  type="checkbox"
                                  checked={isChecked}
                                  disabled={isLocked}
                                  onChange={() => handleTogglePermission(cat.category, perm.id, role.id)}
                                  className={`w-4 h-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 transition cursor-pointer ${
                                    isLocked ? 'opacity-50 cursor-not-allowed' : ''
                                  }`}
                                />
                              </label>
                            </td>
                          );
                        })}
                      </tr>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Matrix Footer Note */}
          <div className="bg-slate-50 border-t border-slate-200 p-4 text-[11px] text-slate-500 flex flex-col sm:flex-row items-center justify-between gap-2">
            <div className="flex items-center gap-1.5">
              <Lock className="w-3.5 h-3.5 text-slate-400" />
              <span>System governance privileges for Admin users cannot be demoted via UI.</span>
            </div>
            <span className="font-mono text-slate-400">Schema Sync: Ready for Supabase RLS</span>
          </div>
        </div>
      </main>
    </div>
  );
}