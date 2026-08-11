'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter, usePathname } from 'next/navigation';
import {
  Building2,
  LayoutDashboard,
  Users,
  ShieldAlert,
  Sliders,
  LogOut,
  Menu,
  X,
  ChevronRight
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

  // Strictly Admin-only platform features
  const navItems = [
    {
      name: 'Dashboard Overview',
      href: '/dashboard/admin',
      icon: LayoutDashboard,
      onClick: handleDashboardClick,
      exact: true,
    },
    {
      name: 'User Provisioning',
      href: '/dashboard/admin/users',
      icon: Users,
    },
    {
      name: 'Access & Role Matrix',
      href: '/dashboard/admin/roles',
      icon: Sliders,
    },
    {
      name: 'Security & Audit Logs',
      href: '/dashboard/admin/audit',
      icon: ShieldAlert,
    },
  ];

  const renderNavLinks = () => (
    <nav className="space-y-1.5">
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
              className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-semibold transition-all ${
                isActive
                  ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/20'
                  : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
              }`}
            >
              <div className="flex items-center gap-3">
                <Icon className={`w-4 h-4 ${isActive ? 'text-white' : 'text-slate-400'}`} />
                <span>{item.name}</span>
              </div>
              {isActive && <ChevronRight className="w-3.5 h-3.5 text-indigo-200" />}
            </a>
          );
        }

        return (
          <Link
            key={item.name}
            href={item.href}
            onClick={() => setMobileMenuOpen(false)}
            className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-semibold transition-all ${
              isActive
                ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/20'
                : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
            }`}
          >
            <div className="flex items-center gap-3">
              <Icon className={`w-4 h-4 ${isActive ? 'text-white' : 'text-slate-400'}`} />
              <span>{item.name}</span>
            </div>
            {isActive && <ChevronRight className="w-3.5 h-3.5 text-indigo-200" />}
          </Link>
        );
      })}
    </nav>
  );

  return (
    <>
      {/* Mobile Top Navigation Header */}
      <div className="lg:hidden bg-white border-b border-slate-200 p-4 flex items-center justify-between sticky top-0 z-40 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-xl bg-indigo-50 border border-indigo-100 text-indigo-600">
            <Building2 className="w-4 h-4" />
          </div>
          <div>
            <span className="font-bold text-slate-900 text-sm block leading-none">Periscope Mining</span>
            <span className="text-[10px] text-indigo-600 font-bold uppercase tracking-wider">System Admin</span>
          </div>
        </div>
        <button
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          className="p-2 text-slate-600 hover:text-slate-900 bg-slate-100 border border-slate-200 rounded-lg transition"
        >
          {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
        </button>
      </div>

      {/* Mobile Drawer Overlay */}
      {mobileMenuOpen && (
        <div className="lg:hidden fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-sm flex">
          <div className="w-72 bg-white border-r border-slate-200 p-5 flex flex-col justify-between h-full shadow-2xl">
            <div className="space-y-6">
              <div className="flex items-center justify-between border-b border-slate-100 pb-4">
                <div className="flex items-center gap-3">
                  <div className="p-2.5 rounded-xl bg-indigo-50 border border-indigo-100 text-indigo-600">
                    <Building2 className="w-5 h-5" />
                  </div>
                  <div>
                    <h1 className="font-bold text-slate-900 text-base leading-none">Periscope</h1>
                    <p className="text-[10px] text-indigo-600 font-bold uppercase tracking-wider mt-1">Admin Portal</p>
                  </div>
                </div>
                <button
                  onClick={() => setMobileMenuOpen(false)}
                  className="p-1 text-slate-400 hover:text-slate-700 rounded-lg"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {renderNavLinks()}
            </div>

            <div className="pt-4 border-t border-slate-100">
              <button
                onClick={handleLogout}
                className="w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-semibold text-rose-600 hover:bg-rose-50 transition"
              >
                <LogOut className="w-4 h-4" />
                <span>Sign Out</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Desktop Persistent Sidebar */}
      <aside className="hidden lg:flex w-64 bg-white border-r border-slate-200 p-5 flex-col justify-between shrink-0 sticky top-0 h-screen shadow-sm">
        <div className="space-y-6">
          {/* Brand Header */}
          <div className="flex items-center gap-3 border-b border-slate-100 pb-4">
            <div className="p-2.5 rounded-xl bg-indigo-50 border border-indigo-100 text-indigo-600">
              <Building2 className="w-5 h-5" />
            </div>
            <div>
              <h1 className="font-bold text-slate-900 text-base leading-none">Periscope Mining</h1>
              <p className="text-[10px] text-indigo-600 font-bold uppercase tracking-wider mt-1">Admin Control Center</p>
            </div>
          </div>

          {/* Navigation Links */}
          {renderNavLinks()}
        </div>

        {/* Footer / Sign Out */}
        <div className="pt-4 border-t border-slate-100">
          <button
            onClick={handleLogout}
            className="w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-semibold text-rose-600 hover:bg-rose-50 transition"
          >
            <LogOut className="w-4 h-4 text-rose-500" />
            <span>Sign Out</span>
          </button>
        </div>
      </aside>
    </>
  );
}