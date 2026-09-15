'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { AlertTriangle, CalendarDays, CheckCircle2, FileText, Loader2, Plus, RefreshCw, Search, X, XCircle } from 'lucide-react';
import HRSideNav from '@/components/hr/HRSideNav';
import HRNavbar from '@/components/hr/HRNavbar';

const EMPTY = { employee_id: '', absence_type: 'Sick Leave', start_date: '', end_date: '', doctor_name: '', supporting_document_id: '', notes: '' };

export default function HRAbsencePage() {
  const [records, setRecords] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [documents, setDocuments] = useState([]);
  const [status, setStatus] = useState('Pending');
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [createOpen, setCreateOpen] = useState(false);
  const [form, setForm] = useState(EMPTY);
  const [saving, setSaving] = useState(false);
  const [reviewing, setReviewing] = useState(null);
  const [reason, setReason] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const [recordsResponse, employeesResponse, documentsResponse] = await Promise.all([
        fetch('/api/hr/absences', { cache: 'no-store' }),
        fetch('/api/hr/employees', { cache: 'no-store' }),
        fetch('/api/hr/documents', { cache: 'no-store' }),
      ]);
      const [recordsResult, employeesResult, documentsResult] = await Promise.all([recordsResponse.json(), employeesResponse.json(), documentsResponse.json()]);
      if (!recordsResponse.ok || !recordsResult.success) throw new Error(recordsResult.error || 'Could not load absence records.');
      if (!employeesResponse.ok || !employeesResult.success) throw new Error(employeesResult.error || 'Could not load employees.');
      if (!documentsResponse.ok || !documentsResult.success) throw new Error(documentsResult.error || 'Could not load supporting documents.');
      setRecords(recordsResult.data || []);
      setEmployees(employeesResult.data || []);
      setDocuments(documentsResult.data || []);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return records.filter((record) => {
      const matchesStatus = status === 'All' || record.status === status;
      const matchesSearch = !q || [record.employee?.name, record.employee?.employee_code, record.site?.site_name, record.absence_type].some((value) => String(value || '').toLowerCase().includes(q));
      return matchesStatus && matchesSearch;
    });
  }, [records, status, search]);

  const employeeDocuments = documents.filter((doc) => doc.employee_id === form.employee_id);

  async function createRecord(event) {
    event.preventDefault();
    setSaving(true);
    setError('');
    try {
      const response = await fetch('/api/hr/absences', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });
      const result = await response.json();
      if (!response.ok || !result.success) throw new Error(result.error || 'Could not create absence record.');
      setCreateOpen(false);
      setForm(EMPTY);
      await load();
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  }

  async function decide(record, decision) {
    const rejection = decision === 'Rejected';
    if (rejection && !reason.trim()) {
      setError('A rejection reason is required.');
      return;
    }
    setSaving(true);
    setError('');
    try {
      const response = await fetch('/api/hr/absences', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: record.id, status: decision, reason: reason.trim() }),
      });
      const result = await response.json();
      if (!response.ok || !result.success) throw new Error(result.error || 'Could not review absence record.');
      setReviewing(null);
      setReason('');
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
            <div><p className="text-[11px] uppercase tracking-[0.16em] font-bold text-indigo-600">Employee Availability</p><h1 className="mt-1 text-2xl sm:text-3xl font-black">Absence & Leave</h1><p className="mt-1 text-sm text-slate-500">Track sick leave, authorised leave and other absences against the actual employee and their current site.</p></div>
            <div className="flex gap-2"><button onClick={load} className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-xs font-bold"><RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />Refresh</button><button onClick={() => setCreateOpen(true)} className="inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-4 py-2.5 text-xs font-bold text-white"><Plus className="w-4 h-4" />New Record</button></div>
          </section>

          {error && <div className="rounded-2xl border border-rose-200 bg-rose-50 p-4 text-sm font-semibold text-rose-700 flex items-center gap-2"><AlertTriangle className="w-4 h-4" />{error}</div>}

          <section className="rounded-3xl border border-slate-200 bg-white p-4 shadow-sm flex flex-col md:flex-row gap-3">
            <div className="relative flex-1"><Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" /><input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search employee, site, type..." className="w-full rounded-xl border border-slate-200 bg-slate-50 pl-10 pr-3 py-2.5 text-sm" /></div>
            <div className="flex gap-2 overflow-x-auto">{['Pending', 'Approved', 'Rejected', 'All'].map((item) => <button key={item} onClick={() => setStatus(item)} className={`rounded-xl px-4 py-2.5 text-xs font-bold whitespace-nowrap ${status === item ? 'bg-indigo-600 text-white' : 'bg-slate-100 text-slate-600'}`}>{item}</button>)}</div>
          </section>

          <section className="rounded-3xl border border-slate-200 bg-white shadow-sm overflow-hidden">
            <div className="p-5 border-b border-slate-100 flex items-center justify-between"><h2 className="font-black flex items-center gap-2"><CalendarDays className="w-5 h-5 text-indigo-600" />Records</h2><span className="text-xs font-bold text-slate-400">{filtered.length}</span></div>
            {loading ? <div className="p-16 flex items-center justify-center gap-2 text-sm text-slate-500"><Loader2 className="w-5 h-5 animate-spin text-indigo-600" />Loading records...</div> : filtered.length === 0 ? <div className="p-14 text-center text-sm text-slate-500">No absence records match this filter.</div> : <div className="overflow-x-auto"><table className="w-full text-left"><thead className="bg-slate-50 text-[10px] uppercase tracking-wider text-slate-400"><tr><th className="px-5 py-3">Employee</th><th className="px-5 py-3">Site</th><th className="px-5 py-3">Type</th><th className="px-5 py-3">Dates</th><th className="px-5 py-3">Status</th><th className="px-5 py-3 text-right">Review</th></tr></thead><tbody className="divide-y divide-slate-100">{filtered.map((record) => <tr key={record.id} className="text-sm"><td className="px-5 py-4"><div className="font-bold">{record.employee?.name || 'Unknown employee'}</div><div className="text-[11px] text-slate-400">{record.employee?.employee_code || 'No code'}</div></td><td className="px-5 py-4">{record.site?.site_name || 'Unassigned'}</td><td className="px-5 py-4 font-semibold">{record.absence_type}</td><td className="px-5 py-4 text-xs">{record.start_date} → {record.end_date}</td><td className="px-5 py-4"><Status status={record.status} /></td><td className="px-5 py-4 text-right"><button onClick={() => { setReviewing(record); setReason(''); }} className="rounded-xl bg-indigo-50 px-3 py-2 text-xs font-bold text-indigo-700">View / Review</button></td></tr>)}</tbody></table></div>}
          </section>
        </main>
      </div>

      {createOpen && <div className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-sm p-4 flex items-center justify-center"><div className="w-full max-w-xl rounded-3xl bg-white shadow-2xl max-h-[92vh] overflow-y-auto"><div className="p-5 border-b border-slate-100 flex items-center justify-between"><div><h2 className="font-black text-lg">New Absence / Leave Record</h2><p className="text-xs text-slate-500 mt-1">The employee's current site is derived automatically.</p></div><button onClick={() => setCreateOpen(false)} className="p-2 rounded-xl hover:bg-slate-100"><X className="w-5 h-5" /></button></div><form onSubmit={createRecord} className="p-5 space-y-4"><label className="block space-y-1"><span className="text-xs font-bold text-slate-600">Employee *</span><select required value={form.employee_id} onChange={(e) => setForm({ ...form, employee_id: e.target.value, supporting_document_id: '' })} className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm"><option value="">Select employee</option>{employees.filter((employee) => employee.status !== 'Terminated').map((employee) => <option key={employee.id} value={employee.id}>{employee.name} — {employee.site?.site_name || 'Unassigned'}</option>)}</select></label><Field label="Absence Type *" value={form.absence_type} onChange={(value) => setForm({ ...form, absence_type: value })} /><div className="grid grid-cols-2 gap-3"><Field required label="Start Date" type="date" value={form.start_date} onChange={(value) => setForm({ ...form, start_date: value })} /><Field required label="End Date" type="date" value={form.end_date} onChange={(value) => setForm({ ...form, end_date: value })} /></div><Field label="Doctor / Practitioner" value={form.doctor_name} onChange={(value) => setForm({ ...form, doctor_name: value })} /><label className="block space-y-1"><span className="text-xs font-bold text-slate-600">Supporting Document</span><select value={form.supporting_document_id} onChange={(e) => setForm({ ...form, supporting_document_id: e.target.value })} className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm"><option value="">None</option>{employeeDocuments.map((doc) => <option key={doc.id} value={doc.id}>{doc.file_name} — {doc.document_type.replaceAll('_', ' ')}</option>)}</select></label><label className="block space-y-1"><span className="text-xs font-bold text-slate-600">Notes</span><textarea value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} rows={3} className="w-full rounded-xl border border-slate-200 bg-slate-50 p-3 text-sm" /></label><div className="flex justify-end gap-2"><button type="button" onClick={() => setCreateOpen(false)} className="rounded-xl px-4 py-2.5 text-sm font-bold text-slate-600">Cancel</button><button disabled={saving} className="inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-5 py-2.5 text-sm font-bold text-white disabled:opacity-50">{saving && <Loader2 className="w-4 h-4 animate-spin" />}Create Pending Record</button></div></form></div></div>}

      {reviewing && <div className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-sm p-4 flex items-center justify-center"><div className="w-full max-w-lg rounded-3xl bg-white shadow-2xl"><div className="p-5 border-b border-slate-100 flex items-center justify-between"><div><h2 className="font-black text-lg">{reviewing.absence_type}</h2><p className="text-xs text-slate-500 mt-1">{reviewing.employee?.name} • {reviewing.start_date} → {reviewing.end_date}</p></div><button onClick={() => setReviewing(null)} className="p-2 rounded-xl hover:bg-slate-100"><X className="w-5 h-5" /></button></div><div className="p-5 space-y-4">{reviewing.doctor_name && <Info label="Doctor / Practitioner" value={reviewing.doctor_name} />}{reviewing.notes && <Info label="Notes" value={reviewing.notes} />}{reviewing.rejection_reason && <div className="rounded-xl bg-rose-50 p-3 text-sm text-rose-700"><strong>Rejection reason:</strong> {reviewing.rejection_reason}</div>}<Status status={reviewing.status} />{reviewing.status === 'Pending' && <><textarea value={reason} onChange={(e) => setReason(e.target.value)} rows={3} placeholder="Reason required only when rejecting..." className="w-full rounded-xl border border-slate-200 bg-slate-50 p-3 text-sm" /><div className="flex justify-end gap-2"><button disabled={saving || !reason.trim()} onClick={() => decide(reviewing, 'Rejected')} className="inline-flex items-center gap-2 rounded-xl bg-rose-50 px-4 py-2.5 text-sm font-bold text-rose-700 disabled:opacity-50"><XCircle className="w-4 h-4" />Reject</button><button disabled={saving} onClick={() => decide(reviewing, 'Approved')} className="inline-flex items-center gap-2 rounded-xl bg-emerald-600 px-4 py-2.5 text-sm font-bold text-white disabled:opacity-50"><CheckCircle2 className="w-4 h-4" />Approve</button></div></>}</div></div></div>}
    </div>
  );
}

function Status({ status }) {
  const cls = status === 'Approved' ? 'bg-emerald-50 text-emerald-700' : status === 'Rejected' ? 'bg-rose-50 text-rose-700' : 'bg-amber-50 text-amber-700';
  return <span className={`inline-flex rounded-full px-2.5 py-1 text-[10px] font-bold ${cls}`}>{status}</span>;
}
function Field({ label, value, onChange, type = 'text', required = false }) {
  return <label className="block space-y-1"><span className="text-xs font-bold text-slate-600">{label}</span><input required={required} type={type} value={value} onChange={(e) => onChange(e.target.value)} className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm" /></label>;
}
function Info({ label, value }) { return <div className="rounded-xl bg-slate-50 p-3"><div className="text-[10px] uppercase tracking-wider font-bold text-slate-400">{label}</div><div className="mt-1 text-sm text-slate-700">{value}</div></div>; }
