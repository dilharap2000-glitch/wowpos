import React, { useState, useEffect } from 'react';
import { X, UserPlus, Calendar, CreditCard, Phone, User, FileText, CheckCircle2 } from 'lucide-react';
import { getColomboToday, calculateExpiryDate } from '../lib/date-utils.ts';
import { api } from '../lib/api.ts';

interface AddMemberModalProps {
  isOpen: boolean;
  onClose: () => void;
  onMemberAdded: (member: any) => void;
}

const PACKAGE_PRICES: Record<string, number> = {
  monthly: 5000,
  '3_months': 13500,
  '6_months': 24000,
  annual: 42000,
};

export const AddMemberModal: React.FC<AddMemberModalProps> = ({
  isOpen,
  onClose,
  onMemberAdded,
}) => {
  const [memberNumber, setMemberNumber] = useState('');
  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [membershipPackage, setMembershipPackage] = useState<'monthly' | '3_months' | '6_months' | 'annual'>('monthly');
  const [paymentDate, setPaymentDate] = useState(getColomboToday());
  const [paymentAmount, setPaymentAmount] = useState(5000);
  const [paymentMethod, setPaymentMethod] = useState<'cash' | 'bank_transfer'>('cash');
  const [emergencyContact, setEmergencyContact] = useState('');
  const [notes, setNotes] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Dynamic preview of expiry date
  const calculatedExpiry = calculateExpiryDate(paymentDate, membershipPackage);

  useEffect(() => {
    if (isOpen) {
      setPaymentDate(getColomboToday());
      setError(null);
    }
  }, [isOpen]);

  const handlePackageChange = (pkg: 'monthly' | '3_months' | '6_months' | 'annual') => {
    setMembershipPackage(pkg);
    setPaymentAmount(PACKAGE_PRICES[pkg] || 5000);
  };

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!memberNumber.trim()) {
      setError('Member number is required (e.g. GYM007).');
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
    if (paymentAmount <= 0) {
      setError('Payment amount must be greater than 0.');
      return;
    }

    setLoading(true);
    try {
      const result = await api.addMember({
        memberNumber: memberNumber.trim().toUpperCase(),
        fullName: fullName.trim(),
        phone: phone.trim(),
        membershipPackage,
        paymentDate,
        paymentAmount: Number(paymentAmount),
        paymentMethod,
        emergencyContact: emergencyContact.trim() || undefined,
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
                Creates member record, initial membership & payment receipt
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
            <div className="p-3.5 rounded-2xl bg-red-500/10 border border-red-500/30 text-red-400 text-xs font-semibold">
              {error}
            </div>
          )}

          {/* Section 1: Member Identity */}
          <div className="space-y-4">
            <h4 className="text-[11px] font-black text-[#FACC15] uppercase tracking-widest flex items-center gap-2">
              <User className="w-3.5 h-3.5" />
              1. Member Information
            </h4>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-[10px] font-black uppercase tracking-wider text-gray-400 mb-1.5">
                  Member Number *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. GYM007"
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
                  placeholder="e.g. +94712223344 (Spouse)"
                  value={emergencyContact}
                  onChange={(e) => setEmergencyContact(e.target.value)}
                  className="w-full bg-black/40 border border-white/10 rounded-2xl px-4 py-3 text-white text-sm focus:border-[#FACC15] focus:outline-hidden"
                />
              </div>
            </div>
          </div>

          {/* Section 2: Membership & Payment Package */}
          <div className="space-y-4 pt-4 border-t border-white/5">
            <h4 className="text-[11px] font-black text-[#FACC15] uppercase tracking-widest flex items-center gap-2">
              <CreditCard className="w-3.5 h-3.5" />
              2. Membership Package & Payment
            </h4>

            {/* Package Selector Cards */}
            <div>
              <label className="block text-[10px] font-black uppercase tracking-wider text-gray-400 mb-2">
                Select Package *
              </label>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
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

            {/* Dates & Amount */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
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
                  Calculated Expiry
                </label>
                <div className="w-full bg-black/40 border border-white/10 rounded-2xl px-3.5 py-2.5 text-[#FACC15] font-mono font-bold text-xs">
                  {calculatedExpiry}
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-black uppercase tracking-wider text-gray-400 mb-1.5">
                  Amount (Rs.) *
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
                ].map((pm) => (
                  <button
                    key={pm.id}
                    type="button"
                    onClick={() => setPaymentMethod(pm.id as any)}
                    className={`flex-1 py-3 px-4 rounded-2xl border text-xs font-black uppercase tracking-wider transition-all ${
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
                placeholder="e.g. Morning gym slot, referred by trainer"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                className="w-full bg-black/40 border border-white/10 rounded-2xl px-4 py-2.5 text-white text-xs focus:border-[#FACC15] focus:outline-hidden"
              />
            </div>
          </div>

          {/* SMS Notification Guarantee */}
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
              {loading ? 'Registering...' : 'Register & Activate'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
