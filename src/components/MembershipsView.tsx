import React, { useState, useEffect } from 'react';
import {
  Award,
  Layers,
  CheckCircle2,
  Calendar,
  DollarSign,
  TrendingUp,
  Users,
  Clock,
  Sparkles,
  Save,
  Plus,
  Edit2,
  ShieldCheck,
  ChevronRight,
  ArrowRight,
  Flame,
  Zap,
} from 'lucide-react';
import { api } from '../lib/api.ts';
import { Member } from '../types.ts';
import { useBusiness } from '../context/BusinessContext.tsx';

interface MembershipsViewProps {
  onOpenRenewMember?: (member: Member) => void;
}

export const MembershipsView: React.FC<MembershipsViewProps> = ({ onOpenRenewMember }) => {
  const { business, updateBusiness, formatCurrency } = useBusiness();
  const [members, setMembers] = useState<Member[]>([]);
  const [loading, setLoading] = useState(true);
  const [savingPrices, setSavingPrices] = useState(false);
  const [savedSuccess, setSavedSuccess] = useState(false);

  // Editable prices
  const [monthlyPrice, setMonthlyPrice] = useState(business.monthlyPrice || 4500);
  const [threeMonthsPrice, setThreeMonthsPrice] = useState(business.threeMonthsPrice || 12000);
  const [sixMonthsPrice, setSixMonthsPrice] = useState(business.sixMonthsPrice || 22000);
  const [annualPrice, setAnnualPrice] = useState(business.annualPrice || 38000);

  // Active filter by package
  const [selectedPackage, setSelectedPackage] = useState<string>('all');

  useEffect(() => {
    if (business.monthlyPrice) setMonthlyPrice(business.monthlyPrice);
    if (business.threeMonthsPrice) setThreeMonthsPrice(business.threeMonthsPrice);
    if (business.sixMonthsPrice) setSixMonthsPrice(business.sixMonthsPrice);
    if (business.annualPrice) setAnnualPrice(business.annualPrice);
  }, [business.monthlyPrice, business.threeMonthsPrice, business.sixMonthsPrice, business.annualPrice]);

  useEffect(() => {
    const fetchMembers = async () => {
      try {
        setLoading(true);
        const list = await api.getMembers();
        setMembers(list || []);
      } catch (err) {
        console.error('Failed to load members for memberships view:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchMembers();
  }, []);

  const handleSaveRates = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingPrices(true);
    setSavedSuccess(false);
    try {
      await updateBusiness({
        monthlyPrice: Number(monthlyPrice),
        threeMonthsPrice: Number(threeMonthsPrice),
        sixMonthsPrice: Number(sixMonthsPrice),
        annualPrice: Number(annualPrice),
      });
      setSavedSuccess(true);
      setTimeout(() => setSavedSuccess(false), 3000);
    } catch (err: any) {
      alert(err.message || 'Failed to update rates');
    } finally {
      setSavingPrices(false);
    }
  };

  // Compute counts per package
  const monthlyMembers = members.filter((m) => m.latestMembership?.package === 'monthly');
  const threeMonthMembers = members.filter((m) => m.latestMembership?.package === '3_months');
  const sixMonthMembers = members.filter((m) => m.latestMembership?.package === '6_months');
  const annualMembers = members.filter((m) => m.latestMembership?.package === 'annual');

  const packagesConfig = [
    {
      key: 'monthly',
      name: '1 Month Standard',
      duration: '1 Month',
      price: monthlyPrice,
      subscribers: monthlyMembers.length,
      activeSubscribers: monthlyMembers.filter((m) => m.computedStatus === 'active').length,
      badge: 'POPULAR',
      perks: ['Full Gym & Weight Room Access', 'Standard Locker Room & Showers', 'Basic Fitness Assessment', 'Member Mobile Pass'],
      color: 'border-yellow-500/30 hover:border-yellow-400',
      tagColor: 'bg-[#FACC15]/20 text-[#FACC15]',
    },
    {
      key: '3_months',
      name: '3 Months Bronze',
      duration: '3 Months',
      price: threeMonthsPrice,
      subscribers: threeMonthMembers.length,
      activeSubscribers: threeMonthMembers.filter((m) => m.computedStatus === 'active').length,
      badge: 'QUARTERLY',
      perks: ['All Standard Gym Access', '1 Free Trainer Orientation', '5% POS Supplement Discount', 'Priority Locker Access'],
      color: 'border-blue-500/30 hover:border-blue-400',
      tagColor: 'bg-blue-500/20 text-blue-400',
    },
    {
      key: '6_months',
      name: '6 Months Silver',
      duration: '6 Months',
      price: sixMonthsPrice,
      subscribers: sixMonthMembers.length,
      activeSubscribers: sixMonthMembers.filter((m) => m.computedStatus === 'active').length,
      badge: 'SAVINGS 15%',
      perks: ['Full 24/7 Gym Floor Access', '3 PT Coaching Sessions', '10% POS Store Discount', 'Complimentary Shaker Bottle'],
      color: 'border-purple-500/30 hover:border-purple-400',
      tagColor: 'bg-purple-500/20 text-purple-400',
    },
    {
      key: 'annual',
      name: '12 Months Gold VIP',
      duration: '1 Year',
      price: annualPrice,
      subscribers: annualMembers.length,
      activeSubscribers: annualMembers.filter((m) => m.computedStatus === 'active').length,
      badge: 'BEST VALUE',
      perks: ['Unlimited VIP Gym Access', 'Dedicated Premium Locker', '15% POS Store Discount', 'Free Guest Pass / Month', 'Personalized Diet Chart'],
      color: 'border-emerald-500/30 hover:border-emerald-400',
      tagColor: 'bg-emerald-500/20 text-emerald-400',
    },
  ];

  const filteredMembers = members.filter((m) => {
    if (selectedPackage === 'all') return true;
    return m.latestMembership?.package === selectedPackage;
  });

  return (
    <div id="memberships-view" className="space-y-8 max-w-7xl mx-auto pb-12">
      {/* Top Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-[#121214] border border-white/10 rounded-3xl p-6 sm:p-8">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#FACC15]/10 border border-[#FACC15]/30 mb-2">
            <Layers className="w-3.5 h-3.5 text-[#FACC15]" />
            <span className="text-[11px] font-black text-[#FACC15] uppercase tracking-widest">
              Plan Management & Pricing Engine
            </span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-black italic text-white uppercase tracking-tight">
            Membership Packages
          </h1>
          <p className="text-xs text-gray-400 mt-1 max-w-2xl">
            Configure membership rates for <span className="text-white font-bold">{business.gymName}</span>.
            Rates persist in MongoDB Atlas and automatically sync to new member registrations, renewals, and POS receipts.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <div className="px-4 py-2.5 rounded-2xl bg-black/50 border border-white/10 text-center">
            <span className="text-[10px] text-gray-400 font-bold uppercase tracking-wider block">Total Members</span>
            <span className="text-xl font-black text-white">{members.length}</span>
          </div>
          <div className="px-4 py-2.5 rounded-2xl bg-black/50 border border-white/10 text-center">
            <span className="text-[10px] text-[#FACC15] font-bold uppercase tracking-wider block">Active Enrolled</span>
            <span className="text-xl font-black text-[#FACC15]">
              {members.filter((m) => m.computedStatus === 'active').length}
            </span>
          </div>
        </div>
      </div>

      {/* Package Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
        {packagesConfig.map((pkg) => (
          <div
            key={pkg.key}
            className={`bg-[#121214] border rounded-3xl p-6 flex flex-col justify-between transition-all duration-300 shadow-xl ${pkg.color}`}
          >
            <div>
              <div className="flex items-center justify-between gap-2 mb-3">
                <span className={`text-[10px] font-black uppercase tracking-wider px-2.5 py-0.5 rounded-full ${pkg.tagColor}`}>
                  {pkg.badge}
                </span>
                <span className="text-xs font-mono text-gray-400 font-bold">{pkg.duration}</span>
              </div>

              <h3 className="text-lg font-black text-white uppercase tracking-tight">{pkg.name}</h3>

              <div className="mt-3 mb-4 pb-4 border-b border-white/10 flex items-baseline gap-1">
                <span className="text-2xl sm:text-3xl font-black text-[#FACC15]">
                  {formatCurrency(pkg.price)}
                </span>
                <span className="text-xs text-gray-500 font-bold">/{pkg.duration.toLowerCase()}</span>
              </div>

              {/* Subscriber count pill */}
              <div className="flex items-center justify-between px-3 py-2 rounded-xl bg-black/40 border border-white/5 mb-4 text-xs font-bold">
                <span className="text-gray-400">Current Subscribers:</span>
                <span className="text-white font-mono font-black">{pkg.subscribers}</span>
              </div>

              {/* Perks list */}
              <div className="space-y-2 mb-6">
                <p className="text-[10px] font-black uppercase tracking-wider text-gray-400">Included Perks:</p>
                {pkg.perks.map((perk, i) => (
                  <div key={i} className="flex items-start gap-2 text-xs text-gray-300">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 mt-0.5 shrink-0" />
                    <span className="leading-snug">{perk}</span>
                  </div>
                ))}
              </div>
            </div>

            <button
              type="button"
              onClick={() => setSelectedPackage(pkg.key)}
              className={`w-full py-2.5 px-4 rounded-xl text-xs font-black uppercase tracking-wider transition-all flex items-center justify-center gap-2 ${
                selectedPackage === pkg.key
                  ? 'bg-[#FACC15] text-black shadow-md shadow-[#FACC15]/20'
                  : 'bg-white/5 hover:bg-white/10 text-white border border-white/10'
              }`}
            >
              <span>{selectedPackage === pkg.key ? 'Filter Active' : 'View Members'}</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>
        ))}
      </div>

      {/* Package Rates Editor */}
      <div className="bg-[#121214] border border-white/10 rounded-3xl p-6 sm:p-8">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b border-white/10 gap-3 mb-6">
          <div>
            <h2 className="text-lg font-black italic text-white uppercase tracking-wide flex items-center gap-2">
              <DollarSign className="w-5 h-5 text-[#FACC15]" />
              Update Standard Rates & Pricing (MongoDB Atlas)
            </h2>
            <p className="text-xs text-gray-400 mt-1">
              Changes apply immediately to your white-label business instance and new membership signups.
            </p>
          </div>

          {savedSuccess && (
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-emerald-500/20 border border-emerald-500/40 text-emerald-400 text-xs font-bold animate-fade-in">
              <CheckCircle2 className="w-4 h-4" />
              <span>Rates Saved to MongoDB!</span>
            </div>
          )}
        </div>

        <form onSubmit={handleSaveRates} className="space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-black/40 border border-white/10 rounded-2xl p-4">
              <label className="text-[10px] font-black uppercase tracking-wider text-gray-400 block mb-1.5">
                1 Month Fee ({business.currency})
              </label>
              <input
                type="number"
                min="0"
                required
                value={monthlyPrice}
                onChange={(e) => setMonthlyPrice(Number(e.target.value))}
                className="w-full bg-transparent font-black text-white text-xl focus:outline-hidden"
              />
            </div>

            <div className="bg-black/40 border border-white/10 rounded-2xl p-4">
              <label className="text-[10px] font-black uppercase tracking-wider text-gray-400 block mb-1.5">
                3 Months Fee ({business.currency})
              </label>
              <input
                type="number"
                min="0"
                required
                value={threeMonthsPrice}
                onChange={(e) => setThreeMonthsPrice(Number(e.target.value))}
                className="w-full bg-transparent font-black text-white text-xl focus:outline-hidden"
              />
            </div>

            <div className="bg-black/40 border border-white/10 rounded-2xl p-4">
              <label className="text-[10px] font-black uppercase tracking-wider text-gray-400 block mb-1.5">
                6 Months Fee ({business.currency})
              </label>
              <input
                type="number"
                min="0"
                required
                value={sixMonthsPrice}
                onChange={(e) => setSixMonthsPrice(Number(e.target.value))}
                className="w-full bg-transparent font-black text-white text-xl focus:outline-hidden"
              />
            </div>

            <div className="bg-black/40 border border-white/10 rounded-2xl p-4">
              <label className="text-[10px] font-black uppercase tracking-wider text-gray-400 block mb-1.5">
                12 Months Fee ({business.currency})
              </label>
              <input
                type="number"
                min="0"
                required
                value={annualPrice}
                onChange={(e) => setAnnualPrice(Number(e.target.value))}
                className="w-full bg-transparent font-black text-white text-xl focus:outline-hidden"
              />
            </div>
          </div>

          <div className="flex justify-end pt-2">
            <button
              type="submit"
              disabled={savingPrices}
              className="bg-[#FACC15] hover:bg-yellow-300 disabled:opacity-50 text-black font-black px-8 py-3.5 rounded-full text-xs uppercase tracking-wider transition-all shadow-xl shadow-[#FACC15]/20 flex items-center gap-2 active:scale-95"
            >
              <Save className="w-4 h-4" />
              <span>{savingPrices ? 'Saving to MongoDB...' : 'Save Updated Rates'}</span>
            </button>
          </div>
        </form>
      </div>

      {/* Members by Plan Filter & Table */}
      <div className="bg-[#121214] border border-white/10 rounded-3xl p-6 sm:p-8 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-white/10">
          <div className="flex items-center gap-3">
            <Users className="w-5 h-5 text-[#FACC15]" />
            <h3 className="text-base font-black italic text-white uppercase tracking-wider">
              Enrolled Members by Plan ({filteredMembers.length})
            </h3>
          </div>

          <div className="flex items-center gap-1.5 flex-wrap">
            {['all', 'monthly', '3_months', '6_months', 'annual'].map((key) => (
              <button
                key={key}
                type="button"
                onClick={() => setSelectedPackage(key)}
                className={`px-3 py-1.5 rounded-xl text-xs font-black uppercase tracking-wider transition-all ${
                  selectedPackage === key
                    ? 'bg-[#FACC15] text-black shadow-md shadow-[#FACC15]/20'
                    : 'bg-white/5 hover:bg-white/10 text-gray-400 hover:text-white border border-white/10'
                }`}
              >
                {key === 'all'
                  ? 'All Plans'
                  : key === 'monthly'
                  ? '1 Month'
                  : key === '3_months'
                  ? '3 Months'
                  : key === '6_months'
                  ? '6 Months'
                  : 'Annual'}
              </button>
            ))}
          </div>
        </div>

        {/* Member Table */}
        {loading ? (
          <div className="text-center py-12 text-gray-400 text-xs">Loading membership records...</div>
        ) : filteredMembers.length === 0 ? (
          <div className="text-center py-12 text-gray-500 text-xs font-bold">
            No members currently enrolled under this membership package.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-white/10 text-gray-400 font-mono text-[10px] uppercase tracking-wider">
                  <th className="py-3 px-3">Member</th>
                  <th className="py-3 px-3">Package</th>
                  <th className="py-3 px-3">Expiry Date</th>
                  <th className="py-3 px-3">Status</th>
                  <th className="py-3 px-3 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {filteredMembers.map((m) => (
                  <tr key={m.id} className="hover:bg-white/[0.02] transition-colors">
                    <td className="py-3 px-3">
                      <div className="font-bold text-white">{m.fullName}</div>
                      <div className="text-[10px] font-mono text-gray-400">{m.memberNumber} • {m.phone}</div>
                    </td>
                    <td className="py-3 px-3 font-mono font-bold text-[#FACC15] uppercase">
                      {m.latestMembership?.package || 'Monthly'}
                    </td>
                    <td className="py-3 px-3 font-mono text-gray-300">
                      {m.latestMembership?.expiryDate || 'N/A'}
                    </td>
                    <td className="py-3 px-3">
                      <span
                        className={`text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full ${
                          m.computedStatus === 'active'
                            ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                            : m.computedStatus === 'expiring_soon'
                            ? 'bg-orange-500/20 text-orange-400 border border-orange-500/30'
                            : 'bg-red-500/20 text-red-400 border border-red-500/30'
                        }`}
                      >
                        {m.computedStatus.replace('_', ' ')}
                      </span>
                    </td>
                    <td className="py-3 px-3 text-right">
                      {onOpenRenewMember && (
                        <button
                          type="button"
                          onClick={() => onOpenRenewMember(m)}
                          className="px-3 py-1.5 rounded-xl bg-white/5 hover:bg-[#FACC15] hover:text-black border border-white/10 text-white text-[11px] font-bold transition-all"
                        >
                          Renew / Extend
                        </button>
                      )}
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
