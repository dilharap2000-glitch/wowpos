import React, { useState, useEffect } from 'react';
import {
  BarChart3,
  Calendar,
  FileText,
  Printer,
  Download,
  Users,
  CreditCard,
  QrCode,
  TrendingUp,
} from 'lucide-react';
import { api } from '../lib/api.ts';
import { getColomboToday } from '../lib/date-utils.ts';
import { useBusiness } from '../context/BusinessContext.tsx';

export const ReportsView: React.FC = () => {
  const { business, formatCurrency } = useBusiness();
  const [reportType, setReportType] = useState<'daily' | 'monthly' | 'attendance' | 'membership'>('daily');
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const today = getColomboToday();

  useEffect(() => {
    loadReport();
  }, [reportType]);

  const loadReport = async () => {
    setLoading(true);
    try {
      const res = await api.getReports({ type: reportType, startDate: today, endDate: today });
      setData(res);
    } catch (err) {
      console.error('Failed to load report:', err);
    } finally {
      setLoading(false);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div id="reports-view" className="space-y-6">
      {/* Top Header & Report Type Selectors */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-[#121212] border border-white/5 rounded-3xl p-4 sm:p-5">
        <div className="flex items-center gap-2 overflow-x-auto scrollbar-none">
          {[
            { id: 'daily', label: "Daily Closeout", icon: <Calendar className="w-3.5 h-3.5" /> },
            { id: 'monthly', label: 'Monthly Audit', icon: <CreditCard className="w-3.5 h-3.5" /> },
            { id: 'attendance', label: 'Attendance Audit', icon: <QrCode className="w-3.5 h-3.5" /> },
            { id: 'membership', label: 'Member Status', icon: <Users className="w-3.5 h-3.5" /> },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setReportType(tab.id as any)}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-full text-xs uppercase tracking-wider font-black whitespace-nowrap transition-all ${
                reportType === tab.id
                  ? 'bg-[#FACC15] text-black shadow-md shadow-[#FACC15]/20'
                  : 'bg-white/5 text-gray-400 hover:text-white border border-white/5'
              }`}
            >
              {tab.icon}
              <span>{tab.label}</span>
            </button>
          ))}
        </div>

        <button
          onClick={handlePrint}
          className="flex items-center gap-2 px-5 py-2.5 rounded-full bg-white/5 hover:bg-white/10 border border-white/10 text-white text-xs font-black uppercase tracking-wider transition-colors shrink-0 active:scale-95"
        >
          <Printer className="w-4 h-4 text-[#FACC15]" />
          <span>Print / Export PDF</span>
        </button>
      </div>

      {/* Report Canvas Content */}
      <div className="bg-[#121212] border border-white/5 rounded-3xl p-6 sm:p-8 space-y-6">
        {/* Printable Report Title Banner */}
        <div className="pb-6 border-b border-white/5 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div>
            <span className="text-[10px] font-mono uppercase tracking-widest text-[#FACC15] font-black">
              OFFICIAL SYSTEM REPORT • {business.gymName.toUpperCase()}
            </span>
            <h2 className="text-xl font-black italic text-white uppercase tracking-wide mt-1">
              {reportType === 'daily'
                ? `Daily Business Closeout Report (${today})`
                : reportType === 'monthly'
                ? 'Monthly Revenue & Collections Summary'
                : reportType === 'attendance'
                ? 'Member Check-in & Traffic Audit'
                : 'Membership Status & Expiry Breakdown'}
            </h2>
          </div>
          <div className="text-right text-xs font-mono text-gray-500">
            <div>Date: {today}</div>
            <div className="text-green-400 font-bold">Timezone: Asia/Colombo</div>
          </div>
        </div>

        {loading ? (
          <div className="py-24 text-center text-gray-500 animate-pulse text-xs uppercase font-black tracking-widest">
            Compiling audit metrics from database...
          </div>
        ) : (
          <div className="space-y-6">
            {/* Daily Closeout Summary */}
            {data?.daily && (
              <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
                <div className="p-5 rounded-2xl bg-black/40 border border-white/5">
                  <span className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">Today's Revenue</span>
                  <p className="text-2xl font-black italic text-white mt-1">
                    {business.currency} {data.daily.totalRevenue.toLocaleString()}
                  </p>
                </div>
                <div className="p-5 rounded-2xl bg-black/40 border border-white/5">
                  <span className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">Cash Register</span>
                  <p className="text-2xl font-black italic text-orange-400 mt-1">
                    {business.currency} {data.daily.cashRevenue.toLocaleString()}
                  </p>
                </div>
                <div className="p-5 rounded-2xl bg-black/40 border border-white/5">
                  <span className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">Bank Transfers</span>
                  <p className="text-2xl font-black italic text-green-400 mt-1">
                    {business.currency} {data.daily.bankTransferRevenue.toLocaleString()}
                  </p>
                </div>
                <div className="p-5 rounded-2xl bg-black/40 border border-[#FACC15]/20">
                  <span className="text-[10px] font-bold text-[#FACC15] uppercase tracking-wider">Athlete Check-ins</span>
                  <p className="text-2xl font-black italic text-[#FACC15] mt-1">
                    {data.daily.totalCheckIns}
                  </p>
                </div>
              </div>
            )}

            {/* Payments Table */}
            {data?.payments?.items && (
              <div>
                <h3 className="text-xs font-black text-gray-400 uppercase tracking-widest mb-3">
                  Transaction Audit ({data.payments.items.length} records)
                </h3>
                <div className="border border-white/5 rounded-2xl overflow-hidden">
                  <table className="w-full text-left text-xs">
                    <thead>
                      <tr className="bg-white/[0.02] text-gray-500 font-black text-[10px] uppercase tracking-widest border-b border-white/5">
                        <th className="py-3 px-3">Receipt</th>
                        <th className="py-3 px-3">Member #</th>
                        <th className="py-3 px-3">Package</th>
                        <th className="py-3 px-3">Amount</th>
                        <th className="py-3 px-3">Method</th>
                        <th className="py-3 px-3">Valid Until</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-white/[0.03]">
                      {data.payments.items.map((p: any) => (
                        <tr key={p.id} className="hover:bg-white/[0.02]">
                          <td className="py-3 px-3 font-mono text-gray-500">#{p.id}</td>
                          <td className="py-3 px-3">
                            <span className="px-2 py-0.5 rounded bg-black/40 border border-white/10 font-mono font-bold text-[#FACC15]">
                              {p.memberNumber}
                            </span>
                          </td>
                          <td className="py-3 px-3 capitalize font-bold text-gray-300">{p.package.replace('_', ' ')}</td>
                          <td className="py-3 px-3 font-black text-white">{business.currency} {p.amount.toLocaleString()}</td>
                          <td className="py-3 px-3 uppercase text-[9px] font-bold text-gray-400">
                            {p.paymentMethod.replace('_', ' ')}
                          </td>
                          <td className="py-3 px-3 font-mono text-gray-400">{p.newExpiryDate}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* Attendance Audit Table */}
            {data?.attendances?.items && (
              <div>
                <h3 className="text-xs font-black text-gray-400 uppercase tracking-widest mb-3">
                  Verified Check-in Logs ({data.attendances.items.length} visits)
                </h3>
                <div className="border border-white/5 rounded-2xl overflow-hidden">
                  <table className="w-full text-left text-xs">
                    <thead>
                      <tr className="bg-white/[0.02] text-gray-500 font-black text-[10px] uppercase tracking-widest border-b border-white/5">
                        <th className="py-3 px-3">Time</th>
                        <th className="py-3 px-3">Member #</th>
                        <th className="py-3 px-3">Athlete Name</th>
                        <th className="py-3 px-3">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-white/[0.03]">
                      {data.attendances.items.map((a: any) => (
                        <tr key={a.id} className="hover:bg-white/[0.02]">
                          <td className="py-3 px-3 font-mono text-[#FACC15] font-black">{a.attendanceTime}</td>
                          <td className="py-3 px-3 font-mono font-bold text-gray-300">{a.memberNumber}</td>
                          <td className="py-3 px-3 font-bold text-white">{a.memberName || 'Gym Member'}</td>
                          <td className="py-3 px-3">
                            <span className="px-2.5 py-0.5 rounded-full text-[9px] font-black uppercase bg-green-500/15 border border-green-500/30 text-green-400">
                              Verified
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
