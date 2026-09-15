'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { AlertCircle, CheckCircle2, Info, Lock, RefreshCw, Save, ShieldCheck, X } from 'lucide-react';
import AdminNavbar from '@/components/admin/AdminNavbar';
import AdminSideNav from '@/components/admin/AdminSideNav';

const ROLE_LABELS = {
  site_clerk: 'Site Clerk',
  hr: 'HR Manager',
  accountant: 'Accountant',
  ceo: 'CEO / Executive',
  admin: 'System Admin',
};

const ROLE_DESCRIPTIONS = {
  site_clerk: 'Attendance and roster capture for assigned site',
  hr: 'Employee management and roster approval',
  accountant: 'Payroll preparation and expense management',
  ceo: 'Final payroll approval and payment execution',
  admin: 'System users, sites, permissions and governance',
};

export default function AccessRoleMatrixPage() {
  const [roles, setRoles] = useState([]);
  const [permissions, setPermissions] = useState([]);
  const [grants, setGrants] = useState({});
  const [savedGrants, setSavedGrants] = useState({});
  const [lockedAdmin, setLockedAdmin] = useState(new Set());
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState({ type: '', text: '' });

  const loadMatrix = useCallback(async () => {
    setLoading(true);
    setMessage({ type: '', text: '' });
    try {
      const response = await fetch('/api/admin/permissions', { cache: 'no-store' });
      const result = await response.json();
      if (!response.ok || !result.success) throw new Error(result.error || 'Could not load permissions.');

      const next = {};
      for (const role of result.roles || []) {
        for (const permission of result.permissions || []) {
          next[`${role}:${permission.id}`] = false;
        }
      }
      for (const grant of result.grants || []) {
        next[`${grant.role}:${grant.permission_id}`] = grant.granted === true;
      }

      setRoles(result.roles || []);
      setPermissions(result.permissions || []);
      setGrants(next);
      setSavedGrants(next);
      setLockedAdmin(new Set(result.locked_admin_permissions || []));
    } catch (error) {
      setMessage({ type: 'error', text: error.message });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadMatrix(); }, [loadMatrix]);

  const grouped = useMemo(() => {
    const groups = new Map();
    for (const permission of permissions) {
      if (!groups.has(permission.module)) groups.set(permission.module, []);
      groups.get(permission.module).push(permission);
    }
    return [...groups.entries()];
  }, [permissions]);

  const changes = useMemo(() => {
    const output = [];
    for (const role of roles) {
      for (const permission of permissions) {
        const key = `${role}:${permission.id}`;
        if (Boolean(grants[key]) !== Boolean(savedGrants[key])) {
          output.push({ role, permission_id: permission.id, granted: Boolean(grants[key]) });
        }
      }
    }
    return output;
  }, [grants, savedGrants, roles, permissions]);

  function toggle(role, permission) {
    const isLocked = role === 'admin' && lockedAdmin.has(permission.permission_key);
    if (isLocked) {
      setMessage({ type: 'error', text: 'Core System Admin permissions are locked for safety.' });
      return;
    }
    const key = `${role}:${permission.id}`;
    setGrants((current) => ({ ...current, [key]: !current[key] }));
  }

  async function saveMatrix() {
    if (!changes.length) return;
    setSaving(true);
    setMessage({ type: '', text: '' });
    try {
      const response = await fetch('/api/admin/permissions', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ changes }),
      });
      const result = await response.json();
      if (!response.ok || !result.success) throw new Error(result.error || 'Could not save permissions.');
      setSavedGrants({ ...grants });
      setMessage({ type: 'success', text: result.message });
    } catch (error) {
      setMessage({ type: 'error', text: error.message });
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="min-h-screen bg-slate-100 text-slate-900 flex flex-col lg:flex-row font-sans">
      <AdminSideNav />
      <main className="flex-1 p-4 sm:p-6 lg:p-8 space-y-6 overflow-x-hidden">
        <AdminNavbar title="Access & Role Matrix" />

        {message.text && (
          <div className={`p-4 rounded-2xl text-xs font-semibold flex items-center justify-between border ${message.type === 'success' ? 'bg-emerald-50 text-emerald-800 border-emerald-200' : 'bg-rose-50 text-rose-800 border-rose-200'}`}>
            <div className="flex items-center gap-2.5">
              {message.type === 'success' ? <CheckCircle2 className="w-4 h-4" /> : <AlertCircle className="w-4 h-4" />}
              <span>{message.text}</span>
            </div>
            <button onClick={() => setMessage({ type: '', text: '' })}><X className="w-4 h-4" /></button>
          </div>
        )}

        <section className="bg-white p-5 sm:p-6 rounded-2xl border border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-indigo-50 border border-indigo-100 rounded-xl text-indigo-600"><ShieldCheck className="w-6 h-6" /></div>
            <div>
              <h2 className="font-bold text-slate-900">Role Capability Matrix</h2>
              <p className="text-xs text-slate-500 mt-1">Permissions and grants are loaded from the database. Changes apply to system roles, not individual users.</p>
            </div>
          </div>
          <div className="flex gap-2">
            <button onClick={loadMatrix} disabled={loading || saving} className="p-2.5 border border-slate-200 rounded-xl bg-slate-50 text-slate-600" title="Reload"><RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} /></button>
            <button onClick={saveMatrix} disabled={saving || changes.length === 0} className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-indigo-600 text-white text-xs font-bold disabled:bg-slate-200 disabled:text-slate-400">
              {saving ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
              {saving ? 'Saving...' : `Save Changes${changes.length ? ` (${changes.length})` : ''}`}
            </button>
          </div>
        </section>

        {changes.length > 0 && (
          <div className="bg-amber-50 border border-amber-200 rounded-xl px-4 py-3 text-xs font-semibold text-amber-800 flex items-center gap-2"><Info className="w-4 h-4" />You have {changes.length} unsaved permission change{changes.length === 1 ? '' : 's'}.</div>
        )}

        <section className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
          {loading ? (
            <div className="py-20 flex items-center justify-center gap-2 text-sm text-slate-500"><RefreshCw className="w-4 h-4 animate-spin" />Loading role permissions...</div>
          ) : permissions.length === 0 ? (
            <div className="py-20 text-center text-sm text-slate-500">No active permissions are configured.</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead className="bg-slate-50 border-b border-slate-200">
                  <tr>
                    <th className="py-4 px-5 min-w-[320px] font-bold text-slate-700 uppercase tracking-wider">Capability</th>
                    {roles.map((role) => (
                      <th key={role} className="py-4 px-4 min-w-[135px] text-center border-l border-slate-200/70">
                        <div className="font-bold text-slate-900">{ROLE_LABELS[role] || role}</div>
                        <div className="mt-1 text-[10px] leading-4 text-slate-400 font-normal">{ROLE_DESCRIPTIONS[role] || ''}</div>
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {grouped.map(([module, items]) => (
                    <FragmentGroup key={module} module={module} items={items} roles={roles} grants={grants} lockedAdmin={lockedAdmin} onToggle={toggle} />
                  ))}
                </tbody>
              </table>
            </div>
          )}
          <div className="bg-slate-50 border-t border-slate-200 p-4 text-[11px] text-slate-500 flex items-center gap-2"><Lock className="w-3.5 h-3.5" />Core Admin governance permissions are locked so the system cannot be administratively orphaned.</div>
        </section>
      </main>
    </div>
  );
}

function FragmentGroup({ module, items, roles, grants, lockedAdmin, onToggle }) {
  return (
    <>
      <tr><td colSpan={roles.length + 1} className="bg-slate-100 border-y border-slate-200 px-5 py-2.5 font-bold text-slate-700">{module}</td></tr>
      {items.map((permission) => (
        <tr key={permission.id} className="border-b border-slate-100 hover:bg-slate-50/70">
          <td className="py-3.5 px-5">
            <div className="font-semibold text-slate-900">{permission.name}</div>
            <div className="text-[11px] text-slate-500 mt-1">{permission.description}</div>
            <code className="inline-block mt-1.5 text-[10px] text-slate-400">{permission.permission_key}</code>
          </td>
          {roles.map((role) => {
            const key = `${role}:${permission.id}`;
            const locked = role === 'admin' && lockedAdmin.has(permission.permission_key);
            return (
              <td key={role} className="py-3.5 px-4 text-center border-l border-slate-100">
                <input type="checkbox" checked={Boolean(grants[key])} disabled={locked} onChange={() => onToggle(role, permission)} className="w-4 h-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 disabled:opacity-50" title={locked ? 'Required System Admin permission' : `Toggle for ${ROLE_LABELS[role] || role}`} />
              </td>
            );
          })}
        </tr>
      ))}
    </>
  );
}
