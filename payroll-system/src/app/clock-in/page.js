'use client';

import { useEffect, useState, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { CheckCircle2, AlertCircle, Clock, ShieldCheck, Loader2 } from 'lucide-react';
import { createClient } from '@supabase/supabase-js';

// Initialize Supabase Client directly
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';
const supabase = createClient(supabaseUrl, supabaseAnonKey);

function ClockInContent() {
  const searchParams = useSearchParams();
  const token = searchParams.get('token');

  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);
  const [site, setSite] = useState('');

  useEffect(() => {
    if (token) {
      try {
        const decoded = JSON.parse(atob(token));
        setSite(decoded.site || 'Site Terminal');
      } catch (err) {
        setError('Invalid or expired QR token.');
      }
    }
  }, [token]);

  const handleAction = async (actionType) => {
    setLoading(true);
    setError(null);
    setResult(null);

    try {
      // 1. Get authenticated user session
      const { data: { user }, error: authError } = await supabase.auth.getUser();

      if (authError || !user) {
        throw new Error('You must be logged in on this device to submit attendance.');
      }

      const endpoint = actionType === 'clock-in' ? '/api/kiosk/clock-in' : '/api/kiosk/clock-out';

      // 2. Send user_id along with site payload
      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          user_id: user.id,
          site_location: site,
          verification_method: 'kiosk_qr',
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Action failed');
      }

      setResult({
        type: actionType,
        message: data.message,
        employee: data.employee,
      });
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  if (!token) {
    return (
      <div className="p-6 text-center text-slate-600">
        <AlertCircle className="w-10 h-10 mx-auto text-amber-500 mb-2" />
        <p className="font-bold">No valid scan token found.</p>
        <p className="text-xs">Please scan the live QR code directly from the Kiosk screen.</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-900 text-white flex flex-col items-center justify-center p-4 font-sans">
      <div className="bg-slate-800 border border-slate-700 p-6 sm:p-8 rounded-3xl max-w-sm w-full shadow-2xl text-center space-y-6">
        
        {/* Terminal Header */}
        <div className="inline-flex items-center gap-2 bg-indigo-500/10 border border-indigo-500/30 text-indigo-400 px-3 py-1 rounded-full text-xs font-semibold">
          <ShieldCheck className="w-4 h-4" />
          <span>{site} Terminal</span>
        </div>

        <div>
          <h1 className="text-xl font-extrabold tracking-tight">Periscope Attendance</h1>
          <p className="text-xs text-slate-400 mt-1">Select an action to submit your attendance record.</p>
        </div>

        {/* Feedback Alerts */}
        {error && (
          <div className="p-3 bg-red-500/10 border border-red-500/30 text-red-400 text-xs rounded-2xl flex items-center gap-2 text-left">
            <AlertCircle className="w-5 h-5 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {result && (
          <div className="p-4 bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs rounded-2xl flex flex-col items-center gap-1">
            <CheckCircle2 className="w-8 h-8 text-emerald-400 mb-1" />
            <span className="font-bold text-sm">{result.message}</span>
            <span className="text-[11px] text-emerald-300/80">
              Employee: {result.employee?.name}
            </span>
          </div>
        )}

        {/* Action Buttons */}
        <div className="space-y-3 pt-2">
          <button
            onClick={() => handleAction('clock-in')}
            disabled={loading}
            className="w-full py-3.5 bg-emerald-600 hover:bg-emerald-500 active:scale-[0.98] text-white text-sm font-bold rounded-2xl shadow-lg transition flex items-center justify-center gap-2 disabled:opacity-50"
          >
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Clock className="w-4 h-4" />}
            <span>Clock In</span>
          </button>

          <button
            onClick={() => handleAction('clock-out')}
            disabled={loading}
            className="w-full py-3.5 bg-slate-700 hover:bg-slate-600 active:scale-[0.98] text-slate-200 text-sm font-bold rounded-2xl transition flex items-center justify-center gap-2 disabled:opacity-50"
          >
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Clock className="w-4 h-4" />}
            <span>Clock Out</span>
          </button>
        </div>

      </div>
    </div>
  );
}

export default function ClockInPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-slate-900 flex items-center justify-center text-white">
        <Loader2 className="w-8 h-8 animate-spin text-indigo-500" />
      </div>
    }>
      <ClockInContent />
    </Suspense>
  );
}