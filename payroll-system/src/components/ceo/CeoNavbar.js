'use client';

import { ShieldCheck, LockKeyhole } from 'lucide-react';
import ChangePasswordButton from '@/components/shared/ChangePasswordButton';

export default function CeoNavbar({ title, subtitle }) {
  return (
    <header className="bg-white border-b border-slate-200 text-slate-900 sticky top-0 z-30 shadow-xs">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 min-h-16 py-3 flex items-center justify-between gap-4">
        <div className="flex items-center gap-3 min-w-0">
          <div className="p-2.5 rounded-2xl bg-emerald-50 border border-emerald-100 text-emerald-600 shrink-0">
            <ShieldCheck className="w-5 h-5" />
          </div>
          <div className="min-w-0">
            <h1 className="text-sm font-black text-slate-900 tracking-wide truncate">{title}</h1>
            {subtitle && <p className="text-[11px] text-slate-500 font-medium line-clamp-2">{subtitle}</p>}
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <div className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-full text-slate-600 text-[11px] font-bold">
            <LockKeyhole className="w-3.5 h-3.5 text-emerald-600" /> Protected CEO Session
          </div>
          <ChangePasswordButton compact />
        </div>
      </div>
    </header>
  );
}
