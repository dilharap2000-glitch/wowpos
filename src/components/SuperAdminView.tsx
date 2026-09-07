import React, { useState, useEffect } from 'react';
import {
  Building2,
  Users,
  CreditCard,
  QrCode,
  Plus,
  ShieldCheck,
  CheckCircle2,
  XCircle,
  Edit2,
  ExternalLink,
  Search,
  RefreshCw,
  Lock,
  UserCheck,
  Mail,
  Phone,
  MapPin,
  TrendingUp,
} from 'lucide-react';
import { api } from '../lib/api.ts';

interface GymStat {
  gymId: number;
  gymName: string;
  status: 'active' | 'inactive';
  phone?: string | null;
  email?: string | null;
  address?: string | null;
  activeMembers: number;
  expiredMembers: number;
  totalMembers: number;
  todayCheckIns: number;
  todayRevenue: number;
  totalRevenue: number;
  ownerName?: string | null;
  ownerUsername?: string | null;
}

interface SuperAdminDashboardData {
  totalGyms: number;
  activeGyms: number;
  inactiveGyms: number;
  totalMembersAcrossGyms: number;
  activeMembersAcrossGyms: number;
  totalTodayCheckIns: number;
  totalTodayRevenue: number;
  gymsStats: GymStat[];
}

interface SuperAdminUser {
  id: number;
  uid: string;
  username: string;
  email: string;
  name: string;
  role: 'SUPER_ADMIN' | 'GYM_OWNER';
  gymId?: number | null;
  gymName?: string | null;
  status: 'active' | 'inactive';
  createdAt?: string;
}

interface SuperAdminViewProps {
  onSwitchToGym?: (gymId: number, gymName: string) => void;
}

export const SuperAdminView: React.FC<SuperAdminViewProps> = ({ onSwitchToGym }) => {
  const [activeTab, setActiveTab] = useState<'gyms' | 'users'>('gyms');
  const [dashboard, setDashboard] = useState<SuperAdminDashboardData | null>(null);
  const [userList, setUserList] = useState<SuperAdminUser[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  // Modals
  const [isCreateGymOpen, setIsCreateGymOpen] = useState(false);
  const [isCreateUserOpen, setIsCreateUserOpen] = useState(false);
  const [editingGym, setEditingGym] = useState<GymStat | null>(null);
  const [editingUser, setEditingUser] = useState<SuperAdminUser | null>(null);

  // Form states - Create Gym
  const [newGymName, setNewGymName] = useState('');
  const [newGymPhone, setNewGymPhone] = useState('');
  const [newGymEmail, setNewGymEmail] = useState('');
  const [newGymAddress, setNewGymAddress] = useState('');
  const [newGymSenderId, setNewGymSenderId] = useState('GYMFIT');
  const [newGymMonthlyPrice, setNewGymMonthlyPrice] = useState('4500');
  const [newGymThreeMonthsPrice, setNewGymThreeMonthsPrice] = useState('12000');
  const [newGymSixMonthsPrice, setNewGymSixMonthsPrice] = useState('22000');
  const [newGymAnnualPrice, setNewGymAnnualPrice] = useState('38000');

  // Form states - Create User
  const [newUserUsername, setNewUserUsername] = useState('');
  const [newUserPassword, setNewUserPassword] = useState('gym123');
  const [newUserName, setNewUserName] = useState('');
  const [newUserEmail, setNewUserEmail] = useState('');
  const [newUserGymId, setNewUserGymId] = useState<number>(1);

  const loadData = async () => {
    setLoading(true);
    try {
      const [dash, users] = await Promise.all([
        api.getSuperAdminDashboard(),
        api.getSuperAdminUsers(),
      ]);
      setDashboard(dash);
      setUserList(users);
    } catch (err) {
      console.error('Failed to load Super Admin dashboard:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleToggleGymStatus = async (gymId: number, currentStatus: 'active' | 'inactive') => {
    const nextStatus = currentStatus === 'active' ? 'inactive' : 'active';
    try {
      await api.toggleSuperAdminGymStatus(gymId, nextStatus);
      await loadData();
    } catch (err: any) {
      alert(err.message || 'Failed to toggle gym status');
    }
  };

  const handleToggleUserStatus = async (userId: number, currentStatus: 'active' | 'inactive') => {
    const nextStatus = currentStatus === 'active' ? 'inactive' : 'active';
    try {
      await api.updateSuperAdminUser(userId, { status: nextStatus });
      await loadData();
    } catch (err: any) {
      alert(err.message || 'Failed to toggle user status');
    }
  };

  const handleCreateGym = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newGymName.trim()) return;
    try {
      await api.createSuperAdminGym({
        gymName: newGymName.trim(),
        phone: newGymPhone.trim() || undefined,
        email: newGymEmail.trim() || undefined,
        address: newGymAddress.trim() || undefined,
        smsSenderId: newGymSenderId.trim() || 'GYMFIT',
        monthlyPrice: Number(newGymMonthlyPrice) || 4500,
        threeMonthsPrice: Number(newGymThreeMonthsPrice) || 12000,
        sixMonthsPrice: Number(newGymSixMonthsPrice) || 22000,
        annualPrice: Number(newGymAnnualPrice) || 38000,
      });
      setIsCreateGymOpen(false);
      setNewGymName('');
      setNewGymPhone('');
      setNewGymEmail('');
      setNewGymAddress('');
      await loadData();
    } catch (err: any) {
      alert(err.message || 'Failed to create gym');
    }
  };

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newUserUsername.trim() || !newUserName.trim() || !newUserEmail.trim()) return;
    try {
      await api.createSuperAdminUser({
        username: newUserUsername.trim(),
        password: newUserPassword || 'gym123',
        name: newUserName.trim(),
        email: newUserEmail.trim(),
        gymId: Number(newUserGymId),
      });
      setIsCreateUserOpen(false);
      setNewUserUsername('');
      setNewUserName('');
      setNewUserEmail('');
      await loadData();
    } catch (err: any) {
      alert(err.message || 'Failed to create gym owner');
    }
  };

  const filteredGyms = (dashboard?.gymsStats || []).filter((g) => {
    const q = searchQuery.toLowerCase();
    return (
      g.gymName.toLowerCase().includes(q) ||
      (g.ownerName && g.ownerName.toLowerCase().includes(q)) ||
      (g.phone && g.phone.toLowerCase().includes(q))
    );
  });

  const filteredUsers = userList.filter((u) => {
    const q = searchQuery.toLowerCase();
    return (
      u.username.toLowerCase().includes(q) ||
      u.name.toLowerCase().includes(q) ||
      u.email.toLowerCase().includes(q) ||
      (u.gymName && u.gymName.toLowerCase().includes(q))
    );
  });

  return (
    <div id="super-admin-view" className="space-y-8 animate-in fade-in duration-300">
      {/* Header Banner */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-[#121212] p-6 rounded-3xl border border-[#FACC15]/20 bg-gradient-to-r from-[#121212] via-[#1a180d] to-[#121212]">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-[10px] font-black uppercase px-2.5 py-0.5 rounded-full bg-[#FACC15] text-black">
              MULTI-TENANT SAAS
            </span>
            <span className="text-xs text-gray-400 font-bold">Platform Super Administrator</span>
          </div>
          <h2 className="text-2xl font-black italic tracking-tight uppercase text-white">
            System Overseer <span className="text-[#FACC15]">Console</span>
          </h2>
          <p className="text-xs text-gray-400 mt-1">
            Manage gym tenants, monitor network-wide check-ins, configure package pricing, and provision gym owner credentials.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            id="btn-superadmin-refresh"
            onClick={loadData}
            disabled={loading}
            className="p-3 bg-black/40 hover:bg-black/60 border border-white/10 rounded-2xl text-gray-400 hover:text-white transition-colors"
            title="Refresh Data"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin text-[#FACC15]' : ''}`} />
          </button>
          <button
            id="btn-superadmin-add-gym"
            onClick={() => setIsCreateGymOpen(true)}
            className="px-5 py-3 bg-[#FACC15] hover:bg-yellow-300 text-black font-black uppercase text-xs tracking-widest rounded-2xl shadow-lg shadow-[#FACC15]/20 flex items-center gap-2 active:scale-95 transition-all"
          >
            <Plus className="w-4 h-4 stroke-[3]" />
            <span>Add New Gym</span>
          </button>
          <button
            id="btn-superadmin-add-user"
            onClick={() => setIsCreateUserOpen(true)}
            className="px-5 py-3 bg-white/10 hover:bg-white/20 border border-white/10 text-white font-black uppercase text-xs tracking-widest rounded-2xl flex items-center gap-2 active:scale-95 transition-all"
          >
            <Users className="w-4 h-4" />
            <span>Add Gym Owner</span>
          </button>
        </div>
      </div>

      {/* Global Stat Cards (Anti-slop, clean, high contrast) */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {/* Total Gyms */}
        <div className="bg-[#121212] p-5 rounded-2xl border border-white/5 relative group">
          <div className="flex justify-between items-start mb-2">
            <span className="text-[10px] font-bold uppercase tracking-widest text-gray-500">
              Total Gyms
            </span>
            <Building2 className="w-4 h-4 text-[#FACC15]" />
          </div>
          <div className="text-3xl font-black italic text-white">
            {dashboard?.totalGyms ?? 0}
          </div>
          <div className="mt-2 text-[10px] font-bold tracking-wider text-green-400 flex items-center justify-between">
            <span>{dashboard?.activeGyms ?? 0} Active</span>
            <span className="text-gray-500">{dashboard?.inactiveGyms ?? 0} Inactive</span>
          </div>
        </div>

        {/* Global Members */}
        <div className="bg-[#121212] p-5 rounded-2xl border border-white/5 relative group">
          <div className="flex justify-between items-start mb-2">
            <span className="text-[10px] font-bold uppercase tracking-widest text-gray-500">
              Network Members
            </span>
            <Users className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="text-3xl font-black italic text-emerald-400">
            {dashboard?.totalMembersAcrossGyms ?? 0}
          </div>
          <div className="mt-2 text-[10px] font-bold tracking-wider text-emerald-400/80">
            <span>{dashboard?.activeMembersAcrossGyms ?? 0} Active Members</span>
          </div>
        </div>

        {/* Today's Global Check-ins */}
        <div className="bg-[#121212] p-5 rounded-2xl border border-white/5 relative group">
          <div className="flex justify-between items-start mb-2">
            <span className="text-[10px] font-bold uppercase tracking-widest text-gray-500">
              Today's Network Scans
            </span>
            <QrCode className="w-4 h-4 text-[#FACC15]" />
          </div>
          <div className="text-3xl font-black italic text-[#FACC15]">
            {dashboard?.totalTodayCheckIns ?? 0}
          </div>
          <div className="mt-2 text-[10px] font-bold tracking-wider text-gray-500">
            Across all facilities
          </div>
        </div>

        {/* Today's Global Collections */}
        <div className="bg-[#121212] p-5 rounded-2xl border border-[#FACC15]/20 bg-gradient-to-br from-[#121212] to-[#1c1a0a] relative group">
          <div className="flex justify-between items-start mb-2">
            <span className="text-[10px] font-bold uppercase tracking-widest text-[#FACC15]">
              Today's Revenue
            </span>
            <TrendingUp className="w-4 h-4 text-[#FACC15]" />
          </div>
          <div className="text-3xl font-black italic text-[#FACC15]">
            Rs. {(dashboard?.totalTodayRevenue ?? 0).toLocaleString()}
          </div>
          <div className="mt-2 text-[10px] font-bold tracking-wider text-[#FACC15]/70">
            Live Daily Sum
          </div>
        </div>
      </div>

      {/* Tabs & Search Bar */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-white/10 pb-4">
        <div className="flex items-center gap-2 bg-[#121212] p-1 rounded-2xl border border-white/5">
          <button
            id="tab-superadmin-gyms"
            onClick={() => setActiveTab('gyms')}
            className={`px-5 py-2.5 rounded-xl font-black text-xs uppercase tracking-wider transition-all flex items-center gap-2 ${
              activeTab === 'gyms'
                ? 'bg-[#FACC15] text-black shadow-md'
                : 'text-gray-400 hover:text-white'
            }`}
          >
            <Building2 className="w-4 h-4" />
            <span>Gym Organizations ({dashboard?.gymsStats.length ?? 0})</span>
          </button>
          <button
            id="tab-superadmin-users"
            onClick={() => setActiveTab('users')}
            className={`px-5 py-2.5 rounded-xl font-black text-xs uppercase tracking-wider transition-all flex items-center gap-2 ${
              activeTab === 'users'
                ? 'bg-[#FACC15] text-black shadow-md'
                : 'text-gray-400 hover:text-white'
            }`}
          >
            <Users className="w-4 h-4" />
            <span>Gym Owners & Staff ({userList.length})</span>
          </button>
        </div>

        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 text-gray-500 absolute left-4 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder={`Search ${activeTab === 'gyms' ? 'gyms, owner...' : 'users, email, gym...'}`}
            className="w-full bg-[#121212] border border-white/10 rounded-2xl pl-11 pr-4 py-2.5 text-xs text-white placeholder:text-gray-500 focus:outline-none focus:border-[#FACC15]"
          />
        </div>
      </div>

      {/* Tab 1: Gym Organizations Table */}
      {activeTab === 'gyms' && (
        <div className="bg-[#121212] rounded-3xl border border-white/5 overflow-hidden shadow-2xl">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-black/60 border-b border-white/5 text-[10px] font-black uppercase text-gray-500 tracking-wider">
                <tr>
                  <th className="py-4 px-6">Gym Entity</th>
                  <th className="py-4 px-4">Contact</th>
                  <th className="py-4 px-4">Owner Account</th>
                  <th className="py-4 px-4 text-center">Active Members</th>
                  <th className="py-4 px-4 text-center">Today's Scans</th>
                  <th className="py-4 px-4 text-right">Today's Revenue</th>
                  <th className="py-4 px-4 text-center">Status</th>
                  <th className="py-4 px-6 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {filteredGyms.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="py-12 text-center text-gray-500">
                      No gyms found matching criteria.
                    </td>
                  </tr>
                ) : (
                  filteredGyms.map((g) => (
                    <tr key={g.gymId} className="hover:bg-white/[0.02] transition-colors group">
                      {/* Entity */}
                      <td className="py-4 px-6">
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-xl bg-[#FACC15]/10 border border-[#FACC15]/30 flex items-center justify-center text-[#FACC15] font-black italic">
                            #{g.gymId}
                          </div>
                          <div>
                            <div className="font-bold text-sm text-white">{g.gymName}</div>
                            <div className="text-[10px] text-gray-500 font-mono">
                              Tenant ID: {g.gymId}
                            </div>
                          </div>
                        </div>
                      </td>

                      {/* Contact */}
                      <td className="py-4 px-4 text-gray-400">
                        <div>{g.phone || 'No phone'}</div>
                        <div className="text-[10px] text-gray-500 truncate max-w-[150px]">
                          {g.address || 'No address'}
                        </div>
                      </td>

                      {/* Owner */}
                      <td className="py-4 px-4">
                        {g.ownerName ? (
                          <div>
                            <div className="font-semibold text-white">{g.ownerName}</div>
                            <div className="text-[10px] text-[#FACC15] font-mono">@{g.ownerUsername}</div>
                          </div>
                        ) : (
                          <span className="text-gray-500 italic">No assigned owner</span>
                        )}
                      </td>

                      {/* Active Members */}
                      <td className="py-4 px-4 text-center">
                        <span className="font-black text-emerald-400 text-sm">{g.activeMembers}</span>
                        <span className="text-[10px] text-gray-500 block">/ {g.totalMembers} total</span>
                      </td>

                      {/* Today's Scans */}
                      <td className="py-4 px-4 text-center font-bold text-white">
                        {g.todayCheckIns}
                      </td>

                      {/* Today's Revenue */}
                      <td className="py-4 px-4 text-right font-black text-[#FACC15]">
                        Rs. {g.todayRevenue.toLocaleString()}
                      </td>

                      {/* Status */}
                      <td className="py-4 px-4 text-center">
                        <button
                          onClick={() => handleToggleGymStatus(g.gymId, g.status)}
                          className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider border transition-colors ${
                            g.status === 'active'
                              ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20 hover:bg-red-500/10 hover:text-red-400 hover:border-red-500/20'
                              : 'bg-red-500/10 text-red-400 border-red-500/20 hover:bg-emerald-500/10 hover:text-emerald-400 hover:border-emerald-500/20'
                          }`}
                          title="Click to toggle status"
                        >
                          {g.status}
                        </button>
                      </td>

                      {/* Actions */}
                      <td className="py-4 px-6 text-right">
                        <div className="flex items-center justify-end gap-2">
                          {onSwitchToGym && (
                            <button
                              onClick={() => onSwitchToGym(g.gymId, g.gymName)}
                              className="p-2 bg-white/5 hover:bg-[#FACC15] hover:text-black border border-white/10 rounded-xl text-gray-300 transition-colors"
                              title="Scope into this gym console"
                            >
                              <ExternalLink className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Tab 2: Users & Gym Owners Table */}
      {activeTab === 'users' && (
        <div className="bg-[#121212] rounded-3xl border border-white/5 overflow-hidden shadow-2xl">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-black/60 border-b border-white/5 text-[10px] font-black uppercase text-gray-500 tracking-wider">
                <tr>
                  <th className="py-4 px-6">User / Username</th>
                  <th className="py-4 px-4">Full Name</th>
                  <th className="py-4 px-4">Role</th>
                  <th className="py-4 px-4">Assigned Gym Tenant</th>
                  <th className="py-4 px-4 text-center">Status</th>
                  <th className="py-4 px-6 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {filteredUsers.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-12 text-center text-gray-500">
                      No user accounts found.
                    </td>
                  </tr>
                ) : (
                  filteredUsers.map((u) => (
                    <tr key={u.id} className="hover:bg-white/[0.02] transition-colors group">
                      <td className="py-4 px-6">
                        <div className="font-bold text-white">{u.username}</div>
                        <div className="text-[10px] text-gray-500">{u.email}</div>
                      </td>
                      <td className="py-4 px-4 font-semibold text-gray-300">
                        {u.name}
                      </td>
                      <td className="py-4 px-4">
                        <span
                          className={`text-[9px] font-black px-2.5 py-1 rounded-full uppercase tracking-wider ${
                            u.role === 'SUPER_ADMIN'
                              ? 'bg-purple-500/20 text-purple-300 border border-purple-500/30'
                              : 'bg-[#FACC15]/20 text-[#FACC15] border border-[#FACC15]/30'
                          }`}
                        >
                          {u.role === 'SUPER_ADMIN' ? 'SUPER ADMIN' : 'GYM OWNER'}
                        </span>
                      </td>
                      <td className="py-4 px-4">
                        {u.gymId ? (
                          <div className="flex items-center gap-2">
                            <span className="w-2 h-2 rounded-full bg-[#FACC15]" />
                            <span className="text-white font-bold">{u.gymName}</span>
                          </div>
                        ) : (
                          <span className="text-gray-500 italic">Platform Level (All Gyms)</span>
                        )}
                      </td>
                      <td className="py-4 px-4 text-center">
                        <button
                          onClick={() => handleToggleUserStatus(u.id, u.status)}
                          className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider border transition-colors ${
                            u.status === 'active'
                              ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20 hover:bg-red-500/10 hover:text-red-400'
                              : 'bg-red-500/10 text-red-400 border-red-500/20 hover:bg-emerald-500/10 hover:text-emerald-400'
                          }`}
                        >
                          {u.status}
                        </button>
                      </td>
                      <td className="py-4 px-6 text-right">
                        <span className="text-[10px] text-gray-500 font-mono">
                          ID #{u.id}
                        </span>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Modal: Create Gym */}
      {isCreateGymOpen && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-[#121212] border border-white/10 rounded-3xl p-6 sm:p-8 max-w-lg w-full shadow-2xl animate-in zoom-in-95">
            <h3 className="text-lg font-black uppercase text-white mb-1">Create Gym Organization</h3>
            <p className="text-xs text-gray-400 mb-6">
              Add a new tenant to the multi-tenant SaaS platform. Scoped database records will be generated automatically.
            </p>
            <form onSubmit={handleCreateGym} className="space-y-4">
              <div>
                <label className="block text-[10px] font-black uppercase text-gray-400 mb-1">
                  Gym Facility Name *
                </label>
                <input
                  type="text"
                  required
                  value={newGymName}
                  onChange={(e) => setNewGymName(e.target.value)}
                  placeholder="e.g. Apex Fitness Center"
                  className="w-full bg-black/40 border border-white/10 rounded-2xl px-4 py-2.5 text-xs text-white focus:outline-none focus:border-[#FACC15]"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[10px] font-black uppercase text-gray-400 mb-1">
                    Phone Number
                  </label>
                  <input
                    type="text"
                    value={newGymPhone}
                    onChange={(e) => setNewGymPhone(e.target.value)}
                    placeholder="0771234567"
                    className="w-full bg-black/40 border border-white/10 rounded-2xl px-4 py-2.5 text-xs text-white focus:outline-none focus:border-[#FACC15]"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-black uppercase text-gray-400 mb-1">
                    SMS Sender ID
                  </label>
                  <input
                    type="text"
                    value={newGymSenderId}
                    onChange={(e) => setNewGymSenderId(e.target.value)}
                    placeholder="APEXFIT"
                    className="w-full bg-black/40 border border-white/10 rounded-2xl px-4 py-2.5 text-xs text-white uppercase focus:outline-none focus:border-[#FACC15]"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-black uppercase text-gray-400 mb-1">
                  Email Address
                </label>
                <input
                  type="email"
                  value={newGymEmail}
                  onChange={(e) => setNewGymEmail(e.target.value)}
                  placeholder="reception@apexfitness.lk"
                  className="w-full bg-black/40 border border-white/10 rounded-2xl px-4 py-2.5 text-xs text-white focus:outline-none focus:border-[#FACC15]"
                />
              </div>

              <div>
                <label className="block text-[10px] font-black uppercase text-gray-400 mb-1">
                  Address / City
                </label>
                <input
                  type="text"
                  value={newGymAddress}
                  onChange={(e) => setNewGymAddress(e.target.value)}
                  placeholder="Kandy Road, Colombo"
                  className="w-full bg-black/40 border border-white/10 rounded-2xl px-4 py-2.5 text-xs text-white focus:outline-none focus:border-[#FACC15]"
                />
              </div>

              <div className="pt-2 border-t border-white/5">
                <label className="block text-[10px] font-black uppercase text-[#FACC15] mb-2">
                  Membership Package Pricing (Rs.)
                </label>
                <div className="grid grid-cols-4 gap-2">
                  <div>
                    <span className="text-[9px] text-gray-400 block mb-1">1 Month</span>
                    <input
                      type="number"
                      value={newGymMonthlyPrice}
                      onChange={(e) => setNewGymMonthlyPrice(e.target.value)}
                      className="w-full bg-black/40 border border-white/10 rounded-xl px-2.5 py-1.5 text-xs text-white font-mono"
                    />
                  </div>
                  <div>
                    <span className="text-[9px] text-gray-400 block mb-1">3 Months</span>
                    <input
                      type="number"
                      value={newGymThreeMonthsPrice}
                      onChange={(e) => setNewGymThreeMonthsPrice(e.target.value)}
                      className="w-full bg-black/40 border border-white/10 rounded-xl px-2.5 py-1.5 text-xs text-white font-mono"
                    />
                  </div>
                  <div>
                    <span className="text-[9px] text-gray-400 block mb-1">6 Months</span>
                    <input
                      type="number"
                      value={newGymSixMonthsPrice}
                      onChange={(e) => setNewGymSixMonthsPrice(e.target.value)}
                      className="w-full bg-black/40 border border-white/10 rounded-xl px-2.5 py-1.5 text-xs text-white font-mono"
                    />
                  </div>
                  <div>
                    <span className="text-[9px] text-gray-400 block mb-1">Annual</span>
                    <input
                      type="number"
                      value={newGymAnnualPrice}
                      onChange={(e) => setNewGymAnnualPrice(e.target.value)}
                      className="w-full bg-black/40 border border-white/10 rounded-xl px-2.5 py-1.5 text-xs text-white font-mono"
                    />
                  </div>
                </div>
              </div>

              <div className="flex gap-2 pt-4">
                <button
                  type="button"
                  onClick={() => setIsCreateGymOpen(false)}
                  className="flex-1 py-3 bg-white/5 border border-white/10 rounded-2xl text-xs font-bold uppercase text-gray-300 hover:bg-white/10"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 py-3 bg-[#FACC15] hover:bg-yellow-300 rounded-2xl text-xs font-black uppercase tracking-wider text-black shadow-lg shadow-[#FACC15]/20"
                >
                  Create Gym
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Create Gym Owner */}
      {isCreateUserOpen && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-[#121212] border border-white/10 rounded-3xl p-6 sm:p-8 max-w-md w-full shadow-2xl animate-in zoom-in-95">
            <h3 className="text-lg font-black uppercase text-white mb-1">Provision Gym Owner Account</h3>
            <p className="text-xs text-gray-400 mb-6">
              Create a login for a gym owner. Their session will be strictly locked to the selected gym.
            </p>
            <form onSubmit={handleCreateUser} className="space-y-4">
              <div>
                <label className="block text-[10px] font-black uppercase text-gray-400 mb-1">
                  Assign to Gym *
                </label>
                <select
                  value={newUserGymId}
                  onChange={(e) => setNewUserGymId(Number(e.target.value))}
                  className="w-full bg-black/40 border border-white/10 rounded-2xl px-4 py-2.5 text-xs text-white focus:outline-none focus:border-[#FACC15]"
                >
                  {(dashboard?.gymsStats || []).map((g) => (
                    <option key={g.gymId} value={g.gymId} className="bg-black text-white">
                      {g.gymName} (ID #{g.gymId})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-[10px] font-black uppercase text-gray-400 mb-1">
                  Full Name *
                </label>
                <input
                  type="text"
                  required
                  value={newUserName}
                  onChange={(e) => setNewUserName(e.target.value)}
                  placeholder="e.g. Kasun Perera"
                  className="w-full bg-black/40 border border-white/10 rounded-2xl px-4 py-2.5 text-xs text-white focus:outline-none focus:border-[#FACC15]"
                />
              </div>

              <div>
                <label className="block text-[10px] font-black uppercase text-gray-400 mb-1">
                  Username *
                </label>
                <input
                  type="text"
                  required
                  value={newUserUsername}
                  onChange={(e) => setNewUserUsername(e.target.value)}
                  placeholder="e.g. kasun_apex"
                  className="w-full bg-black/40 border border-white/10 rounded-2xl px-4 py-2.5 text-xs text-white lowercase focus:outline-none focus:border-[#FACC15]"
                />
              </div>

              <div>
                <label className="block text-[10px] font-black uppercase text-gray-400 mb-1">
                  Email Address *
                </label>
                <input
                  type="email"
                  required
                  value={newUserEmail}
                  onChange={(e) => setNewUserEmail(e.target.value)}
                  placeholder="kasun@apexfit.lk"
                  className="w-full bg-black/40 border border-white/10 rounded-2xl px-4 py-2.5 text-xs text-white focus:outline-none focus:border-[#FACC15]"
                />
              </div>

              <div>
                <label className="block text-[10px] font-black uppercase text-gray-400 mb-1">
                  Password *
                </label>
                <input
                  type="text"
                  required
                  value={newUserPassword}
                  onChange={(e) => setNewUserPassword(e.target.value)}
                  placeholder="gym123"
                  className="w-full bg-black/40 border border-white/10 rounded-2xl px-4 py-2.5 text-xs text-white focus:outline-none focus:border-[#FACC15]"
                />
                <span className="text-[10px] text-gray-500 mt-1 block">Default initial password</span>
              </div>

              <div className="flex gap-2 pt-4">
                <button
                  type="button"
                  onClick={() => setIsCreateUserOpen(false)}
                  className="flex-1 py-3 bg-white/5 border border-white/10 rounded-2xl text-xs font-bold uppercase text-gray-300 hover:bg-white/10"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 py-3 bg-[#FACC15] hover:bg-yellow-300 rounded-2xl text-xs font-black uppercase tracking-wider text-black shadow-lg shadow-[#FACC15]/20"
                >
                  Create Owner
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
