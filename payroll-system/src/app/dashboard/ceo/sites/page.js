'use client';

import { useState } from 'react';
import {
  Building,
  Users,
  HardHat,
  MapPin,
  Clock,
  CheckCircle2,
  AlertCircle
} from 'lucide-react';
import CeoSideNav from '@/components/ceo/CeoSideNav';
import CeoNavbar from '@/components/ceo/CeoNavbar';

export default function CeoSiteOperationsPage() {
  const sites = [
    {
      id: 'JWN-01',
      name: 'Jwaneng Open Pit Operation',
      clerkInCharge: 'Kagiso Setlhako (Site Clerk)',
      headcount: 72,
      shiftCoverage: '100%',
      activeKioskTerminal: 'Terminal A - Active',
      status: 'OPERATIONAL',
      recentOvertimeCount: 14,
    },
    {
      id: 'ORP-02',
      name: 'Orapa Processing Plant',
      clerkInCharge: 'Mpho Tau (Site Clerk)',
      headcount: 58,
      shiftCoverage: '98%',
      activeKioskTerminal: 'Terminal B - Active',
      status: 'OPERATIONAL',
      recentOvertimeCount: 8,
    },
    {
      id: 'LTK-03',
      name: 'Letlhakane Shaft Expansion',
      clerkInCharge: 'Bame Mooketsi (Site Clerk)',
      headcount: 32,
      shiftCoverage: '100%',
      activeKioskTerminal: 'Terminal C - Active',
      status: 'OPERATIONAL',
      recentOvertimeCount: 3,
    },
    {
      id: 'DMT-04',
      name: 'Damtshaa Logistics Hub',
      clerkInCharge: 'Thabo Ndlovu (Site Clerk)',
      headcount: 22,
      shiftCoverage: '95%',
      activeKioskTerminal: 'Terminal D - Idle',
      status: 'STANDBY',
      recentOvertimeCount: 0,
    },
  ];

  return (
    <div className="flex flex-col lg:flex-row min-h-screen bg-slate-50">
      <CeoSideNav />

      <div className="flex-1 flex flex-col min-w-0">
        <CeoNavbar
          title="Site Operations Oversight"
          subtitle="Real-time monitoring of active mining site terminals, clerk submissions, and shift coverage"
        />

        <main className="p-4 sm:p-6 lg:p-8 space-y-6 max-w-7xl w-full mx-auto">
          {/* Summary Overview */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="bg-white border border-slate-200 p-6 rounded-3xl shadow-xs">
              <span className="text-xs font-extrabold uppercase tracking-wider text-slate-400 block">Total Operational Sites</span>
              <h3 className="text-3xl font-black text-slate-900 mt-1">4 Mining Operations</h3>
              <p className="text-[11px] text-emerald-600 font-bold mt-2 flex items-center gap-1">
                <CheckCircle2 className="w-3.5 h-3.5" /> All Kiosks Synchronized
              </p>
            </div>

            <div className="bg-white border border-slate-200 p-6 rounded-3xl shadow-xs">
              <span className="text-xs font-extrabold uppercase tracking-wider text-slate-400 block">Deployed Workforce</span>
              <h3 className="text-3xl font-black text-slate-900 mt-1">184 Active Personnel</h3>
              <p className="text-[11px] text-slate-500 font-medium mt-2">Across 3 active shifts</p>
            </div>

            <div className="bg-white border border-slate-200 p-6 rounded-3xl shadow-xs">
              <span className="text-xs font-extrabold uppercase tracking-wider text-slate-400 block">Overall Shift Coverage</span>
              <h3 className="text-3xl font-black text-emerald-600 mt-1">98.2% Coverage</h3>
              <p className="text-[11px] text-slate-500 font-medium mt-2">Zero unexcused shift absences</p>
            </div>
          </div>

          {/* Site Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {sites.map((site) => (
              <div key={site.id} className="bg-white border border-slate-200 rounded-3xl p-6 shadow-xs space-y-4">
                <div className="flex items-start justify-between">
                  <div>
                    <span className="text-[10px] font-black text-emerald-700 bg-emerald-50 px-2.5 py-0.5 rounded-md border border-emerald-100 uppercase tracking-wider">
                      {site.id}
                    </span>
                    <h3 className="text-lg font-black text-slate-900 mt-2">{site.name}</h3>
                    <p className="text-xs text-slate-500 font-medium mt-0.5">{site.clerkInCharge}</p>
                  </div>
                  <span
                    className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider ${
                      site.status === 'OPERATIONAL'
                        ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                        : 'bg-amber-50 text-amber-700 border border-amber-200'
                    }`}
                  >
                    {site.status}
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-3 border-t border-b border-slate-100 py-3 text-xs">
                  <div>
                    <span className="text-slate-400 font-bold block text-[10px] uppercase">Headcount</span>
                    <span className="font-extrabold text-slate-800">{site.headcount} Workers</span>
                  </div>
                  <div>
                    <span className="text-slate-400 font-bold block text-[10px] uppercase">Shift Coverage</span>
                    <span className="font-extrabold text-emerald-600">{site.shiftCoverage}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 font-bold block text-[10px] uppercase">Terminal Status</span>
                    <span className="font-semibold text-slate-700">{site.activeKioskTerminal}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 font-bold block text-[10px] uppercase">Overtime Claims</span>
                    <span className="font-bold text-amber-600">{site.recentOvertimeCount} Audited Claims</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </main>
      </div>
    </div>
  );
}