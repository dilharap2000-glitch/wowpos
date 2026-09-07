import React, { useEffect, useState } from 'react';
import {
  X,
  User,
  Phone,
  Calendar,
  CreditCard,
  QrCode,
  Clock,
  RefreshCw,
  Edit2,
  FileText,
  ShieldCheck,
  CheckCircle2,
  AlertCircle,
  XCircle,
} from 'lucide-react';
import { api } from '../lib/api.ts';
import { Member, Payment, Attendance } from '../types.ts';
import { useBusiness } from '../context/BusinessContext.tsx';

interface MemberProfileModalProps {
  memberId: number | null;
  isOpen: boolean;
  onClose: () => void;
  onOpenRenew: (member: Member) => void;
  onOpenBarcode: (member: Member) => void;
}

export const MemberProfileModal: React.FC<MemberProfileModalProps> = ({
  memberId,
  isOpen,
  onClose,
  onOpenRenew,
  onOpenBarcode,
}) => {
  const { business } = useBusiness();
  const [data, setData] = useState<{
    member: Member;
    paymentSummary: {
      totalPayments: number;
      lastPaymentAmount: number;
      lastPaymentDate: string;
      lastPaymentMethod: string;
    };
    paymentHistory: Payment[];
    attendanceHistory: Attendance[];
  } | null>(null);

  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<'overview' | 'payments' | 'attendance'>('overview');

  useEffect(() => {
    if (isOpen && memberId) {
      loadProfile(memberId);
    } else {
      setData(null);
    }
  }, [isOpen, memberId]);

  const loadProfile = async (id: number) => {
    setLoading(true);
    try {
      const res = await api.getMember(id);
      setData(res);
    } catch (err) {
      console.error('Failed to load profile:', err);
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen || !memberId) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md overflow-y-auto">
      <div
        id="member-profile-modal"
        className="bg-[#121212] border border-white/10 rounded-3xl w-full max-w-4xl overflow-hidden shadow-2xl my-8 flex flex-col max-h-[90vh]"
      >
        {/* Header */}
        <div className="px-6 py-5 border-b border-white/5 flex items-center justify-between bg-white/[0.02] shrink-0">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-2xl bg-black/50 border border-[#FACC15]/30 flex items-center justify-center text-[#FACC15] font-mono font-black text-sm">
              {data?.member?.memberNumber || '...'}
            </div>
            <div>
              <h3 className="text-lg font-black text-white flex items-center gap-2.5">
                <span>{data?.member?.fullName || 'Loading Profile...'}</span>
                {data?.member && (
                  <span
                    className={`text-[9px] font-black uppercase tracking-wider px-2.5 py-0.5 rounded-full ${
                      data.member.badgeColor === 'green'
                        ? 'bg-green-500/15 text-green-400 border border-green-500/30'
                        : data.member.badgeColor === 'orange'
                        ? 'bg-amber-500/15 text-amber-400 border border-amber-500/30'
                        : data.member.badgeColor === 'red'
                        ? 'bg-red-500/15 text-red-400 border border-red-500/30'
                        : 'bg-white/5 text-gray-400'
                    }`}
                  >
                    {data.member.statusLabel}
                  </span>
                )}
              </h3>
              <p className="text-xs text-gray-400 flex items-center gap-3 mt-0.5">
                <span>Phone: {data?.member?.phone}</span>
                {data?.member?.emergencyContact && (
                  <span>• Emergency: {data.member.emergencyContact}</span>
                )}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {data?.member && (
              <>
                <button
                  onClick={() => onOpenBarcode(data.member)}
                  className="px-4 py-2 rounded-full bg-white/5 hover:bg-white/10 border border-white/10 text-gray-300 text-xs font-black uppercase tracking-wider flex items-center gap-1.5 transition-colors"
                >
                  <QrCode className="w-3.5 h-3.5 text-[#FACC15]" />
                  <span>Barcode</span>
                </button>
                <button
                  onClick={() => onOpenRenew(data.member)}
                  className="px-4 py-2 rounded-full bg-[#FACC15] hover:bg-yellow-300 text-black text-xs font-black uppercase tracking-widest flex items-center gap-1.5 shadow-md shadow-[#FACC15]/20 transition-all active:scale-95"
                >
                  <RefreshCw className="w-3.5 h-3.5 stroke-[2.5]" />
                  <span>Renew</span>
                </button>
              </>
            )}
            <button
              onClick={onClose}
              className="p-2.5 rounded-2xl text-gray-400 hover:text-white hover:bg-white/5 transition-colors ml-1"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="px-6 border-b border-white/5 bg-black/30 flex items-center gap-2 shrink-0">
          {[
            { id: 'overview', label: 'Membership Overview' },
            { id: 'payments', label: `Payments (${data?.paymentHistory?.length ?? 0})` },
            { id: 'attendance', label: `Attendance (${data?.attendanceHistory?.length ?? 0})` },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`py-3.5 px-4 text-xs font-black uppercase tracking-wider border-b-2 transition-all ${
                activeTab === tab.id
                  ? 'border-[#FACC15] text-[#FACC15]'
                  : 'border-transparent text-gray-400 hover:text-white'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Content Container */}
        <div className="p-6 sm:p-8 overflow-y-auto space-y-6 flex-1">
          {loading || !data ? (
            <div className="py-20 text-center text-gray-500 text-sm animate-pulse">
              Loading member records...
            </div>
          ) : activeTab === 'overview' ? (
            <div className="space-y-6">
              {/* 3 Metric Cards */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                {/* Active Package */}
                <div className="p-5 rounded-3xl bg-black/40 border border-white/5">
                  <span className="text-[10px] font-black text-gray-400 uppercase tracking-wider">Package</span>
                  <p className="text-lg font-black text-white capitalize mt-1">
                    {data.member.latestMembership?.package.replace('_', ' ') || 'None'}
                  </p>
                  <p className="text-xs text-gray-400 mt-1">
                    Started: {data.member.latestMembership?.startDate || 'N/A'}
                  </p>
                </div>

                {/* Expiry Date */}
                <div className="p-5 rounded-3xl bg-black/40 border border-white/5">
                  <span className="text-[10px] font-black text-gray-400 uppercase tracking-wider">Expiry Date</span>
                  <p className="text-lg font-black font-mono text-[#FACC15] mt-1">
                    {data.member.latestMembership?.expiryDate || 'N/A'}
                  </p>
                  <p className="text-xs text-gray-400 mt-1">
                    {data.member.daysRemaining < 0
                      ? `Expired ${Math.abs(data.member.daysRemaining)} days ago`
                      : data.member.daysRemaining === 0
                      ? 'Due Today'
                      : `${data.member.daysRemaining} days remaining`}
                  </p>
                </div>

                {/* Total Lifetime Paid */}
                <div className="p-5 rounded-3xl bg-black/40 border border-white/5">
                  <span className="text-[10px] font-black text-gray-400 uppercase tracking-wider">Total Revenue</span>
                  <p className="text-lg font-black text-white mt-1">
                    {business.currency} {data.paymentSummary.totalPayments.toLocaleString()}
                  </p>
                  <p className="text-xs text-gray-400 mt-1">
                    Last: {business.currency} {data.paymentSummary.lastPaymentAmount.toLocaleString()} ({data.paymentSummary.lastPaymentMethod})
                  </p>
                </div>
              </div>

              {/* Personal Details & Notes */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="p-5 rounded-3xl bg-black/40 border border-white/5 space-y-2 text-xs">
                  <h4 className="font-black text-[#FACC15] uppercase tracking-wider text-[11px] mb-2">
                    Profile Data
                  </h4>
                  <div className="flex justify-between py-1.5 border-b border-white/5">
                    <span className="text-gray-400">Barcode Identifier:</span>
                    <span className="font-mono font-bold text-white">{data.member.barcode}</span>
                  </div>
                  <div className="flex justify-between py-1.5 border-b border-white/5">
                    <span className="text-gray-400">Primary Phone:</span>
                    <span className="font-mono text-gray-200">{data.member.phone}</span>
                  </div>
                  <div className="flex justify-between py-1.5 border-b border-white/5">
                    <span className="text-gray-400">Emergency Contact:</span>
                    <span className="text-gray-200">{data.member.emergencyContact || 'None listed'}</span>
                  </div>
                </div>

                <div className="p-5 rounded-3xl bg-black/40 border border-white/5 space-y-2 text-xs">
                  <h4 className="font-black text-[#FACC15] uppercase tracking-wider text-[11px] mb-2">
                    Staff Notes
                  </h4>
                  <p className="text-gray-300 italic leading-relaxed">
                    {data.member.notes || 'No special notes logged for this member.'}
                  </p>
                </div>
              </div>
            </div>
          ) : activeTab === 'payments' ? (
            /* Payments Tab */
            <div className="space-y-4">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-white/5 text-gray-500 uppercase font-black text-[10px] tracking-widest">
                    <th className="py-3 px-3">Date</th>
                    <th className="py-3 px-3">Amount</th>
                    <th className="py-3 px-3">Package</th>
                    <th className="py-3 px-3">Method</th>
                    <th className="py-3 px-3">New Expiry</th>
                    <th className="py-3 px-3">Cashier</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/[0.03]">
                  {data.paymentHistory.map((p) => (
                    <tr key={p.id} className="hover:bg-white/[0.02]">
                      <td className="py-3 px-3 font-mono text-gray-400">{p.paymentDate}</td>
                      <td className="py-3 px-3 font-black text-white">
                        {business.currency} {p.amount.toLocaleString()}
                      </td>
                      <td className="py-3 px-3 capitalize font-bold text-gray-300">
                        {p.package.replace('_', ' ')}
                      </td>
                      <td className="py-3 px-3">
                        <span className="px-2.5 py-0.5 rounded-full bg-white/5 border border-white/10 font-bold uppercase text-[9px] text-gray-300">
                          {p.paymentMethod.replace('_', ' ')}
                        </span>
                      </td>
                      <td className="py-3 px-3 font-mono font-bold text-[#FACC15]">
                        {p.newExpiryDate}
                      </td>
                      <td className="py-3 px-3 text-gray-400">{p.createdBy || 'Admin'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            /* Attendance Tab */
            <div className="space-y-4">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-white/5 text-gray-500 uppercase font-black text-[10px] tracking-widest">
                    <th className="py-3 px-3">Date</th>
                    <th className="py-3 px-3">Check-in Time</th>
                    <th className="py-3 px-3">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/[0.03]">
                  {data.attendanceHistory.length === 0 ? (
                    <tr>
                      <td colSpan={3} className="py-12 text-center text-gray-500">
                        No previous attendance records found.
                      </td>
                    </tr>
                  ) : (
                    data.attendanceHistory.map((a) => (
                      <tr key={a.id} className="hover:bg-white/[0.02]">
                        <td className="py-3 px-3 font-mono text-gray-400">{a.attendanceDate}</td>
                        <td className="py-3 px-3 font-mono font-bold text-[#FACC15]">
                          {a.attendanceTime}
                        </td>
                        <td className="py-3 px-3">
                          <span className="px-2.5 py-0.5 rounded-full bg-green-500/15 border border-green-500/30 text-green-400 text-[9px] font-black uppercase tracking-wider">
                            Checked In
                          </span>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
