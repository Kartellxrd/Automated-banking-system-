'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Building2, CalendarCheck, ChevronRight, FileUp, HardHat, LayoutDashboard, LogOut, Menu, X } from 'lucide-react';
import { supabase } from '@/lib/supabase';

export default function SiteClerkSideNav() {
  const pathname = usePathname();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const navItems = [
    { name: 'Dashboard', href: '/dashboard/site-clerk', icon: LayoutDashboard, exact: true },
    { name: 'Paper Timesheet', href: '/dashboard/site-clerk/timesheet-upload', icon: FileUp },
    { name: 'Daily Roster', href: '/dashboard/site-clerk/roster', icon: CalendarCheck },
  ];

  async function handleLogout() {
    await supabase.auth.signOut();
    window.location.href = '/login';
  }

  const renderLinks = () => (
    <nav className="space-y-2">
      {navItems.map((item) => {
        const Icon = item.icon;
        const active = item.exact ? pathname === item.href : pathname.startsWith(item.href);
        return (
          <Link
            key={item.name}
            href={item.href}
            onClick={() => setMobileMenuOpen(false)}
            className={`w-full flex items-center justify-between px-4 py-3 rounded-2xl text-sm transition ${active ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/20 font-bold' : 'text-slate-600 hover:bg-indigo-50 hover:text-indigo-700 font-semibold'}`}
          >
            <div className="flex items-center gap-3.5"><Icon className={`w-5 h-5 ${active ? 'text-white' : 'text-slate-400'}`} /><span>{item.name}</span></div>
            {active && <ChevronRight className="w-4 h-4 text-indigo-200" />}
          </Link>
        );
      })}
    </nav>
  );

  return (
    <>
      <div className="lg:hidden bg-white border-b border-slate-200 p-4 flex items-center justify-between sticky top-0 z-40 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-2xl bg-indigo-50 border border-indigo-100 text-indigo-600"><HardHat className="w-5 h-5" /></div>
          <div><span className="font-extrabold text-slate-900 text-sm block leading-tight">Periscope Mining</span><span className="text-[11px] text-indigo-600 font-bold uppercase tracking-wider">Site Clerk Portal</span></div>
        </div>
        <button onClick={() => setMobileMenuOpen(!mobileMenuOpen)} className="p-2.5 text-slate-700 bg-slate-100 border border-slate-200 rounded-xl">{mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}</button>
      </div>

      {mobileMenuOpen && (
        <div className="lg:hidden fixed inset-0 z-50 bg-slate-950/50 backdrop-blur-sm flex">
          <div className="w-80 bg-white border-r border-slate-200 p-6 flex flex-col justify-between h-full shadow-2xl">
            <div className="space-y-6">
              <div className="flex items-center justify-between border-b border-slate-100 pb-4">
                <div className="flex items-center gap-3"><div className="p-3 rounded-2xl bg-indigo-50 text-indigo-600"><Building2 className="w-6 h-6" /></div><div><h1 className="font-black text-slate-900">Periscope</h1><p className="text-[11px] text-indigo-600 font-bold uppercase tracking-wider">Site Clerk</p></div></div>
                <button onClick={() => setMobileMenuOpen(false)} className="p-2 text-slate-400 hover:bg-slate-100 rounded-xl"><X className="w-5 h-5" /></button>
              </div>
              {renderLinks()}
            </div>
            <button onClick={handleLogout} className="w-full flex items-center gap-3.5 px-4 py-3 rounded-2xl text-sm font-bold text-rose-600 hover:bg-rose-50"><LogOut className="w-5 h-5" />Sign Out</button>
          </div>
        </div>
      )}

      <aside className="hidden lg:flex w-72 bg-white border-r border-slate-200 p-6 flex-col justify-between shrink-0 sticky top-0 h-screen shadow-sm">
        <div className="space-y-6">
          <div className="flex items-center gap-3.5 border-b border-slate-100 pb-5"><div className="p-3 rounded-2xl bg-indigo-50 border border-indigo-100 text-indigo-600"><Building2 className="w-6 h-6" /></div><div><h1 className="font-black text-slate-900 text-base">Periscope Mining</h1><p className="text-[11px] text-indigo-600 font-extrabold uppercase tracking-wider">Site Clerk Control</p></div></div>
          {renderLinks()}
          <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 text-xs text-slate-500"><span className="font-bold text-slate-700">Field workflow</span><br />Paper sheet → extraction → clerk verification → digital roster → HR.</div>
        </div>
        <button onClick={handleLogout} className="w-full flex items-center gap-3.5 px-4 py-3 rounded-2xl text-sm font-bold text-rose-600 hover:bg-rose-50"><LogOut className="w-5 h-5" />Sign Out</button>
      </aside>
    </>
  );
}
