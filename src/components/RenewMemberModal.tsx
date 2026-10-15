import React, { useState, useEffect, useMemo } from 'react';
import { X, RefreshCw, AlertCircle, ShieldCheck, CheckCircle2, ShieldAlert } from 'lucide-react';
import { getColomboToday, calculateExpiryDate, sanitizeDateString } from '../lib/date-utils.ts';
import { api } from '../lib/api.ts';
import { Member, PaymentMethod } from '../types.ts';
import { useBusiness } from '../context/BusinessContext.tsx';
import { calculatePaymentFee, PAYMENT_METHODS } from '../lib/payment-fee.ts';

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
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('cash');
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
      setMembershipPackage('monthly');
      setPaymentMethod('cash');
      setPaymentDate(getColomboToday());
      setAddAdmissionFee(false);
      setNotes('');
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
  const baseAmount = activePackagePrice + currentAdmissionFee;

  const configuredFeeRate = useMemo(() => {
    if (paymentMethod === 'mintpay') return business.paymentFeeMintpay ?? 12;
    if (paymentMethod === 'payzy') return business.paymentFeePayzy ?? 12;
    if (paymentMethod === 'koko') return business.paymentFeeKoko ?? 12;
    if (paymentMethod === 'card') return business.paymentFeeCard ?? 0;
    if (paymentMethod === 'bank_transfer') return business.paymentFeeBankTransfer ?? 0;
    return business.paymentFeeCash ?? 0;
  }, [business, paymentMethod]);

  const feeEnabled = useMemo(() => {
    if (paymentMethod === 'mintpay') return business.paymentFeeEnabledMintpay !== false;
    if (paymentMethod === 'payzy') return business.paymentFeeEnabledPayzy !== false;
    if (paymentMethod === 'koko') return business.paymentFeeEnabledKoko !== false;
    return true;
  }, [business, paymentMethod]);

  const feeCalc = useMemo(() => {
    return calculatePaymentFee(baseAmount, paymentMethod, configuredFeeRate, feeEnabled);
  }, [baseAmount, paymentMethod, configuredFeeRate, feeEnabled]);

  const totalAmount = feeCalc.totalAmount;

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
        baseAmount,
        paymentFee: feeCalc.paymentFee,
        paymentFeeRate: feeCalc.paymentFeeRate,
        paymentAmount: totalAmount,
        totalAmount,
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
    <div
      className="fixed inset-0 z-50 flex items-start sm:items-center justify-center p-2 sm:p-4 md:p-6 bg-black/85 backdrop-blur-md overflow-y-auto"
      role="dialog"
      aria-modal="true"
    >
      <div
        id="renew-member-modal"
        className="bg-[#121212] border border-white/10 rounded-2xl sm:rounded-3xl w-full max-w-xl shadow-2xl flex flex-col my-auto max-h-[96vh] sm:max-h-[92vh] overflow-hidden"
      >
        {/* Sticky Header */}
        <div className="px-4 sm:px-6 py-3.5 sm:py-4 border-b border-white/10 flex items-center justify-between bg-[#121212] shrink-0 z-20">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-10 h-10 rounded-2xl bg-[#FACC15] flex items-center justify-center text-black shadow-md shadow-[#FACC15]/20 shrink-0">
              <RefreshCw className="w-5 h-5 stroke-[2.5]" />
            </div>
            <div className="min-w-0">
              <h3 className="text-sm sm:text-base font-black italic text-white uppercase tracking-wider flex items-center gap-2 truncate">
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
              <p className="text-[11px] sm:text-xs text-gray-400 truncate">
                {member.fullName} ({member.memberNumber})
                {isCouple && member.partnerName && ` & ${member.partnerName}`}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close modal"
            className="p-2 sm:p-2.5 rounded-2xl text-gray-400 hover:text-white hover:bg-white/5 transition-colors cursor-pointer shrink-0 ml-2"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        {showConfirm ? (
          <div className="flex-1 overflow-y-auto p-4 sm:p-6 md:p-8 space-y-5 overscroll-contain">
            <div className="p-4 sm:p-5 rounded-2xl sm:rounded-3xl bg-[#FACC15]/10 border border-[#FACC15]/20 text-gray-200">
              <h4 className="text-xs font-black text-[#FACC15] uppercase tracking-wider mb-2 flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 shrink-0" />
                Confirm Renewal & Payment
              </h4>
              <p className="text-xs leading-relaxed text-gray-300">
                Please verify the renewal terms for <strong className="text-white">{member.fullName}</strong>:
              </p>

              <div className="mt-4 space-y-2 border-t border-white/10 pt-3 text-xs font-mono">
                <div className="flex justify-between">
                  <span className="text-gray-400">Package:</span>
                  <span className="text-white font-bold uppercase">{membershipPackage.replace('_', ' ')}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">Membership Fee:</span>
                  <span className="text-white font-bold">{currency} {activePackagePrice.toLocaleString()}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">Admission Fee:</span>
                  <span className={addAdmissionFee ? 'text-[#FACC15] font-bold' : 'text-gray-500'}>
                    {addAdmissionFee ? `+ ${currency} ${tenantAdmissionFee.toLocaleString()}` : `${currency} 0 (Unchecked)`}
                  </span>
                </div>
                {feeCalc.paymentFee > 0 && (
                  <div className="flex justify-between text-cyan-400">
                    <span>Payment Fee ({feeCalc.paymentFeeRate}%):</span>
                    <span className="font-bold">+ {currency} {feeCalc.paymentFee.toLocaleString()}</span>
                  </div>
                )}
                <div className="flex justify-between pt-2 border-t border-white/10">
                  <span className="text-gray-400 font-sans font-bold">Total Payable:</span>
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

            <div className="flex flex-col-reverse sm:flex-row items-stretch sm:items-center justify-end gap-2.5 sm:gap-3 pt-2">
              <button
                type="button"
                onClick={() => setShowConfirm(false)}
                className="min-h-[44px] px-5 py-2.5 rounded-full bg-white/5 hover:bg-white/10 border border-white/10 text-gray-300 text-xs sm:text-sm font-black uppercase tracking-wider transition-colors cursor-pointer text-center"
              >
                Back & Edit
              </button>
              <button
                id="btn-confirm-renewal-final"
                type="button"
                disabled={loading}
                onClick={handleExecuteRenewal}
                className="min-h-[44px] px-6 py-2.5 rounded-full bg-[#FACC15] hover:bg-yellow-300 disabled:opacity-50 text-black text-xs sm:text-sm font-black uppercase tracking-widest shadow-md shadow-[#FACC15]/20 transition-all active:scale-[0.98] cursor-pointer text-center"
              >
                {loading ? 'Processing...' : `Confirm & Pay ${currency} ${totalAmount.toLocaleString()}`}
              </button>
            </div>
          </div>
        ) : (
          /* Main Renewal Input Form */
          <form onSubmit={handleInitialSubmit} className="flex-1 overflow-y-auto p-4 sm:p-6 md:p-8 space-y-5 sm:space-y-6 overscroll-contain">
            {error && (
              <div className="p-3.5 rounded-2xl bg-red-500/10 border border-red-500/30 text-red-400 text-xs font-semibold flex items-center gap-2">
                <ShieldAlert className="w-4 h-4 shrink-0" />
                <span>{error}</span>
              </div>
            )}

            {/* Current Expiry & Remaining Days Logic Banner */}
            <div className="p-3.5 sm:p-4 rounded-2xl bg-black/40 border border-white/5">
              <div className="flex items-center justify-between text-xs">
                <span className="text-gray-400 font-medium">Current Expiry Date:</span>
                <span className="font-mono font-bold text-white">{currentExpiry || 'No active membership'}</span>
              </div>

              {isCurrentlyActive ? (
                <div className="mt-3 text-xs text-green-400 bg-green-500/10 border border-green-500/20 p-3 rounded-xl flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 shrink-0" />
                  <span>
                    <strong>Member is active:</strong> Renewal automatically extends from existing expiry (
                    <span className="font-mono font-bold">{currentExpiry}</span>).
                  </span>
                </div>
              ) : (
                <div className="mt-3 text-xs text-amber-400 bg-amber-500/10 border border-amber-500/20 p-3 rounded-xl flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>
                    <strong>Membership is expired:</strong> Renewal starts fresh from payment date.
                  </span>
                </div>
              )}
            </div>

            {/* Package Selector */}
            <div>
              <label className="block text-[10px] font-black uppercase tracking-wider text-gray-400 mb-2">
                Select Renewal Package ({isCouple ? 'Couple Rates' : 'Standard Rates'}) *
              </label>
              <div className="grid grid-cols-2 gap-2 sm:gap-2.5">
                {[
                  { id: 'monthly', label: isCouple ? 'Couple (1M)' : 'Monthly', desc: '1 Month' },
                  { id: '3_months', label: isCouple ? 'Couple (3M)' : '3 Months', desc: '3 Months' },
                  { id: '6_months', label: isCouple ? 'Couple (6M)' : '6 Months', desc: '6 Months' },
                  { id: 'annual', label: isCouple ? 'Couple (12M)' : 'Annual', desc: '12 Months' },
                ].map((pkg) => {
                  const isSelected = membershipPackage === pkg.id;
                  const price = (isCouple ? couplePrices : individualPrices)[pkg.id as 'monthly' | '3_months' | '6_months' | 'annual'];
                  return (
                    <button
                      key={pkg.id}
                      type="button"
                      onClick={() => handlePackageChange(pkg.id as any)}
                      className={`min-h-[68px] p-3 rounded-2xl border text-left transition-all cursor-pointer flex flex-col justify-between select-none ${
                        isSelected
                          ? 'bg-[#FACC15]/15 border-[#FACC15] text-white shadow-xs'
                          : 'bg-black/40 border-white/10 text-gray-400 hover:border-white/20 hover:text-white'
                      }`}
                    >
                      <div className="flex items-center justify-between gap-1 mb-1">
                        <span className={`text-xs font-black uppercase truncate ${isSelected ? 'text-[#FACC15]' : 'text-gray-200'}`}>
                          {pkg.label}
                        </span>
                        {isSelected && <CheckCircle2 className="w-3.5 h-3.5 text-[#FACC15] shrink-0" />}
                      </div>
                      <p className="text-[9px] text-gray-500 uppercase">{pkg.desc}</p>
                      <p className="text-xs font-black text-white mt-1 font-mono">
                        {currency} {price.toLocaleString()}
                      </p>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Optional Admission Fee Checkbox */}
            <div className="p-3.5 sm:p-4 rounded-2xl bg-black/60 border border-white/10 space-y-3">
              <label
                htmlFor="checkbox-renew-admission-fee"
                className="flex items-start sm:items-center gap-3 cursor-pointer select-none"
              >
                <input
                  type="checkbox"
                  id="checkbox-renew-admission-fee"
                  checked={addAdmissionFee}
                  onChange={(e) => setAddAdmissionFee(e.target.checked)}
                  className="w-5 h-5 min-w-[20px] min-h-[20px] shrink-0 mt-0.5 sm:mt-0 rounded-md border-white/20 bg-black/60 text-[#FACC15] focus:ring-[#FACC15] cursor-pointer accent-[#FACC15]"
                />
                <div className="flex-1 min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-xs font-black uppercase tracking-wider text-white">
                      ADD ADMISSION FEE
                    </span>
                    {addAdmissionFee ? (
                      <span className="px-2 py-0.5 rounded-full text-[9px] font-bold bg-[#FACC15]/20 text-[#FACC15] border border-[#FACC15]/30">
                        + {currency} {tenantAdmissionFee.toLocaleString()}
                      </span>
                    ) : (
                      <span className="px-2 py-0.5 rounded-full text-[9px] font-bold bg-white/5 text-gray-400 border border-white/10">
                        Rs. 0 (Unchecked)
                      </span>
                    )}
                  </div>
                  <p className="text-[10px] text-gray-400 mt-0.5">
                    Optional fee. Unchecked by default for renewals.
                  </p>
                </div>
              </label>

              {/* Pricing breakdown */}
              <div className="pt-3 border-t border-white/5 space-y-1.5 text-xs font-mono">
                <div className="flex justify-between items-center text-gray-400">
                  <span>Membership Fee:</span>
                  <span className="text-white font-bold">{currency} {activePackagePrice.toLocaleString()}</span>
                </div>
                <div className="flex justify-between items-center text-gray-400">
                  <span>Admission Fee:</span>
                  <span className={addAdmissionFee ? 'text-[#FACC15] font-bold' : 'text-gray-500 font-bold'}>
                    {addAdmissionFee ? `+ ${currency} ${tenantAdmissionFee.toLocaleString()}` : `${currency} 0`}
                  </span>
                </div>
                {feeCalc.paymentFee > 0 && (
                  <>
                    <div className="flex justify-between items-center text-gray-400">
                      <span>Base Amount:</span>
                      <span className="text-white font-bold">{currency} {baseAmount.toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between items-center text-cyan-400">
                      <span>Payment Fee ({feeCalc.paymentFeeRate}%):</span>
                      <span className="font-bold">+ {currency} {feeCalc.paymentFee.toLocaleString()}</span>
                    </div>
                  </>
                )}
                <div className="flex justify-between items-center pt-2 border-t border-white/10 text-sm font-black">
                  <span className="text-white uppercase font-sans">Total Due:</span>
                  <span className="text-[#FACC15] text-base">{currency} {totalAmount.toLocaleString()}</span>
                </div>
              </div>
            </div>

            {/* Dates & Expiry Preview */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
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
                  className="w-full min-h-[44px] bg-black/40 border border-white/10 rounded-xl sm:rounded-2xl px-3.5 py-2.5 text-white font-mono text-xs focus:border-[#FACC15] focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-[10px] font-black uppercase tracking-wider text-gray-400 mb-1.5">
                  New Expiry Date Preview
                </label>
                <div className="w-full min-h-[44px] bg-black/40 border border-green-500/40 rounded-xl sm:rounded-2xl px-3.5 py-2.5 text-green-400 font-mono font-black text-sm flex items-center">
                  {newCalculatedExpiry}
                </div>
              </div>
            </div>

            {/* Payment Method */}
            <div>
              <div className="flex flex-wrap items-center justify-between gap-1 mb-1.5">
                <label className="block text-[10px] font-black uppercase tracking-wider text-gray-400">
                  Payment Method *
                </label>
                {feeCalc.paymentFee > 0 && (
                  <span className="text-[10px] font-mono font-bold text-cyan-400">
                    Includes {feeCalc.paymentFeeRate}% Fee ({currency} {feeCalc.paymentFee.toLocaleString()})
                  </span>
                )}
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 sm:gap-2.5">
                {PAYMENT_METHODS.map((pm) => {
                  const isSelected = paymentMethod === pm.id;
                  const rate = pm.id === 'mintpay'
                    ? (business.paymentFeeMintpay ?? 12)
                    : pm.id === 'payzy'
                    ? (business.paymentFeePayzy ?? 12)
                    : pm.id === 'koko'
                    ? (business.paymentFeeKoko ?? 12)
                    : 0;

                  return (
                    <button
                      key={pm.id}
                      type="button"
                      onClick={() => setPaymentMethod(pm.id)}
                      className={`min-h-[44px] p-2.5 rounded-xl sm:rounded-2xl border text-xs font-black uppercase tracking-wider transition-all cursor-pointer flex items-center justify-center gap-1.5 text-center select-none active:scale-[0.98] ${
                        isSelected
                          ? 'bg-[#FACC15] text-black border-[#FACC15] shadow-md shadow-[#FACC15]/20 font-black'
                          : 'bg-black/40 border-white/10 text-gray-300 hover:text-white hover:border-white/20'
                      }`}
                    >
                      <span className="truncate">{pm.label}</span>
                      {pm.isBnplOrDigital && rate > 0 && (
                        <span className={`text-[9px] px-1.5 py-0.2 rounded font-mono font-bold shrink-0 ${
                          isSelected ? 'bg-black/20 text-black' : 'bg-white/10 text-cyan-400 border border-cyan-500/20'
                        }`}>
                          +{rate}%
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Notes */}
            <div>
              <label className="block text-[10px] font-black uppercase tracking-wider text-gray-400 mb-1.5">
                Notes (Optional)
              </label>
              <input
                type="text"
                placeholder="e.g. Paid at reception counter"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                className="w-full min-h-[44px] bg-black/40 border border-white/10 rounded-xl sm:rounded-2xl px-4 py-2.5 text-white text-xs focus:border-[#FACC15] focus:outline-none"
              />
            </div>

            {/* Buttons */}
            <div className="pt-2 flex flex-col-reverse sm:flex-row items-stretch sm:items-center justify-end gap-2.5 sm:gap-3">
              <button
                type="button"
                onClick={onClose}
                className="min-h-[44px] px-5 py-2.5 rounded-full bg-white/5 hover:bg-white/10 border border-white/10 text-gray-300 text-xs sm:text-sm font-black uppercase tracking-wider transition-colors cursor-pointer text-center"
              >
                Cancel
              </button>
              <button
                id="btn-proceed-renewal"
                type="submit"
                className="min-h-[44px] px-6 py-2.5 rounded-full bg-[#FACC15] hover:bg-yellow-300 text-black text-xs sm:text-sm font-black uppercase tracking-widest shadow-md shadow-[#FACC15]/20 transition-all active:scale-[0.98] cursor-pointer text-center"
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
