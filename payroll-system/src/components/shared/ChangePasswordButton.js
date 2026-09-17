'use client';

import { useState } from 'react';
import { AlertCircle, CheckCircle2, Eye, EyeOff, KeyRound, Loader2, X } from 'lucide-react';

export default function ChangePasswordButton({ compact = false, className = '' }) {
  const [open, setOpen] = useState(false);
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [saving, setSaving] = useState(false);
  const [status, setStatus] = useState({ type: '', message: '' });

  function openModal() {
    setNewPassword('');
    setConfirmPassword('');
    setShowNewPassword(false);
    setShowConfirmPassword(false);
    setStatus({ type: '', message: '' });
    setOpen(true);
  }

  async function submit(event) {
    event.preventDefault();
    setStatus({ type: '', message: '' });

    if (newPassword.length < 10) {
      setStatus({ type: 'error', message: 'Password must be at least 10 characters long.' });
      return;
    }
    if (newPassword !== confirmPassword) {
      setStatus({ type: 'error', message: 'Passwords do not match.' });
      return;
    }

    setSaving(true);
    try {
      const response = await fetch('/api/auth/change-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ newPassword }),
      });
      const result = await response.json();
      if (!response.ok || !result.success) throw new Error(result.error || 'Failed to update password.');

      setStatus({ type: 'success', message: 'Password updated successfully.' });
      setNewPassword('');
      setConfirmPassword('');
      setTimeout(() => setOpen(false), 1200);
    } catch (error) {
      setStatus({ type: 'error', message: error.message || 'Could not update password.' });
    } finally {
      setSaving(false);
    }
  }

  return (
    <>
      <button type="button" onClick={openModal} title="Change your password" className={`${compact ? 'p-2.5' : 'px-3 py-2'} inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white text-slate-700 hover:bg-slate-50 hover:border-slate-300 text-xs font-bold transition ${className}`}>
        <KeyRound className="w-4 h-4 text-indigo-600" />
        {!compact && <span className="hidden sm:inline">Change Password</span>}
      </button>

      {open && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-950/60 backdrop-blur-sm p-4">
          <div className="w-full max-w-md rounded-3xl border border-slate-200 bg-white p-6 shadow-2xl">
            <div className="flex items-start justify-between gap-4 border-b border-slate-100 pb-4">
              <div>
                <p className="text-[10px] font-black uppercase tracking-wider text-indigo-600">Account Security</p>
                <h3 className="mt-1 text-lg font-black text-slate-900">Change Password</h3>
                <p className="mt-1 text-xs text-slate-500">Choose a new password with at least 10 characters.</p>
              </div>
              <button type="button" disabled={saving} onClick={() => setOpen(false)} className="rounded-xl p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-700 disabled:opacity-50"><X className="h-5 w-5" /></button>
            </div>

            {status.message && (
              <div className={`mt-4 flex items-start gap-2 rounded-xl border p-3 text-xs font-semibold ${status.type === 'error' ? 'border-rose-200 bg-rose-50 text-rose-700' : 'border-emerald-200 bg-emerald-50 text-emerald-700'}`}>
                {status.type === 'error' ? <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" /> : <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" />}
                <span>{status.message}</span>
              </div>
            )}

            <form onSubmit={submit} className="mt-5 space-y-4">
              <PasswordInput label="New Password" value={newPassword} onChange={setNewPassword} visible={showNewPassword} onToggle={() => setShowNewPassword((value) => !value)} placeholder="Minimum 10 characters" />
              <PasswordInput label="Confirm New Password" value={confirmPassword} onChange={setConfirmPassword} visible={showConfirmPassword} onToggle={() => setShowConfirmPassword((value) => !value)} placeholder="Repeat the new password" />

              <div className="flex justify-end gap-2 pt-2">
                <button type="button" disabled={saving} onClick={() => setOpen(false)} className="rounded-xl border border-slate-200 px-4 py-2.5 text-xs font-bold text-slate-700 disabled:opacity-50">Cancel</button>
                <button type="submit" disabled={saving} className="inline-flex items-center gap-2 rounded-xl bg-slate-900 px-4 py-2.5 text-xs font-black text-white hover:bg-slate-800 disabled:opacity-50">
                  {saving && <Loader2 className="h-4 w-4 animate-spin" />}
                  {saving ? 'Updating...' : 'Save Password'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}

function PasswordInput({ label, value, onChange, visible, onToggle, placeholder }) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-xs font-bold text-slate-700">{label}</span>
      <div className="relative">
        <input type={visible ? 'text' : 'password'} required minLength={10} autoComplete="new-password" value={value} onChange={(event) => onChange(event.target.value)} placeholder={placeholder} className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2.5 pr-11 text-sm outline-none focus:border-indigo-500 focus:bg-white" />
        <button type="button" onClick={onToggle} aria-label={visible ? `Hide ${label}` : `Show ${label}`} className="absolute inset-y-0 right-0 flex items-center px-3.5 text-slate-400 hover:text-slate-700">
          {visible ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
        </button>
      </div>
    </label>
  );
}
