'use client';

import { useEffect, useState } from 'react';
import {
  Activity,
  AlertCircle,
  Calendar,
  Check,
  CheckCircle2,
  Copy,
  Download,
  IdCard,
  Mail,
  MapPin,
  RotateCcw,
  Shield,
  ShieldCheck,
  X,
} from 'lucide-react';
import { supabase } from '@/lib/supabase';
import ChangePasswordButton from '@/components/shared/ChangePasswordButton';

function csvCell(value) {
  return `"${String(value ?? '').replaceAll('"', '""')}"`;
}

export default function AdminNavbar({ title = 'Admin Statistics & System Overview' }) {
  const [currentAdmin, setCurrentAdmin] = useState(null);
  const [profileModalOpen, setProfileModalOpen] = useState(false);
  const [copiedId, setCopiedId] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [notice, setNotice] = useState({ type: '', text: '' });

  useEffect(() => { fetchCurrentAdmin(); }, []);

  async function fetchCurrentAdmin() {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const { data: profile } = await supabase
        .from('profiles')
        .select('id, email, role, first_name, last_name, site_location, created_at')
        .eq('id', user.id)
        .maybeSingle();
      setCurrentAdmin(profile || {
        id: user.id,
        email: user.email,
        role: 'admin',
        first_name: 'System',
        last_name: 'Admin',
      });
    } catch (error) {
      console.error('Error fetching admin user:', error);
    }
  }

  function getInitials() {
    if (currentAdmin?.first_name && currentAdmin?.last_name) return `${currentAdmin.first_name[0]}${currentAdmin.last_name[0]}`.toUpperCase();
    if (currentAdmin?.email) return currentAdmin.email[0].toUpperCase();
    return 'A';
  }

  const fullName = currentAdmin?.first_name || currentAdmin?.last_name
    ? `${currentAdmin?.first_name || ''} ${currentAdmin?.last_name || ''}`.trim()
    : currentAdmin?.email || 'Administrator';

  async function handleCopyId() {
    if (!currentAdmin?.id) return;
    try {
      await navigator.clipboard.writeText(currentAdmin.id);
      setCopiedId(true);
      setTimeout(() => setCopiedId(false), 2000);
    } catch {
      setNotice({ type: 'error', text: 'Could not copy the Admin ID to the clipboard.' });
    }
  }

  async function handleQuickExport() {
    setIsExporting(true);
    setNotice({ type: '', text: '' });
    try {
      const response = await fetch('/api/admin/users', { cache: 'no-store' });
      const result = await response.json();
      if (!response.ok || !result.success) throw new Error(result.error || 'Could not load user records for export.');

      const users = result.data || [];
      const rows = [
        ['User ID', 'First Name', 'Last Name', 'Email', 'Role', 'Active', 'Must Change Password', 'Created At'],
        ...users.map((user) => [
          user.id,
          user.first_name || '',
          user.last_name || '',
          user.email || '',
          user.role || '',
          user.is_active === false ? 'No' : 'Yes',
          user.must_change_password ? 'Yes' : 'No',
          user.created_at || '',
        ]),
      ];

      const blob = new Blob([rows.map((row) => row.map(csvCell).join(',')).join('\n')], { type: 'text/csv;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `periscope_system_users_${new Date().toISOString().slice(0, 10)}.csv`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(url);
      setNotice({ type: 'success', text: `Exported ${users.length} system user record${users.length === 1 ? '' : 's'}.` });
    } catch (error) {
      setNotice({ type: 'error', text: error.message || 'Could not export system user records.' });
    } finally {
      setIsExporting(false);
    }
  }

  return (
    <>
      <header className="bg-white border border-slate-200 rounded-2xl p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-sm">
        <div className="flex items-center space-x-3.5">
          <div className="p-3 rounded-xl bg-indigo-50 border border-indigo-100 text-indigo-600"><Shield className="w-6 h-6" /></div>
          <div>
            <div className="flex items-center gap-2">
              <span className="bg-indigo-50 text-indigo-700 border border-indigo-100 text-[10px] font-bold px-2.5 py-0.5 rounded-full uppercase tracking-wider">Administration Control</span>
              <span className="hidden md:inline-flex items-center gap-1.5 text-[10px] font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2.5 py-0.5 rounded-full"><Activity className="w-3 h-3" />Authenticated Session</span>
            </div>
            <h1 className="text-lg sm:text-xl font-bold text-slate-900 mt-1">{title}</h1>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button onClick={handleQuickExport} disabled={isExporting} title="Export system user records to CSV" className="hidden sm:flex items-center gap-2 bg-slate-50 hover:bg-slate-100 border border-slate-200 text-slate-700 text-xs font-semibold px-3 py-2 rounded-xl transition disabled:opacity-50"><Download className="w-4 h-4 text-slate-500" /><span>{isExporting ? 'Exporting...' : 'Export Users'}</span></button>
          <ChangePasswordButton compact />
          <button onClick={() => setProfileModalOpen(true)} className="flex items-center space-x-3 bg-slate-50 hover:bg-slate-100 border border-slate-200 hover:border-indigo-300 px-3.5 py-2 rounded-xl transition text-left group shadow-xs">
            <div className="relative"><div className="w-9 h-9 rounded-xl bg-indigo-600 group-hover:bg-indigo-700 transition flex items-center justify-center text-white font-bold text-xs">{getInitials()}</div><span className="w-2.5 h-2.5 rounded-full bg-emerald-500 border-2 border-white absolute -bottom-0.5 -right-0.5" /></div>
            <div className="text-left pr-1"><p className="text-xs font-bold text-slate-900 truncate max-w-[130px]">{fullName}</p><p className="text-[10px] text-indigo-600 font-semibold">System Admin</p></div>
          </button>
        </div>
      </header>

      {notice.text && <div className={`fixed right-4 top-4 z-[130] flex max-w-sm items-start gap-2 rounded-2xl border p-4 text-sm font-semibold shadow-xl ${notice.type === 'success' ? 'border-emerald-200 bg-emerald-50 text-emerald-800' : 'border-rose-200 bg-rose-50 text-rose-800'}`}>{notice.type === 'success' ? <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" /> : <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />}<span>{notice.text}</span><button onClick={() => setNotice({ type: '', text: '' })} className="ml-2"><X className="h-4 w-4" /></button></div>}

      {profileModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white border border-slate-200 rounded-2xl w-full max-w-md p-6 space-y-5 shadow-2xl relative">
            <button onClick={() => setProfileModalOpen(false)} className="absolute top-4 right-4 p-1.5 text-slate-400 hover:text-slate-700 rounded-lg hover:bg-slate-100"><X className="w-5 h-5" /></button>
            <div className="flex items-center space-x-4"><div className="w-14 h-14 rounded-2xl bg-indigo-600 flex items-center justify-center text-white font-extrabold text-xl">{getInitials()}</div><div><h3 className="text-lg font-bold text-slate-900 leading-tight">{fullName}</h3><div className="flex items-center gap-2 mt-1"><span className="text-[10px] font-bold px-2 py-0.5 rounded-full uppercase bg-indigo-50 text-indigo-700 border border-indigo-100 flex items-center gap-1"><ShieldCheck className="w-3 h-3" />{currentAdmin?.role || 'admin'}</span></div></div></div>

            <div className="space-y-3 bg-slate-50 p-4 rounded-xl border border-slate-200 text-xs">
              <InfoRow icon={Mail} label="Email Address" value={currentAdmin?.email || 'N/A'} />
              <InfoRow icon={MapPin} label="Primary Jurisdiction" value={currentAdmin?.site_location || 'Headquarters / All Sites'} />
              <div className="flex items-center justify-between py-2 border-b border-slate-200"><span className="text-slate-500 flex items-center gap-2"><IdCard className="w-3.5 h-3.5 text-amber-600" />System Admin ID</span><button onClick={handleCopyId} className="flex items-center gap-1 font-mono text-slate-800 text-[11px] hover:text-indigo-600 bg-white px-2 py-1 rounded border border-slate-200"><span className="truncate max-w-[120px]">{currentAdmin?.id || 'N/A'}</span>{copiedId ? <Check className="w-3 h-3 text-emerald-600" /> : <Copy className="w-3 h-3 text-slate-400" />}</button></div>
              <InfoRow icon={Calendar} label="Provisioned On" value={currentAdmin?.created_at ? new Date(currentAdmin.created_at).toLocaleDateString() : 'System Default'} last />
            </div>

            <div className="space-y-2 pt-1"><p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Quick Actions</p><div className="grid grid-cols-2 gap-2"><button onClick={handleQuickExport} disabled={isExporting} className="flex items-center justify-center gap-2 p-2.5 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-xl text-xs font-semibold disabled:opacity-50"><Download className="w-3.5 h-3.5" /><span>{isExporting ? 'Exporting...' : 'Export Users'}</span></button><button onClick={() => window.location.reload()} className="flex items-center justify-center gap-2 p-2.5 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-xl text-xs font-semibold"><RotateCcw className="w-3.5 h-3.5" /><span>Refresh State</span></button></div></div>
            <button onClick={() => setProfileModalOpen(false)} className="w-full py-2.5 bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold rounded-xl">Close</button>
          </div>
        </div>
      )}
    </>
  );
}

function InfoRow({ icon: Icon, label, value, last = false }) {
  return <div className={`flex items-center justify-between py-2 ${last ? '' : 'border-b border-slate-200'}`}><span className="text-slate-500 flex items-center gap-2"><Icon className="w-3.5 h-3.5 text-indigo-600" />{label}</span><span className="text-slate-900 font-semibold text-right truncate max-w-[190px]">{value}</span></div>;
}
