'use client';

import { useState } from 'react';
import HRSideNav from '@/components/hr/HRSideNav';
import HRNavbar from '@/components/hr/HRNavbar';
import { 
  CheckSquare, 
  Search, 
  DollarSign, 
  Building2, 
  Users, 
  Clock, 
  Send, 
  CheckCircle2, 
  FileText, 
  ArrowRight,
  X,
  AlertCircle
} from 'lucide-react';

export default function HRPayrollStagingPage() {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedSite, setSelectedSite] = useState('All');
  const [selectedRecords, setSelectedRecords] = useState([]);
  const [activeRecord, setActiveRecord] = useState(null);

  // Mock Staging Batch Data
  const [stagingBatches, setStagingBatches] = useState([
    {
      id: 'STG-101',
      workerName: 'Kago Phuthego',
      workerId: 'EMP-8802',
      site: 'Jwaneng Pit B',
      jobTitle: 'Heavy Machinery Operator',
      regularHours: 160,
      otHours: 8,
      grossPayBWP: 21120.00,
      status: 'Ready for Approval',
      period: '01 Aug - 15 Aug 2026',
    },
    {
      id: 'STG-102',
      workerName: 'Thabo Mokoena',
      workerId: 'EMP-4105',
      site: 'Orapa Shaft 3',
      jobTitle: 'Underground Blaster',
      regularHours: 160,
      otHours: 20,
      grossPayBWP: 28050.00,
      status: 'Ready for Approval',
      period: '01 Aug - 15 Aug 2026',
    },
    {
      id: 'STG-103',
      workerName: 'Kabelo Sechele',
      workerId: 'EMP-2901',
      site: 'Karowe Diamond Mine',
      jobTitle: 'Safety Inspector',
      regularHours: 160,
      otHours: 0,
      grossPayBWP: 21600.00,
      status: 'Approved',
      period: '01 Aug - 15 Aug 2026',
    },
    {
      id: 'STG-104',
      workerName: 'Lindiwe Dlamini',
      workerId: 'EMP-6043',
      site: 'Jwaneng Plant 1',
      jobTitle: 'Plant Technician',
      regularHours: 160,
      otHours: 12,
      grossPayBWP: 20130.00,
      status: 'Ready for Approval',
      period: '01 Aug - 15 Aug 2026',
    },
  ]);

  const siteOptions = ['All', 'Jwaneng Pit B', 'Orapa Shaft 3', 'Karowe Diamond Mine', 'Jwaneng Plant 1'];

  // Checkbox Select Logic
  const toggleSelect = (id) => {
    setSelectedRecords((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  const toggleSelectAll = () => {
    if (selectedRecords.length === filteredBatches.length) {
      setSelectedRecords([]);
    } else {
      setSelectedRecords(filteredBatches.map((b) => b.id));
    }
  };

  // Approval Handlers
  const handleApproveBatch = (ids) => {
    setStagingBatches((prev) =>
      prev.map((item) => (ids.includes(item.id) ? { ...item, status: 'Approved' } : item))
    );
    setSelectedRecords([]);
    setActiveRecord(null);
  };

  const filteredBatches = stagingBatches.filter((batch) => {
    const matchesSite = selectedSite === 'All' || batch.site === selectedSite;
    const matchesSearch =
      batch.workerName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      batch.workerId.toLowerCase().includes(searchTerm.toLowerCase()) ||
      batch.jobTitle.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesSite && matchesSearch;
  });

  const totalGrossStaged = filteredBatches.reduce((acc, curr) => acc + curr.grossPayBWP, 0);

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col lg:flex-row font-sans">
      {/* HR Side Navigation */}
      <HRSideNav />

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0">
        <HRNavbar />

        <main className="p-4 sm:p-6 lg:p-8 space-y-6 max-w-7xl mx-auto w-full">
          {/* Header Banner */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-6 rounded-3xl border border-slate-200/80 shadow-xs">
            <div>
              <div className="flex items-center gap-2 text-xs font-extrabold text-indigo-600 uppercase tracking-wider mb-1">
                <CheckSquare className="w-4 h-4" />
                <span>Pre-Payroll Staging Gate</span>
              </div>
              <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
                Staging & Payroll Approval
              </h1>
              <p className="text-slate-500 text-sm mt-1">
                Perform final gross pay checks, lock staged site records, and authorize payout dispatches.
              </p>
            </div>

            {/* Batch Action Button */}
            {selectedRecords.length > 0 && (
              <button
                onClick={() => handleApproveBatch(selectedRecords)}
                className="px-5 py-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-2xl font-bold text-xs shadow-lg shadow-emerald-600/20 flex items-center gap-2 transition cursor-pointer self-start sm:self-auto"
              >
                <CheckCircle2 className="w-4 h-4" />
                <span>Approve Selected ({selectedRecords.length})</span>
              </button>
            )}
          </div>

          {/* Quick Metrics Bar */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="bg-white p-5 rounded-3xl border border-slate-200/80 shadow-xs flex items-center justify-between">
              <div>
                <p className="text-[10px] font-black uppercase text-slate-400">Total Staged Gross Pay</p>
                <p className="text-2xl font-black text-slate-900 mt-1">BWP {totalGrossStaged.toLocaleString()}</p>
              </div>
              <div className="p-3 bg-emerald-50 text-emerald-600 rounded-2xl">
                <DollarSign className="w-6 h-6" />
              </div>
            </div>

            <div className="bg-white p-5 rounded-3xl border border-slate-200/80 shadow-xs flex items-center justify-between">
              <div>
                <p className="text-[10px] font-black uppercase text-slate-400">Workers Staged</p>
                <p className="text-2xl font-black text-slate-900 mt-1">{filteredBatches.length}</p>
              </div>
              <div className="p-3 bg-indigo-50 text-indigo-600 rounded-2xl">
                <Users className="w-6 h-6" />
              </div>
            </div>

            <div className="bg-white p-5 rounded-3xl border border-slate-200/80 shadow-xs flex items-center justify-between">
              <div>
                <p className="text-[10px] font-black uppercase text-slate-400">Pending Authorization</p>
                <p className="text-2xl font-black text-amber-600 mt-1">
                  {filteredBatches.filter((b) => b.status === 'Ready for Approval').length}
                </p>
              </div>
              <div className="p-3 bg-amber-50 text-amber-600 rounded-2xl">
                <Clock className="w-6 h-6" />
              </div>
            </div>
          </div>

          {/* Filters & Controls */}
          <div className="bg-white p-4 sm:p-5 rounded-3xl border border-slate-200/80 shadow-xs flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4">
            <div className="relative flex-1 max-w-md">
              <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Search worker name, ID, or job role..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-2xl text-xs font-medium text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white transition"
              />
            </div>

            <div className="flex items-center gap-2 overflow-x-auto pb-1 md:pb-0 scrollbar-none">
              {siteOptions.map((site) => (
                <button
                  key={site}
                  onClick={() => setSelectedSite(site)}
                  className={`px-3.5 py-2 rounded-xl text-xs font-extrabold transition shrink-0 cursor-pointer ${
                    selectedSite === site
                      ? 'bg-indigo-600 text-white shadow-xs'
                      : 'bg-slate-100 text-slate-600 hover:bg-indigo-50 hover:text-indigo-600'
                  }`}
                >
                  {site}
                </button>
              ))}
            </div>
          </div>

          {/* Staging Records Table */}
          <div className="bg-white rounded-3xl border border-slate-200/80 shadow-xs overflow-hidden">
            <div className="p-5 border-b border-slate-100 flex items-center justify-between">
              <h2 className="text-base font-black text-slate-900 flex items-center gap-2">
                <FileText className="w-5 h-5 text-indigo-600" />
                <span>Staging Batch ({filteredBatches.length})</span>
              </h2>
            </div>

            {filteredBatches.length === 0 ? (
              <div className="p-12 text-center space-y-3">
                <div className="w-12 h-12 bg-slate-100 rounded-2xl text-slate-400 flex items-center justify-center mx-auto">
                  <CheckSquare className="w-6 h-6" />
                </div>
                <p className="text-slate-600 text-sm font-bold">No staging records found.</p>
                <p className="text-slate-400 text-xs">Try selecting another site or clearing your search query.</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-slate-50/70 border-b border-slate-100 text-[11px] font-extrabold text-slate-400 uppercase tracking-wider">
                      <th className="py-3.5 px-4 text-center">
                        <input
                          type="checkbox"
                          checked={selectedRecords.length === filteredBatches.length && filteredBatches.length > 0}
                          onChange={toggleSelectAll}
                          className="rounded text-indigo-600 focus:ring-indigo-500 cursor-pointer"
                        />
                      </th>
                      <th className="py-3.5 px-6">Worker & Site</th>
                      <th className="py-3.5 px-6">Pay Period</th>
                      <th className="py-3.5 px-6">Hours (Reg / OT)</th>
                      <th className="py-3.5 px-6">Calculated Gross Pay</th>
                      <th className="py-3.5 px-6">Status</th>
                      <th className="py-3.5 px-6 text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-xs font-medium text-slate-700">
                    {filteredBatches.map((batch) => (
                      <tr key={batch.id} className="hover:bg-indigo-50/30 transition">
                        <td className="py-4 px-4 text-center">
                          <input
                            type="checkbox"
                            checked={selectedRecords.includes(batch.id)}
                            onChange={() => toggleSelect(batch.id)}
                            className="rounded text-indigo-600 focus:ring-indigo-500 cursor-pointer"
                          />
                        </td>

                        <td className="py-4 px-6">
                          <div>
                            <span className="font-bold text-slate-900 block leading-tight">{batch.workerName}</span>
                            <span className="text-[10px] text-slate-400 font-semibold">{batch.workerId} • {batch.site}</span>
                          </div>
                        </td>

                        <td className="py-4 px-6 font-semibold text-slate-600">
                          {batch.period}
                        </td>

                        <td className="py-4 px-6 font-semibold text-slate-800">
                          {batch.regularHours} hrs / <span className="text-indigo-600 font-bold">{batch.otHours} hrs OT</span>
                        </td>

                        <td className="py-4 px-6 font-black text-slate-900 text-sm">
                          BWP {batch.grossPayBWP.toLocaleString()}
                        </td>

                        <td className="py-4 px-6">
                          {batch.status === 'Approved' ? (
                            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-extrabold bg-emerald-50 text-emerald-700 border border-emerald-200">
                              <CheckCircle2 className="w-3 h-3" />
                              Approved
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-extrabold bg-amber-50 text-amber-700 border border-amber-200">
                              <Clock className="w-3 h-3" />
                              Ready for Approval
                            </span>
                          )}
                        </td>

                        <td className="py-4 px-6 text-right">
                          <button
                            onClick={() => setActiveRecord(batch)}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold transition shadow-xs cursor-pointer"
                          >
                            <span>Inspect Breakdown</span>
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </main>
      </div>

      {/* ========================================================= */}
      {/* DETAILED BREAKDOWN MODAL */}
      {/* ========================================================= */}
      {activeRecord && (
        <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-4 sm:p-6 animate-in fade-in duration-200">
          <div className="bg-white w-full max-w-xl rounded-3xl shadow-2xl overflow-hidden flex flex-col border border-slate-200">
            {/* Modal Header */}
            <div className="p-4 sm:p-5 border-b border-slate-200 flex items-center justify-between bg-slate-50">
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-2xl bg-indigo-50 text-indigo-600 border border-indigo-100">
                  <CheckSquare className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-extrabold text-slate-900 text-sm">Staging Calculation Detail</h3>
                  <p className="text-[11px] text-slate-500 font-medium">
                    {activeRecord.workerName} ({activeRecord.workerId})
                  </p>
                </div>
              </div>
              <button
                onClick={() => setActiveRecord(null)}
                className="p-2 text-slate-400 hover:text-slate-700 hover:bg-slate-200 rounded-xl transition cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Content */}
            <div className="p-6 space-y-4 bg-white">
              <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100 space-y-3">
                <div className="flex justify-between text-xs">
                  <span className="text-slate-500 font-medium">Assigned Mine Site:</span>
                  <span className="font-bold text-slate-900">{activeRecord.site}</span>
                </div>
                <div className="flex justify-between text-xs">
                  <span className="text-slate-500 font-medium">Designated Role:</span>
                  <span className="font-bold text-slate-900">{activeRecord.jobTitle}</span>
                </div>
                <div className="flex justify-between text-xs">
                  <span className="text-slate-500 font-medium">Pay Period Window:</span>
                  <span className="font-bold text-slate-900">{activeRecord.period}</span>
                </div>
              </div>

              <div className="space-y-2 pt-2">
                <h4 className="text-[11px] font-black text-slate-400 uppercase tracking-wider">Gross Calculation Summary</h4>
                <div className="flex justify-between text-xs py-2 border-b border-slate-100">
                  <span className="text-slate-600 font-medium">Base Hours ({activeRecord.regularHours} hrs)</span>
                  <span className="font-bold text-slate-900">BWP {(activeRecord.grossPayBWP * 0.8).toLocaleString()}</span>
                </div>
                <div className="flex justify-between text-xs py-2 border-b border-slate-100">
                  <span className="text-slate-600 font-medium">Overtime Hours ({activeRecord.otHours} hrs @ 1.5x)</span>
                  <span className="font-bold text-slate-900">BWP {(activeRecord.grossPayBWP * 0.2).toLocaleString()}</span>
                </div>
                <div className="flex justify-between text-sm py-3 border-t border-slate-200 font-black">
                  <span className="text-slate-900">Total Gross Staged</span>
                  <span className="text-indigo-600">BWP {activeRecord.grossPayBWP.toLocaleString()}</span>
                </div>
              </div>
            </div>

            {/* Modal Actions */}
            <div className="p-4 sm:p-5 border-t border-slate-100 bg-slate-50 flex items-center justify-end gap-3">
              <button
                onClick={() => setActiveRecord(null)}
                className="px-4 py-2.5 text-xs font-bold text-slate-600 hover:bg-slate-200 rounded-xl transition cursor-pointer"
              >
                Close
              </button>
              {activeRecord.status !== 'Approved' && (
                <button
                  onClick={() => handleApproveBatch([activeRecord.id])}
                  className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl transition shadow-md shadow-emerald-600/20 cursor-pointer flex items-center gap-1.5"
                >
                  <CheckCircle2 className="w-4 h-4" />
                  <span>Authorize Record</span>
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}