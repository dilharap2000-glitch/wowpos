import React, { useState, useEffect } from 'react';
import {
  X,
  Clock,
  Send,
  AlertTriangle,
  CheckCircle2,
  PhoneOff,
  SkipForward,
  RefreshCw,
  Users,
  ShieldCheck,
} from 'lucide-react';
import { api } from '../lib/api.ts';
import type {
  ExpiredReminderPreviewResult,
  ExpiredReminderBulkSendResult,
} from '../types.ts';

interface BulkExpiredRemindersModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

export const BulkExpiredRemindersModal: React.FC<BulkExpiredRemindersModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
}) => {
  const [loading, setLoading] = useState(false);
  const [sending, setSending] = useState(false);
  const [preview, setPreview] = useState<ExpiredReminderPreviewResult | null>(null);
  const [sendResult, setSendResult] = useState<ExpiredReminderBulkSendResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [filterTab, setFilterTab] = useState<'all' | 'eligible' | 'already_reminded' | 'invalid_phone'>('all');

  const fetchPreview = async () => {
    setLoading(true);
    setError(null);
    setSendResult(null);
    try {
      const data = await api.previewExpiredReminders();
      setPreview(data);
    } catch (err: any) {
      setError(err?.message || 'Failed to generate expired reminder preview');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      fetchPreview();
    } else {
      setPreview(null);
      setSendResult(null);
      setError(null);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleBulkSend = async () => {
    if (!preview || preview.eligible === 0) return;
    setSending(true);
    setError(null);
    try {
      const res = await api.sendBulkExpiredReminders();
      setSendResult(res);
      if (onSuccess) onSuccess();
    } catch (err: any) {
      setError(err?.message || 'Failed to dispatch bulk expired reminders');
    } finally {
      setSending(false);
    }
  };

  const filteredMembers = (preview?.members || []).filter((m) => {
    if (filterTab === 'all') return true;
    return m.status === filterTab;
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in">
      <div className="relative w-full max-w-4xl max-h-[90vh] bg-[#121212] border border-white/10 rounded-3xl shadow-2xl flex flex-col overflow-hidden">
        {/* Header */}
        <div className="p-5 border-b border-white/10 flex items-center justify-between bg-black/40">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-[#FACC15]/10 border border-[#FACC15]/20 flex items-center justify-center text-[#FACC15]">
              <Clock className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-black text-white uppercase tracking-wider flex items-center gap-2">
                Expired Membership Renewal SMS
              </h2>
              <p className="text-xs text-gray-400">
                Safe bulk reminder dispatch with deduplication, Sri Lanka phone validation &amp; retry tracking.
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl text-gray-400 hover:text-white hover:bg-white/10 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {error && (
            <div className="p-4 rounded-2xl bg-red-950/60 border border-red-800 text-red-300 text-xs flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 shrink-0 text-red-400" />
              <span>{error}</span>
            </div>
          )}

          {/* SEND RESULTS VIEW (Shown when bulk send has finished) */}
          {sendResult && (
            <div className="space-y-4 p-5 rounded-2xl bg-emerald-950/30 border border-emerald-800/60 animate-fade-in">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-5 h-5 text-emerald-400" />
                  <span className="font-black text-sm text-white uppercase tracking-wider">
                    Bulk SMS Dispatch Complete
                  </span>
                </div>
                <button
                  onClick={fetchPreview}
                  className="px-3 py-1 rounded-xl bg-white/10 hover:bg-white/20 text-xs font-bold text-gray-200 flex items-center gap-1.5 transition-all"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                  Refresh Preview
                </button>
              </div>

              {/* 4 Required Result Metric Cards */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-center">
                <div className="bg-black/60 p-3 rounded-xl border border-emerald-500/30">
                  <span className="text-[10px] text-gray-400 uppercase block font-bold">SMS Sent / Accepted</span>
                  <span className="text-lg font-black text-emerald-400">{sendResult.sent}</span>
                </div>
                <div className="bg-black/60 p-3 rounded-xl border border-blue-500/30">
                  <span className="text-[10px] text-gray-400 uppercase block font-bold">Already Sent (Skipped)</span>
                  <span className="text-lg font-black text-blue-400">{sendResult.skippedAlreadySent}</span>
                </div>
                <div className="bg-black/60 p-3 rounded-xl border border-red-500/30">
                  <span className="text-[10px] text-gray-400 uppercase block font-bold">Failed</span>
                  <span className="text-lg font-black text-red-400">{sendResult.failed}</span>
                </div>
                <div className="bg-black/60 p-3 rounded-xl border border-amber-500/30">
                  <span className="text-[10px] text-gray-400 uppercase block font-bold">Invalid Phone</span>
                  <span className="text-lg font-black text-amber-400">{sendResult.invalidPhone}</span>
                </div>
              </div>

              {/* Individual send result breakdown */}
              <div className="mt-2 text-xs space-y-1">
                <span className="text-[10px] uppercase font-bold text-gray-400 tracking-wider">
                  Dispatch Log Summary:
                </span>
                <div className="max-h-36 overflow-y-auto space-y-1 pr-1 font-mono text-[11px]">
                  {sendResult.results.map((r, i) => (
                    <div
                      key={i}
                      className="p-2 rounded-lg bg-black/40 border border-white/5 flex items-center justify-between"
                    >
                      <div className="flex items-center gap-2">
                        <span className="text-white font-bold">{r.memberName}</span>
                        <span className="text-gray-500 text-[10px]">({r.phone || 'no phone'})</span>
                      </div>
                      <div className="flex items-center gap-2">
                        {r.action === 'sent' && (
                          <span className="text-emerald-400 font-bold uppercase text-[10px] bg-emerald-950/60 px-2 py-0.5 rounded border border-emerald-800">
                            Sent {r.campaignId ? `(CID: ${r.campaignId})` : ''}
                          </span>
                        )}
                        {r.action === 'skipped_already_sent' && (
                          <span className="text-blue-400 font-bold uppercase text-[10px] bg-blue-950/60 px-2 py-0.5 rounded border border-blue-800">
                            Already Reminded
                          </span>
                        )}
                        {r.action === 'invalid_phone' && (
                          <span className="text-amber-400 font-bold uppercase text-[10px] bg-amber-950/60 px-2 py-0.5 rounded border border-amber-800">
                            Invalid Phone
                          </span>
                        )}
                        {r.action === 'failed' && (
                          <span className="text-red-400 font-bold uppercase text-[10px] bg-red-950/60 px-2 py-0.5 rounded border border-red-800">
                            Failed {r.error ? `(${r.error})` : ''}
                          </span>
                        )}
                        {r.action === 'skipped_renewed' && (
                          <span className="text-purple-400 font-bold uppercase text-[10px] bg-purple-950/60 px-2 py-0.5 rounded border border-purple-800">
                            Renewed
                          </span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* 4 REQUIRED PREVIEW METRICS CARDS */}
          {loading ? (
            <div className="py-12 flex flex-col items-center justify-center text-gray-400 gap-2">
              <RefreshCw className="w-6 h-6 animate-spin text-[#FACC15]" />
              <span className="text-xs font-bold uppercase tracking-wider">Evaluating expired members...</span>
            </div>
          ) : preview ? (
            <div className="space-y-5">
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {/* 1. Total Expired */}
                <div className="p-4 rounded-2xl bg-black/60 border border-white/10 space-y-1">
                  <div className="flex items-center justify-between text-gray-400 text-xs">
                    <span className="uppercase font-bold tracking-wider text-[10px]">Total Expired</span>
                    <Users className="w-4 h-4 text-gray-400" />
                  </div>
                  <div className="text-2xl font-black text-white">{preview.totalExpired}</div>
                  <div className="text-[10px] text-gray-500">Unrenewed past expiry</div>
                </div>

                {/* 2. Already Reminded */}
                <div className="p-4 rounded-2xl bg-black/60 border border-blue-500/30 space-y-1">
                  <div className="flex items-center justify-between text-blue-400 text-xs">
                    <span className="uppercase font-bold tracking-wider text-[10px]">Already Reminded</span>
                    <SkipForward className="w-4 h-4 text-blue-400" />
                  </div>
                  <div className="text-2xl font-black text-blue-400">{preview.alreadyReminded}</div>
                  <div className="text-[10px] text-gray-500">Will be safely skipped</div>
                </div>

                {/* 3. Eligible Members */}
                <div className="p-4 rounded-2xl bg-black/60 border border-emerald-500/30 space-y-1">
                  <div className="flex items-center justify-between text-emerald-400 text-xs">
                    <span className="uppercase font-bold tracking-wider text-[10px]">Eligible Members</span>
                    <Send className="w-4 h-4 text-emerald-400" />
                  </div>
                  <div className="text-2xl font-black text-emerald-400">{preview.eligible}</div>
                  <div className="text-[10px] text-gray-500">SMS will be sent</div>
                </div>

                {/* 4. Missing / Invalid Phone */}
                <div className="p-4 rounded-2xl bg-black/60 border border-amber-500/30 space-y-1">
                  <div className="flex items-center justify-between text-amber-400 text-xs">
                    <span className="uppercase font-bold tracking-wider text-[10px]">Invalid Phone</span>
                    <PhoneOff className="w-4 h-4 text-amber-400" />
                  </div>
                  <div className="text-2xl font-black text-amber-400">{preview.invalidPhone}</div>
                  <div className="text-[10px] text-gray-500">Needs phone update</div>
                </div>
              </div>

              {/* Security & Deduplication Guarantee Note */}
              <div className="p-3.5 rounded-2xl bg-black/40 border border-white/5 flex items-center gap-2.5 text-xs text-gray-400">
                <ShieldCheck className="w-4 h-4 text-[#FACC15] shrink-0" />
                <span>
                  <strong>Deduplication Guard:</strong> Members who have already received an overdue SMS for their expired membership period are automatically protected against duplicate messages.
                </span>
              </div>

              {/* Filter Tabs for Member List */}
              <div className="flex items-center justify-between pt-2">
                <div className="flex items-center gap-1.5 bg-black/60 p-1 rounded-xl border border-white/10 text-xs">
                  <button
                    type="button"
                    onClick={() => setFilterTab('all')}
                    className={`px-3 py-1 rounded-lg font-bold transition-all ${
                      filterTab === 'all' ? 'bg-[#FACC15] text-black' : 'text-gray-400 hover:text-white'
                    }`}
                  >
                    All ({preview.totalExpired})
                  </button>
                  <button
                    type="button"
                    onClick={() => setFilterTab('eligible')}
                    className={`px-3 py-1 rounded-lg font-bold transition-all ${
                      filterTab === 'eligible' ? 'bg-emerald-500 text-black' : 'text-gray-400 hover:text-white'
                    }`}
                  >
                    Eligible ({preview.eligible})
                  </button>
                  <button
                    type="button"
                    onClick={() => setFilterTab('already_reminded')}
                    className={`px-3 py-1 rounded-lg font-bold transition-all ${
                      filterTab === 'already_reminded' ? 'bg-blue-500 text-black' : 'text-gray-400 hover:text-white'
                    }`}
                  >
                    Already Reminded ({preview.alreadyReminded})
                  </button>
                  <button
                    type="button"
                    onClick={() => setFilterTab('invalid_phone')}
                    className={`px-3 py-1 rounded-lg font-bold transition-all ${
                      filterTab === 'invalid_phone' ? 'bg-amber-500 text-black' : 'text-gray-400 hover:text-white'
                    }`}
                  >
                    Invalid Phone ({preview.invalidPhone})
                  </button>
                </div>

                <button
                  onClick={fetchPreview}
                  disabled={loading}
                  className="p-1.5 rounded-xl bg-white/5 hover:bg-white/10 text-gray-400 hover:text-white transition-colors"
                  title="Refresh Preview"
                >
                  <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
                </button>
              </div>

              {/* Expired Members Table */}
              <div className="overflow-x-auto rounded-2xl border border-white/10 bg-black/40">
                <table className="w-full text-left text-xs text-gray-300">
                  <thead className="bg-white/5 text-[10px] uppercase font-black text-gray-400 tracking-wider">
                    <tr>
                      <th className="p-3">Member</th>
                      <th className="p-3">Phone</th>
                      <th className="p-3">Package</th>
                      <th className="p-3">Expiry Date</th>
                      <th className="p-3 text-center">Overdue</th>
                      <th className="p-3 text-right">Status / Eligibility</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5">
                    {filteredMembers.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="p-6 text-center text-gray-500">
                          No expired members matching this filter.
                        </td>
                      </tr>
                    ) : (
                      filteredMembers.map((m) => (
                        <tr key={m.memberId} className="hover:bg-white/5 transition-colors">
                          <td className="p-3">
                            <span className="font-bold text-white block">{m.fullName}</span>
                            <span className="text-[10px] text-gray-500 font-mono">{m.memberNumber}</span>
                          </td>
                          <td className="p-3 font-mono text-gray-300">
                            {m.phone || <span className="text-red-400 italic">None</span>}
                          </td>
                          <td className="p-3 uppercase font-medium text-gray-400">
                            {m.package.replace(/_/g, ' ')}
                          </td>
                          <td className="p-3 font-mono text-gray-300">{m.expiryDate}</td>
                          <td className="p-3 text-center font-bold text-red-400 font-mono">
                            +{m.daysOverdue}d
                          </td>
                          <td className="p-3 text-right">
                            {m.status === 'eligible' && (
                              <span className="px-2 py-0.5 rounded-md bg-emerald-950/80 border border-emerald-800 text-emerald-400 text-[10px] font-bold uppercase tracking-wider">
                                Eligible (Will Send)
                              </span>
                            )}
                            {m.status === 'already_reminded' && (
                              <span
                                className="px-2 py-0.5 rounded-md bg-blue-950/80 border border-blue-800 text-blue-400 text-[10px] font-bold uppercase tracking-wider"
                                title={m.reason}
                              >
                                Already Sent (Skip)
                              </span>
                            )}
                            {m.status === 'invalid_phone' && (
                              <span
                                className="px-2 py-0.5 rounded-md bg-amber-950/80 border border-amber-800 text-amber-400 text-[10px] font-bold uppercase tracking-wider"
                                title={m.reason}
                              >
                                Invalid Phone
                              </span>
                            )}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          ) : null}
        </div>

        {/* Modal Footer */}
        <div className="p-5 border-t border-white/10 flex items-center justify-between bg-black/40">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-white/5 hover:bg-white/10 text-gray-300 font-bold text-xs uppercase tracking-wider transition-colors"
          >
            Close
          </button>

          <button
            type="button"
            onClick={handleBulkSend}
            disabled={sending || loading || !preview || preview.eligible === 0}
            className={`px-5 py-2.5 rounded-xl font-black text-xs uppercase tracking-wider flex items-center gap-2 transition-all ${
              sending || loading || !preview || preview.eligible === 0
                ? 'bg-zinc-800 text-zinc-500 cursor-not-allowed border border-white/5'
                : 'bg-[#FACC15] hover:bg-[#FACC15]/90 text-black shadow-lg shadow-[#FACC15]/10 active:scale-95'
            }`}
          >
            <Send className={`w-3.5 h-3.5 ${sending ? 'animate-bounce' : ''}`} />
            {sending
              ? 'Dispatching Reminders...'
              : `SEND REMINDERS TO ELIGIBLE (${preview?.eligible || 0} MEMBERS)`}
          </button>
        </div>
      </div>
    </div>
  );
};
