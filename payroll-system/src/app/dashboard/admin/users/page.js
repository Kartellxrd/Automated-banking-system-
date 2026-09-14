'use client';

import { useEffect, useMemo, useState } from 'react';
import {
  AlertCircle,
  CheckCircle2,
  KeyRound,
  Loader2,
  MoreVertical,
  Plus,
  RefreshCw,
  Search,
  ShieldCheck,
  UserCheck,
  UserCog,
  UserX,
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

const inputClass =
  'w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm text-slate-900 outline-none transition focus:border-indigo-500 focus:bg-white focus:ring-2 focus:ring-indigo-100';

function roleLabel(role) {
  return SYSTEM_ROLES.find((item) => item.value === role)?.label || role || 'Unknown';
}

function fullName(user) {
  return [user?.first_name, user?.last_name].filter(Boolean).join(' ') || 'Unnamed user';
}

export default function AdminUsersPage() {
  const [users, setUsers] = useState([]);
  const [currentUserId, setCurrentUserId] = useState(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [actionLoadingId, setActionLoadingId] = useState(null);
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState('ALL');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [roleTarget, setRoleTarget] = useState(null);
  const [nextRole, setNextRole] = useState('site_clerk');
  const [openMenuId, setOpenMenuId] = useState(null);
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
      setCurrentUserId(result.current_user_id || null);
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

  function openRoleModal(user) {
    setOpenMenuId(null);
    setRoleTarget(user);
    setNextRole(user.role);
  }

  async function handleChangeRole(event) {
    event.preventDefault();
    if (!roleTarget) return;

    setActionLoadingId(roleTarget.id);
    setMessage({ type: '', text: '' });

    try {
      const response = await fetch(`/api/admin/users/${roleTarget.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'change_role', role: nextRole }),
      });
      const result = await response.json();

      if (!response.ok || !result.success) {
        throw new Error(result.error || 'Failed to change role.');
      }

      setMessage({ type: 'success', text: result.message });
      setRoleTarget(null);
      await fetchUsers();
    } catch (error) {
      setMessage({ type: 'error', text: error.message });
    } finally {
      setActionLoadingId(null);
    }
  }

  async function handleToggleActive(user) {
    setOpenMenuId(null);
    const nextActive = user.is_active === false;
    const verb = nextActive ? 'reactivate' : 'deactivate';

    if (!window.confirm(`${verb.charAt(0).toUpperCase() + verb.slice(1)} ${fullName(user)}?`)) {
      return;
    }

    setActionLoadingId(user.id);
    setMessage({ type: '', text: '' });

    try {
      const response = await fetch(`/api/admin/users/${user.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'set_active', is_active: nextActive }),
      });
      const result = await response.json();

      if (!response.ok || !result.success) {
        throw new Error(result.error || `Failed to ${verb} account.`);
      }

      setMessage({ type: 'success', text: result.message });
      await fetchUsers();
    } catch (error) {
      setMessage({ type: 'error', text: error.message });
    } finally {
      setActionLoadingId(null);
    }
  }

  async function handleResetAccess(user) {
    setOpenMenuId(null);

    if (!window.confirm(`Send a password reset email to ${user.email}?`)) {
      return;
    }

    setActionLoadingId(user.id);
    setMessage({ type: '', text: '' });

    try {
      const response = await fetch(`/api/admin/users/${user.id}/reset-access`, {
        method: 'POST',
      });
      const result = await response.json();

      if (!response.ok || !result.success) {
        throw new Error(result.error || 'Failed to send reset email.');
      }

      setMessage({ type: 'success', text: result.message });
      await fetchUsers();
    } catch (error) {
      setMessage({ type: 'error', text: error.message });
    } finally {
      setActionLoadingId(null);
    }
  }

  const filteredUsers = useMemo(() => {
    const q = search.trim().toLowerCase();

    return users.filter((user) => {
      const name = fullName(user).toLowerCase();
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
          <div className={`flex items-center justify-between gap-3 rounded-2xl border px-4 py-3 text-sm font-medium ${
            message.type === 'success'
              ? 'border-emerald-200 bg-emerald-50 text-emerald-800'
              : 'border-rose-200 bg-rose-50 text-rose-800'
          }`}>
            <div className="flex items-center gap-2">
              {message.type === 'success' ? <CheckCircle2 className="h-4 w-4" /> : <AlertCircle className="h-4 w-4" />}
              <span>{message.text}</span>
            </div>
            <button onClick={() => setMessage({ type: '', text: '' })}><X className="h-4 w-4" /></button>
          </div>
        )}

        <section className="grid grid-cols-2 xl:grid-cols-4 gap-3 sm:gap-4">
          <MetricCard title="System Users" value={users.length} icon={Users} />
          <MetricCard title="Active Accounts" value={activeUsers} icon={UserCheck} />
          <MetricCard title="Site Clerks" value={siteClerks} icon={ShieldCheck} />
          <MetricCard title="Management" value={management} icon={KeyRound} />
        </section>

        <section className="rounded-2xl border border-slate-200 bg-white shadow-sm overflow-visible">
          <div className="p-5 sm:p-6 border-b border-slate-200 flex flex-col xl:flex-row xl:items-center justify-between gap-4">
            <div>
              <h1 className="text-lg font-bold text-slate-950">Provisioned System Users</h1>
              <p className="text-sm text-slate-500 mt-1">Create accounts and manage role, status and password recovery.</p>
            </div>

            <div className="flex flex-col sm:flex-row gap-2">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search users..." className={`${inputClass} sm:w-56 pl-9`} />
              </div>

              <select value={roleFilter} onChange={(e) => setRoleFilter(e.target.value)} className={inputClass}>
                <option value="ALL">All roles</option>
                {SYSTEM_ROLES.map((role) => <option key={role.value} value={role.value}>{role.label}</option>)}
              </select>

              <button onClick={fetchUsers} className="inline-flex items-center justify-center gap-2 px-3 py-2.5 rounded-xl border border-slate-200 bg-white text-sm font-semibold hover:bg-slate-50">
                <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} /> Refresh
              </button>

              <button onClick={() => setShowCreateModal(true)} className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-indigo-600 text-white text-sm font-semibold hover:bg-indigo-700">
                <Plus className="h-4 w-4" /> Create User
              </button>
            </div>
          </div>

          <div className="overflow-x-auto overflow-y-visible">
            <table className="w-full min-w-[850px] text-sm">
              <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
                <tr>
                  <th className="px-5 py-3 text-left">User</th>
                  <th className="px-5 py-3 text-left">Role</th>
                  <th className="px-5 py-3 text-left">Status</th>
                  <th className="px-5 py-3 text-left">Created</th>
                  <th className="px-5 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {loading ? (
                  <tr><td colSpan="5" className="px-5 py-12 text-center text-slate-500"><Loader2 className="h-5 w-5 animate-spin inline-block mr-2" />Loading users...</td></tr>
                ) : filteredUsers.length === 0 ? (
                  <tr><td colSpan="5" className="px-5 py-12 text-center text-slate-500">No system users found.</td></tr>
                ) : filteredUsers.map((user) => {
                  const isSelf = user.id === currentUserId;
                  const isBusy = actionLoadingId === user.id;

                  return (
                    <tr key={user.id} className="hover:bg-slate-50/70">
                      <td className="px-5 py-4">
                        <div className="font-semibold text-slate-900">{fullName(user)} {isSelf && <span className="text-[10px] text-indigo-600">(You)</span>}</div>
                        <div className="text-xs text-slate-500 mt-0.5">{user.email}</div>
                        {user.must_change_password && <div className="text-[10px] font-semibold text-amber-600 mt-1">Password change required</div>}
                      </td>
                      <td className="px-5 py-4"><span className="inline-flex rounded-full bg-indigo-50 border border-indigo-100 px-2.5 py-1 text-xs font-bold text-indigo-700">{roleLabel(user.role)}</span></td>
                      <td className="px-5 py-4"><span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-bold ${user.is_active === false ? 'bg-slate-100 text-slate-600' : 'bg-emerald-50 text-emerald-700'}`}>{user.is_active === false ? 'Inactive' : 'Active'}</span></td>
                      <td className="px-5 py-4 text-slate-600">{user.created_at ? new Date(user.created_at).toLocaleDateString() : '—'}</td>
                      <td className="px-5 py-4 text-right relative">
                        {isBusy ? <Loader2 className="h-4 w-4 animate-spin ml-auto" /> : (
                          <>
                            <button onClick={() => setOpenMenuId(openMenuId === user.id ? null : user.id)} className="p-2 rounded-lg border border-slate-200 hover:bg-slate-50" aria-label="User actions"><MoreVertical className="h-4 w-4" /></button>
                            {openMenuId === user.id && (
                              <div className="absolute right-5 top-12 z-30 w-52 rounded-xl border border-slate-200 bg-white p-1.5 text-left shadow-xl">
                                <button onClick={() => openRoleModal(user)} disabled={isSelf} className="w-full flex items-center gap-2 rounded-lg px-3 py-2 text-xs font-semibold hover:bg-slate-50 disabled:opacity-40"><UserCog className="h-4 w-4" />Change Role</button>
                                <button onClick={() => handleToggleActive(user)} disabled={isSelf} className="w-full flex items-center gap-2 rounded-lg px-3 py-2 text-xs font-semibold hover:bg-slate-50 disabled:opacity-40">{user.is_active === false ? <UserCheck className="h-4 w-4" /> : <UserX className="h-4 w-4" />}{user.is_active === false ? 'Reactivate Account' : 'Deactivate Account'}</button>
                                <button onClick={() => handleResetAccess(user)} disabled={isSelf || user.is_active === false} className="w-full flex items-center gap-2 rounded-lg px-3 py-2 text-xs font-semibold hover:bg-slate-50 disabled:opacity-40"><KeyRound className="h-4 w-4" />Send Reset Link</button>
                              </div>
                            )}
                          </>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </section>
      </main>

      {showCreateModal && (
        <Modal title="Create System User" subtitle="Create a login account. Site assignment is handled separately." onClose={() => setShowCreateModal(false)}>
          <form onSubmit={handleCreateUser} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <Field label="First name"><input required value={form.first_name} onChange={(e) => handleNameChange('first_name', e.target.value)} className={inputClass} /></Field>
              <Field label="Last name"><input required value={form.last_name} onChange={(e) => handleNameChange('last_name', e.target.value)} className={inputClass} /></Field>
            </div>
            <Field label="Company email"><input type="email" required value={form.email} onChange={(e) => setForm((c) => ({ ...c, email: e.target.value }))} className={inputClass} /></Field>
            <Field label="System role"><select value={form.role} onChange={(e) => setForm((c) => ({ ...c, role: e.target.value }))} className={inputClass}>{SYSTEM_ROLES.map((role) => <option key={role.value} value={role.value}>{role.label}</option>)}</select></Field>
            <Field label="Temporary password">
              <div className="flex gap-2"><input type="text" required minLength={10} value={form.password} onChange={(e) => setForm((c) => ({ ...c, password: e.target.value }))} className={`${inputClass} flex-1 font-mono`} /><button type="button" onClick={generatePassword} className="px-3 rounded-xl border border-slate-200 bg-slate-50 text-xs font-bold">Generate</button></div>
            </Field>
            <div className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-xs text-amber-800">The user will be required to change this temporary password.</div>
            <ModalActions onCancel={() => setShowCreateModal(false)} busy={submitting} submitLabel="Create User" />
          </form>
        </Modal>
      )}

      {roleTarget && (
        <Modal title="Change System Role" subtitle={`${fullName(roleTarget)} currently has the ${roleLabel(roleTarget.role)} role.`} onClose={() => setRoleTarget(null)}>
          <form onSubmit={handleChangeRole} className="space-y-4">
            <Field label="New role"><select value={nextRole} onChange={(e) => setNextRole(e.target.value)} className={inputClass}>{SYSTEM_ROLES.map((role) => <option key={role.value} value={role.value}>{role.label}</option>)}</select></Field>
            <div className="rounded-xl border border-slate-200 bg-slate-50 p-3 text-xs text-slate-600">Changing a Site Clerk to another role will later deactivate their site assignment automatically when the Sites module is connected.</div>
            <ModalActions onCancel={() => setRoleTarget(null)} busy={actionLoadingId === roleTarget.id} submitLabel="Confirm Change" />
          </form>
        </Modal>
      )}
    </div>
  );
}

function MetricCard({ title, value, icon: Icon }) {
  return <div className="rounded-2xl border border-slate-200 bg-white p-4 sm:p-5 shadow-sm flex items-center justify-between"><div><p className="text-[10px] sm:text-xs uppercase tracking-wider font-semibold text-slate-500">{title}</p><p className="mt-1 text-2xl font-bold text-slate-950">{value}</p></div><div className="rounded-xl bg-indigo-50 border border-indigo-100 p-3 text-indigo-600"><Icon className="h-5 w-5" /></div></div>;
}

function Field({ label, children }) {
  return <label className="block"><span className="mb-1.5 block text-xs font-semibold text-slate-700">{label}</span>{children}</label>;
}

function Modal({ title, subtitle, onClose, children }) {
  return <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 p-4 backdrop-blur-sm"><div className="w-full max-w-lg rounded-2xl border border-slate-200 bg-white shadow-2xl"><div className="flex items-start justify-between gap-4 border-b border-slate-200 p-5 sm:p-6"><div><h2 className="text-lg font-bold text-slate-950">{title}</h2><p className="mt-1 text-sm text-slate-500">{subtitle}</p></div><button onClick={onClose} className="rounded-lg p-2 text-slate-500 hover:bg-slate-100"><X className="h-5 w-5" /></button></div><div className="p-5 sm:p-6">{children}</div></div></div>;
}

function ModalActions({ onCancel, busy, submitLabel }) {
  return <div className="flex justify-end gap-2 pt-2"><button type="button" onClick={onCancel} className="rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-semibold hover:bg-slate-50">Cancel</button><button type="submit" disabled={busy} className="inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-indigo-700 disabled:opacity-60">{busy && <Loader2 className="h-4 w-4 animate-spin" />}{submitLabel}</button></div>;
}
