import Link from 'next/link';
import { ClipboardCheck, ShieldCheck } from 'lucide-react';

export default function ClockInPage() {
  return (
    <main className="min-h-screen bg-slate-950 px-4 py-12 text-slate-100 flex items-center justify-center">
      <section className="w-full max-w-lg rounded-3xl border border-slate-800 bg-slate-900 p-7 sm:p-9 shadow-2xl text-center">
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl border border-indigo-500/30 bg-indigo-500/10 text-indigo-300">
          <ClipboardCheck className="h-7 w-7" />
        </div>
        <h1 className="mt-5 text-2xl font-black">Attendance is managed by the Site Clerk</h1>
        <p className="mt-3 text-sm leading-6 text-slate-400">
          Worker self-service clock-in and kiosk attendance are not part of Periscope V1. Site attendance is captured from the approved site process by the assigned Site Clerk, then reviewed by HR before payroll.
        </p>
        <div className="mt-6 rounded-2xl border border-emerald-500/20 bg-emerald-500/10 p-4 text-left text-sm text-emerald-200 flex gap-3">
          <ShieldCheck className="mt-0.5 h-5 w-5 shrink-0" />
          <span>This prevents an old kiosk flow from bypassing the Site Clerk → HR → Accountant payroll controls.</span>
        </div>
        <Link href="/login" className="mt-6 inline-flex rounded-xl bg-indigo-600 px-5 py-3 text-sm font-bold text-white hover:bg-indigo-500">Return to sign in</Link>
      </section>
    </main>
  );
}
