'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { Building2, CalendarDays, ChevronRight, ClipboardCheck, CreditCard, FileText, LayoutDashboard, LogOut, Menu, Users, X } from 'lucide-react';
import { supabase } from '@/lib/supabase';

export default function HRSideNav() {
  const [isOpen, setIsOpen] = useState(false);
  const pathname = usePathname();
  const router = useRouter();

  const navItems = [
    { name: 'Dashboard', href: '/dashboard/hr', icon: LayoutDashboard, exact: true },
    { name: 'Roster Review', href: '/dashboard/hr/rosters', icon: ClipboardCheck },
    { name: 'Employees', href: '/dashboard/hr/employees', icon: Users },
    { name: 'Document Vault', href: '/dashboard/hr/documents', icon: FileText },
    { name: 'Payment Details', href: '/dashboard/hr/payouts', icon: CreditCard },
    { name: 'Absence & Leave', href: '/dashboard/hr/absences', icon: CalendarDays },
  ];

  async function handleSignOut() {
    await supabase.auth.signOut();
    router.push('/login');
  }

  const links = (
    <nav className="space-y-1.5">
      {navItems.map((item) => {
        const Icon = item.icon;
        const active = item.exact ? pathname === item.href : pathname.startsWith(item.href);
        return (
          <Link key={item.name} href={item.href} onClick={() => setIsOpen(false)} className={`flex items-center justify-between px-4 py-3 rounded-2xl text-sm font-bold transition ${active ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/20' : 'text-slate-400 hover:text-white hover:bg-slate-800/70'}`}>
            <span className="flex items-center gap-3"><Icon className="w-5 h-5" />{item.name}</span>
            {active && <ChevronRight className="w-4 h-4 text-indigo-200" />}
          </Link>
        );
      })}
    </nav>
  );

  return (
    <>
      <div className="lg:hidden sticky top-0 z-40 bg-slate-950 text-white p-4 flex items-center justify-between border-b border-slate-800">
        <div className="flex items-center gap-3"><div className="p-2.5 bg-indigo-600 rounded-2xl"><Building2 className="w-5 h-5" /></div><div><div className="font-black text-sm">Periscope Mining</div><div className="text-[10px] uppercase tracking-wider font-bold text-indigo-300">HR Portal</div></div></div>
        <button onClick={() => setIsOpen(!isOpen)} className="p-2.5 rounded-xl bg-slate-900 text-slate-300">{isOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}</button>
      </div>

      <div className="hidden lg:block w-72 shrink-0" />
      <aside className={`fixed inset-y-0 left-0 z-50 w-72 bg-slate-950 text-slate-300 p-6 flex flex-col justify-between transition-transform ${isOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}`}>
        <div className="space-y-7 overflow-y-auto">
          <div className="flex items-center gap-3 border-b border-slate-800 pb-5"><div className="p-3 bg-indigo-600 rounded-2xl text-white"><Building2 className="w-6 h-6" /></div><div><h2 className="font-black text-white">Periscope Mining</h2><p className="text-[10px] uppercase tracking-[0.16em] font-bold text-indigo-300">HR & Workforce</p></div></div>
          {links}
          <div className="rounded-2xl border border-slate-800 bg-slate-900/70 p-4 text-xs leading-5 text-slate-400"><span className="font-bold text-slate-200">HR ownership</span><br />Employees → documents → verified payout details → attendance approval → payroll-ready data.</div>
        </div>
        <button onClick={handleSignOut} className="flex items-center justify-center gap-2 rounded-2xl border border-slate-800 bg-slate-900 px-4 py-3 text-sm font-bold text-rose-400 hover:bg-rose-500/10"><LogOut className="w-4 h-4" />Sign Out</button>
      </aside>

      {isOpen && <button aria-label="Close navigation" onClick={() => setIsOpen(false)} className="fixed inset-0 z-40 bg-slate-950/60 lg:hidden" />}
    </>
  );
}
