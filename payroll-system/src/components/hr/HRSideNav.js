'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter, usePathname } from 'next/navigation';
import {
  Building2,
  LayoutDashboard,
  FolderOpen,
  FileSearch,
  ShieldCheck,
  CheckSquare,
  FileText,
  LogOut,
  Menu,
  X,
  ChevronRight,
} from 'lucide-react';
import { supabase } from '@/lib/supabase';

export default function HRSideNav() {
  const [isOpen, setIsOpen] = useState(false);
  const router = useRouter();
  const pathname = usePathname();

  const handleSignOut = async () => {
    if (supabase) {
      await supabase.auth.signOut();
    }
    router.push('/login');
  };

  const navItems = [
    {
      name: 'Overview',
      href: '/dashboard/hr',
      icon: LayoutDashboard,
    },
    {
      name: 'Personnel Roster',
      href: '/dashboard/hr/employees',
      icon: FolderOpen,
    },
    {
      name: 'Document Docket & Vault',
      href: '/dashboard/hr/documents',
      icon: FileText,
    },
    {
      name: 'Document & Absence Review',
      href: '/dashboard/hr/absences',
      icon: FileSearch,
    },
    {
      name: 'Rate Card Pairing',
      href: '/dashboard/hr/compliance',
      icon: ShieldCheck,
    },
    {
      name: 'Payroll Staging Gate',
      href: '/dashboard/hr/staging',
      icon: CheckSquare,
    },
  ];

  return (
    <>
      {/* Mobile Top Toggle (Stays at the top of mobile viewports) */}
      <div className="lg:hidden sticky top-0 z-40 bg-slate-900 text-white p-4 flex items-center justify-between border-b border-slate-800">
        <div className="flex items-center gap-2">
          <div className="p-2 bg-indigo-600 rounded-xl text-white">
            <Building2 className="w-5 h-5" />
          </div>
          <span className="font-black text-base tracking-tight">HR Control</span>
        </div>
        <button
          onClick={() => setIsOpen(!isOpen)}
          className="p-2 text-slate-400 hover:text-white rounded-xl hover:bg-slate-800 transition"
        >
          {isOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
        </button>
      </div>

      {/* Invisible desktop spacer to prevent main content from hiding behind the fixed sidebar */}
      <div className="hidden lg:block w-72 shrink-0 h-screen" />

      {/* Fixed Navigation Sidebar */}
      <aside
        className={`fixed inset-y-0 left-0 z-50 w-72 h-screen bg-slate-900 text-slate-300 flex flex-col justify-between p-6 transition-transform duration-300 ease-in-out ${
          isOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
        }`}
      >
        <div className="space-y-8 overflow-y-auto">
          {/* Logo Header */}
          <div className="hidden lg:flex items-center gap-3 px-2">
            <div className="p-2.5 bg-indigo-600 rounded-2xl text-white shadow-lg shadow-indigo-600/30">
              <Building2 className="w-6 h-6" />
            </div>
            <div>
              <h2 className="font-black text-white text-lg tracking-tight leading-none">Automated Payroll</h2>
              <span className="text-[10px] font-extrabold text-indigo-400 uppercase tracking-widest">HR & Compliance</span>
            </div>
          </div>

          {/* Navigation Links */}
          <nav className="space-y-1.5">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = pathname === item.href;

              return (
                <Link
                  key={item.name}
                  href={item.href}
                  onClick={() => setIsOpen(false)}
                  className={`flex items-center justify-between px-4 py-3 rounded-2xl font-bold text-sm transition ${
                    isActive
                      ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/20'
                      : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <Icon className="w-5 h-5 shrink-0" />
                    <span>{item.name}</span>
                  </div>
                  {isActive && <ChevronRight className="w-4 h-4 opacity-80" />}
                </Link>
              );
            })}
          </nav>
        </div>

        {/* Footer Section */}
        <div className="pt-6 border-t border-slate-800 space-y-4 shrink-0">
          <div className="flex items-center gap-3 px-2 py-1">
            <div className="w-9 h-9 rounded-full bg-indigo-950 border border-indigo-700/50 flex items-center justify-center text-indigo-300 font-black text-xs shrink-0">
              HR
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-xs font-bold text-white truncate">Compliance Admin</p>
              <p className="text-[10px] text-slate-500 font-semibold truncate">hr@company.com</p>
            </div>
          </div>

          <button
            onClick={handleSignOut}
            className="w-full flex items-center justify-center gap-2 bg-slate-800/80 hover:bg-rose-500/10 hover:text-rose-400 text-slate-400 font-bold text-xs py-3 rounded-2xl transition border border-slate-700/50 hover:border-rose-500/30"
          >
            <LogOut className="w-4 h-4" />
            <span>Sign Out</span>
          </button>
        </div>
      </aside>

      {/* Mobile Backdrop */}
      {isOpen && (
        <div
          onClick={() => setIsOpen(false)}
          className="fixed inset-0 bg-slate-950/60 backdrop-blur-xs z-40 lg:hidden"
        />
      )}
    </>
  );
}