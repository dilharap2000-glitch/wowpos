import React, { useState } from 'react';
import {
  Search,
  UserPlus,
  RefreshCw,
  QrCode,
  Eye,
  Edit2,
  Archive,
  RotateCcw,
  Phone,
  Calendar,
  CreditCard,
  CheckCircle2,
  AlertCircle,
  XCircle,
  Filter,
  Trash2,
} from 'lucide-react';
import { Member } from '../types.ts';

interface MembersViewProps {
  members: Member[];
  loading: boolean;
  onRefresh: () => void;
  onOpenAddMember: () => void;
  onViewProfile: (memberId: number) => void;
  onOpenRenew: (member: Member) => void;
  onOpenEdit: (member: Member) => void;
  onOpenBarcode: (member: Member) => void;
  onArchive: (memberId: number) => void;
  onReactivate: (memberId: number) => void;
  onDeleteMember?: (memberId: number) => void;
  currentFilter: string;
  onFilterChange: (filter: string) => void;
  searchQuery: string;
  onSearchChange: (search: string) => void;
}

export const MembersView: React.FC<MembersViewProps> = ({
  members,
  loading,
  onRefresh,
  onOpenAddMember,
  onViewProfile,
  onOpenRenew,
  onOpenEdit,
  onOpenBarcode,
  onArchive,
  onReactivate,
  onDeleteMember,
  currentFilter,
  onFilterChange,
  searchQuery,
  onSearchChange,
}) => {
  const filterTabs = [
    { id: 'all', label: 'All Members' },
    { id: 'active', label: '🟢 Active' },
    { id: 'due_today', label: '🟠 Due Today' },
    { id: 'due_tomorrow', label: '🟠 Due Tomorrow' },
    { id: 'expiring_soon', label: '🟠 Expiring Soon (≤3d)' },
    { id: 'expired', label: '🔴 Expired' },
    { id: 'inactive', label: '⚫ Inactive' },
  ];

  const getBadgeStyle = (badgeColor: string) => {
    switch (badgeColor) {
      case 'green':
        return 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30';
      case 'orange':
        return 'bg-amber-500/15 text-amber-400 border border-amber-500/30';
      case 'red':
        return 'bg-rose-500/15 text-rose-400 border border-rose-500/30';
      case 'gray':
      default:
        return 'bg-zinc-800 text-zinc-400 border border-zinc-700/60';
    }
  };

  return (
    <div id="members-view" className="space-y-5">
      {/* Top Controls: Search Bar + Filter Tabs + Add Member */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        {/* Search Input */}
        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 text-gray-500 absolute left-4 top-1/2 -translate-y-1/2" />
          <input
            id="members-search-input"
            type="text"
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder="Search by Member #, Name, or Phone..."
            className="w-full bg-[#121212] border border-white/5 text-white placeholder-gray-600 text-xs sm:text-sm rounded-2xl pl-11 pr-4 py-3 focus:outline-hidden focus:border-[#FACC15]/60 focus:ring-2 focus:ring-[#FACC15]/20 transition-all font-medium"
          />
          {searchQuery && (
            <button
              onClick={() => onSearchChange('')}
              className="absolute right-4 top-1/2 -translate-y-1/2 text-xs text-gray-400 hover:text-white uppercase font-bold"
            >
              Clear
            </button>
          )}
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-2.5 shrink-0">
          <button
            id="btn-refresh-members"
            onClick={onRefresh}
            title="Reload Member List"
            className="p-3 rounded-2xl bg-[#121212] hover:bg-white/5 border border-white/5 text-gray-400 hover:text-white transition-colors"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin text-[#FACC15]' : ''}`} />
          </button>

          <button
            id="btn-add-member-main"
            onClick={onOpenAddMember}
            className="flex items-center gap-2 px-5 py-3 rounded-2xl bg-[#FACC15] hover:bg-yellow-300 text-black text-xs sm:text-sm font-black uppercase tracking-wider shadow-lg shadow-[#FACC15]/20 transition-all active:scale-[0.98]"
          >
            <UserPlus className="w-4 h-4 stroke-[2.5]" />
            <span>Add Member</span>
          </button>
        </div>
      </div>

      {/* Filter Tabs Chips */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
        {filterTabs.map((tab) => {
          const isSelected = currentFilter === tab.id;
          return (
            <button
              key={tab.id}
              id={`filter-tab-${tab.id}`}
              onClick={() => onFilterChange(tab.id)}
              className={`px-3.5 py-1.5 rounded-full text-[11px] uppercase tracking-wider font-black whitespace-nowrap transition-all duration-150 ${
                isSelected
                  ? 'bg-[#FACC15] text-black shadow-md shadow-[#FACC15]/20'
                  : 'bg-[#121212] hover:bg-white/5 text-gray-400 hover:text-white border border-white/5'
              }`}
            >
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* Members Table */}
      <div className="bg-[#121212] border border-white/5 rounded-3xl overflow-hidden p-2 sm:p-4">
        {loading && members.length === 0 ? (
          <div className="py-24 text-center text-gray-500 animate-pulse text-xs uppercase font-black tracking-widest">
            Loading member registry...
          </div>
        ) : members.length === 0 ? (
          <div className="py-20 text-center px-4">
            <div className="w-12 h-12 rounded-2xl bg-white/5 border border-white/10 mx-auto flex items-center justify-center text-gray-500 mb-3">
              <Filter className="w-6 h-6" />
            </div>
            <p className="text-base font-black text-white uppercase tracking-wider">No members found</p>
            <p className="text-xs text-gray-500 mt-1 max-w-sm mx-auto">
              {searchQuery
                ? `No members matching "${searchQuery}". Try clearing search or altering filter.`
                : 'No members registered under this filter yet.'}
            </p>
            <button
              onClick={onOpenAddMember}
              className="mt-5 px-5 py-2.5 rounded-full bg-[#FACC15] hover:bg-yellow-300 text-black text-xs font-black uppercase tracking-widest transition-colors"
            >
              + Register Member
            </button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-white/5 text-gray-500 text-[10px] font-black uppercase tracking-widest">
                  <th className="py-3 px-3">Member #</th>
                  <th className="py-3 px-3">Full Name</th>
                  <th className="py-3 px-3">Phone</th>
                  <th className="py-3 px-3">Package</th>
                  <th className="py-3 px-3">Expiry Date</th>
                  <th className="py-3 px-3">Status</th>
                  <th className="py-3 px-3 text-center">Barcode</th>
                  <th className="py-3 px-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/[0.03]">
                {members.map((m) => (
                  <tr
                    key={m.id}
                    id={`member-row-${m.id}`}
                    className="hover:bg-white/[0.02] transition-colors group"
                  >
                    {/* Member # */}
                    <td className="py-3.5 px-3">
                      <span className="px-2 py-1 rounded bg-black/40 border border-white/10 font-mono font-black text-[#FACC15] text-xs">
                        {m.memberNumber}
                      </span>
                    </td>

                    {/* Name */}
                    <td className="py-3.5 px-3 font-bold text-white">
                      <div className="flex items-center gap-2">
                        <span>{m.fullName}</span>
                        {m.notes && (
                          <span
                            title={m.notes}
                            className="w-1.5 h-1.5 rounded-full bg-[#FACC15] shrink-0"
                          />
                        )}
                      </div>
                    </td>

                    {/* Phone */}
                    <td className="py-3.5 px-3 text-gray-400 font-mono text-xs">
                      {m.phone}
                    </td>

                    {/* Package */}
                    <td className="py-3.5 px-3">
                      <span className="px-2 py-0.5 rounded bg-white/5 border border-white/10 text-[10px] font-bold text-gray-300 uppercase">
                        {m.latestMembership?.package.replace('_', ' ') || 'None'}
                      </span>
                    </td>

                    {/* Expiry Date */}
                    <td className="py-3.5 px-3 font-mono text-xs">
                      <div className="text-gray-200 font-bold">
                        {m.latestMembership?.expiryDate || 'N/A'}
                      </div>
                      {m.daysRemaining !== undefined && m.computedStatus !== 'inactive' && (
                        <div
                          className={`text-[9px] font-bold uppercase tracking-wider mt-0.5 ${
                            m.daysRemaining < 0
                              ? 'text-red-400'
                              : m.daysRemaining === 0
                              ? 'text-orange-400'
                              : m.daysRemaining <= 3
                              ? 'text-orange-400'
                              : 'text-gray-500'
                          }`}
                        >
                          {m.daysRemaining < 0
                            ? `Expired ${Math.abs(m.daysRemaining)}d ago`
                            : m.daysRemaining === 0
                            ? 'Due Today'
                            : `${m.daysRemaining} days left`}
                        </div>
                      )}
                    </td>

                    {/* Status Badge */}
                    <td className="py-3.5 px-3">
                      <span
                        className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider ${getBadgeStyle(
                          m.badgeColor
                        )}`}
                      >
                        {m.statusLabel}
                      </span>
                    </td>

                    {/* Barcode Quick Preview */}
                    <td className="py-3.5 px-3 text-center">
                      <button
                        id={`btn-barcode-${m.id}`}
                        onClick={() => onOpenBarcode(m)}
                        title="View & Download Barcode Card"
                        className="p-1.5 rounded-lg bg-white/5 hover:bg-[#FACC15]/20 border border-white/10 hover:border-[#FACC15]/40 text-gray-400 hover:text-[#FACC15] transition-colors"
                      >
                        <QrCode className="w-4 h-4" />
                      </button>
                    </td>

                    {/* Actions */}
                    <td className="py-3.5 px-3 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        {/* Profile Dossier */}
                        <button
                          id={`btn-view-profile-${m.id}`}
                          onClick={() => onViewProfile(m.id)}
                          title="View Member Dossier & History"
                          className="p-1.5 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 text-gray-400 hover:text-white transition-colors"
                        >
                          <Eye className="w-4 h-4" />
                        </button>

                        {/* Renew / Activate */}
                        <button
                          id={`btn-renew-member-${m.id}`}
                          onClick={() => onOpenRenew(m)}
                          title="Renew or Activate Membership"
                          className="px-2.5 py-1.5 rounded-lg bg-[#FACC15] hover:bg-yellow-300 text-black text-xs font-black uppercase tracking-wider transition-all"
                        >
                          Renew
                        </button>

                        {/* Edit Info */}
                        <button
                          id={`btn-edit-member-${m.id}`}
                          onClick={() => onOpenEdit(m)}
                          title="Edit Member Information"
                          className="p-1.5 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 text-gray-400 hover:text-white transition-colors"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>

                        {/* Archive / Reactivate */}
                        {m.archivedAt ? (
                          <button
                            id={`btn-reactivate-${m.id}`}
                            onClick={() => onReactivate(m.id)}
                            title="Reactivate Member"
                            className="p-1.5 rounded-lg bg-green-500/10 hover:bg-green-500/20 border border-green-500/30 text-green-400 transition-colors"
                          >
                            <RotateCcw className="w-3.5 h-3.5" />
                          </button>
                        ) : (
                          <button
                            id={`btn-archive-${m.id}`}
                            onClick={() => onArchive(m.id)}
                            title="Archive Member"
                            className="p-1.5 rounded-lg bg-white/5 hover:bg-amber-500/10 border border-white/10 hover:border-amber-500/30 text-gray-500 hover:text-amber-400 transition-colors"
                          >
                            <Archive className="w-3.5 h-3.5" />
                          </button>
                        )}

                        {/* Permanent Delete */}
                        {onDeleteMember && (
                          <button
                            id={`btn-delete-${m.id}`}
                            onClick={() => {
                              if (window.confirm(`Are you sure you want to permanently delete member ${m.fullName}? This cannot be undone.`)) {
                                onDeleteMember(m.id);
                              }
                            }}
                            title="Delete Member Permanently"
                            className="p-1.5 rounded-lg bg-white/5 hover:bg-red-500/20 border border-white/10 hover:border-red-500/40 text-gray-500 hover:text-red-400 transition-colors"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};
