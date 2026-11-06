import React, { useState } from 'react';
import { X, Check, Clock, AlertTriangle } from 'lucide-react';
import { DoseEvent, api, addToOfflineQueue } from '../services/api';

interface Props {
  event: DoseEvent | null;
  onClose: () => void;
  onActionComplete: () => void;
}

export const ResponseDrawer: React.FC<Props> = ({ event, onClose, onActionComplete }) => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!event) return null;

  const handleTake = async () => {
    setLoading(true);
    setError(null);
    try {
      await api.recordDoseResponse(event.id, 'taken');
      onActionComplete();
      onClose();
    } catch {
      // Offline fallback
      addToOfflineQueue({
        event_id: event.id,
        outcome: 'taken',
        scheduled_at: event.scheduled_at,
        medication_id: event.medication_id,
        schedule_version_id: event.schedule_version_id,
        idempotency_key: `offline_take_${event.id}_${Date.now()}`,
        timestamp: new Date().toISOString(),
      });
      onActionComplete();
      onClose();
    } finally {
      setLoading(false);
    }
  };

  const handleSkip = async () => {
    setLoading(true);
    setError(null);
    try {
      await api.recordDoseResponse(event.id, 'not_taken');
      onActionComplete();
      onClose();
    } catch {
      addToOfflineQueue({
        event_id: event.id,
        outcome: 'not_taken',
        scheduled_at: event.scheduled_at,
        medication_id: event.medication_id,
        schedule_version_id: event.schedule_version_id,
        idempotency_key: `offline_skip_${event.id}_${Date.now()}`,
        timestamp: new Date().toISOString(),
      });
      onActionComplete();
      onClose();
    } finally {
      setLoading(false);
    }
  };

  const handleSnooze = async () => {
    setLoading(true);
    setError(null);
    try {
      await api.snoozeReminder(event.id, 15);
      onActionComplete();
      onClose();
    } catch (err: any) {
      setError(err.message || 'Failed to snooze reminder');
    } finally {
      setLoading(false);
    }
  };

  const scheduledTimeStr = new Date(event.scheduled_at).toLocaleTimeString([], {
    hour: '2-digit',
    minute: '2-digit',
  });

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-end sm:items-center justify-center p-0 sm:p-4 animate-in fade-in duration-150">
      <div className="w-full sm:max-w-md bg-white dark:bg-[#1E2226] rounded-t-xl sm:rounded-md border border-[#D9D5CA] dark:border-[#2E363D] shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="px-6 py-4 border-b border-[#D9D5CA] dark:border-[#2E363D] flex items-center justify-between bg-[#F7F5F0] dark:bg-[#252A2F]">
          <div>
            <span className="text-[10px] font-bold uppercase tracking-wider text-[#4A5159] dark:text-[#9EABB5]">
              Dose Ledger Record Entry
            </span>
            <h3 className="text-xl font-bold text-[#1B1F23] dark:text-[#ECEFF1]">
              {event.medication_name || 'Scheduled Dose'}
            </h3>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-[#4A5159] dark:text-[#9EABB5] hover:text-[#1B1F23] dark:hover:text-[#ECEFF1] rounded-sm focus:outline-none"
            aria-label="Close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-4">
          <div className="flex items-center justify-between text-xs py-2 px-3 bg-[#F7F5F0] dark:bg-[#121416] rounded border border-[#D9D5CA] dark:border-[#2E363D]">
            <span className="text-[#4A5159] dark:text-[#9EABB5]">Scheduled Intake Time:</span>
            <span className="font-mono-numbers font-semibold text-sm text-[#1B1F23] dark:text-[#ECEFF1]">
              {scheduledTimeStr}
            </span>
          </div>

          {event.is_late && (
            <div className="flex items-center gap-2 p-2.5 bg-amber-50 dark:bg-amber-950/60 text-amber-900 dark:text-amber-200 border border-amber-300 dark:border-amber-700 rounded text-xs">
              <AlertTriangle className="w-4 h-4 flex-shrink-0 text-amber-700 dark:text-amber-400" />
              <span>Response window passed. Outcome will be recorded with an immutable late audit flag.</span>
            </div>
          )}

          {error && (
            <div className="p-2.5 bg-rose-50 dark:bg-rose-950/60 text-rose-800 dark:text-rose-200 border border-rose-200 dark:border-rose-800 rounded text-xs">
              {error}
            </div>
          )}

          {/* Three Equal-Weight Action Buttons (height: 56px per 04-design.md) */}
          <div className="space-y-3 pt-2">
            <button
              onClick={handleTake}
              disabled={loading}
              className="w-full h-14 bg-[#1E6B3A] dark:bg-[#258749] hover:bg-[#16522c] text-white font-semibold text-base rounded flex items-center justify-center gap-2.5 transition-colors shadow-xs disabled:opacity-50"
            >
              <Check className="w-5 h-5 stroke-[2.5]" />
              <span>Mark Taken</span>
            </button>

            <button
              onClick={handleSkip}
              disabled={loading}
              className="w-full h-14 bg-[#8A2D2D] dark:bg-[#A83838] hover:bg-[#6e2323] text-white font-semibold text-base rounded flex items-center justify-center gap-2.5 transition-colors shadow-xs disabled:opacity-50"
            >
              <X className="w-5 h-5 stroke-[2.5]" />
              <span>Mark Not Taken (Skipped)</span>
            </button>

            <button
              onClick={handleSnooze}
              disabled={loading}
              className="w-full h-14 bg-[#3B4A8A] dark:bg-[#4C5EAC] hover:bg-[#2e3b70] text-white font-semibold text-base rounded flex items-center justify-center gap-2.5 transition-colors shadow-xs disabled:opacity-50"
            >
              <Clock className="w-5 h-5 stroke-[2.5]" />
              <span>Snooze Reminder (15 min)</span>
            </button>
          </div>

          <p className="text-[11px] text-center text-[#4A5159] dark:text-[#9EABB5] pt-2 leading-tight">
            Reminder snooze adjusts notification delivery only; it does not alter prescribed dosage or regimen.
          </p>
        </div>
      </div>
    </div>
  );
};
