'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter, usePathname } from 'next/navigation';
import {
  Building2,
  LayoutDashboard,
  Users,
  KeyRound,
  Clock,
  FileText,
  LogOut,
  Menu,
  X
} from 'lucide-react';
import { supabase } from '@/lib/supabase';

export default function AdminSideNav() {
  const router = useRouter();
  const pathname = usePathname();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    window.location.href = '/login';
  };

  const handleDashboardClick = (e) => {
    e.preventDefault();
    setMobileMenuOpen(false);
    if (pathname === '/dashboard/admin') {
      window.location.reload();
    } else {
      router.push('/dashboard/admin');
    }
  };

  const navItems = [
    {
      name: 'Dashboard',
      href: '/dashboard/admin',
      icon: LayoutDashboard,
      onClick: handleDashboardClick,
      exact: true,
    },
    {
      name: 'Employees & Staff',
      href: '/dashboard/admin/employees',
      icon: Users,
    },
    {
      name: 'Role Permissions',
      href: '/dashboard/admin/roles',
      icon: KeyRound,
    },
    {
      name: 'Shift Approvals Oversight',
      href: '/dashboard/admin/shifts',
      icon: Clock,
    },
    {
      name: 'System Audit Logs',
      href: '/dashboard/admin/audit',
      icon: FileText,
    },
  ];

  const renderNavLinks = () => (
    <nav className="space-y-1">
      {navItems.map((item) => {
        const Icon = item.icon;
        const isActive = item.exact
          ? pathname === item.href
          : pathname.startsWith(item.href);

        if (item.onClick) {
          return (
            <a
              key={item.name}
              href={item.href}
              onClick={item.onClick}
              className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl font-medium text-xs transition ${
                isActive
                  ? 'bg-amber-500 text-slate-950 font-bold shadow-lg shadow-amber-500/20'
                  : 'text-slate-300 hover:bg-slate-800/60 hover:text-white'
              }`}
            >
              <Icon className="w-4 h-4" />
              <span>{item.name}</span>
            </a>
          );
        }

        return (
          <Link
            key={item.name}
            href={item.href}
            onClick={() => setMobileMenuOpen(false)}
            className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl font-medium text-xs transition ${
              isActive
                ? 'bg-amber-500 text-slate-950 font-bold shadow-lg shadow-amber-500/20'
                : 'text-slate-300 hover:bg-slate-800/60 hover:text-white'
            }`}
          >
            <Icon className="w-4 h-4" />
            <span>{item.name}</span>
          </Link>
        );
      })}
    </nav>
  );

  return (
    <>
      {/* Mobile Top Header Toggle Bar */}
      <div className="lg:hidden bg-[#0F172A] border-b border-slate-800/80 p-4 flex items-center justify-between sticky top-0 z-40">
        <div className="flex items-center gap-2.5">
          <div className="p-2 rounded-lg bg-amber-500/20 border border-amber-500/30 text-amber-400">
            <Building2 className="w-4 h-4" />
          </div>
          <span className="font-bold text-white text-sm">Periscope Mining</span>
        </div>
        <button
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          className="p-2 text-slate-300 hover:text-white bg-slate-900 border border-slate-800 rounded-lg"
        >
          {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
        </button>
      </div>

      {/* Mobile Drawer Overlay */}
      {mobileMenuOpen && (
        <div className="lg:hidden fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex">
          <div className="w-72 bg-[#0F172A] border-r border-slate-800/80 p-5 flex flex-col justify-between h-full">
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="p-2.5 rounded-xl bg-amber-500/20 border border-amber-500/30 text-amber-400">
                    <Building2 className="w-5 h-5" />
                  </div>
                  <div>
                    <h1 className="font-bold text-white text-base leading-none">Periscope</h1>
                    <p className="text-[10px] text-amber-400 font-semibold uppercase tracking-wider mt-1">Admin Portal</p>
                  </div>
                </div>
                <button
                  onClick={() => setMobileMenuOpen(false)}
                  className="text-slate-400 hover:text-white"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {renderNavLinks()}
            </div>

            <div className="pt-4 border-t border-slate-800/80">
              <button
                onClick={handleLogout}
                className="w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-semibold text-rose-400 hover:bg-rose-500/10 transition"
              >
                <LogOut className="w-4 h-4" />
                <span>Sign Out</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Desktop Persistent Sidebar */}
      <aside className="hidden lg:flex w-64 bg-[#0F172A] border-r border-slate-800/80 p-4 flex-col justify-between shrink-0 sticky top-0 h-screen">
        <div className="space-y-6">
          <div className="flex items-center gap-3 px-2 pt-2">
            <div className="p-2.5 rounded-xl bg-amber-500/20 border border-amber-500/30 text-amber-400">
              <Building2 className="w-5 h-5" />
            </div>
            <div>
              <h1 className="font-bold text-white text-base leading-none">Periscope Mining</h1>
              <p className="text-[10px] text-amber-400 font-semibold uppercase tracking-wider mt-1">Admin Portal</p>
            </div>
          </div>

          {renderNavLinks()}
        </div>

        <div className="pt-4 border-t border-slate-800/80">
          <button
            onClick={handleLogout}
            className="w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-semibold text-rose-400 hover:bg-rose-500/10 transition"
          >
            <LogOut className="w-4 h-4" />
            <span>Sign Out</span>
          </button>
        </div>
      </aside>
    </>
  );
}