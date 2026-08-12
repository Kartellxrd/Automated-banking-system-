'use client';

import { HardHat, MapPin, QrCode } from 'lucide-react';
import Link from 'next/link';

export default function SiteClerkNavbar({ title = "Site Overview", siteName = "Debete Site" }) {
  return (
    <header className="bg-white border border-slate-200 rounded-2xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-xs">
      <div className="flex items-center gap-3">
        <div className="p-2 bg-slate-100 text-slate-700 rounded-xl border border-slate-200">
          <HardHat className="w-5 h-5 text-indigo-600" />
        </div>
        <div>
          <h1 className="text-base font-bold text-slate-900">{title}</h1>
          <div className="flex items-center gap-1.5 text-xs text-slate-500 font-medium mt-0.5">
            <MapPin className="w-3.5 h-3.5 text-emerald-600" />
            <span>Active Station: <strong className="text-slate-800">{siteName}</strong></span>
          </div>
        </div>
      </div>

      <div className="flex items-center gap-2">
        <Link
          href="/dashboard/site-clerk/kiosk"
          className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold px-4 py-2.5 rounded-xl transition shadow-xs"
        >
          <QrCode className="w-4 h-4" />
          <span>Launch QR Kiosk</span>
        </Link>
      </div>
    </header>
  );
}