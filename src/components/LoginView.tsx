import React, { useState } from 'react';
import { Dumbbell, ShieldCheck, Lock, User, KeyRound, ArrowRight, MapPin, Building2, Sparkles } from 'lucide-react';
import { signInWithPopup } from 'firebase/auth';
import { auth, googleAuthProvider } from '../lib/firebase.ts';
import { api, setAuthSession, setTargetGymId } from '../lib/api.ts';
import { UserSession } from '../types.ts';
import { useBusiness } from '../context/BusinessContext.tsx';

interface LoginViewProps {
  onLoginSuccess: (user: UserSession) => void;
}

interface GymPreset {
  id: number;
  businessId: string;
  gymName: string;
  adminName: string;
  username: string;
  currency: string;
  badge: string;
}

const DEMO_CUSTOMERS: GymPreset[] = [
  {
    id: 1,
    businessId: 'biz_1',
    gymName: 'ZENERGY FITNESS',
    adminName: 'Titan',
    username: 'titan',
    currency: 'Rs.',
    badge: 'Customer 1',
  },
  {
    id: 2,
    businessId: 'biz_2',
    gymName: 'POWER FITNESS',
    adminName: 'Kasun',
    username: 'kasun',
    currency: 'Rs.',
    badge: 'Customer 2',
  },
  {
    id: 3,
    businessId: 'biz_3',
    gymName: 'ELITE GYM',
    adminName: 'Nimal',
    username: 'nimal',
    currency: '$',
    badge: 'Customer 3',
  },
];

export const LoginView: React.FC<LoginViewProps> = ({ onLoginSuccess }) => {
  const { business, refreshBusiness } = useBusiness();
  const [username, setUsername] = useState('titan');
  const [password, setPassword] = useState('admin123');
  const [selectedPreset, setSelectedPreset] = useState<GymPreset>(DEMO_CUSTOMERS[0]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSelectCustomerPreset = (preset: GymPreset) => {
    setSelectedPreset(preset);
    setUsername(preset.username);
    setPassword('admin123');
    setTargetGymId(preset.id);
    refreshBusiness();
  };

  const handleCredentialsLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const res = await api.login({ username, password });
      if (res.success && res.token) {
        setAuthSession(res.token, res.user);
        if (res.user.gymId) {
          setTargetGymId(res.user.gymId);
        }
        await refreshBusiness();
        onLoginSuccess(res.user);
      }
    } catch (err: any) {
      setError(err.message || 'Invalid username or password.');
    } finally {
      setLoading(false);
    }
  };

  const handleQuickReceptionAccess = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await api.login({ passkey: 'gym_admin_secret_session_active' });
      if (res.success && res.token) {
        setAuthSession(res.token, res.user);
        if (res.user.gymId) {
          setTargetGymId(res.user.gymId);
        }
        await refreshBusiness();
        onLoginSuccess(res.user);
      }
    } catch (err: any) {
      setError(err.message || 'Quick login failed.');
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await signInWithPopup(auth, googleAuthProvider);
      const token = await result.user.getIdToken();
      const user: UserSession = {
        uid: result.user.uid,
        email: result.user.email || 'admin@wowpos.io',
        name: result.user.displayName || 'Gym Administrator',
        role: 'GYM_OWNER',
        gymId: selectedPreset.id,
        gymName: business.gymName || selectedPreset.gymName,
        token,
      };
      setAuthSession(token, user);
      setTargetGymId(selectedPreset.id);
      await refreshBusiness();
      onLoginSuccess(user);
    } catch (err: any) {
      console.warn('Google sign-in popup closed or failed:', err);
      setError('Google sign in canceled or unavailable. Use staff credentials below.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      id="login-view"
      className="min-h-screen bg-[#070708] flex flex-col justify-center items-center p-4 sm:p-6 relative overflow-hidden"
    >
      {/* Subtle ambient lighting */}
      <div className="absolute -top-40 -left-40 w-96 h-96 bg-[#FACC15]/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute -bottom-40 -right-40 w-96 h-96 bg-[#FACC15]/5 rounded-full blur-3xl pointer-events-none" />

      {/* Main Software Brand Header */}
      <div className="text-center mb-6 z-10">
        <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-[#FACC15]/10 border border-[#FACC15]/30 mb-2">
          <Sparkles className="w-3.5 h-3.5 text-[#FACC15]" />
          <span className="text-[11px] font-black text-[#FACC15] uppercase tracking-widest">
            SaaS Multi-Tenant Edition
          </span>
        </div>
        <h1 className="text-3xl sm:text-4xl font-black italic text-white uppercase tracking-tight flex items-center justify-center gap-2">
          WOW POS
        </h1>
        <p className="text-xs font-semibold text-gray-400 mt-1">
          Gym Management & Point of Sale System
        </p>
      </div>

      <div className="w-full max-w-md bg-[#121214] border border-white/10 rounded-3xl p-6 sm:p-8 shadow-2xl relative z-10">
        {/* Active Customer Business Card */}
        <div className="text-center mb-6 pb-5 border-b border-white/10">
          <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-white/5 border border-white/10 text-[10px] text-gray-400 font-bold uppercase tracking-wider mb-3">
            <Building2 className="w-3 h-3 text-[#FACC15]" />
            <span>Customer Business Instance</span>
          </div>

          <h2 className="text-xl font-black italic text-white uppercase tracking-wider">
            {business.gymName || selectedPreset.gymName}
          </h2>
          <p className="text-[11px] font-semibold text-[#FACC15] mt-0.5">
            Admin: {selectedPreset.adminName}
          </p>

          {business.address && (
            <div className="flex items-center justify-center gap-1.5 text-[11px] text-gray-400 mt-2">
              <MapPin className="w-3 h-3 text-[#FACC15] shrink-0" />
              <span className="truncate">{business.address}</span>
            </div>
          )}
        </div>

        {/* Multi-Tenant Customer Switcher / Demo Presets */}
        <div className="mb-6">
          <label className="block text-[10px] font-black uppercase tracking-wider text-gray-400 mb-2 text-center">
            Select Customer Business (White-Label Demonstration)
          </label>
          <div className="grid grid-cols-3 gap-2">
            {DEMO_CUSTOMERS.map((preset) => {
              const isSelected = selectedPreset.id === preset.id;
              return (
                <button
                  key={preset.id}
                  type="button"
                  onClick={() => handleSelectCustomerPreset(preset)}
                  className={`p-2.5 rounded-xl border text-left transition-all flex flex-col items-start ${
                    isSelected
                      ? 'bg-[#FACC15]/15 border-[#FACC15] text-white shadow-md shadow-[#FACC15]/10'
                      : 'bg-black/30 border-white/10 text-gray-400 hover:border-white/20 hover:text-white'
                  }`}
                >
                  <span className="text-[9px] font-bold text-[#FACC15] uppercase tracking-wider">
                    {preset.badge}
                  </span>
                  <span className="text-[11px] font-black uppercase truncate w-full mt-0.5">
                    {preset.gymName.replace(' FITNESS', '').replace(' GYM', '')}
                  </span>
                  <span className="text-[9px] text-gray-400 truncate w-full">
                    Admin: {preset.adminName}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {error && (
          <div className="mb-5 p-3 rounded-2xl bg-red-500/15 border border-red-500/30 text-red-400 text-xs font-bold text-center">
            {error}
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleCredentialsLogin} className="space-y-4">
          <div>
            <label className="block text-[10px] font-black uppercase tracking-wider text-gray-400 mb-1.5">
              Admin / Staff Username
            </label>
            <div className="relative">
              <User className="w-4 h-4 text-gray-500 absolute left-4 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                required
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="titan"
                className="w-full bg-black/40 border border-white/10 rounded-2xl pl-11 pr-4 py-3 text-white text-xs font-semibold focus:border-[#FACC15] focus:outline-hidden"
              />
            </div>
          </div>

          <div>
            <label className="block text-[10px] font-black uppercase tracking-wider text-gray-400 mb-1.5">
              Password
            </label>
            <div className="relative">
              <Lock className="w-4 h-4 text-gray-500 absolute left-4 top-1/2 -translate-y-1/2" />
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full bg-black/40 border border-white/10 rounded-2xl pl-11 pr-4 py-3 text-white text-xs font-semibold focus:border-[#FACC15] focus:outline-hidden"
              />
            </div>
            <div className="flex items-center justify-between text-[10px] text-gray-400 mt-2 px-1">
              <span>Quick switch:</span>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setUsername('superadmin');
                    setPassword('admin123');
                  }}
                  className="text-[#FACC15] hover:underline font-bold"
                >
                  Super Admin
                </button>
                <span className="text-gray-600">•</span>
                <button
                  type="button"
                  onClick={() => {
                    setUsername('titan');
                    setPassword('admin123');
                  }}
                  className="text-[#FACC15] hover:underline font-bold"
                >
                  Titan (Customer 1)
                </button>
              </div>
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full mt-3 py-3.5 px-5 rounded-full bg-[#FACC15] hover:bg-yellow-300 disabled:opacity-50 text-black text-xs font-black uppercase tracking-widest shadow-md shadow-[#FACC15]/20 transition-all flex items-center justify-center gap-2 active:scale-95"
          >
            <span>{loading ? 'Authenticating...' : `Sign In to ${selectedPreset.gymName}`}</span>
            <ArrowRight className="w-4 h-4 stroke-[2.5]" />
          </button>
        </form>

        {/* Fast Reception One-Click Login */}
        <div className="mt-5 pt-5 border-t border-white/5 space-y-2.5">
          <button
            type="button"
            onClick={handleQuickReceptionAccess}
            disabled={loading}
            className="w-full py-2.5 px-4 rounded-full bg-white/5 hover:bg-white/10 border border-white/10 text-white text-xs font-black uppercase tracking-wider transition-colors flex items-center justify-center gap-2"
          >
            <KeyRound className="w-3.5 h-3.5 text-[#FACC15]" />
            <span>Fast 1-Click Reception Access</span>
          </button>

          <button
            type="button"
            onClick={handleGoogleSignIn}
            disabled={loading}
            className="w-full py-2 px-4 rounded-full bg-black/30 hover:bg-white/5 border border-white/5 text-gray-400 hover:text-white text-xs font-bold transition-colors"
          >
            Sign In with Google Auth
          </button>
        </div>

        {/* Security badge: MongoDB Atlas Multi-Tenant */}
        <div className="mt-6 flex items-center justify-center gap-2 text-[11px] text-gray-500 text-center">
          <ShieldCheck className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
          <span>MongoDB Atlas Multi-Tenant Cloud Database Secured</span>
        </div>
      </div>
    </div>
  );
};
