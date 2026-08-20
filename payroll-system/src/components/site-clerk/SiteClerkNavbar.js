'use client';

import { useState, useEffect, useRef } from 'react';
import { 
  HardHat, 
  MapPin, 
  KeyRound, 
  X, 
  Loader2, 
  CheckCircle, 
  AlertCircle, 
  User, 
  LogOut, 
  ChevronDown 
} from 'lucide-react';
import { supabase } from '@/lib/supabase';

export default function SiteClerkNavbar({ title = "Site Overview", siteName = "Debete Site" }) {
  const [user, setUser] = useState(null);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState({ type: '', message: '' });

  const dropdownRef = useRef(null);

  // Load current authenticated user details
  useEffect(() => {
    async function getUser() {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        setUser(user);
      }
    }
    getUser();
  }, []);

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsDropdownOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleOpenModal = () => {
    setIsDropdownOpen(false);
    setNewPassword('');
    setConfirmPassword('');
    setStatus({ type: '', message: '' });
    setIsModalOpen(true);
  };

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    window.location.href = '/login';
  };

  const handleChangePassword = async (e) => {
    e.preventDefault();
    setStatus({ type: '', message: '' });

    if (newPassword.length < 6) {
      setStatus({ type: 'error', message: 'Password must be at least 6 characters long.' });
      return;
    }

    if (newPassword !== confirmPassword) {
      setStatus({ type: 'error', message: 'Passwords do not match.' });
      return;
    }

    try {
      setLoading(true);
      const res = await fetch('/api/auth/change-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ newPassword }),
      });

      const data = await res.json();

      if (res.ok) {
        setStatus({ type: 'success', message: 'Password updated successfully!' });
        setTimeout(() => {
          setIsModalOpen(false);
        }, 1500);
      } else {
        setStatus({ type: 'error', message: data.error || 'Failed to update password.' });
      }
    } catch (err) {
      console.error(err);
      setStatus({ type: 'error', message: 'An unexpected error occurred.' });
    } finally {
      setLoading(false);
    }
  };

  const userEmail = user?.email || 'clerk@site.com';
  const userName = user?.user_metadata?.full_name || userEmail.split('@')[0];

  return (
    <>
      <header className="bg-white border border-slate-200 rounded-2xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-xs relative z-30">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-slate-100 text-slate-700 rounded-xl border border-slate-200">
            <HardHat className="w-5 h-5 text-indigo-600" />
          </div>
          <div>
            <h1 className="text-base font-bold text-slate-900">{title}</h1>
            <div className="flex items-center gap-1.5 text-xs text-slate-500 font-medium mt-0.5">
              <MapPin className="w-3.5 h-3.5 text-emerald-600" />
              <span>Active Station: <strong className="text-slate-800">{siteName}</strong></span>
            </div>
          </div>
        </div>

        {/* Profile Avatar & Actions Dropdown */}
        <div className="relative" ref={dropdownRef}>
          <button
            onClick={() => setIsDropdownOpen(!isDropdownOpen)}
            className="flex items-center gap-3 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-xl p-1.5 pr-3 transition cursor-pointer"
          >
            <div className="w-8 h-8 rounded-lg bg-indigo-600 text-white flex items-center justify-center font-bold text-xs uppercase shadow-xs">
              {userName.charAt(0)}
            </div>
            <div className="text-left hidden sm:block">
              <p className="text-xs font-bold text-slate-900 leading-tight capitalize">{userName}</p>
              <p className="text-[10px] text-slate-500 leading-tight">Site Clerk</p>
            </div>
            <ChevronDown className={`w-4 h-4 text-slate-400 transition-transform duration-200 ${isDropdownOpen ? 'rotate-180' : ''}`} />
          </button>

          {/* Dropdown Menu */}
          {isDropdownOpen && (
            <div className="absolute right-0 mt-2 w-64 bg-white border border-slate-200 rounded-2xl shadow-xl py-2 z-40 animate-in fade-in zoom-in-95 duration-100">
              {/* Profile Details Header */}
              <div className="px-4 py-3 border-b border-slate-100">
                <p className="text-xs font-bold text-slate-900 capitalize">{userName}</p>
                <p className="text-[11px] text-slate-500 truncate mt-0.5">{userEmail}</p>
                <span className="inline-block mt-2 text-[10px] font-semibold bg-indigo-50 text-indigo-700 px-2 py-0.5 rounded-md border border-indigo-100">
                  Site Operations Clerk
                </span>
              </div>

              {/* Action Links */}
              <div className="p-1 space-y-0.5">
                <button
                  onClick={handleOpenModal}
                  className="w-full flex items-center gap-2.5 px-3 py-2 text-xs font-semibold text-slate-700 hover:text-indigo-600 hover:bg-slate-50 rounded-xl transition cursor-pointer"
                >
                  <KeyRound className="w-4 h-4 text-indigo-500" />
                  <span>Change Password</span>
                </button>

                <button
                  onClick={handleSignOut}
                  className="w-full flex items-center gap-2.5 px-3 py-2 text-xs font-semibold text-red-600 hover:bg-red-50 rounded-xl transition cursor-pointer"
                >
                  <LogOut className="w-4 h-4 text-red-500" />
                  <span>Sign Out</span>
                </button>
              </div>
            </div>
          )}
        </div>
      </header>

      {/* Change Password Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="bg-white border border-slate-200 rounded-3xl max-w-md w-full p-6 shadow-2xl space-y-5">
            <div className="flex items-center justify-between border-b border-slate-100 pb-4">
              <div className="flex items-center gap-2.5">
                <div className="p-2 bg-indigo-50 text-indigo-600 rounded-xl">
                  <KeyRound className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900">Update Password</h3>
                  <p className="text-xs text-slate-500">Replace temporary admin password</p>
                </div>
              </div>
              <button
                onClick={() => !loading && setIsModalOpen(false)}
                className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100 transition cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {status.message && (
              <div
                className={`p-3.5 rounded-xl text-xs font-medium flex items-center gap-2.5 ${
                  status.type === 'error'
                    ? 'bg-red-50 text-red-700 border border-red-200'
                    : 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                }`}
              >
                {status.type === 'error' ? (
                  <AlertCircle className="w-4 h-4 shrink-0 text-red-600" />
                ) : (
                  <CheckCircle className="w-4 h-4 shrink-0 text-emerald-600" />
                )}
                <span>{status.message}</span>
              </div>
            )}

            <form onSubmit={handleChangePassword} className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700 block">New Password</label>
                <input
                  type="password"
                  required
                  placeholder="Enter at least 6 characters"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 text-slate-900 text-xs rounded-xl px-3.5 py-2.5 outline-none focus:bg-white focus:ring-2 focus:ring-indigo-500 transition"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700 block">Confirm New Password</label>
                <input
                  type="password"
                  required
                  placeholder="Re-enter new password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 text-slate-900 text-xs rounded-xl px-3.5 py-2.5 outline-none focus:bg-white focus:ring-2 focus:ring-indigo-500 transition"
                />
              </div>

              <div className="flex items-center justify-end gap-2.5 pt-2">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  disabled={loading}
                  className="px-4 py-2.5 rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-50 text-xs font-semibold transition cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold px-4 py-2.5 rounded-xl transition shadow-xs cursor-pointer disabled:opacity-50"
                >
                  {loading && <Loader2 className="w-4 h-4 animate-spin" />}
                  <span>{loading ? 'Updating...' : 'Save Password'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}