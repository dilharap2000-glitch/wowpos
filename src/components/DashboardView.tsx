import React, { useState } from 'react';
import {
  Users,
  AlertTriangle,
  Clock,
  QrCode,
  Eye,
  EyeOff,
  UserCheck,
  Calendar,
  TrendingUp,
  CreditCard,
  ArrowUpRight,
  ShieldAlert,
  DollarSign,
  UserX,
  Sparkles,
} from 'lucide-react';
import { DashboardStats, Attendance } from '../types.ts';
import { api } from '../lib/api.ts';
import { speakMessage } from '../lib/voice.ts';

interface DashboardViewProps {
  stats: DashboardStats | null;
  loading: boolean;
  onNavigateToMembers: (filter?: string) => void;
  onNavigateToScanner: () => void;
  onOpenAddMember: () => void;
}

export const DashboardView: React.FC<DashboardViewProps> = ({
  stats,
  loading,
  onNavigateToMembers,
  onNavigateToScanner,
  onOpenAddMember,
}) => {
  // Today's revenue privacy toggle: masked by default as specified in the prompt
  const [showRevenue, setShowRevenue] = useState(false);
  const [showCashRevenue, setShowCashRevenue] = useState(false);
  const [showBankRevenue, setShowBankRevenue] = useState(false);
  const [revenueTimeframe, setRevenueTimeframe] = useState<'daily' | 'monthly'>('daily');
  const [quickScanInput, setQuickScanInput] = useState('');
  const [quickScanStatus, setQuickScanStatus] = useState<string | null>(null);

  const handleQuickScan = async () => {
    const code = quickScanInput.trim();
    if (!code) {
      onNavigateToScanner();
      return;
    }
    try {
      const res = await api.scanAttendance(code);
      setQuickScanStatus(res.title || 'Check-in processed');
      if (res.status === 'success') {
        speakMessage(`Welcome ${res.memberName || ''}. Enjoy your workout.`);
      } else {
        speakMessage(res.message);
      }
      setQuickScanInput('');
      setTimeout(() => setQuickScanStatus(null), 3000);
    } catch (err: any) {
      setQuickScanStatus(err.message || 'Scan error');
      setTimeout(() => setQuickScanStatus(null), 3000);
    }
  };

  if (loading && !stats) {
    return (
      <div className="space-y-6 animate-pulse">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="h-28 bg-[#121212] rounded-2xl border border-white/5" />
          ))}
        </div>
        <div className="h-96 bg-[#121212] rounded-3xl border border-white/5" />
      </div>
    );
  }

  const formatCurrency = (val: number) => `Rs. ${val.toLocaleString()}`;

  return (
    <div id="dashboard-view" className="space-y-6">
      {/* 6 Performance Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
        {/* 1. Active Members */}
        <div
          id="stat-card-active-members"
          onClick={() => onNavigateToMembers('active')}
          className="cursor-pointer bg-[#121212] p-5 rounded-2xl border border-white/5 hover:border-white/20 transition-all group relative"
        >
          <div className="flex justify-between items-start mb-2">
            <span className="text-[10px] font-bold uppercase tracking-widest text-gray-500">
              Active Members
            </span>
            <div className="w-2 h-2 rounded-full bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.5)]"></div>
          </div>
          <div className="text-3xl font-black italic text-white">
            {(stats?.activeMembers ?? 0).toLocaleString()}
          </div>
          <div className="mt-2 text-[10px] text-green-500 font-bold tracking-wider flex items-center justify-between">
            <span>Live Enrolled</span>
            <ArrowUpRight className="w-3 h-3 text-gray-500 group-hover:text-green-400 transition-colors" />
          </div>
        </div>

        {/* 2. Expired Members */}
        <div
          id="stat-card-expired-members"
          onClick={() => onNavigateToMembers('expired')}
          className="cursor-pointer bg-[#121212] p-5 rounded-2xl border border-white/5 hover:border-white/20 transition-all group relative"
        >
          <div className="flex justify-between items-start mb-2">
            <span className="text-[10px] font-bold uppercase tracking-widest text-gray-500">
              Expired Members
            </span>
            <div className="w-2 h-2 rounded-full bg-red-500 shadow-[0_0_8px_rgba(239,68,68,0.5)]"></div>
          </div>
          <div className="text-3xl font-black italic text-white">
            {stats?.expiredMembers ?? 0}
          </div>
          <div className="mt-2 text-[10px] text-red-400 font-bold tracking-wider flex items-center justify-between">
            <span>Pending Renewal</span>
            <ArrowUpRight className="w-3 h-3 text-gray-500 group-hover:text-red-400 transition-colors" />
          </div>
        </div>

        {/* 3. Due Today */}
        <div
          id="stat-card-due-today"
          onClick={() => onNavigateToMembers('due_today')}
          className="cursor-pointer bg-[#121212] p-5 rounded-2xl border border-white/5 hover:border-white/20 transition-all group relative"
        >
          <div className="flex justify-between items-start mb-2">
            <span className="text-[10px] font-bold uppercase tracking-widest text-gray-500">
              Due Today
            </span>
            <div className="w-2 h-2 rounded-full bg-orange-500 shadow-[0_0_8px_rgba(249,115,22,0.5)]"></div>
          </div>
          <div className="text-3xl font-black italic text-white">
            {stats?.paymentDueToday ?? 0}
          </div>
          <div className="mt-2 text-[10px] text-orange-400 font-bold tracking-wider flex items-center justify-between">
            <span>Expiring &lt; 24h</span>
            <ArrowUpRight className="w-3 h-3 text-gray-500 group-hover:text-orange-400 transition-colors" />
          </div>
        </div>

        {/* 4. Due Tomorrow */}
        <div
          id="stat-card-due-tomorrow"
          onClick={() => onNavigateToMembers('due_tomorrow')}
          className="cursor-pointer bg-[#121212] p-5 rounded-2xl border border-white/5 hover:border-white/20 transition-all group relative"
        >
          <div className="flex justify-between items-start mb-2">
            <span className="text-[10px] font-bold uppercase tracking-widest text-gray-500">
              Due Tomorrow
            </span>
            <div className="w-2 h-2 rounded-full bg-amber-400 shadow-[0_0_8px_rgba(251,191,36,0.5)]"></div>
          </div>
          <div className="text-3xl font-black italic text-white">
            {stats?.paymentDueTomorrow ?? 0}
          </div>
          <div className="mt-2 text-[10px] text-amber-400 font-bold tracking-wider flex items-center justify-between">
            <span>Expiring &lt; 48h</span>
            <ArrowUpRight className="w-3 h-3 text-gray-500 group-hover:text-amber-400 transition-colors" />
          </div>
        </div>

        {/* 5. Today's Check-ins */}
        <div
          id="stat-card-today-checkins"
          onClick={onNavigateToScanner}
          className="cursor-pointer bg-[#121212] p-5 rounded-2xl border border-white/5 hover:border-white/20 transition-all group relative"
        >
          <div className="flex justify-between items-start mb-2">
            <span className="text-[10px] font-bold uppercase tracking-widest text-gray-500">
              Today's Scans
            </span>
            <div className="w-2 h-2 rounded-full bg-[#FACC15] shadow-[0_0_8px_rgba(250,204,21,0.5)]"></div>
          </div>
          <div className="text-3xl font-black italic text-[#FACC15]">
            {stats?.todayCheckInsCount ?? 0}
          </div>
          <div className="mt-2 text-[10px] text-[#FACC15]/70 font-bold tracking-wider flex items-center justify-between">
            <span>Live Gym Turnstile</span>
            <ArrowUpRight className="w-3 h-3 text-[#FACC15] transition-colors" />
          </div>
        </div>

        {/* 6. Today's Revenue (Special Gradient Card as in Design) */}
        <div
          id="stat-card-today-revenue"
          className="bg-[#121212] p-5 rounded-2xl border border-[#FACC15]/20 bg-gradient-to-br from-[#121212] to-[#1a180d] transition-all relative"
        >
          <div className="flex justify-between items-start mb-2">
            <span className="text-[10px] font-bold uppercase tracking-widest text-gray-400">
              Today's Revenue
            </span>
            <button
              id="btn-toggle-revenue-privacy"
              onClick={() => setShowRevenue(!showRevenue)}
              title={showRevenue ? 'Hide revenue' : 'Reveal revenue'}
              className="text-[#FACC15] hover:opacity-80 transition-opacity"
            >
              {showRevenue ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
          </div>
          <div className="text-3xl font-black italic text-[#FACC15] truncate">
            {showRevenue ? formatCurrency(stats?.todayRevenue ?? 0) : '••••••••'}
          </div>
          <div className="mt-2 text-[10px] text-[#FACC15]/60 font-bold tracking-wider">
            {showRevenue ? 'Verified Collections' : 'Click eye to reveal'}
          </div>
        </div>
      </div>

      {/* Main Grid: Live Check-ins + Attendance Scanner & Revenue Pulse (12 cols) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left 8 Cols: Recent Check-ins Table Panel */}
        <div className="lg:col-span-8 bg-[#121212] rounded-3xl border border-white/5 flex flex-col p-6">
          <div className="flex justify-between items-center mb-6">
            <div className="flex items-center gap-3">
              <h3 className="text-xs font-black uppercase tracking-[0.2em] text-[#FACC15]">
                Recent Check-ins
              </h3>
            </div>
            <div className="flex items-center gap-2">
              <span className="w-3 h-3 bg-green-500/20 rounded-full flex items-center justify-center">
                <span className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse"></span>
              </span>
              <span className="text-[10px] font-bold uppercase text-gray-500 tracking-wider">Live Stream</span>
            </div>
          </div>

          <div className="flex-grow overflow-x-auto">
            {!stats?.todayCheckInsList || stats.todayCheckInsList.length === 0 ? (
              <div className="text-center py-16 px-4">
                <div className="w-12 h-12 rounded-2xl bg-white/5 border border-white/10 mx-auto flex items-center justify-center text-gray-500 mb-3">
                  <QrCode className="w-6 h-6" />
                </div>
                <p className="text-sm font-bold text-gray-300">No check-ins recorded yet today</p>
                <p className="text-xs text-gray-500 mt-1 max-w-sm mx-auto">
                  Members scanning their barcode at the reception desk appear here in real time.
                </p>
                <button
                  onClick={onNavigateToScanner}
                  className="mt-4 px-4 py-2 bg-[#FACC15] text-black font-black uppercase text-xs tracking-widest rounded-full hover:bg-yellow-300 transition-colors"
                >
                  Open Barcode Scanner
                </button>
              </div>
            ) : (
              <table className="w-full text-left">
                <thead>
                  <tr className="text-[10px] uppercase font-black tracking-widest text-gray-600 border-b border-white/5">
                    <th className="pb-3">ID</th>
                    <th className="pb-3">Member</th>
                    <th className="pb-3">Time</th>
                    <th className="pb-3">Package</th>
                    <th className="pb-3 text-right">Status</th>
                  </tr>
                </thead>
                <tbody className="text-xs">
                  {stats.todayCheckInsList.map((checkIn) => (
                    <tr
                      key={checkIn.id}
                      className="border-b border-white/[0.03] hover:bg-white/[0.02] transition-colors"
                    >
                      <td className="py-4 font-mono font-bold text-[#FACC15]">
                        {checkIn.memberNumber}
                      </td>
                      <td className="py-4 font-bold text-white">
                        {checkIn.memberName || 'Gym Member'}
                      </td>
                      <td className="py-4 text-gray-400 font-mono">
                        {checkIn.attendanceTime}
                      </td>
                      <td className="py-4">
                        <span className="px-2 py-1 bg-white/5 border border-white/10 rounded text-[9px] font-bold text-gray-300 uppercase">
                          ACTIVE PASS
                        </span>
                      </td>
                      <td className="py-4 text-right">
                        <span className="text-green-500 font-bold italic uppercase">
                          Success
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>

        {/* Right 4 Cols: Quick Attendance Scanner & Revenue Pulse */}
        <div className="lg:col-span-4 flex flex-col gap-6">
          {/* Quick Attendance Scanner Widget (High-Energy Yellow Sleek Card) */}
          <div className="bg-[#FACC15] p-6 rounded-3xl text-black flex flex-col gap-4 shadow-xl shadow-[#FACC15]/10">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-black rounded-lg text-[#FACC15]">
                <QrCode className="w-5 h-5 stroke-[2.5]" />
              </div>
              <span className="font-black uppercase text-xs tracking-tighter">Attendance Scanner</span>
            </div>

            <div className="relative">
              <input
                id="dash-quick-scan-input"
                type="text"
                value={quickScanInput}
                onChange={(e) => setQuickScanInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleQuickScan();
                }}
                placeholder="READY TO SCAN..."
                className="w-full bg-black/10 border-2 border-black/20 rounded-xl px-4 py-3.5 text-sm font-black tracking-widest placeholder:text-black/35 outline-none focus:border-black/50 transition-all text-black uppercase font-mono"
              />
            </div>

            {quickScanStatus && (
              <p className="text-[11px] font-black uppercase text-black bg-black/10 px-3 py-1.5 rounded-lg">
                {quickScanStatus}
              </p>
            )}

            <div className="flex gap-2">
              <button
                id="dash-btn-quick-scan"
                onClick={handleQuickScan}
                className="flex-1 py-3 bg-black text-[#FACC15] font-black uppercase text-xs tracking-widest rounded-xl hover:bg-black/90 active:scale-[0.98] transition-all"
              >
                Scan Now
              </button>
              <button
                id="dash-btn-open-scanner"
                onClick={onNavigateToScanner}
                className="px-4 py-3 bg-black/10 border border-black/20 text-black font-black uppercase text-xs tracking-widest rounded-xl hover:bg-black/20 active:scale-[0.98] transition-all"
                title="Open full scanner deck"
              >
                Full Deck
              </button>
            </div>
          </div>

          {/* Revenue Pulse / Financial Breakdown Card */}
          <div className="flex-grow bg-[#121212] rounded-3xl border border-white/5 p-6 flex flex-col justify-between">
            <div>
              <div className="flex justify-between items-center mb-5">
                <h3 className="text-xs font-black uppercase tracking-[0.2em] text-gray-500">
                  Revenue Pulse
                </h3>
                <div className="flex items-center bg-black/40 p-0.5 rounded-lg border border-white/10 text-[10px]">
                  <button
                    onClick={() => setRevenueTimeframe('daily')}
                    className={`px-2 py-0.5 rounded font-bold uppercase transition-colors ${
                      revenueTimeframe === 'daily'
                        ? 'bg-[#FACC15] text-black font-black'
                        : 'text-gray-400 hover:text-white'
                    }`}
                  >
                    Daily
                  </button>
                  <button
                    onClick={() => setRevenueTimeframe('monthly')}
                    className={`px-2 py-0.5 rounded font-bold uppercase transition-colors ${
                      revenueTimeframe === 'monthly'
                        ? 'bg-[#FACC15] text-black font-black'
                        : 'text-gray-400 hover:text-white'
                    }`}
                  >
                    Monthly
                  </button>
                </div>
              </div>

              {/* Graphic Vertical Visualizer Bars matching design */}
              <div className="h-28 flex items-end justify-between gap-2 px-1 mb-4">
                <div className="w-full bg-[#FACC15]/20 rounded-t-lg h-1/2 transition-all hover:bg-[#FACC15]/30"></div>
                <div className="w-full bg-[#FACC15]/40 rounded-t-lg h-3/4 transition-all hover:bg-[#FACC15]/50"></div>
                <div className="w-full bg-[#FACC15]/10 rounded-t-lg h-1/4 transition-all hover:bg-[#FACC15]/20"></div>
                <div className="w-full bg-[#FACC15]/60 rounded-t-lg h-2/3 transition-all hover:bg-[#FACC15]/70"></div>
                <div className="w-full bg-[#FACC15] rounded-t-lg h-full transition-all shadow-[0_0_12px_rgba(250,204,21,0.3)]"></div>
                <div className="w-full bg-[#FACC15]/30 rounded-t-lg h-1/3 transition-all hover:bg-[#FACC15]/40"></div>
              </div>

              <div className="flex justify-between text-[8px] font-bold text-gray-600 uppercase tracking-widest pb-4 border-b border-white/5">
                <span>Mon</span><span>Tue</span><span>Wed</span><span>Thu</span><span>Fri</span><span>Sat</span>
              </div>

              {/* Quick Cash vs Bank breakdown */}
              <div className="grid grid-cols-2 gap-2 mt-4">
                <div id="revenue-pulse-cash-card" className="p-3 bg-white/[0.02] border border-white/5 rounded-xl">
                  <div className="flex justify-between items-center">
                    <span className="text-[9px] font-bold text-gray-500 uppercase tracking-wider block">
                      Cash
                    </span>
                    <button
                      id="btn-toggle-cash-privacy"
                      onClick={() => setShowCashRevenue(!showCashRevenue)}
                      title={showCashRevenue ? 'Hide Cash amount' : 'Reveal Cash amount'}
                      className="text-[#FACC15] hover:opacity-80 transition-opacity p-0.5"
                    >
                      {showCashRevenue ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                    </button>
                  </div>
                  <span className="text-sm font-black text-white block mt-0.5 tracking-tight">
                    {showCashRevenue ? formatCurrency(stats?.revenueSummary?.cashRevenue ?? 0) : '••••••••'}
                  </span>
                </div>

                <div id="revenue-pulse-bank-card" className="p-3 bg-white/[0.02] border border-white/5 rounded-xl">
                  <div className="flex justify-between items-center">
                    <span className="text-[9px] font-bold text-gray-500 uppercase tracking-wider block">
                      Bank Transfer
                    </span>
                    <button
                      id="btn-toggle-bank-privacy"
                      onClick={() => setShowBankRevenue(!showBankRevenue)}
                      title={showBankRevenue ? 'Hide Bank Transfer amount' : 'Reveal Bank Transfer amount'}
                      className="text-[#FACC15] hover:opacity-80 transition-opacity p-0.5"
                    >
                      {showBankRevenue ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                    </button>
                  </div>
                  <span className="text-sm font-black text-white block mt-0.5 tracking-tight">
                    {showBankRevenue ? formatCurrency(stats?.revenueSummary?.bankTransferRevenue ?? 0) : '••••••••'}
                  </span>
                </div>
              </div>
            </div>

            <div className="mt-5 pt-3 border-t border-white/5 flex items-center justify-between">
              <span className="text-[11px] font-medium text-gray-500">Need to enroll new athlete?</span>
              <button
                id="btn-dash-quick-register"
                onClick={onOpenAddMember}
                className="text-[11px] font-black uppercase tracking-wider text-[#FACC15] hover:underline"
              >
                + Register
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
