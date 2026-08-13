'use client';

import { useState } from 'react';
import {
  FileCheck2,
  ShieldCheck,
  CheckCircle2,
  AlertOctagon,
  FileText,
  Search
} from 'lucide-react';
import CeoSideNav from '@/components/ceo/CeoSideNav';
import CeoNavbar from '@/components/ceo/CeoNavbar';

export default function CeoComplianceAuditPage() {
  const auditLogs = [
    {
      id: 'AUD-801',
      category: 'Statutory Taxes & BURS Compliance',
      site: 'System Wide',
      timestamp: 'Today, 08:00 AM',
      status: 'VERIFIED',
      detail: 'ALL tax brackets and statutory withholdings verified against 2026 Botswana tax tables.',
    },
    {
      id: 'AUD-802',
      category: 'Overtime Threshold Cap',
      site: 'Jwaneng Open Pit',
      timestamp: 'Today, 07:45 AM',
      status: 'VERIFIED',
      detail: 'No personnel exceeded maximum permissible weekly overtime hours (14 hrs limit).',
    },
    {
      id: 'AUD-803',
      category: 'Medical Fitness & Clearance',
      site: 'Orapa Processing Plant',
      timestamp: 'Yesterday, 04:30 PM',
      status: 'VERIFIED',
      detail: 'All medical certificates and safety fit-to-work uploads confirmed valid.',
    },
    {
      id: 'AUD-804',
      category: 'Bank Account Integrity Audit',
      site: 'All Batches',
      timestamp: 'Yesterday, 02:15 PM',
      status: 'VERIFIED',
      detail: 'Zero duplicate account numbers or invalid bank branch routing codes detected.',
    },
  ];

  return (
    <div className="flex flex-col lg:flex-row min-h-screen bg-slate-50">
      <CeoSideNav />

      <div className="flex-1 flex flex-col min-w-0">
        <CeoNavbar
          title="Compliance & Risk Audit Gate"
          subtitle="Verifies zero compliance flags prior to batch payout authorization"
        />

        <main className="p-4 sm:p-6 lg:p-8 space-y-6 max-w-7xl w-full mx-auto">
          {/* Compliance Banner */}
          <div className="bg-emerald-950 text-white p-6 sm:p-8 rounded-3xl shadow-md flex items-center justify-between gap-6">
            <div className="space-y-2">
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-800 text-emerald-200 text-xs font-extrabold uppercase tracking-wider">
                <ShieldCheck className="w-4 h-4 text-emerald-400" /> Automated Compliance Verification
              </span>
              <h2 className="text-2xl font-black">Zero Active Compliance Flags</h2>
              <p className="text-xs text-emerald-200 max-w-2xl">
                All payroll records, statutory deductions, shift logs, and site clerk medical uploads meet standard operational compliance protocols.
              </p>
            </div>
          </div>

          {/* Audit Log Table */}
          <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-xs space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-base font-extrabold text-slate-900">System Compliance Verification Logs</h3>
                <p className="text-xs text-slate-500">Real-time automated checks run on staged batches</p>
              </div>
              <FileCheck2 className="w-5 h-5 text-emerald-600" />
            </div>

            <div className="space-y-3">
              {auditLogs.map((log) => (
                <div
                  key={log.id}
                  className="p-4 rounded-2xl bg-slate-50 border border-slate-200/80 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4"
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="font-extrabold text-slate-900 text-sm">{log.category}</span>
                      <span className="text-[10px] font-mono font-bold text-slate-500 bg-slate-200/60 px-2 py-0.5 rounded-md">
                        {log.id}
                      </span>
                    </div>
                    <p className="text-xs text-slate-600 font-medium">{log.detail}</p>
                    <span className="text-[11px] text-slate-400 font-semibold block">
                      {log.site} • Audited at {log.timestamp}
                    </span>
                  </div>

                  <div className="shrink-0">
                    <span className="px-3 py-1.5 bg-emerald-50 border border-emerald-200 text-emerald-700 font-black text-xs rounded-xl flex items-center gap-1.5">
                      <CheckCircle2 className="w-4 h-4 text-emerald-600" /> {log.status}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}