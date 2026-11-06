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
  const [showSkipReason, setShowSkipReason] = useState(false);
  const [skipReason, setSkipReason] = useState('');
  const [error, setError] = useState<string | null>(null);

  if (!event) return null;

  const handleTake = async () => {
    setLoading(true);
    setError(null);
    try {
      await api.recordDoseResponse(event.id, 'taken');
      onActionComplete();
      onClose();
    } catch (err: any) {
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
    } catch (err: any) {
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
    <div className="fixed inset-0 z-50 bg-black/40 flex items-end sm:items-center justify-center p-0 sm:p-4 animate-in fade-in duration-150">
      <div className="w-full sm:max-w-md bg-white rounded-t-lg sm:rounded-md border border-[#D9D5CA] shadow-xl overflow-hidden">
        {/* Header */}
        <div className="px-6 py-4 border-b border-[#D9D5CA] flex items-center justify-between bg-[#F7F5F0]">
          <div>
            <span className="text-xs font-semibold uppercase tracking-wider text-[#4A5159]">
              Dose Ledger Entry
            </span>
            <h3 className="text-xl font-semibold text-[#1B1F23]">
              {event.medication_name || 'Scheduled Dose'}
            </h3>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-[#4A5159] hover:text-[#1B1F23] rounded focus:outline-none"
            aria-label="Close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-4">
          <div className="flex items-center justify-between text-sm py-2 px-3 bg-neutral-50 rounded border border-neutral-200">
            <span className="text-[#4A5159]">Scheduled Time:</span>
            <span className="font-mono-numbers font-medium text-[#1B1F23]">
              {scheduledTimeStr}
            </span>
          </div>

          {event.is_late && (
            <div className="flex items-center gap-2 p-2.5 bg-amber-50 text-amber-900 border border-amber-200 rounded text-xs">
              <AlertTriangle className="w-4 h-4 flex-shrink-0 text-amber-700" />
              <span>Response window passed. This outcome will be logged with a late flag.</span>
            </div>
          )}

          {error && (
            <div className="p-2.5 bg-rose-50 text-rose-800 border border-rose-200 rounded text-xs">
              {error}
            </div>
          )}

          {/* Equal weight action buttons */}
          <div className="space-y-3 pt-2">
            <button
              onClick={handleTake}
              disabled={loading}
              className="w-full h-14 bg-[#1E6B3A] hover:bg-[#16522c] text-white font-medium text-base rounded flex items-center justify-center gap-2 transition-colors shadow-sm disabled:opacity-50"
            >
              <Check className="w-5 h-5" />
              <span>Mark Taken</span>
            </button>

            <button
              onClick={handleSkip}
              disabled={loading}
              className="w-full h-14 bg-[#8A2D2D] hover:bg-[#6e2323] text-white font-medium text-base rounded flex items-center justify-center gap-2 transition-colors shadow-sm disabled:opacity-50"
            >
              <X className="w-5 h-5" />
              <span>Mark Not Taken (Skipped)</span>
            </button>

            <button
              onClick={handleSnooze}
              disabled={loading}
              className="w-full h-14 bg-[#3B4A8A] hover:bg-[#2e3b70] text-white font-medium text-base rounded flex items-center justify-center gap-2 transition-colors shadow-sm disabled:opacity-50"
            >
              <Clock className="w-5 h-5" />
              <span>Snooze Reminder (15 min)</span>
            </button>
          </div>

          <p className="text-[11px] text-center text-[#4A5159] pt-2">
            Reminder snooze changes notification timing only and does not alter prescribed dosage or schedule.
          </p>
        </div>
      </div>
    </div>
  );
};

