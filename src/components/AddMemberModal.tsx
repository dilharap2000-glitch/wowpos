import React, { useState, useEffect, useMemo } from 'react';
import { X, UserPlus, CreditCard, User, Users, CheckCircle2, ShieldAlert } from 'lucide-react';
import { getColomboToday, calculateExpiryDate, sanitizeDateString } from '../lib/date-utils.ts';
import { api } from '../lib/api.ts';
import { useBusiness } from '../context/BusinessContext.tsx';
import { calculatePaymentFee, PAYMENT_METHODS } from '../lib/payment-fee.ts';
import { PaymentMethod } from '../types.ts';

interface AddMemberModalProps {
  isOpen: boolean;
  onClose: () => void;
  onMemberAdded: (member: any) => void;
}

export const AddMemberModal: React.FC<AddMemberModalProps> = ({
  isOpen,
  onClose,
  onMemberAdded,
}) => {
  const { business, refreshBusiness } = useBusiness();
  const currency = business.currency || 'Rs.';

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

  // Authenticated tenant's admission fee from Gym Settings (never hardcoded)
  const tenantAdmissionFee = useMemo<number>(() => {
    if (business.admissionFee !== undefined && business.admissionFee !== null) {
      return Number(business.admissionFee);
    }
    return 1000;
  }, [business.admissionFee]);

  // 1. Membership Type State: Default is 'individual'
  const [memberType, setMemberType] = useState<'individual' | 'couple'>('individual');

  // Primary Member (Member #1) Identity Fields - ALWAYS PRESERVED
  const [memberNumber, setMemberNumber] = useState('');
  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [address, setAddress] = useState('');
  const [emergencyContact, setEmergencyContact] = useState('');

  // Partner (Member #2) Fields (ONLY for Couple Membership)
  const [partnerName, setPartnerName] = useState('');
  const [partnerPhone, setPartnerPhone] = useState('');
  const [partnerMemberNumber, setPartnerMemberNumber] = useState('');

  // Package & Payment Selection
  const [membershipPackage, setMembershipPackage] = useState<'monthly' | '3_months' | '6_months' | 'annual'>('monthly');
  const [paymentDate, setPaymentDate] = useState(getColomboToday());
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('cash');
  const [notes, setNotes] = useState('');

  // Optional Admission Fee (Default: UNCHECKED, Rs. 0)
  const [addAdmissionFee, setAddAdmissionFee] = useState<boolean>(false);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Dynamic preview of expiry date
  const calculatedExpiry = calculateExpiryDate(paymentDate, membershipPackage);

  // Active package price based on current membership type
  const activePackagePrice = useMemo(() => {
    const table = memberType === 'couple' ? couplePrices : individualPrices;
    return table[membershipPackage] || 0;
  }, [memberType, couplePrices, individualPrices, membershipPackage]);

  // Admission Fee amount (0 if unchecked, tenant's admission fee if checked)
  const currentAdmissionFee = addAdmissionFee ? tenantAdmissionFee : 0;

  // Base Amount = activePackagePrice + currentAdmissionFee
  const baseAmount = activePackagePrice + currentAdmissionFee;

  // Configured fee rate from tenant settings
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

  // Recalculate payment fee and final total
  const feeCalc = useMemo(() => {
    return calculatePaymentFee(baseAmount, paymentMethod, configuredFeeRate, feeEnabled);
  }, [baseAmount, paymentMethod, configuredFeeRate, feeEnabled]);

  // Final Total Due
  const totalAmount = feeCalc.totalAmount;

  // Reset modal state upon open
  useEffect(() => {
    if (isOpen) {
      refreshBusiness();
      setMemberType('individual');
      setMembershipPackage('monthly');
      setPaymentMethod('cash');
      setAddAdmissionFee(false);
      setMemberNumber('');
      setFullName('');
      setPhone('');
      setEmail('');
      setAddress('');
      setEmergencyContact('');
      setPartnerName('');
      setPartnerPhone('');
      setPartnerMemberNumber('');
      setPaymentDate(getColomboToday());
      setNotes('');
      setError(null);
    }
  }, [isOpen, refreshBusiness]);

  // Seamless switching between INDIVIDUAL and COUPLE
  // Main member info (memberNumber, fullName, phone, emergencyContact, email, address, notes) is STRICTLY PRESERVED
  const handleSelectMemberType = (newType: 'individual' | 'couple') => {
    if (newType === memberType) return;
    setMemberType(newType);
    // Reset package selection to default monthly
    setMembershipPackage('monthly');
    // Reset admission fee to unchecked
    setAddAdmissionFee(false);
    // Clear partner data when switching back to individual so stale data is never submitted
    if (newType === 'individual') {
      setPartnerName('');
      setPartnerPhone('');
      setPartnerMemberNumber('');
    }
    setError(null);
  };

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!memberNumber.trim()) {
      setError('Member number is required (e.g. M-1001 or GYM007).');
      return;
    }
    if (!fullName.trim()) {
      setError('Full name is required.');
      return;
    }
    if (!phone.trim()) {
      setError('Phone number is required.');
      return;
    }

    if (memberType === 'couple' && !partnerName.trim()) {
      setError('Partner Full Name is required for Couple Membership.');
      return;
    }

    setLoading(true);
    try {
      const isCouple = memberType === 'couple';
      const result = await api.addMember({
        memberNumber: memberNumber.trim().toUpperCase(),
        fullName: fullName.trim(),
        phone: phone.trim(),
        email: email.trim() || undefined,
        address: address.trim() || undefined,
        emergencyContact: emergencyContact.trim() || undefined,
        membershipPackage,
        paymentDate,
        memberType,
        // Strictly sanitize: never submit stale partner data if Individual is selected
        partnerName: isCouple && partnerName.trim() ? partnerName.trim() : undefined,
        partnerPhone: isCouple ? (partnerPhone.trim() || phone.trim()) : undefined,
        partnerMemberNumber: isCouple && partnerMemberNumber.trim() ? partnerMemberNumber.trim().toUpperCase() : undefined,
        registerPartnerMember: isCouple,
        addAdmissionFee,
        admissionFeeApplied: addAdmissionFee,
        membershipAmount: activePackagePrice,
        baseAmount,
        paymentFee: feeCalc.paymentFee,
        paymentFeeRate: feeCalc.paymentFeeRate,
        paymentAmount: feeCalc.totalAmount,
        totalAmount: feeCalc.totalAmount,
        paymentMethod,
        notes: notes.trim() || undefined,
      });

      onMemberAdded(result);
      onClose();
    } catch (err: any) {
      setError(err.message || 'Failed to create member.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-start sm:items-center justify-center p-2 sm:p-4 md:p-6 bg-black/85 backdrop-blur-md overflow-y-auto"
      role="dialog"
      aria-modal="true"
      aria-labelledby="modal-member-reg-title"
    >
      <div
        id="add-member-modal"
        className="bg-[#121212] border border-white/10 rounded-2xl sm:rounded-3xl w-full max-w-2xl shadow-2xl flex flex-col my-auto max-h-[96vh] sm:max-h-[92vh] overflow-hidden"
      >
        {/* Sticky Header */}
        <div className="px-4 sm:px-6 py-3.5 sm:py-4 border-b border-white/10 flex items-center justify-between bg-[#121212] shrink-0 z-20">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-10 h-10 rounded-2xl bg-[#FACC15] flex items-center justify-center text-black shadow-md shadow-[#FACC15]/20 shrink-0">
              <UserPlus className="w-5 h-5 stroke-[2.5]" />
            </div>
            <div className="min-w-0">
              <h3 id="modal-member-reg-title" className="text-sm sm:text-base font-black italic text-white uppercase tracking-wider truncate">
                Register New Gym Member
              </h3>
              <p className="text-[11px] sm:text-xs text-gray-400 truncate">
                Creates member record, initial package & payment receipt
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

        {/* Scrollable Form Body */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-4 sm:p-6 md:p-7 space-y-5 sm:space-y-6 overscroll-contain">
          {error && (
            <div className="p-3.5 rounded-2xl bg-red-500/10 border border-red-500/30 text-red-400 text-xs font-semibold flex items-center gap-2">
              <ShieldAlert className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* ============================================================= */}
          {/* MEMBERSHIP TYPE SELECTOR (AT TOP OF REGISTRATION FORM)        */}
          {/* Always visible, always clickable on all devices & screen sizes*/}
          {/* ============================================================= */}
          <div className="space-y-2 p-3 sm:p-4 rounded-2xl bg-black/50 border border-white/10">
            <div className="flex flex-wrap items-center justify-between gap-1">
              <label className="text-[10px] sm:text-[11px] font-black uppercase tracking-wider text-gray-200 flex items-center gap-1.5">
                <span>MEMBERSHIP TYPE *</span>
              </label>
              <span className="text-[10px] text-gray-400 font-mono">
                Currently Selected: <strong className="text-[#FACC15] uppercase">{memberType}</strong>
              </span>
            </div>

            <div className="grid grid-cols-2 gap-2 sm:gap-3 p-1.5 bg-black/70 border border-white/10 rounded-2xl">
              <button
                type="button"
                id="btn-membership-type-individual"
                onClick={() => handleSelectMemberType('individual')}
                className={`min-h-[46px] py-2.5 sm:py-3.5 px-3 sm:px-4 rounded-xl font-black text-xs sm:text-sm uppercase tracking-wider flex items-center justify-center gap-2 transition-all cursor-pointer select-none active:scale-[0.98] ${
                  memberType === 'individual'
                    ? 'bg-[#FACC15] text-black shadow-lg shadow-[#FACC15]/25 border-2 border-[#FACC15]'
                    : 'bg-white/5 text-gray-300 hover:text-white hover:bg-white/10 border-2 border-transparent'
                }`}
              >
                <User className="w-4 h-4 shrink-0" />
                <span className="truncate">INDIVIDUAL</span>
              </button>

              <button
                type="button"
                id="btn-membership-type-couple"
                onClick={() => handleSelectMemberType('couple')}
                className={`min-h-[46px] py-2.5 sm:py-3.5 px-3 sm:px-4 rounded-xl font-black text-xs sm:text-sm uppercase tracking-wider flex items-center justify-center gap-2 transition-all cursor-pointer select-none active:scale-[0.98] ${
                  memberType === 'couple'
                    ? 'bg-[#FACC15] text-black shadow-lg shadow-[#FACC15]/25 border-2 border-[#FACC15]'
                    : 'bg-white/5 text-gray-300 hover:text-white hover:bg-white/10 border-2 border-transparent'
                }`}
              >
                <Users className="w-4 h-4 shrink-0" />
                <span className="truncate">COUPLE</span>
              </button>
            </div>
          </div>

          {/* ============================================================= */}
          {/* SECTION 1: MEMBER INFORMATION (MEMBER #1)                      */}
          {/* Always preserved and visible for both Individual and Couple   */}
          {/* ============================================================= */}
          <div className="space-y-4 pt-1">
            <div className="flex flex-wrap items-center justify-between gap-1">
              <h4 className="text-[11px] sm:text-xs font-black text-[#FACC15] uppercase tracking-widest flex items-center gap-2">
                <User className="w-3.5 h-3.5 shrink-0" />
                <span>1. Member Information {memberType === 'couple' ? '(Member #1 - Main Member)' : ''}</span>
              </h4>
              {memberType === 'couple' && (
                <span className="text-[9px] font-bold text-gray-400 uppercase tracking-wider bg-white/5 px-2.5 py-1 rounded-full border border-white/5">
                  Primary Account Holder
                </span>
              )}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
              <div>
                <label className="block text-[10px] font-black uppercase tracking-wider text-gray-400 mb-1.5">
                  Member Number *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. M-1001 or GYM007"
                  value={memberNumber}
                  onChange={(e) => setMemberNumber(e.target.value.toUpperCase())}
                  className="w-full min-h-[44px] bg-black/40 border border-white/10 rounded-xl sm:rounded-2xl px-4 py-2.5 text-white font-mono font-bold text-sm focus:border-[#FACC15] focus:outline-none uppercase"
                />
                <span className="text-[9px] text-gray-500 mt-1 block">
                  Barcode is automatically tied to this number
                </span>
              </div>

              <div>
                <label className="block text-[10px] font-black uppercase tracking-wider text-gray-400 mb-1.5">
                  Full Name *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Shane Wickramasinghe"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  className="w-full min-h-[44px] bg-black/40 border border-white/10 rounded-xl sm:rounded-2xl px-4 py-2.5 text-white text-sm font-semibold focus:border-[#FACC15] focus:outline-none"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
              <div>
                <label className="block text-[10px] font-black uppercase tracking-wider text-gray-400 mb-1.5">
                  Phone Number (SMS Recipient) *
                </label>
                <input
                  type="tel"
                  required
                  placeholder="e.g. +94771234567 or 0771234567"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className="w-full min-h-[44px] bg-black/40 border border-white/10 rounded-xl sm:rounded-2xl px-4 py-2.5 text-white font-mono text-sm focus:border-[#FACC15] focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-[10px] font-black uppercase tracking-wider text-gray-400 mb-1.5">
                  Emergency Contact (Optional)
                </label>
                <input
                  type="text"
                  placeholder="e.g. +94712223344 (Spouse/Family)"
                  value={emergencyContact}
                  onChange={(e) => setEmergencyContact(e.target.value)}
                  className="w-full min-h-[44px] bg-black/40 border border-white/10 rounded-xl sm:rounded-2xl px-4 py-2.5 text-white text-sm focus:border-[#FACC15] focus:outline-none"
                />
              </div>
            </div>
          </div>

          {/* ============================================================= */}
          {/* SECTION 2: COUPLE PARTNER INFORMATION (MEMBER #2)             */}
          {/* ONLY DISPLAYED WHEN COUPLE IS SELECTED                         */}
          {/* ============================================================= */}
          {memberType === 'couple' && (
            <div className="space-y-4 pt-4 border-t border-white/5">
              <div className="flex flex-wrap items-center justify-between gap-1">
                <h4 className="text-[11px] sm:text-xs font-black text-[#FACC15] uppercase tracking-widest flex items-center gap-2">
                  <Users className="w-3.5 h-3.5 shrink-0" />
                  <span>2. Couple Partner Information (Member #2)</span>
                </h4>
                <span className="text-[9px] font-bold text-[#FACC15] uppercase font-mono tracking-wider bg-[#FACC15]/10 px-2.5 py-1 rounded-full border border-[#FACC15]/20">
                  Included in Couple Package
                </span>
              </div>

              <div className="space-y-4 p-3.5 sm:p-4 bg-[#FACC15]/5 border border-[#FACC15]/20 rounded-2xl">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                  <div>
                    <label className="block text-[10px] font-black uppercase tracking-wider text-gray-400 mb-1">
                      Partner Full Name *
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. Amanda Perera"
                      value={partnerName}
                      onChange={(e) => setPartnerName(e.target.value)}
                      className="w-full min-h-[44px] bg-black/60 border border-white/10 rounded-xl px-3.5 py-2.5 text-white text-xs sm:text-sm font-semibold focus:border-[#FACC15] focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] font-black uppercase tracking-wider text-gray-400 mb-1">
                      Partner Phone (Optional)
                    </label>
                    <input
                      type="tel"
                      placeholder={phone ? `Defaults to ${phone}` : 'e.g. 0779876543'}
                      value={partnerPhone}
                      onChange={(e) => setPartnerPhone(e.target.value)}
                      className="w-full min-h-[44px] bg-black/60 border border-white/10 rounded-xl px-3.5 py-2.5 text-white font-mono text-xs sm:text-sm focus:border-[#FACC15] focus:outline-none"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-[10px] font-black uppercase tracking-wider text-gray-400 mb-1">
                    Partner Member Number (Optional)
                  </label>
                  <input
                    type="text"
                    placeholder={memberNumber ? `Defaults to ${memberNumber}-P` : 'e.g. M-1001-P'}
                    value={partnerMemberNumber}
                    onChange={(e) => setPartnerMemberNumber(e.target.value.toUpperCase())}
                    className="w-full min-h-[44px] bg-black/60 border border-white/10 rounded-xl px-3.5 py-2.5 text-white font-mono text-xs sm:text-sm uppercase focus:border-[#FACC15] focus:outline-none"
                  />
                  <span className="text-[9px] text-gray-400 mt-1 block">
                    A distinct member pass & barcode is automatically generated for the partner
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* ============================================================= */}
          {/* SECTION 3: MEMBERSHIP PACKAGE                                 */}
          {/* Responsive grids: 2 cols on mobile/tablet, 4 on desktop/laptop */}
          {/* ============================================================= */}
          <div className="space-y-4 pt-4 border-t border-white/5">
            <h4 className="text-[11px] sm:text-xs font-black text-[#FACC15] uppercase tracking-widest flex items-center gap-2">
              <CreditCard className="w-3.5 h-3.5 shrink-0" />
              <span>{memberType === 'couple' ? '3. Couple Membership Package' : '2. Membership Package'}</span>
            </h4>

            {/* Responsive Package Selector Cards */}
            <div>
              <label className="block text-[10px] font-black uppercase tracking-wider text-gray-400 mb-2">
                Select Package ({memberType === 'couple' ? 'Couple Rates' : 'Individual Rates'}) *
              </label>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-2 sm:gap-2.5">
                {[
                  { id: 'monthly', label: memberType === 'couple' ? 'Couple (1M)' : '1 Month', desc: '1 Month' },
                  { id: '3_months', label: memberType === 'couple' ? 'Couple (3M)' : '3 Months', desc: '3 Months' },
                  { id: '6_months', label: memberType === 'couple' ? 'Couple (6M)' : '6 Months', desc: '6 Months' },
                  { id: 'annual', label: memberType === 'couple' ? 'Couple (12M)' : 'Annual', desc: '12 Months' },
                ].map((pkg) => {
                  const isSelected = membershipPackage === pkg.id;
                  const price = (memberType === 'couple' ? couplePrices : individualPrices)[pkg.id as 'monthly' | '3_months' | '6_months' | 'annual'];
                  return (
                    <button
                      key={pkg.id}
                      type="button"
                      onClick={() => setMembershipPackage(pkg.id as any)}
                      className={`min-h-[72px] p-3 rounded-2xl border text-left transition-all cursor-pointer flex flex-col justify-between w-full select-none ${
                        isSelected
                          ? 'bg-[#FACC15]/15 border-[#FACC15] text-white shadow-md shadow-[#FACC15]/10'
                          : 'bg-black/40 border-white/10 text-gray-400 hover:border-white/20 hover:text-gray-200'
                      }`}
                    >
                      <div className="flex items-center justify-between gap-1 mb-1">
                        <span className={`text-xs font-black uppercase truncate ${isSelected ? 'text-[#FACC15]' : 'text-gray-200'}`}>
                          {pkg.label}
                        </span>
                        {isSelected && <CheckCircle2 className="w-3.5 h-3.5 text-[#FACC15] shrink-0" />}
                      </div>
                      <p className="text-[9px] text-gray-500 uppercase">{pkg.desc}</p>
                      <p className="text-xs font-black text-white mt-1 font-mono truncate">
                        {currency} {price.toLocaleString()}
                      </p>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Optional Admission Fee Checkbox & Amount Summary */}
            <div className="p-3.5 sm:p-4 rounded-2xl bg-black/60 border border-white/10 space-y-3">
              <label
                htmlFor="checkbox-add-admission-fee"
                className="flex items-start sm:items-center gap-3 cursor-pointer select-none"
              >
                <input
                  type="checkbox"
                  id="checkbox-add-admission-fee"
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
                        {currency} 0 (Unchecked)
                      </span>
                    )}
                  </div>
                  <p className="text-[10px] text-gray-400 mt-0.5 leading-tight">
                    Optional one-time registration fee from tenant Gym Settings. Default is unchecked.
                  </p>
                </div>
              </label>

              {/* Real-Time Pricing Summary Breakdown */}
              <div className="pt-3 border-t border-white/5 space-y-1.5 text-xs font-mono">
                <div className="flex justify-between items-center text-gray-400">
                  <span className="truncate pr-2">
                    Membership Fee ({memberType === 'couple' ? 'Couple' : 'Individual'} - {membershipPackage.replace('_', ' ')}):
                  </span>
                  <span className="text-white font-bold shrink-0">{currency} {activePackagePrice.toLocaleString()}</span>
                </div>
                <div className="flex justify-between items-center text-gray-400">
                  <span>Admission Fee:</span>
                  <span className={addAdmissionFee ? 'text-[#FACC15] font-bold shrink-0' : 'text-gray-500 font-bold shrink-0'}>
                    {addAdmissionFee ? `+ ${currency} ${tenantAdmissionFee.toLocaleString()}` : `${currency} 0`}
                  </span>
                </div>
                {feeCalc.paymentFee > 0 && (
                  <>
                    <div className="flex justify-between items-center text-gray-400">
                      <span>Base Amount:</span>
                      <span className="text-white font-bold shrink-0">{currency} {baseAmount.toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between items-center text-cyan-400">
                      <span>Payment Fee ({feeCalc.paymentFeeRate}%):</span>
                      <span className="font-bold shrink-0">+ {currency} {feeCalc.paymentFee.toLocaleString()}</span>
                    </div>
                  </>
                )}
                <div className="flex justify-between items-center pt-2 border-t border-white/10 text-sm font-black">
                  <span className="text-white uppercase font-sans">Total Due:</span>
                  <span className="text-[#FACC15] shrink-0 text-base">{currency} {totalAmount.toLocaleString()}</span>
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
                  Calculated Expiry
                </label>
                <div className="w-full min-h-[44px] bg-black/40 border border-white/10 rounded-xl sm:rounded-2xl px-3.5 py-2.5 text-[#FACC15] font-mono font-bold text-xs flex items-center">
                  {calculatedExpiry}
                </div>
              </div>
            </div>

            {/* Responsive Payment Method Selector */}
            <div>
              <div className="flex flex-wrap items-center justify-between gap-1 mb-1.5">
                <label className="block text-[10px] font-black uppercase tracking-wider text-gray-400">
                  Payment Method *
                </label>
                {feeCalc.paymentFee > 0 && (
                  <span className="text-[10px] font-mono font-bold text-cyan-400">
                    Includes {feeCalc.paymentFeeRate}% Payment Fee ({currency} {feeCalc.paymentFee.toLocaleString()})
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
                placeholder="e.g. Morning gym slot, special promo"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                className="w-full min-h-[44px] bg-black/40 border border-white/10 rounded-xl sm:rounded-2xl px-4 py-2.5 text-white text-xs focus:border-[#FACC15] focus:outline-none"
              />
            </div>
          </div>

          {/* SMS Notification Banner */}
          <div className="p-3.5 sm:p-4 rounded-2xl bg-black/40 border border-white/5 flex items-center justify-between text-xs text-gray-400">
            <span className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-green-400 shrink-0"></span>
              <span className="leading-tight">Automatic Welcome & Payment SMS will be sent via SMSLEN Gateway</span>
            </span>
          </div>

          <div className="h-2" />
        </form>

        {/* Sticky Modal Footer Actions */}
        <div className="shrink-0 border-t border-white/10 px-4 sm:px-6 py-3 sm:py-4 bg-[#121212] flex flex-col-reverse sm:flex-row items-stretch sm:items-center justify-end gap-2.5 sm:gap-3 z-20">
          <button
            type="button"
            onClick={onClose}
            className="min-h-[44px] px-5 py-2.5 rounded-full bg-white/5 hover:bg-white/10 border border-white/10 text-gray-300 text-xs sm:text-sm font-black uppercase tracking-wider transition-colors cursor-pointer text-center"
          >
            Cancel
          </button>
          <button
            id="btn-submit-add-member"
            type="button"
            disabled={loading}
            onClick={handleSubmit}
            className="min-h-[44px] px-6 py-2.5 rounded-full bg-[#FACC15] hover:bg-yellow-300 disabled:opacity-50 text-black text-xs sm:text-sm font-black uppercase tracking-widest shadow-md shadow-[#FACC15]/20 transition-all active:scale-[0.98] cursor-pointer text-center"
          >
            {loading ? 'Registering...' : `Register & Pay ${currency} ${totalAmount.toLocaleString()}`}
          </button>
        </div>
      </div>
    </div>
  );
};
