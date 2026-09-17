'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { Banknote, Building2, Calculator, ChevronRight, CreditCard, FileCheck2, LogOut, Menu, Receipt, X } from 'lucide-react';
import { supabase } from '@/lib/supabase';

export default function AccSideNav() {
  const pathname = usePathname();
  const router = useRouter();
  const [open, setOpen] = useState(false);

  const navItems = [
    { name: 'Dashboard', href: '/dashboard/accountant', icon: Calculator, exact: true },
    { name: 'Payroll Preparation', href: '/dashboard/accountant/staging', icon: FileCheck2 },
    { name: 'Payment Execution', href: '/dashboard/accountant/payments', icon: CreditCard },
    { name: 'Expense Requests', href: '/dashboard/accountant/expense-requests', icon: Banknote },
    { name: 'Expenses Ledger', href: '/dashboard/accountant/expenses', icon: Receipt },
  ];

  async function signOut() {
    await supabase.auth.signOut();
    router.push('/login');
  }

  const links = <nav className="space-y-1.5">{navItems.map((item) => {
    const Icon = item.icon;
    const active = item.exact ? pathname === item.href : pathname.startsWith(item.href);
    return <Link key={item.name} href={item.href} onClick={() => setOpen(false)} className={`flex items-center justify-between rounded-2xl px-4 py-3 text-sm font-bold transition ${active ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/20' : 'text-slate-500 hover:bg-indigo-50 hover:text-indigo-700'}`}><span className="flex items-center gap-3"><Icon className="w-5 h-5" />{item.name}</span>{active && <ChevronRight className="w-4 h-4" />}</Link>;
  })}</nav>;

  return <>
    <div className="lg:hidden sticky top-0 z-40 bg-white border-b border-slate-200 p-4 flex items-center justify-between"><div className="flex items-center gap-3"><div className="rounded-xl bg-indigo-50 p-2.5 text-indigo-600"><Calculator className="w-5 h-5" /></div><div><div className="font-black text-sm">Periscope</div><div className="text-[10px] uppercase tracking-wider text-indigo-600 font-bold">Accountant</div></div></div><button onClick={() => setOpen(!open)} className="rounded-xl bg-slate-100 p-2.5 text-slate-600">{open ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}</button></div>
    <div className="hidden lg:block w-72 shrink-0" />
    <aside className={`fixed inset-y-0 left-0 z-50 w-72 bg-white border-r border-slate-200 p-6 flex flex-col justify-between transition-transform ${open ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}`}><div className="space-y-8"><div className="flex items-center gap-3 border-b border-slate-100 pb-5"><div className="rounded-2xl bg-indigo-50 p-3 text-indigo-600"><Building2 className="w-6 h-6" /></div><div><div className="font-black">Periscope Mining</div><div className="text-[10px] uppercase tracking-wider text-indigo-600 font-bold">Finance & Payroll</div></div></div>{links}</div><button onClick={signOut} className="rounded-2xl px-4 py-3 text-sm font-bold text-rose-600 hover:bg-rose-50 flex items-center gap-3"><LogOut className="w-5 h-5" />Sign Out</button></aside>
    {open && <button onClick={() => setOpen(false)} className="fixed inset-0 z-40 bg-slate-950/50 lg:hidden" aria-label="Close menu" />}
  </>;
}
