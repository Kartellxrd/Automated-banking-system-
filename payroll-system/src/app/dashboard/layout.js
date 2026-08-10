'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { 
  Shield, 
  Users, 
  Clock, 
  CreditCard, 
  LogOut, 
  Menu, 
  X, 
  HardHat,
  LayoutDashboard
} from 'lucide-react';

export default function DashboardLayout({ children }) {
  const pathname = usePathname();
  const router = useRouter();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [userRole, setUserRole] = useState(null);
  const [userProfile, setUserProfile] = useState(null);

  useEffect(() => {
    async function loadUserProfile() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: profile } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single();

      if (profile) {
        setUserRole(profile.role);
        setUserProfile(profile);
      }
    }

    loadUserProfile();
  }, []);

  // Define navigation options based on user roles
  const getNavItems = () => {
    switch (userRole) {
      case 'admin':
        return [
          { label: 'Admin Control', href: '/dashboard/admin', icon: Shield },
          { label: 'Site Shift Logger', href: '/dashboard/site-clerk', icon: Clock },
          { label: 'Personnel & HR', href: '/dashboard/hr', icon: Users },
          { label: 'Disbursements', href: '/dashboard/accountant', icon: CreditCard },
        ];
      case 'site_clerk':
        return [
          { label: 'Shift Logger', href: '/dashboard/site-clerk', icon: Clock },
        ];
      case 'hr':
        return [
          { label: 'Personnel & HR', href: '/dashboard/hr', icon: Users },
        ];
      case 'accountant':
        return [
          { label: 'Disbursements', href: '/dashboard/accountant', icon: CreditCard },
        ];
      case 'ceo':
        return [
          { label: 'Executive Portal', href: '/dashboard/ceo', icon: LayoutDashboard },
          { label: 'Personnel Overview', href: '/dashboard/hr', icon: Users },
          { label: 'Payroll & Receipts', href: '/dashboard/accountant', icon: CreditCard },
        ];
      default:
        return [
          { label: 'Dashboard', href: pathname, icon: LayoutDashboard },
        ];
    }
  };

  const navItems = getNavItems();

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push('/login');
    router.refresh();
  };

  return (
    <div className="min-h-screen flex flex-col md:flex-row bg-slate-50">
      
      {/* Mobile Top Navigation Bar */}
      <header className="md:hidden bg-slate-900 text-white px-4 py-3 flex items-center justify-between border-b border-slate-800 sticky top-0 z-50">
        <div className="flex items-center gap-2">
          <HardHat className="w-6 h-6 text-amber-500" />
          <span className="font-bold text-base tracking-tight">Periscope Mining</span>
        </div>
        <button
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          className="p-2 text-slate-300 hover:text-white rounded-lg focus:outline-none"
        >
          {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
        </button>
      </header>

      {/* Sidebar Navigation (Desktop Permanent / Mobile Overlay) */}
      <aside className={`
        fixed inset-y-0 left-0 z-40 w-64 bg-slate-900 text-white flex flex-col justify-between p-4 transform transition-transform duration-200 ease-in-out md:translate-x-0 md:static md:z-auto
        ${mobileMenuOpen ? 'translate-x-0' : '-translate-x-full'}
      `}>
        <div className="space-y-6">
          {/* Brand Header */}
          <div className="hidden md:flex items-center gap-3 px-2 pt-2">
            <div className="p-2 bg-amber-500/10 rounded-xl text-amber-500">
              <HardHat className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-base font-bold text-white leading-none">Periscope Mining</h1>
              <p className="text-[10px] text-slate-400 font-medium tracking-wider uppercase mt-1">Workforce Management</p>
            </div>
          </div>

          {/* User Profile Badge */}
          {userProfile && (
            <div className="p-3 bg-slate-800/60 rounded-xl border border-slate-700/50">
              <p className="text-xs font-semibold text-white truncate">
                {userProfile.first_name} {userProfile.last_name}
              </p>
              <div className="flex items-center justify-between mt-1">
                <span className="text-[10px] font-bold text-amber-400 uppercase tracking-wider">
                  {userProfile.role?.replace('_', ' ')}
                </span>
                <span className="text-[10px] text-slate-400">{userProfile.site_location}</span>
              </div>
            </div>
          )}

          {/* Navigation Items */}
          <nav className="space-y-1.5">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = pathname === item.href;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setMobileMenuOpen(false)}
                  className={`flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-sm font-medium transition-all ${
                    isActive
                      ? 'bg-amber-500 text-slate-950 font-semibold shadow-md shadow-amber-500/20'
                      : 'text-slate-300 hover:bg-slate-800 hover:text-white'
                  }`}
                >
                  <Icon className="w-4 h-4 shrink-0" />
                  <span>{item.label}</span>
                </Link>
              );
            })}
          </nav>
        </div>

        {/* Footer / Sign Out */}
        <div className="pt-4 border-t border-slate-800">
          <button
            onClick={handleLogout}
            className="w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-sm font-medium text-red-400 hover:bg-red-500/10 transition-colors"
          >
            <LogOut className="w-4 h-4 shrink-0" />
            <span>Sign Out</span>
          </button>
        </div>
      </aside>

      {/* Backdrop for Mobile Overlay Sidebar */}
      {mobileMenuOpen && (
        <div
          onClick={() => setMobileMenuOpen(false)}
          className="fixed inset-0 bg-slate-950/60 z-30 md:hidden backdrop-blur-sm"
        />
      )}

      {/* Main Dashboard Content Area */}
      <main className="flex-1 min-w-0 overflow-y-auto">
        {children}
      </main>

    </div>
  );
}