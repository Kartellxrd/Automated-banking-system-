'use client';

import { useEffect, useRef, useState } from 'react';
import { AlertCircle, CheckCircle, ChevronDown, HardHat, KeyRound, Loader2, LogOut, MapPin, X } from 'lucide-react';
import { supabase } from '@/lib/supabase';

export default function SiteClerkNavbar({ title = 'Site Overview', siteName = '' }) {
  const [user, setUser] = useState(null);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState({ type: '', message: '' });
  const dropdownRef = useRef(null);

  useEffect(() => {
    async function getUser() {
      const { data: { user: currentUser } } = await supabase.auth.getUser();
      setUser(currentUser || null);
    }
    getUser();
  }, []);

  useEffect(() => {
    function handleClickOutside(event) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) setIsDropdownOpen(false);
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  function openPasswordModal() {
    setIsDropdownOpen(false);
    setNewPassword('');
    setConfirmPassword('');
    setStatus({ type: '', message: '' });
    setIsModalOpen(true);
  }

  async function handleSignOut() {
    await supabase.auth.signOut();
    window.location.href = '/login';
  }

  async function handleChangePassword(event) {
    event.preventDefault();
    setStatus({ type: '', message: '' });

    if (newPassword.length < 10) {
      setStatus({ type: 'error', message: 'Password must be at least 10 characters long.' });
      return;
    }
    if (newPassword !== confirmPassword) {
      setStatus({ type: 'error', message: 'Passwords do not match.' });
      return;
    }

    setLoading(true);
    try {
      const response = await fetch('/api/auth/change-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ newPassword }),
      });
      const result = await response.json();
      if (!response.ok || !result.success) throw new Error(result.error || 'Failed to update password.');

      setStatus({ type: 'success', message: 'Password updated successfully.' });
      setTimeout(() => setIsModalOpen(false), 1200);
    } catch (error) {
      setStatus({ type: 'error', message: error.message || 'Could not update password.' });
    } finally {
      setLoading(false);
    }
  }

  const userEmail = user?.email || '';
  const metadataName = [user?.user_metadata?.first_name, user?.user_metadata?.last_name].filter(Boolean).join(' ');
  const userName = metadataName || user?.user_metadata?.full_name || userEmail.split('@')[0] || 'Site Clerk';

  return (
    <>
      <header className="bg-white border border-slate-200 rounded-2xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-sm relative z-30">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-slate-100 rounded-xl border border-slate-200"><HardHat className="w-5 h-5 text-indigo-600" /></div>
          <div>
            <h1 className="text-base font-bold text-slate-900">{title}</h1>
            <div className="flex items-center gap-1.5 text-xs text-slate-500 font-medium mt-0.5">
              <MapPin className="w-3.5 h-3.5 text-emerald-600" />
              <span>Assigned Site: <strong className="text-slate-800">{siteName || 'Loading assignment...'}</strong></span>
            </div>
          </div>
        </div>

        <div className="relative" ref={dropdownRef}>
          <button onClick={() => setIsDropdownOpen((open) => !open)} className="flex items-center gap-3 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-xl p-1.5 pr-3 transition">
            <div className="w-8 h-8 rounded-lg bg-indigo-600 text-white flex items-center justify-center font-bold text-xs uppercase">{userName.charAt(0)}</div>
            <div className="text-left hidden sm:block"><p className="text-xs font-bold text-slate-900 leading-tight">{userName}</p><p className="text-[10px] text-slate-500">Site Clerk</p></div>
            <ChevronDown className={`w-4 h-4 text-slate-400 transition-transform ${isDropdownOpen ? 'rotate-180' : ''}`} />
          </button>

          {isDropdownOpen && (
            <div className="absolute right-0 mt-2 w-64 bg-white border border-slate-200 rounded-2xl shadow-xl py-2 z-40">
              <div className="px-4 py-3 border-b border-slate-100"><p className="text-xs font-bold text-slate-900">{userName}</p><p className="text-[11px] text-slate-500 truncate mt-0.5">{userEmail || 'Authenticated Site Clerk'}</p></div>
              <div className="p-1">
                <button onClick={openPasswordModal} className="w-full flex items-center gap-2.5 px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 rounded-xl"><KeyRound className="w-4 h-4 text-indigo-500" />Change Password</button>
                <button onClick={handleSignOut} className="w-full flex items-center gap-2.5 px-3 py-2 text-xs font-semibold text-rose-600 hover:bg-rose-50 rounded-xl"><LogOut className="w-4 h-4" />Sign Out</button>
              </div>
            </div>
          )}
        </div>
      </header>

      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-sm">
          <div className="bg-white border border-slate-200 rounded-3xl max-w-md w-full p-6 shadow-2xl space-y-5">
            <div className="flex items-center justify-between border-b border-slate-100 pb-4">
              <div><h3 className="text-base font-bold text-slate-900">Change Password</h3><p className="text-xs text-slate-500 mt-1">Use at least 10 characters.</p></div>
              <button onClick={() => !loading && setIsModalOpen(false)} className="p-2 text-slate-400 hover:bg-slate-100 rounded-xl"><X className="w-5 h-5" /></button>
            </div>

            {status.message && <div className={`p-3 rounded-xl text-xs font-semibold flex items-center gap-2 ${status.type === 'error' ? 'bg-rose-50 text-rose-700 border border-rose-200' : 'bg-emerald-50 text-emerald-700 border border-emerald-200'}`}>{status.type === 'error' ? <AlertCircle className="w-4 h-4" /> : <CheckCircle className="w-4 h-4" />}{status.message}</div>}

            <form onSubmit={handleChangePassword} className="space-y-4">
              <label className="block"><span className="block text-xs font-bold text-slate-700 mb-1.5">New Password</span><input type="password" required minLength={10} value={newPassword} onChange={(e) => setNewPassword(e.target.value)} placeholder="Minimum 10 characters" className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2.5 text-sm outline-none focus:border-indigo-500" /></label>
              <label className="block"><span className="block text-xs font-bold text-slate-700 mb-1.5">Confirm Password</span><input type="password" required minLength={10} value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} placeholder="Repeat new password" className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2.5 text-sm outline-none focus:border-indigo-500" /></label>
              <div className="flex justify-end gap-2 pt-2"><button type="button" disabled={loading} onClick={() => setIsModalOpen(false)} className="px-4 py-2.5 rounded-xl border border-slate-200 text-xs font-bold">Cancel</button><button type="submit" disabled={loading} className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-indigo-600 text-white text-xs font-bold disabled:opacity-50">{loading && <Loader2 className="w-4 h-4 animate-spin" />}{loading ? 'Updating...' : 'Save Password'}</button></div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
