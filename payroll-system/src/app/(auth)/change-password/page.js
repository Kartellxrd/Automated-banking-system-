'use client';

import { Suspense, useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { CheckCircle2, Eye, EyeOff, KeyRound, Loader2, ShieldAlert } from 'lucide-react';
import { supabase } from '@/lib/supabase';

function ChangePasswordContent() {
  const searchParams = useSearchParams();
  const [ready, setReady] = useState(false);
  const [loading, setLoading] = useState(false);
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [message, setMessage] = useState({ type: '', text: '' });

  useEffect(() => {
    async function prepareRecoverySession() {
      try {
        const code = searchParams.get('code');
        if (code) {
          const { error } = await supabase.auth.exchangeCodeForSession(code);
          if (error) throw error;
        }

        const { data } = await supabase.auth.getSession();
        if (!data.session) throw new Error('This password reset link is invalid or has expired.');
        setReady(true);
      } catch (error) {
        setMessage({ type: 'error', text: error.message || 'Could not verify password reset session.' });
      }
    }

    prepareRecoverySession();
  }, [searchParams]);

  async function handleSubmit(event) {
    event.preventDefault();
    setMessage({ type: '', text: '' });

    if (password.length < 10) {
      setMessage({ type: 'error', text: 'Password must be at least 10 characters.' });
      return;
    }
    if (password !== confirmPassword) {
      setMessage({ type: 'error', text: 'Passwords do not match.' });
      return;
    }

    setLoading(true);
    try {
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      if (userError || !user?.email) throw new Error('Your signed-in account could not be verified. Please sign in again.');

      const response = await fetch('/api/auth/change-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ newPassword: password }),
      });
      const result = await response.json();
      if (!response.ok || !result.success) throw new Error(result.error || 'Could not update password.');

      const { error: signInError } = await supabase.auth.signInWithPassword({ email: user.email, password });
      if (signInError) throw new Error('The password was updated, but the session could not be refreshed. Please sign in with your new password.');

      const target = result.redirect_to || '/dashboard';
      setMessage({ type: 'success', text: 'Password updated successfully. Opening your dashboard...' });
      setTimeout(() => window.location.replace(target), 600);
    } catch (error) {
      setMessage({ type: 'error', text: error.message || 'Could not update password.' });
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex items-center justify-center p-4">
      <div className="w-full max-w-md rounded-3xl border border-slate-800 bg-slate-900/80 p-7 sm:p-9 shadow-2xl">
        <div className="mb-6 text-center">
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-2xl border border-indigo-500/30 bg-indigo-500/10 text-indigo-300">
            <KeyRound className="h-6 w-6" />
          </div>
          <h1 className="text-2xl font-bold text-white">Set a new password</h1>
          <p className="mt-2 text-sm text-slate-400">Replace the temporary password, then continue directly to your assigned portal.</p>
        </div>

        {message.text && (
          <div className={`mb-5 flex items-start gap-2 rounded-xl border p-3 text-sm ${message.type === 'success' ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-300' : 'border-rose-500/30 bg-rose-500/10 text-rose-300'}`}>
            {message.type === 'success' ? <CheckCircle2 className="h-4 w-4 mt-0.5" /> : <ShieldAlert className="h-4 w-4 mt-0.5" />}
            <span>{message.text}</span>
          </div>
        )}

        {!message.text && !ready ? (
          <div className="flex items-center justify-center gap-2 py-8 text-sm text-slate-400"><Loader2 className="h-4 w-4 animate-spin" /> Verifying your account session...</div>
        ) : ready ? (
          <form onSubmit={handleSubmit} className="space-y-4">
            <PasswordField
              label="New password"
              value={password}
              onChange={setPassword}
              visible={showPassword}
              onToggle={() => setShowPassword((value) => !value)}
              disabled={loading}
              placeholder="Minimum 10 characters"
            />
            <PasswordField
              label="Confirm password"
              value={confirmPassword}
              onChange={setConfirmPassword}
              visible={showConfirmPassword}
              onToggle={() => setShowConfirmPassword((value) => !value)}
              disabled={loading}
              placeholder="Repeat new password"
            />

            <button type="submit" disabled={loading} className="mt-2 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-indigo-600 px-4 py-3 text-sm font-semibold text-white hover:bg-indigo-500 disabled:opacity-60">
              {loading && <Loader2 className="h-4 w-4 animate-spin" />}
              {loading ? 'Updating Password...' : 'Update Password'}
            </button>
          </form>
        ) : null}
      </div>
    </div>
  );
}

function PasswordField({ label, value, onChange, visible, onToggle, disabled, placeholder }) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-xs font-semibold text-slate-300">{label}</span>
      <div className="relative">
        <input
          type={visible ? 'text' : 'password'}
          required
          minLength={10}
          autoComplete="new-password"
          value={value}
          onChange={(event) => onChange(event.target.value)}
          disabled={disabled}
          className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-3 pr-12 text-sm outline-none focus:border-indigo-500 disabled:opacity-60"
          placeholder={placeholder}
        />
        <button type="button" onClick={onToggle} disabled={disabled} aria-label={visible ? `Hide ${label}` : `Show ${label}`} className="absolute inset-y-0 right-0 flex items-center px-4 text-slate-500 hover:text-slate-200 disabled:opacity-50">
          {visible ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
        </button>
      </div>
    </label>
  );
}

export default function ChangePasswordPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-slate-950" />}>
      <ChangePasswordContent />
    </Suspense>
  );
}
