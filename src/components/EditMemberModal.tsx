import React, { useState, useEffect } from 'react';
import { X, Edit2, Save } from 'lucide-react';
import { api } from '../lib/api.ts';
import { Member } from '../types.ts';

interface EditMemberModalProps {
  member: Member | null;
  isOpen: boolean;
  onClose: () => void;
  onMemberUpdated: (updated: any) => void;
}

export const EditMemberModal: React.FC<EditMemberModalProps> = ({
  member,
  isOpen,
  onClose,
  onMemberUpdated,
}) => {
  const [memberNumber, setMemberNumber] = useState('');
  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [emergencyContact, setEmergencyContact] = useState('');
  const [notes, setNotes] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen && member) {
      setMemberNumber(member.memberNumber);
      setFullName(member.fullName);
      setPhone(member.phone);
      setEmergencyContact(member.emergencyContact || '');
      setNotes(member.notes || '');
      setError(null);
    }
  }, [isOpen, member]);

  if (!isOpen || !member) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!memberNumber.trim() || !fullName.trim() || !phone.trim()) {
      setError('Member number, full name, and phone are required.');
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const updated = await api.editMember(member.id, {
        memberNumber: memberNumber.trim().toUpperCase(),
        fullName: fullName.trim(),
        phone: phone.trim(),
        emergencyContact: emergencyContact.trim() || undefined,
        notes: notes.trim() || undefined,
      });

      onMemberUpdated(updated);
      onClose();
    } catch (err: any) {
      setError(err.message || 'Failed to update member.');
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
        id="edit-member-modal"
        className="bg-[#121212] border border-white/10 rounded-2xl sm:rounded-3xl w-full max-w-lg shadow-2xl flex flex-col my-auto max-h-[96vh] sm:max-h-[92vh] overflow-hidden"
      >
        <div className="px-4 sm:px-6 py-3.5 sm:py-4 border-b border-white/10 flex items-center justify-between bg-[#121212] shrink-0 z-20">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-10 h-10 rounded-2xl bg-[#FACC15] flex items-center justify-center text-black shadow-md shadow-[#FACC15]/20 shrink-0">
              <Edit2 className="w-5 h-5 stroke-[2.5]" />
            </div>
            <div className="min-w-0">
              <h3 className="text-sm sm:text-base font-black italic text-white uppercase tracking-wider truncate">
                Edit Member Details
              </h3>
              <p className="text-[11px] sm:text-xs text-gray-400 truncate">
                Updating {member.memberNumber} • {member.fullName}
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

        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-4 sm:p-6 md:p-8 space-y-4 overscroll-contain">
          {error && (
            <div className="p-3.5 rounded-2xl bg-red-500/10 border border-red-500/30 text-red-400 text-xs font-semibold">
              {error}
            </div>
          )}

          <div>
            <label className="block text-[10px] font-black uppercase tracking-wider text-gray-400 mb-1.5">
              Member Number *
            </label>
            <input
              type="text"
              required
              value={memberNumber}
              onChange={(e) => setMemberNumber(e.target.value.toUpperCase())}
              className="w-full min-h-[44px] bg-black/40 border border-white/10 rounded-xl sm:rounded-2xl px-4 py-2.5 text-white font-mono font-bold text-sm focus:border-[#FACC15] focus:outline-none uppercase"
            />
          </div>

          <div>
            <label className="block text-[10px] font-black uppercase tracking-wider text-gray-400 mb-1.5">
              Full Name *
            </label>
            <input
              type="text"
              required
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              className="w-full min-h-[44px] bg-black/40 border border-white/10 rounded-xl sm:rounded-2xl px-4 py-2.5 text-white text-sm font-semibold focus:border-[#FACC15] focus:outline-none"
            />
          </div>

          <div>
            <label className="block text-[10px] font-black uppercase tracking-wider text-gray-400 mb-1.5">
              Phone Number *
            </label>
            <input
              type="tel"
              required
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              className="w-full min-h-[44px] bg-black/40 border border-white/10 rounded-xl sm:rounded-2xl px-4 py-2.5 text-white font-mono text-sm focus:border-[#FACC15] focus:outline-none"
            />
          </div>

          <div>
            <label className="block text-[10px] font-black uppercase tracking-wider text-gray-400 mb-1.5">
              Emergency Contact
            </label>
            <input
              type="text"
              value={emergencyContact}
              onChange={(e) => setEmergencyContact(e.target.value)}
              className="w-full min-h-[44px] bg-black/40 border border-white/10 rounded-xl sm:rounded-2xl px-4 py-2.5 text-white text-sm focus:border-[#FACC15] focus:outline-none"
            />
          </div>

          <div>
            <label className="block text-[10px] font-black uppercase tracking-wider text-gray-400 mb-1.5">
              Staff Notes
            </label>
            <textarea
              rows={2}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="w-full bg-black/40 border border-white/10 rounded-xl sm:rounded-2xl px-4 py-2.5 text-white text-xs focus:border-[#FACC15] focus:outline-none"
            />
          </div>

          <div className="pt-2 flex flex-col-reverse sm:flex-row items-stretch sm:items-center justify-end gap-2.5 sm:gap-3">
            <button
              type="button"
              onClick={onClose}
              className="min-h-[44px] px-5 py-2.5 rounded-full bg-white/5 hover:bg-white/10 border border-white/10 text-gray-300 text-xs sm:text-sm font-black uppercase tracking-wider transition-colors cursor-pointer text-center"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="min-h-[44px] flex items-center justify-center gap-2 px-6 py-2.5 rounded-full bg-[#FACC15] hover:bg-yellow-300 disabled:opacity-50 text-black text-xs sm:text-sm font-black uppercase tracking-widest shadow-md shadow-[#FACC15]/20 transition-all active:scale-[0.98] cursor-pointer text-center"
            >
              <Save className="w-4 h-4 shrink-0" />
              <span>{loading ? 'Saving...' : 'Save Changes'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
