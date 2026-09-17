'use client';

import { useEffect, useMemo, useState } from 'react';
import { AlertCircle, ArrowRightLeft, Building2, CheckCircle2, Loader2, RefreshCw, Search, Unlink, UserCheck, X } from 'lucide-react';
import AdminNavbar from '@/components/admin/AdminNavbar';
import AdminSideNav from '@/components/admin/AdminSideNav';
import ConfirmDialog from '@/components/shared/ConfirmDialog';

const inputClass = 'w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm text-slate-900 outline-none transition focus:border-indigo-500 focus:bg-white focus:ring-2 focus:ring-indigo-100';

function nameOf(user) {
  return [user?.first_name, user?.last_name].filter(Boolean).join(' ') || user?.email || 'Unnamed clerk';
}

export default function SiteAssignmentsPage() {
  const [sites, setSites] = useState([]);
  const [clerks, setClerks] = useState([]);
  const [assignments, setAssignments] = useState([]);
  const [siteId, setSiteId] = useState('');
  const [userId, setUserId] = useState('');
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [busySiteId, setBusySiteId] = useState(null);
  const [message, setMessage] = useState({ type: '', text: '' });
  const [confirmation, setConfirmation] = useState(null);

  async function load() {
    setLoading(true);
    try {
      const response = await fetch('/api/admin/site-assignments', { cache: 'no-store' });
      const result = await response.json();
      if (!response.ok || !result.success) throw new Error(result.error || 'Failed to load assignments.');
      setSites(result.data.sites || []);
      setClerks(result.data.clerks || []);
      setAssignments(result.data.assignments || []);
    } catch (error) {
      setMessage({ type: 'error', text: error.message });
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, []);

  const assignmentBySite = useMemo(() => new Map(assignments.map((item) => [item.site_id, item])), [assignments]);
  const clerkById = useMemo(() => new Map(clerks.map((item) => [item.id, item])), [clerks]);
  const siteById = useMemo(() => new Map(sites.map((item) => [item.id, item])), [sites]);
  const selectedAssignment = siteId ? assignmentBySite.get(siteId) : null;

  const visibleSites = useMemo(() => {
    const q = search.trim().toLowerCase();
    return sites.filter((site) => {
      const assignment = assignmentBySite.get(site.id);
      const clerk = assignment ? clerkById.get(assignment.user_id) : null;
      return !q || site.site_name.toLowerCase().includes(q) || (site.location || '').toLowerCase().includes(q) || nameOf(clerk).toLowerCase().includes(q);
    });
  }, [sites, assignments, clerks, search, assignmentBySite, clerkById]);

  const availableSites = sites.filter((site) => site.is_active !== false);
  const activeClerks = clerks.filter((clerk) => clerk.is_active !== false);

  function chooseSite(value) {
    setSiteId(value);
    const current = assignmentBySite.get(value);
    setUserId(current?.user_id || '');
  }

  function saveAssignment(event) {
    event.preventDefault();
    if (!siteId || !userId) return;

    const site = siteById.get(siteId);
    const clerk = clerkById.get(userId);
    const current = assignmentBySite.get(siteId);
    const currentClerk = current ? clerkById.get(current.user_id) : null;
    const clerkOtherAssignment = assignments.find((item) => item.user_id === userId && item.site_id !== siteId);
    const otherSite = clerkOtherAssignment ? siteById.get(clerkOtherAssignment.site_id) : null;

    let detail = `Assign ${nameOf(clerk)} to ${site?.site_name}?`;
    if (currentClerk && currentClerk.id !== userId) detail += ` ${nameOf(currentClerk)} will be unassigned from this site.`;
    if (otherSite) detail += ` ${nameOf(clerk)} will also be moved from ${otherSite.site_name}.`;

    setConfirmation({
      type: 'assign',
      title: current ? 'Confirm Site Reassignment' : 'Confirm Site Assignment',
      message: detail,
      confirmLabel: current ? 'Reassign Clerk' : 'Assign Clerk',
      tone: current || otherSite ? 'warning' : 'default',
      siteId,
      userId,
    });
  }

  async function performAssignment(target) {
    setSaving(true);
    setMessage({ type: '', text: '' });
    try {
      const response = await fetch('/api/admin/site-assignments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ site_id: target.siteId, user_id: target.userId }),
      });
      const result = await response.json();
      if (!response.ok || !result.success) throw new Error(result.error || 'Failed to save assignment.');
      setMessage({ type: 'success', text: result.message });
      setSiteId('');
      setUserId('');
      await load();
    } catch (error) {
      setMessage({ type: 'error', text: error.message });
    } finally {
      setSaving(false);
      setConfirmation(null);
    }
  }

  function unassign(site) {
    const assignment = assignmentBySite.get(site.id);
    const clerk = assignment ? clerkById.get(assignment.user_id) : null;
    if (!assignment) return;
    setConfirmation({
      type: 'unassign',
      title: 'Unassign Site Clerk',
      message: `Remove ${nameOf(clerk)} from ${site.site_name}? The historical assignment record will be preserved, but the clerk will immediately lose this active site assignment.`,
      confirmLabel: 'Unassign Clerk',
      tone: 'danger',
      site,
    });
  }

  async function performUnassign(site) {
    setBusySiteId(site.id);
    setMessage({ type: '', text: '' });
    try {
      const response = await fetch(`/api/admin/site-assignments?site_id=${encodeURIComponent(site.id)}`, { method: 'DELETE' });
      const result = await response.json();
      if (!response.ok || !result.success) throw new Error(result.error || 'Failed to unassign clerk.');
      setMessage({ type: 'success', text: result.message });
      await load();
    } catch (error) {
      setMessage({ type: 'error', text: error.message });
    } finally {
      setBusySiteId(null);
      setConfirmation(null);
    }
  }

  async function confirmCurrentAction() {
    const target = confirmation;
    if (!target) return;
    if (target.type === 'assign') await performAssignment(target);
    if (target.type === 'unassign') await performUnassign(target.site);
  }

  const confirmBusy = confirmation?.type === 'assign' ? saving : Boolean(busySiteId);

  return (
    <div className="min-h-screen bg-slate-100 text-slate-900 flex flex-col lg:flex-row">
      <AdminSideNav />
      <main className="flex-1 p-4 sm:p-6 lg:p-8 space-y-6 overflow-x-hidden">
        <AdminNavbar title="Site Assignments" />

        {message.text && <div className={`flex items-center justify-between rounded-2xl border px-4 py-3 text-sm font-medium ${message.type === 'success' ? 'border-emerald-200 bg-emerald-50 text-emerald-800' : 'border-rose-200 bg-rose-50 text-rose-800'}`}><span className="flex items-center gap-2">{message.type === 'success' ? <CheckCircle2 className="h-4 w-4" /> : <AlertCircle className="h-4 w-4" />}{message.text}</span><button onClick={() => setMessage({ type: '', text: '' })}><X className="h-4 w-4" /></button></div>}

        <section className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <Metric title="Active Sites" value={availableSites.length} icon={Building2} />
          <Metric title="Active Site Clerks" value={activeClerks.length} icon={UserCheck} />
          <Metric title="Current Assignments" value={assignments.length} icon={ArrowRightLeft} />
        </section>

        <section className="rounded-2xl border border-slate-200 bg-white shadow-sm p-5 sm:p-6">
          <div className="mb-5"><h1 className="text-lg font-bold">Assign Site Clerk</h1><p className="text-sm text-slate-500 mt-1">Choose live records from Supabase. Reassignment closes the previous assignment and preserves its history.</p></div>
          <form onSubmit={saveAssignment} className="grid grid-cols-1 lg:grid-cols-[1fr_1fr_auto] gap-3 items-end">
            <label className="text-xs font-bold text-slate-600">Site<select required value={siteId} onChange={(e) => chooseSite(e.target.value)} className={`${inputClass} mt-1.5`}><option value="">Select active site</option>{availableSites.map((site) => <option key={site.id} value={site.id}>{site.site_name}{site.location ? ` — ${site.location}` : ''}</option>)}</select></label>
            <label className="text-xs font-bold text-slate-600">Site Clerk<select required value={userId} onChange={(e) => setUserId(e.target.value)} className={`${inputClass} mt-1.5`}><option value="">Select active Site Clerk</option>{activeClerks.map((clerk) => { const current = assignments.find((item) => item.user_id === clerk.id); const currentSite = current ? siteById.get(current.site_id) : null; return <option key={clerk.id} value={clerk.id}>{nameOf(clerk)}{currentSite ? ` — currently ${currentSite.site_name}` : ''}</option>; })}</select></label>
            <button disabled={saving || !siteId || !userId} className="h-[42px] inline-flex items-center justify-center gap-2 rounded-xl bg-indigo-600 px-5 text-sm font-semibold text-white hover:bg-indigo-700 disabled:opacity-50">{saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <ArrowRightLeft className="h-4 w-4" />}{selectedAssignment ? 'Reassign' : 'Assign'}</button>
          </form>
        </section>

        <section className="rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden">
          <div className="p-5 border-b border-slate-200 flex flex-col sm:flex-row gap-3 sm:items-center sm:justify-between"><div><h2 className="font-bold">Site Assignment Register</h2><p className="text-sm text-slate-500 mt-1">One active clerk per site; one active site per clerk.</p></div><div className="flex gap-2"><div className="relative"><Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" /><input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search..." className={`${inputClass} pl-9`} /></div><button onClick={load} className="rounded-xl border border-slate-200 px-3 hover:bg-slate-50"><RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} /></button></div></div>
          <div className="overflow-x-auto"><table className="w-full min-w-[760px] text-sm"><thead className="bg-slate-50 text-xs uppercase text-slate-500"><tr><th className="px-5 py-3 text-left">Site</th><th className="px-5 py-3 text-left">Location</th><th className="px-5 py-3 text-left">Site Clerk</th><th className="px-5 py-3 text-left">Assigned</th><th className="px-5 py-3 text-right">Action</th></tr></thead><tbody className="divide-y divide-slate-100">{loading ? <tr><td colSpan="5" className="px-5 py-12 text-center text-slate-500"><Loader2 className="h-5 w-5 animate-spin inline mr-2" />Loading...</td></tr> : visibleSites.map((site) => { const assignment = assignmentBySite.get(site.id); const clerk = assignment ? clerkById.get(assignment.user_id) : null; return <tr key={site.id} className="hover:bg-slate-50/70"><td className="px-5 py-4 font-semibold">{site.site_name}<div className="text-[10px] mt-1 text-slate-400">{site.is_active === false ? 'Inactive site' : 'Active site'}</div></td><td className="px-5 py-4 text-slate-600">{site.location || '—'}</td><td className="px-5 py-4">{clerk ? <><div className="font-medium">{nameOf(clerk)}</div><div className="text-xs text-slate-500">{clerk.email}</div></> : <span className="text-amber-600 text-xs font-bold">Unassigned</span>}</td><td className="px-5 py-4 text-slate-600">{assignment?.assigned_at ? new Date(assignment.assigned_at).toLocaleDateString() : '—'}</td><td className="px-5 py-4 text-right">{assignment && <button disabled={busySiteId === site.id} onClick={() => unassign(site)} className="inline-flex items-center gap-1.5 rounded-lg border border-rose-200 px-3 py-2 text-xs font-semibold text-rose-700 hover:bg-rose-50 disabled:opacity-50">{busySiteId === site.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Unlink className="h-3.5 w-3.5" />}Unassign</button>}</td></tr>; })}</tbody></table></div>
        </section>
      </main>

      <ConfirmDialog
        open={Boolean(confirmation)}
        title={confirmation?.title}
        message={confirmation?.message}
        confirmLabel={confirmation?.confirmLabel}
        tone={confirmation?.tone}
        busy={confirmBusy}
        onCancel={() => !confirmBusy && setConfirmation(null)}
        onConfirm={confirmCurrentAction}
      />
    </div>
  );
}

function Metric({ title, value, icon: Icon }) {
  return <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm flex items-center justify-between"><div><p className="text-xs font-bold uppercase tracking-wider text-slate-500">{title}</p><p className="mt-1 text-2xl font-bold">{value}</p></div><div className="rounded-xl border border-indigo-100 bg-indigo-50 p-3 text-indigo-600"><Icon className="h-5 w-5" /></div></div>;
}
