import React, { useState, useEffect, useRef } from 'react';
import {
  Settings,
  MessageSquare,
  Send,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  Save,
  Zap,
  Building,
  Users,
  Shield,
  Eye,
  EyeOff,
  HelpCircle,
  Globe,
  Radio,
  Upload,
  Image as ImageIcon,
  Sparkles,
  RefreshCw,
  DollarSign,
  MapPin,
  Phone,
  Mail,
  FileText,
  Dumbbell,
  Receipt,
  RotateCcw,
  UserCheck,
  UserCog,
  Lock,
} from 'lucide-react';
import { api } from '../lib/api.ts';
import { SmsLog } from '../types.ts';
import { useBusiness } from '../context/BusinessContext.tsx';

export const SettingsView: React.FC = () => {
  const { business, updateBusiness, loading: businessLoading } = useBusiness();
  const [activeTab, setActiveTab] = useState<'gym_profile' | 'admin_profile' | 'sms_gateway' | 'sms_logs' | 'staff'>('gym_profile');
  const [settingsMap, setSettingsMap] = useState<Record<string, string>>({});
  const [smsLogs, setSmsLogs] = useState<SmsLog[]>([]);
  const [staffList, setStaffList] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [showApiKey, setShowApiKey] = useState(false);

  // Business & Gym Profile Fields
  const [gymName, setGymName] = useState(business.gymName || 'ZENERGY FITNESS');
  const [logo, setLogo] = useState(business.logo || '');
  const [phone, setPhone] = useState(business.phone || '+94 77 111 2233');
  const [email, setEmail] = useState(business.email || 'contact@zenergyfitness.com');
  const [address, setAddress] = useState(business.address || 'No. 12 Beach Road, Colombo 03');
  const [currency, setCurrency] = useState(business.currency || 'Rs.');
  const [description, setDescription] = useState(business.description || '');
  const [receiptFooter, setReceiptFooter] = useState('Thank you for training with ZENERGY FITNESS! Goods sold are exchangeable within 7 days.');
  const [monthlyPrice, setMonthlyPrice] = useState(4500);
  const [threeMonthsPrice, setThreeMonthsPrice] = useState(12000);
  const [sixMonthsPrice, setSixMonthsPrice] = useState(22000);
  const [annualPrice, setAnnualPrice] = useState(38000);

  // Admin User Profile Fields (Strictly separate from Business in MongoDB Atlas)
  const [adminName, setAdminName] = useState('Titan');
  const [adminEmail, setAdminEmail] = useState('titan@zenergyfitness.com');
  const [adminAvatar, setAdminAvatar] = useState('');
  const [adminPassword, setAdminPassword] = useState('');
  const [adminUsername, setAdminUsername] = useState('titan');
  const [adminRole, setAdminRole] = useState('GYM_OWNER');
  const [savingAdmin, setSavingAdmin] = useState(false);
  const [adminSaveSuccess, setAdminSaveSuccess] = useState(false);

  // SMS Gateway Settings Fields
  const [smsActive, setSmsActive] = useState<boolean>(true);
  const [smsApiKey, setSmsApiKey] = useState<string>('');
  const [smsUserId, setSmsUserId] = useState<string>('');
  const [smsSenderId, setSmsSenderId] = useState<string>('TITANFIT');
  const [smsProviderName, setSmsProviderName] = useState<string>('SMSLEN Sri Lanka');
  const [smsApiUrl, setSmsApiUrl] = useState<string>('https://api.smslen.com/v1/send');
  const [smsApiMethod, setSmsApiMethod] = useState<'GET' | 'POST'>('POST');

  // Test SMS State
  const [testPhone, setTestPhone] = useState('');
  const [testMessage, setTestMessage] = useState('Test SMS from Gym POS Gateway. System online.');
  const [sendingTest, setSendingTest] = useState(false);
  const [testResult, setTestResult] = useState<any>(null);

  // New Staff Modal
  const [showStaffModal, setShowStaffModal] = useState(false);
  const [staffUsername, setStaffUsername] = useState('');
  const [staffPassword, setStaffPassword] = useState('staff123');
  const [staffName, setStaffName] = useState('');
  const [staffEmail, setStaffEmail] = useState('');
  const [staffRole, setStaffRole] = useState<'STAFF' | 'RECEPTION'>('RECEPTION');

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Sync with business context when it loads
  useEffect(() => {
    if (business.gymName) {
      setGymName(business.gymName);
      setLogo(business.logo || '');
      setPhone(business.phone || '');
      setEmail(business.email || '');
      setAddress(business.address || '');
      setCurrency(business.currency || 'Rs.');
      setDescription(business.description || '');
    }
  }, [business.gymName, business.logo, business.phone, business.email, business.address, business.currency, business.description]);

  useEffect(() => {
    loadSettings();
    loadSmsLogs();
    loadStaff();
    loadProfile();
  }, []);

  const loadProfile = async () => {
    try {
      const res = await api.getCurrentUser();
      const u = res?.user;
      if (u) {
        if (u.name) setAdminName(u.name);
        if (u.email) setAdminEmail(u.email);
        if (u.avatar) setAdminAvatar(u.avatar);
        if (u.username) setAdminUsername(u.username);
        if (u.role) setAdminRole(u.role);
      }
    } catch (err) {
      console.warn('Could not load current user profile:', err);
    }
  };

  const loadSettings = async () => {
    setLoading(true);
    try {
      const res = await api.getSettings();
      setSettingsMap(res);

      // Populate SMS Gateway state
      if (res.sms_active !== undefined) setSmsActive(res.sms_active === 'true');
      else if (res.sms_enabled !== undefined) setSmsActive(res.sms_enabled === 'true');

      if (res.sms_api_key) setSmsApiKey(res.sms_api_key);
      if (res.sms_user_id) setSmsUserId(res.sms_user_id);
      if (res.sms_sender_id) setSmsSenderId(res.sms_sender_id);
      if (res.sms_provider_name) setSmsProviderName(res.sms_provider_name);
      if (res.sms_api_url) setSmsApiUrl(res.sms_api_url);
      if (res.sms_api_method) setSmsApiMethod(res.sms_api_method as 'GET' | 'POST');

      // Populate Gym Profile
      if (res.gym_name) setGymName(res.gym_name);
      if (res.logo || res.gym_logo) setLogo(res.logo || res.gym_logo || '');
      if (res.phone) setPhone(res.phone);
      if (res.email) setEmail(res.email);
      if (res.address) setAddress(res.address);
      if (res.currency) setCurrency(res.currency);
      if (res.description) setDescription(res.description);
      if (res.receipt_footer) setReceiptFooter(res.receipt_footer);
      if (res.monthly_price) setMonthlyPrice(Number(res.monthly_price));
      if (res.three_months_price) setThreeMonthsPrice(Number(res.three_months_price));
      if (res.six_months_price) setSixMonthsPrice(Number(res.six_months_price));
      if (res.annual_price) setAnnualPrice(Number(res.annual_price));
    } catch (err) {
      console.error('Failed to load settings:', err);
    } finally {
      setLoading(false);
    }
  };

  const loadSmsLogs = async () => {
    try {
      const logs = await api.getSmsLogs();
      setSmsLogs(logs || []);
    } catch (err) {
      console.error('Failed to load SMS logs:', err);
    }
  };

  const loadStaff = async () => {
    try {
      const list = await api.getStaff();
      setStaffList(list || []);
    } catch (err) {
      console.error('Failed to load staff list:', err);
    }
  };

  const handleSaveAdminProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingAdmin(true);
    setAdminSaveSuccess(false);
    try {
      const res = await api.updateProfile({
        name: adminName.trim(),
        email: adminEmail.trim(),
        avatar: adminAvatar.trim(),
        password: adminPassword ? adminPassword : undefined,
      });
      if (res.success) {
        setAdminSaveSuccess(true);
        setTimeout(() => setAdminSaveSuccess(false), 4000);
      }
    } catch (err: any) {
      alert(err.message || 'Failed to update admin profile');
    } finally {
      setSavingAdmin(false);
    }
  };

  // Preset Templates for quick customer demo
  const PRESET_TEMPLATES = [
    {
      label: 'Customer 1: ZENERGY FITNESS',
      name: 'ZENERGY FITNESS',
      admin: 'Titan',
      currency: 'Rs.',
      phone: '+94 77 111 2233',
      address: 'No. 12 Beach Road, Colombo 03',
      email: 'contact@zenergyfitness.com',
      description: 'High-Energy Functional Fitness, Strength & Conditioning.',
      footer: 'Thank you for training with ZENERGY FITNESS! Goods sold are exchangeable within 7 days.',
    },
    {
      label: 'Customer 2: POWER FITNESS',
      name: 'POWER FITNESS',
      admin: 'Kasun',
      currency: 'Rs.',
      phone: '+94 81 222 3344',
      address: 'No. 88 Peradeniya Road, Kandy',
      email: 'hello@powerfitness.lk',
      description: 'Hardcore Bodybuilding, Free Weights & Powerlifting Center.',
      footer: 'Power Fitness Kandy. Push harder every single day.',
    },
    {
      label: 'Customer 3: ELITE GYM',
      name: 'ELITE GYM',
      admin: 'Nimal',
      currency: '$',
      phone: '+1 (555) 345-6789',
      address: '742 Broadway Ave, Suite 400, New York, NY 10003',
      email: 'admin@elitegymnyc.com',
      description: 'Executive Athletic Club, Recovery Saunas & VIP Personal Training.',
      footer: 'Elite Performance Club. Premium membership benefits apply.',
    },
  ];

  const handleApplyPreset = (preset: typeof PRESET_TEMPLATES[0]) => {
    setGymName(preset.name);
    setCurrency(preset.currency);
    setPhone(preset.phone);
    setAddress(preset.address);
    setEmail(preset.email);
    setDescription(preset.description);
    setReceiptFooter(preset.footer);
  };

  // Handle Logo image file upload
  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 2 * 1024 * 1024) {
      alert('Logo image should be under 2MB.');
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      const dataUrl = event.target?.result as string;
      if (dataUrl) {
        setLogo(dataUrl);
      }
    };
    reader.readAsDataURL(file);
  };

  // Save Settings & update Business Context
  const handleSaveConfiguration = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setSaving(true);
    setSaveSuccess(false);

    try {
      // 1. Update global business state and persist via context
      await updateBusiness({
        gymName: gymName.trim() || 'Gym Chamaa',
        logo: logo.trim(),
        phone: phone.trim(),
        address: address.trim(),
        email: email.trim(),
        currency: currency.trim() || 'Rs.',
        description: description.trim(),
      });

      // 2. Also persist all extended fields into settings table
      const payload: Record<string, string> = {
        ...settingsMap,
        sms_active: smsActive ? 'true' : 'false',
        sms_enabled: smsActive ? 'true' : 'false',
        sms_api_key: smsApiKey.trim(),
        sms_user_id: smsUserId.trim(),
        sms_sender_id: smsSenderId.trim().toUpperCase(),
        sms_provider_name: smsProviderName.trim(),
        sms_api_url: smsApiUrl.trim(),
        sms_api_method: smsApiMethod,
        // Gym profile
        gym_name: gymName.trim(),
        gym_logo: logo.trim(),
        logo: logo.trim(),
        phone: phone.trim(),
        email: email.trim(),
        address: address.trim(),
        currency: currency.trim(),
        description: description.trim(),
        receipt_footer: receiptFooter.trim(),
        monthly_price: String(monthlyPrice),
        three_months_price: String(threeMonthsPrice),
        six_months_price: String(sixMonthsPrice),
        annual_price: String(annualPrice),
      };

      await api.updateSettings(payload);
      setSettingsMap(payload);
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 4500);
    } catch (err: any) {
      alert(err.message || 'Failed to save configuration');
    } finally {
      setSaving(false);
    }
  };

  // Send Test SMS
  const handleSendTestSms = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!testPhone.trim() || !testMessage.trim()) {
      alert('Please provide recipient phone number and test message text.');
      return;
    }

    setSendingTest(true);
    setTestResult(null);

    try {
      const res = await api.sendTestSms(testPhone.trim(), testMessage.trim());
      setTestResult(res);
      loadSmsLogs();
    } catch (err: any) {
      setTestResult({
        success: false,
        error: err.message || 'Gateway communication failure',
      });
    } finally {
      setSendingTest(false);
    }
  };

  // Create Staff
  const handleCreateStaff = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await api.createStaff({
        username: staffUsername.trim(),
        password: staffPassword.trim(),
        name: staffName.trim(),
        email: staffEmail.trim(),
        role: staffRole,
      });
      setShowStaffModal(false);
      setStaffUsername('');
      setStaffName('');
      setStaffEmail('');
      loadStaff();
    } catch (err: any) {
      alert(err.message || 'Failed to create staff');
    }
  };

  const CURRENCY_PRESETS = [
    { symbol: 'Rs.', label: 'Sri Lanka (Rs.)' },
    { symbol: '$', label: 'USD ($)' },
    { symbol: '€', label: 'Euro (€)' },
    { symbol: '£', label: 'GBP (£)' },
    { symbol: 'AED', label: 'UAE (AED)' },
    { symbol: '₹', label: 'India (₹)' },
    { symbol: 'C$', label: 'CAD (C$)' },
    { symbol: 'A$', label: 'AUD (A$)' },
  ];

  return (
    <div className="space-y-6">
      {/* Top Header & Tab Navigation */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 bg-[#121212] border border-white/10 p-5 rounded-2xl">
        <div className="flex items-center gap-3.5">
          <div className="w-12 h-12 bg-[#FACC15]/10 border border-[#FACC15]/30 text-[#FACC15] rounded-xl flex items-center justify-center shrink-0">
            <Settings className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-black italic text-white uppercase tracking-wide">
                BUSINESS & SYSTEM SETTINGS
              </h1>
              <span className="px-2 py-0.5 rounded-full bg-[#FACC15]/15 border border-[#FACC15]/30 text-[10px] font-black text-[#FACC15] uppercase tracking-wider">
                White-Label Ready
              </span>
            </div>
            <p className="text-xs text-gray-400 mt-0.5">
              Configure your gym branding, logo, currency, membership pricing, and isolated SMS gateway.
            </p>
          </div>
        </div>

        {/* Tab Buttons */}
        <div className="flex items-center bg-black/60 border border-white/10 p-1.5 rounded-xl overflow-x-auto gap-1">
          <button
            onClick={() => setActiveTab('gym_profile')}
            className={`px-4 py-2 text-xs font-black uppercase tracking-wider rounded-lg transition-all flex items-center gap-2 shrink-0 ${
              activeTab === 'gym_profile'
                ? 'bg-[#FACC15] text-black shadow-lg shadow-[#FACC15]/20'
                : 'text-gray-400 hover:text-white'
            }`}
          >
            <Building className="w-4 h-4" />
            Business & Branding
          </button>
          <button
            onClick={() => setActiveTab('admin_profile')}
            className={`px-4 py-2 text-xs font-black uppercase tracking-wider rounded-lg transition-all flex items-center gap-2 shrink-0 ${
              activeTab === 'admin_profile'
                ? 'bg-[#FACC15] text-black shadow-lg shadow-[#FACC15]/20'
                : 'text-gray-400 hover:text-white'
            }`}
          >
            <UserCheck className="w-4 h-4" />
            Admin Profile
          </button>
          <button
            onClick={() => setActiveTab('sms_gateway')}
            className={`px-4 py-2 text-xs font-black uppercase tracking-wider rounded-lg transition-all flex items-center gap-2 shrink-0 ${
              activeTab === 'sms_gateway'
                ? 'bg-[#FACC15] text-black shadow-lg shadow-[#FACC15]/20'
                : 'text-gray-400 hover:text-white'
            }`}
          >
            <MessageSquare className="w-4 h-4" />
            SMS Gateway
          </button>
          <button
            onClick={() => setActiveTab('sms_logs')}
            className={`px-4 py-2 text-xs font-black uppercase tracking-wider rounded-lg transition-all flex items-center gap-2 shrink-0 ${
              activeTab === 'sms_logs'
                ? 'bg-[#FACC15] text-black shadow-lg shadow-[#FACC15]/20'
                : 'text-gray-400 hover:text-white'
            }`}
          >
            <Radio className="w-4 h-4" />
            SMS Logs ({smsLogs.length})
          </button>
          <button
            onClick={() => setActiveTab('staff')}
            className={`px-4 py-2 text-xs font-black uppercase tracking-wider rounded-lg transition-all flex items-center gap-2 shrink-0 ${
              activeTab === 'staff'
                ? 'bg-[#FACC15] text-black shadow-lg shadow-[#FACC15]/20'
                : 'text-gray-400 hover:text-white'
            }`}
          >
            <Users className="w-4 h-4" />
            Staff Accounts ({staffList.length})
          </button>
        </div>
      </div>

      {/* Save Notification Toast: Business */}
      {saveSuccess && (
        <div className="p-4 bg-emerald-950/90 border border-emerald-600/50 text-emerald-300 rounded-2xl flex items-center justify-between shadow-xl animate-fade-in">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-xl bg-emerald-500/20 flex items-center justify-center text-emerald-400">
              <CheckCircle2 className="w-5 h-5" />
            </div>
            <div>
              <p className="font-bold text-sm text-white">Business Settings Saved Successfully!</p>
              <p className="text-xs text-emerald-300/80">
                Gym name, logo, currency, and parameters updated in MongoDB Atlas and applied live across all views.
              </p>
            </div>
          </div>
          <span className="text-[10px] font-mono uppercase tracking-widest text-emerald-400 bg-emerald-900/50 px-2.5 py-1 rounded-full border border-emerald-700/50">
            MongoDB Atlas Synced
          </span>
        </div>
      )}

      {/* Save Notification Toast: Admin Profile */}
      {adminSaveSuccess && (
        <div className="p-4 bg-emerald-950/90 border border-emerald-600/50 text-emerald-300 rounded-2xl flex items-center justify-between shadow-xl animate-fade-in">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-xl bg-emerald-500/20 flex items-center justify-center text-emerald-400">
              <UserCheck className="w-5 h-5" />
            </div>
            <div>
              <p className="font-bold text-sm text-white">Admin Profile Saved Successfully!</p>
              <p className="text-xs text-emerald-300/80">
                Admin user name, email, avatar, and security credentials updated in MongoDB Atlas.
              </p>
            </div>
          </div>
          <span className="text-[10px] font-mono uppercase tracking-widest text-emerald-400 bg-emerald-900/50 px-2.5 py-1 rounded-full border border-emerald-700/50">
            User Document Updated
          </span>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 1: BUSINESS & GYM PROFILE (WHITE-LABEL CONFIGURATION) */}
      {/* ========================================================================= */}
      {activeTab === 'gym_profile' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Main Business Configuration Form (8 cols) */}
          <div className="lg:col-span-8 bg-[#121212] border border-white/10 rounded-3xl p-6 sm:p-8 space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b border-white/10 gap-3">
              <div>
                <h2 className="text-lg font-black italic text-white uppercase tracking-wide flex items-center gap-2">
                  <Building className="w-5 h-5 text-[#FACC15]" />
                  BUSINESS IDENTITY & WHITELABEL
                </h2>
                <p className="text-xs text-gray-400 mt-1">
                  Customize your gym name, logo, address, currency symbol, and official receipt footer.
                </p>
              </div>

              {/* Quick Preset Buttons */}
              <div className="flex items-center gap-1.5 flex-wrap">
                <span className="text-[10px] uppercase font-mono text-gray-400 font-bold mr-1">
                  Demos:
                </span>
                {PRESET_TEMPLATES.map((p) => (
                  <button
                    key={p.name}
                    type="button"
                    onClick={() => handleApplyPreset(p)}
                    className="px-2.5 py-1 rounded-lg bg-white/5 hover:bg-[#FACC15]/20 border border-white/10 hover:border-[#FACC15]/50 text-[11px] font-bold text-gray-300 hover:text-[#FACC15] transition-all"
                  >
                    {p.label}
                  </button>
                ))}
              </div>
            </div>

            <form onSubmit={handleSaveConfiguration} className="space-y-6">
              {/* Row 1: Business / Gym Name */}
              <div>
                <label className="text-xs font-black uppercase tracking-wider text-gray-300 block mb-1.5 flex items-center justify-between">
                  <span>Business / Gym Name *</span>
                  <span className="text-[10px] font-mono text-[#FACC15] lowercase">
                    replaces all hardcoded branding
                  </span>
                </label>
                <input
                  type="text"
                  required
                  value={gymName}
                  onChange={(e) => setGymName(e.target.value)}
                  placeholder="e.g. Iron Fitness, Power House Gym, Gym Chamaa"
                  className="w-full bg-black/60 border border-white/10 rounded-xl p-3 text-base font-bold text-white placeholder-gray-600 focus:border-[#FACC15] focus:outline-none transition-colors"
                />
              </div>

              {/* Row 2: Logo Configuration (URL + File Upload) */}
              <div>
                <label className="text-xs font-black uppercase tracking-wider text-gray-300 block mb-1.5">
                  Business Logo (Image URL or Upload)
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-12 gap-3 items-center">
                  <div className="sm:col-span-8 relative">
                    <input
                      type="text"
                      value={logo}
                      onChange={(e) => setLogo(e.target.value)}
                      placeholder="https://example.com/logo.png or upload image"
                      className="w-full bg-black/60 border border-white/10 rounded-xl p-3 text-xs text-white placeholder-gray-600 focus:border-[#FACC15] focus:outline-none transition-colors"
                    />
                  </div>
                  <div className="sm:col-span-4 flex items-center gap-2">
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/*"
                      onChange={handleLogoUpload}
                      className="hidden"
                    />
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      className="flex-1 py-3 px-3 bg-white/5 hover:bg-white/10 border border-white/10 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-colors"
                    >
                      <Upload className="w-3.5 h-3.5 text-[#FACC15]" />
                      <span>Upload</span>
                    </button>
                    {logo && (
                      <button
                        type="button"
                        onClick={() => setLogo('')}
                        title="Remove custom logo"
                        className="py-3 px-3 bg-red-500/10 hover:bg-red-500/20 border border-red-500/30 text-red-400 rounded-xl text-xs font-bold transition-colors"
                      >
                        <RotateCcw className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                </div>
              </div>

              {/* Row 3: Currency Symbol with Fast Presets */}
              <div>
                <label className="text-xs font-black uppercase tracking-wider text-gray-300 block mb-1.5">
                  Currency Symbol *
                </label>
                <div className="space-y-2.5">
                  <div className="flex items-center gap-2 flex-wrap">
                    {CURRENCY_PRESETS.map((curr) => (
                      <button
                        key={curr.symbol}
                        type="button"
                        onClick={() => setCurrency(curr.symbol)}
                        className={`px-3 py-1.5 rounded-lg text-xs font-black transition-all ${
                          currency === curr.symbol
                            ? 'bg-[#FACC15] text-black shadow-md shadow-[#FACC15]/20'
                            : 'bg-black/40 text-gray-400 hover:text-white border border-white/10'
                        }`}
                      >
                        {curr.label}
                      </button>
                    ))}
                  </div>
                  <input
                    type="text"
                    required
                    value={currency}
                    onChange={(e) => setCurrency(e.target.value)}
                    placeholder="Custom currency symbol (e.g. Rs., $, €, £)"
                    className="w-full sm:w-48 bg-black/60 border border-white/10 rounded-xl p-3 text-sm font-black text-[#FACC15] focus:border-[#FACC15] focus:outline-none"
                  />
                </div>
              </div>

              {/* Row 4: Contact Information (Phone, Email) */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-black uppercase tracking-wider text-gray-300 block mb-1.5 flex items-center gap-1.5">
                    <Phone className="w-3.5 h-3.5 text-[#FACC15]" /> Phone Number
                  </label>
                  <input
                    type="tel"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="+94 77 123 4567"
                    className="w-full bg-black/60 border border-white/10 rounded-xl p-3 text-sm text-white placeholder-gray-600 focus:border-[#FACC15] focus:outline-none"
                  />
                </div>

                <div>
                  <label className="text-xs font-black uppercase tracking-wider text-gray-300 block mb-1.5 flex items-center gap-1.5">
                    <Mail className="w-3.5 h-3.5 text-[#FACC15]" /> Official Email Address
                  </label>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="contact@gymchamaa.com"
                    className="w-full bg-black/60 border border-white/10 rounded-xl p-3 text-sm text-white placeholder-gray-600 focus:border-[#FACC15] focus:outline-none"
                  />
                </div>
              </div>

              {/* Row 5: Physical Address */}
              <div>
                <label className="text-xs font-black uppercase tracking-wider text-gray-300 block mb-1.5 flex items-center gap-1.5">
                  <MapPin className="w-3.5 h-3.5 text-[#FACC15]" /> Physical Location Address
                </label>
                <input
                  type="text"
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  placeholder="45 Galle Road, Colombo 03"
                  className="w-full bg-black/60 border border-white/10 rounded-xl p-3 text-sm text-white placeholder-gray-600 focus:border-[#FACC15] focus:outline-none"
                />
              </div>

              {/* Row 6: Business Description */}
              <div>
                <label className="text-xs font-black uppercase tracking-wider text-gray-300 block mb-1.5 flex items-center gap-1.5">
                  <FileText className="w-3.5 h-3.5 text-[#FACC15]" /> Business Tagline / Description
                </label>
                <textarea
                  rows={2}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Premier community strength, conditioning & bodybuilding center."
                  className="w-full bg-black/60 border border-white/10 rounded-xl p-3 text-xs text-white placeholder-gray-600 focus:border-[#FACC15] focus:outline-none"
                />
              </div>

              {/* Row 7: Receipt Footer Note */}
              <div>
                <label className="text-xs font-black uppercase tracking-wider text-gray-300 block mb-1.5 flex items-center gap-1.5">
                  <Receipt className="w-3.5 h-3.5 text-[#FACC15]" /> Printed Receipt Footer Message
                </label>
                <input
                  type="text"
                  value={receiptFooter}
                  onChange={(e) => setReceiptFooter(e.target.value)}
                  placeholder="Thank you for training with us! Exchange within 7 days."
                  className="w-full bg-black/60 border border-white/10 rounded-xl p-3 text-sm text-white placeholder-gray-600 focus:border-[#FACC15] focus:outline-none"
                />
              </div>

              {/* Standard Membership Package Pricing */}
              <div className="pt-6 border-t border-white/10">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-xs font-black text-[#FACC15] uppercase tracking-wider">
                    Standard Membership Package Rates ({currency})
                  </h3>
                  <span className="text-[10px] text-gray-500 font-mono">
                    Used during athlete registration & renewal
                  </span>
                </div>

                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  <div className="p-3 bg-black/40 border border-white/5 rounded-xl">
                    <label className="text-[10px] font-black uppercase tracking-wider text-gray-400 block mb-1">
                      1 Month
                    </label>
                    <div className="flex items-center gap-1">
                      <span className="text-xs font-bold text-gray-500">{currency}</span>
                      <input
                        type="number"
                        min="0"
                        value={monthlyPrice}
                        onChange={(e) => setMonthlyPrice(Number(e.target.value))}
                        className="w-full bg-transparent font-black text-white text-base focus:outline-none"
                      />
                    </div>
                  </div>

                  <div className="p-3 bg-black/40 border border-white/5 rounded-xl">
                    <label className="text-[10px] font-black uppercase tracking-wider text-gray-400 block mb-1">
                      3 Months
                    </label>
                    <div className="flex items-center gap-1">
                      <span className="text-xs font-bold text-gray-500">{currency}</span>
                      <input
                        type="number"
                        min="0"
                        value={threeMonthsPrice}
                        onChange={(e) => setThreeMonthsPrice(Number(e.target.value))}
                        className="w-full bg-transparent font-black text-white text-base focus:outline-none"
                      />
                    </div>
                  </div>

                  <div className="p-3 bg-black/40 border border-white/5 rounded-xl">
                    <label className="text-[10px] font-black uppercase tracking-wider text-gray-400 block mb-1">
                      6 Months
                    </label>
                    <div className="flex items-center gap-1">
                      <span className="text-xs font-bold text-gray-500">{currency}</span>
                      <input
                        type="number"
                        min="0"
                        value={sixMonthsPrice}
                        onChange={(e) => setSixMonthsPrice(Number(e.target.value))}
                        className="w-full bg-transparent font-black text-white text-base focus:outline-none"
                      />
                    </div>
                  </div>

                  <div className="p-3 bg-black/40 border border-white/5 rounded-xl">
                    <label className="text-[10px] font-black uppercase tracking-wider text-gray-400 block mb-1">
                      12 Months (Annual)
                    </label>
                    <div className="flex items-center gap-1">
                      <span className="text-xs font-bold text-gray-500">{currency}</span>
                      <input
                        type="number"
                        min="0"
                        value={annualPrice}
                        onChange={(e) => setAnnualPrice(Number(e.target.value))}
                        className="w-full bg-transparent font-black text-white text-base focus:outline-none"
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* Submit Save Button */}
              <div className="flex justify-end pt-4 border-t border-white/10">
                <button
                  type="submit"
                  disabled={saving}
                  className="bg-[#FACC15] hover:bg-yellow-400 text-black font-black px-8 py-3.5 rounded-xl text-xs uppercase tracking-wider transition-all shadow-xl shadow-[#FACC15]/20 active:scale-95 flex items-center gap-2 disabled:opacity-50"
                >
                  <Save className="w-4 h-4" />
                  {saving ? 'SAVING TO MONGODB...' : 'SAVE BUSINESS SETTINGS'}
                </button>
              </div>
            </form>
          </div>

          {/* Right Column: LIVE BRAND PREVIEW & ARCHITECTURE (4 cols) */}
          <div className="lg:col-span-4 space-y-5">
            {/* Live Brand Preview Card */}
            <div className="bg-[#121212] border border-white/10 rounded-3xl p-6 space-y-4 shadow-2xl">
              <div className="flex items-center justify-between pb-3 border-b border-white/10">
                <span className="text-[10px] font-black uppercase tracking-widest text-[#FACC15] flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5" /> Live Brand Preview
                </span>
                <span className="text-[10px] font-mono text-gray-500 uppercase">Real-time</span>
              </div>

              {/* Sidebar Header Emulation */}
              <div className="p-4 rounded-2xl bg-black border border-white/10 space-y-3">
                <span className="text-[9px] font-mono text-gray-500 uppercase block">Sidebar Badge Appearance:</span>
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-[#FACC15] text-black flex items-center justify-center font-black text-xl italic shadow-md overflow-hidden shrink-0">
                    {logo ? (
                      <img src={logo} alt="Gym Logo" className="w-full h-full object-cover" />
                    ) : (
                      gymName ? gymName.charAt(0).toUpperCase() : 'G'
                    )}
                  </div>
                  <div className="min-w-0">
                    <h3 className="font-black italic text-sm text-white uppercase tracking-wider truncate">
                      {gymName || 'Gym Name'}
                    </h3>
                    <p className="text-[9px] font-mono uppercase tracking-widest text-[#FACC15] font-black truncate">
                      POS & Athlete Management
                    </p>
                  </div>
                </div>
              </div>

              {/* Receipt Preview Emulation */}
              <div className="p-4 rounded-2xl bg-black border border-white/10 space-y-2 text-xs font-mono">
                <span className="text-[9px] font-mono text-gray-500 uppercase block">Thermal Receipt Header:</span>
                <div className="text-center py-2 border-b border-dashed border-white/20">
                  <p className="font-black text-white text-sm uppercase">{gymName || 'GYM NAME'}</p>
                  <p className="text-[10px] text-gray-400">{address}</p>
                  <p className="text-[10px] text-gray-400">{phone} • {email}</p>
                </div>
                <div className="py-2 text-[10px] space-y-1">
                  <div className="flex justify-between text-gray-400">
                    <span>1 Month Membership</span>
                    <span className="font-bold text-white">{currency} {monthlyPrice.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between font-bold text-[#FACC15] pt-1 border-t border-white/10">
                    <span>TOTAL PAID</span>
                    <span>{currency} {monthlyPrice.toLocaleString()}</span>
                  </div>
                </div>
                <div className="pt-2 text-center text-[9px] text-gray-500 border-t border-dashed border-white/20">
                  "{receiptFooter}"
                </div>
              </div>

              {/* Business Description */}
              {description && (
                <div className="p-3.5 bg-white/[0.02] border border-white/5 rounded-xl text-xs text-gray-400">
                  <span className="text-[9px] font-black uppercase tracking-wider text-gray-500 block mb-1">
                    Tagline:
                  </span>
                  "{description}"
                </div>
              )}
            </div>

            {/* Architecture Card */}
            <div className="p-5 bg-[#121212] border border-white/10 rounded-3xl space-y-3 text-xs text-gray-400">
              <div className="flex items-center gap-2 font-black text-white uppercase text-[11px] tracking-wider">
                <Shield className="w-4 h-4 text-[#FACC15]" />
                Multi-Tenant Architecture
              </div>
              <p className="leading-relaxed">
                Settings persist in MongoDB Atlas across server restarts, browser reloads, and Vercel deployments.
                Each gym tenant maintains its isolated data, branding, and POS register.
              </p>
              <div className="pt-2 border-t border-white/10 flex items-center justify-between text-[10px] font-mono text-gray-400">
                <span>Active Currency: <strong className="text-[#FACC15]">{currency}</strong></span>
                <span className="text-emerald-400">● MongoDB Atlas Online</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB: ADMIN USER PROFILE (SEPARATE FROM BUSINESS) */}
      {/* ========================================================================= */}
      {activeTab === 'admin_profile' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          <div className="lg:col-span-8 bg-[#121212] border border-white/10 rounded-3xl p-6 sm:p-8 space-y-6">
            <div className="pb-4 border-b border-white/10">
              <h2 className="text-lg font-black italic text-white uppercase tracking-wide flex items-center gap-2">
                <UserCog className="w-5 h-5 text-[#FACC15]" />
                ADMIN USER PROFILE
              </h2>
              <p className="text-xs text-gray-400 mt-1">
                Configure your administrator account details. The Admin profile is distinct and stored in a separate MongoDB collection from the Business/Gym profile.
              </p>
            </div>

            {/* Explanatory Banner */}
            <div className="p-4 rounded-2xl bg-black/50 border border-[#FACC15]/20 flex items-start gap-3">
              <Shield className="w-5 h-5 text-[#FACC15] shrink-0 mt-0.5" />
              <div className="text-xs text-gray-300 space-y-1">
                <p className="font-bold text-white">White-Label Separation Enforced:</p>
                <p>
                  • Software Brand: <strong className="text-[#FACC15]">WOW POS</strong> (Global SaaS Core)
                </p>
                <p>
                  • Business/Gym Name: <strong className="text-white">{gymName}</strong> (Customer Business Entity)
                </p>
                <p>
                  • Admin Display Name: <strong className="text-white">{adminName}</strong> (Authenticated User Account)
                </p>
              </div>
            </div>

            <form onSubmit={handleSaveAdminProfile} className="space-y-5">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-black uppercase tracking-wider text-gray-300 block mb-1.5">
                    Admin Display Name *
                  </label>
                  <input
                    type="text"
                    required
                    value={adminName}
                    onChange={(e) => setAdminName(e.target.value)}
                    placeholder="e.g. Titan, Kasun, Nimal"
                    className="w-full bg-black/60 border border-white/10 rounded-xl p-3 text-sm font-bold text-white placeholder-gray-600 focus:border-[#FACC15] focus:outline-hidden"
                  />
                </div>

                <div>
                  <label className="text-xs font-black uppercase tracking-wider text-gray-300 block mb-1.5">
                    Admin Email Address *
                  </label>
                  <input
                    type="email"
                    required
                    value={adminEmail}
                    onChange={(e) => setAdminEmail(e.target.value)}
                    placeholder="admin@zenergyfitness.com"
                    className="w-full bg-black/60 border border-white/10 rounded-xl p-3 text-sm font-bold text-white placeholder-gray-600 focus:border-[#FACC15] focus:outline-hidden"
                  />
                </div>
              </div>

              <div>
                <label className="text-xs font-black uppercase tracking-wider text-gray-300 block mb-1.5">
                  Profile Avatar URL
                </label>
                <input
                  type="text"
                  value={adminAvatar}
                  onChange={(e) => setAdminAvatar(e.target.value)}
                  placeholder="https://example.com/avatar.jpg"
                  className="w-full bg-black/60 border border-white/10 rounded-xl p-3 text-xs text-white placeholder-gray-600 focus:border-[#FACC15] focus:outline-hidden"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-black uppercase tracking-wider text-gray-300 block mb-1.5">
                    Login Username (Read-Only)
                  </label>
                  <input
                    type="text"
                    disabled
                    value={adminUsername}
                    className="w-full bg-black/30 border border-white/5 rounded-xl p-3 text-xs text-gray-500 font-mono cursor-not-allowed"
                  />
                </div>

                <div>
                  <label className="text-xs font-black uppercase tracking-wider text-gray-300 block mb-1.5">
                    Role (Permission Tier)
                  </label>
                  <input
                    type="text"
                    disabled
                    value={adminRole}
                    className="w-full bg-black/30 border border-white/5 rounded-xl p-3 text-xs text-[#FACC15] font-mono cursor-not-allowed font-bold"
                  />
                </div>
              </div>

              <div>
                <label className="text-xs font-black uppercase tracking-wider text-gray-300 block mb-1.5">
                  Update Password (Leave blank to keep unchanged)
                </label>
                <div className="relative">
                  <Lock className="w-4 h-4 text-gray-500 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="password"
                    value={adminPassword}
                    onChange={(e) => setAdminPassword(e.target.value)}
                    placeholder="Enter new password (optional)"
                    className="w-full bg-black/60 border border-white/10 rounded-xl pl-10 pr-3 py-3 text-xs text-white placeholder-gray-600 focus:border-[#FACC15] focus:outline-hidden"
                  />
                </div>
              </div>

              <div className="flex justify-end pt-4 border-t border-white/10">
                <button
                  type="submit"
                  disabled={savingAdmin}
                  className="bg-[#FACC15] hover:bg-yellow-300 disabled:opacity-50 text-black font-black px-8 py-3.5 rounded-xl text-xs uppercase tracking-wider transition-all shadow-xl shadow-[#FACC15]/20 flex items-center gap-2 active:scale-95"
                >
                  <Save className="w-4 h-4" />
                  <span>{savingAdmin ? 'Saving to MongoDB...' : 'Save Admin Profile'}</span>
                </button>
              </div>
            </form>
          </div>

          {/* Right Column: User Profile Preview */}
          <div className="lg:col-span-4 space-y-5">
            <div className="bg-[#121212] border border-white/10 rounded-3xl p-6 space-y-5 shadow-2xl text-center">
              <div className="w-20 h-20 rounded-3xl bg-[#FACC15] mx-auto flex items-center justify-center text-black font-black text-2xl shadow-lg shadow-[#FACC15]/20 overflow-hidden border-2 border-yellow-400">
                {adminAvatar ? (
                  <img src={adminAvatar} alt={adminName} className="w-full h-full object-cover" />
                ) : (
                  adminName.charAt(0).toUpperCase() || 'A'
                )}
              </div>

              <div>
                <h3 className="text-lg font-black italic text-white uppercase tracking-wider">
                  {adminName || 'Admin Name'}
                </h3>
                <p className="text-xs font-semibold text-[#FACC15] mt-0.5">{adminRole}</p>
                <p className="text-xs text-gray-400 mt-1">{adminEmail}</p>
              </div>

              <div className="p-4 rounded-2xl bg-black/60 border border-white/10 text-left space-y-2 text-xs">
                <div className="flex justify-between">
                  <span className="text-gray-400">Assigned Gym:</span>
                  <span className="font-bold text-white truncate max-w-[150px]">{gymName}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">Platform:</span>
                  <span className="font-bold text-[#FACC15]">WOW POS SaaS</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">Database:</span>
                  <span className="font-mono text-emerald-400">MongoDB Atlas</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 2: SMS GATEWAY CONFIGURATION */}
      {/* ========================================================================= */}
      {activeTab === 'sms_gateway' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Main SMS Gateway Configuration Form (8 cols) */}
          <div className="lg:col-span-8 bg-[#121212] border border-white/10 rounded-3xl p-6 sm:p-8 space-y-6 shadow-xl">
            {/* Header with Gateway & Status Display */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between pb-4 border-b border-white/10 gap-3">
              <div>
                <h2 className="text-lg font-black text-white tracking-wider flex items-center gap-2">
                  <MessageSquare className="w-5 h-5 text-[#FACC15]" />
                  SMS GATEWAY CONFIGURATION
                </h2>
                <p className="text-xs text-gray-400 mt-0.5">
                  Configure SMS notifications for member registrations, renewals, payments, and expiration alerts.
                </p>
              </div>

              {/* Status Indicator Badges */}
              <div className="flex items-center gap-3 bg-black/60 px-3.5 py-2 rounded-xl border border-white/10">
                <div className="text-right">
                  <div className="text-[10px] text-gray-500 uppercase font-bold">Gateway</div>
                  <div className="text-xs font-bold text-white">
                    {smsProviderName || 'Custom Provider'}
                  </div>
                </div>
                <div className="h-6 w-[1px] bg-white/10" />
                <div className="text-right">
                  <div className="text-[10px] text-gray-500 uppercase font-bold">Status</div>
                  <div
                    className={`text-xs font-black uppercase ${
                      smsActive ? 'text-emerald-400' : 'text-gray-500'
                    }`}
                  >
                    {smsActive ? 'Active' : 'Inactive'}
                  </div>
                </div>
              </div>
            </div>

            <form onSubmit={handleSaveConfiguration} className="space-y-5">
              {/* Active Toggle [ ON / OFF ] */}
              <div className="flex items-center justify-between p-4 bg-black/60 border border-white/10 rounded-2xl">
                <div>
                  <label className="text-sm font-black text-white block uppercase">Active Gateway</label>
                  <p className="text-xs text-gray-400">
                    Enable or disable automatic SMS dispatch for this gym tenant.
                  </p>
                </div>

                <button
                  type="button"
                  onClick={() => setSmsActive(!smsActive)}
                  className={`relative inline-flex h-7 w-14 items-center rounded-full transition-colors focus:outline-none ${
                    smsActive ? 'bg-[#FACC15]' : 'bg-gray-800'
                  }`}
                >
                  <span
                    className={`inline-block h-5 w-5 transform rounded-full bg-black transition-transform ${
                      smsActive ? 'translate-x-8' : 'translate-x-1'
                    }`}
                  />
                </button>
              </div>

              {/* API Credentials Section */}
              <div className="space-y-4 pt-2">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Provider Name */}
                  <div>
                    <label className="text-xs font-black uppercase tracking-wider text-gray-300 block mb-1">
                      Provider Name
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. SMSLEN, Twilio, Dialog"
                      value={smsProviderName}
                      onChange={(e) => setSmsProviderName(e.target.value)}
                      className="w-full bg-black/60 border border-white/10 rounded-xl p-3 text-sm text-white placeholder-gray-600 focus:border-[#FACC15] focus:outline-none"
                    />
                  </div>

                  {/* Sender ID */}
                  <div>
                    <label className="text-xs font-black uppercase tracking-wider text-gray-300 block mb-1">
                      Sender ID (Mask)
                    </label>
                    <input
                      type="text"
                      maxLength={11}
                      placeholder="e.g. TITANFIT, CHAMAAGYM"
                      value={smsSenderId}
                      onChange={(e) => setSmsSenderId(e.target.value)}
                      className="w-full bg-black/60 border border-white/10 rounded-xl p-3 text-sm text-white uppercase font-mono placeholder-gray-600 focus:border-[#FACC15] focus:outline-none"
                    />
                  </div>
                </div>

                {/* API Key */}
                <div>
                  <label className="text-xs font-black uppercase tracking-wider text-gray-300 block mb-1">
                    API Key / Auth Token
                  </label>
                  <div className="relative">
                    <input
                      type={showApiKey ? 'text' : 'password'}
                      placeholder="Enter SMS gateway secret key"
                      value={smsApiKey}
                      onChange={(e) => setSmsApiKey(e.target.value)}
                      className="w-full bg-black/60 border border-white/10 rounded-xl p-3 text-sm text-white font-mono placeholder-gray-600 pr-10 focus:border-[#FACC15] focus:outline-none"
                    />
                    <button
                      type="button"
                      onClick={() => setShowApiKey(!showApiKey)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-white"
                    >
                      {showApiKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {/* User ID / Account SID */}
                  <div className="md:col-span-2">
                    <label className="text-xs font-black uppercase tracking-wider text-gray-300 block mb-1">
                      User ID / Account Identifier
                    </label>
                    <input
                      type="text"
                      placeholder="Optional User ID or Account SID"
                      value={smsUserId}
                      onChange={(e) => setSmsUserId(e.target.value)}
                      className="w-full bg-black/60 border border-white/10 rounded-xl p-3 text-sm text-white font-mono placeholder-gray-600 focus:border-[#FACC15] focus:outline-none"
                    />
                  </div>

                  {/* HTTP Method */}
                  <div>
                    <label className="text-xs font-black uppercase tracking-wider text-gray-300 block mb-1">
                      HTTP Method
                    </label>
                    <select
                      value={smsApiMethod}
                      onChange={(e) => setSmsApiMethod(e.target.value as 'GET' | 'POST')}
                      className="w-full bg-black/60 border border-white/10 rounded-xl p-3 text-sm text-white font-mono focus:border-[#FACC15] focus:outline-none"
                    >
                      <option value="POST">POST (JSON/Body)</option>
                      <option value="GET">GET (Query String)</option>
                    </select>
                  </div>
                </div>

                {/* API Gateway URL */}
                <div>
                  <label className="text-xs font-black uppercase tracking-wider text-gray-300 block mb-1">
                    API Endpoint URL
                  </label>
                  <input
                    type="url"
                    placeholder="https://api.smslen.com/v1/send"
                    value={smsApiUrl}
                    onChange={(e) => setSmsApiUrl(e.target.value)}
                    className="w-full bg-black/60 border border-white/10 rounded-xl p-3 text-sm text-white font-mono placeholder-gray-600 focus:border-[#FACC15] focus:outline-none"
                  />
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center justify-end pt-4 border-t border-white/10">
                <button
                  type="submit"
                  disabled={saving}
                  className="bg-[#FACC15] hover:bg-yellow-400 text-black font-black px-8 py-3 rounded-xl text-xs uppercase tracking-wider transition-all shadow-lg shadow-[#FACC15]/20 active:scale-95 flex items-center gap-2"
                >
                  <Save className="w-4 h-4" />
                  {saving ? 'Saving...' : 'SAVE GATEWAY CONFIGURATION'}
                </button>
              </div>
            </form>
          </div>

          {/* Right Column: SEND TEST SMS Panel (4 cols) */}
          <div className="lg:col-span-4 space-y-4">
            <div className="bg-[#121212] border border-white/10 rounded-3xl p-6 space-y-4 shadow-xl">
              <div className="flex items-center gap-2 pb-3 border-b border-white/10">
                <Send className="w-4 h-4 text-[#FACC15]" />
                <h3 className="text-xs font-black text-white uppercase tracking-wider">
                  SEND TEST SMS
                </h3>
              </div>

              <p className="text-xs text-gray-400">
                Verify your gateway connection and credentials by dispatching a live test message.
              </p>

              <form onSubmit={handleSendTestSms} className="space-y-3">
                <div>
                  <label className="text-xs font-semibold text-gray-300 block mb-1">
                    Phone Number *
                  </label>
                  <input
                    type="tel"
                    required
                    placeholder="+94 77 123 4567"
                    value={testPhone}
                    onChange={(e) => setTestPhone(e.target.value)}
                    className="w-full bg-black/60 border border-white/10 rounded-xl p-3 text-sm text-white placeholder-gray-600 focus:border-[#FACC15] focus:outline-none"
                  />
                </div>

                <div>
                  <label className="text-xs font-semibold text-gray-300 block mb-1">
                    Test Message
                  </label>
                  <textarea
                    rows={3}
                    required
                    value={testMessage}
                    onChange={(e) => setTestMessage(e.target.value)}
                    className="w-full bg-black/60 border border-white/10 rounded-xl p-3 text-xs text-white focus:border-[#FACC15] focus:outline-none"
                  />
                </div>

                <button
                  type="submit"
                  disabled={sendingTest || !smsActive}
                  className={`w-full py-3 rounded-xl font-black text-xs uppercase tracking-wider transition-all flex items-center justify-center gap-2 ${
                    !smsActive
                      ? 'bg-gray-800 text-gray-500 cursor-not-allowed'
                      : 'bg-[#FACC15] hover:bg-yellow-400 text-black shadow-md shadow-[#FACC15]/20 active:scale-95'
                  }`}
                >
                  <Send className="w-3.5 h-3.5" />
                  {sendingTest ? 'Sending Test SMS...' : 'SEND TEST SMS'}
                </button>
              </form>

              {/* Test Result Display */}
              {testResult && (
                <div
                  className={`p-3.5 rounded-xl border text-xs space-y-1.5 ${
                    testResult.success
                      ? 'bg-emerald-950/60 border-emerald-800 text-emerald-300'
                      : 'bg-red-950/60 border-red-800 text-red-300'
                  }`}
                >
                  <div className="font-bold flex items-center gap-1.5">
                    {testResult.success ? (
                      <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                    ) : (
                      <AlertTriangle className="w-4 h-4 text-red-400" />
                    )}
                    {testResult.success ? 'Test SMS Delivered' : 'Delivery Failed'}
                  </div>
                  {testResult.apiResponse && (
                    <div className="font-mono text-[10px] text-gray-300 bg-black/40 p-1.5 rounded overflow-x-auto">
                      {testResult.apiResponse}
                    </div>
                  )}
                  {testResult.error && <div>{testResult.error}</div>}
                </div>
              )}
            </div>

            {/* Tenant Security Notice Box */}
            <div className="p-5 bg-black/60 border border-white/10 rounded-3xl space-y-2 text-xs text-gray-400">
              <div className="flex items-center gap-1.5 font-bold text-white">
                <Shield className="w-4 h-4 text-[#FACC15]" />
                Isolated Gym Credentials
              </div>
              <p>
                Each gym tenant maintains its own separate gateway credentials. API keys are
                never shared across gyms and execute strictly server-side.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 3: SMS DELIVERY LOGS */}
      {/* ========================================================================= */}
      {activeTab === 'sms_logs' && (
        <div className="bg-[#121212] border border-white/10 rounded-3xl overflow-hidden">
          <div className="p-5 border-b border-white/10 flex items-center justify-between">
            <div>
              <h2 className="text-base font-black text-white uppercase tracking-wider">
                SMS Delivery Audit Logs
              </h2>
              <p className="text-xs text-gray-400">
                Recent notifications dispatched to gym athletes and staff.
              </p>
            </div>
            <button
              onClick={loadSmsLogs}
              className="p-2 rounded-xl bg-white/5 hover:bg-white/10 text-gray-400 hover:text-white transition-colors"
            >
              <RefreshCw className="w-4 h-4" />
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm text-gray-300">
              <thead className="bg-black/40 text-[10px] font-black text-gray-400 uppercase tracking-widest border-b border-white/10">
                <tr>
                  <th className="p-4">Sent At</th>
                  <th className="p-4">Recipient</th>
                  <th className="p-4">Type</th>
                  <th className="p-4">Message Content</th>
                  <th className="p-4">Status</th>
                  <th className="p-4">API Response</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {smsLogs.map((log) => (
                  <tr key={log.id} className="hover:bg-white/[0.02] transition-colors">
                    <td className="p-4 text-xs text-gray-400 whitespace-nowrap">
                      {log.sentAt ? new Date(log.sentAt).toLocaleString() : 'Just now'}
                    </td>
                    <td className="p-4 font-mono text-xs text-white">
                      {log.phone}
                    </td>
                    <td className="p-4 text-xs font-bold text-[#FACC15] uppercase">
                      {log.messageType}
                    </td>
                    <td className="p-4 text-xs text-gray-300 max-w-sm truncate">
                      {log.message}
                    </td>
                    <td className="p-4">
                      <span
                        className={`px-2.5 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider ${
                          log.status === 'sent'
                            ? 'bg-emerald-950 text-emerald-400 border border-emerald-800/50'
                            : 'bg-red-950 text-red-400 border border-red-800/50'
                        }`}
                      >
                        {log.status}
                      </span>
                    </td>
                    <td className="p-4 text-[11px] font-mono text-gray-400 max-w-xs truncate">
                      {log.errorMessage || log.apiResponse || 'OK'}
                    </td>
                  </tr>
                ))}

                {smsLogs.length === 0 && (
                  <tr>
                    <td colSpan={6} className="p-12 text-center text-gray-500 text-xs uppercase font-mono">
                      No SMS logs recorded yet.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 4: STAFF ACCOUNTS */}
      {/* ========================================================================= */}
      {activeTab === 'staff' && (
        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <div>
              <h2 className="text-base font-black text-white uppercase tracking-wider">
                Staff & Reception Logins
              </h2>
              <p className="text-xs text-gray-400">
                Create dedicated logins for your front desk reception and gym floor staff.
              </p>
            </div>

            <button
              onClick={() => setShowStaffModal(true)}
              className="bg-[#FACC15] hover:bg-yellow-400 text-black font-black px-5 py-2.5 rounded-xl text-xs uppercase tracking-wider flex items-center gap-2 transition-colors shadow-lg shadow-[#FACC15]/20"
            >
              <Users className="w-3.5 h-3.5" /> Add Staff Account
            </button>
          </div>

          <div className="bg-[#121212] border border-white/10 rounded-3xl overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm text-gray-300">
                <thead className="bg-black/40 text-[10px] font-black text-gray-400 uppercase tracking-widest border-b border-white/10">
                  <tr>
                    <th className="p-4">Name</th>
                    <th className="p-4">Username</th>
                    <th className="p-4">Role</th>
                    <th className="p-4">Email</th>
                    <th className="p-4">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {staffList.map((s) => (
                    <tr key={s.id} className="hover:bg-white/[0.02] transition-colors">
                      <td className="p-4 font-bold text-white">{s.name}</td>
                      <td className="p-4 font-mono text-xs text-[#FACC15]">{s.username}</td>
                      <td className="p-4">
                        <span className="px-2.5 py-0.5 rounded-full text-[9px] font-black uppercase bg-[#FACC15]/10 text-[#FACC15] border border-[#FACC15]/30">
                          {s.role}
                        </span>
                      </td>
                      <td className="p-4 text-xs text-gray-400">{s.email}</td>
                      <td className="p-4">
                        <span className="px-2.5 py-0.5 rounded-full text-[9px] font-black uppercase bg-emerald-950 text-emerald-400 border border-emerald-800/50">
                          {s.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Staff Modal */}
      {showStaffModal && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-[#121212] border border-white/10 rounded-3xl w-full max-w-md p-6 space-y-4 shadow-2xl">
            <h3 className="text-lg font-black text-white uppercase tracking-wider">Create Staff Account</h3>

            <form onSubmit={handleCreateStaff} className="space-y-3.5">
              <div>
                <label className="text-xs font-bold uppercase tracking-wider text-gray-400 block mb-1">Full Name</label>
                <input
                  type="text"
                  required
                  value={staffName}
                  onChange={(e) => setStaffName(e.target.value)}
                  className="w-full bg-black/60 border border-white/10 rounded-xl p-2.5 text-sm text-white focus:border-[#FACC15] focus:outline-none"
                />
              </div>

              <div>
                <label className="text-xs font-bold uppercase tracking-wider text-gray-400 block mb-1">Username</label>
                <input
                  type="text"
                  required
                  value={staffUsername}
                  onChange={(e) => setStaffUsername(e.target.value)}
                  className="w-full bg-black/60 border border-white/10 rounded-xl p-2.5 text-sm text-white font-mono focus:border-[#FACC15] focus:outline-none"
                />
              </div>

              <div>
                <label className="text-xs font-bold uppercase tracking-wider text-gray-400 block mb-1">Password</label>
                <input
                  type="password"
                  required
                  value={staffPassword}
                  onChange={(e) => setStaffPassword(e.target.value)}
                  className="w-full bg-black/60 border border-white/10 rounded-xl p-2.5 text-sm text-white focus:border-[#FACC15] focus:outline-none"
                />
              </div>

              <div>
                <label className="text-xs font-bold uppercase tracking-wider text-gray-400 block mb-1">Email</label>
                <input
                  type="email"
                  required
                  value={staffEmail}
                  onChange={(e) => setStaffEmail(e.target.value)}
                  className="w-full bg-black/60 border border-white/10 rounded-xl p-2.5 text-sm text-white focus:border-[#FACC15] focus:outline-none"
                />
              </div>

              <div>
                <label className="text-xs font-bold uppercase tracking-wider text-gray-400 block mb-1">Role</label>
                <select
                  value={staffRole}
                  onChange={(e) => setStaffRole(e.target.value as any)}
                  className="w-full bg-black/60 border border-white/10 rounded-xl p-2.5 text-sm text-white focus:border-[#FACC15] focus:outline-none"
                >
                  <option value="RECEPTION">RECEPTION (Check-ins & Sales)</option>
                  <option value="STAFF">STAFF (Floor Operations & Inventory)</option>
                </select>
              </div>

              <div className="pt-4 border-t border-white/10 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowStaffModal(false)}
                  className="px-4 py-2 text-xs font-bold uppercase text-gray-400 hover:text-white"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="bg-[#FACC15] hover:bg-yellow-400 text-black font-black px-5 py-2.5 text-xs uppercase tracking-wider rounded-xl shadow-md shadow-[#FACC15]/20"
                >
                  Create Account
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
