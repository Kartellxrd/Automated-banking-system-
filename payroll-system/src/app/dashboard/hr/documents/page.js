'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { AlertTriangle, ExternalLink, FileText, Loader2, Plus, RefreshCw, Search, Trash2, Upload, X } from 'lucide-react';
import HRSideNav from '@/components/hr/HRSideNav';
import HRNavbar from '@/components/hr/HRNavbar';

const TYPES = [
  ['omang', 'Omang / National ID'],
  ['passport', 'Passport'],
  ['contract', 'Employment Contract'],
  ['drivers_license', "Driver's Licence"],
  ['safety_cert', 'Safety Certificate'],
  ['medical_clearance', 'Medical Clearance'],
  ['certificate', 'Certificate / Qualification'],
  ['academic_transcript', 'Academic Transcript'],
  ['resume', 'CV / Resume'],
  ['sick_note', 'Sick Note'],
  ['other', 'Other'],
];

export default function HRDocumentsPage() {
  const searchParams = useSearchParams();
  const requestedEmployee = searchParams.get('employeeId') || 'ALL';
  const [employees, setEmployees] = useState([]);
  const [documents, setDocuments] = useState([]);
  const [selectedEmployee, setSelectedEmployee] = useState(requestedEmployee);
  const [search, setSearch] = useState('');
  const [selectedDoc, setSelectedDoc] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [uploadOpen, setUploadOpen] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [form, setForm] = useState({ employee_id: requestedEmployee === 'ALL' ? '' : requestedEmployee, document_type: 'omang', title: '', issue_date: '', expiry_date: '', notes: '', file: null });

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const [employeeResponse, documentResponse] = await Promise.all([
        fetch('/api/hr/employees', { cache: 'no-store' }),
        fetch('/api/hr/documents', { cache: 'no-store' }),
      ]);
      const employeeResult = await employeeResponse.json();
      const documentResult = await documentResponse.json();
      if (!employeeResponse.ok || !employeeResult.success) throw new Error(employeeResult.error || 'Could not load employees.');
      if (!documentResponse.ok || !documentResult.success) throw new Error(documentResult.error || 'Could not load documents.');
      setEmployees(employeeResult.data || []);
      setDocuments(documentResult.data || []);
      setSelectedDoc((current) => current ? documentResult.data?.find((doc) => doc.id === current.id) || documentResult.data?.[0] || null : documentResult.data?.[0] || null);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return documents.filter((doc) => {
      const employeeMatch = selectedEmployee === 'ALL' || doc.employee_id === selectedEmployee;
      const searchMatch = !q || [doc.employee_name, doc.employee_code, doc.file_name, doc.document_type, doc.notes].some((value) => String(value || '').toLowerCase().includes(q));
      return employeeMatch && searchMatch;
    });
  }, [documents, selectedEmployee, search]);

  async function upload(event) {
    event.preventDefault();
    if (!form.employee_id || !form.file) return;
    setUploading(true);
    setError('');
    try {
      const body = new FormData();
      body.append('employee_id', form.employee_id);
      body.append('document_type', form.document_type);
      body.append('title', form.title);
      body.append('issue_date', form.issue_date);
      body.append('expiry_date', form.expiry_date);
      body.append('notes', form.notes);
      body.append('file', form.file);
      const response = await fetch('/api/hr/documents', { method: 'POST', body });
      const result = await response.json();
      if (!response.ok || !result.success) throw new Error(result.error || 'Document upload failed.');
      setUploadOpen(false);
      setForm({ employee_id: form.employee_id, document_type: 'omang', title: '', issue_date: '', expiry_date: '', notes: '', file: null });
      await load();
    } catch (err) {
      setError(err.message);
    } finally {
      setUploading(false);
    }
  }

  async function removeDocument(doc) {
    if (!window.confirm(`Delete ${doc.file_name}? This removes the stored file too.`)) return;
    setError('');
    try {
      const response = await fetch(`/api/hr/documents?id=${encodeURIComponent(doc.id)}`, { method: 'DELETE' });
      const result = await response.json();
      if (!response.ok || !result.success) throw new Error(result.error || 'Could not delete document.');
      setSelectedDoc(null);
      await load();
    } catch (err) {
      setError(err.message);
    }
  }

  return (
    <div className="min-h-screen bg-slate-100 flex flex-col lg:flex-row text-slate-900">
      <HRSideNav />
      <div className="flex-1 min-w-0">
        <HRNavbar />
        <main className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto space-y-6">
          <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm flex flex-col lg:flex-row lg:items-center justify-between gap-4">
            <div><p className="text-[11px] uppercase tracking-[0.16em] font-bold text-indigo-600">Employee File</p><h1 className="mt-1 text-2xl sm:text-3xl font-black">Document Vault</h1><p className="mt-1 text-sm text-slate-500">Private personnel documents. Files are served through temporary signed links rather than public URLs.</p></div>
            <div className="flex gap-2"><button onClick={load} className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-xs font-bold"><RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />Refresh</button><button onClick={() => setUploadOpen(true)} className="inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-4 py-2.5 text-xs font-bold text-white"><Plus className="w-4 h-4" />Upload Document</button></div>
          </section>

          {error && <div className="rounded-2xl border border-rose-200 bg-rose-50 p-4 text-sm font-semibold text-rose-700 flex items-center gap-2"><AlertTriangle className="w-4 h-4" />{error}</div>}

          <section className="rounded-3xl border border-slate-200 bg-white p-4 shadow-sm grid grid-cols-1 md:grid-cols-2 gap-3">
            <select value={selectedEmployee} onChange={(e) => setSelectedEmployee(e.target.value)} className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm font-semibold"><option value="ALL">All Employees</option>{employees.map((employee) => <option key={employee.id} value={employee.id}>{employee.name} — {employee.employee_code || 'No code'}</option>)}</select>
            <div className="relative"><Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" /><input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search documents..." className="w-full rounded-xl border border-slate-200 bg-slate-50 pl-10 pr-3 py-2.5 text-sm" /></div>
          </section>

          <section className="grid grid-cols-1 xl:grid-cols-12 gap-6 items-start">
            <div className="xl:col-span-5 rounded-3xl border border-slate-200 bg-white shadow-sm overflow-hidden">
              <div className="p-5 border-b border-slate-100"><h2 className="font-black">Documents ({filtered.length})</h2></div>
              {loading ? <div className="p-14 flex items-center justify-center gap-2 text-sm text-slate-500"><Loader2 className="w-5 h-5 animate-spin text-indigo-600" />Loading vault...</div> : filtered.length === 0 ? <div className="p-12 text-center text-sm text-slate-500">No documents match this filter.</div> : <div className="divide-y divide-slate-100 max-h-[680px] overflow-y-auto">{filtered.map((doc) => <button key={doc.id} onClick={() => setSelectedDoc(doc)} className={`w-full text-left p-4 hover:bg-slate-50 ${selectedDoc?.id === doc.id ? 'bg-indigo-50' : ''}`}><div className="flex items-start justify-between gap-3"><div className="min-w-0"><div className="text-[10px] uppercase tracking-wider font-bold text-indigo-600">{doc.document_type.replaceAll('_', ' ')}</div><div className="mt-1 font-bold truncate">{doc.file_name}</div><div className="mt-1 text-xs text-slate-500">{doc.employee_name} • {doc.employee_code || 'No code'}</div></div><Status status={doc.document_status} /></div>{doc.expiry_date && <div className="mt-2 text-[11px] text-slate-400">Expires {doc.expiry_date}</div>}</button>)}</div>}
            </div>

            <div className="xl:col-span-7 rounded-3xl border border-slate-200 bg-white p-5 shadow-sm xl:sticky xl:top-24">
              {!selectedDoc ? <div className="min-h-[520px] flex flex-col items-center justify-center text-center text-slate-500"><FileText className="w-12 h-12 text-slate-300" /><p className="mt-3 font-bold">Select a document to preview</p></div> : <><div className="flex items-start justify-between gap-3 pb-4 border-b border-slate-100"><div><h2 className="font-black">{selectedDoc.file_name}</h2><p className="mt-1 text-xs text-slate-500">{selectedDoc.employee_name} • {selectedDoc.document_type.replaceAll('_', ' ')}</p></div><div className="flex gap-2">{selectedDoc.preview_url && <a href={selectedDoc.preview_url} target="_blank" rel="noreferrer" className="p-2.5 rounded-xl bg-slate-100 text-slate-600"><ExternalLink className="w-4 h-4" /></a>}<button onClick={() => removeDocument(selectedDoc)} className="p-2.5 rounded-xl bg-rose-50 text-rose-600"><Trash2 className="w-4 h-4" /></button></div></div><div className="mt-4 rounded-2xl border border-slate-200 bg-slate-100 min-h-[520px] overflow-hidden flex items-center justify-center">{!selectedDoc.preview_url ? <div className="text-sm text-slate-500">Preview unavailable.</div> : selectedDoc.mime_type === 'application/pdf' ? <iframe src={selectedDoc.preview_url} title={selectedDoc.file_name} className="w-full h-[600px] bg-white" /> : <img src={selectedDoc.preview_url} alt={selectedDoc.file_name} className="max-w-full max-h-[650px] object-contain" />}</div>{selectedDoc.notes && <div className="mt-4 rounded-xl bg-slate-50 p-3 text-sm text-slate-600">{selectedDoc.notes}</div>}</>}
            </div>
          </section>
        </main>
      </div>

      {uploadOpen && <div className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-sm p-4 flex items-center justify-center"><div className="w-full max-w-xl rounded-3xl bg-white shadow-2xl max-h-[92vh] overflow-y-auto"><div className="p-5 border-b border-slate-100 flex items-center justify-between"><div><h2 className="font-black text-lg">Upload Employee Document</h2><p className="text-xs text-slate-500 mt-1">JPG, PNG or PDF up to 10 MB.</p></div><button onClick={() => setUploadOpen(false)} className="p-2 rounded-xl hover:bg-slate-100"><X className="w-5 h-5" /></button></div><form onSubmit={upload} className="p-5 space-y-4"><label className="block space-y-1"><span className="text-xs font-bold text-slate-600">Employee *</span><select required value={form.employee_id} onChange={(e) => setForm({ ...form, employee_id: e.target.value })} className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm"><option value="">Select employee</option>{employees.map((employee) => <option key={employee.id} value={employee.id}>{employee.name} — {employee.employee_code || 'No code'}</option>)}</select></label><label className="block space-y-1"><span className="text-xs font-bold text-slate-600">Document Type *</span><select value={form.document_type} onChange={(e) => setForm({ ...form, document_type: e.target.value })} className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm">{TYPES.map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label><Field label="Title" value={form.title} onChange={(value) => setForm({ ...form, title: value })} placeholder="e.g. Omang copy" /><div className="grid grid-cols-2 gap-3"><Field label="Issue Date" type="date" value={form.issue_date} onChange={(value) => setForm({ ...form, issue_date: value })} /><Field label="Expiry Date" type="date" value={form.expiry_date} onChange={(value) => setForm({ ...form, expiry_date: value })} /></div><label className="block space-y-1"><span className="text-xs font-bold text-slate-600">Notes</span><textarea value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} rows={3} className="w-full rounded-xl border border-slate-200 bg-slate-50 p-3 text-sm" /></label><label className="block rounded-2xl border-2 border-dashed border-slate-300 bg-slate-50 p-6 text-center cursor-pointer"><Upload className="w-7 h-7 text-indigo-600 mx-auto" /><div className="mt-2 text-sm font-bold">{form.file?.name || 'Choose JPG, PNG or PDF'}</div><input required type="file" accept="image/jpeg,image/png,application/pdf" onChange={(e) => setForm({ ...form, file: e.target.files?.[0] || null })} className="hidden" /></label><div className="flex justify-end gap-2"><button type="button" onClick={() => setUploadOpen(false)} className="rounded-xl px-4 py-2.5 text-sm font-bold text-slate-600">Cancel</button><button disabled={uploading} className="inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-5 py-2.5 text-sm font-bold text-white disabled:opacity-50">{uploading && <Loader2 className="w-4 h-4 animate-spin" />}Upload</button></div></form></div></div>}
    </div>
  );
}

function Status({ status }) {
  const cls = status === 'expired' || status === 'rejected' ? 'bg-rose-50 text-rose-700' : status === 'pending_review' ? 'bg-amber-50 text-amber-700' : status === 'archived' ? 'bg-slate-100 text-slate-500' : 'bg-emerald-50 text-emerald-700';
  return <span className={`rounded-full px-2 py-1 text-[10px] font-bold ${cls}`}>{String(status || 'valid').replaceAll('_', ' ')}</span>;
}

function Field({ label, value, onChange, type = 'text', ...props }) {
  return <label className="block space-y-1"><span className="text-xs font-bold text-slate-600">{label}</span><input type={type} value={value} onChange={(e) => onChange(e.target.value)} className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm" {...props} /></label>;
}
