'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import {
  AlertTriangle,
  ArrowLeft,
  Check,
  CheckCircle2,
  ExternalLink,
  FileSearch,
  FileText,
  Loader2,
  Send,
  ShieldCheck,
  UploadCloud,
  XCircle,
} from 'lucide-react';
import SiteClerkSideNav from '@/components/site-clerk/SiteClerkSideNav';
import SiteClerkNavbar from '@/components/site-clerk/SiteClerkNavbar';

const ATTENDANCE_OPTIONS = [
  { value: '', label: 'Choose status' },
  { value: 'present', label: 'Present' },
  { value: 'absent', label: 'Absent' },
  { value: 'sick', label: 'Sick' },
  { value: 'leave', label: 'Leave' },
];

function dateTimeToClock(value) {
  if (!value) return '';
  try {
    const parts = new Intl.DateTimeFormat('en-GB', {
      timeZone: 'Africa/Gaborone',
      hour: '2-digit',
      minute: '2-digit',
      hourCycle: 'h23',
    }).formatToParts(new Date(value));
    const hour = parts.find((part) => part.type === 'hour')?.value;
    const minute = parts.find((part) => part.type === 'minute')?.value;
    return hour && minute ? `${hour}:${minute}` : '';
  } catch {
    return '';
  }
}

function percent(value) {
  const n = Number(value);
  return Number.isFinite(n) ? `${Math.round(n * 100)}%` : '—';
}

export default function TimesheetUploadPage() {
  const [data, setData] = useState(null);
  const [date, setDate] = useState('');
  const [entries, setEntries] = useState({});
  const [selectedFile, setSelectedFile] = useState(null);
  const [localPreview, setLocalPreview] = useState(null);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [dragging, setDragging] = useState(false);
  const [message, setMessage] = useState({ type: '', text: '' });
  const fileInputRef = useRef(null);

  const initialiseEntries = useCallback((payload) => {
    const next = {};
    for (const worker of payload?.workers || []) {
      const source = worker.suggested_row;
      const attendance = worker.attendance;
      next[worker.id] = {
        employee_id: worker.id,
        extracted_row_id: source?.id || '',
        attendance_state: attendance?.attendance_state || (source?.extracted_clock_in && source?.extracted_clock_out ? 'present' : ''),
        clock_in: attendance ? dateTimeToClock(attendance.clock_in) : source?.extracted_clock_in?.slice(0, 5) || '',
        clock_out: attendance ? dateTimeToClock(attendance.clock_out) : source?.extracted_clock_out?.slice(0, 5) || '',
        overtime_hours: attendance?.overtime_hours ?? source?.extracted_overtime_hours ?? 0,
        notes: attendance?.supervisor_notes || '',
        reviewed: Boolean(attendance && payload?.upload?.processing_status === 'confirmed'),
      };
    }
    setEntries(next);
  }, []);

  const loadWorkflow = useCallback(async (targetDate = '') => {
    setLoading(true);
    try {
      const suffix = targetDate ? `?date=${encodeURIComponent(targetDate)}` : '';
      const response = await fetch(`/api/site-clerk/timesheets${suffix}`, { cache: 'no-store' });
      const result = await response.json();
      if (!response.ok || !result.success) throw new Error(result.error || 'Could not load paper timesheet workflow.');
      setData(result.data);
      setDate(result.data.date);
      initialiseEntries(result.data);
    } catch (error) {
      setMessage({ type: 'error', text: error.message });
    } finally {
      setLoading(false);
    }
  }, [initialiseEntries]);

  useEffect(() => { loadWorkflow(); }, [loadWorkflow]);
  useEffect(() => () => { if (localPreview) URL.revokeObjectURL(localPreview); }, [localPreview]);

  function chooseFile(file) {
    if (!file) return;
    if (!['image/jpeg', 'image/png', 'application/pdf'].includes(file.type)) {
      setMessage({ type: 'error', text: 'Choose a JPG, PNG, or PDF file.' });
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      setMessage({ type: 'error', text: 'The file must be 10 MB or smaller.' });
      return;
    }
    if (localPreview) URL.revokeObjectURL(localPreview);
    setSelectedFile(file);
    setLocalPreview(URL.createObjectURL(file));
    setMessage({ type: '', text: '' });
  }

  async function uploadTimesheet() {
    if (!selectedFile || !date) return;
    setUploading(true);
    setMessage({ type: '', text: '' });
    try {
      const form = new FormData();
      form.append('file', selectedFile);
      form.append('date', date);
      const response = await fetch('/api/site-clerk/timesheets/upload', { method: 'POST', body: form });
      const result = await response.json();
      if (!response.ok || !result.success) throw new Error(result.error || 'Upload failed.');
      setSelectedFile(null);
      if (localPreview) URL.revokeObjectURL(localPreview);
      setLocalPreview(null);
      await loadWorkflow(date);
      setMessage({
        type: result.data.extraction_warning ? 'warning' : 'success',
        text: result.data.extraction_warning
          ? `Paper stored safely. Automatic extraction needs manual review: ${result.data.extraction_warning}`
          : 'Paper uploaded and extracted. Review every worker before confirming.',
      });
    } catch (error) {
      setMessage({ type: 'error', text: error.message });
    } finally {
      setUploading(false);
    }
  }

  function updateEntry(workerId, patch) {
    setEntries((current) => ({
      ...current,
      [workerId]: { ...current[workerId], ...patch, reviewed: patch.reviewed ?? false },
    }));
  }

  function applySourceRow(workerId, rowId) {
    const row = (data?.extracted_rows || []).find((item) => item.id === rowId);
    if (!row) {
      updateEntry(workerId, { extracted_row_id: '', reviewed: false });
      return;
    }
    updateEntry(workerId, {
      extracted_row_id: row.id,
      attendance_state: row.extracted_clock_in && row.extracted_clock_out ? 'present' : '',
      clock_in: row.extracted_clock_in?.slice(0, 5) || '',
      clock_out: row.extracted_clock_out?.slice(0, 5) || '',
      overtime_hours: row.extracted_overtime_hours ?? 0,
      reviewed: false,
    });
  }

  const validation = useMemo(() => {
    const workers = data?.workers || [];
    const problems = [];
    const usedRows = new Set();
    for (const worker of workers) {
      const entry = entries[worker.id];
      if (!entry?.attendance_state) problems.push(`${worker.employee_code || worker.first_name}: attendance status missing`);
      if (entry?.attendance_state === 'present' && (!entry.clock_in || !entry.clock_out)) problems.push(`${worker.employee_code || worker.first_name}: clock-in/out missing`);
      if (!entry?.reviewed) problems.push(`${worker.employee_code || worker.first_name}: not reviewed`);
      if (entry?.extracted_row_id) {
        if (usedRows.has(entry.extracted_row_id)) problems.push('One paper row is assigned to more than one worker');
        usedRows.add(entry.extracted_row_id);
      }
    }
    return { valid: workers.length > 0 && problems.length === 0, problems };
  }, [data, entries]);

  async function confirmVerification() {
    if (!validation.valid || !data?.upload?.id) return;
    setConfirming(true);
    setMessage({ type: '', text: '' });
    try {
      const payloadEntries = (data.workers || []).map((worker) => entries[worker.id]);
      const response = await fetch('/api/site-clerk/timesheets/confirm', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ upload_id: data.upload.id, date, entries: payloadEntries }),
      });
      const result = await response.json();
      if (!response.ok || !result.success) throw new Error(result.error || 'Could not confirm timesheet.');
      await loadWorkflow(date);
      setMessage({ type: 'success', text: result.message });
    } catch (error) {
      setMessage({ type: 'error', text: error.message });
    } finally {
      setConfirming(false);
    }
  }

  async function submitRoster() {
    if (!confirm('Submit this verified roster to HR? After submission it is locked unless HR rejects it.')) return;
    setSubmitting(true);
    setMessage({ type: '', text: '' });
    try {
      const response = await fetch('/api/site-clerk/roster', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ date }),
      });
      const result = await response.json();
      if (!response.ok || !result.success) throw new Error(result.error || 'Could not submit roster to HR.');
      await loadWorkflow(date);
      setMessage({ type: 'success', text: 'Verified paper roster submitted to HR successfully.' });
    } catch (error) {
      setMessage({ type: 'error', text: error.message });
    } finally {
      setSubmitting(false);
    }
  }

  const previewUrl = localPreview || data?.preview_url;
  const previewMime = selectedFile?.type || data?.upload?.mime_type;
  const locked = data?.roster && !['draft', 'rejected'].includes(data.roster.status);
  const confirmed = data?.upload?.processing_status === 'confirmed';
  const exceptionRows = (data?.extracted_rows || []).filter((row) => row.match_status !== 'matched');
  const selectedSourceRows = new Set(Object.values(entries).map((entry) => entry.extracted_row_id).filter(Boolean));

  return (
    <div className="min-h-screen bg-slate-100 text-slate-900 flex flex-col lg:flex-row font-sans">
      <SiteClerkSideNav />
      <main className="flex-1 p-4 sm:p-6 lg:p-8 space-y-6 overflow-x-hidden">
        <SiteClerkNavbar title="Paper Timesheet Verification" siteName={data?.site?.site_name || 'Assigned Site'} />

        <div className="flex items-center justify-between gap-3 flex-wrap">
          <Link href="/dashboard/site-clerk" className="inline-flex items-center gap-2 text-xs font-bold text-slate-600 hover:text-indigo-600"><ArrowLeft className="w-4 h-4" />Back to dashboard</Link>
          <Link href={`/dashboard/site-clerk/roster?date=${encodeURIComponent(date || '')}`} className="inline-flex items-center gap-2 text-xs font-bold text-indigo-600">Open Daily Roster <FileText className="w-4 h-4" /></Link>
        </div>

        {message.text && (
          <div className={`rounded-2xl border p-4 text-sm font-semibold flex gap-2 items-start ${message.type === 'success' ? 'bg-emerald-50 border-emerald-200 text-emerald-800' : message.type === 'warning' ? 'bg-amber-50 border-amber-200 text-amber-800' : 'bg-rose-50 border-rose-200 text-rose-800'}`}>
            {message.type === 'success' ? <CheckCircle2 className="w-5 h-5 shrink-0" /> : <AlertTriangle className="w-5 h-5 shrink-0" />}{message.text}
          </div>
        )}

        {loading ? (
          <div className="bg-white border border-slate-200 rounded-3xl py-24 flex items-center justify-center gap-2 text-sm text-slate-500"><Loader2 className="w-5 h-5 animate-spin text-indigo-600" />Loading paper-timesheet workflow...</div>
        ) : data ? (
          <>
            <section className="bg-slate-950 text-white rounded-3xl p-5 sm:p-6 flex flex-col xl:flex-row xl:items-center justify-between gap-4">
              <div><p className="text-[10px] uppercase tracking-[0.18em] text-indigo-300 font-bold">Locked Site Scope</p><h2 className="mt-1 text-xl font-black">{data.site.site_name}</h2><p className="text-sm text-slate-400 mt-1">{data.site.location || 'No location description'} • {data.summary.assigned_workers} active assigned workers</p></div>
              <div className="flex flex-wrap items-center gap-3"><label className="text-xs font-bold text-slate-300">Work date</label><input type="date" value={date} disabled={uploading || confirming || locked} onChange={(e) => { setDate(e.target.value); loadWorkflow(e.target.value); }} className="rounded-xl bg-slate-900 border border-slate-700 px-3 py-2 text-xs text-white" /><span className={`rounded-full px-3 py-1.5 text-[10px] font-bold ${locked ? 'bg-emerald-500/20 text-emerald-300' : 'bg-amber-500/20 text-amber-300'}`}>{data.roster?.status || 'draft'}</span></div>
            </section>

            <section className="grid grid-cols-2 lg:grid-cols-5 gap-3">
              <Stat label="Assigned" value={data.summary.assigned_workers} />
              <Stat label="Paper Rows" value={data.summary.extracted_rows} />
              <Stat label="Auto Matched" value={data.summary.auto_matched} good />
              <Stat label="Needs Review" value={data.summary.needs_review + data.summary.unmatched_rows} warn />
              <Stat label="Missing on Paper" value={data.summary.missing_workers} warn={data.summary.missing_workers > 0} />
            </section>

            {!locked && (
              <section className="bg-white border border-slate-200 rounded-3xl p-5 sm:p-6 space-y-4">
                <div className="flex items-center justify-between gap-4 flex-wrap"><div><h3 className="font-black text-slate-950">1. Upload physical attendance sheet</h3><p className="text-xs text-slate-500 mt-1">JPG, PNG or PDF • maximum 10 MB • stored privately and attached to this site's daily roster.</p></div>{data.upload && <span className="text-[10px] font-bold rounded-full bg-indigo-50 text-indigo-700 px-3 py-1.5">Latest: {data.upload.original_filename}</span>}</div>
                <div onDragOver={(e) => { e.preventDefault(); setDragging(true); }} onDragLeave={() => setDragging(false)} onDrop={(e) => { e.preventDefault(); setDragging(false); chooseFile(e.dataTransfer.files?.[0]); }} onClick={() => fileInputRef.current?.click()} className={`cursor-pointer rounded-2xl border-2 border-dashed p-7 text-center transition ${dragging ? 'border-indigo-500 bg-indigo-50' : 'border-slate-300 bg-slate-50 hover:border-indigo-400'}`}>
                  <input ref={fileInputRef} type="file" accept="image/jpeg,image/png,application/pdf" className="hidden" onChange={(e) => chooseFile(e.target.files?.[0])} />
                  <UploadCloud className="w-8 h-8 mx-auto text-indigo-600" /><p className="mt-3 text-sm font-bold text-slate-800">{selectedFile ? selectedFile.name : 'Drop paper timesheet here or click to browse'}</p><p className="text-xs text-slate-400 mt-1">The file never chooses the site; your Admin assignment controls that.</p>
                </div>
                {selectedFile && <button onClick={uploadTimesheet} disabled={uploading} className="w-full sm:w-auto inline-flex items-center justify-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl px-5 py-3 text-xs font-bold disabled:opacity-50">{uploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <FileSearch className="w-4 h-4" />}{uploading ? 'Uploading & extracting...' : 'Upload & Extract Paper'}</button>}
              </section>
            )}

            {data.upload && (
              <section className="grid grid-cols-1 xl:grid-cols-12 gap-5">
                <div className="xl:col-span-5 bg-white border border-slate-200 rounded-3xl p-4 sm:p-5 space-y-4">
                  <div className="flex items-center justify-between gap-3"><div><h3 className="font-black text-slate-950">2. Original paper evidence</h3><p className="text-xs text-slate-500 mt-1">Private signed preview. HR can later compare this paper with the digital roster.</p></div>{data.preview_url && <a href={data.preview_url} target="_blank" rel="noreferrer" className="p-2.5 rounded-xl border border-slate-200 text-slate-600 hover:text-indigo-600"><ExternalLink className="w-4 h-4" /></a>}</div>
                  <div className="rounded-2xl overflow-hidden border border-slate-200 bg-slate-900 min-h-[520px] flex items-center justify-center">{previewUrl ? (previewMime === 'application/pdf' ? <iframe title="Paper timesheet" src={previewUrl} className="w-full h-[620px] bg-white" /> : <img src={previewUrl} alt="Uploaded paper timesheet" className="max-w-full max-h-[720px] object-contain" />) : <div className="text-slate-400 text-sm">No preview available.</div>}</div>
                  {data.upload.extraction_error && <div className="rounded-xl bg-amber-50 border border-amber-200 p-3 text-xs text-amber-800"><b>Extraction warning:</b> {data.upload.extraction_error}. You can still enter the paper values manually.</div>}
                  {(data.upload.detected_site_text || data.upload.detected_document_date) && <div className="grid grid-cols-2 gap-2 text-xs"><div className="rounded-xl bg-slate-50 border border-slate-200 p-3"><div className="text-slate-400 font-bold">Paper site text</div><div className="mt-1 font-semibold">{data.upload.detected_site_text || 'Not detected'}</div></div><div className="rounded-xl bg-slate-50 border border-slate-200 p-3"><div className="text-slate-400 font-bold">Paper date</div><div className="mt-1 font-semibold">{data.upload.detected_document_date || 'Not detected'}</div></div></div>}
                </div>

                <div className="xl:col-span-7 bg-white border border-slate-200 rounded-3xl overflow-hidden">
                  <div className="p-5 border-b border-slate-200"><h3 className="font-black text-slate-950">3. Verify every assigned worker</h3><p className="text-xs text-slate-500 mt-1">OCR is a suggestion only. Choose the paper row, correct values where needed, then tick Reviewed.</p></div>
                  <div className="divide-y divide-slate-100">
                    {(data.workers || []).map((worker) => {
                      const entry = entries[worker.id] || {};
                      const source = (data.extracted_rows || []).find((row) => row.id === entry.extracted_row_id);
                      const present = entry.attendance_state === 'present';
                      return (
                        <div key={worker.id} className={`p-5 space-y-4 ${entry.reviewed ? 'bg-emerald-50/30' : ''}`}>
                          <div className="flex items-start justify-between gap-3"><div><div className="font-black text-slate-950">{worker.first_name} {worker.last_name}</div><div className="text-[11px] text-slate-400 mt-0.5">{worker.employee_code || 'No employee code'} • {worker.job_role || 'Worker'}</div></div><MatchBadge row={source} /></div>
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                            <label className="text-[11px] font-bold text-slate-600">Paper source row<select disabled={locked || confirmed} value={entry.extracted_row_id || ''} onChange={(e) => applySourceRow(worker.id, e.target.value)} className="mt-1 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-xs font-semibold"><option value="">No paper match / enter manually</option>{(data.extracted_rows || []).map((row) => <option key={row.id} value={row.id} disabled={selectedSourceRows.has(row.id) && row.id !== entry.extracted_row_id}>Row {row.source_row_number}: {row.raw_employee_name || row.raw_employee_code || 'Unreadable worker'}</option>)}</select></label>
                            <label className="text-[11px] font-bold text-slate-600">Attendance<select disabled={locked || confirmed} value={entry.attendance_state || ''} onChange={(e) => updateEntry(worker.id, { attendance_state: e.target.value, reviewed: false })} className="mt-1 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-xs font-semibold">{ATTENDANCE_OPTIONS.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}</select></label>
                          </div>
                          {present && <div className="grid grid-cols-3 gap-2"><Field label="Clock in" type="time" disabled={locked || confirmed} value={entry.clock_in || ''} onChange={(value) => updateEntry(worker.id, { clock_in: value, reviewed: false })} /><Field label="Clock out" type="time" disabled={locked || confirmed} value={entry.clock_out || ''} onChange={(value) => updateEntry(worker.id, { clock_out: value, reviewed: false })} /><Field label="Manual OT (h)" type="number" disabled={locked || confirmed} value={entry.overtime_hours ?? 0} onChange={(value) => updateEntry(worker.id, { overtime_hours: value, reviewed: false })} /></div>}
                          <label className="text-[11px] font-bold text-slate-600 block">Clerk note<input disabled={locked || confirmed} value={entry.notes || ''} onChange={(e) => updateEntry(worker.id, { notes: e.target.value, reviewed: false })} placeholder="Optional correction / paper note" className="mt-1 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-xs" /></label>
                          <label className={`flex items-center gap-2 rounded-xl border px-3 py-2.5 text-xs font-bold ${entry.reviewed ? 'border-emerald-200 bg-emerald-50 text-emerald-700' : 'border-slate-200 bg-slate-50 text-slate-600'}`}><input type="checkbox" disabled={locked || confirmed || !entry.attendance_state || (present && (!entry.clock_in || !entry.clock_out))} checked={Boolean(entry.reviewed)} onChange={(e) => updateEntry(worker.id, { reviewed: e.target.checked })} /><ShieldCheck className="w-4 h-4" />I checked this worker against the paper.</label>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </section>
            )}

            {data.upload && exceptionRows.length > 0 && (
              <section className="rounded-3xl border border-amber-200 bg-amber-50 p-5"><h3 className="font-black text-amber-950 flex items-center gap-2"><AlertTriangle className="w-5 h-5" />Extraction exceptions</h3><p className="text-xs text-amber-800 mt-1">These paper rows were not confidently auto-matched. Map them with the Paper source row dropdown above, or enter the correct worker manually.</p><div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-2">{exceptionRows.map((row) => <div key={row.id} className="rounded-xl border border-amber-200 bg-white p-3 text-xs"><div className="font-bold">Row {row.source_row_number}: {row.raw_employee_name || row.raw_employee_code || 'Unreadable'}</div><div className="mt-1 text-slate-500">Match: {row.match_status} • confidence {percent(row.match_confidence)} • OCR {percent(row.ocr_confidence)}</div></div>)}</div></section>
            )}

            {data.upload && !locked && !confirmed && (
              <section className="bg-white border border-slate-200 rounded-3xl p-5 flex flex-col md:flex-row md:items-center justify-between gap-4"><div><h3 className="font-black text-slate-950">4. Confirm paper verification</h3><p className="text-xs text-slate-500 mt-1">This writes reviewed values into the daily roster. It does not submit to HR yet.</p>{!validation.valid && <p className="text-xs text-amber-700 mt-2">{validation.problems.length} item{validation.problems.length === 1 ? '' : 's'} still need attention.</p>}</div><button onClick={confirmVerification} disabled={!validation.valid || confirming} className="inline-flex items-center justify-center gap-2 rounded-xl bg-indigo-600 text-white px-5 py-3 text-xs font-bold disabled:bg-slate-300">{confirming ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}{confirming ? 'Confirming...' : 'Confirm Verified Timesheet'}</button></section>
            )}

            {confirmed && !locked && (
              <section className="rounded-3xl border border-emerald-200 bg-emerald-50 p-5 flex flex-col md:flex-row md:items-center justify-between gap-4"><div><h3 className="font-black text-emerald-950">5. Verification complete</h3><p className="text-xs text-emerald-800 mt-1">The paper and digital roster are linked. Inspect the Daily Roster once more, then submit it to HR.</p></div><div className="flex flex-wrap gap-2"><Link href={`/dashboard/site-clerk/roster?date=${encodeURIComponent(date)}`} className="rounded-xl border border-emerald-300 bg-white text-emerald-800 px-4 py-3 text-xs font-bold">Review Digital Roster</Link><button onClick={submitRoster} disabled={submitting} className="inline-flex items-center gap-2 rounded-xl bg-emerald-700 text-white px-5 py-3 text-xs font-bold disabled:opacity-50">{submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}{submitting ? 'Submitting...' : 'Submit Roster to HR'}</button></div></section>
            )}

            {locked && <section className="rounded-3xl border border-slate-200 bg-white p-5 flex items-center gap-3"><CheckCircle2 className="w-6 h-6 text-emerald-600" /><div><h3 className="font-black text-slate-950">Roster is locked</h3><p className="text-xs text-slate-500 mt-1">Status: {data.roster.status}. You cannot change it unless HR rejects it back for correction.</p></div></section>}
          </>
        ) : null}
      </main>
    </div>
  );
}

function Stat({ label, value, good = false, warn = false }) {
  return <div className="rounded-2xl border border-slate-200 bg-white p-4"><div className="text-[10px] uppercase tracking-wider font-bold text-slate-400">{label}</div><div className={`mt-1 text-2xl font-black ${good ? 'text-emerald-700' : warn ? 'text-amber-700' : 'text-slate-950'}`}>{value}</div></div>;
}

function MatchBadge({ row }) {
  if (!row) return <span className="rounded-full bg-rose-50 text-rose-700 px-2.5 py-1 text-[10px] font-bold flex items-center gap-1"><XCircle className="w-3 h-3" />Missing / Manual</span>;
  if (row.match_status === 'matched') return <span className="rounded-full bg-emerald-50 text-emerald-700 px-2.5 py-1 text-[10px] font-bold flex items-center gap-1"><CheckCircle2 className="w-3 h-3" />Matched {percent(row.match_confidence)}</span>;
  return <span className="rounded-full bg-amber-50 text-amber-700 px-2.5 py-1 text-[10px] font-bold flex items-center gap-1"><AlertTriangle className="w-3 h-3" />Review {percent(row.match_confidence)}</span>;
}

function Field({ label, type, value, disabled, onChange }) {
  return <label className="text-[11px] font-bold text-slate-600">{label}<input type={type} step={type === 'number' ? '0.25' : undefined} min={type === 'number' ? '0' : undefined} disabled={disabled} value={value} onChange={(e) => onChange(e.target.value)} className="mt-1 w-full rounded-xl border border-slate-200 bg-slate-50 px-2.5 py-2.5 text-xs" /></label>;
}
