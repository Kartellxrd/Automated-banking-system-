'use client';

import { useState } from 'react';
import Link from 'next/link';
import { 
  Building2, 
  Users, 
  Clock, 
  AlertTriangle, 
  FileText, 
  QrCode, 
  Lock, 
  UploadCloud, 
  ArrowRight,
  ShieldCheck,
  TrendingUp
} from 'lucide-react';
import SiteClerkSideNav from '@/components/site-clerk/SiteClerkSideNav';
import SiteClerkNavbar from '@/components/site-clerk/SiteClerkNavbar';

export default function SiteClerkDashboard() {
  const [selectedSite, setSelectedSite] = useState('Site A');

  const sites = [
    { id: 'Site A', name: 'Site A (Maphashalala Main Site)' },
    { id: 'Site B', name: 'Site B (Debete Field Station)' },
    { id: 'Site C', name: 'Site C (Processing Plant)' },
    { id: 'Site D', name: 'Site D (West Pit Expansion)' },
    { id: 'Site E', name: 'Site E (Logistics Terminal)' },
  ];

  // Dummy metrics tailored to selected site for visual UI context
  const metrics = {
    'Site A': { activeWorkers: 42, lateArrivals: 3, pendingDocs: 2, totalHours: 336 },
    'Site B': { activeWorkers: 28, lateArrivals: 1, pendingDocs: 4, totalHours: 224 },
    'Site C': { activeWorkers: 55, lateArrivals: 0, pendingDocs: 1, totalHours: 440 },
    'Site D': { activeWorkers: 19, lateArrivals: 2, pendingDocs: 0, totalHours: 152 },
    'Site E': { activeWorkers: 34, lateArrivals: 4, pendingDocs: 3, totalHours: 272 },
  }[selectedSite];

  return (
    <div className="min-h-screen bg-slate-100 text-slate-900 flex flex-col lg:flex-row font-sans">
      {/* Sidebar Navigation */}
      <SiteClerkSideNav />

      {/* Main Content Area */}
      <main className="flex-1 p-4 sm:p-6 lg:p-8 space-y-6 overflow-x-hidden">
        {/* Top Header Navbar */}
        <SiteClerkNavbar title="Field Overview" siteName={selectedSite} />

        {/* Site Switcher Banner */}
        <div className="bg-slate-900 text-white rounded-3xl p-5 sm:p-6 shadow-md flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-indigo-600/30 border border-indigo-500/40 rounded-2xl shrink-0">
              <Building2 className="w-6 h-6 text-indigo-400" />
            </div>
            <div>
              <p className="text-xs uppercase tracking-wider text-slate-400 font-bold">Active Operational Context</p>
              <h2 className="text-lg sm:text-xl font-extrabold text-white">{selectedSite} Field Operations</h2>
            </div>
          </div>

          <div className="w-full md:w-auto flex items-center gap-2">
            <label htmlFor="site-select" className="text-xs font-semibold text-slate-300 shrink-0">
              Switch Site:
            </label>
            <select
              id="site-select"
              value={selectedSite}
              onChange={(e) => setSelectedSite(e.target.value)}
              className="w-full md:w-auto bg-slate-800 border border-slate-700 text-white text-xs font-semibold rounded-xl px-3 py-2.5 outline-none focus:ring-2 focus:ring-indigo-500 transition cursor-pointer"
            >
              {sites.map((site) => (
                <option key={site.id} value={site.id}>
                  {site.name}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Key Operational Metrics */}
        <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-5">
          {/* Active Workers */}
          <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200 shadow-xs flex flex-col justify-between space-y-2">
            <div className="flex items-center justify-between text-slate-500">
              <span className="text-xs font-bold uppercase tracking-wider">Workers On-Site</span>
              <div className="p-2 bg-emerald-50 text-emerald-600 rounded-xl">
                <Users className="w-4 h-4" />
              </div>
            </div>
            <div className="flex items-baseline gap-2">
              <span className="text-2xl sm:text-3xl font-extrabold text-slate-900">{metrics.activeWorkers}</span>
              <span className="text-[11px] text-emerald-600 font-bold flex items-center gap-0.5">
                <TrendingUp className="w-3 h-3" /> Live
              </span>
            </div>
          </div>

          {/* Late Arrivals */}
          <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200 shadow-xs flex flex-col justify-between space-y-2">
            <div className="flex items-center justify-between text-slate-500">
              <span className="text-xs font-bold uppercase tracking-wider">Late Arrivals</span>
              <div className="p-2 bg-amber-50 text-amber-600 rounded-xl">
                <AlertTriangle className="w-4 h-4" />
              </div>
            </div>
            <div className="flex items-baseline gap-2">
              <span className="text-2xl sm:text-3xl font-extrabold text-slate-900">{metrics.lateArrivals}</span>
              <span className="text-[11px] text-slate-400 font-medium">Shift Variances</span>
            </div>
          </div>

          {/* Pending Leave / Medical Docs */}
          <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200 shadow-xs flex flex-col justify-between space-y-2">
            <div className="flex items-center justify-between text-slate-500">
              <span className="text-xs font-bold uppercase tracking-wider">Pending Docs</span>
              <div className="p-2 bg-indigo-50 text-indigo-600 rounded-xl">
                <FileText className="w-4 h-4" />
              </div>
            </div>
            <div className="flex items-baseline gap-2">
              <span className="text-2xl sm:text-3xl font-extrabold text-slate-900">{metrics.pendingDocs}</span>
              <span className="text-[11px] text-indigo-600 font-semibold">Unsubmitted</span>
            </div>
          </div>

          {/* Shift Hours Cumulative */}
          <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200 shadow-xs flex flex-col justify-between space-y-2">
            <div className="flex items-center justify-between text-slate-500">
              <span className="text-xs font-bold uppercase tracking-wider">Total Shift Hours</span>
              <div className="p-2 bg-blue-50 text-blue-600 rounded-xl">
                <Clock className="w-4 h-4" />
              </div>
            </div>
            <div className="flex items-baseline gap-2">
              <span className="text-2xl sm:text-3xl font-extrabold text-slate-900">{metrics.totalHours}h</span>
              <span className="text-[11px] text-slate-400 font-medium">This Week</span>
            </div>
          </div>
        </div>

        {/* Quick Task Launchers */}
        <div className="space-y-3">
          <h3 className="text-sm font-bold uppercase tracking-wider text-slate-500">
            Site Operations Launchpad
          </h3>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Action 1: Launch Kiosk Terminal */}
            <Link
              href={`/dashboard/site-clerk/kiosk?site=${encodeURIComponent(selectedSite)}`}
              className="bg-white hover:bg-slate-50 border border-slate-200 rounded-2xl p-5 shadow-xs transition group flex flex-col justify-between space-y-4"
            >
              <div className="flex items-start justify-between">
                <div className="p-3 bg-indigo-50 text-indigo-600 rounded-2xl group-hover:scale-105 transition">
                  <QrCode className="w-6 h-6" />
                </div>
                <span className="text-[10px] font-bold bg-emerald-50 text-emerald-700 px-2.5 py-1 rounded-full border border-emerald-200">
                  Ready
                </span>
              </div>
              <div>
                <h4 className="text-base font-bold text-slate-900 group-hover:text-indigo-600 transition">
                  1. Launch QR Kiosk Terminal
                </h4>
                <p className="text-xs text-slate-500 mt-1">
                  Open dynamic QR code terminal with live webcam snapshot verification for {selectedSite}.
                </p>
              </div>
              <div className="flex items-center gap-1.5 text-xs font-bold text-indigo-600 pt-2">
                <span>Open Terminal</span>
                <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition" />
              </div>
            </Link>

            {/* Action 2: Manage Shift Roster & Lock Hours */}
            <Link
              href={`/dashboard/site-clerk/roster?site=${encodeURIComponent(selectedSite)}`}
              className="bg-white hover:bg-slate-50 border border-slate-200 rounded-2xl p-5 shadow-xs transition group flex flex-col justify-between space-y-4"
            >
              <div className="flex items-start justify-between">
                <div className="p-3 bg-slate-100 text-slate-700 rounded-2xl group-hover:scale-105 transition">
                  <Lock className="w-6 h-6" />
                </div>
                <span className="text-[10px] font-bold bg-amber-50 text-amber-700 px-2.5 py-1 rounded-full border border-amber-200">
                  Editable
                </span>
              </div>
              <div>
                <h4 className="text-base font-bold text-slate-900 group-hover:text-indigo-600 transition">
                  2. Shift Roster & HR Lock
                </h4>
                <p className="text-xs text-slate-500 mt-1">
                  Review daily attendance logs, log shift variances, and submit locked hours to HR.
                </p>
              </div>
              <div className="flex items-center gap-1.5 text-xs font-bold text-slate-800 group-hover:text-indigo-600 pt-2">
                <span>View Shift Log</span>
                <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition" />
              </div>
            </Link>

            {/* Action 3: Site Document Portal */}
            <Link
              href={`/dashboard/site-clerk/documents?site=${encodeURIComponent(selectedSite)}`}
              className="bg-white hover:bg-slate-50 border border-slate-200 rounded-2xl p-5 shadow-xs transition group flex flex-col justify-between space-y-4"
            >
              <div className="flex items-start justify-between">
                <div className="p-3 bg-blue-50 text-blue-600 rounded-2xl group-hover:scale-105 transition">
                  <UploadCloud className="w-6 h-6" />
                </div>
                <span className="text-[10px] font-bold bg-blue-50 text-blue-700 px-2.5 py-1 rounded-full border border-blue-200">
                  Field Upload
                </span>
              </div>
              <div>
                <h4 className="text-base font-bold text-slate-900 group-hover:text-indigo-600 transition">
                  3. Leave & Sick Note Portal
                </h4>
                <p className="text-xs text-slate-500 mt-1">
                  Upload medical certificates, sick notes, or leave forms directly from {selectedSite}.
                </p>
              </div>
              <div className="flex items-center gap-1.5 text-xs font-bold text-blue-600 pt-2">
                <span>Upload Documents</span>
                <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition" />
              </div>
            </Link>
          </div>
        </div>

        {/* Security / System Footer Note */}
        <div className="p-4 bg-slate-200/60 border border-slate-300 rounded-2xl flex items-center justify-between text-xs text-slate-600">
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>Operational logs for {selectedSite} are synced in real-time with HR Compliance.</span>
          </div>
          <span className="hidden sm:inline font-mono text-[10px] text-slate-500">SYSTEM READY</span>
        </div>
      </main>
    </div>
  );
}