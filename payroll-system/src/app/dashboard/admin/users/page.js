'use client';

import { useState, useEffect } from 'react';
import {
  UserPlus,
  Users,
  RefreshCw,
  CheckCircle2,
  AlertCircle,
  Lock,
  User,
  Eye,
  X,
  ChevronDown,
  Search,
  Shield,
  ShieldCheck,
  MapPin,
  Mail,
  Building2,
  Calendar,
  Filter,
  UserCheck,
  UserX,
  MoreVertical,
  KeyRound
} from 'lucide-react';
import { supabase } from '@/lib/supabase';
import AdminNavbar from '@/components/admin/AdminNavbar';
import AdminSideNav from '@/components/admin/AdminSideNav';

export default function UserProvisioningPage() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [updatingRoleId, setUpdatingRoleId] = useState(null);
  const [message, setMessage] = useState({ type: '', text: '' });
  
  // Modal & Selection States
  const [selectedProfile, setSelectedProfile] = useState(null);
  const [isProvisionModalOpen, setIsProvisionModalOpen] = useState(false);
  
  // Search & Filter States
  const [searchQuery, setSearchQuery] = useState('');
  const [roleFilter, setRoleFilter] = useState('ALL');

  // New Provision Form Data
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

  // Fetch Users from Supabase
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
      console.error('Error fetching profiles:', err);
    } finally {
      setLoading(false);
    }
  };

  // Provision User API Call
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
        throw new Error(result.error || 'Failed to provision user account');
      }

      setMessage({ type: 'success', text: result.message || 'User provisioned successfully!' });
      setFormData({
        first_name: '',
        last_name: '',
        email: '',
        password: '',
        role: 'site_clerk',
        site_location: 'Debete Mine'
      });
      setIsProvisionModalOpen(false);
      fetchUsers();
    } catch (err) {
      setMessage({ type: 'error', text: err.message });
    } finally {
      setSubmitting(false);
    }
  };

  // Dynamic Role Update Direct to Supabase
  const handleRoleChange = async (userId, newRole) => {
    setUpdatingRoleId(userId);
    try {
      const { error } = await supabase
        .from('profiles')
        .update({ role: newRole })
        .eq('id', userId);

      if (error) throw error;

      setUsers((prev) =>
        prev.map((u) => (u.id === userId ? { ...u, role: newRole } : u))
      );
      setMessage({ type: 'success', text: 'User role updated successfully.' });
    } catch (err) {
      setMessage({ type: 'error', text: err.message || 'Failed to update role' });
    } finally {
      setUpdatingRoleId(null);
    }
  };

  // Filter Logic
  const filteredUsers = users.filter((u) => {
    const fullName = `${u.first_name || ''} ${u.last_name || ''}`.toLowerCase();
    const email = (u.email || '').toLowerCase();
    const query = searchQuery.toLowerCase();
    const matchesSearch = fullName.includes(query) || email.includes(query);
    const matchesRole = roleFilter === 'ALL' || u.role === roleFilter;

    return matchesSearch && matchesRole;
  });

  // Calculate System Counts
  const totalUsers = users.length;
  const siteClerksCount = users.filter((u) => u.role === 'site_clerk').length;
  const adminCount = users.filter((u) => u.role === 'admin').length;
  const managementCount = users.filter((u) => ['hr', 'accountant', 'ceo'].includes(u.role)).length;

  return (
    <div className="min-h-screen bg-slate-100 text-slate-900 flex flex-col lg:flex-row font-sans">
      {/* 1. Modular Sidebar */}
      <AdminSideNav />

      {/* 2. Main Work Area (Sits in between Sidebar & Navbar) */}
      <main className="flex-1 p-4 sm:p-6 lg:p-8 space-y-6 overflow-x-hidden">
        
        {/* 3. Modular Top Navbar Header */}
        <AdminNavbar title="User Provisioning & Access Control" />

        {/* Global Toast Notification */}
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

        {/* Metrics Row */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-white border border-slate-200 p-5 rounded-2xl flex items-center justify-between shadow-xs">
            <div>
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Total Accounts</p>
              <p className="text-2xl font-bold text-slate-900 mt-1">{totalUsers}</p>
            </div>
            <div className="p-3 bg-indigo-50 border border-indigo-100 rounded-xl text-indigo-600">
              <Users className="w-5 h-5" />
            </div>
          </div>

          <div className="bg-white border border-slate-200 p-5 rounded-2xl flex items-center justify-between shadow-xs">
            <div>
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Site Clerks</p>
              <p className="text-2xl font-bold text-slate-900 mt-1">{siteClerksCount}</p>
            </div>
            <div className="p-3 bg-sky-50 border border-sky-100 rounded-xl text-sky-600">
              <UserCheck className="w-5 h-5" />
            </div>
          </div>

          <div className="bg-white border border-slate-200 p-5 rounded-2xl flex items-center justify-between shadow-xs">
            <div>
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Management & Execs</p>
              <p className="text-2xl font-bold text-slate-900 mt-1">{managementCount}</p>
            </div>
            <div className="p-3 bg-emerald-50 border border-emerald-100 rounded-xl text-emerald-600">
              <Building2 className="w-5 h-5" />
            </div>
          </div>

          <div className="bg-white border border-slate-200 p-5 rounded-2xl flex items-center justify-between shadow-xs">
            <div>
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">System Admins</p>
              <p className="text-2xl font-bold text-amber-600 mt-1">{adminCount}</p>
            </div>
            <div className="p-3 bg-amber-50 border border-amber-100 rounded-xl text-amber-600">
              <ShieldCheck className="w-5 h-5" />
            </div>
          </div>
        </div>

        {/* Directory Card & Action Bar */}
        <div className="bg-white p-5 sm:p-6 rounded-2xl border border-slate-200 space-y-4 shadow-xs">
          
          {/* Action Header */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 pb-4">
            <div>
              <h2 className="font-bold text-slate-900 text-base">Provisioned System Users</h2>
              <p className="text-[11px] text-slate-500 font-medium">Manage corporate identities, assign privileges, and inspect accounts</p>
            </div>

            <div className="flex flex-wrap items-center gap-2.5">
              {/* Search Bar */}
              <div className="relative">
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search user name or email..."
                  className="pl-8 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 outline-none focus:border-indigo-600 focus:bg-white transition"
                />
                <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-3" />
              </div>

              {/* Role Filter */}
              <select
                value={roleFilter}
                onChange={(e) => setRoleFilter(e.target.value)}
                className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-700 font-semibold outline-none focus:border-indigo-600 cursor-pointer"
              >
                <option value="ALL">All Roles</option>
                <option value="site_clerk">Site Clerks</option>
                <option value="hr">HR Managers</option>
                <option value="accountant">Accountants</option>
                <option value="ceo">CEOs</option>
                <option value="admin">Admins</option>
              </select>

              {/* Data Refresh */}
              <button
                onClick={fetchUsers}
                className="p-2 text-slate-600 hover:text-indigo-600 rounded-xl transition bg-slate-50 hover:bg-slate-100 border border-slate-200"
                title="Refresh Table Data"
              >
                <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin text-indigo-600' : ''}`} />
              </button>

              {/* Open Provision User Modal Trigger */}
              <button
                onClick={() => setIsProvisionModalOpen(true)}
                className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold px-4 py-2 rounded-xl transition shadow-sm shadow-indigo-600/20"
              >
                <UserPlus className="w-4 h-4" />
                <span>Provision User</span>
              </button>
            </div>
          </div>

          {/* Desktop Table */}
          <div className="hidden sm:block overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-500 font-bold border-b border-slate-200 uppercase tracking-wider">
                <tr>
                  <th className="py-3.5 px-3">Full Name</th>
                  <th className="py-3.5 px-3">Email Address</th>
                  <th className="py-3.5 px-3">Role</th>
                  <th className="py-3.5 px-3">Site Location</th>
                  <th className="py-3.5 px-3">Provisioned Date</th>
                  <th className="py-3.5 px-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredUsers.length === 0 ? (
                  <tr>
                    <td colSpan="6" className="py-8 text-center text-slate-400 font-medium">
                      {loading ? 'Fetching records...' : 'No users found matching criteria.'}
                    </td>
                  </tr>
                ) : (
                  filteredUsers.map((user) => (
                    <tr key={user.id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="py-3.5 px-3 font-semibold text-slate-900">
                        {user.first_name || user.last_name
                          ? `${user.first_name || ''} ${user.last_name || ''}`.trim()
                          : 'Unnamed Employee'}
                      </td>
                      <td className="py-3.5 px-3 text-slate-600">{user.email}</td>
                      <td className="py-3.5 px-3">
                        <div className="relative inline-block">
                          <select
                            value={user.role}
                            disabled={updatingRoleId === user.id}
                            onChange={(e) => handleRoleChange(user.id, e.target.value)}
                            className="text-[10px] font-extrabold px-2.5 py-1 rounded-lg uppercase border bg-indigo-50/60 border-indigo-200 text-indigo-700 appearance-none pr-6 cursor-pointer focus:outline-none focus:ring-1 focus:ring-indigo-500"
                          >
                            <option value="site_clerk">Site Clerk</option>
                            <option value="hr">HR Manager</option>
                            <option value="accountant">Accountant</option>
                            <option value="ceo">CEO</option>
                            <option value="admin">Admin</option>
                          </select>
                          <ChevronDown className="w-3 h-3 absolute right-1.5 top-2 pointer-events-none text-indigo-500" />
                        </div>
                      </td>
                      <td className="py-3.5 px-3 text-slate-500 font-medium">
                        {user.site_location || 'Headquarters'}
                      </td>
                      <td className="py-3.5 px-3 text-slate-500 font-medium">
                        {user.created_at ? new Date(user.created_at).toLocaleDateString() : 'System Default'}
                      </td>
                      <td className="py-3.5 px-3 text-right">
                        <button
                          onClick={() => setSelectedProfile(user)}
                          className="p-1.5 text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition"
                          title="Inspect Profile"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* Mobile View */}
          <div className="sm:hidden space-y-3">
            {filteredUsers.length === 0 ? (
              <div className="p-6 text-center text-slate-400 text-xs font-medium">No records found.</div>
            ) : (
              filteredUsers.map((user) => (
                <div key={user.id} className="p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-slate-900 text-xs">
                      {user.first_name || user.last_name
                        ? `${user.first_name || ''} ${user.last_name || ''}`.trim()
                        : 'Unnamed Employee'}
                    </span>
                    <button
                      onClick={() => setSelectedProfile(user)}
                      className="p-1.5 text-slate-500 hover:text-indigo-600 rounded-lg bg-white border border-slate-200"
                    >
                      <Eye className="w-4 h-4" />
                    </button>
                  </div>
                  
                  <div className="text-xs text-slate-600 truncate">{user.email}</div>
                  
                  <div className="flex items-center justify-between pt-2 border-t border-slate-200">
                    <select
                      value={user.role}
                      disabled={updatingRoleId === user.id}
                      onChange={(e) => handleRoleChange(user.id, e.target.value)}
                      className="text-[10px] font-bold px-2 py-1 rounded bg-white border border-slate-200 text-indigo-600 uppercase"
                    >
                      <option value="site_clerk">Site Clerk</option>
                      <option value="hr">HR Manager</option>
                      <option value="accountant">Accountant</option>
                      <option value="ceo">CEO</option>
                      <option value="admin">Admin</option>
                    </select>
                    <span className="text-[11px] font-semibold text-slate-500">{user.site_location || 'Headquarters'}</span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </main>

      {/* Modal 1: Provision New User Modal */}
      {isProvisionModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white border border-slate-200 rounded-2xl w-full max-w-lg p-6 space-y-5 shadow-2xl relative my-8 animate-in fade-in zoom-in duration-150">
            
            <button
              onClick={() => setIsProvisionModalOpen(false)}
              className="absolute top-4 right-4 p-1.5 text-slate-400 hover:text-slate-700 rounded-lg hover:bg-slate-100 transition"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center gap-3 border-b border-slate-200 pb-4">
              <div className="p-2.5 bg-indigo-50 border border-indigo-100 rounded-xl text-indigo-600">
                <UserPlus className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-900">Provision Employee Credentials</h3>
                <p className="text-xs text-slate-500">Create login credentials and set system roles</p>
              </div>
            </div>

            <form onSubmit={handleCreateUser} className="space-y-4 text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-700 font-semibold mb-1">First Name</label>
                  <input
                    type="text"
                    required
                    value={formData.first_name}
                    onChange={(e) => setFormData({ ...formData, first_name: e.target.value })}
                    className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:border-indigo-600 focus:bg-white text-slate-900 transition"
                    placeholder="e.g. Lorato"
                  />
                </div>
                <div>
                  <label className="block text-slate-700 font-semibold mb-1">Last Name</label>
                  <input
                    type="text"
                    required
                    value={formData.last_name}
                    onChange={(e) => setFormData({ ...formData, last_name: e.target.value })}
                    className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:border-indigo-600 focus:bg-white text-slate-900 transition"
                    placeholder="e.g. Molefe"
                  />
                </div>
              </div>

              <div>
                <label className="block text-slate-700 font-semibold mb-1">Company Email</label>
                <input
                  type="email"
                  required
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:border-indigo-600 focus:bg-white text-slate-900 transition"
                  placeholder="e.g. l.molefe@periscope.co.bw"
                />
              </div>

              <div>
                <label className="block text-slate-700 font-semibold mb-1">Temporary Password</label>
                <div className="relative">
                  <input
                    type="password"
                    required
                    minLength={6}
                    value={formData.password}
                    onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                    className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:border-indigo-600 focus:bg-white text-slate-900 pr-9 transition"
                    placeholder="••••••••"
                  />
                  <Lock className="w-4 h-4 text-slate-400 absolute right-3 top-2.5 pointer-events-none" />
                </div>
              </div>

              <div>
                <label className="block text-slate-700 font-semibold mb-1">Assign Role Privilege</label>
                <select
                  value={formData.role}
                  onChange={(e) => setFormData({ ...formData, role: e.target.value })}
                  className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:border-indigo-600 focus:bg-white text-slate-900 transition font-medium"
                >
                  <option value="site_clerk">Site Clerk (Shift Logger)</option>
                  <option value="hr">HR Manager (Personnel)</option>
                  <option value="accountant">Accountant (Disbursements)</option>
                  <option value="ceo">CEO / Executive</option>
                  <option value="admin">System Admin</option>
                </select>
              </div>

              <div>
                <label className="block text-slate-700 font-semibold mb-1">Assigned Jurisdiction / Location</label>
                <input
                  type="text"
                  value={formData.site_location}
                  onChange={(e) => setFormData({ ...formData, site_location: e.target.value })}
                  className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:border-indigo-600 focus:bg-white text-slate-900 transition"
                  placeholder="e.g. Debete Mine"
                />
              </div>

              <div className="pt-2 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setIsProvisionModalOpen(false)}
                  className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold rounded-xl transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold rounded-xl transition flex items-center gap-2 shadow-md shadow-indigo-600/20 disabled:opacity-50"
                >
                  {submitting ? <RefreshCw className="w-4 h-4 animate-spin" /> : <UserPlus className="w-4 h-4" />}
                  <span>Provision Identity</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal 2: Inspect Staff Profile Modal */}
      {selectedProfile && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white border border-slate-200 rounded-2xl w-full max-w-md p-6 space-y-5 shadow-2xl relative animate-in fade-in zoom-in duration-150">
            <button
              onClick={() => setSelectedProfile(null)}
              className="absolute top-4 right-4 p-1.5 text-slate-400 hover:text-slate-700 rounded-lg hover:bg-slate-100 transition"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center space-x-3.5">
              <div className="w-12 h-12 rounded-xl bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-600 font-bold text-lg">
                <User className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-900">
                  {selectedProfile.first_name} {selectedProfile.last_name}
                </h3>
                <span className="text-[10px] font-extrabold px-2.5 py-0.5 rounded-full uppercase bg-indigo-50 text-indigo-700 border border-indigo-100">
                  {selectedProfile.role}
                </span>
              </div>
            </div>

            <div className="space-y-3 bg-slate-50 p-4 rounded-xl border border-slate-200 text-xs">
              <div className="flex justify-between py-1.5 border-b border-slate-200">
                <span className="text-slate-500 font-medium">Employee UUID</span>
                <span className="font-mono text-slate-800 font-semibold text-[11px] truncate max-w-[180px]">
                  {selectedProfile.id}
                </span>
              </div>
              <div className="flex justify-between py-1.5 border-b border-slate-200">
                <span className="text-slate-500 font-medium">Email Address</span>
                <span className="text-slate-900 font-semibold">{selectedProfile.email}</span>
              </div>
              <div className="flex justify-between py-1.5 border-b border-slate-200">
                <span className="text-slate-500 font-medium">Assigned Location</span>
                <span className="text-slate-900 font-semibold">{selectedProfile.site_location || 'Headquarters'}</span>
              </div>
              <div className="flex justify-between py-1.5">
                <span className="text-slate-500 font-medium">Provision Date</span>
                <span className="text-slate-900 font-semibold">
                  {selectedProfile.created_at ? new Date(selectedProfile.created_at).toLocaleDateString() : 'N/A'}
                </span>
              </div>
            </div>

            <button
              onClick={() => setSelectedProfile(null)}
              className="w-full py-2.5 bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold rounded-xl transition shadow-xs"
            >
              Close Record Inspector
            </button>
          </div>
        </div>
      )}
    </div>
  );
}