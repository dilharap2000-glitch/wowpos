import React, { useState, useEffect, useMemo } from 'react';
import { X, RefreshCw, AlertCircle, ShieldCheck, CheckCircle2, Users, User, ShieldAlert } from 'lucide-react';
import { getColomboToday, calculateExpiryDate, sanitizeDateString } from '../lib/date-utils.ts';
import { api } from '../lib/api.ts';
import { Member } from '../types.ts';
import { useBusiness } from '../context/BusinessContext.tsx';

interface RenewMemberModalProps {
  member: Member | null;
  isOpen: boolean;
  onClose: () => void;
  onRenewSuccess: (updatedMember: any) => void;
}

export const RenewMemberModal: React.FC<RenewMemberModalProps> = ({
  member,
  isOpen,
  onClose,
  onRenewSuccess,
}) => {
  const { business, refreshBusiness } = useBusiness();
  const currency = business.currency || 'Rs.';

  const isCouple = member?.memberType === 'couple';

  // Standard individual package rates from authenticated tenant settings
  const individualPrices = useMemo<Record<'monthly' | '3_months' | '6_months' | 'annual', number>>(() => ({
    monthly: Number(business.monthlyPrice) || 4500,
    '3_months': Number(business.threeMonthsPrice) || 12000,
    '6_months': Number(business.sixMonthsPrice) || 22000,
    annual: Number(business.annualPrice) || 38000,
  }), [business.monthlyPrice, business.threeMonthsPrice, business.sixMonthsPrice, business.annualPrice]);

  // Couple package rates from authenticated tenant settings
  const couplePrices = useMemo<Record<'monthly' | '3_months' | '6_months' | 'annual', number>>(() => ({
    monthly: Number(business.coupleMonthlyPrice) || 8000,
    '3_months': Number(business.coupleThreeMonthsPrice) || 20000,
    '6_months': Number(business.coupleSixMonthsPrice) || 36000,
    annual: Number(business.coupleAnnualPrice) || 65000,
  }), [business.coupleMonthlyPrice, business.coupleThreeMonthsPrice, business.coupleSixMonthsPrice, business.coupleAnnualPrice]);

  // Tenant's admission fee from settings (never hardcoded)
  const tenantAdmissionFee = useMemo<number>(() => {
    if (business.admissionFee !== undefined && business.admissionFee !== null) {
      return Number(business.admissionFee);
    }
    return 1000;
  }, [business.admissionFee]);

  const [membershipPackage, setMembershipPackage] = useState<'monthly' | '3_months' | '6_months' | 'annual'>('monthly');
  const [paymentMethod, setPaymentMethod] = useState<'cash' | 'bank_transfer' | 'card'>('cash');
  const [paymentDate, setPaymentDate] = useState(getColomboToday());
  const [notes, setNotes] = useState('');

  // RENEWALS REQUIREMENT: Default state UNCHECKED (Admission Fee = Rs. 0)
  const [addAdmissionFee, setAddAdmissionFee] = useState<boolean>(false);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showConfirm, setShowConfirm] = useState(false);

  useEffect(() => {
    if (isOpen) {
      refreshBusiness();
      setPaymentDate(getColomboToday());
      setAddAdmissionFee(false);
      setError(null);
      setShowConfirm(false);
    }
  }, [isOpen, refreshBusiness]);

  if (!isOpen || !member) return null;

  const currentExpiry = member.latestMembership?.expiryDate || null;
  const isCurrentlyActive = currentExpiry ? currentExpiry >= paymentDate : false;

  // Base date for extension:
  // If active, extends from existing expiry date. If expired, starts from paymentDate.
  const baseStartDate = isCurrentlyActive && currentExpiry ? currentExpiry : paymentDate;
  const newCalculatedExpiry = calculateExpiryDate(baseStartDate, membershipPackage);

  // Active membership price based on member type and package
  const activePackagePrice = (isCouple ? couplePrices : individualPrices)[membershipPackage] || 0;
  const currentAdmissionFee = addAdmissionFee ? tenantAdmissionFee : 0;
  const totalAmount = activePackagePrice + currentAdmissionFee;

  const handlePackageChange = (pkg: 'monthly' | '3_months' | '6_months' | 'annual') => {
    setMembershipPackage(pkg);
  };

  const handleInitialSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (totalAmount <= 0) {
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
        package: membershipPackage,
        membershipPackage,
        paymentDate,
        startDate: paymentDate,
        addAdmissionFee,
        admissionFeeApplied: addAdmissionFee,
        membershipAmount: activePackagePrice,
        paymentAmount: totalAmount,
        paymentMethod,
        memberType: member.memberType || 'individual',
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
              <h3 className="text-base font-black italic text-white uppercase tracking-wider flex items-center gap-2">
                <span>Renew Membership</span>
                {isCouple ? (
                  <span className="px-2 py-0.5 rounded-full text-[9px] font-bold bg-[#FACC15]/20 text-[#FACC15] border border-[#FACC15]/30">
                    Couple
                  </span>
                ) : (
                  <span className="px-2 py-0.5 rounded-full text-[9px] font-bold bg-white/10 text-gray-300">
                    Individual
                  </span>
                )}
              </h3>
              <p className="text-xs text-gray-400">
                {member.fullName} ({member.memberNumber})
                {isCouple && member.partnerName && ` & ${member.partnerName}`}
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
                  <span className="text-white font-bold capitalize">
                    {isCouple ? 'Couple ' : ''}{membershipPackage.replace('_', ' ')}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">Membership Fee:</span>
                  <span className="text-white font-bold">{currency} {activePackagePrice.toLocaleString()}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">Admission Fee:</span>
                  <span className={addAdmissionFee ? 'text-[#FACC15] font-bold' : 'text-gray-500 font-bold'}>
                    {addAdmissionFee ? `+ ${currency} ${tenantAdmissionFee.toLocaleString()}` : `${currency} 0 (Not Added)`}
                  </span>
                </div>
                <div className="flex justify-between border-t border-white/10 pt-2 font-bold">
                  <span className="text-white">Total Payment:</span>
                  <span className="text-[#FACC15] text-sm font-black">{currency} {totalAmount.toLocaleString()}</span>
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
              * Payment receipt and updated membership confirmation SMS will be dispatched immediately via SMSLEN.
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
                {loading ? 'Processing...' : `Confirm & Pay ${currency} ${totalAmount.toLocaleString()}`}
              </button>
            </div>
          </div>
        ) : (
          /* Main Renewal Input Form */
          <form onSubmit={handleInitialSubmit} className="p-6 sm:p-8 space-y-6">
            {error && (
              <div className="p-3.5 rounded-2xl bg-red-500/10 border border-red-500/30 text-red-400 text-xs font-semibold flex items-center gap-2">
                <ShieldAlert className="w-4 h-4 shrink-0" />
                <span>{error}</span>
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
                    <strong>Membership is expired:</strong> Renewal starts fresh from today&apos;s payment date.
                  </span>
                </div>
              )}
            </div>

            {/* Package Selector */}
            <div>
              <label className="block text-[10px] font-black uppercase tracking-wider text-gray-400 mb-2">
                Select Renewal Package ({isCouple ? 'Couple Rates' : 'Standard Rates'}) *
              </label>
              <div className="grid grid-cols-2 gap-2.5">
                {[
                  { id: 'monthly', label: 'Monthly', desc: '1 Month' },
                  { id: '3_months', label: '3 Months', desc: '3 Months' },
                  { id: '6_months', label: '6 Months', desc: '6 Months' },
                  { id: 'annual', label: 'Annual', desc: '12 Months' },
                ].map((pkg) => {
                  const isSelected = membershipPackage === pkg.id;
                  const price = (isCouple ? couplePrices : individualPrices)[pkg.id as 'monthly' | '3_months' | '6_months' | 'annual'];
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
                      <p className="text-xs font-black text-white mt-1">
                        {currency} {price.toLocaleString()}
                      </p>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* ================================================================= */}
            {/* OPTIONAL ADMISSION FEE CHECKBOX ON RENEWALS                       */}
            {/* Default: UNCHECKED. Never automatically added to renewals.        */}
            {/* ================================================================= */}
            <div className="p-4 rounded-2xl bg-black/60 border border-white/10 space-y-3">
              <label
                htmlFor="checkbox-renew-admission-fee"
                className="flex items-center gap-3 cursor-pointer select-none"
              >
                <input
                  type="checkbox"
                  id="checkbox-renew-admission-fee"
                  checked={addAdmissionFee}
                  onChange={(e) => setAddAdmissionFee(e.target.checked)}
                  className="w-5 h-5 rounded-md border-white/20 bg-black/60 text-[#FACC15] focus:ring-[#FACC15] focus:ring-offset-black cursor-pointer accent-[#FACC15]"
                />
                <div>
                  <span className="text-xs font-black uppercase tracking-wider text-white flex items-center gap-2">
                    ADD ADMISSION FEE
                    {addAdmissionFee ? (
                      <span className="px-2 py-0.5 rounded-full text-[9px] font-bold bg-[#FACC15]/20 text-[#FACC15] border border-[#FACC15]/30">
                        + {currency} {tenantAdmissionFee.toLocaleString()}
                      </span>
                    ) : (
                      <span className="px-2 py-0.5 rounded-full text-[9px] font-bold bg-white/5 text-gray-400 border border-white/10">
                        Rs. 0 (Unchecked)
                      </span>
                    )}
                  </span>
                  <p className="text-[10px] text-gray-400 mt-0.5">
                    Optional fee. Unchecked by default for renewals.
                  </p>
                </div>
              </label>

              {/* Real-time breakdown */}
              <div className="pt-3 border-t border-white/5 space-y-1.5 text-xs font-mono">
                <div className="flex justify-between text-gray-400">
                  <span>Package Fee:</span>
                  <span className="text-white font-bold">{currency} {activePackagePrice.toLocaleString()}</span>
                </div>
                <div className="flex justify-between text-gray-400">
                  <span>Admission Fee:</span>
                  <span className={addAdmissionFee ? 'text-[#FACC15] font-bold' : 'text-gray-500 font-bold'}>
                    {addAdmissionFee ? `+ ${currency} ${tenantAdmissionFee.toLocaleString()}` : `${currency} 0`}
                  </span>
                </div>
                <div className="flex justify-between pt-2 border-t border-white/10 text-sm font-black">
                  <span className="text-white uppercase font-sans">Total Amount:</span>
                  <span className="text-[#FACC15]">{currency} {totalAmount.toLocaleString()}</span>
                </div>
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
                  min="2020-01-01"
                  max="2035-12-31"
                  value={paymentDate}
                  onChange={(e) => setPaymentDate(sanitizeDateString(e.target.value))}
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

            {/* Payment Method */}
            <div>
              <label className="block text-[10px] font-black uppercase tracking-wider text-gray-400 mb-1.5">
                Payment Method *
              </label>
              <div className="flex gap-2">
                {[
                  { id: 'cash', label: 'Cash' },
                  { id: 'bank_transfer', label: 'Bank Transfer' },
                  { id: 'card', label: 'Card' },
                ].map((pm) => (
                  <button
                    key={pm.id}
                    type="button"
                    onClick={() => setPaymentMethod(pm.id as any)}
                    className={`flex-1 py-2.5 px-3 rounded-2xl border text-xs font-black uppercase tracking-wider transition-all ${
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
                Review & Confirm ({currency} {totalAmount.toLocaleString()})
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};
