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
  Activity,
  ShieldCheck,
  MapPin,
  Mail,
  Building2,
  Calendar,
  Filter
} from 'lucide-react';
import { supabase } from '@/lib/supabase';
import AdminNavbar from '@/components/admin/AdminNavbar';
import AdminSideNav from '@/components/admin/AdminSideNav';

export default function AdminDashboardPage() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [updatingRoleId, setUpdatingRoleId] = useState(null);
  const [message, setMessage] = useState({ type: '', text: '' });
  const [selectedProfile, setSelectedProfile] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [roleFilter, setRoleFilter] = useState('ALL');

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

  const filteredUsers = users.filter((u) => {
    const fullName = `${u.first_name || ''} ${u.last_name || ''}`.toLowerCase();
    const email = (u.email || '').toLowerCase();
    const query = searchQuery.toLowerCase();
    const matchesSearch = fullName.includes(query) || email.includes(query);
    const matchesRole = roleFilter === 'ALL' || u.role === roleFilter;

    return matchesSearch && matchesRole;
  });

  // Live Statistics Calculations
  const totalUsers = users.length;
  const totalAdmins = users.filter((u) => u.role === 'admin').length;
  const siteLocations = new Set(users.map((u) => u.site_location || 'Headquarters')).size;

  return (
    <div className="min-h-screen bg-slate-100 text-slate-900 flex flex-col lg:flex-row font-sans">
      {/* Shared Modular Side Navigation */}
      <AdminSideNav />

      {/* Main Content Area */}
      <main className="flex-1 p-4 sm:p-6 lg:p-8 space-y-6 overflow-x-hidden">
        {/* Shared Modular Top Navbar */}
        <AdminNavbar title="Admin Statistics & System Overview" />

        {/* Key Metrics / Overview Cards Row */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          
          {/* Card 1: Total Staff */}
          <div className="bg-white border border-slate-200 p-5 rounded-2xl flex items-center justify-between shadow-xs">
            <div>
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Provisioned Staff</p>
              <p className="text-2xl font-bold text-slate-900 mt-1">{totalUsers}</p>
            </div>
            <div className="p-3 bg-indigo-50 border border-indigo-100 rounded-xl text-indigo-600">
              <Users className="w-5 h-5" />
            </div>
          </div>

          {/* Card 2: System Admins */}
          <div className="bg-white border border-slate-200 p-5 rounded-2xl flex items-center justify-between shadow-xs">
            <div>
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">System Admins</p>
              <p className="text-2xl font-bold text-amber-600 mt-1">{totalAdmins}</p>
            </div>
            <div className="p-3 bg-amber-50 border border-amber-100 rounded-xl text-amber-600">
              <ShieldCheck className="w-5 h-5" />
            </div>
          </div>

          {/* Card 3: Active Sites */}
          <div className="bg-white border border-slate-200 p-5 rounded-2xl flex items-center justify-between shadow-xs">
            <div>
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Active Locations</p>
              <p className="text-2xl font-bold text-emerald-600 mt-1">{siteLocations}</p>
            </div>
            <div className="p-3 bg-emerald-50 border border-emerald-100 rounded-xl text-emerald-600">
              <MapPin className="w-5 h-5" />
            </div>
          </div>

          {/* Card 4: System Health */}
          <div className="bg-white border border-slate-200 p-5 rounded-2xl flex items-center justify-between shadow-xs">
            <div>
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">System Status</p>
              <p className="text-2xl font-bold text-sky-600 mt-1">100% Active</p>
            </div>
            <div className="p-3 bg-sky-50 border border-sky-100 rounded-xl text-sky-600">
              <Activity className="w-5 h-5 animate-pulse" />
            </div>
          </div>
        </div>

        {/* Main Interface Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          
          {/* Section 1: Provision New User Form */}
          <div className="bg-white p-5 sm:p-6 rounded-2xl border border-slate-200 space-y-5 shadow-xs">
            <div className="flex items-center gap-2.5 border-b border-slate-200 pb-4">
              <div className="p-2 bg-indigo-50 border border-indigo-100 rounded-lg text-indigo-600">
                <UserPlus className="w-4 h-4" />
              </div>
              <h2 className="font-bold text-slate-900 text-base">Provision New Employee</h2>
            </div>

            {/* Success / Error Toast Notification */}
            {message.text && (
              <div
                className={`p-3.5 rounded-xl text-xs font-medium flex items-start gap-2.5 ${
                  message.type === 'success'
                    ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                    : 'bg-rose-50 text-rose-800 border border-rose-200'
                }`}
              >
                {message.type === 'success' ? (
                  <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600 mt-0.5" />
                ) : (
                  <AlertCircle className="w-4 h-4 shrink-0 text-rose-600 mt-0.5" />
                )}
                <span>{message.text}</span>
              </div>
            )}

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
                <label className="block text-slate-700 font-semibold mb-1">System Privilege Role</label>
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
                <label className="block text-slate-700 font-semibold mb-1">Mine / Office Location</label>
                <input
                  type="text"
                  value={formData.site_location}
                  onChange={(e) => setFormData({ ...formData, site_location: e.target.value })}
                  className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:border-indigo-600 focus:bg-white text-slate-900 transition"
                  placeholder="e.g. Debete Mine"
                />
              </div>

              <button
                type="submit"
                disabled={submitting}
                className="w-full py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold rounded-xl transition flex items-center justify-center gap-2 mt-3 shadow-md shadow-indigo-600/20 disabled:opacity-50"
              >
                {submitting ? <RefreshCw className="w-4 h-4 animate-spin" /> : <UserPlus className="w-4 h-4" />}
                <span>Provision Employee Account</span>
              </button>
            </form>
          </div>

          {/* Section 2: Employee Management Directory */}
          <div className="lg:col-span-2 bg-white p-5 sm:p-6 rounded-2xl border border-slate-200 space-y-4 shadow-xs">
            
            {/* Header & Controls */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-200 pb-4">
              <div className="flex items-center gap-2.5">
                <div className="p-2 bg-indigo-50 border border-indigo-100 rounded-lg text-indigo-600">
                  <Users className="w-4 h-4" />
                </div>
                <div>
                  <h2 className="font-bold text-slate-900 text-base">Employee Directory</h2>
                  <p className="text-[11px] text-slate-500 font-medium">Managing {filteredUsers.length} active records</p>
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                {/* Search Bar */}
                <div className="relative">
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search name or email..."
                    className="pl-8 pr-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 outline-none focus:border-indigo-600 focus:bg-white transition"
                  />
                  <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2.5" />
                </div>

                {/* Role Filter Dropdown */}
                <select
                  value={roleFilter}
                  onChange={(e) => setRoleFilter(e.target.value)}
                  className="px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-700 font-semibold outline-none focus:border-indigo-600 cursor-pointer"
                >
                  <option value="ALL">All Roles</option>
                  <option value="site_clerk">Site Clerks</option>
                  <option value="hr">HR Managers</option>
                  <option value="accountant">Accountants</option>
                  <option value="ceo">CEOs</option>
                  <option value="admin">Admins</option>
                </select>

                {/* Refresh Trigger */}
                <button
                  onClick={fetchUsers}
                  className="p-2 text-slate-600 hover:text-indigo-600 rounded-xl transition bg-slate-50 hover:bg-slate-100 border border-slate-200"
                  title="Refresh Data"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin text-indigo-600' : ''}`} />
                </button>
              </div>
            </div>

            {/* Desktop Table View */}
            <div className="hidden sm:block overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 text-slate-500 font-bold border-b border-slate-200 uppercase tracking-wider">
                  <tr>
                    <th className="py-3 px-3">Employee Name</th>
                    <th className="py-3 px-3">Email Address</th>
                    <th className="py-3 px-3">Role</th>
                    <th className="py-3 px-3">Location</th>
                    <th className="py-3 px-3 text-right">Details</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredUsers.length === 0 ? (
                    <tr>
                      <td colSpan="5" className="py-8 text-center text-slate-400">
                        No employees found matching your filters.
                      </td>
                    </tr>
                  ) : (
                    filteredUsers.map((user) => (
                      <tr key={user.id} className="hover:bg-slate-50/80 transition-colors">
                        <td className="py-3.5 px-3 font-semibold text-slate-900">
                          {user.first_name || user.last_name ? `${user.first_name || ''} ${user.last_name || ''}` : 'Unnamed Employee'}
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
                        <td className="py-3.5 px-3 text-slate-500 font-medium">{user.site_location || 'Headquarters'}</td>
                        <td className="py-3.5 px-3 text-right">
                          <button
                            onClick={() => setSelectedProfile(user)}
                            className="p-1.5 text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition"
                            title="View Detailed Profile"
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

            {/* Mobile View Cards */}
            <div className="sm:hidden space-y-3">
              {filteredUsers.length === 0 ? (
                <div className="p-6 text-center text-slate-400 text-xs">No records found.</div>
              ) : (
                filteredUsers.map((user) => (
                  <div key={user.id} className="p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-slate-900 text-xs">
                        {user.first_name || user.last_name ? `${user.first_name || ''} ${user.last_name || ''}` : 'Unnamed User'}
                      </span>
                      <button 
                        onClick={() => setSelectedProfile(user)} 
                        className="p-1.5 text-slate-500 hover:text-indigo-600 rounded-lg bg-white border border-slate-200 shadow-2xs"
                      >
                        <Eye className="w-4 h-4" />
                      </button>
                    </div>
                    
                    <div className="text-xs text-slate-600 truncate">{user.email}</div>
                    
                    <div className="flex items-center justify-between pt-1 border-t border-slate-200/80">
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
        </div>
      </main>

      {/* Selected Staff Profile Inspector Modal */}
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
                <span className="text-slate-500 font-medium">Employee ID</span>
                <span className="font-mono text-slate-800 font-semibold text-[11px] truncate max-w-[180px]">
                  {selectedProfile.id}
                </span>
              </div>
              <div className="flex justify-between py-1.5 border-b border-slate-200">
                <span className="text-slate-500 font-medium">Email Address</span>
                <span className="text-slate-900 font-semibold">{selectedProfile.email}</span>
              </div>
              <div className="flex justify-between py-1.5 border-b border-slate-200">
                <span className="text-slate-500 font-medium">Location</span>
                <span className="text-slate-900 font-semibold">{selectedProfile.site_location || 'Headquarters'}</span>
              </div>
              <div className="flex justify-between py-1.5">
                <span className="text-slate-500 font-medium">Provisioned Date</span>
                <span className="text-slate-900 font-semibold">
                  {selectedProfile.created_at ? new Date(selectedProfile.created_at).toLocaleDateString() : 'N/A'}
                </span>
              </div>
            </div>

            <button
              onClick={() => setSelectedProfile(null)}
              className="w-full py-2.5 bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold rounded-xl transition shadow-xs"
            >
              Close Employee Inspector
            </button>
          </div>
        </div>
      )}
    </div>
  );
}