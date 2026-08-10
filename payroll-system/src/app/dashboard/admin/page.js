'use client';

import { useState, useEffect } from 'react';
import {
  UserPlus,
  Shield,
  Users,
  RefreshCw,
  CheckCircle2,
  AlertCircle,
  Lock,
  Building2,
  LogOut,
  User,
  Eye,
  X,
  Menu,
  ChevronDown,
  LayoutDashboard,
  Clock,
  KeyRound,
  FileText,
  Search,
  Activity,
  ShieldCheck,
  MapPin,
  TrendingUp
} from 'lucide-react';
import { supabase } from '@/lib/supabase';

export default function AdminDashboardPage() {
  const [users, setUsers] = useState([]);
  const [currentAdmin, setCurrentAdmin] = useState(null);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [updatingRoleId, setUpdatingRoleId] = useState(null);
  const [message, setMessage] = useState({ type: '', text: '' });
  const [selectedProfile, setSelectedProfile] = useState(null);
  const [activeTab, setActiveTab] = useState('dashboard');
  const [searchQuery, setSearchQuery] = useState('');
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const [formData, setFormData] = useState({
    first_name: '',
    last_name: '',
    email: '',
    password: '',
    role: 'site_clerk',
    site_location: 'Debete Mine'
  });

  useEffect(() => {
    fetchCurrentAdmin();
    fetchUsers();
  }, []);

  const fetchCurrentAdmin = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      const { data: profile } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single();
      setCurrentAdmin(profile || { email: user.email, role: 'admin' });
    }
  };

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

  const handleLogout = async () => {
    await supabase.auth.signOut();
    window.location.href = '/login';
  };

  const filteredUsers = users.filter((u) => {
    const fullName = `${u.first_name || ''} ${u.last_name || ''}`.toLowerCase();
    const email = (u.email || '').toLowerCase();
    const query = searchQuery.toLowerCase();
    return fullName.includes(query) || email.includes(query);
  });

  // Calculate System Admin Stats
  const totalUsers = users.length;
  const totalAdmins = users.filter((u) => u.role === 'admin').length;
  const siteLocations = new Set(users.map((u) => u.site_location || 'Main Office')).size;

  const renderNavLinks = () => (
    <nav className="space-y-1">
      <button
        onClick={() => { setActiveTab('dashboard'); setMobileMenuOpen(false); }}
        className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl font-medium text-xs transition ${
          activeTab === 'dashboard'
            ? 'bg-amber-500 text-slate-950 font-bold shadow-lg shadow-amber-500/20'
            : 'text-slate-300 hover:bg-slate-800/60 hover:text-white'
        }`}
      >
        <LayoutDashboard className="w-4 h-4" />
        <span>Dashboard</span>
      </button>

      <button
        onClick={() => { setActiveTab('employees'); setMobileMenuOpen(false); }}
        className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl font-medium text-xs transition ${
          activeTab === 'employees'
            ? 'bg-amber-500 text-slate-950 font-bold shadow-lg shadow-amber-500/20'
            : 'text-slate-300 hover:bg-slate-800/60 hover:text-white'
        }`}
      >
        <Users className="w-4 h-4" />
        <span>Employees & Staff</span>
      </button>

      <button
        onClick={() => { setActiveTab('roles'); setMobileMenuOpen(false); }}
        className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl font-medium text-xs transition ${
          activeTab === 'roles'
            ? 'bg-amber-500 text-slate-950 font-bold shadow-lg shadow-amber-500/20'
            : 'text-slate-300 hover:bg-slate-800/60 hover:text-white'
        }`}
      >
        <KeyRound className="w-4 h-4" />
        <span>Role Permissions</span>
      </button>

      <button
        onClick={() => { setActiveTab('shifts'); setMobileMenuOpen(false); }}
        className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl font-medium text-xs transition ${
          activeTab === 'shifts'
            ? 'bg-amber-500 text-slate-950 font-bold shadow-lg shadow-amber-500/20'
            : 'text-slate-300 hover:bg-slate-800/60 hover:text-white'
        }`}
      >
        <Clock className="w-4 h-4" />
        <span>Shift Approvals Oversight</span>
      </button>

      <button
        onClick={() => { setActiveTab('audit'); setMobileMenuOpen(false); }}
        className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl font-medium text-xs transition ${
          activeTab === 'audit'
            ? 'bg-amber-500 text-slate-950 font-bold shadow-lg shadow-amber-500/20'
            : 'text-slate-300 hover:bg-slate-800/60 hover:text-white'
        }`}
      >
        <FileText className="w-4 h-4" />
        <span>System Audit Logs</span>
      </button>
    </nav>
  );

  return (
    <div className="min-h-screen bg-[#0B0F17] text-white flex flex-col lg:flex-row">
      {/* Mobile Top Navigation Header */}
      <div className="lg:hidden bg-[#0F172A] border-b border-slate-800/80 p-4 flex items-center justify-between sticky top-0 z-40">
        <div className="flex items-center gap-2.5">
          <div className="p-2 rounded-lg bg-amber-500/20 border border-amber-500/30 text-amber-400">
            <Building2 className="w-4 h-4" />
          </div>
          <span className="font-bold text-white text-sm">Periscope Mining</span>
        </div>
        <button
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          className="p-2 text-slate-300 hover:text-white bg-slate-900 border border-slate-800 rounded-lg"
        >
          {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
        </button>
      </div>

      {/* Mobile Sidebar Overlay Drawer */}
      {mobileMenuOpen && (
        <div className="lg:hidden fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex">
          <div className="w-72 bg-[#0F172A] border-r border-slate-800/80 p-5 flex flex-col justify-between h-full">
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="p-2.5 rounded-xl bg-amber-500/20 border border-amber-500/30 text-amber-400">
                    <Building2 className="w-5 h-5" />
                  </div>
                  <div>
                    <h1 className="font-bold text-white text-base leading-none">Periscope</h1>
                    <p className="text-[10px] text-amber-400 font-semibold uppercase tracking-wider mt-1">Admin Portal</p>
                  </div>
                </div>
                <button onClick={() => setMobileMenuOpen(false)} className="text-slate-400 hover:text-white">
                  <X className="w-5 h-5" />
                </button>
              </div>

              {renderNavLinks()}
            </div>

            <div className="pt-4 border-t border-slate-800/80">
              <button
                onClick={handleLogout}
                className="w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-semibold text-rose-400 hover:bg-rose-500/10 transition"
              >
                <LogOut className="w-4 h-4" />
                <span>Sign Out</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Desktop Sidenav */}
      <aside className="hidden lg:flex w-64 bg-[#0F172A] border-r border-slate-800/80 p-4 flex-col justify-between shrink-0 sticky top-0 h-screen">
        <div className="space-y-6">
          <div className="flex items-center gap-3 px-2 pt-2">
            <div className="p-2.5 rounded-xl bg-amber-500/20 border border-amber-500/30 text-amber-400">
              <Building2 className="w-5 h-5" />
            </div>
            <div>
              <h1 className="font-bold text-white text-base leading-none">Periscope Mining</h1>
              <p className="text-[10px] text-amber-400 font-semibold uppercase tracking-wider mt-1">Admin Portal</p>
            </div>
          </div>

          {renderNavLinks()}
        </div>

        <div className="pt-4 border-t border-slate-800/80">
          <button
            onClick={handleLogout}
            className="w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-semibold text-rose-400 hover:bg-rose-500/10 transition"
          >
            <LogOut className="w-4 h-4" />
            <span>Sign Out</span>
          </button>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 p-4 sm:p-6 lg:p-8 space-y-6 overflow-x-hidden">
        {/* Top Navbar Header */}
        <header className="bg-[#111827] border border-slate-800 rounded-2xl p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center space-x-3">
            <div className="p-3 rounded-xl bg-indigo-600/20 border border-indigo-500/30 text-indigo-400">
              <Shield className="w-6 h-6 text-amber-400" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="bg-amber-500/20 text-amber-300 border border-amber-500/30 text-[10px] font-bold px-2.5 py-0.5 rounded-full">
                  ADMINISTRATOR CONTROL
                </span>
              </div>
              <h1 className="text-lg sm:text-xl font-bold text-white mt-1">
                {activeTab === 'dashboard' ? 'Admin Statistics & Overview' : 'Staff Management & Provisioning'}
              </h1>
            </div>
          </div>

          <div className="flex items-center space-x-3 bg-[#030712] border border-slate-800 px-3.5 py-2 rounded-xl">
            <div className="w-8 h-8 rounded-lg bg-indigo-600 flex items-center justify-center text-white font-bold text-xs">
              {currentAdmin?.email ? currentAdmin.email[0].toUpperCase() : 'A'}
            </div>
            <div className="text-left">
              <p className="text-xs font-semibold text-white truncate max-w-[140px]">
                {currentAdmin?.first_name ? `${currentAdmin.first_name} ${currentAdmin.last_name}` : currentAdmin?.email || 'Admin'}
              </p>
              <p className="text-[10px] text-emerald-400 flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                Active Administrator
              </p>
            </div>
          </div>
        </header>

        {/* Dashboard View Stats Summary */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-[#111827] border border-slate-800 p-4 rounded-2xl flex items-center justify-between">
            <div>
              <p className="text-xs text-slate-400 font-medium">Provisioned Staff</p>
              <p className="text-xl font-bold text-white mt-1">{totalUsers}</p>
            </div>
            <div className="p-3 bg-indigo-500/10 border border-indigo-500/20 rounded-xl text-indigo-400">
              <Users className="w-5 h-5" />
            </div>
          </div>

          <div className="bg-[#111827] border border-slate-800 p-4 rounded-2xl flex items-center justify-between">
            <div>
              <p className="text-xs text-slate-400 font-medium">System Admins</p>
              <p className="text-xl font-bold text-amber-400 mt-1">{totalAdmins}</p>
            </div>
            <div className="p-3 bg-amber-500/10 border border-amber-500/20 rounded-xl text-amber-400">
              <ShieldCheck className="w-5 h-5" />
            </div>
          </div>

          <div className="bg-[#111827] border border-slate-800 p-4 rounded-2xl flex items-center justify-between">
            <div>
              <p className="text-xs text-slate-400 font-medium">Active Mine Sites</p>
              <p className="text-xl font-bold text-emerald-400 mt-1">{siteLocations}</p>
            </div>
            <div className="p-3 bg-emerald-500/10 border border-emerald-500/20 rounded-xl text-emerald-400">
              <MapPin className="w-5 h-5" />
            </div>
          </div>

          <div className="bg-[#111827] border border-slate-800 p-4 rounded-2xl flex items-center justify-between">
            <div>
              <p className="text-xs text-slate-400 font-medium">System Health</p>
              <p className="text-xl font-bold text-sky-400 mt-1">100% Operational</p>
            </div>
            <div className="p-3 bg-sky-500/10 border border-sky-500/20 rounded-xl text-sky-400">
              <Activity className="w-5 h-5" />
            </div>
          </div>
        </div>

        {/* Dashboard Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Add Employee Form */}
          <div className="bg-[#111827] p-5 sm:p-6 rounded-2xl border border-slate-800 space-y-4">
            <div className="flex items-center gap-2 border-b border-slate-800 pb-3">
              <UserPlus className="w-5 h-5 text-indigo-400 shrink-0" />
              <h2 className="font-bold text-white text-base">Add New Employee</h2>
            </div>

            {message.text && (
              <div
                className={`p-3 rounded-xl text-xs font-medium flex items-start gap-2 ${
                  message.type === 'success'
                    ? 'bg-emerald-500/10 text-emerald-300 border border-emerald-500/30'
                    : 'bg-rose-500/10 text-rose-300 border border-rose-500/30'
                }`}
              >
                {message.type === 'success' ? (
                  <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5" />
                ) : (
                  <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                )}
                <span>{message.text}</span>
              </div>
            )}

            <form onSubmit={handleCreateUser} className="space-y-3 text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-400 mb-1 font-medium">First Name</label>
                  <input
                    type="text"
                    required
                    value={formData.first_name}
                    onChange={(e) => setFormData({ ...formData, first_name: e.target.value })}
                    className="w-full px-3 py-2.5 bg-[#030712] border border-slate-800 rounded-xl outline-none focus:border-indigo-500 text-white"
                    placeholder="e.g. Lorato"
                  />
                </div>
                <div>
                  <label className="block text-slate-400 mb-1 font-medium">Last Name</label>
                  <input
                    type="text"
                    required
                    value={formData.last_name}
                    onChange={(e) => setFormData({ ...formData, last_name: e.target.value })}
                    className="w-full px-3 py-2.5 bg-[#030712] border border-slate-800 rounded-xl outline-none focus:border-indigo-500 text-white"
                    placeholder="e.g. Molefe"
                  />
                </div>
              </div>

              <div>
                <label className="block text-slate-400 mb-1 font-medium">Company Email</label>
                <input
                  type="email"
                  required
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  className="w-full px-3 py-2.5 bg-[#030712] border border-slate-800 rounded-xl outline-none focus:border-indigo-500 text-white"
                  placeholder="e.g. l.molefe@periscope.co.bw"
                />
              </div>

              <div>
                <label className="block text-slate-400 mb-1 font-medium">Temporary Password</label>
                <div className="relative">
                  <input
                    type="password"
                    required
                    minLength={6}
                    value={formData.password}
                    onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                    className="w-full px-3 py-2.5 bg-[#030712] border border-slate-800 rounded-xl outline-none focus:border-indigo-500 text-white pr-9"
                    placeholder="••••••••"
                  />
                  <Lock className="w-4 h-4 text-slate-500 absolute right-3 top-2.5" />
                </div>
              </div>

              <div>
                <label className="block text-slate-400 mb-1 font-medium">Assign Role</label>
                <select
                  value={formData.role}
                  onChange={(e) => setFormData({ ...formData, role: e.target.value })}
                  className="w-full px-3 py-2.5 bg-[#030712] border border-slate-800 rounded-xl outline-none focus:border-indigo-500 text-white"
                >
                  <option value="site_clerk">Site Clerk (Shift Logger)</option>
                  <option value="hr">HR Manager (Personnel)</option>
                  <option value="accountant">Accountant (Disbursements)</option>
                  <option value="ceo">CEO / Executive</option>
                  <option value="admin">System Admin</option>
                </select>
              </div>

              <div>
                <label className="block text-slate-400 mb-1 font-medium">Site Location</label>
                <input
                  type="text"
                  value={formData.site_location}
                  onChange={(e) => setFormData({ ...formData, site_location: e.target.value })}
                  className="w-full px-3 py-2.5 bg-[#030712] border border-slate-800 rounded-xl outline-none focus:border-indigo-500 text-white"
                />
              </div>

              <button
                type="submit"
                disabled={submitting}
                className="w-full py-3 bg-indigo-600 hover:bg-indigo-500 text-white font-semibold rounded-xl transition flex items-center justify-center gap-2 mt-2 shadow-lg shadow-indigo-600/20"
              >
                {submitting ? <RefreshCw className="w-4 h-4 animate-spin" /> : <UserPlus className="w-4 h-4" />}
                <span>Provision Employee Account</span>
              </button>
            </form>
          </div>

          {/* Employee Directory */}
          <div className="lg:col-span-2 bg-[#111827] p-5 sm:p-6 rounded-2xl border border-slate-800 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <Users className="w-5 h-5 text-indigo-400 shrink-0" />
                <h2 className="font-bold text-white text-base">Employee Directory ({filteredUsers.length})</h2>
              </div>

              {/* Search + Refresh */}
              <div className="flex items-center gap-2">
                <div className="relative">
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search staff..."
                    className="pl-8 pr-3 py-1.5 bg-[#030712] border border-slate-800 rounded-lg text-xs text-white outline-none focus:border-indigo-500"
                  />
                  <Search className="w-3.5 h-3.5 text-slate-500 absolute left-2.5 top-2" />
                </div>
                <button
                  onClick={fetchUsers}
                  className="p-2 text-slate-400 hover:text-white rounded-lg transition bg-[#030712] border border-slate-800"
                  title="Refresh Employee List"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
                </button>
              </div>
            </div>

            {/* Desktop Table View */}
            <div className="hidden sm:block overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-[#030712] text-slate-400 font-semibold border-b border-slate-800">
                  <tr>
                    <th className="py-3 px-3">Employee Name</th>
                    <th className="py-3 px-3">Email Address</th>
                    <th className="py-3 px-3">Role</th>
                    <th className="py-3 px-3">Site Location</th>
                    <th className="py-3 px-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60">
                  {filteredUsers.map((user) => (
                    <tr key={user.id} className="hover:bg-slate-800/30 transition-colors">
                      <td className="py-3 px-3 font-semibold text-white">
                        {user.first_name || user.last_name ? `${user.first_name || ''} ${user.last_name || ''}` : 'Unnamed Employee'}
                      </td>
                      <td className="py-3 px-3 text-slate-300">{user.email}</td>
                      <td className="py-3 px-3">
                        <div className="relative inline-block">
                          <select
                            value={user.role}
                            disabled={updatingRoleId === user.id}
                            onChange={(e) => handleRoleChange(user.id, e.target.value)}
                            className="text-[10px] font-bold px-2.5 py-1 rounded-md uppercase border bg-[#030712] border-indigo-500/30 text-indigo-300 appearance-none pr-6 cursor-pointer focus:outline-none"
                          >
                            <option value="site_clerk">Site Clerk</option>
                            <option value="hr">HR Manager</option>
                            <option value="accountant">Accountant</option>
                            <option value="ceo">CEO</option>
                            <option value="admin">Admin</option>
                          </select>
                          <ChevronDown className="w-3 h-3 absolute right-1.5 top-2 pointer-events-none text-slate-400" />
                        </div>
                      </td>
                      <td className="py-3 px-3 text-slate-400">{user.site_location || 'Main Office'}</td>
                      <td className="py-3 px-3 text-right">
                        <button
                          onClick={() => setSelectedProfile(user)}
                          className="p-1.5 text-indigo-400 hover:text-indigo-300 hover:bg-indigo-500/10 rounded-lg transition"
                          title="View Profile Details"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Mobile View */}
            <div className="sm:hidden space-y-3">
              {filteredUsers.map((user) => (
                <div key={user.id} className="p-3.5 bg-[#030712] rounded-xl border border-slate-800 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-white text-xs">
                      {user.first_name || user.last_name ? `${user.first_name || ''} ${user.last_name || ''}` : 'Unnamed User'}
                    </span>
                    <button onClick={() => setSelectedProfile(user)} className="p-1 text-indigo-400">
                      <Eye className="w-4 h-4" />
                    </button>
                  </div>
                  <div className="text-xs text-slate-400 break-all">{user.email}</div>
                  <div className="flex items-center justify-between pt-1">
                    <select
                      value={user.role}
                      disabled={updatingRoleId === user.id}
                      onChange={(e) => handleRoleChange(user.id, e.target.value)}
                      className="text-[10px] font-bold px-2 py-0.5 rounded bg-[#111827] border border-indigo-500/30 text-indigo-300 uppercase"
                    >
                      <option value="site_clerk">Site Clerk</option>
                      <option value="hr">HR Manager</option>
                      <option value="accountant">Accountant</option>
                      <option value="ceo">CEO</option>
                      <option value="admin">Admin</option>
                    </select>
                    <span className="text-[11px] text-slate-400">{user.site_location || 'Main Office'}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </main>

      {/* Profile Detail Modal */}
      {selectedProfile && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#111827] border border-slate-800 rounded-2xl w-full max-w-md p-6 space-y-5 shadow-2xl relative">
            <button
              onClick={() => setSelectedProfile(null)}
              className="absolute top-4 right-4 p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center space-x-3">
              <div className="w-12 h-12 rounded-xl bg-indigo-600/20 border border-indigo-500/30 flex items-center justify-center text-indigo-400 font-bold text-lg">
                <User className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-base font-bold text-white">
                  {selectedProfile.first_name} {selectedProfile.last_name}
                </h3>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded uppercase bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                  {selectedProfile.role}
                </span>
              </div>
            </div>

            <div className="space-y-3 bg-[#030712] p-4 rounded-xl border border-slate-800 text-xs">
              <div className="flex justify-between py-1 border-b border-slate-800">
                <span className="text-slate-400">Employee ID</span>
                <span className="font-mono text-slate-200 text-[11px] truncate max-w-[180px]">{selectedProfile.id}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-800">
                <span className="text-slate-400">Email</span>
                <span className="text-slate-200">{selectedProfile.email}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-800">
                <span className="text-slate-400">Site Location</span>
                <span className="text-slate-200">{selectedProfile.site_location || 'Not Specified'}</span>
              </div>
              <div className="flex justify-between py-1">
                <span className="text-slate-400">Date Provisioned</span>
                <span className="text-slate-200">
                  {selectedProfile.created_at ? new Date(selectedProfile.created_at).toLocaleDateString() : 'N/A'}
                </span>
              </div>
            </div>

            <button
              onClick={() => setSelectedProfile(null)}
              className="w-full py-2.5 bg-slate-800 hover:bg-slate-700 text-white text-xs font-semibold rounded-xl transition"
            >
              Close Record
            </button>
          </div>
        </div>
      )}
    </div>
  );
}