'use client';

import { useEffect, useMemo, useState } from 'react';
import {
  AlertCircle,
  CheckCircle2,
  KeyRound,
  Loader2,
  Plus,
  RefreshCw,
  Search,
  ShieldCheck,
  UserCheck,
  Users,
  X,
} from 'lucide-react';
import AdminNavbar from '@/components/admin/AdminNavbar';
import AdminSideNav from '@/components/admin/AdminSideNav';

const SYSTEM_ROLES = [
  { value: 'site_clerk', label: 'Site Clerk' },
  { value: 'hr', label: 'HR Manager' },
  { value: 'accountant', label: 'Accountant' },
  { value: 'ceo', label: 'CEO / Executive' },
  { value: 'admin', label: 'System Admin' },
];

const EMPTY_FORM = {
  first_name: '',
  last_name: '',
  email: '',
  password: '',
  role: 'site_clerk',
};

function roleLabel(role) {
  return SYSTEM_ROLES.find((item) => item.value === role)?.label || role || 'Unknown';
}

export default function AdminUsersPage() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState('ALL');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);
  const [message, setMessage] = useState({ type: '', text: '' });

  async function fetchUsers() {
    setLoading(true);
    try {
      const response = await fetch('/api/admin/users', { cache: 'no-store' });
      const result = await response.json();

      if (!response.ok || !result.success) {
        throw new Error(result.error || 'Failed to load system users.');
      }

      setUsers(result.data || []);
    } catch (error) {
      setMessage({ type: 'error', text: error.message });
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchUsers();
  }, []);

  function handleNameChange(field, value) {
    setForm((current) => {
      const next = { ...current, [field]: value };
      const first = next.first_name.trim().toLowerCase();
      const last = next.last_name.trim().toLowerCase().replace(/[^a-z0-9]/g, '');

      if (first && last && !current.email.trim()) {
        next.email = `${first[0]}.${last}@periscope.co.bw`;
      }

      return next;
    });
  }

  function generatePassword() {
    const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789!@#$%';
    let value = '';
    for (let i = 0; i < 12; i += 1) {
      value += alphabet[Math.floor(Math.random() * alphabet.length)];
    }
    setForm((current) => ({ ...current, password: value }));
  }

  async function handleCreateUser(event) {
    event.preventDefault();
    setSubmitting(true);
    setMessage({ type: '', text: '' });

    try {
      const response = await fetch('/api/admin/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });

      const result = await response.json();

      if (!response.ok || !result.success) {
        throw new Error(result.error || 'Failed to create system user.');
      }

      setMessage({ type: 'success', text: result.message });
      setForm(EMPTY_FORM);
      setShowCreateModal(false);
      await fetchUsers();
    } catch (error) {
      setMessage({ type: 'error', text: error.message });
    } finally {
      setSubmitting(false);
    }
  }

  const filteredUsers = useMemo(() => {
    const q = search.trim().toLowerCase();

    return users.filter((user) => {
      const name = `${user.first_name || ''} ${user.last_name || ''}`.toLowerCase();
      const email = (user.email || '').toLowerCase();
      const matchesSearch = !q || name.includes(q) || email.includes(q);
      const matchesRole = roleFilter === 'ALL' || user.role === roleFilter;
      return matchesSearch && matchesRole;
    });
  }, [users, search, roleFilter]);

  const activeUsers = users.filter((user) => user.is_active !== false).length;
  const siteClerks = users.filter((user) => user.role === 'site_clerk').length;
  const management = users.filter((user) => ['hr', 'accountant', 'ceo'].includes(user.role)).length;

  return (
    <div className="min-h-screen bg-slate-100 text-slate-900 flex flex-col lg:flex-row">
      <AdminSideNav />

      <main className="flex-1 p-4 sm:p-6 lg:p-8 space-y-6 overflow-x-hidden">
        <AdminNavbar title="System Users" />

        {message.text && (
          <div
            className={`flex items-center justify-between gap-3 rounded-2xl border px-4 py-3 text-sm font-medium ${
              message.type === 'success'
                ? 'border-emerald-200 bg-emerald-50 text-emerald-800'
                : 'border-rose-200 bg-rose-50 text-rose-800'
            }`}
          >
            <div className="flex items-center gap-2">
              {message.type === 'success' ? (
                <CheckCircle2 className="h-4 w-4 shrink-0" />
              ) : (
                <AlertCircle className="h-4 w-4 shrink-0" />
              )}
              <span>{message.text}</span>
            </div>
            <button onClick={() => setMessage({ type: '', text: '' })} aria-label="Dismiss message">
              <X className="h-4 w-4" />
            </button>
          </div>
        )}

        <section className="grid grid-cols-2 xl:grid-cols-4 gap-3 sm:gap-4">
          <MetricCard title="System Users" value={users.length} icon={Users} />
          <MetricCard title="Active Accounts" value={activeUsers} icon={UserCheck} />
          <MetricCard title="Site Clerks" value={siteClerks} icon={ShieldCheck} />
          <MetricCard title="Management" value={management} icon={KeyRound} />
        </section>

        <section className="rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden">
          <div className="p-5 sm:p-6 border-b border-slate-200 flex flex-col xl:flex-row xl:items-center justify-between gap-4">
            <div>
              <h1 className="text-lg font-bold text-slate-950">Provisioned System Users</h1>
              <p className="text-sm text-slate-500 mt-1">
                Login accounts for Admin, Site Clerk, HR, Accountant and CEO roles.
              </p>
            </div>

            <div className="flex flex-col sm:flex-row gap-2">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                <input
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  placeholder="Search users..."
                  className="w-full sm:w-56 pl-9 pr-3 py-2.5 rounded-xl border border-slate-200 bg-slate-50 text-sm outline-none focus:border-indigo-500 focus:bg-white"
                />
              </div>

              <select
                value={roleFilter}
                onChange={(event) => setRoleFilter(event.target.value)}
                className="px-3 py-2.5 rounded-xl border border-slate-200 bg-slate-50 text-sm font-medium outline-none focus:border-indigo-500"
              >
                <option value="ALL">All roles</option>
                {SYSTEM_ROLES.map((role) => (
                  <option key={role.value} value={role.value}>{role.label}</option>
                ))}
              </select>

              <button
                onClick={fetchUsers}
                className="inline-flex items-center justify-center gap-2 px-3 py-2.5 rounded-xl border border-slate-200 bg-white text-sm font-semibold hover:bg-slate-50"
              >
                <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
                Refresh
              </button>

              <button
                onClick={() => setShowCreateModal(true)}
                className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-indigo-600 text-white text-sm font-semibold hover:bg-indigo-700"
              >
                <Plus className="h-4 w-4" />
                Create User
              </button>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full min-w-[760px] text-sm">
              <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
                <tr>
                  <th className="px-5 py-3 text-left">User</th>
                  <th className="px-5 py-3 text-left">Role</th>
                  <th className="px-5 py-3 text-left">Status</th>
                  <th className="px-5 py-3 text-left">Created</th>
                  <th className="px-5 py-3 text-left">Access Management</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {loading ? (
                  <tr>
                    <td colSpan="5" className="px-5 py-12 text-center text-slate-500">
                      <Loader2 className="h-5 w-5 animate-spin inline-block mr-2" /> Loading users...
                    </td>
                  </tr>
                ) : filteredUsers.length === 0 ? (
                  <tr>
                    <td colSpan="5" className="px-5 py-12 text-center text-slate-500">No system users found.</td>
                  </tr>
                ) : (
                  filteredUsers.map((user) => (
                    <tr key={user.id} className="hover:bg-slate-50/70">
                      <td className="px-5 py-4">
                        <div className="font-semibold text-slate-900">
                          {[user.first_name, user.last_name].filter(Boolean).join(' ') || 'Unnamed user'}
                        </div>
                        <div className="text-xs text-slate-500 mt-0.5">{user.email}</div>
                      </td>
                      <td className="px-5 py-4">
                        <span className="inline-flex rounded-full bg-indigo-50 border border-indigo-100 px-2.5 py-1 text-xs font-bold text-indigo-700">
                          {roleLabel(user.role)}
                        </span>
                      </td>
                      <td className="px-5 py-4">
                        <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-bold ${
                          user.is_active === false
                            ? 'bg-slate-100 text-slate-600'
                            : 'bg-emerald-50 text-emerald-700'
                        }`}>
                          {user.is_active === false ? 'Inactive' : 'Active'}
                        </span>
                      </td>
                      <td className="px-5 py-4 text-slate-600">
                        {user.created_at ? new Date(user.created_at).toLocaleDateString() : '—'}
                      </td>
                      <td className="px-5 py-4 text-xs text-slate-400">
                        Role/status/reset controls are the next Admin feature.
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </section>
      </main>

      {showCreateModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/50 backdrop-blur-sm p-4 flex items-center justify-center">
          <div className="w-full max-w-lg rounded-2xl bg-white border border-slate-200 shadow-2xl">
            <div className="p-5 sm:p-6 border-b border-slate-200 flex items-start justify-between gap-4">
              <div>
                <h2 className="text-lg font-bold text-slate-950">Create System User</h2>
                <p className="text-sm text-slate-500 mt-1">
                  Create a login account. Site assignment is managed separately after sites are configured.
                </p>
              </div>
              <button
                onClick={() => setShowCreateModal(false)}
                className="p-2 rounded-lg hover:bg-slate-100 text-slate-500"
                aria-label="Close modal"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleCreateUser} className="p-5 sm:p-6 space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <Field label="First name">
                  <input
                    required
                    value={form.first_name}
                    onChange={(event) => handleNameChange('first_name', event.target.value)}
                    className="input-field"
                    placeholder="Lorato"
                  />
                </Field>
                <Field label="Last name">
                  <input
                    required
                    value={form.last_name}
                    onChange={(event) => handleNameChange('last_name', event.target.value)}
                    className="input-field"
                    placeholder="Molefe"
                  />
                </Field>
              </div>

              <Field label="Company email">
                <input
                  type="email"
                  required
                  value={form.email}
                  onChange={(event) => setForm((current) => ({ ...current, email: event.target.value }))}
                  className="input-field"
                  placeholder="l.molefe@periscope.co.bw"
                />
              </Field>

              <Field label="System role">
                <select
                  value={form.role}
                  onChange={(event) => setForm((current) => ({ ...current, role: event.target.value }))}
                  className="input-field"
                >
                  {SYSTEM_ROLES.map((role) => (
                    <option key={role.value} value={role.value}>{role.label}</option>
                  ))}
                </select>
              </Field>

              <Field label="Temporary password">
                <div className="flex gap-2">
                  <input
                    type="text"
                    required
                    minLength={10}
                    value={form.password}
                    onChange={(event) => setForm((current) => ({ ...current, password: event.target.value }))}
                    className="input-field flex-1 font-mono"
                    placeholder="Minimum 10 characters"
                  />
                  <button
                    type="button"
                    onClick={generatePassword}
                    className="px-3 rounded-xl border border-slate-200 bg-slate-50 text-xs font-bold hover:bg-slate-100"
                  >
                    Generate
                  </button>
                </div>
              </Field>

              <div className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-xs text-amber-800">
                Give the temporary password to the user securely. Password reset/access controls will be added to this same module next.
              </div>

              <div className="pt-2 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="px-4 py-2.5 rounded-xl border border-slate-200 text-sm font-semibold hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-indigo-600 text-white text-sm font-semibold hover:bg-indigo-700 disabled:opacity-60"
                >
                  {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
                  Create User
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <style jsx>{`
        .input-field {
          width: 100%;
          border: 1px solid rgb(226 232 240);
          background: rgb(248 250 252);
          border-radius: 0.75rem;
          padding: 0.65rem 0.75rem;
          font-size: 0.875rem;
          color: rgb(15 23 42);
          outline: none;
        }
        .input-field:focus {
          background: white;
          border-color: rgb(99 102 241);
        }
      `}</style>
    </div>
  );
}

function MetricCard({ title, value, icon: Icon }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4 sm:p-5 shadow-sm flex items-center justify-between gap-3">
      <div>
        <p className="text-[11px] sm:text-xs font-semibold uppercase tracking-wide text-slate-500">{title}</p>
        <p className="text-2xl font-bold text-slate-950 mt-1">{value}</p>
      </div>
      <div className="p-2.5 rounded-xl bg-indigo-50 text-indigo-600 border border-indigo-100">
        <Icon className="h-5 w-5" />
      </div>
    </div>
  );
}

function Field({ label, children }) {
  return (
    <label className="block">
      <span className="block text-xs font-semibold text-slate-700 mb-1.5">{label}</span>
      {children}
    </label>
  );
}
