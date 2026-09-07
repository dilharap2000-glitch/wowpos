import React, { useState, useEffect } from 'react';
import {
  CreditCard,
  DollarSign,
  Calendar,
  Filter,
  RefreshCw,
  ArrowDownRight,
  TrendingUp,
  Receipt,
  Download,
} from 'lucide-react';
import { api } from '../lib/api.ts';
import { Payment } from '../types.ts';
import { getColomboToday } from '../lib/date-utils.ts';
import { useBusiness } from '../context/BusinessContext.tsx';

export const PaymentsView: React.FC = () => {
  const { business } = useBusiness();
  const [payments, setPayments] = useState<Payment[]>([]);
  const [loading, setLoading] = useState(false);
  const [totalAmount, setTotalAmount] = useState(0);

  // Filters
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('all');
  const [packageType, setPackageType] = useState('all');

  useEffect(() => {
    loadPayments();
  }, [startDate, endDate, paymentMethod, packageType]);

  const loadPayments = async () => {
    setLoading(true);
    try {
      const res = await api.getPayments({
        startDate: startDate || undefined,
        endDate: endDate || undefined,
        paymentMethod: paymentMethod !== 'all' ? paymentMethod : undefined,
        package: packageType !== 'all' ? packageType : undefined,
      });

      setPayments(res.items || []);
      setTotalAmount(res.totalAmount || 0);
    } catch (err) {
      console.error('Failed to load payments:', err);
    } finally {
      setLoading(false);
    }
  };

  const cashTotal = payments
    .filter((p) => p.paymentMethod === 'cash')
    .reduce((acc, p) => acc + p.amount, 0);

  const bankTotal = payments
    .filter((p) => p.paymentMethod === 'bank_transfer')
    .reduce((acc, p) => acc + p.amount, 0);

  const handleExportCsv = () => {
    if (!payments.length) return;
    const headers = ['ID', 'MemberNumber', 'Amount', 'PaymentDate', 'Package', 'PaymentMethod', 'PreviousExpiry', 'NewExpiry', 'Cashier', 'Notes'];
    const rows = payments.map((p) => [
      p.id,
      p.memberNumber,
      p.amount,
      p.paymentDate,
      p.package,
      p.paymentMethod,
      p.previousExpiryDate || '',
      p.newExpiryDate,
      p.createdBy || '',
      `"${(p.notes || '').replace(/"/g, '""')}"`,
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map((e) => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `payments_report_${getColomboToday()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div id="payments-view" className="space-y-6">
      {/* 4 Financial Summary Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Collected */}
        <div className="bg-[#121212] border border-[#FACC15]/20 bg-gradient-to-br from-[#121212] to-[#1a180d] rounded-2xl p-5">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[10px] font-bold uppercase tracking-widest text-gray-400">
              Total Revenue
            </span>
            <div className="w-8 h-8 rounded-xl bg-[#FACC15]/10 border border-[#FACC15]/20 flex items-center justify-center text-[#FACC15]">
              <TrendingUp className="w-4 h-4" />
            </div>
          </div>
          <p className="text-3xl font-black italic text-[#FACC15]">{business.currency} {totalAmount.toLocaleString()}</p>
          <p className="text-[10px] text-[#FACC15]/70 font-bold uppercase tracking-wider mt-2">
            {payments.length} transactions
          </p>
        </div>

        {/* Cash Collected */}
        <div className="bg-[#121212] border border-white/5 rounded-2xl p-5">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[10px] font-bold uppercase tracking-widest text-gray-500">
              Cash Drawer
            </span>
            <div className="w-8 h-8 rounded-xl bg-orange-500/10 border border-orange-500/20 flex items-center justify-center text-orange-400">
              <Receipt className="w-4 h-4" />
            </div>
          </div>
          <p className="text-3xl font-black italic text-white">{business.currency} {cashTotal.toLocaleString()}</p>
          <p className="text-[10px] text-gray-500 font-bold uppercase tracking-wider mt-2">Counter collections</p>
        </div>

        {/* Bank Transfer */}
        <div className="bg-[#121212] border border-white/5 rounded-2xl p-5">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[10px] font-bold uppercase tracking-widest text-gray-500">
              Bank Transfers
            </span>
            <div className="w-8 h-8 rounded-xl bg-green-500/10 border border-green-500/20 flex items-center justify-center text-green-400">
              <CreditCard className="w-4 h-4" />
            </div>
          </div>
          <p className="text-3xl font-black italic text-white">{business.currency} {bankTotal.toLocaleString()}</p>
          <p className="text-[10px] text-gray-500 font-bold uppercase tracking-wider mt-2">Direct bank deposits</p>
        </div>

        {/* Average Transaction */}
        <div className="bg-[#121212] border border-white/5 rounded-2xl p-5">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[10px] font-bold uppercase tracking-widest text-gray-500">
              Avg. Receipt
            </span>
            <div className="w-8 h-8 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center text-gray-300">
              <DollarSign className="w-4 h-4" />
            </div>
          </div>
          <p className="text-3xl font-black italic text-white">
            {business.currency} {payments.length ? Math.round(totalAmount / payments.length).toLocaleString() : 0}
          </p>
          <p className="text-[10px] text-gray-500 font-bold uppercase tracking-wider mt-2">Per athlete checkout</p>
        </div>
      </div>

      {/* Filter Toolbar */}
      <div className="bg-[#121212] border border-white/5 rounded-3xl p-4 sm:p-5 flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-3">
          {/* Start Date */}
          <div className="flex items-center gap-2">
            <span className="text-[10px] text-gray-500 font-black uppercase tracking-wider">From:</span>
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="bg-black/40 border border-white/10 rounded-xl px-3 py-2 text-xs text-white font-mono focus:border-[#FACC15] focus:outline-hidden"
            />
          </div>

          {/* End Date */}
          <div className="flex items-center gap-2">
            <span className="text-[10px] text-gray-500 font-black uppercase tracking-wider">To:</span>
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="bg-black/40 border border-white/10 rounded-xl px-3 py-2 text-xs text-white font-mono focus:border-[#FACC15] focus:outline-hidden"
            />
          </div>

          {/* Payment Method Filter */}
          <select
            value={paymentMethod}
            onChange={(e) => setPaymentMethod(e.target.value)}
            className="bg-black/40 border border-white/10 rounded-xl px-3 py-2 text-xs text-white font-bold focus:border-[#FACC15] focus:outline-hidden"
          >
            <option value="all">All Methods</option>
            <option value="cash">Cash Only</option>
            <option value="bank_transfer">Bank Transfer Only</option>
          </select>

          {/* Package Filter */}
          <select
            value={packageType}
            onChange={(e) => setPackageType(e.target.value)}
            className="bg-black/40 border border-white/10 rounded-xl px-3 py-2 text-xs text-white font-bold focus:border-[#FACC15] focus:outline-hidden"
          >
            <option value="all">All Packages</option>
            <option value="monthly">Monthly</option>
            <option value="3_months">3 Months</option>
            <option value="6_months">6 Months</option>
            <option value="annual">Annual</option>
          </select>

          {(startDate || endDate || paymentMethod !== 'all' || packageType !== 'all') && (
            <button
              onClick={() => {
                setStartDate('');
                setEndDate('');
                setPaymentMethod('all');
                setPackageType('all');
              }}
              className="text-xs text-[#FACC15] hover:underline font-bold uppercase tracking-wider"
            >
              Reset
            </button>
          )}
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={loadPayments}
            className="p-2.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-gray-400 hover:text-white transition-colors"
            title="Refresh Ledger"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin text-[#FACC15]' : ''}`} />
          </button>

          <button
            onClick={handleExportCsv}
            disabled={payments.length === 0}
            className="flex items-center gap-2 px-4 py-2.5 rounded-full bg-[#FACC15] hover:bg-yellow-300 disabled:opacity-40 text-black text-xs font-black uppercase tracking-widest shadow-md shadow-[#FACC15]/10 transition-all active:scale-95"
          >
            <Download className="w-3.5 h-3.5 stroke-[2.5]" />
            <span>Export CSV</span>
          </button>
        </div>
      </div>

      {/* Payments Ledger Table */}
      <div className="bg-[#121212] border border-white/5 rounded-3xl overflow-hidden p-2 sm:p-4">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-white/5 text-gray-500 uppercase tracking-widest font-black text-[10px]">
                <th className="py-3 px-3">Receipt #</th>
                <th className="py-3 px-3">Member #</th>
                <th className="py-3 px-3">Payment Date</th>
                <th className="py-3 px-3">Package</th>
                <th className="py-3 px-3">Amount</th>
                <th className="py-3 px-3">Method</th>
                <th className="py-3 px-3">Prev Expiry</th>
                <th className="py-3 px-3">New Expiry</th>
                <th className="py-3 px-3">Staff</th>
                <th className="py-3 px-3">Notes</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/[0.03]">
              {loading && payments.length === 0 ? (
                <tr>
                  <td colSpan={10} className="py-16 text-center text-gray-500 animate-pulse font-black uppercase text-xs tracking-widest">
                    Loading payments ledger...
                  </td>
                </tr>
              ) : payments.length === 0 ? (
                <tr>
                  <td colSpan={10} className="py-16 text-center text-gray-500 font-semibold">
                    No payment records match the current filter criteria.
                  </td>
                </tr>
              ) : (
                payments.map((p) => (
                  <tr key={p.id} className="hover:bg-white/[0.02] transition-colors">
                    <td className="py-3.5 px-3 font-mono text-gray-500 font-bold">#{p.id}</td>
                    <td className="py-3.5 px-3">
                      <span className="px-2 py-0.5 rounded bg-black/40 border border-white/10 font-mono font-black text-[#FACC15]">
                        {p.memberNumber}
                      </span>
                    </td>
                    <td className="py-3.5 px-3 font-mono text-gray-300">{p.paymentDate}</td>
                    <td className="py-3.5 px-3 capitalize font-bold text-white">
                      {p.package.replace('_', ' ')}
                    </td>
                    <td className="py-3.5 px-3 font-black text-green-400 font-mono text-sm">
                      {business.currency} {p.amount.toLocaleString()}
                    </td>
                    <td className="py-3.5 px-3">
                      <span
                        className={`px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider ${
                          p.paymentMethod === 'cash'
                            ? 'bg-orange-500/15 border border-orange-500/30 text-orange-400'
                            : 'bg-green-500/15 border border-green-500/30 text-green-400'
                        }`}
                      >
                        {p.paymentMethod.replace('_', ' ')}
                      </span>
                    </td>
                    <td className="py-3.5 px-3 font-mono text-gray-500">
                      {p.previousExpiryDate || 'N/A'}
                    </td>
                    <td className="py-3.5 px-3 font-mono font-bold text-[#FACC15]">
                      {p.newExpiryDate}
                    </td>
                    <td className="py-3.5 px-3 text-gray-400">{p.createdBy || 'Admin'}</td>
                    <td className="py-3.5 px-3 text-gray-500 max-w-xs truncate">{p.notes || '-'}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
