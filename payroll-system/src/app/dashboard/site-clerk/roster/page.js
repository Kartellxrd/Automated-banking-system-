'use client';

import { Suspense, useCallback, useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import {
  AlertCircle,
  Calendar,
  CheckCircle2,
  Clock3,
  Edit3,
  Loader2,
  Lock,
  Search,
  Send,
  UserCheck,
  X,
} from 'lucide-react';
import SiteClerkSideNav from '@/components/site-clerk/SiteClerkSideNav';
import SiteClerkNavbar from '@/components/site-clerk/SiteClerkNavbar';

const STATUS_LABELS = {
  draft: 'Draft',
  submitted_to_hr: 'Submitted to HR',
  approved: 'Approved by HR',
  rejected: 'Rejected by HR',
};

const STATE_LABELS = {
  present: 'Present',
  absent: 'Absent',
  leave: 'On Leave',
  sick: 'Sick',
};

function todayInBotswana() {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Africa/Gaborone',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(new Date());
}

function timeValue(value) {
  if (!value) return '';
  return new Intl.DateTimeFormat('en-GB', {
    timeZone: 'Africa/Gaborone',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).format(new Date(value));
}

function DailyRosterContent() {
  const searchParams = useSearchParams();
  const initialDate = searchParams.get('date') || todayInBotswana();
  const [date, setDate] = useState(initialDate);
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [search, setSearch] = useState('');
  const [message, setMessage] = useState({ type: '', text: '' });
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState({ attendance_state: 'present', clock_in: '07:00', clock_out: '16:00', overtime_hours: '0', notes: '' });

  const loadRoster = useCallback(async () => {
    setLoading(true);
    setMessage({ type: '', text: '' });
    try {
      const response = await fetch(`/api/site-clerk/roster?date=${encodeURIComponent(date)}`, { cache: 'no-store' });
      const result = await response.json();
      if (!response.ok || !result.success) throw new Error(result.error || 'Could not load roster.');
      setData(result.data);
    } catch (error) {
      setData(null);
      setMessage({ type: 'error', text: error.message });
    } finally {
      setLoading(false);
    }
  }, [date]);

  useEffect(() => { loadRoster(); }, [loadRoster]);

  const workers = useMemo(() => {
    const q = search.trim().toLowerCase();
    return (data?.workers || []).filter((worker) => {
      const text = `${worker.first_name || ''} ${worker.last_name || ''} ${worker.employee_code || ''} ${worker.job_role || ''}`.toLowerCase();
      return !q || text.includes(q);
    });
  }, [data, search]);

  function openEntry(worker) {
    const entry = worker.attendance;
    setEditing(worker);
    setForm({
      attendance_state: entry?.attendance_state || 'present',
      clock_in: timeValue(entry?.clock_in) || '07:00',
      clock_out: timeValue(entry?.clock_out) || '16:00',
      overtime_hours: String(entry?.overtime_hours ?? 0),
      notes: entry?.supervisor_notes || '',
    });
  }

  async function saveEntry(event) {
    event.preventDefault();
    if (!editing) return;
    setSaving(true);
    setMessage({ type: '', text: '' });
    try {
      const response = await fetch('/api/site-clerk/roster', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          employee_id: editing.id,
          date,
          attendance_state: form.attendance_state,
          clock_in: form.attendance_state === 'present' ? form.clock_in : null,
          clock_out: form.attendance_state === 'present' ? form.clock_out : null,
          overtime_hours: form.attendance_state === 'present' ? Number(form.overtime_hours || 0) : 0,
          notes: form.notes,
        }),
      });
      const result = await response.json();
      if (!response.ok || !result.success) throw new Error(result.error || 'Could not save attendance.');
      setEditing(null);
      setMessage({ type: 'success', text: `${editing.first_name} ${editing.last_name} attendance saved.` });
      await loadRoster();
    } catch (error) {
      setMessage({ type: 'error', text: error.message });
    } finally {
      setSaving(false);
    }
  }

  async function submitRoster() {
    if (!data?.canSubmit) return;
    if (!window.confirm(`Submit the completed ${data.site.site_name} roster for ${date} to HR? You will not be able to edit it unless HR rejects it.`)) return;

    setSubmitting(true);
    setMessage({ type: '', text: '' });
    try {
      const response = await fetch('/api/site-clerk/roster', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ date }),
      });
      const result = await response.json();
      if (!response.ok || !result.success) throw new Error(result.error || 'Could not submit roster.');
      setMessage({ type: 'success', text: result.message });
      await loadRoster();
    } catch (error) {
      setMessage({ type: 'error', text: error.message });
    } finally {
      setSubmitting(false);
    }
  }

  const status = data?.roster?.status || 'draft';
  const locked = data ? !data.canEdit : true;

  return (
    <div className="min-h-screen bg-slate-100 text-slate-900 flex flex-col lg:flex-row font-sans">
      <SiteClerkSideNav />
      <main className="flex-1 p-4 sm:p-6 lg:p-8 space-y-6 overflow-x-hidden">
        <SiteClerkNavbar title="Daily Attendance & Roster" siteName={data?.site?.site_name || 'Assigned Site'} />

        {message.text && (
          <div className={`rounded-2xl border px-4 py-3 text-sm font-semibold flex items-center justify-between gap-3 ${message.type === 'success' ? 'border-emerald-200 bg-emerald-50 text-emerald-800' : 'border-rose-200 bg-rose-50 text-rose-800'}`}>
            <div className="flex items-center gap-2">{message.type === 'success' ? <CheckCircle2 className="w-4 h-4" /> : <AlertCircle className="w-4 h-4" />}{message.text}</div>
            <button onClick={() => setMessage({ type: '', text: '' })}><X className="w-4 h-4" /></button>
          </div>
        )}

        <section className="rounded-2xl border border-slate-200 bg-white p-4 sm:p-5 flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div>
            <div className="text-xs font-bold uppercase tracking-wider text-slate-400">Assigned Site</div>
            <div className="mt-1 text-lg font-black text-slate-950">{data?.site?.site_name || 'Loading...'}</div>
            <div className="text-sm text-slate-500">{data?.site?.location || ''}</div>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <div className="flex items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2">
              <Calendar className="w-4 h-4 text-slate-400" />
              <input type="date" max={todayInBotswana()} value={date} onChange={(e) => setDate(e.target.value)} className="bg-transparent text-xs font-bold outline-none" />
            </div>
            <span className={`rounded-full px-3 py-1.5 text-xs font-bold ${status === 'approved' ? 'bg-emerald-50 text-emerald-700' : status === 'rejected' ? 'bg-rose-50 text-rose-700' : status === 'submitted_to_hr' ? 'bg-indigo-50 text-indigo-700' : 'bg-amber-50 text-amber-700'}`}>
              {STATUS_LABELS[status] || status}
            </span>
          </div>
        </section>

        {data?.roster?.status === 'rejected' && (
          <div className="rounded-2xl border border-rose-200 bg-rose-50 p-4">
            <div className="font-bold text-rose-800">HR rejected this roster. It is editable again.</div>
            <div className="mt-1 text-sm text-rose-700">{data.roster.rejection_reason || 'Correct the attendance entries and resubmit.'}</div>
          </div>
        )}

        <section className="grid grid-cols-3 gap-3">
          <MiniMetric label="Assigned" value={data?.workers?.length || 0} />
          <MiniMetric label="Entered" value={data?.enteredWorkers || 0} />
          <MiniMetric label="Missing" value={data?.missingEntries || 0} warn={(data?.missingEntries || 0) > 0} />
        </section>

        <section className="rounded-3xl border border-slate-200 bg-white shadow-sm overflow-hidden">
          <div className="p-5 border-b border-slate-200 flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <h2 className="font-black text-slate-950">Worker Attendance</h2>
              <p className="mt-1 text-xs text-slate-500">Regular hours are calculated automatically as worked hours minus manual overtime.</p>
            </div>
            <div className="relative w-full md:w-72"><Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" /><input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search worker..." className="w-full rounded-xl border border-slate-200 bg-slate-50 py-2.5 pl-9 pr-3 text-xs outline-none focus:border-indigo-500" /></div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full min-w-[950px] text-xs">
              <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 uppercase tracking-wider">
                <tr><th className="px-5 py-3 text-left">Worker</th><th className="px-4 py-3 text-left">Attendance</th><th className="px-4 py-3 text-left">Clock In / Out</th><th className="px-4 py-3 text-center">Regular</th><th className="px-4 py-3 text-center">OT</th><th className="px-4 py-3 text-center">Worked</th><th className="px-5 py-3 text-right">Action</th></tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {loading ? (
                  <tr><td colSpan={7} className="py-16 text-center text-slate-500"><Loader2 className="inline w-5 h-5 animate-spin mr-2 text-indigo-600" />Loading roster...</td></tr>
                ) : workers.length === 0 ? (
                  <tr><td colSpan={7} className="py-16 text-center text-slate-500">No active workers are assigned to this site for this roster.</td></tr>
                ) : workers.map((worker) => {
                  const entry = worker.attendance;
                  const state = entry?.attendance_state;
                  return (
                    <tr key={worker.id} className="hover:bg-slate-50/70">
                      <td className="px-5 py-4"><div className="font-bold text-slate-900">{worker.first_name} {worker.last_name}</div><div className="text-[10px] text-slate-400 mt-0.5">{worker.employee_code || 'No employee code'} • {worker.job_role || 'Unassigned role'}</div></td>
                      <td className="px-4 py-4">{entry ? <span className={`rounded-full px-2.5 py-1 font-bold ${state === 'present' ? 'bg-emerald-50 text-emerald-700' : state === 'absent' ? 'bg-rose-50 text-rose-700' : 'bg-amber-50 text-amber-700'}`}>{STATE_LABELS[state] || state}</span> : <span className="text-amber-600 font-bold">Not entered</span>}</td>
                      <td className="px-4 py-4 font-semibold text-slate-700">{state === 'present' ? `${timeValue(entry?.clock_in)} – ${timeValue(entry?.clock_out)}` : entry ? '—' : 'Not recorded'}</td>
                      <td className="px-4 py-4 text-center font-bold">{entry ? Number(entry.regular_hours || 0).toFixed(2) : '—'}</td>
                      <td className="px-4 py-4 text-center font-bold text-indigo-700">{entry ? Number(entry.overtime_hours || 0).toFixed(2) : '—'}</td>
                      <td className="px-4 py-4 text-center font-black">{entry ? `${Number(entry.worked_hours || 0).toFixed(2)}h` : '—'}</td>
                      <td className="px-5 py-4 text-right"><button disabled={locked} onClick={() => openEntry(worker)} className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 font-bold text-slate-700 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed"><Edit3 className="w-3.5 h-3.5" />{entry ? 'Edit' : 'Record'}</button></td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </section>

        <section className={`rounded-2xl border p-5 flex flex-col md:flex-row md:items-center justify-between gap-4 ${locked ? 'border-slate-200 bg-slate-200/60' : data?.canSubmit ? 'border-emerald-200 bg-emerald-50' : 'border-amber-200 bg-amber-50'}`}>
          <div className="flex items-start gap-3">
            <div className="mt-0.5">{locked ? <Lock className="w-5 h-5 text-slate-500" /> : data?.canSubmit ? <UserCheck className="w-5 h-5 text-emerald-600" /> : <Clock3 className="w-5 h-5 text-amber-600" />}</div>
            <div>
              <div className="font-black text-slate-900">{locked ? 'Roster locked' : data?.canSubmit ? 'Roster ready for HR' : 'Complete all worker entries'}</div>
              <div className="mt-1 text-xs text-slate-600">{locked ? `Current status: ${STATUS_LABELS[status] || status}.` : data?.canSubmit ? 'Submitting locks this roster until HR approves or rejects it.' : `${data?.missingEntries || 0} worker attendance entr${data?.missingEntries === 1 ? 'y is' : 'ies are'} still missing.`}</div>
            </div>
          </div>
          {!locked && <button onClick={submitRoster} disabled={!data?.canSubmit || submitting} className="inline-flex items-center justify-center gap-2 rounded-xl bg-slate-950 px-5 py-3 text-xs font-black uppercase tracking-wider text-white disabled:opacity-40"><Send className="w-4 h-4" />{submitting ? 'Submitting...' : 'Submit Roster to HR'}</button>}
        </section>
      </main>

      {editing && (
        <div className="fixed inset-0 z-50 bg-slate-950/50 backdrop-blur-sm p-4 flex items-center justify-center">
          <div className="w-full max-w-lg rounded-3xl border border-slate-200 bg-white shadow-2xl">
            <div className="p-5 border-b border-slate-200 flex items-start justify-between gap-4"><div><h3 className="text-lg font-black text-slate-950">Record Attendance</h3><p className="text-sm text-slate-500 mt-1">{editing.first_name} {editing.last_name} • {date}</p></div><button onClick={() => !saving && setEditing(null)} className="p-2 rounded-xl hover:bg-slate-100"><X className="w-5 h-5" /></button></div>
            <form onSubmit={saveEntry} className="p-5 space-y-4">
              <label className="block"><span className="block text-xs font-bold text-slate-700 mb-1.5">Attendance status</span><select value={form.attendance_state} onChange={(e) => setForm((f) => ({ ...f, attendance_state: e.target.value }))} className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm outline-none"><option value="present">Present</option><option value="absent">Absent</option><option value="leave">On Leave</option><option value="sick">Sick</option></select></label>

              {form.attendance_state === 'present' && (
                <>
                  <div className="grid grid-cols-2 gap-3">
                    <label><span className="block text-xs font-bold text-slate-700 mb-1.5">Clock in</span><input type="time" required value={form.clock_in} onChange={(e) => setForm((f) => ({ ...f, clock_in: e.target.value }))} className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm" /></label>
                    <label><span className="block text-xs font-bold text-slate-700 mb-1.5">Clock out</span><input type="time" required value={form.clock_out} onChange={(e) => setForm((f) => ({ ...f, clock_out: e.target.value }))} className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm" /></label>
                  </div>
                  <label className="block"><span className="block text-xs font-bold text-slate-700 mb-1.5">Manual overtime hours</span><input type="number" min="0" step="0.25" value={form.overtime_hours} onChange={(e) => setForm((f) => ({ ...f, overtime_hours: e.target.value }))} className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm" /><span className="mt-1 block text-[11px] text-slate-400">The system calculates worked hours from clock-in/out and subtracts OT to get regular hours.</span></label>
                </>
              )}

              <label className="block"><span className="block text-xs font-bold text-slate-700 mb-1.5">Note / reason</span><textarea rows={3} value={form.notes} onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))} placeholder={form.attendance_state === 'present' ? 'Optional attendance note' : 'Reason or supporting note'} className="w-full resize-none rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm outline-none" /></label>
              <div className="pt-2 flex justify-end gap-2"><button type="button" disabled={saving} onClick={() => setEditing(null)} className="rounded-xl border border-slate-200 px-4 py-2.5 text-xs font-bold">Cancel</button><button type="submit" disabled={saving} className="rounded-xl bg-indigo-600 px-5 py-2.5 text-xs font-bold text-white disabled:opacity-50">{saving ? 'Saving...' : 'Save Attendance'}</button></div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

function MiniMetric({ label, value, warn = false }) {
  return <div className="rounded-2xl border border-slate-200 bg-white p-4"><div className="text-[10px] font-bold uppercase tracking-wider text-slate-400">{label}</div><div className={`mt-1 text-2xl font-black ${warn ? 'text-amber-700' : 'text-slate-950'}`}>{value}</div></div>;
}

export default function DailyRosterPage() {
  return <Suspense fallback={<div className="min-h-screen bg-slate-100" />}><DailyRosterContent /></Suspense>;
}
