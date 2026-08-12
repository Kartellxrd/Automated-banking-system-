'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { 
  HardHat, 
  Clock, 
  QrCode, 
  Users, 
  ClipboardList, 
  LogOut, 
  ShieldCheck 
} from 'lucide-react';
import { supabase } from '@/lib/supabase';

export default function SiteClerkSideNav() {
  const pathname = usePathname();
  const router = useRouter();

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    router.push('/login');
  };

  const navLinks = [
    { name: 'Shift Overview', href: '/dashboard/site-clerk', icon: Clock },
    { name: 'Launch QR Kiosk', href: '/dashboard/site-clerk/kiosk', icon: QrCode },
  ];

  return (
    <aside className="w-full lg:w-64 bg-slate-900 text-slate-300 flex flex-col justify-between p-4 shrink-0 border-r border-slate-800">
      <div className="space-y-6">
        {/* Branding Header */}
        <div className="flex items-center gap-3 px-2 py-2 border-b border-slate-800">
          <div className="p-2 bg-indigo-600 text-white rounded-xl shadow-md">
            <HardHat className="w-6 h-6" />
          </div>
          <div>
            <h1 className="font-bold text-white text-sm tracking-wide">Periscope Field</h1>
            <p className="text-[10px] text-slate-400 font-semibold uppercase tracking-wider">Site Operations</p>
          </div>
        </div>

        {/* Navigation Items */}
        <nav className="space-y-1.5">
          {navLinks.map((link) => {
            const Icon = link.icon;
            const isActive = pathname === link.href;
            return (
              <Link
                key={link.href}
                href={link.href}
                className={`flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-semibold transition ${
                  isActive
                    ? 'bg-indigo-600 text-white shadow-sm shadow-indigo-600/30'
                    : 'text-slate-400 hover:bg-slate-800 hover:text-slate-200'
                }`}
              >
                <Icon className="w-4 h-4" />
                <span>{link.name}</span>
              </Link>
            );
          })}
        </nav>
      </div>

      {/* Session Controls */}
      <div className="pt-4 border-t border-slate-800 space-y-2">
        <button
          onClick={handleSignOut}
          className="w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-semibold text-rose-400 hover:bg-rose-500/10 hover:text-rose-300 transition"
        >
          <LogOut className="w-4 h-4" />
          <span>Sign Out</span>
        </button>
      </div>
    </aside>
  );
}