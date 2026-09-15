'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { AlertTriangle, FileText, Loader2, Pencil, Plus, RefreshCw, Search, ShieldCheck, UserRound, Users, X } from 'lucide-react';
import HRSideNav from '@/components/hr/HRSideNav';
import HRNavbar from '@/components/hr/HRNavbar';

const EMPTY_FORM = {
  employee_code: '',
  first_name: '',
  last_name: '',
  national_id: '',
  phone: '',
  email: '',
  job_role: '',
  hourly_rate: '',
  site_id: '',
  status: 'Active',
};

export default function HREmployeesPage() {
  const [employees, setEmployees] = useState([]);
  const [sites, setSites] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [siteFilter, setSiteFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [modal, setModal] = useState(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const response = await fetch('/api/hr/employees', { cache: 'no-store' });
      const result = await response.json();
      if (!response.ok || !result.success) throw new Error(result.error || 'Could not load employees.');
      setEmployees(result.data || []);
      setSites(result.sites || []);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return employees.filter((employee) => {
      const matchesSearch = !q || [employee.name, employee.employee_code, employee.job_role, employee.national_id, employee.site?.site_name].some((value) => String(value || '').toLowerCase().includes(q));
      const matchesSite = siteFilter === 'all' || (siteFilter === 'unassigned' ? !employee.site : employee.site?.id === siteFilter);
      const matchesStatus = statusFilter === 'all' || employee.status === statusFilter;
      return matchesSearch && matchesSite && matchesStatus;
    });
  }, [employees, search, siteFilter, statusFilter]);

  function openCreate() {
    setForm(EMPTY_FORM);
    setModal({ type: 'create' });
  }

  function openEdit(employee) {
    setForm({
      employee_code: employee.employee_code || '',
      first_name: employee.first_name || '',
      last_name: employee.last_name || '',
      national_id: employee.national_id || '',
      phone: employee.phone || '',
      email: employee.email || '',
      job_role: employee.job_role || '',
      hourly_rate: employee.hourly_rate ?? '',
      site_id: employee.site?.id || '',
      status: employee.status || 'Active',
    });
    setModal({ type: 'edit', employee });
  }

  async function saveEmployee(event) {
    event.preventDefault();
    setSaving(true);
    setError('');
    try {
      const payload = {
        ...form,
        hourly_rate: Number(form.hourly_rate),
        site_id: form.site_id || null,
      };
      if (modal?.type === 'edit') payload.id = modal.employee.id;

      const response = await fetch('/api/hr/employees', {
        method: modal?.type === 'edit' ? 'PATCH' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const result = await response.json();
      if (!response.ok || !result.success) throw new Error(result.error || 'Could not save employee.');
      setModal(null);
      setForm(EMPTY_FORM);
      await load();
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="min-h-screen bg-slate-100 flex flex-col lg:flex-row text-slate-900">
      <HRSideNav />
      <div className="flex-1 min-w-0">
        <HRNavbar />
        <main className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto space-y-6">
          <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm flex flex-col lg:flex-row lg:items-center justify-between gap-4">
            <div><p className="text-[11px] uppercase tracking-[0.16em] font-bold text-indigo-600">Employee Master</p><h1 className="mt-1 text-2xl sm:text-3xl font-black">Employees</h1><p className="mt-1 text-sm text-slate-500">HR creates ordinary workers, sets their current job/rate, assigns existing company sites, and maintains their employment file.</p></div>
            <div className="flex gap-2"><button onClick={load} className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-xs font-bold"><RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />Refresh</button><button onClick={openCreate} className="inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-4 py-2.5 text-xs font-bold text-white"><Plus className="w-4 h-4" />Add Employee</button></div>
          </section>

          {error && <div className="rounded-2xl border border-rose-200 bg-rose-50 p-4 text-sm font-semibold text-rose-700 flex items-center gap-2"><AlertTriangle className="w-4 h-4" />{error}</div>}

          <section className="rounded-3xl border border-slate-200 bg-white p-4 shadow-sm grid grid-cols-1 md:grid-cols-3 gap-3">
            <div className="relative"><Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" /><input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search employee, code, role, site..." className="w-full rounded-xl border border-slate-200 bg-slate-50 pl-10 pr-3 py-2.5 text-sm" /></div>
            <select value={siteFilter} onChange={(e) => setSiteFilter(e.target.value)} className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm font-semibold"><option value="all">All Sites</option><option value="unassigned">Unassigned</option>{sites.map((site) => <option key={site.id} value={site.id}>{site.site_name}</option>)}</select>
            <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm font-semibold"><option value="all">All Statuses</option><option value="Active">Active</option><option value="Suspended">Suspended</option><option value="Terminated">Terminated</option></select>
          </section>

          <section className="rounded-3xl border border-slate-200 bg-white shadow-sm overflow-hidden">
            <div className="p-5 border-b border-slate-100 flex items-center justify-between"><h2 className="font-black flex items-center gap-2"><Users className="w-5 h-5 text-indigo-600" />Workforce Directory</h2><span className="text-xs text-slate-400 font-bold">{filtered.length} employees</span></div>
            {loading ? <div className="p-16 flex items-center justify-center gap-2 text-sm text-slate-500"><Loader2 className="w-5 h-5 animate-spin text-indigo-600" />Loading employees...</div> : filtered.length === 0 ? <div className="p-14 text-center text-sm text-slate-500">No employees match the current filters.</div> : <div className="overflow-x-auto"><table className="w-full text-left"><thead className="bg-slate-50 text-[10px] uppercase tracking-wider text-slate-400"><tr><th className="px-5 py-3">Employee</th><th className="px-5 py-3">Role</th><th className="px-5 py-3">Site</th><th className="px-5 py-3">Rate</th><th className="px-5 py-3">Documents</th><th className="px-5 py-3">Compliance</th><th className="px-5 py-3">Status</th><th className="px-5 py-3 text-right">Actions</th></tr></thead><tbody className="divide-y divide-slate-100">{filtered.map((employee) => <EmployeeRow key={employee.id} employee={employee} onEdit={() => openEdit(employee)} />)}</tbody></table></div>}
          </section>
        </main>
      </div>

      {modal && (
        <div className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-sm p-4 flex items-center justify-center">
          <div className="w-full max-w-2xl rounded-3xl bg-white shadow-2xl max-h-[92vh] overflow-y-auto">
            <div className="p-5 border-b border-slate-100 flex items-center justify-between"><div><h2 className="font-black text-lg">{modal.type === 'create' ? 'Add Employee' : 'Edit Employee'}</h2><p className="text-xs text-slate-500 mt-1">Sites come from Admin-created active sites. HR cannot create a new site here.</p></div><button onClick={() => setModal(null)} className="p-2 rounded-xl hover:bg-slate-100 text-slate-500"><X className="w-5 h-5" /></button></div>
            <form onSubmit={saveEmployee} className="p-5 space-y-5">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {modal.type === 'create' && <Field label="Employee Code (optional)" value={form.employee_code} onChange={(value) => setForm({ ...form, employee_code: value })} placeholder="Auto-generated if blank" />}
                <Field label="National ID / Omang" value={form.national_id} onChange={(value) => setForm({ ...form, national_id: value })} />
                <Field required label="First Name" value={form.first_name} onChange={(value) => setForm({ ...form, first_name: value })} />
                <Field required label="Last Name" value={form.last_name} onChange={(value) => setForm({ ...form, last_name: value })} />
                <Field label="Phone" value={form.phone} onChange={(value) => setForm({ ...form, phone: value })} />
                <Field label="Email" type="email" value={form.email} onChange={(value) => setForm({ ...form, email: value })} />
                <Field required label="Job Role" value={form.job_role} onChange={(value) => setForm({ ...form, job_role: value })} />
                <Field required label="Hourly Rate (BWP)" type="number" min="0" step="0.01" value={form.hourly_rate} onChange={(value) => setForm({ ...form, hourly_rate: value })} />
                <label className="space-y-1"><span className="text-xs font-bold text-slate-600">Assigned Site</span><select value={form.site_id} onChange={(e) => setForm({ ...form, site_id: e.target.value })} className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm"><option value="">Unassigned</option>{sites.map((site) => <option key={site.id} value={site.id}>{site.site_name} {site.location ? `— ${site.location}` : ''}</option>)}</select></label>
                {modal.type === 'edit' && <label className="space-y-1"><span className="text-xs font-bold text-slate-600">Employment Status</span><select value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })} className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm"><option>Active</option><option>Suspended</option><option>Terminated</option></select></label>}
              </div>
              <div className="rounded-2xl border border-indigo-100 bg-indigo-50 p-4 text-xs text-indigo-800"><strong>History protection:</strong> changing site, role or rate creates/updates normalized employment history. Existing attendance rate snapshots are not rewritten.</div>
              <div className="flex justify-end gap-2"><button type="button" onClick={() => setModal(null)} className="rounded-xl px-4 py-2.5 text-sm font-bold text-slate-600">Cancel</button><button disabled={saving} className="inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-5 py-2.5 text-sm font-bold text-white disabled:opacity-50">{saving && <Loader2 className="w-4 h-4 animate-spin" />}{modal.type === 'create' ? 'Create Employee' : 'Save Changes'}</button></div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

function EmployeeRow({ employee, onEdit }) {
  const alertCount = employee.compliance_alerts?.length || 0;
  const statusClass = employee.status === 'Active' ? 'bg-emerald-50 text-emerald-700' : employee.status === 'Suspended' ? 'bg-amber-50 text-amber-700' : 'bg-rose-50 text-rose-700';
  return <tr className="text-sm hover:bg-slate-50/60"><td className="px-5 py-4"><div className="flex items-center gap-3"><div className="rounded-xl bg-indigo-50 p-2.5 text-indigo-600"><UserRound className="w-4 h-4" /></div><div><div className="font-bold text-slate-900">{employee.name}</div><div className="text-[11px] text-slate-400">{employee.employee_code || 'No code'}{employee.national_id ? ` • ${employee.national_id}` : ''}</div></div></div></td><td className="px-5 py-4 font-semibold">{employee.job_role || 'Unassigned'}</td><td className="px-5 py-4">{employee.site?.site_name || <span className="text-amber-700 font-bold">Unassigned</span>}</td><td className="px-5 py-4 font-black">{employee.hourly_rate === null ? '—' : `P${Number(employee.hourly_rate).toFixed(2)}/h`}</td><td className="px-5 py-4"><Link href={`/dashboard/hr/documents?employeeId=${employee.id}`} className="inline-flex items-center gap-1.5 text-indigo-600 font-bold"><FileText className="w-4 h-4" />{employee.document_count}</Link></td><td className="px-5 py-4">{alertCount ? <span title={employee.compliance_alerts.join('\n')} className="inline-flex items-center gap-1.5 rounded-full bg-amber-50 px-2.5 py-1 text-[10px] font-bold text-amber-700"><AlertTriangle className="w-3 h-3" />{alertCount} alert{alertCount === 1 ? '' : 's'}</span> : <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-2.5 py-1 text-[10px] font-bold text-emerald-700"><ShieldCheck className="w-3 h-3" />Clear</span>}</td><td className="px-5 py-4"><span className={`rounded-full px-2.5 py-1 text-[10px] font-bold ${statusClass}`}>{employee.status}</span></td><td className="px-5 py-4 text-right"><button onClick={onEdit} className="p-2 rounded-xl text-slate-500 hover:bg-indigo-50 hover:text-indigo-600" title="Edit employee"><Pencil className="w-4 h-4" /></button></td></tr>;
}

function Field({ label, value, onChange, required = false, type = 'text', ...props }) {
  return <label className="space-y-1"><span className="text-xs font-bold text-slate-600">{label}</span><input required={required} type={type} value={value} onChange={(e) => onChange(e.target.value)} className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm outline-none focus:border-indigo-500" {...props} /></label>;
}
