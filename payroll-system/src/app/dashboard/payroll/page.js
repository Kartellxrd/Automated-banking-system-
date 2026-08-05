'use client';

import { useState, useEffect } from 'react';
import { CreditCard, Wallet, Download, CheckCircle2, Loader2, DollarSign } from 'lucide-react';

export default function PayrollPage() {
  const [payPeriodId, setPayPeriodId] = useState(null);
  const [payrollData, setPayrollData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);
  const [isPaid, setIsPaid] = useState(false);

  const fetchPayroll = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/hours');
      const result = await res.json();
      if (result.success) {
        setPayPeriodId(result.pay_period_id);
        
        const empRes = await fetch('/api/employees');
        const empResult = await empRes.json();
        
        if (empResult.success) {
          const empMap = new Map();
          (empResult.data || []).forEach((e) => empMap.set(e.id, e));

          const combined = (result.data || []).map((item) => {
            const empDetails = empMap.get(item.employee_id);
            const profile = empDetails?.employee_payout_profiles?.[0];
            return {
              ...item,
              profile,
              provider: profile?.payout_providers,
              channel: profile?.payout_providers?.payment_channels?.code
            };
          });

          setPayrollData(combined);
        }
      }
    } catch (err) {
      console.error('Failed to load payroll records:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPayroll();
  }, []);

  const handleDownloadCSV = (type) => {
    if (!payPeriodId) return;
    window.location.href = `/api/payroll/export?pay_period_id=${payPeriodId}&type=${type}`;
  };

  const handleFinalizePayroll = () => {
    setProcessing(true);
    setTimeout(() => {
      setProcessing(false);
      setIsPaid(true);
    }, 1200);
  };

  const totalNetPay = payrollData.reduce((sum, item) => sum + (parseFloat(item.gross_pay) || 0), 0);
  const bankEntries = payrollData.filter((item) => item.channel === 'BANK');
  const walletEntries = payrollData.filter((item) => item.channel === 'MOBILE_WALLET');

  const bankTotal = bankEntries.reduce((sum, item) => sum + (parseFloat(item.gross_pay) || 0), 0);
  const walletTotal = walletEntries.reduce((sum, item) => sum + (parseFloat(item.gross_pay) || 0), 0);

  return (
    <div className="min-h-screen bg-slate-50 p-4 md:p-8 text-slate-800">
      <div className="max-w-7xl mx-auto space-y-6">
        
        {/* HEADER SECTION */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-slate-900">Payroll Disbursement Engine</h1>
            <p className="text-sm text-slate-500 mt-1">
              Review final calculated pay and generate payout files for Banks & Mobile Wallets (Orange Money, Smega, MyZaka).
            </p>
          </div>

          <button
            onClick={handleFinalizePayroll}
            disabled={processing || isPaid || payrollData.length === 0}
            className={`w-full sm:w-auto inline-flex items-center justify-center gap-2 font-bold px-6 py-3 rounded-xl transition shadow-sm active:scale-95 ${
              isPaid
                ? 'bg-emerald-600 text-white cursor-default'
                : 'bg-indigo-600 hover:bg-indigo-700 text-white'
            }`}
          >
            {processing ? (
              <Loader2 className="w-5 h-5 animate-spin" />
            ) : isPaid ? (
              <>
                <CheckCircle2 className="w-5 h-5" />
                <span>Payroll Finalized</span>
              </>
            ) : (
              <>
                <DollarSign className="w-5 h-5" />
                <span>Mark as Processed</span>
              </>
            )}
          </button>
        </div>

        {/* SUMMARY STAT CARDS */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Total Net Disbursement</span>
            <p className="text-3xl font-extrabold text-slate-900 mt-2">P{totalNetPay.toFixed(2)}</p>
            <p className="text-xs text-slate-500 mt-1">{payrollData.length} Workers Included</p>
          </div>

          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex flex-col justify-between space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Bank EFT Batch</span>
                <p className="text-2xl font-bold text-slate-900 mt-1">P{bankTotal.toFixed(2)}</p>
                <p className="text-xs text-slate-500">{bankEntries.length} Bank Accounts</p>
              </div>
              <div className="p-3 bg-blue-50 text-blue-600 rounded-xl">
                <CreditCard className="w-6 h-6" />
              </div>
            </div>
            <button
              onClick={() => handleDownloadCSV('bank')}
              disabled={bankEntries.length === 0}
              className="w-full py-2.5 px-4 bg-slate-100 hover:bg-blue-50 text-slate-800 hover:text-blue-700 font-semibold text-xs rounded-xl border border-slate-200 transition flex items-center justify-center gap-2 disabled:opacity-40"
            >
              <Download className="w-4 h-4" />
              <span>Download Bank CSV</span>
            </button>
          </div>

          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex flex-col justify-between space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Mobile Money Batch</span>
                <p className="text-2xl font-bold text-slate-900 mt-1">P{walletTotal.toFixed(2)}</p>
                <p className="text-xs text-slate-500">{walletEntries.length} Mobile Wallets</p>
              </div>
              <div className="p-3 bg-emerald-50 text-emerald-600 rounded-xl">
                <Wallet className="w-6 h-6" />
              </div>
            </div>
            <button
              onClick={() => handleDownloadCSV('mobile_wallet')}
              disabled={walletEntries.length === 0}
              className="w-full py-2.5 px-4 bg-slate-100 hover:bg-emerald-50 text-slate-800 hover:text-emerald-700 font-semibold text-xs rounded-xl border border-slate-200 transition flex items-center justify-center gap-2 disabled:opacity-40"
            >
              <Download className="w-4 h-4" />
              <span>Download Wallet CSV</span>
            </button>
          </div>
        </div>

        {/* PAYROLL RECONCILIATION TABLE */}
        {loading ? (
          <div className="flex flex-col items-center justify-center py-16 bg-white rounded-2xl border border-slate-200">
            <Loader2 className="w-8 h-8 text-indigo-600 animate-spin" />
            <p className="text-slate-500 mt-3 text-sm font-medium">Calculating net payouts...</p>
          </div>
        ) : (
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="p-5 border-b border-slate-100 bg-slate-50 flex items-center justify-between">
              <h2 className="text-base font-bold text-slate-900">Worker Payout Reconciliation Table</h2>
              <span className="text-xs font-medium text-slate-500">Auto-calculated from paper logbook hours</span>
            </div>

            <div className="hidden md:block overflow-x-auto">
              <table className="w-full text-left text-sm border-collapse">
                <thead className="bg-slate-50/50 border-b border-slate-200 text-slate-600 font-semibold">
                  <tr>
                    <th className="py-4 px-6">Worker Name</th>
                    <th className="py-4 px-6">Hours</th>
                    <th className="py-4 px-6">Rate</th>
                    <th className="py-4 px-6">Destination Provider</th>
                    <th className="py-4 px-6">Account / Wallet No.</th>
                    <th className="py-4 px-6 text-right">Net Payable</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {payrollData.map((item) => (
                    <tr key={item.employee_id} className="hover:bg-slate-50/80 transition">
                      <td className="py-4 px-6 font-semibold text-slate-900">
                        {item.first_name} {item.last_name}
                      </td>
                      <td className="py-4 px-6 text-slate-600 font-medium">{item.total_hours_worked} hrs</td>
                      <td className="py-4 px-6 text-slate-600">P{parseFloat(item.hourly_rate).toFixed(2)}</td>
                      <td className="py-4 px-6">
                        {item.channel === 'MOBILE_WALLET' ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                            <Wallet className="w-3.5 h-3.5" />
                            {item.provider?.name || 'MyZaka / Orange Money / Smega'}
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-blue-50 text-blue-700 border border-blue-200">
                            <CreditCard className="w-3.5 h-3.5" />
                            {item.provider?.name || 'Bank Account'}
                          </span>
                        )}
                      </td>
                      <td className="py-4 px-6 font-mono text-slate-700">
                        {item.profile?.account_or_mobile_number || 'N/A'}
                      </td>
                      <td className="py-4 px-6 text-right font-extrabold text-slate-900">
                        P{parseFloat(item.gross_pay || 0).toFixed(2)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="grid grid-cols-1 gap-3 p-4 md:hidden">
              {payrollData.map((item) => (
                <div key={item.employee_id} className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-2">
                  <div className="flex items-center justify-between">
                    <h3 className="font-bold text-slate-900">{item.first_name} {item.last_name}</h3>
                    <span className="text-base font-extrabold text-slate-900">P{parseFloat(item.gross_pay || 0).toFixed(2)}</span>
                  </div>
                  <div className="flex items-center justify-between text-xs text-slate-500 pt-1">
                    <span>{item.total_hours_worked} hrs @ P{parseFloat(item.hourly_rate).toFixed(2)}/hr</span>
                    <span className="font-mono bg-white px-2 py-0.5 rounded border border-slate-200">
                      {item.profile?.account_or_mobile_number || 'N/A'}
                    </span>
                  </div>
                </div>
              ))}
            </div>

          </div>
        )}

      </div>
    </div>
  );
}