'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter, usePathname } from 'next/navigation';
import {
  Building2,
  LayoutDashboard,
  ShieldCheck,
  ReceiptText,
  WalletCards,
  LogOut,
  Menu,
  X,
  ChevronRight,
  ShieldAlert,
} from 'lucide-react';
import { supabase } from '@/lib/supabase';

export default function CeoSideNav() {
  const router = useRouter();
  const pathname = usePathname();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const handleLogout = async () => {
    if (supabase) await supabase.auth.signOut();
    window.location.href = '/login';
  };

  const handleDashboardClick = (event) => {
    event.preventDefault();
    setMobileMenuOpen(false);
    if (pathname === '/dashboard/ceo') window.location.reload();
    else router.push('/dashboard/ceo');
  };

  const navItems = [
    {
      name: 'Executive Overview',
      href: '/dashboard/ceo',
      icon: LayoutDashboard,
      onClick: handleDashboardClick,
      exact: true,
    },
    {
      name: 'Payroll Approval',
      href: '/dashboard/ceo/review',
      icon: ShieldCheck,
    },
    {
      name: 'Expense Approval',
      href: '/dashboard/ceo/expenses',
      icon: ReceiptText,
    },
    {
      name: 'Payment Center',
      href: '/dashboard/ceo/payments',
      icon: WalletCards,
    },
  ];

  const renderNavLinks = () => (
    <nav className="space-y-2">
      {navItems.map((item) => {
        const Icon = item.icon;
        const isActive = item.exact ? pathname === item.href : pathname.startsWith(item.href);
        const activeClass = isActive
          ? 'bg-emerald-600 text-white shadow-md shadow-emerald-600/25 font-bold'
          : 'text-slate-600 hover:bg-emerald-50 hover:text-emerald-700 font-medium';
        const className = `w-full flex items-center justify-between px-4 py-3 rounded-2xl text-sm transition-all duration-200 group active:scale-[0.98] ${activeClass}`;
        const body = (
          <>
            <div className="flex items-center gap-3.5">
              <Icon className={`w-5 h-5 transition-transform duration-200 group-hover:scale-110 ${isActive ? 'text-white' : 'text-slate-400 group-hover:text-emerald-600'}`} />
              <span>{item.name}</span>
            </div>
            {isActive && <ChevronRight className="w-4 h-4 text-emerald-200" />}
          </>
        );

        return item.onClick ? (
          <a key={item.name} href={item.href} onClick={item.onClick} className={className}>{body}</a>
        ) : (
          <Link key={item.name} href={item.href} onClick={() => setMobileMenuOpen(false)} className={className}>{body}</Link>
        );
      })}
    </nav>
  );

  const brand = (
    <div className="flex items-center gap-3.5 border-b border-slate-100 pb-5">
      <div className="p-3 rounded-2xl bg-emerald-50 border border-emerald-100 text-emerald-600 shrink-0">
        <Building2 className="w-6 h-6" />
      </div>
      <div>
        <h1 className="font-black text-slate-900 text-base leading-none">Periscope Mining</h1>
        <p className="text-[11px] text-emerald-600 font-extrabold uppercase tracking-wider mt-1">CEO Control Center</p>
      </div>
    </div>
  );

  const signOut = (
    <button onClick={handleLogout} className="w-full flex items-center gap-3.5 px-4 py-3 rounded-2xl text-sm font-bold text-rose-600 hover:bg-rose-50 transition active:scale-[0.98] cursor-pointer">
      <LogOut className="w-5 h-5 text-rose-500" />
      <span>Sign Out</span>
    </button>
  );

  return (
    <>
      <div className="lg:hidden bg-white border-b border-slate-200 p-4 flex items-center justify-between sticky top-0 z-40 shadow-xs">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-2xl bg-emerald-50 border border-emerald-100 text-emerald-600">
            <ShieldAlert className="w-5 h-5" />
          </div>
          <div>
            <span className="font-extrabold text-slate-900 text-sm block leading-tight">Periscope Mining</span>
            <span className="text-[11px] text-emerald-600 font-bold uppercase tracking-wider">CEO Control Center</span>
          </div>
        </div>
        <button onClick={() => setMobileMenuOpen(!mobileMenuOpen)} className="p-2.5 text-slate-700 hover:text-emerald-600 bg-slate-100 hover:bg-emerald-50 border border-slate-200 rounded-xl transition active:scale-95 cursor-pointer">
          {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
        </button>
      </div>

      {mobileMenuOpen && (
        <div className="lg:hidden fixed inset-0 z-50 bg-slate-950/50 backdrop-blur-xs flex">
          <div className="w-80 bg-white border-r border-slate-200 p-6 flex flex-col justify-between h-full shadow-2xl">
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <div className="flex-1">{brand}</div>
                <button onClick={() => setMobileMenuOpen(false)} className="ml-3 p-2 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-xl transition"><X className="w-5 h-5" /></button>
              </div>
              {renderNavLinks()}
            </div>
            <div className="pt-4 border-t border-slate-100">{signOut}</div>
          </div>
        </div>
      )}

      <aside className="hidden lg:flex w-72 bg-white border-r border-slate-200 p-6 flex-col justify-between shrink-0 sticky top-0 h-screen shadow-xs">
        <div className="space-y-6">
          {brand}
          {renderNavLinks()}
        </div>
        <div className="pt-4 border-t border-slate-100">{signOut}</div>
      </aside>
    </>
  );
}
