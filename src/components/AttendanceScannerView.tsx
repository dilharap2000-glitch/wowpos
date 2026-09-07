import React, { useState, useRef, useEffect } from 'react';
import {
  QrCode,
  ScanLine,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  Clock,
  Volume2,
  VolumeX,
  Sparkles,
  Zap,
  RotateCcw,
  User,
  Calendar,
  AlertOctagon,
} from 'lucide-react';
import { api } from '../lib/api.ts';
import { speakMessage, isVoiceEnabled, setVoiceEnabled } from '../lib/voice.ts';
import { Attendance } from '../types.ts';

interface AttendanceScannerViewProps {
  onScanSuccess?: () => void;
}

interface ScanResponse {
  status: 'success' | 'already_checked_in' | 'expired' | 'inactive' | 'invalid_barcode' | 'error';
  title: string;
  message: string;
  memberNumber?: string;
  memberName?: string;
  package?: string;
  expiryDate?: string;
  checkInTime?: string;
  originalTime?: string;
  voiceMessage?: string;
  color: 'green' | 'orange' | 'red' | 'gray';
}

export const AttendanceScannerView: React.FC<AttendanceScannerViewProps> = ({
  onScanSuccess,
}) => {
  const [barcodeInput, setBarcodeInput] = useState('');
  const [scanning, setScanning] = useState(false);
  const [lastResult, setLastResult] = useState<ScanResponse | null>(null);
  const [recentScans, setRecentScans] = useState<Attendance[]>([]);
  const [voiceOn, setVoiceOn] = useState(true);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setVoiceOn(isVoiceEnabled());
    // Auto-focus barcode input for instant handheld scanner operation
    inputRef.current?.focus();
    loadTodayAttendance();
  }, []);

  const loadTodayAttendance = async () => {
    try {
      const data = await api.getDashboard();
      if (data.todayCheckInsList) {
        setRecentScans(data.todayCheckInsList);
      }
    } catch (err) {
      console.error('Failed to load today attendance:', err);
    }
  };

  const handleScanSubmit = async (codeToScan?: string) => {
    const code = (codeToScan || barcodeInput).trim();
    if (!code) return;

    setScanning(true);
    try {
      const res: ScanResponse = await api.scanAttendance(code);
      setLastResult(res);
      setBarcodeInput('');

      // Voice announcements
      if (res.status === 'success') {
        speakMessage(res.voiceMessage || `Welcome ${res.memberName || ''}. Enjoy your workout today.`);
      } else if (res.status === 'already_checked_in') {
        speakMessage('You have already checked in today.');
      } else if (res.status === 'expired') {
        speakMessage('Membership expired. Please renew your membership.');
      } else if (res.status === 'inactive') {
        speakMessage('Member inactive. Please contact gym staff.');
      } else {
        speakMessage('Invalid barcode.');
      }

      // Refresh list
      loadTodayAttendance();
      if (onScanSuccess) onScanSuccess();
    } catch (err: any) {
      setLastResult({
        status: 'error',
        title: 'SCAN ERROR',
        message: err.message || 'Error processing barcode',
        color: 'red',
      });
      speakMessage('Scan error.');
    } finally {
      setScanning(false);
      // Re-focus scanner input for rapid continuous scanning
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  };

  const onKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleScanSubmit();
    }
  };

  const toggleVoice = () => {
    const next = !voiceOn;
    setVoiceOn(next);
    setVoiceEnabled(next);
  };

  return (
    <div id="attendance-scanner-view" className="space-y-6 max-w-5xl mx-auto">
      {/* Scanner Control Deck */}
      <div className="bg-[#121212] border border-white/5 rounded-3xl p-6 sm:p-8 shadow-2xl relative overflow-hidden">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-white/5">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-[#FACC15] flex items-center justify-center text-black shadow-lg shadow-[#FACC15]/20">
              <QrCode className="w-7 h-7 stroke-[2.5]" />
            </div>
            <div>
              <h2 className="text-xl font-black text-white uppercase tracking-wider flex items-center gap-2">
                Reception Barcode Scanner
                <span className="px-2 py-0.5 rounded-md bg-green-500/20 text-green-400 text-[10px] font-black border border-green-500/30">
                  ONLINE
                </span>
              </h2>
              <p className="text-xs text-gray-500">
                Plug-and-play USB scanner ready. Type or scan barcode.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={toggleVoice}
              className={`flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-bold border transition-colors ${
                voiceOn
                  ? 'bg-[#FACC15]/10 border-[#FACC15]/30 text-[#FACC15]'
                  : 'bg-white/5 border-white/10 text-gray-500 hover:text-gray-300'
              }`}
            >
              {voiceOn ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
              <span>{voiceOn ? 'Voice Audio ON' : 'Voice Audio OFF'}</span>
            </button>
          </div>
        </div>

        {/* Big Interactive Input Box */}
        <div className="mt-6">
          <label
            htmlFor="barcode-scan-input"
            className="block text-xs font-black uppercase tracking-[0.2em] text-[#FACC15] mb-2"
          >
            Scan Barcode or Enter Member Number (Press Enter)
          </label>
          <div className="relative">
            <div className="absolute left-4 top-1/2 -translate-y-1/2 text-[#FACC15] pointer-events-none">
              <ScanLine className="w-6 h-6 animate-pulse" />
            </div>
            <input
              id="barcode-scan-input"
              ref={inputRef}
              type="text"
              value={barcodeInput}
              onChange={(e) => setBarcodeInput(e.target.value)}
              onKeyDown={onKeyDown}
              disabled={scanning}
              placeholder="READY TO SCAN... (e.g. GYM001)"
              className="w-full bg-black/40 border-2 border-[#FACC15]/60 focus:border-[#FACC15] text-white placeholder-gray-600 text-lg sm:text-2xl font-mono font-black rounded-2xl pl-14 pr-36 py-4 focus:outline-hidden focus:ring-4 focus:ring-[#FACC15]/20 transition-all shadow-inner"
              autoComplete="off"
            />
            <button
              id="btn-scan-trigger"
              onClick={() => handleScanSubmit()}
              disabled={scanning || !barcodeInput.trim()}
              className="absolute right-3 top-1/2 -translate-y-1/2 px-6 py-2.5 rounded-xl bg-[#FACC15] hover:bg-yellow-300 disabled:opacity-40 disabled:hover:bg-[#FACC15] text-black text-xs font-black uppercase tracking-widest shadow-md transition-all active:scale-[0.98]"
            >
              {scanning ? 'Scanning...' : 'Check In'}
            </button>
          </div>
        </div>

        {/* Rapid Test Buttons for Staff Simulation */}
        <div className="mt-5 pt-4 border-t border-white/5 flex flex-wrap items-center gap-2">
          <span className="text-xs font-bold text-gray-500 uppercase tracking-wider flex items-center gap-1">
            <Zap className="w-3.5 h-3.5 text-[#FACC15]" />
            Quick Barcodes:
          </span>
          {[
            { code: 'GYM001', label: 'GYM001 (Active)', color: 'border-green-500/40 text-green-400 bg-green-500/10' },
            { code: 'GYM003', label: 'GYM003 (Due Today)', color: 'border-orange-500/40 text-orange-400 bg-orange-500/10' },
            { code: 'GYM004', label: 'GYM004 (Expired)', color: 'border-red-500/40 text-red-400 bg-red-500/10' },
            { code: 'GYM005', label: 'GYM005 (Inactive)', color: 'border-white/10 text-gray-400 bg-white/5' },
            { code: 'GYM006', label: 'GYM006 (Due Tomorrow)', color: 'border-amber-500/40 text-amber-400 bg-amber-500/10' },
            { code: 'INVALID999', label: 'Invalid Code', color: 'border-red-500/40 text-red-400 bg-red-500/10' },
          ].map((item) => (
            <button
              key={item.code}
              type="button"
              onClick={() => {
                setBarcodeInput(item.code);
                handleScanSubmit(item.code);
              }}
              className={`px-3 py-1.5 rounded-lg border text-xs font-mono font-bold transition-all hover:brightness-125 active:scale-95 ${item.color}`}
            >
              {item.label}
            </button>
          ))}
        </div>
      </div>

      {/* Visual Feedback Result Banner */}
      {lastResult && (
        <div
          id="scanner-result-banner"
          className={`rounded-3xl p-6 sm:p-8 border transition-all duration-300 shadow-2xl animate-in fade-in slide-in-from-top-4 ${
            lastResult.color === 'green'
              ? 'bg-[#0f1f14] border-green-500/60 shadow-green-500/10'
              : lastResult.color === 'orange'
              ? 'bg-[#1f170f] border-orange-500/60 shadow-orange-500/10'
              : lastResult.color === 'red'
              ? 'bg-[#1f0f0f] border-red-500/60 shadow-red-500/10'
              : 'bg-[#121212] border-white/10'
          }`}
        >
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div className="flex items-start gap-4">
              <div
                className={`w-14 h-14 rounded-2xl flex items-center justify-center shrink-0 ${
                  lastResult.color === 'green'
                    ? 'bg-green-500 text-black shadow-lg shadow-green-500/30'
                    : lastResult.color === 'orange'
                    ? 'bg-orange-500 text-black shadow-lg shadow-orange-500/30'
                    : lastResult.color === 'red'
                    ? 'bg-red-500 text-white shadow-lg shadow-red-500/30'
                    : 'bg-white/10 text-gray-300'
                }`}
              >
                {lastResult.color === 'green' && <CheckCircle2 className="w-8 h-8 stroke-[2.5]" />}
                {lastResult.color === 'orange' && <AlertTriangle className="w-8 h-8 stroke-[2.5]" />}
                {lastResult.color === 'red' && <XCircle className="w-8 h-8 stroke-[2.5]" />}
                {lastResult.color === 'gray' && <AlertOctagon className="w-8 h-8 stroke-[2.5]" />}
              </div>

              <div>
                <span
                  className={`inline-block px-3 py-1 rounded-full text-xs font-black uppercase tracking-widest mb-1.5 ${
                    lastResult.color === 'green'
                      ? 'bg-green-500/20 text-green-400 border border-green-500/40'
                      : lastResult.color === 'orange'
                      ? 'bg-orange-500/20 text-orange-400 border border-orange-500/40'
                      : lastResult.color === 'red'
                      ? 'bg-red-500/20 text-red-400 border border-red-500/40'
                      : 'bg-white/10 text-gray-400'
                  }`}
                >
                  {lastResult.title}
                </span>

                <h3 className="text-xl sm:text-2xl font-black text-white">
                  {lastResult.message}
                </h3>

                {lastResult.memberName && (
                  <p className="text-sm font-semibold text-gray-300 mt-1 flex items-center gap-2">
                    <User className="w-4 h-4 text-[#FACC15]" />
                    <span>{lastResult.memberName}</span>
                    <span className="font-mono text-xs px-2 py-0.5 rounded-md bg-white/5 border border-white/10 text-gray-300">
                      {lastResult.memberNumber}
                    </span>
                  </p>
                )}
              </div>
            </div>

            {/* Member Details Breakdown */}
            {(lastResult.package || lastResult.expiryDate || lastResult.checkInTime) && (
              <div className="grid grid-cols-2 gap-3 min-w-[240px] bg-black/40 p-4 rounded-2xl border border-white/5">
                {lastResult.package && (
                  <div>
                    <span className="text-[10px] font-bold uppercase text-gray-500">Package</span>
                    <p className="text-xs font-black text-white capitalize">
                      {lastResult.package.replace('_', ' ')}
                    </p>
                  </div>
                )}
                {lastResult.expiryDate && (
                  <div>
                    <span className="text-[10px] font-bold uppercase text-gray-500">Expiry Date</span>
                    <p className="text-xs font-black font-mono text-[#FACC15]">
                      {lastResult.expiryDate}
                    </p>
                  </div>
                )}
                {lastResult.checkInTime && (
                  <div>
                    <span className="text-[10px] font-bold uppercase text-gray-500">Check-in Time</span>
                    <p className="text-xs font-black font-mono text-green-400">
                      {lastResult.checkInTime}
                    </p>
                  </div>
                )}
                {lastResult.originalTime && (
                  <div>
                    <span className="text-[10px] font-bold uppercase text-gray-500">First Check-in</span>
                    <p className="text-xs font-black font-mono text-orange-400">
                      {lastResult.originalTime}
                    </p>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Live Today's Attendance Stream Table */}
      <div className="bg-[#121212] border border-white/5 rounded-3xl p-6">
        <div className="flex items-center justify-between pb-4 border-b border-white/5">
          <div>
            <h3 className="text-base font-bold text-white uppercase tracking-wider flex items-center gap-2">
              <Clock className="w-4 h-4 text-[#FACC15]" />
              Today's Attendance Registry
            </h3>
            <p className="text-xs text-gray-500">
              Total {recentScans.length} members checked in today
            </p>
          </div>
          <button
            onClick={loadTodayAttendance}
            className="p-2 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-gray-400 hover:text-white transition-colors"
          >
            <RotateCcw className="w-4 h-4" />
          </button>
        </div>

        <div className="mt-4 overflow-x-auto">
          {recentScans.length === 0 ? (
            <div className="text-center py-12 text-gray-500 text-xs font-semibold">
              No check-ins recorded yet today.
            </div>
          ) : (
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-white/5 text-gray-500 uppercase tracking-wider font-bold">
                  <th className="py-3 px-3">Check-in Time</th>
                  <th className="py-3 px-3">Member Number</th>
                  <th className="py-3 px-3">Full Name</th>
                  <th className="py-3 px-3">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/[0.03]">
                {recentScans.map((item) => (
                  <tr key={item.id} className="hover:bg-white/[0.02]">
                    <td className="py-3 px-3 font-mono font-bold text-[#FACC15]">
                      {item.attendanceTime}
                    </td>
                    <td className="py-3 px-3">
                      <span className="px-2 py-0.5 rounded-md bg-white/5 border border-white/10 font-mono font-bold text-gray-200">
                        {item.memberNumber}
                      </span>
                    </td>
                    <td className="py-3 px-3 font-semibold text-white">
                      {item.memberName || 'Member'}
                    </td>
                    <td className="py-3 px-3">
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-black uppercase bg-green-500/15 border border-green-500/30 text-green-400">
                        Verified
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
};
