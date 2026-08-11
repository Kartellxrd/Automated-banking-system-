'use client';

import { useState, useEffect, useMemo } from 'react';
import {
  ShieldAlert,
  Search,
  Filter,
  Download,
  RefreshCw,
  Clock,
  User,
  Activity,
  AlertTriangle,
  Info,
  CheckCircle,
  XCircle,
  ChevronLeft,
  ChevronRight,
  Database,
  KeyRound,
  FileSpreadsheet
} from 'lucide-react';
import { supabase } from '@/lib/supabase';
import AdminNavbar from '@/components/admin/AdminNavbar';
import AdminSideNav from '@/components/admin/AdminSideNav';

// Fallback Mock Logs (Used if DB table isn't populated yet)
const INITIAL_LOGS = [
  {
    id: 'log-101',
    timestamp: '2026-08-11T16:45:12Z',
    actor_name: 'Kago Phuthego',
    actor_role: 'System Admin',
    action: 'ROLE_MATRIX_UPDATE',
    module: 'Access Control',
    ip_address: '102.222.180.45',
    status: 'SUCCESS',
    details: 'Updated shift logging permissions for HR Manager role.'
  },
  {
    id: 'log-102',
    timestamp: '2026-08-11T15:20:00Z',
    actor_name: 'Lesedi Molosiwa',
    actor_role: 'Site Clerk',
    action: 'SHIFT_LOG_CREATE',
    module: 'Operations',
    ip_address: '168.167.90.12',
    status: 'SUCCESS',
    details: 'Logged Day Shift equipment fuel consumption.'
  },
  {
    id: 'log-103',
    timestamp: '2026-08-11T14:05:33Z',
    actor_name: 'Unknown User',
    actor_role: 'Unauthenticated',
    action: 'LOGIN_ATTEMPT',
    module: 'Auth',
    ip_address: '197.218.42.11',
    status: 'FAILED',
    details: 'Failed password attempt for account admin@company.bw.'
  },
  {
    id: 'log-104',
    timestamp: '2026-08-11T11:12:08Z',
    actor_name: 'Thabo Ntuane',
    actor_role: 'Accountant',
    action: 'PAYROLL_DISBURSE',
    module: 'Finance',
    ip_address: '102.222.180.88',
    status: 'SUCCESS',
    details: 'Executed direct disbursement for site contractor batch #402.'
  },
  {
    id: 'log-105',
    timestamp: '2026-08-10T18:30:45Z',
    actor_name: 'System Kernel',
    actor_role: 'Automated Bot',
    action: 'DB_BACKUP_EXEC',
    module: 'System Governance',
    ip_address: '127.0.0.1',
    status: 'SUCCESS',
    details: 'Automated snapshot backup completed successfully.'
  }
];

export default function SecurityAuditLogsPage() {
  const [logs, setLogs] = useState(INITIAL_LOGS);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [moduleFilter, setModuleFilter] = useState('ALL');
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 8;

  useEffect(() => {
    fetchAuditLogs();
  }, []);

  // Fetch Audit Trail from Backend / Supabase
  const fetchAuditLogs = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('audit_logs')
        .select('*')
        .order('timestamp', { ascending: false });

      if (error) {
        console.warn('Backend audit_logs table not ready, showing fallback logs:', error);
      } else if (data && data.length > 0) {
        setLogs(data);
      }
    } catch (err) {
      console.error('Error fetching audit trail:', err);
    } finally {
      setLoading(false);
    }
  };

  // Dynamic Filtering Logic
  const filteredLogs = useMemo(() => {
    return logs.filter((log) => {
      const matchesSearch =
        log.actor_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        log.action.toLowerCase().includes(searchTerm.toLowerCase()) ||
        log.details.toLowerCase().includes(searchTerm.toLowerCase()) ||
        log.ip_address.includes(searchTerm);

      const matchesStatus = statusFilter === 'ALL' || log.status === statusFilter;
      const matchesModule = moduleFilter === 'ALL' || log.module === moduleFilter;

      return matchesSearch && matchesStatus && matchesModule;
    });
  }, [logs, searchTerm, statusFilter, moduleFilter]);

  // Pagination Logic
  const totalPages = Math.ceil(filteredLogs.length / itemsPerPage) || 1;
  const paginatedLogs = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    return filteredLogs.slice(start, start + itemsPerPage);
  }, [filteredLogs, currentPage]);

  // Export Audit Logs to CSV
  const handleExportCSV = () => {
    const headers = ['Log ID,Timestamp,Actor,Role,Action,Module,IP Address,Status,Details'];
    const rows = filteredLogs.map(
      (l) =>
        `"${l.id}","${l.timestamp}","${l.actor_name}","${l.actor_role}","${l.action}","${l.module}","${l.ip_address}","${l.status}","${l.details}"`
    );

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers, ...rows].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `security_audit_logs_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="min-h-screen bg-slate-100 text-slate-900 flex flex-col lg:flex-row font-sans">
      {/* 1. Modular Side Navigation */}
      <AdminSideNav />

      {/* 2. Main Work Area (Sits strictly between Sidebar and Navbar) */}
      <main className="flex-1 p-4 sm:p-6 lg:p-8 space-y-6 overflow-x-hidden">
        
        {/* 3. Modular Top Navbar */}
        <AdminNavbar title="Security & Governance Audit Trail" />

        {/* Page Header & Stats Overview */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs flex items-center gap-4">
            <div className="p-3 bg-indigo-50 border border-indigo-100 rounded-xl text-indigo-600">
              <Activity className="w-5 h-5" />
            </div>
            <div>
              <p className="text-xs font-semibold text-slate-400">Total Audit Events</p>
              <h3 className="text-lg font-bold text-slate-900">{logs.length} Logged</h3>
            </div>
          </div>

          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs flex items-center gap-4">
            <div className="p-3 bg-emerald-50 border border-emerald-100 rounded-xl text-emerald-600">
              <CheckCircle className="w-5 h-5" />
            </div>
            <div>
              <p className="text-xs font-semibold text-slate-400">Successful Operations</p>
              <h3 className="text-lg font-bold text-slate-900">
                {logs.filter((l) => l.status === 'SUCCESS').length} Events
              </h3>
            </div>
          </div>

          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs flex items-center gap-4">
            <div className="p-3 bg-rose-50 border border-rose-100 rounded-xl text-rose-600">
              <AlertTriangle className="w-5 h-5" />
            </div>
            <div>
              <p className="text-xs font-semibold text-slate-400">Security Exceptions</p>
              <h3 className="text-lg font-bold text-slate-900">
                {logs.filter((l) => l.status === 'FAILED' || l.status === 'WARNING').length} Flags
              </h3>
            </div>
          </div>
        </div>

        {/* Controls & Search Toolbar */}
        <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200 shadow-xs flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="relative w-full md:w-80">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search actor, action, IP, or details..."
              value={searchTerm}
              onChange={(e) => {
                setSearchTerm(e.target.value);
                setCurrentPage(1);
              }}
              className="w-full pl-10 pr-4 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 transition"
            />
          </div>

          <div className="flex flex-wrap items-center gap-3 w-full md:w-auto justify-end">
            {/* Status Filter */}
            <select
              value={statusFilter}
              onChange={(e) => {
                setStatusFilter(e.target.value);
                setCurrentPage(1);
              }}
              className="text-xs bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-700 focus:outline-hidden focus:ring-2 focus:ring-indigo-500/20"
            >
              <option value="ALL">All Statuses</option>
              <option value="SUCCESS">Success</option>
              <option value="FAILED">Failed</option>
              <option value="WARNING">Warning</option>
            </select>

            {/* Module Filter */}
            <select
              value={moduleFilter}
              onChange={(e) => {
                setModuleFilter(e.target.value);
                setCurrentPage(1);
              }}
              className="text-xs bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-700 focus:outline-hidden focus:ring-2 focus:ring-indigo-500/20"
            >
              <option value="ALL">All Modules</option>
              <option value="Access Control">Access Control</option>
              <option value="Operations">Operations</option>
              <option value="Auth">Auth</option>
              <option value="Finance">Finance</option>
              <option value="System Governance">System Governance</option>
            </select>

            <button
              onClick={fetchAuditLogs}
              disabled={loading}
              className="p-2 text-slate-600 hover:text-indigo-600 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-xl transition"
              title="Refresh Logs"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin text-indigo-600' : ''}`} />
            </button>

            <button
              onClick={handleExportCSV}
              className="flex items-center gap-2 text-xs font-semibold px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl transition shadow-xs"
            >
              <Download className="w-4 h-4" />
              <span>Export CSV</span>
            </button>
          </div>
        </div>

        {/* Audit Log Table */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead className="bg-slate-50 border-b border-slate-200">
                <tr>
                  <th className="py-3.5 px-5 text-slate-700 font-bold uppercase tracking-wider">Timestamp</th>
                  <th className="py-3.5 px-4 text-slate-700 font-bold uppercase tracking-wider">Actor & Role</th>
                  <th className="py-3.5 px-4 text-slate-700 font-bold uppercase tracking-wider">Action & Module</th>
                  <th className="py-3.5 px-4 text-slate-700 font-bold uppercase tracking-wider">IP Address</th>
                  <th className="py-3.5 px-4 text-slate-700 font-bold uppercase tracking-wider text-center">Status</th>
                  <th className="py-3.5 px-5 text-slate-700 font-bold uppercase tracking-wider min-w-[240px]">Operation Details</th>
                </tr>
              </thead>

              <tbody className="divide-y divide-slate-100">
                {paginatedLogs.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-12 text-center text-slate-400">
                      <div className="flex flex-col items-center gap-2">
                        <ShieldAlert className="w-8 h-8 text-slate-300" />
                        <p className="font-medium">No matching audit events found.</p>
                      </div>
                    </td>
                  </tr>
                ) : (
                  paginatedLogs.map((log) => (
                    <tr key={log.id} className="hover:bg-slate-50/80 transition-colors">
                      {/* Timestamp */}
                      <td className="py-3.5 px-5 font-mono text-slate-500 text-[11px] whitespace-nowrap">
                        <div className="flex items-center gap-1.5">
                          <Clock className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                          <span>{new Date(log.timestamp).toLocaleString()}</span>
                        </div>
                      </td>

                      {/* Actor */}
                      <td className="py-3.5 px-4">
                        <div className="font-semibold text-slate-900">{log.actor_name}</div>
                        <div className="text-[10px] text-slate-400 font-medium">{log.actor_role}</div>
                      </td>

                      {/* Action & Module */}
                      <td className="py-3.5 px-4">
                        <div className="font-mono text-xs font-bold text-slate-800">{log.action}</div>
                        <span className="inline-block mt-0.5 px-2 py-0.5 rounded text-[10px] font-semibold bg-slate-100 text-slate-600 border border-slate-200">
                          {log.module}
                        </span>
                      </td>

                      {/* IP Address */}
                      <td className="py-3.5 px-4 font-mono text-[11px] text-slate-500 whitespace-nowrap">
                        {log.ip_address}
                      </td>

                      {/* Status Tag */}
                      <td className="py-3.5 px-4 text-center whitespace-nowrap">
                        <span
                          className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold ${
                            log.status === 'SUCCESS'
                              ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                              : log.status === 'FAILED'
                              ? 'bg-rose-50 text-rose-700 border border-rose-200'
                              : 'bg-amber-50 text-amber-700 border border-amber-200'
                          }`}
                        >
                          {log.status === 'SUCCESS' && <CheckCircle className="w-3 h-3 text-emerald-600" />}
                          {log.status === 'FAILED' && <XCircle className="w-3 h-3 text-rose-600" />}
                          {log.status === 'WARNING' && <AlertTriangle className="w-3 h-3 text-amber-600" />}
                          <span>{log.status}</span>
                        </span>
                      </td>

                      {/* Details */}
                      <td className="py-3.5 px-5 text-slate-600 font-medium text-[11px]">
                        {log.details}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination Footer */}
          <div className="bg-slate-50 border-t border-slate-200 px-5 py-3.5 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-slate-500">
            <div>
              Showing <span className="font-semibold text-slate-800">{paginatedLogs.length}</span> of{' '}
              <span className="font-semibold text-slate-800">{filteredLogs.length}</span> recorded logs
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() => setCurrentPage((p) => Math.max(p - 1, 1))}
                disabled={currentPage === 1}
                className="p-1.5 border border-slate-200 rounded-lg hover:bg-white disabled:opacity-40 disabled:cursor-not-allowed transition"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <span className="font-semibold text-slate-700">
                Page {currentPage} of {totalPages}
              </span>
              <button
                onClick={() => setCurrentPage((p) => Math.min(p + 1, totalPages))}
                disabled={currentPage === totalPages}
                className="p-1.5 border border-slate-200 rounded-lg hover:bg-white disabled:opacity-40 disabled:cursor-not-allowed transition"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}