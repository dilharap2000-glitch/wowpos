import React, { useState, useEffect, useMemo } from 'react';
import { X, UserPlus, CreditCard, Phone, User, Users, CheckCircle2, ShieldAlert } from 'lucide-react';
import { getColomboToday, calculateExpiryDate, sanitizeDateString } from '../lib/date-utils.ts';
import { api } from '../lib/api.ts';
import { useBusiness } from '../context/BusinessContext.tsx';

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

  // Member Type: individual | couple
  const [memberType, setMemberType] = useState<'individual' | 'couple'>('individual');

  // Primary Member Fields
  const [memberNumber, setMemberNumber] = useState('');
  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [address, setAddress] = useState('');
  const [emergencyContact, setEmergencyContact] = useState('');

  // Partner Fields (for Couple Membership)
  const [partnerName, setPartnerName] = useState('');
  const [partnerPhone, setPartnerPhone] = useState('');
  const [partnerMemberNumber, setPartnerMemberNumber] = useState('');

  // Membership & Payment Package
  const [membershipPackage, setMembershipPackage] = useState<'monthly' | '3_months' | '6_months' | 'annual'>('monthly');
  const [paymentDate, setPaymentDate] = useState(getColomboToday());
  const [paymentMethod, setPaymentMethod] = useState<'cash' | 'bank_transfer' | 'card'>('cash');
  const [notes, setNotes] = useState('');

  // CRITICAL REQUIREMENT:
  // [ ] ADD ADMISSION FEE checkbox
  // Available for BOTH Individual and Couple membership
  // DEFAULT STATE: UNCHECKED (false)
  // When unchecked: Admission Fee = Rs. 0, do NOT add to total
  // When checked: Load current tenant's Admission Fee from Gym Settings and add to total
  const [addAdmissionFee, setAddAdmissionFee] = useState<boolean>(false);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Dynamic preview of expiry date
  const calculatedExpiry = calculateExpiryDate(paymentDate, membershipPackage);

  // Active package price based on memberType
  const activePackagePrice = useMemo(() => {
    const table = memberType === 'couple' ? couplePrices : individualPrices;
    return table[membershipPackage] || 0;
  }, [memberType, couplePrices, individualPrices, membershipPackage]);

  // Calculated Admission Fee (0 if unchecked, tenant's admission fee if checked)
  const currentAdmissionFee = addAdmissionFee ? tenantAdmissionFee : 0;

  // Total Payment Amount: Package Price + Admission Fee (server-calculated as well)
  const totalAmount = activePackagePrice + currentAdmissionFee;

  useEffect(() => {
    if (isOpen) {
      refreshBusiness();
      setPaymentDate(getColomboToday());
      setError(null);
      // Ensure default state is strictly UNCHECKED
      setAddAdmissionFee(false);
    }
  }, [isOpen, refreshBusiness]);

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
      const result = await api.addMember({
        memberNumber: memberNumber.trim().toUpperCase(),
        fullName: fullName.trim(),
        phone: phone.trim(),
        email: email.trim() || undefined,
        address: address.trim() || undefined,
        emergencyContact: emergencyContact.trim() || undefined,
        membershipPackage,
        paymentDate,
        // Send pricing details & optional admission fee selection
        memberType,
        partnerName: memberType === 'couple' ? partnerName.trim() : undefined,
        partnerPhone: memberType === 'couple' ? (partnerPhone.trim() || phone.trim()) : undefined,
        partnerMemberNumber: memberType === 'couple' && partnerMemberNumber.trim() ? partnerMemberNumber.trim().toUpperCase() : undefined,
        registerPartnerMember: memberType === 'couple',
        addAdmissionFee,
        admissionFeeApplied: addAdmissionFee,
        membershipAmount: activePackagePrice,
        paymentAmount: totalAmount,
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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md overflow-y-auto">
      <div
        id="add-member-modal"
        className="bg-[#121212] border border-white/10 rounded-3xl w-full max-w-2xl overflow-hidden shadow-2xl my-8"
      >
        {/* Header */}
        <div className="px-6 py-5 border-b border-white/5 flex items-center justify-between bg-white/[0.02]">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-[#FACC15] flex items-center justify-center text-black shadow-md shadow-[#FACC15]/20">
              <UserPlus className="w-5 h-5 stroke-[2.5]" />
            </div>
            <div>
              <h3 className="text-base font-black italic text-white uppercase tracking-wider">
                Register New Gym Member
              </h3>
              <p className="text-xs text-gray-400">
                Creates member record, initial package & payment receipt
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

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 sm:p-8 space-y-6">
          {error && (
            <div className="p-3.5 rounded-2xl bg-red-500/10 border border-red-500/30 text-red-400 text-xs font-semibold flex items-center gap-2">
              <ShieldAlert className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Membership Type Selector: Individual vs Couple */}
          <div className="p-4 rounded-2xl bg-black/40 border border-white/10">
            <label className="block text-[10px] font-black uppercase tracking-wider text-gray-400 mb-2">
              Membership Type *
            </label>
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                id="btn-select-individual-membership"
                onClick={() => setMemberType('individual')}
                className={`py-3 px-4 rounded-xl border font-black text-xs uppercase tracking-wider flex items-center justify-center gap-2 transition-all ${
                  memberType === 'individual'
                    ? 'bg-[#FACC15] text-black border-[#FACC15] shadow-md shadow-[#FACC15]/20'
                    : 'bg-black/40 border-white/10 text-gray-400 hover:text-white'
                }`}
              >
                <User className="w-4 h-4" />
                <span>Individual</span>
              </button>

              <button
                type="button"
                id="btn-select-couple-membership"
                onClick={() => setMemberType('couple')}
                className={`py-3 px-4 rounded-xl border font-black text-xs uppercase tracking-wider flex items-center justify-center gap-2 transition-all ${
                  memberType === 'couple'
                    ? 'bg-[#FACC15] text-black border-[#FACC15] shadow-md shadow-[#FACC15]/20'
                    : 'bg-black/40 border-white/10 text-gray-400 hover:text-white'
                }`}
              >
                <Users className="w-4 h-4" />
                <span>Couple Package</span>
              </button>
            </div>
          </div>

          {/* Section 1: Member Identity */}
          <div className="space-y-4">
            <h4 className="text-[11px] font-black text-[#FACC15] uppercase tracking-widest flex items-center gap-2">
              <User className="w-3.5 h-3.5" />
              1. {memberType === 'couple' ? 'Primary Member Information' : 'Member Information'}
            </h4>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
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
                  className="w-full bg-black/40 border border-white/10 rounded-2xl px-4 py-3 text-white font-mono font-bold text-sm focus:border-[#FACC15] focus:outline-hidden uppercase"
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
                  className="w-full bg-black/40 border border-white/10 rounded-2xl px-4 py-3 text-white text-sm font-semibold focus:border-[#FACC15] focus:outline-hidden"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
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
                  className="w-full bg-black/40 border border-white/10 rounded-2xl px-4 py-3 text-white font-mono text-sm focus:border-[#FACC15] focus:outline-hidden"
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
                  className="w-full bg-black/40 border border-white/10 rounded-2xl px-4 py-3 text-white text-sm focus:border-[#FACC15] focus:outline-hidden"
                />
              </div>
            </div>
          </div>

          {/* Section 1.5: Couple Partner Details (Only shown if Couple selected) */}
          {memberType === 'couple' && (
            <div className="space-y-4 pt-4 border-t border-white/5">
              <h4 className="text-[11px] font-black text-[#FACC15] uppercase tracking-widest flex items-center gap-2">
                <Users className="w-3.5 h-3.5" />
                Partner Details (Included in Couple Package)
              </h4>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] font-black uppercase tracking-wider text-gray-400 mb-1.5">
                    Partner Full Name *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Amanda Perera"
                    value={partnerName}
                    onChange={(e) => setPartnerName(e.target.value)}
                    className="w-full bg-black/40 border border-white/10 rounded-2xl px-4 py-3 text-white text-sm font-semibold focus:border-[#FACC15] focus:outline-hidden"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-black uppercase tracking-wider text-gray-400 mb-1.5">
                    Partner Phone (Optional)
                  </label>
                  <input
                    type="tel"
                    placeholder={phone ? `Defaults to ${phone}` : 'e.g. 0779876543'}
                    value={partnerPhone}
                    onChange={(e) => setPartnerPhone(e.target.value)}
                    className="w-full bg-black/40 border border-white/10 rounded-2xl px-4 py-3 text-white font-mono text-sm focus:border-[#FACC15] focus:outline-hidden"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-black uppercase tracking-wider text-gray-400 mb-1.5">
                  Partner Member Number (Optional)
                </label>
                <input
                  type="text"
                  placeholder={memberNumber ? `Defaults to ${memberNumber}-P` : 'e.g. M-1001-P'}
                  value={partnerMemberNumber}
                  onChange={(e) => setPartnerMemberNumber(e.target.value.toUpperCase())}
                  className="w-full bg-black/40 border border-white/10 rounded-2xl px-4 py-3 text-white font-mono text-sm uppercase focus:border-[#FACC15] focus:outline-hidden"
                />
                <span className="text-[9px] text-gray-500 mt-1 block">
                  A separate member pass & barcode will be registered for the partner
                </span>
              </div>
            </div>
          )}

          {/* Section 2: Membership Package */}
          <div className="space-y-4 pt-4 border-t border-white/5">
            <h4 className="text-[11px] font-black text-[#FACC15] uppercase tracking-widest flex items-center gap-2">
              <CreditCard className="w-3.5 h-3.5" />
              2. Membership Package & Admission Fee
            </h4>

            {/* Package Selector Cards */}
            <div>
              <label className="block text-[10px] font-black uppercase tracking-wider text-gray-400 mb-2">
                Select Package ({memberType === 'couple' ? 'Couple Rates' : 'Standard Rates'}) *
              </label>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                {[
                  { id: 'monthly', label: 'Monthly', desc: '1 Month' },
                  { id: '3_months', label: '3 Months', desc: '3 Months' },
                  { id: '6_months', label: '6 Months', desc: '6 Months' },
                  { id: 'annual', label: 'Annual', desc: '12 Months' },
                ].map((pkg) => {
                  const isSelected = membershipPackage === pkg.id;
                  const price = (memberType === 'couple' ? couplePrices : individualPrices)[pkg.id as 'monthly' | '3_months' | '6_months' | 'annual'];
                  return (
                    <button
                      key={pkg.id}
                      type="button"
                      onClick={() => setMembershipPackage(pkg.id as any)}
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
            {/* REQUIRED FEATURE: OPTIONAL ADMISSION FEE CHECKBOX / TOGGLE         */}
            {/* The admission fee must NEVER be automatically added.              */}
            {/* Default state: UNCHECKED (Rs. 0)                                  */}
            {/* When checked: Loads tenant admission fee from Gym Settings        */}
            {/* ================================================================= */}
            <div className="p-4 rounded-2xl bg-black/60 border border-white/10 space-y-3">
              <div className="flex items-center justify-between">
                <label
                  htmlFor="checkbox-add-admission-fee"
                  className="flex items-center gap-3 cursor-pointer select-none"
                >
                  <input
                    type="checkbox"
                    id="checkbox-add-admission-fee"
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
                          Rs. 0 (Not Added)
                        </span>
                      )}
                    </span>
                    <p className="text-[10px] text-gray-400 mt-0.5">
                      Optional one-time registration fee loaded from authenticated tenant gym settings.
                    </p>
                  </div>
                </label>
              </div>

              {/* Real-Time Pricing Summary Breakdown */}
              <div className="pt-3 border-t border-white/5 space-y-1.5 text-xs font-mono">
                <div className="flex justify-between text-gray-400">
                  <span>Membership ({memberType === 'couple' ? 'Couple' : 'Individual'} - {membershipPackage.replace('_', ' ')}):</span>
                  <span className="text-white font-bold">{currency} {activePackagePrice.toLocaleString()}</span>
                </div>
                <div className="flex justify-between text-gray-400">
                  <span>Admission Fee:</span>
                  <span className={addAdmissionFee ? 'text-[#FACC15] font-bold' : 'text-gray-500 font-bold'}>
                    {addAdmissionFee ? `+ ${currency} ${tenantAdmissionFee.toLocaleString()}` : `${currency} 0`}
                  </span>
                </div>
                <div className="flex justify-between pt-2 border-t border-white/10 text-sm font-black">
                  <span className="text-white uppercase font-sans">Total Due:</span>
                  <span className="text-[#FACC15]">{currency} {totalAmount.toLocaleString()}</span>
                </div>
              </div>
            </div>

            {/* Dates & Payment Details */}
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
                  Calculated Expiry
                </label>
                <div className="w-full bg-black/40 border border-white/10 rounded-2xl px-3.5 py-2.5 text-[#FACC15] font-mono font-bold text-xs">
                  {calculatedExpiry}
                </div>
              </div>
            </div>

            {/* Payment Method */}
            <div>
              <label className="block text-[10px] font-black uppercase tracking-wider text-gray-400 mb-1.5">
                Payment Method *
              </label>
              <div className="flex gap-3">
                {[
                  { id: 'cash', label: 'Cash Payment' },
                  { id: 'bank_transfer', label: 'Bank Transfer' },
                  { id: 'card', label: 'Card Payment' },
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
                placeholder="e.g. Morning gym slot, special couple promo"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                className="w-full bg-black/40 border border-white/10 rounded-2xl px-4 py-2.5 text-white text-xs focus:border-[#FACC15] focus:outline-hidden"
              />
            </div>
          </div>

          {/* SMS Notification Notice */}
          <div className="p-4 rounded-2xl bg-black/40 border border-white/5 flex items-center justify-between text-xs text-gray-400">
            <span className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-green-400"></span>
              Automatic Welcome & Payment SMS will be sent via SMSLEN Gateway
            </span>
          </div>

          {/* Footer Submit Actions */}
          <div className="pt-2 flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-5 py-3 rounded-full bg-white/5 hover:bg-white/10 border border-white/10 text-gray-300 text-xs font-black uppercase tracking-wider transition-colors"
            >
              Cancel
            </button>
            <button
              id="btn-submit-add-member"
              type="submit"
              disabled={loading}
              className="px-6 py-3 rounded-full bg-[#FACC15] hover:bg-yellow-300 disabled:opacity-50 text-black text-xs font-black uppercase tracking-widest shadow-md shadow-[#FACC15]/20 transition-all active:scale-95"
            >
              {loading ? 'Registering...' : `Register & Pay ${currency} ${totalAmount.toLocaleString()}`}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
