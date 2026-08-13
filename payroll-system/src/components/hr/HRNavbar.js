'use client';

import { useState, useEffect } from 'react';
import { Bell, Search, UserCheck } from 'lucide-react';
import { supabase } from '@/lib/supabase';

export default function HRNavbar() {
  const [userName, setUserName] = useState('HR Manager');
  const [userEmail, setUserEmail] = useState('');

  useEffect(() => {
    async function getUserDetails() {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        setUserEmail(user.email || '');
        setUserName(user.user_metadata?.full_name || user.email?.split('@')[0] || 'HR Manager');
      }
    }
    getUserDetails();
  }, []);

  return (
    <header className="bg-white border-b border-slate-200 px-6 py-4 sticky top-0 z-30 flex items-center justify-between gap-4 shadow-xs">
      {/* Search Input */}
      <div className="relative flex-1 max-w-md hidden sm:block">
        <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
        <input
          type="text"
          placeholder="Search employee documents, rate cards, or bank details..."
          className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white transition"
        />
      </div>

      {/* Right Controls */}
      <div className="flex items-center gap-4 ml-auto">
        <button className="relative p-2.5 text-slate-500 hover:text-indigo-600 hover:bg-slate-100 rounded-xl transition cursor-pointer">
          <Bell className="w-5 h-5" />
          <span className="absolute top-2 right-2 w-2 h-2 bg-indigo-600 rounded-full ring-2 ring-white"></span>
        </button>

        <div className="h-6 w-px bg-slate-200"></div>

        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-indigo-100 text-indigo-700 flex items-center justify-center font-bold text-sm border border-indigo-200">
            {userName.charAt(0).toUpperCase()}
          </div>
          <div className="hidden md:block leading-tight">
            <span className="font-bold text-slate-900 text-xs block">{userName}</span>
            <span className="text-[10px] text-slate-500 font-medium block truncate max-w-[140px]">{userEmail || 'Compliance Lead'}</span>
          </div>
        </div>
      </div>
    </header>
  );
}