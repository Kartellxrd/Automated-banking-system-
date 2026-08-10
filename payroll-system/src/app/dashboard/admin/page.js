'use client';

import { useState, useEffect } from 'react';
import { UserPlus, Shield, Users, RefreshCw, CheckCircle2, AlertCircle, Lock, Building2 } from 'lucide-react';
import { supabase } from '@/lib/supabase';

export default function AdminDashboardPage() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState({ type: '', text: '' });

  const [formData, setFormData] = useState({
    first_name: '',
    last_name: '',
    email: '',
    password: '',
    role: 'site_clerk',
    site_location: 'Debete Mine'
  });

  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setUsers(data || []);
    } catch (err) {
      console.error('Error fetching users:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateUser = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    setMessage({ type: '', text: '' });

    try {
      const res = await fetch('/api/admin/create-user', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      });

      const result = await res.json();

      if (!res.ok || !result.success) {
        throw new Error(result.error || 'Failed to provision user');
      }

      setMessage({ type: 'success', text: result.message });
      setFormData({
        first_name: '',
        last_name: '',
        email: '',
        password: '',
        role: 'site_clerk',
        site_location: 'Debete Mine'
      });
      fetchUsers();
    } catch (err) {
      setMessage({ type: 'error', text: err.message });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="max-w-7xl mx-auto space-y-6 p-4 sm:p-6 lg:p-8 pb-16">
      
      {/* Header Banner */}
      <div className="bg-white p-5 sm:p-6 rounded-2xl border border-slate-200 shadow-sm flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="bg-slate-900 text-white text-[10px] sm:text-xs font-semibold px-2.5 py-0.5 rounded-full flex items-center gap-1">
              <Shield className="w-3 h-3 text-amber-400" /> Admin Control
            </span>
            <span className="text-xs text-slate-400 font-medium">Periscope Mining</span>
          </div>
          <h1 className="text-xl sm:text-2xl font-bold text-slate-900 mt-2">Staff Provisioning & Access Control</h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            Provision user accounts, assign system roles, and set access parameters.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* User Provisioning Form */}
        <div className="bg-white p-5 sm:p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4">
          <div className="flex items-center gap-2 border-b border-slate-100 pb-3">
            <UserPlus className="w-5 h-5 text-emerald-600 shrink-0" />
            <h2 className="font-bold text-slate-900 text-base">Provision Account</h2>
          </div>

          {message.text && (
            <div className={`p-3 rounded-xl text-xs font-medium flex items-start gap-2 ${
              message.type === 'success' ? 'bg-emerald-50 text-emerald-800 border border-emerald-200' : 'bg-red-50 text-red-800 border border-red-200'
            }`}>
              {message.type === 'success' ? <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5" /> : <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />}
              <span>{message.text}</span>
            </div>
          )}

          <form onSubmit={handleCreateUser} className="space-y-3.5 text-sm">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">First Name</label>
                <input
                  type="text"
                  required
                  value={formData.first_name}
                  onChange={(e) => setFormData({ ...formData, first_name: e.target.value })}
                  className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:bg-white focus:ring-2 focus:ring-emerald-500 text-sm"
                  placeholder="e.g. Lorato"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">Last Name</label>
                <input
                  type="text"
                  required
                  value={formData.last_name}
                  onChange={(e) => setFormData({ ...formData, last_name: e.target.value })}
                  className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:bg-white focus:ring-2 focus:ring-emerald-500 text-sm"
                  placeholder="e.g. Molefe"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">Company Email</label>
              <input
                type="email"
                required
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:bg-white focus:ring-2 focus:ring-emerald-500 text-sm"
                placeholder="l.molefe@periscope.co.bw"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">Temporary Password</label>
              <div className="relative">
                <input
                  type="password"
                  required
                  minLength={6}
                  value={formData.password}
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                  className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:bg-white focus:ring-2 focus:ring-emerald-500 text-sm"
                  placeholder="••••••••"
                />
                <Lock className="w-4 h-4 text-slate-400 absolute right-3 top-3" />
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">Assigned System Role</label>
              <select
                value={formData.role}
                onChange={(e) => setFormData({ ...formData, role: e.target.value })}
                className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:bg-white focus:ring-2 focus:ring-emerald-500 text-sm text-slate-900"
              >
                <option value="site_clerk">Site Clerk (Debete Shift Logger)</option>
                <option value="hr">HR Manager (Personnel & Documents)</option>
                <option value="accountant">Accountant (Disbursements & Receipts)</option>
                <option value="ceo">CEO / Executive (Universal Access)</option>
                <option value="admin">System Admin (Full Rights)</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">Site Location</label>
              <div className="relative">
                <input
                  type="text"
                  value={formData.site_location}
                  onChange={(e) => setFormData({ ...formData, site_location: e.target.value })}
                  className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:bg-white focus:ring-2 focus:ring-emerald-500 text-sm"
                />
                <Building2 className="w-4 h-4 text-slate-400 absolute right-3 top-3" />
              </div>
            </div>

            <button
              type="submit"
              disabled={submitting}
              className="w-full py-3 bg-slate-900 hover:bg-slate-800 active:scale-[0.98] text-white font-medium rounded-xl transition flex items-center justify-center gap-2 mt-2 shadow-sm text-sm"
            >
              {submitting ? <RefreshCw className="w-4 h-4 animate-spin" /> : <UserPlus className="w-4 h-4" />}
              <span>Provision Account</span>
            </button>
          </form>
        </div>

        {/* Provisioned Accounts Listing */}
        <div className="lg:col-span-2 bg-white p-5 sm:p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <Users className="w-5 h-5 text-slate-700 shrink-0" />
                <h2 className="font-bold text-slate-900 text-base">Active Accounts ({users.length})</h2>
              </div>
              <button
                onClick={fetchUsers}
                className="p-2 text-slate-400 hover:text-slate-600 rounded-lg transition hover:bg-slate-50"
              >
                <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
              </button>
            </div>

            {/* Desktop / Tablet Table View */}
            <div className="hidden sm:block overflow-x-auto mt-3">
              <table className="w-full text-left text-sm">
                <thead className="bg-slate-50 text-slate-600 font-medium border-b border-slate-200">
                  <tr>
                    <th className="py-2.5 px-3">Name</th>
                    <th className="py-2.5 px-3">Email</th>
                    <th className="py-2.5 px-3">Role</th>
                    <th className="py-2.5 px-3">Location</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {users.map((user) => (
                    <tr key={user.id} className="hover:bg-slate-50/50">
                      <td className="py-3 px-3 font-semibold text-slate-900">
                        {user.first_name} {user.last_name}
                      </td>
                      <td className="py-3 px-3 text-xs text-slate-600">{user.email}</td>
                      <td className="py-3 px-3">
                        <span className={`text-[10px] font-bold px-2.5 py-1 rounded-full uppercase tracking-wider ${
                          user.role === 'admin' ? 'bg-purple-100 text-purple-800' :
                          user.role === 'ceo' ? 'bg-amber-100 text-amber-800' :
                          user.role === 'accountant' ? 'bg-emerald-100 text-emerald-800' :
                          user.role === 'hr' ? 'bg-blue-100 text-blue-800' :
                          'bg-slate-100 text-slate-700'
                        }`}>
                          {user.role.replace('_', ' ')}
                        </span>
                      </td>
                      <td className="py-3 px-3 text-xs text-slate-500">{user.site_location}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Mobile Card View (< 640px) */}
            <div className="sm:hidden space-y-3 mt-3">
              {users.map((user) => (
                <div key={user.id} className="p-3.5 bg-slate-50 rounded-xl border border-slate-200 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-slate-900 text-sm">
                      {user.first_name} {user.last_name}
                    </span>
                    <span className={`text-[9px] font-bold px-2 py-0.5 rounded-full uppercase ${
                      user.role === 'admin' ? 'bg-purple-100 text-purple-800' :
                      user.role === 'ceo' ? 'bg-amber-100 text-amber-800' :
                      user.role === 'accountant' ? 'bg-emerald-100 text-emerald-800' :
                      user.role === 'hr' ? 'bg-blue-100 text-blue-800' :
                      'bg-slate-100 text-slate-700'
                    }`}>
                      {user.role.replace('_', ' ')}
                    </span>
                  </div>
                  <div className="text-xs text-slate-600 break-all">{user.email}</div>
                  <div className="text-[11px] text-slate-400 font-medium">{user.site_location}</div>
                </div>
              ))}
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}