import React, { useState } from 'react';
import { X, RefreshCw, Calendar, CreditCard, AlertCircle, ShieldCheck, CheckCircle2 } from 'lucide-react';
import { getColomboToday, calculateExpiryDate } from '../lib/date-utils.ts';
import { api } from '../lib/api.ts';
import { Member } from '../types.ts';

interface RenewMemberModalProps {
  member: Member | null;
  isOpen: boolean;
  onClose: () => void;
  onRenewSuccess: (updatedMember: any) => void;
}

const PACKAGE_PRICES: Record<string, number> = {
  monthly: 5000,
  '3_months': 13500,
  '6_months': 24000,
  annual: 42000,
};

export const RenewMemberModal: React.FC<RenewMemberModalProps> = ({
  member,
  isOpen,
  onClose,
  onRenewSuccess,
}) => {
  const [membershipPackage, setMembershipPackage] = useState<'monthly' | '3_months' | '6_months' | 'annual'>('monthly');
  const [paymentAmount, setPaymentAmount] = useState(5000);
  const [paymentMethod, setPaymentMethod] = useState<'cash' | 'bank_transfer'>('cash');
  const [paymentDate, setPaymentDate] = useState(getColomboToday());
  const [notes, setNotes] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showConfirm, setShowConfirm] = useState(false);

  if (!isOpen || !member) return null;

  const currentExpiry = member.latestMembership?.expiryDate || null;
  const isCurrentlyActive = currentExpiry ? currentExpiry >= paymentDate : false;

  // Base date for extension:
  // If active, extends from existing expiry date! If expired, starts from paymentDate.
  const baseStartDate = isCurrentlyActive && currentExpiry ? currentExpiry : paymentDate;
  const newCalculatedExpiry = calculateExpiryDate(baseStartDate, membershipPackage);

  const handlePackageChange = (pkg: 'monthly' | '3_months' | '6_months' | 'annual') => {
    setMembershipPackage(pkg);
    setPaymentAmount(PACKAGE_PRICES[pkg] || 5000);
  };

  const handleInitialSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (paymentAmount <= 0) {
      setError('Payment amount must be greater than 0.');
      return;
    }
    setError(null);
    setShowConfirm(true);
  };

  const handleExecuteRenewal = async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await api.renewMembership(member.id, {
        membershipPackage,
        paymentAmount: Number(paymentAmount),
        paymentMethod,
        paymentDate,
        notes: notes.trim() || undefined,
      });

      onRenewSuccess(result);
      setShowConfirm(false);
      onClose();
    } catch (err: any) {
      setError(err.message || 'Renewal failed.');
      setShowConfirm(false);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md overflow-y-auto">
      <div
        id="renew-member-modal"
        className="bg-[#121212] border border-white/10 rounded-3xl w-full max-w-xl overflow-hidden shadow-2xl my-8"
      >
        {/* Header */}
        <div className="px-6 py-5 border-b border-white/5 flex items-center justify-between bg-white/[0.02]">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-[#FACC15] flex items-center justify-center text-black shadow-md shadow-[#FACC15]/20">
              <RefreshCw className="w-5 h-5 stroke-[2.5]" />
            </div>
            <div>
              <h3 className="text-base font-black italic text-white uppercase tracking-wider">
                Renew Membership
              </h3>
              <p className="text-xs text-gray-400">
                {member.fullName} ({member.memberNumber})
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2.5 rounded-2xl text-gray-400 hover:text-white hover:bg-white/5 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Confirmation Step Dialog */}
        {showConfirm ? (
          <div className="p-6 sm:p-8 space-y-6">
            <div className="p-5 rounded-3xl bg-[#FACC15]/10 border border-[#FACC15]/20 text-gray-200">
              <h4 className="text-xs font-black text-[#FACC15] uppercase tracking-wider mb-2 flex items-center gap-2">
                <ShieldCheck className="w-4 h-4" />
                Confirm Renewal & Payment
              </h4>
              <p className="text-xs leading-relaxed text-gray-300">
                Please verify the renewal terms for <strong className="text-white">{member.fullName}</strong>:
              </p>

              <div className="mt-4 space-y-2 text-xs bg-black/40 p-4 rounded-2xl border border-white/5 font-mono">
                <div className="flex justify-between">
                  <span className="text-gray-400">Package:</span>
                  <span className="text-white font-bold capitalize">{membershipPackage.replace('_', ' ')}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">Payment Amount:</span>
                  <span className="text-[#FACC15] font-black">Rs. {paymentAmount.toLocaleString()}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">Payment Method:</span>
                  <span className="text-white font-bold uppercase">{paymentMethod.replace('_', ' ')}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">Previous Expiry:</span>
                  <span className="text-gray-300">{currentExpiry || 'None'}</span>
                </div>
                <div className="flex justify-between border-t border-white/10 pt-2 mt-2 font-bold">
                  <span className="text-gray-200">New Expiry Date:</span>
                  <span className="text-green-400 text-sm font-black">{newCalculatedExpiry}</span>
                </div>
              </div>
            </div>

            <p className="text-[11px] text-gray-400">
              * Payment receipt and updated membership confirmation SMS will be dispatched immediately.
            </p>

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setShowConfirm(false)}
                className="px-5 py-3 rounded-full bg-white/5 hover:bg-white/10 border border-white/10 text-gray-300 text-xs font-black uppercase tracking-wider transition-colors"
              >
                Back & Edit
              </button>
              <button
                id="btn-confirm-renewal-final"
                type="button"
                disabled={loading}
                onClick={handleExecuteRenewal}
                className="px-6 py-3 rounded-full bg-[#FACC15] hover:bg-yellow-300 disabled:opacity-50 text-black text-xs font-black uppercase tracking-widest shadow-md shadow-[#FACC15]/20 transition-all active:scale-95"
              >
                {loading ? 'Processing...' : 'Confirm & Process'}
              </button>
            </div>
          </div>
        ) : (
          /* Main Renewal Input Form */
          <form onSubmit={handleInitialSubmit} className="p-6 sm:p-8 space-y-6">
            {error && (
              <div className="p-3.5 rounded-2xl bg-red-500/10 border border-red-500/30 text-red-400 text-xs font-semibold">
                {error}
              </div>
            )}

            {/* Current Expiry & Remaining Days Logic Banner */}
            <div className="p-4 rounded-3xl bg-black/40 border border-white/5">
              <div className="flex items-center justify-between text-xs">
                <span className="text-gray-400 font-medium">Current Expiry Date:</span>
                <span className="font-mono font-bold text-white">{currentExpiry || 'No active membership'}</span>
              </div>

              {isCurrentlyActive ? (
                <div className="mt-3 text-xs text-green-400 bg-green-500/10 border border-green-500/20 p-3 rounded-2xl flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 shrink-0" />
                  <span>
                    <strong>Member is active:</strong> Renewal automatically extends from existing expiry (
                    <span className="font-mono font-bold">{currentExpiry}</span>). Remaining days are fully preserved!
                  </span>
                </div>
              ) : (
                <div className="mt-3 text-xs text-amber-400 bg-amber-500/10 border border-amber-500/20 p-3 rounded-2xl flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>
                    <strong>Membership is expired:</strong> Renewal starts fresh from today's payment date.
                  </span>
                </div>
              )}
            </div>

            {/* Package Selector */}
            <div>
              <label className="block text-[10px] font-black uppercase tracking-wider text-gray-400 mb-2">
                Select Renewal Package *
              </label>
              <div className="grid grid-cols-2 gap-2.5">
                {[
                  { id: 'monthly', label: 'Monthly', desc: '30 Days', price: 5000 },
                  { id: '3_months', label: '3 Months', desc: '3 Months', price: 13500 },
                  { id: '6_months', label: '6 Months', desc: '6 Months', price: 24000 },
                  { id: 'annual', label: 'Annual', desc: '12 Months', price: 42000 },
                ].map((pkg) => {
                  const isSelected = membershipPackage === pkg.id;
                  return (
                    <button
                      key={pkg.id}
                      type="button"
                      onClick={() => handlePackageChange(pkg.id as any)}
                      className={`p-3.5 rounded-2xl border text-left transition-all ${
                        isSelected
                          ? 'bg-[#FACC15]/10 border-[#FACC15] text-white shadow-xs'
                          : 'bg-black/40 border-white/10 text-gray-400 hover:border-white/20'
                      }`}
                    >
                      <div className="flex items-center justify-between mb-1">
                        <span className={`text-xs font-black uppercase ${isSelected ? 'text-[#FACC15]' : 'text-gray-200'}`}>
                          {pkg.label}
                        </span>
                        {isSelected && <CheckCircle2 className="w-3.5 h-3.5 text-[#FACC15]" />}
                      </div>
                      <p className="text-[9px] text-gray-500 uppercase">{pkg.desc}</p>
                      <p className="text-xs font-black text-white mt-1">Rs. {pkg.price.toLocaleString()}</p>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Calculations Preview */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-[10px] font-black uppercase tracking-wider text-gray-400 mb-1.5">
                  Payment Date *
                </label>
                <input
                  type="date"
                  required
                  value={paymentDate}
                  onChange={(e) => setPaymentDate(e.target.value)}
                  className="w-full bg-black/40 border border-white/10 rounded-2xl px-3.5 py-2.5 text-white font-mono text-xs focus:border-[#FACC15] focus:outline-hidden"
                />
              </div>

              <div>
                <label className="block text-[10px] font-black uppercase tracking-wider text-gray-400 mb-1.5">
                  New Expiry Date Preview
                </label>
                <div className="w-full bg-black/40 border border-green-500/40 rounded-2xl px-3.5 py-2.5 text-green-400 font-mono font-black text-sm">
                  {newCalculatedExpiry}
                </div>
              </div>
            </div>

            {/* Payment Details */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-[10px] font-black uppercase tracking-wider text-gray-400 mb-1.5">
                  Amount Received (Rs.) *
                </label>
                <input
                  type="number"
                  required
                  min={1}
                  value={paymentAmount}
                  onChange={(e) => setPaymentAmount(Number(e.target.value))}
                  className="w-full bg-black/40 border border-white/10 rounded-2xl px-3.5 py-2.5 text-white font-mono font-bold text-sm focus:border-[#FACC15] focus:outline-hidden"
                />
              </div>

              <div>
                <label className="block text-[10px] font-black uppercase tracking-wider text-gray-400 mb-1.5">
                  Payment Method *
                </label>
                <div className="flex gap-2">
                  {[
                    { id: 'cash', label: 'Cash' },
                    { id: 'bank_transfer', label: 'Bank Transfer' },
                  ].map((pm) => (
                    <button
                      key={pm.id}
                      type="button"
                      onClick={() => setPaymentMethod(pm.id as any)}
                      className={`flex-1 py-3 px-3 rounded-2xl border text-xs font-black uppercase tracking-wider transition-all ${
                        paymentMethod === pm.id
                          ? 'bg-[#FACC15] text-black border-[#FACC15]'
                          : 'bg-black/40 border-white/10 text-gray-400 hover:text-white'
                      }`}
                    >
                      {pm.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Notes */}
            <div>
              <label className="block text-[10px] font-black uppercase tracking-wider text-gray-400 mb-1.5">
                Notes (Optional)
              </label>
              <input
                type="text"
                placeholder="e.g. Paid in cash at reception counter"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                className="w-full bg-black/40 border border-white/10 rounded-2xl px-4 py-2.5 text-white text-xs focus:border-[#FACC15] focus:outline-hidden"
              />
            </div>

            {/* Buttons */}
            <div className="pt-2 flex items-center justify-end gap-3">
              <button
                type="button"
                onClick={onClose}
                className="px-5 py-3 rounded-full bg-white/5 hover:bg-white/10 border border-white/10 text-gray-300 text-xs font-black uppercase tracking-wider transition-colors"
              >
                Cancel
              </button>
              <button
                id="btn-proceed-renewal"
                type="submit"
                className="px-6 py-3 rounded-full bg-[#FACC15] hover:bg-yellow-300 text-black text-xs font-black uppercase tracking-widest shadow-md shadow-[#FACC15]/20 transition-all active:scale-95"
              >
                Review & Confirm
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};
