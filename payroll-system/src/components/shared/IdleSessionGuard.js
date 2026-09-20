'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { usePathname } from 'next/navigation';
import { Clock3, LogOut } from 'lucide-react';
import { supabase } from '@/lib/supabase';

const IDLE_TIMEOUT_MS = 15 * 60 * 1000;
const WARNING_BEFORE_MS = 60 * 1000;

export default function IdleSessionGuard() {
  const pathname = usePathname();
  const [warningOpen, setWarningOpen] = useState(false);
  const [secondsLeft, setSecondsLeft] = useState(60);
  const warningTimerRef = useRef(null);
  const logoutTimerRef = useRef(null);
  const countdownRef = useRef(null);
  const lastActivityRef = useRef(Date.now());

  const isProtectedArea = pathname?.startsWith('/dashboard');

  const clearTimers = useCallback(() => {
    if (warningTimerRef.current) clearTimeout(warningTimerRef.current);
    if (logoutTimerRef.current) clearTimeout(logoutTimerRef.current);
    if (countdownRef.current) clearInterval(countdownRef.current);
    warningTimerRef.current = null;
    logoutTimerRef.current = null;
    countdownRef.current = null;
  }, []);

  const signOutForInactivity = useCallback(async () => {
    clearTimers();
    try {
      await supabase.auth.signOut({ scope: 'local' });
    } catch (error) {
      console.error('Idle sign-out error:', error);
    } finally {
      window.location.replace('/login?error=session_timeout');
    }
  }, [clearTimers]);

  const startTimers = useCallback(() => {
    if (!isProtectedArea) return;

    clearTimers();
    setWarningOpen(false);
    setSecondsLeft(60);
    lastActivityRef.current = Date.now();

    warningTimerRef.current = setTimeout(() => {
      setWarningOpen(true);
      setSecondsLeft(Math.ceil(WARNING_BEFORE_MS / 1000));

      const warningStartedAt = Date.now();
      countdownRef.current = setInterval(() => {
        const remaining = Math.max(
          0,
          Math.ceil((WARNING_BEFORE_MS - (Date.now() - warningStartedAt)) / 1000)
        );
        setSecondsLeft(remaining);
      }, 1000);
    }, IDLE_TIMEOUT_MS - WARNING_BEFORE_MS);

    logoutTimerRef.current = setTimeout(signOutForInactivity, IDLE_TIMEOUT_MS);
  }, [clearTimers, isProtectedArea, signOutForInactivity]);

  useEffect(() => {
    if (!isProtectedArea) {
      clearTimers();
      setWarningOpen(false);
      return;
    }

    startTimers();

    const activityEvents = ['mousedown', 'keydown', 'touchstart', 'scroll'];
    const onActivity = () => {
      const now = Date.now();
      if (now - lastActivityRef.current < 1000) return;
      startTimers();
    };

    activityEvents.forEach((eventName) => window.addEventListener(eventName, onActivity, { passive: true }));
    return () => {
      activityEvents.forEach((eventName) => window.removeEventListener(eventName, onActivity));
      clearTimers();
    };
  }, [clearTimers, isProtectedArea, startTimers]);

  if (!isProtectedArea || !warningOpen) return null;

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center bg-slate-950/65 p-4 backdrop-blur-sm" role="dialog" aria-modal="true" aria-labelledby="idle-session-title">
      <div className="w-full max-w-md rounded-3xl border border-slate-200 bg-white p-6 shadow-2xl">
        <div className="flex items-start gap-3">
          <div className="rounded-2xl bg-amber-50 p-3 text-amber-600">
            <Clock3 className="h-5 w-5" />
          </div>
          <div>
            <h2 id="idle-session-title" className="text-lg font-black text-slate-950">Session expiring soon</h2>
            <p className="mt-1 text-sm leading-6 text-slate-600">
              For security, you will be signed out after 15 minutes of inactivity.
            </p>
          </div>
        </div>

        <div className="mt-5 rounded-2xl bg-slate-50 p-4 text-center">
          <div className="text-3xl font-black text-slate-950">{secondsLeft}s</div>
          <div className="mt-1 text-xs font-semibold uppercase tracking-wider text-slate-400">until sign out</div>
        </div>

        <div className="mt-5 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <button type="button" onClick={signOutForInactivity} className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-bold text-slate-700 hover:bg-slate-50">
            <LogOut className="h-4 w-4" />
            Sign out now
          </button>
          <button type="button" onClick={startTimers} className="rounded-xl bg-indigo-600 px-4 py-2.5 text-sm font-black text-white hover:bg-indigo-500">
            Stay signed in
          </button>
        </div>
      </div>
    </div>
  );
}
