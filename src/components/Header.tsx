import React, { useEffect, useState } from 'react';
import {
  Menu,
  Volume2,
  VolumeX,
  QrCode,
  UserPlus,
  Clock,
  CircleUser,
} from 'lucide-react';
import { isVoiceEnabled, setVoiceEnabled } from '../lib/voice.ts';
import { UserSession } from '../types.ts';

interface HeaderProps {
  onOpenMobileMenu: () => void;
  onOpenAddMember: () => void;
  onGoToScanner: () => void;
  user: UserSession | null;
  sectionTitle: string;
}

export const Header: React.FC<HeaderProps> = ({
  onOpenMobileMenu,
  onOpenAddMember,
  onGoToScanner,
  user,
  sectionTitle,
}) => {
  const [voiceOn, setVoiceOn] = useState(true);
  const [colomboTime, setColomboTime] = useState('');

  useEffect(() => {
    setVoiceOn(isVoiceEnabled());

    const updateTime = () => {
      const formatter = new Intl.DateTimeFormat('en-US', {
        timeZone: 'Asia/Colombo',
        weekday: 'short',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hour12: true,
      });
      setColomboTime(formatter.format(new Date()));
    };

    updateTime();
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, []);

  const toggleVoice = () => {
    const next = !voiceOn;
    setVoiceOn(next);
    setVoiceEnabled(next);
  };

  return (
    <header
      id="app-header"
      className="sticky top-0 z-30 h-20 bg-[#050505]/95 backdrop-blur-md border-b border-[#222] px-6 flex items-center justify-between"
    >
      {/* Left: Mobile Toggle & Page Title */}
      <div className="flex items-center gap-3">
        <button
          id="btn-mobile-sidebar-toggle"
          onClick={onOpenMobileMenu}
          className="p-2 -ml-2 rounded-xl text-gray-400 hover:text-white hover:bg-white/5 lg:hidden"
          aria-label="Toggle Navigation"
        >
          <Menu className="w-6 h-6" />
        </button>

        <div>
          <h1 className="text-xl sm:text-2xl lg:text-3xl font-black italic tracking-tighter uppercase text-white flex items-center gap-2">
            {sectionTitle}
          </h1>
        </div>
      </div>

      {/* Right Actions */}
      <div className="flex items-center gap-2 sm:gap-3">
        {/* Live Colombo Time Clock */}
        <div className="hidden md:flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-[#121212] border border-white/5 text-xs font-medium text-gray-400">
          <Clock className="w-3.5 h-3.5 text-[#FACC15]" />
          <span className="font-mono">{colomboTime || 'Asia/Colombo'}</span>
        </div>

        {/* Voice Toggle */}
        <button
          id="btn-voice-toggle"
          onClick={toggleVoice}
          title={voiceOn ? 'Reception Voice Sound Active (Click to mute)' : 'Reception Voice Muted (Click to enable)'}
          className={`p-2.5 rounded-xl border transition-colors ${
            voiceOn
              ? 'bg-[#FACC15]/10 border-[#FACC15]/30 text-[#FACC15] hover:bg-[#FACC15]/20'
              : 'bg-[#121212] border-white/5 text-gray-500 hover:text-gray-300'
          }`}
        >
          {voiceOn ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
        </button>

        {/* Quick Scanner Shortcut */}
        <button
          id="btn-header-quick-scan"
          onClick={onGoToScanner}
          className="hidden sm:flex items-center gap-2 px-4 py-2.5 rounded-full bg-[#121212] hover:bg-[#181818] border border-white/10 text-gray-300 text-xs font-bold tracking-wider uppercase transition-all"
        >
          <QrCode className="w-4 h-4 text-[#FACC15]" />
          <span>Scanner</span>
        </button>

        {/* Quick Add Member Action */}
        <button
          id="btn-header-quick-add-member"
          onClick={onOpenAddMember}
          className="px-5 sm:px-6 py-2.5 sm:py-3 bg-[#FACC15] text-black font-black uppercase text-xs tracking-widest rounded-full shadow-lg shadow-[#FACC15]/20 hover:scale-[1.02] active:scale-[0.98] transition-all flex items-center gap-2"
        >
          <UserPlus className="w-4 h-4 stroke-[2.5]" />
          <span>+ Add New Member</span>
        </button>

        {/* Staff User Avatar */}
        <div className="pl-2 border-l border-[#222] flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-full bg-[#121212] border border-[#FACC15]/40 flex items-center justify-center text-[#FACC15] font-bold text-xs">
            <CircleUser className="w-5 h-5" />
          </div>
          <div className="hidden xl:block text-left">
            <p className="text-xs font-bold text-white leading-tight truncate max-w-[140px]">{user?.name || 'Administrator'}</p>
            <p className="text-[10px] text-[#FACC15] font-black uppercase tracking-wider truncate max-w-[140px]">
              {user?.role === 'SUPER_ADMIN' ? 'Super Admin' : (user?.gymName || 'Gym Owner')}
            </p>
          </div>
        </div>
      </div>
    </header>
  );
};
