'use client';

import { useState, useEffect } from 'react';
import {
  Shield,
  User,
  X,
  Building2,
  Calendar,
  Mail,
  ShieldCheck,
  MapPin,
  IdCard
} from 'lucide-react';
import { supabase } from '@/lib/supabase';

export default function AdminNavbar({ title = "Admin Statistics & System Overview" }) {
  const [currentAdmin, setCurrentAdmin] = useState(null);
  const [profileModalOpen, setProfileModalOpen] = useState(false);

  useEffect(() => {
    fetchCurrentAdmin();
  }, []);

  const fetchCurrentAdmin = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data: profile } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', user.id)
          .single();

        setCurrentAdmin(profile || {
          email: user.email,
          role: 'admin',
          first_name: 'System',
          last_name: 'Admin'
        });
      }
    } catch (err) {
      console.error('Error fetching admin user:', err);
    }
  };

  // Extract initials for the profile badge
  const getInitials = () => {
    if (currentAdmin?.first_name && currentAdmin?.last_name) {
      return `${currentAdmin.first_name[0]}${currentAdmin.last_name[0]}`.toUpperCase();
    }
    if (currentAdmin?.email) {
      return currentAdmin.email[0].toUpperCase();
    }
    return 'A';
  };

  const fullName = currentAdmin?.first_name || currentAdmin?.last_name
    ? `${currentAdmin?.first_name || ''} ${currentAdmin?.last_name || ''}`.trim()
    : currentAdmin?.email || 'Administrator';

  return (
    <>
      {/* Top Navbar Header */}
      <header className="bg-[#111827] border border-slate-800 rounded-2xl p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center space-x-3">
          <div className="p-3 rounded-xl bg-indigo-600/20 border border-indigo-500/30 text-indigo-400">
            <Shield className="w-6 h-6 text-amber-400" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="bg-amber-500/20 text-amber-300 border border-amber-500/30 text-[10px] font-bold px-2.5 py-0.5 rounded-full uppercase tracking-wider">
                ADMINISTRATOR CONTROL
              </span>
            </div>
            <h1 className="text-lg sm:text-xl font-bold text-white mt-1">
              {title}
            </h1>
          </div>
        </div>

        {/* Clickable Profile Badge */}
        <button
          onClick={() => setProfileModalOpen(true)}
          className="flex items-center space-x-3 bg-[#030712] hover:bg-slate-900 border border-slate-800 hover:border-slate-700 px-3.5 py-2 rounded-xl transition text-left group cursor-pointer"
        >
          <div className="relative">
            <div className="w-9 h-9 rounded-xl bg-indigo-600 group-hover:bg-indigo-500 transition flex items-center justify-center text-white font-bold text-xs shadow-md shadow-indigo-600/20">
              {getInitials()}
            </div>
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 border-2 border-[#030712] absolute -bottom-0.5 -right-0.5 animate-pulse" />
          </div>

          <div className="text-left pr-1">
            <p className="text-xs font-semibold text-white truncate max-w-[140px] group-hover:text-indigo-300 transition">
              {fullName}
            </p>
            <p className="text-[10px] text-emerald-400 flex items-center gap-1 font-medium">
              Active Administrator
            </p>
          </div>
        </button>
      </header>

      {/* Profile Details Modal */}
      {profileModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#111827] border border-slate-800 rounded-2xl w-full max-w-md p-6 space-y-5 shadow-2xl relative animate-in fade-in zoom-in duration-150">
            {/* Modal Close Button */}
            <button
              onClick={() => setProfileModalOpen(false)}
              className="absolute top-4 right-4 p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition"
            >
              <X className="w-5 h-5" />
            </button>

            {/* Profile Banner / Header */}
            <div className="flex items-center space-x-4">
              <div className="w-14 h-14 rounded-2xl bg-indigo-600 border border-indigo-400/30 flex items-center justify-center text-white font-extrabold text-xl shadow-lg shadow-indigo-600/30">
                {getInitials()}
              </div>
              <div>
                <h3 className="text-lg font-bold text-white leading-tight">
                  {fullName}
                </h3>
                <div className="flex items-center gap-2 mt-1">
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full uppercase bg-amber-500/20 text-amber-300 border border-amber-500/30 flex items-center gap-1">
                    <ShieldCheck className="w-3 h-3 text-amber-400" />
                    {currentAdmin?.role || 'admin'}
                  </span>
                  <span className="text-[10px] text-emerald-400 flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                    Online
                  </span>
                </div>
              </div>
            </div>

            {/* Profile Detailed Info Block */}
            <div className="space-y-3 bg-[#030712] p-4 rounded-xl border border-slate-800 text-xs">
              <div className="flex items-center justify-between py-2 border-b border-slate-800/80">
                <span className="text-slate-400 flex items-center gap-2">
                  <Mail className="w-3.5 h-3.5 text-indigo-400" />
                  Email Address
                </span>
                <span className="text-slate-200 font-medium truncate max-w-[200px]">
                  {currentAdmin?.email || 'N/A'}
                </span>
              </div>

              <div className="flex items-center justify-between py-2 border-b border-slate-800/80">
                <span className="text-slate-400 flex items-center gap-2">
                  <MapPin className="w-3.5 h-3.5 text-emerald-400" />
                  Site Location
                </span>
                <span className="text-slate-200 font-medium">
                  {currentAdmin?.site_location || 'Head Office / Main Site'}
                </span>
              </div>

              <div className="flex items-center justify-between py-2 border-b border-slate-800/80">
                <span className="text-slate-400 flex items-center gap-2">
                  <IdCard className="w-3.5 h-3.5 text-amber-400" />
                  User System ID
                </span>
                <span className="font-mono text-slate-300 text-[11px] truncate max-w-[170px]">
                  {currentAdmin?.id || 'LOCAL_ADMIN'}
                </span>
              </div>

              <div className="flex items-center justify-between py-2">
                <span className="text-slate-400 flex items-center gap-2">
                  <Calendar className="w-3.5 h-3.5 text-sky-400" />
                  Member Since
                </span>
                <span className="text-slate-200 font-medium">
                  {currentAdmin?.created_at
                    ? new Date(currentAdmin.created_at).toLocaleDateString()
                    : 'Active'}
                </span>
              </div>
            </div>

            {/* Actions */}
            <div className="pt-2">
              <button
                onClick={() => setProfileModalOpen(false)}
                className="w-full py-2.5 bg-slate-800 hover:bg-slate-700 text-white text-xs font-semibold rounded-xl transition"
              >
                Close Profile
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}