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
  IdCard,
  Download,
  Activity,
  Copy,
  Check,
  ExternalLink,
  RotateCcw
} from 'lucide-react';
import { supabase } from '@/lib/supabase';

export default function AdminNavbar({ title = "Admin Statistics & System Overview" }) {
  const [currentAdmin, setCurrentAdmin] = useState(null);
  const [profileModalOpen, setProfileModalOpen] = useState(false);
  const [copiedId, setCopiedId] = useState(false);
  const [isExporting, setIsExporting] = useState(false);

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
          id: user.id,
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

  // Helper: Extract Initials for Profile Avatar
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

  // Feature 1: Quick Copy Admin System ID to Clipboard
  const handleCopyId = () => {
    if (currentAdmin?.id) {
      navigator.clipboard.writeText(currentAdmin.id);
      setCopiedId(true);
      setTimeout(() => setCopiedId(false), 2000);
    }
  };

  // Feature 2: Quick System Audit Export (CSV Download)
  const handleQuickExport = async () => {
    setIsExporting(true);
    try {
      const { data: users, error } = await supabase
        .from('profiles')
        .select('id, first_name, last_name, email, role, site_location, created_at');

      if (error) throw error;

      const csvRows = [
        ['ID', 'First Name', 'Last Name', 'Email', 'Role', 'Site Location', 'Created At'],
        ...(users || []).map(u => [
          u.id,
          u.first_name || '',
          u.last_name || '',
          u.email || '',
          u.role || '',
          u.site_location || '',
          u.created_at || ''
        ])
      ];

      const csvContent = 'data:text/csv;charset=utf-8,' + csvRows.map(e => e.join(',')).join('\n');
      const encodedUri = encodeURI(csvContent);
      const link = document.createElement('a');
      link.setAttribute('href', encodedUri);
      link.setAttribute('download', `periscope_user_audit_${new Date().toISOString().slice(0,10)}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (err) {
      console.error('Export failed:', err);
      alert('Could not export audit log. Check console for details.');
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <>
      {/* Light Navbar Header */}
      <header className="bg-white border border-slate-200 rounded-2xl p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-sm">
        
        {/* Title & Badge */}
        <div className="flex items-center space-x-3.5">
          <div className="p-3 rounded-xl bg-indigo-50 border border-indigo-100 text-indigo-600">
            <Shield className="w-6 h-6 text-indigo-600" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="bg-indigo-50 text-indigo-700 border border-indigo-100 text-[10px] font-bold px-2.5 py-0.5 rounded-full uppercase tracking-wider">
                ADMINISTRATION CONTROL
              </span>
              <span className="hidden md:inline-flex items-center gap-1.5 text-[10px] font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2.5 py-0.5 rounded-full">
                <Activity className="w-3 h-3 text-emerald-500 animate-pulse" />
                System Status: Operational
              </span>
            </div>
            <h1 className="text-lg sm:text-xl font-bold text-slate-900 mt-1">
              {title}
            </h1>
          </div>
        </div>

        {/* Admin Action Group */}
        <div className="flex items-center gap-3">
          {/* Quick Export Audit Button */}
          <button
            onClick={handleQuickExport}
            disabled={isExporting}
            title="Export User Records to CSV"
            className="hidden sm:flex items-center gap-2 bg-slate-50 hover:bg-slate-100 border border-slate-200 hover:border-slate-300 text-slate-700 text-xs font-semibold px-3 py-2 rounded-xl transition shadow-xs disabled:opacity-50"
          >
            <Download className="w-4 h-4 text-slate-500" />
            <span>{isExporting ? 'Exporting...' : 'Export Audit'}</span>
          </button>

          {/* Clickable Profile Badge */}
          <button
            onClick={() => setProfileModalOpen(true)}
            className="flex items-center space-x-3 bg-slate-50 hover:bg-slate-100 border border-slate-200 hover:border-indigo-300 px-3.5 py-2 rounded-xl transition text-left group cursor-pointer shadow-xs"
          >
            <div className="relative">
              <div className="w-9 h-9 rounded-xl bg-indigo-600 group-hover:bg-indigo-700 transition flex items-center justify-center text-white font-bold text-xs shadow-md shadow-indigo-600/20">
                {getInitials()}
              </div>
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 border-2 border-white absolute -bottom-0.5 -right-0.5" />
            </div>

            <div className="text-left pr-1">
              <p className="text-xs font-bold text-slate-900 truncate max-w-[130px] group-hover:text-indigo-600 transition">
                {fullName}
              </p>
              <p className="text-[10px] text-indigo-600 flex items-center gap-1 font-semibold">
                Super Admin
              </p>
            </div>
          </button>
        </div>
      </header>

      {/* Profile & Quick Admin Tools Modal */}
      {profileModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white border border-slate-200 rounded-2xl w-full max-w-md p-6 space-y-5 shadow-2xl relative animate-in fade-in zoom-in duration-150">
            
            {/* Modal Close Button */}
            <button
              onClick={() => setProfileModalOpen(false)}
              className="absolute top-4 right-4 p-1.5 text-slate-400 hover:text-slate-700 rounded-lg hover:bg-slate-100 transition"
            >
              <X className="w-5 h-5" />
            </button>

            {/* Profile Header */}
            <div className="flex items-center space-x-4">
              <div className="w-14 h-14 rounded-2xl bg-indigo-600 border border-indigo-400/30 flex items-center justify-center text-white font-extrabold text-xl shadow-lg shadow-indigo-600/20">
                {getInitials()}
              </div>
              <div>
                <h3 className="text-lg font-bold text-slate-900 leading-tight">
                  {fullName}
                </h3>
                <div className="flex items-center gap-2 mt-1">
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full uppercase bg-indigo-50 text-indigo-700 border border-indigo-100 flex items-center gap-1">
                    <ShieldCheck className="w-3 h-3 text-indigo-600" />
                    {currentAdmin?.role || 'admin'}
                  </span>
                  <span className="text-[10px] text-emerald-700 font-semibold bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200 flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                    Active Session
                  </span>
                </div>
              </div>
            </div>

            {/* Profile Detailed Info Block */}
            <div className="space-y-3 bg-slate-50 p-4 rounded-xl border border-slate-200 text-xs">
              <div className="flex items-center justify-between py-2 border-b border-slate-200">
                <span className="text-slate-500 flex items-center gap-2">
                  <Mail className="w-3.5 h-3.5 text-indigo-600" />
                  Email Address
                </span>
                <span className="text-slate-900 font-semibold truncate max-w-[190px]">
                  {currentAdmin?.email || 'N/A'}
                </span>
              </div>

              <div className="flex items-center justify-between py-2 border-b border-slate-200">
                <span className="text-slate-500 flex items-center gap-2">
                  <MapPin className="w-3.5 h-3.5 text-emerald-600" />
                  Primary Jurisdiction
                </span>
                <span className="text-slate-900 font-semibold">
                  {currentAdmin?.site_location || 'Headquarters / All Sites'}
                </span>
              </div>

              <div className="flex items-center justify-between py-2 border-b border-slate-200">
                <span className="text-slate-500 flex items-center gap-2">
                  <IdCard className="w-3.5 h-3.5 text-amber-600" />
                  System Admin ID
                </span>
                <button
                  onClick={handleCopyId}
                  className="flex items-center gap-1 font-mono text-slate-800 text-[11px] hover:text-indigo-600 bg-white px-2 py-1 rounded border border-slate-200 transition"
                >
                  <span className="truncate max-w-[120px]">{currentAdmin?.id || 'LOCAL_ADMIN'}</span>
                  {copiedId ? <Check className="w-3 h-3 text-emerald-600" /> : <Copy className="w-3 h-3 text-slate-400" />}
                </button>
              </div>

              <div className="flex items-center justify-between py-2">
                <span className="text-slate-500 flex items-center gap-2">
                  <Calendar className="w-3.5 h-3.5 text-sky-600" />
                  Provisioned On
                </span>
                <span className="text-slate-900 font-semibold">
                  {currentAdmin?.created_at
                    ? new Date(currentAdmin.created_at).toLocaleDateString()
                    : 'System Default'}
                </span>
              </div>
            </div>

            {/* Quick Functional Admin Actions */}
            <div className="space-y-2 pt-1">
              <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Quick Actions</p>
              <div className="grid grid-cols-2 gap-2">
                <button
                  onClick={handleQuickExport}
                  className="flex items-center justify-center gap-2 p-2.5 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-xl text-xs font-semibold transition"
                >
                  <Download className="w-3.5 h-3.5 text-slate-600" />
                  <span>Download Audit</span>
                </button>
                <button
                  onClick={() => window.location.reload()}
                  className="flex items-center justify-center gap-2 p-2.5 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-xl text-xs font-semibold transition"
                >
                  <RotateCcw className="w-3.5 h-3.5 text-slate-600" />
                  <span>Refresh State</span>
                </button>
              </div>
            </div>

            {/* Footer Button */}
            <div className="pt-2">
              <button
                onClick={() => setProfileModalOpen(false)}
                className="w-full py-2.5 bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold rounded-xl transition shadow-sm"
              >
                Close Control Window
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}