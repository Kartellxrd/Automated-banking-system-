'use client';

import { useEffect, useMemo, useState } from 'react';
import {
  AlertCircle,
  Building2,
  CheckCircle2,
  Edit3,
  Loader2,
  MapPin,
  MoreVertical,
  Plus,
  RefreshCw,
  Search,
  UserCheck,
  X,
} from 'lucide-react';
import AdminNavbar from '@/components/admin/AdminNavbar';
import AdminSideNav from '@/components/admin/AdminSideNav';
import ConfirmDialog from '@/components/shared/ConfirmDialog';

const EMPTY_FORM = { site_name: '', location: '' };
const inputClass =
  'w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm text-slate-900 outline-none transition focus:border-indigo-500 focus:bg-white focus:ring-2 focus:ring-indigo-100';

function clerkName(site) {
  const clerk = site.assignment?.clerk;
  if (!clerk) return 'Unassigned';
  return [clerk.first_name, clerk.last_name].filter(Boolean).join(' ') || clerk.email || 'Assigned clerk';
}

export default function AdminSitesPage() {
  const [sites, setSites] = useState([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [actionLoadingId, setActionLoadingId] = useState(null);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editTarget, setEditTarget] = useState(null);
  const [openMenuId, setOpenMenuId] = useState(null);
  const [statusTarget, setStatusTarget] = useState(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [editForm, setEditForm] = useState(EMPTY_FORM);
  const [message, setMessage] = useState({ type: '', text: '' });

  async function fetchSites() {
    setLoading(true);
    try {
      const response = await fetch('/api/admin/sites', { cache: 'no-store' });
      const result = await response.json();
      if (!response.ok || !result.success) throw new Error(result.error || 'Failed to load sites.');
      setSites(result.data || []);
    } catch (error) {
      setMessage({ type: 'error', text: error.message });
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { fetchSites(); }, []);

  async function handleCreateSite(event) {
    event.preventDefault();
    setSubmitting(true);
    setMessage({ type: '', text: '' });
    try {
      const response = await fetch('/api/admin/sites', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });
      const result = await response.json();
      if (!response.ok || !result.success) throw new Error(result.error || 'Failed to create site.');
      setMessage({ type: 'success', text: result.message });
      setForm(EMPTY_FORM);
      setShowCreateModal(false);
      await fetchSites();
    } catch (error) {
      setMessage({ type: 'error', text: error.message });
    } finally {
      setSubmitting(false);
    }
  }

  function openEditModal(site) {
    setOpenMenuId(null);
    setEditTarget(site);
    setEditForm({ site_name: site.site_name || '', location: site.location || '' });
  }

  async function handleEditSite(event) {
    event.preventDefault();
    if (!editTarget) return;
    setActionLoadingId(editTarget.id);
    setMessage({ type: '', text: '' });
    try {
      const response = await fetch(`/api/admin/sites/${editTarget.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'edit', ...editForm }),
      });
      const result = await response.json();
      if (!response.ok || !result.success) throw new Error(result.error || 'Failed to update site.');
      setMessage({ type: 'success', text: result.message });
      setEditTarget(null);
      await fetchSites();
    } catch (error) {
      setMessage({ type: 'error', text: error.message });
    } finally {
      setActionLoadingId(null);
    }
  }

  function requestToggleActive(site) {
    setOpenMenuId(null);
    const nextActive = site.is_active === false;
    setStatusTarget({ site, nextActive });
  }

  async function applyToggleActive() {
    if (!statusTarget) return;
    const { site, nextActive } = statusTarget;
    const verb = nextActive ? 'reactivate' : 'deactivate';
    setActionLoadingId(site.id);
    setMessage({ type: '', text: '' });
    try {
      const response = await fetch(`/api/admin/sites/${site.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'set_active', is_active: nextActive }),
      });
      const result = await response.json();
      if (!response.ok || !result.success) throw new Error(result.error || `Failed to ${verb} site.`);
      setMessage({ type: 'success', text: result.message });
      await fetchSites();
    } catch (error) {
      setMessage({ type: 'error', text: error.message });
    } finally {
      setActionLoadingId(null);
      setStatusTarget(null);
    }
  }

  const filteredSites = useMemo(() => {
    const q = search.trim().toLowerCase();
    return sites.filter((site) => {
      const matchesSearch = !q || (site.site_name || '').toLowerCase().includes(q) || (site.location || '').toLowerCase().includes(q) || clerkName(site).toLowerCase().includes(q);
      const matchesStatus = statusFilter === 'ALL' || (statusFilter === 'ACTIVE' && site.is_active !== false) || (statusFilter === 'INACTIVE' && site.is_active === false);
      return matchesSearch && matchesStatus;
    });
  }, [sites, search, statusFilter]);

  const activeSites = sites.filter((site) => site.is_active !== false).length;
  const assignedSites = sites.filter((site) => site.assignment?.clerk).length;
  const unassignedSites = sites.length - assignedSites;

  return (
    <div className="min-h-screen bg-slate-100 text-slate-900 flex flex-col lg:flex-row">
      <AdminSideNav />
      <main className="flex-1 p-4 sm:p-6 lg:p-8 space-y-6 overflow-x-hidden">
        <AdminNavbar title="Sites" />

        {message.text && (
          <div className={`flex items-center justify-between gap-3 rounded-2xl border px-4 py-3 text-sm font-medium ${message.type === 'success' ? 'border-emerald-200 bg-emerald-50 text-emerald-800' : 'border-rose-200 bg-rose-50 text-rose-800'}`}>
            <div className="flex items-center gap-2">{message.type === 'success' ? <CheckCircle2 className="h-4 w-4" /> : <AlertCircle className="h-4 w-4" />}<span>{message.text}</span></div>
            <button onClick={() => setMessage({ type: '', text: '' })}><X className="h-4 w-4" /></button>
          </div>
        )}

        <section className="grid grid-cols-2 xl:grid-cols-4 gap-3 sm:gap-4">
          <MetricCard title="Total Sites" value={sites.length} icon={Building2} />
          <MetricCard title="Active Sites" value={activeSites} icon={MapPin} />
          <MetricCard title="Assigned Clerks" value={assignedSites} icon={UserCheck} />
          <MetricCard title="Unassigned Sites" value={unassignedSites} icon={AlertCircle} />
        </section>

        <section className="rounded-2xl border border-slate-200 bg-white shadow-sm overflow-visible">
          <div className="p-5 sm:p-6 border-b border-slate-200 flex flex-col xl:flex-row xl:items-center justify-between gap-4">
            <div><h1 className="text-lg font-bold text-slate-950">Company Sites</h1><p className="text-sm text-slate-500 mt-1">Sites are loaded from Supabase. No site names or locations are hardcoded in this screen.</p></div>
            <div className="flex flex-col sm:flex-row gap-2">
              <div className="relative"><Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" /><input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search sites..." className={`${inputClass} sm:w-56 pl-9`} /></div>
              <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className={inputClass}><option value="ALL">All statuses</option><option value="ACTIVE">Active</option><option value="INACTIVE">Inactive</option></select>
              <button onClick={fetchSites} className="inline-flex items-center justify-center gap-2 px-3 py-2.5 rounded-xl border border-slate-200 bg-white text-sm font-semibold hover:bg-slate-50"><RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} /> Refresh</button>
              <button onClick={() => setShowCreateModal(true)} className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-indigo-600 text-white text-sm font-semibold hover:bg-indigo-700"><Plus className="h-4 w-4" /> Create Site</button>
            </div>
          </div>

          <div className="overflow-x-auto overflow-y-visible">
            <table className="w-full min-w-[850px] text-sm">
              <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500"><tr><th className="px-5 py-3 text-left">Site</th><th className="px-5 py-3 text-left">Location</th><th className="px-5 py-3 text-left">Assigned Clerk</th><th className="px-5 py-3 text-left">Status</th><th className="px-5 py-3 text-left">Created</th><th className="px-5 py-3 text-right">Actions</th></tr></thead>
              <tbody className="divide-y divide-slate-100">
                {loading ? <tr><td colSpan="6" className="px-5 py-12 text-center text-slate-500"><Loader2 className="h-5 w-5 animate-spin inline-block mr-2" />Loading sites...</td></tr> : filteredSites.length === 0 ? <tr><td colSpan="6" className="px-5 py-12 text-center text-slate-500">No sites found.</td></tr> : filteredSites.map((site) => (
                  <tr key={site.id} className="hover:bg-slate-50/70">
                    <td className="px-5 py-4 font-semibold text-slate-900">{site.site_name}</td>
                    <td className="px-5 py-4 text-slate-600">{site.location || '—'}</td>
                    <td className="px-5 py-4">{site.assignment?.clerk ? <div><div className="font-medium text-slate-900">{clerkName(site)}</div><div className="text-xs text-slate-500">{site.assignment.clerk.email}</div></div> : <span className="text-xs font-semibold text-amber-600">Unassigned</span>}</td>
                    <td className="px-5 py-4"><span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-bold ${site.is_active === false ? 'bg-slate-100 text-slate-600' : 'bg-emerald-50 text-emerald-700'}`}>{site.is_active === false ? 'Inactive' : 'Active'}</span></td>
                    <td className="px-5 py-4 text-slate-600">{site.created_at ? new Date(site.created_at).toLocaleDateString() : '—'}</td>
                    <td className="px-5 py-4 text-right relative">
                      {actionLoadingId === site.id ? <Loader2 className="h-4 w-4 animate-spin ml-auto" /> : <><button onClick={() => setOpenMenuId(openMenuId === site.id ? null : site.id)} className="p-2 rounded-lg border border-slate-200 hover:bg-slate-50" aria-label="Site actions"><MoreVertical className="h-4 w-4" /></button>{openMenuId === site.id && <div className="absolute right-5 top-12 z-30 w-48 rounded-xl border border-slate-200 bg-white p-1.5 text-left shadow-xl"><button onClick={() => openEditModal(site)} className="w-full flex items-center gap-2 rounded-lg px-3 py-2 text-xs font-semibold hover:bg-slate-50"><Edit3 className="h-4 w-4" />Edit Site</button><button onClick={() => requestToggleActive(site)} className="w-full flex items-center gap-2 rounded-lg px-3 py-2 text-xs font-semibold hover:bg-slate-50"><Building2 className="h-4 w-4" />{site.is_active === false ? 'Reactivate Site' : 'Deactivate Site'}</button></div>}</>}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      </main>

      {showCreateModal && <SiteModal title="Create Site" description="Create a company site. Clerk assignment is managed separately." form={form} setForm={setForm} onSubmit={handleCreateSite} onClose={() => { setShowCreateModal(false); setForm(EMPTY_FORM); }} submitting={submitting} submitLabel="Create Site" />}
      {editTarget && <SiteModal title="Edit Site" description={`Update ${editTarget.site_name}. Existing attendance history keeps the same site ID.`} form={editForm} setForm={setEditForm} onSubmit={handleEditSite} onClose={() => setEditTarget(null)} submitting={actionLoadingId === editTarget.id} submitLabel="Save Changes" />}

      <ConfirmDialog
        open={Boolean(statusTarget)}
        title={statusTarget?.nextActive ? 'Reactivate Site' : 'Deactivate Site'}
        message={statusTarget ? `${statusTarget.nextActive ? 'Reactivate' : 'Deactivate'} ${statusTarget.site.site_name}? ${statusTarget.nextActive ? 'The site will become available for assignments and operations again.' : 'Existing history will be preserved, but the site will no longer be available for new operational work.'}` : ''}
        confirmLabel={statusTarget?.nextActive ? 'Reactivate Site' : 'Deactivate Site'}
        tone={statusTarget?.nextActive ? 'default' : 'warning'}
        busy={Boolean(actionLoadingId)}
        onCancel={() => !actionLoadingId && setStatusTarget(null)}
        onConfirm={applyToggleActive}
      />
    </div>
  );
}

function MetricCard({ title, value, icon: Icon }) {
  return <div className="rounded-2xl border border-slate-200 bg-white p-4 sm:p-5 shadow-sm flex items-center justify-between"><div><p className="text-[10px] sm:text-xs font-bold uppercase tracking-wider text-slate-500">{title}</p><p className="mt-1 text-2xl font-bold text-slate-950">{value}</p></div><div className="rounded-xl border border-indigo-100 bg-indigo-50 p-3 text-indigo-600"><Icon className="h-5 w-5" /></div></div>;
}

function SiteModal({ title, description, form, setForm, onSubmit, onClose, submitting, submitLabel }) {
  return <div className="fixed inset-0 z-50 bg-slate-950/50 backdrop-blur-sm p-4 flex items-center justify-center"><div className="w-full max-w-lg rounded-2xl bg-white border border-slate-200 shadow-2xl"><div className="p-5 sm:p-6 border-b border-slate-200 flex items-start justify-between gap-4"><div><h2 className="text-lg font-bold text-slate-950">{title}</h2><p className="text-sm text-slate-500 mt-1">{description}</p></div><button onClick={onClose} className="p-2 rounded-lg hover:bg-slate-100 text-slate-500"><X className="h-5 w-5" /></button></div><form onSubmit={onSubmit} className="p-5 sm:p-6 space-y-4"><label className="block"><span className="block text-xs font-bold text-slate-700 mb-1.5">Site name</span><input required value={form.site_name} onChange={(e) => setForm((current) => ({ ...current, site_name: e.target.value }))} className={inputClass} placeholder="Enter site name" /></label><label className="block"><span className="block text-xs font-bold text-slate-700 mb-1.5">Location</span><input value={form.location} onChange={(e) => setForm((current) => ({ ...current, location: e.target.value }))} className={inputClass} placeholder="Enter physical location" /></label><div className="pt-2 flex justify-end gap-2"><button type="button" onClick={onClose} className="px-4 py-2.5 rounded-xl border border-slate-200 text-sm font-semibold hover:bg-slate-50">Cancel</button><button type="submit" disabled={submitting} className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-indigo-600 text-white text-sm font-semibold hover:bg-indigo-700 disabled:opacity-60">{submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}{submitLabel}</button></div></form></div></div>;
}
