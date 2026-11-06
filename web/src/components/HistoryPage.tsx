import React, { useState, useEffect } from 'react';
import {
  Calendar,
  Filter,
  Search,
  Clock,
  ShieldAlert,
  Edit3,
  CheckCircle2,
  X,
  AlertCircle,
  FileText,
  RotateCcw,
} from 'lucide-react';
import { DoseEvent, Medication, api } from '../services/api';
import { StatusBadge } from './StatusBadge';

interface Props {
  medications: Medication[];
}

export const HistoryPage: React.FC<Props> = ({ medications }) => {
  const [events, setEvents] = useState<DoseEvent[]>([]);
  const [loading, setLoading] = useState(false);
  const [rangePreset, setRangePreset] = useState<'today' | 'yesterday' | '7d' | '30d' | 'all'>('7d');
  const [selectedMedId, setSelectedMedId] = useState<string>('all');
  const [selectedStatus, setSelectedStatus] = useState<string>('all');
  const [selectedEvent, setSelectedEvent] = useState<DoseEvent | null>(null);

  // Correction form state
  const [isCorrecting, setIsCorrecting] = useState(false);
  const [newStatus, setNewStatus] = useState<'taken' | 'not_taken' | 'unresolved'>('taken');
  const [correctionReason, setCorrectionReason] = useState('');
  const [submittingCorrection, setSubmittingCorrection] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  useEffect(() => {
    loadEvents();
  }, [rangePreset, selectedMedId, selectedStatus]);

  const loadEvents = async () => {
    setLoading(true);
    try {
      const now = new Date();
      let startDate: string | undefined;
      let endDate: string | undefined;

      if (rangePreset === 'today') {
        const d = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        startDate = d.toISOString();
        const e = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);
        endDate = e.toISOString();
      } else if (rangePreset === 'yesterday') {
        const d = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1);
        startDate = d.toISOString();
        const e = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        endDate = e.toISOString();
      } else if (rangePreset === '7d') {
        const d = new Date(now.getTime() - 7 * 24 * 3600 * 1000);
        startDate = d.toISOString();
      } else if (rangePreset === '30d') {
        const d = new Date(now.getTime() - 30 * 24 * 3600 * 1000);
        startDate = d.toISOString();
      }

      const params: any = { limit: 100 };
      if (selectedMedId !== 'all') params.medication_id = selectedMedId;
      if (selectedStatus !== 'all') params.status_filter = selectedStatus;
      if (startDate) params.start_date = startDate;
      if (endDate) params.end_date = endDate;

      const data = await api.listDoseEvents(params);
      setEvents(data);
    } catch (err: any) {
      console.error('Failed to load dose events', err);
    } finally {
      setLoading(false);
    }
  };

  const handleApplyCorrection = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedEvent || !correctionReason.trim()) return;

    setSubmittingCorrection(true);
    try {
      const updated = await api.correctDoseEvent(selectedEvent.id, newStatus, correctionReason.trim());
      setToastMessage(`Record corrected to "${newStatus}". Audit log entry saved.`);
      setTimeout(() => setToastMessage(null), 4000);
      setIsCorrecting(false);
      setCorrectionReason('');
      setSelectedEvent(updated);
      loadEvents();
    } catch (err: any) {
      alert(`Correction failed: ${err.message}`);
    } finally {
      setSubmittingCorrection(false);
    }
  };

  const takenCount = events.filter((e) => e.status === 'taken').length;
  const skippedCount = events.filter((e) => e.status === 'not_taken').length;
  const unresolvedCount = events.filter((e) => e.status === 'unresolved').length;

  return (
    <div className="space-y-6">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="p-3 bg-teal-50 dark:bg-teal-950/60 border border-teal-300 dark:border-teal-700 text-teal-900 dark:text-teal-200 rounded text-xs flex justify-between items-center shadow-xs">
          <span>{toastMessage}</span>
          <button onClick={() => setToastMessage(null)} className="font-bold text-sm px-1">×</button>
        </div>
      )}

      {/* Header and Filter Controls */}
      <div className="bg-white dark:bg-[#1E2226] border border-[#D9D5CA] dark:border-[#2E363D] rounded-md p-4 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-[#D9D5CA] dark:border-[#2E363D] pb-3">
          <div>
            <h2 className="text-lg font-semibold text-[#1B1F23] dark:text-[#ECEFF1] flex items-center gap-2">
              <FileText className="w-5 h-5 text-[#0F5C5A] dark:text-[#1EB8B4]" />
              Dose History Ledger
            </h2>
            <p className="text-xs text-[#4A5159] dark:text-[#9EABB5] mt-0.5">
              Auditable, chronological log of all scheduled dose entries and self-reported intake.
            </p>
          </div>

          <button
            onClick={loadEvents}
            disabled={loading}
            className="text-xs text-[#0F5C5A] dark:text-[#1EB8B4] hover:underline font-semibold flex items-center gap-1 self-start sm:self-auto"
          >
            <RotateCcw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            Refresh Log
          </button>
        </div>

        {/* Segmented Range Selectors */}
        <div className="flex flex-wrap items-center gap-1.5 text-xs">
          <span className="text-[#4A5159] dark:text-[#9EABB5] font-semibold uppercase tracking-wider text-[11px] mr-1">
            Period:
          </span>
          {[
            { id: 'today', label: 'Today' },
            { id: 'yesterday', label: 'Yesterday' },
            { id: '7d', label: 'Last 7 Days' },
            { id: '30d', label: 'Last 30 Days' },
            { id: 'all', label: 'All Records' },
          ].map((preset) => (
            <button
              key={preset.id}
              onClick={() => setRangePreset(preset.id as any)}
              className={`px-3 py-1.5 rounded font-medium transition-colors ${
                rangePreset === preset.id
                  ? 'bg-[#0F5C5A] dark:bg-[#1EB8B4] text-white dark:text-[#121416]'
                  : 'bg-[#F7F5F0] dark:bg-[#2E363D] text-[#4A5159] dark:text-[#ECEFF1] hover:bg-neutral-200 dark:hover:bg-neutral-700'
              }`}
            >
              {preset.label}
            </button>
          ))}
        </div>

        {/* Dropdown Filters */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
          <div>
            <label className="block text-[11px] uppercase tracking-wider font-semibold text-[#4A5159] dark:text-[#9EABB5] mb-1">
              Filter by Medication
            </label>
            <select
              value={selectedMedId}
              onChange={(e) => setSelectedMedId(e.target.value)}
              className="w-full px-3 py-1.5 border border-[#D9D5CA] dark:border-[#2E363D] bg-white dark:bg-[#121416] text-[#1B1F23] dark:text-[#ECEFF1] rounded text-xs focus:outline-none"
            >
              <option value="all">All Medications ({medications.length})</option>
              {medications.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.display_name} {m.active ? '' : '(Archived)'}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-[11px] uppercase tracking-wider font-semibold text-[#4A5159] dark:text-[#9EABB5] mb-1">
              Filter by Recorded Status
            </label>
            <select
              value={selectedStatus}
              onChange={(e) => setSelectedStatus(e.target.value)}
              className="w-full px-3 py-1.5 border border-[#D9D5CA] dark:border-[#2E363D] bg-white dark:bg-[#121416] text-[#1B1F23] dark:text-[#ECEFF1] rounded text-xs focus:outline-none"
            >
              <option value="all">All Outcomes</option>
              <option value="taken">Taken (✓)</option>
              <option value="not_taken">Not Taken / Skipped (✕)</option>
              <option value="unresolved">Unresolved (◌)</option>
              <option value="scheduled">Scheduled (○)</option>
            </select>
          </div>
        </div>

        {/* Ledger Count Pill Summary */}
        <div className="flex items-center gap-3 pt-2 text-xs border-t border-[#D9D5CA] dark:border-[#2E363D]">
          <span className="text-[#4A5159] dark:text-[#9EABB5]">
            Showing <strong className="text-[#1B1F23] dark:text-[#ECEFF1]">{events.length}</strong> events:
          </span>
          <span className="text-[#1E6B3A] dark:text-[#2FA85C] font-mono-numbers font-medium">
            {takenCount} Taken
          </span>
          <span>·</span>
          <span className="text-[#8A2D2D] dark:text-[#C94A4A] font-mono-numbers font-medium">
            {skippedCount} Skipped
          </span>
          <span>·</span>
          <span className="text-[#7A5A00] dark:text-[#D4A017] font-mono-numbers font-medium">
            {unresolvedCount} Unresolved
          </span>
        </div>
      </div>

      {/* Ledger Table */}
      <div className="bg-white dark:bg-[#1E2226] border border-[#D9D5CA] dark:border-[#2E363D] rounded-md overflow-hidden">
        {events.length === 0 ? (
          <div className="p-10 text-center text-[#4A5159] dark:text-[#9EABB5] space-y-2">
            <AlertCircle className="w-8 h-8 mx-auto text-neutral-400" />
            <p className="font-semibold text-sm">No dose events found matching the selected filters.</p>
            <p className="text-xs">Try selecting a wider date range or clearing your filters.</p>
          </div>
        ) : (
          <div className="divide-y divide-[#D9D5CA] dark:divide-[#2E363D]">
            {events.map((ev) => {
              const schedDate = new Date(ev.scheduled_at);
              const dateStr = schedDate.toLocaleDateString([], {
                month: 'short',
                day: 'numeric',
                weekday: 'short',
              });
              const timeStr = schedDate.toLocaleTimeString([], {
                hour: '2-digit',
                minute: '2-digit',
              });

              return (
                <div
                  key={ev.id}
                  onClick={() => setSelectedEvent(ev)}
                  className="p-3.5 sm:p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-[#F7F5F0]/60 dark:hover:bg-[#252A2F] cursor-pointer transition-colors"
                >
                  <div className="flex items-start sm:items-center gap-3">
                    <div className="w-24 flex-shrink-0">
                      <div className="font-mono-numbers font-semibold text-xs text-[#1B1F23] dark:text-[#ECEFF1]">
                        {timeStr}
                      </div>
                      <div className="text-[11px] text-[#4A5159] dark:text-[#9EABB5]">
                        {dateStr}
                      </div>
                    </div>

                    <div>
                      <div className="font-semibold text-sm text-[#1B1F23] dark:text-[#ECEFF1] flex items-center gap-2">
                        <span>{ev.medication_name}</span>
                        {ev.is_synthetic && (
                          <span className="text-[10px] bg-amber-100 dark:bg-amber-950 text-amber-900 dark:text-amber-200 border border-amber-300 dark:border-amber-700 px-1 py-0.2 rounded font-mono">
                            SYNTHETIC
                          </span>
                        )}
                      </div>
                      <div className="text-xs text-[#4A5159] dark:text-[#9EABB5] mt-0.5">
                        {ev.responded_at ? (
                          <span>
                            Logged {new Date(ev.responded_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                            {ev.response_source ? ` (${ev.response_source})` : ''}
                          </span>
                        ) : (
                          <span>Awaiting record</span>
                        )}
                        {ev.reason_code && (
                          <span className="ml-2 italic text-neutral-600 dark:text-neutral-400">
                            "{ev.reason_code}"
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center justify-between sm:justify-end gap-3">
                    <StatusBadge status={ev.status} isLate={ev.is_late} />
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setSelectedEvent(ev);
                      }}
                      className="px-2.5 py-1 text-xs border border-[#D9D5CA] dark:border-[#2E363D] hover:border-[#0F5C5A] dark:hover:border-[#1EB8B4] rounded text-[#0F5C5A] dark:text-[#1EB8B4] font-medium"
                    >
                      Audit Trail
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Event Detail & Audit Correction Modal */}
      {selectedEvent && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4 animate-in fade-in duration-150">
          <div className="bg-white dark:bg-[#1E2226] max-w-lg w-full rounded-md border border-[#D9D5CA] dark:border-[#2E363D] shadow-2xl overflow-hidden">
            <div className="bg-[#F7F5F0] dark:bg-[#252A2F] px-6 py-4 border-b border-[#D9D5CA] dark:border-[#2E363D] flex items-center justify-between">
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-[#0F5C5A] dark:text-[#1EB8B4]">
                  Clinical Ledger Record
                </span>
                <h3 className="text-lg font-semibold text-[#1B1F23] dark:text-[#ECEFF1]">
                  {selectedEvent.medication_name}
                </h3>
              </div>
              <button
                onClick={() => {
                  setSelectedEvent(null);
                  setIsCorrecting(false);
                }}
                className="text-[#4A5159] dark:text-[#9EABB5] hover:text-[#1B1F23] text-xl font-bold"
              >
                ×
              </button>
            </div>

            <div className="p-6 space-y-4 text-xs">
              {/* Record metadata list */}
              <div className="border border-[#D9D5CA] dark:border-[#2E363D] rounded divide-y divide-[#D9D5CA] dark:divide-[#2E363D]">
                <div className="p-3 flex justify-between items-center">
                  <span className="text-[#4A5159] dark:text-[#9EABB5]">Current Status:</span>
                  <StatusBadge status={selectedEvent.status} isLate={selectedEvent.is_late} />
                </div>
                <div className="p-3 flex justify-between items-center">
                  <span className="text-[#4A5159] dark:text-[#9EABB5]">Scheduled Timestamp:</span>
                  <span className="font-mono-numbers font-medium text-[#1B1F23] dark:text-[#ECEFF1]">
                    {new Date(selectedEvent.scheduled_at).toLocaleString()}
                  </span>
                </div>
                {selectedEvent.responded_at && (
                  <div className="p-3 flex justify-between items-center">
                    <span className="text-[#4A5159] dark:text-[#9EABB5]">Responded Timestamp:</span>
                    <span className="font-mono-numbers font-medium text-[#1B1F23] dark:text-[#ECEFF1]">
                      {new Date(selectedEvent.responded_at).toLocaleString()}
                    </span>
                  </div>
                )}
                <div className="p-3 flex justify-between items-center">
                  <span className="text-[#4A5159] dark:text-[#9EABB5]">Response Source:</span>
                  <span className="font-mono text-[#1B1F23] dark:text-[#ECEFF1]">
                    {selectedEvent.response_source || 'system_schedule'}
                  </span>
                </div>
                <div className="p-3 flex justify-between items-center">
                  <span className="text-[#4A5159] dark:text-[#9EABB5]">Schedule Version Ref:</span>
                  <span className="font-mono text-[11px] text-[#4A5159] dark:text-[#9EABB5]">
                    {selectedEvent.schedule_version_id}
                  </span>
                </div>
                <div className="p-3 flex justify-between items-center">
                  <span className="text-[#4A5159] dark:text-[#9EABB5]">Idempotency Key:</span>
                  <span className="font-mono text-[10px] text-neutral-500 break-all max-w-[200px]">
                    {selectedEvent.idempotency_key}
                  </span>
                </div>
              </div>

              {/* Correction Section */}
              {!isCorrecting ? (
                <div className="pt-2 flex justify-between items-center">
                  <span className="text-[#4A5159] dark:text-[#9EABB5]">Need to correct an erroneous entry?</span>
                  <button
                    onClick={() => {
                      setIsCorrecting(true);
                      setNewStatus(selectedEvent.status === 'taken' ? 'not_taken' : 'taken');
                    }}
                    className="px-3 py-1.5 bg-[#F7F5F0] dark:bg-[#2E363D] hover:bg-neutral-200 dark:hover:bg-neutral-700 border border-[#D9D5CA] dark:border-[#2E363D] text-[#1B1F23] dark:text-[#ECEFF1] rounded font-medium flex items-center gap-1.5"
                  >
                    <Edit3 className="w-3.5 h-3.5" />
                    Correct Record
                  </button>
                </div>
              ) : (
                <form onSubmit={handleApplyCorrection} className="p-4 bg-amber-50/70 dark:bg-amber-950/40 border border-amber-300 dark:border-amber-700 rounded space-y-3">
                  <div className="flex items-center gap-1.5 font-semibold text-amber-950 dark:text-amber-200">
                    <ShieldAlert className="w-4 h-4 text-amber-800 dark:text-amber-400" />
                    <span>Audit-Logged Dose Event Correction</span>
                  </div>

                  <div>
                    <label className="block text-[#4A5159] dark:text-[#9EABB5] mb-1 font-medium">
                      Select Corrected Status:
                    </label>
                    <select
                      value={newStatus}
                      onChange={(e) => setNewStatus(e.target.value as any)}
                      className="w-full px-3 py-1.5 border border-[#D9D5CA] dark:border-[#2E363D] bg-white dark:bg-[#121416] text-[#1B1F23] dark:text-[#ECEFF1] rounded text-xs"
                    >
                      <option value="taken">Taken (✓)</option>
                      <option value="not_taken">Not Taken / Skipped (✕)</option>
                      <option value="unresolved">Unresolved (◌)</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-[#4A5159] dark:text-[#9EABB5] mb-1 font-medium">
                      Correction Reason (Mandatory Audit Requirement):
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. Took dose with lunch 30 minutes later than scheduled"
                      value={correctionReason}
                      onChange={(e) => setCorrectionReason(e.target.value)}
                      className="w-full px-3 py-1.5 border border-[#D9D5CA] dark:border-[#2E363D] bg-white dark:bg-[#121416] text-[#1B1F23] dark:text-[#ECEFF1] rounded text-xs"
                    />
                  </div>

                  <div className="flex justify-end gap-2 pt-1">
                    <button
                      type="button"
                      onClick={() => setIsCorrecting(false)}
                      className="px-3 py-1.5 border border-neutral-300 dark:border-neutral-600 rounded text-neutral-700 dark:text-neutral-300"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={submittingCorrection || !correctionReason.trim()}
                      className="px-4 py-1.5 bg-[#0F5C5A] dark:bg-[#1EB8B4] text-white dark:text-[#121416] rounded font-medium disabled:opacity-50"
                    >
                      {submittingCorrection ? 'Saving…' : 'Save Correction'}
                    </button>
                  </div>
                </form>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

