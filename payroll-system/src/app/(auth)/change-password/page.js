'use client';

import { Suspense, useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { CheckCircle2, KeyRound, Loader2, ShieldAlert } from 'lucide-react';
import { supabase } from '@/lib/supabase';

function ChangePasswordContent() {
  const searchParams = useSearchParams();
  const [ready, setReady] = useState(false);
  const [loading, setLoading] = useState(false);
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
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
        if (!data.session) {
          throw new Error('This password reset link is invalid or has expired.');
        }

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
      const response = await fetch('/api/auth/change-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ newPassword: password }),
      });

      const result = await response.json();

      if (!response.ok || !result.success) {
        throw new Error(result.error || 'Could not update password.');
      }

      setMessage({ type: 'success', text: 'Password updated. Redirecting to sign in...' });
      await supabase.auth.signOut();

      setTimeout(() => {
        window.location.href = '/login';
      }, 1200);
    } catch (error) {
      setMessage({ type: 'error', text: error.message });
    } finally {
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
          <p className="mt-2 text-sm text-slate-400">Choose a new password for your Periscope system account.</p>
        </div>

        {message.text && (
          <div className={`mb-5 flex items-start gap-2 rounded-xl border p-3 text-sm ${
            message.type === 'success'
              ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-300'
              : 'border-rose-500/30 bg-rose-500/10 text-rose-300'
          }`}>
            {message.type === 'success' ? <CheckCircle2 className="h-4 w-4 mt-0.5" /> : <ShieldAlert className="h-4 w-4 mt-0.5" />}
            <span>{message.text}</span>
          </div>
        )}

        {!message.text && !ready ? (
          <div className="flex items-center justify-center gap-2 py-8 text-sm text-slate-400">
            <Loader2 className="h-4 w-4 animate-spin" /> Verifying reset link...
          </div>
        ) : ready ? (
          <form onSubmit={handleSubmit} className="space-y-4">
            <label className="block">
              <span className="mb-1.5 block text-xs font-semibold text-slate-300">New password</span>
              <input
                type="password"
                required
                minLength={10}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-3 text-sm outline-none focus:border-indigo-500"
                placeholder="Minimum 10 characters"
              />
            </label>

            <label className="block">
              <span className="mb-1.5 block text-xs font-semibold text-slate-300">Confirm password</span>
              <input
                type="password"
                required
                minLength={10}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-3 text-sm outline-none focus:border-indigo-500"
                placeholder="Repeat new password"
              />
            </label>

            <button
              type="submit"
              disabled={loading}
              className="mt-2 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-indigo-600 px-4 py-3 text-sm font-semibold text-white hover:bg-indigo-500 disabled:opacity-60"
            >
              {loading && <Loader2 className="h-4 w-4 animate-spin" />}
              Update Password
            </button>
          </form>
        ) : null}
      </div>
    </div>
  );
}

export default function ChangePasswordPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-slate-950" />}>
      <ChangePasswordContent />
    </Suspense>
  );
}
