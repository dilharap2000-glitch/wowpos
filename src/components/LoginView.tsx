import React, { useState } from 'react';
import { ShieldCheck, Lock, User, KeyRound, ArrowRight, MapPin, Building2, Sparkles, Mail, Phone, CheckCircle2 } from 'lucide-react';
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
  const [authMode, setAuthMode] = useState<'login' | 'signup'>('login');

  // Login Form State
  const [identifier, setIdentifier] = useState('titan');
  const [loginPassword, setLoginPassword] = useState('admin123');
  const [selectedPreset, setSelectedPreset] = useState<GymPreset>(DEMO_CUSTOMERS[0]);

  // Sign Up Form State
  const [signUpGymName, setSignUpGymName] = useState('');
  const [signUpOwnerName, setSignUpOwnerName] = useState('');
  const [signUpEmail, setSignUpEmail] = useState('');
  const [signUpPhone, setSignUpPhone] = useState('');
  const [signUpPassword, setSignUpPassword] = useState('');
  const [signUpConfirmPassword, setSignUpConfirmPassword] = useState('');

  // UI state
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const handleSelectCustomerPreset = (preset: GymPreset) => {
    setSelectedPreset(preset);
    setIdentifier(preset.username);
    setLoginPassword('admin123');
    setTargetGymId(preset.id);
    refreshBusiness();
  };

  const handleCredentialsLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const res = await api.login({
        username: identifier,
        email: identifier.includes('@') ? identifier : undefined,
        password: loginPassword,
      });

      if (res.success && res.token) {
        setAuthSession(res.token, res.user);
        if (res.user.gymId) {
          setTargetGymId(res.user.gymId);
        }
        await refreshBusiness();
        onLoginSuccess(res.user);
      }
    } catch (err: any) {
      setError(err.message || 'Invalid email/username or password.');
    } finally {
      setLoading(false);
    }
  };

  const handleSignUpSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccessMessage(null);

    // Validation
    if (!signUpGymName.trim()) {
      setError('Please enter your Gym Name.');
      return;
    }
    if (!signUpOwnerName.trim()) {
      setError('Please enter the Owner Name.');
      return;
    }
    if (!signUpEmail.trim() || !signUpEmail.includes('@')) {
      setError('Please provide a valid Email address.');
      return;
    }
    if (!signUpPhone.trim()) {
      setError('Please enter a contact phone number.');
      return;
    }
    if (!signUpPassword || signUpPassword.length < 6) {
      setError('Password must be at least 6 characters long.');
      return;
    }
    if (signUpPassword !== signUpConfirmPassword) {
      setError('Passwords do not match.');
      return;
    }

    setLoading(true);

    try {
      const res = await api.register({
        gymName: signUpGymName.trim(),
        ownerName: signUpOwnerName.trim(),
        email: signUpEmail.trim().toLowerCase(),
        phone: signUpPhone.trim(),
        password: signUpPassword,
        confirmPassword: signUpConfirmPassword,
      });

      if (res.success && res.token) {
        setSuccessMessage('Gym registered successfully! Launching your workspace...');
        setAuthSession(res.token, res.user);
        if (res.user.gymId) {
          setTargetGymId(res.user.gymId);
        }
        await refreshBusiness();
        setTimeout(() => {
          onLoginSuccess(res.user);
        }, 400);
      }
    } catch (err: any) {
      setError(err.message || 'Failed to create gym account. Please try again.');
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
      setError('Google sign in canceled or unavailable. Use credentials below.');
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
      <div className="text-center mb-5 z-10">
        <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-[#FACC15]/10 border border-[#FACC15]/30 mb-2">
          <Sparkles className="w-3.5 h-3.5 text-[#FACC15]" />
          <span className="text-[11px] font-black text-[#FACC15] uppercase tracking-widest">
            SaaS Multi-Tenant Cloud Edition
          </span>
        </div>
        <h1 className="text-3xl sm:text-4xl font-black italic text-white uppercase tracking-tight flex items-center justify-center gap-2">
          WOW POS
        </h1>
        <p className="text-xs font-semibold text-gray-400 mt-1">
          Multi-Tenant Gym Management & Point of Sale System
        </p>
      </div>

      <div className="w-full max-w-md bg-[#121214] border border-white/10 rounded-3xl p-6 sm:p-8 shadow-2xl relative z-10">
        {/* Navigation Tabs: Sign In / Create Gym Account */}
        <div className="flex bg-black/60 p-1 rounded-2xl border border-white/10 mb-6">
          <button
            type="button"
            id="tab-login"
            onClick={() => {
              setAuthMode('login');
              setError(null);
              setSuccessMessage(null);
            }}
            className={`flex-1 py-2.5 text-xs font-black uppercase tracking-wider rounded-xl transition-all ${
              authMode === 'login'
                ? 'bg-[#FACC15] text-black shadow-md shadow-[#FACC15]/15'
                : 'text-gray-400 hover:text-white'
            }`}
          >
            Sign In
          </button>
          <button
            type="button"
            id="tab-signup"
            onClick={() => {
              setAuthMode('signup');
              setError(null);
              setSuccessMessage(null);
            }}
            className={`flex-1 py-2.5 text-xs font-black uppercase tracking-wider rounded-xl transition-all ${
              authMode === 'signup'
                ? 'bg-[#FACC15] text-black shadow-md shadow-[#FACC15]/15'
                : 'text-gray-400 hover:text-white'
            }`}
          >
            Create Gym Account
          </button>
        </div>

        {/* Feedback banners */}
        {error && (
          <div className="mb-5 p-3 rounded-2xl bg-red-500/15 border border-red-500/30 text-red-400 text-xs font-bold text-center">
            {error}
          </div>
        )}

        {successMessage && (
          <div className="mb-5 p-3 rounded-2xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 text-xs font-bold text-center flex items-center justify-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
            <span>{successMessage}</span>
          </div>
        )}

        {/* ============================================================ */}
        {/* TAB 1: SIGN IN */}
        {/* ============================================================ */}
        {authMode === 'login' && (
          <>
            {/* Active Customer Business Card */}
            <div className="text-center mb-6 pb-5 border-b border-white/10">
              <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-white/5 border border-white/10 text-[10px] text-gray-400 font-bold uppercase tracking-wider mb-2">
                <Building2 className="w-3 h-3 text-[#FACC15]" />
                <span>Selected Gym Instance</span>
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
            <div className="mb-5">
              <label className="block text-[10px] font-black uppercase tracking-wider text-gray-400 mb-2 text-center">
                Demo Presets (Instant Switch)
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

            {/* Login Form */}
            <form onSubmit={handleCredentialsLogin} className="space-y-4">
              <div>
                <label className="block text-[10px] font-black uppercase tracking-wider text-gray-400 mb-1.5">
                  Email or Username
                </label>
                <div className="relative">
                  <User className="w-4 h-4 text-gray-500 absolute left-4 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    required
                    id="input-login-identifier"
                    value={identifier}
                    onChange={(e) => setIdentifier(e.target.value)}
                    placeholder="email@gym.com or username"
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
                    id="input-login-password"
                    value={loginPassword}
                    onChange={(e) => setLoginPassword(e.target.value)}
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
                        setIdentifier('superadmin');
                        setLoginPassword('admin123');
                      }}
                      className="text-[#FACC15] hover:underline font-bold"
                    >
                      Super Admin
                    </button>
                    <span className="text-gray-600">•</span>
                    <button
                      type="button"
                      onClick={() => {
                        setIdentifier('titan');
                        setLoginPassword('admin123');
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
                id="btn-login-submit"
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
                id="btn-quick-reception"
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

            {/* Link to switch to registration */}
            <div className="mt-5 text-center">
              <p className="text-xs text-gray-400">
                New gym owner?{' '}
                <button
                  type="button"
                  onClick={() => {
                    setAuthMode('signup');
                    setError(null);
                    setSuccessMessage(null);
                  }}
                  className="text-[#FACC15] font-bold hover:underline"
                >
                  Create Gym Account &rarr;
                </button>
              </p>
            </div>
          </>
        )}

        {/* ============================================================ */}
        {/* TAB 2: GYM OWNER REGISTRATION */}
        {/* ============================================================ */}
        {authMode === 'signup' && (
          <form onSubmit={handleSignUpSubmit} className="space-y-3.5">
            <div className="text-center mb-4">
              <h2 className="text-lg font-black italic text-white uppercase tracking-wider">
                Register Your Gym
              </h2>
              <p className="text-[11px] text-gray-400 mt-0.5">
                Get an isolated workspace with POS, member registry & cloud database
              </p>
            </div>

            {/* Gym Name */}
            <div>
              <label className="block text-[10px] font-black uppercase tracking-wider text-gray-400 mb-1">
                Gym / Facility Name *
              </label>
              <div className="relative">
                <Building2 className="w-4 h-4 text-gray-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  required
                  id="input-signup-gymname"
                  value={signUpGymName}
                  onChange={(e) => setSignUpGymName(e.target.value)}
                  placeholder="e.g. Iron Force Fitness Club"
                  className="w-full bg-black/40 border border-white/10 rounded-xl pl-10 pr-3 py-2.5 text-white text-xs font-semibold focus:border-[#FACC15] focus:outline-hidden"
                />
              </div>
            </div>

            {/* Owner Full Name */}
            <div>
              <label className="block text-[10px] font-black uppercase tracking-wider text-gray-400 mb-1">
                Owner Full Name *
              </label>
              <div className="relative">
                <User className="w-4 h-4 text-gray-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  required
                  id="input-signup-ownername"
                  value={signUpOwnerName}
                  onChange={(e) => setSignUpOwnerName(e.target.value)}
                  placeholder="e.g. Alex Silva"
                  className="w-full bg-black/40 border border-white/10 rounded-xl pl-10 pr-3 py-2.5 text-white text-xs font-semibold focus:border-[#FACC15] focus:outline-hidden"
                />
              </div>
            </div>

            {/* Email */}
            <div>
              <label className="block text-[10px] font-black uppercase tracking-wider text-gray-400 mb-1">
                Owner Email (For Login) *
              </label>
              <div className="relative">
                <Mail className="w-4 h-4 text-gray-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="email"
                  required
                  id="input-signup-email"
                  value={signUpEmail}
                  onChange={(e) => setSignUpEmail(e.target.value)}
                  placeholder="owner@ironforce.lk"
                  className="w-full bg-black/40 border border-white/10 rounded-xl pl-10 pr-3 py-2.5 text-white text-xs font-semibold focus:border-[#FACC15] focus:outline-hidden"
                />
              </div>
            </div>

            {/* Phone Number */}
            <div>
              <label className="block text-[10px] font-black uppercase tracking-wider text-gray-400 mb-1">
                Phone Number *
              </label>
              <div className="relative">
                <Phone className="w-4 h-4 text-gray-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="tel"
                  required
                  id="input-signup-phone"
                  value={signUpPhone}
                  onChange={(e) => setSignUpPhone(e.target.value)}
                  placeholder="+94 77 123 4567"
                  className="w-full bg-black/40 border border-white/10 rounded-xl pl-10 pr-3 py-2.5 text-white text-xs font-semibold focus:border-[#FACC15] focus:outline-hidden"
                />
              </div>
            </div>

            {/* Password */}
            <div>
              <label className="block text-[10px] font-black uppercase tracking-wider text-gray-400 mb-1">
                Password (min 6 characters) *
              </label>
              <div className="relative">
                <Lock className="w-4 h-4 text-gray-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="password"
                  required
                  id="input-signup-password"
                  value={signUpPassword}
                  onChange={(e) => setSignUpPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full bg-black/40 border border-white/10 rounded-xl pl-10 pr-3 py-2.5 text-white text-xs font-semibold focus:border-[#FACC15] focus:outline-hidden"
                />
              </div>
            </div>

            {/* Confirm Password */}
            <div>
              <label className="block text-[10px] font-black uppercase tracking-wider text-gray-400 mb-1">
                Confirm Password *
              </label>
              <div className="relative">
                <Lock className="w-4 h-4 text-gray-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="password"
                  required
                  id="input-signup-confirmpassword"
                  value={signUpConfirmPassword}
                  onChange={(e) => setSignUpConfirmPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full bg-black/40 border border-white/10 rounded-xl pl-10 pr-3 py-2.5 text-white text-xs font-semibold focus:border-[#FACC15] focus:outline-hidden"
                />
              </div>
            </div>

            {/* Register Submit Button */}
            <button
              type="submit"
              id="btn-signup-submit"
              disabled={loading}
              className="w-full mt-2 py-3 px-5 rounded-full bg-[#FACC15] hover:bg-yellow-300 disabled:opacity-50 text-black text-xs font-black uppercase tracking-widest shadow-md shadow-[#FACC15]/20 transition-all flex items-center justify-center gap-2 active:scale-95"
            >
              <span>{loading ? 'Creating Your Gym Workspace...' : 'Create Gym Account'}</span>
              <ArrowRight className="w-4 h-4 stroke-[2.5]" />
            </button>

            {/* Switch to login */}
            <div className="mt-4 pt-4 border-t border-white/10 text-center">
              <p className="text-xs text-gray-400">
                Already registered?{' '}
                <button
                  type="button"
                  onClick={() => {
                    setAuthMode('login');
                    setError(null);
                    setSuccessMessage(null);
                  }}
                  className="text-[#FACC15] font-bold hover:underline"
                >
                  Sign In to Gym Account &rarr;
                </button>
              </p>
            </div>
          </form>
        )}

        {/* Security badge: MongoDB Atlas Multi-Tenant */}
        <div className="mt-6 flex items-center justify-center gap-2 text-[11px] text-gray-500 text-center">
          <ShieldCheck className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
          <span>PBKDF2 SHA-512 Secured • MongoDB Multi-Tenant Isolated</span>
        </div>
      </div>
    </div>
  );
};
