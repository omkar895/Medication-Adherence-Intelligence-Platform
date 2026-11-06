import React, { useState } from 'react';
import { Clock, Play, RefreshCw, AlertCircle, Calendar, CheckCircle2 } from 'lucide-react';
import { DoseEvent, api } from '../services/api';
import { StatusBadge } from './StatusBadge';
import { ResponseDrawer } from './ResponseDrawer';

interface Props {
  events: DoseEvent[];
  onRefresh: () => void;
  loading: boolean;
}

export const TodayLedger: React.FC<Props> = ({ events, onRefresh, loading }) => {
  const [selectedEvent, setSelectedEvent] = useState<DoseEvent | null>(null);
  const [simulating, setSimulating] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [currentTime, setCurrentTime] = useState<Date>(new Date());

  React.useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const now = currentTime;
  const sorted = [...events].sort(
    (a, b) => new Date(a.scheduled_at).getTime() - new Date(b.scheduled_at).getTime()
  );

  const nextUpcoming =
    sorted.find((e) => e.status === 'scheduled' && new Date(e.scheduled_at) >= now) ||
    sorted.find((e) => e.status === 'scheduled');

  const getTimeRemaining = (scheduledAt: string) => {
    const diffMs = new Date(scheduledAt).getTime() - currentTime.getTime();
    if (diffMs <= 0) {
      const pastMins = Math.floor(-diffMs / 60000);
      if (pastMins < 60) return `Due now (${pastMins}m ago)`;
      return `Due now`;
    }
    const diffSecs = Math.floor(diffMs / 1000);
    const hours = Math.floor(diffSecs / 3600);
    const mins = Math.floor((diffSecs % 3600) / 60);
    const secs = diffSecs % 60;
    if (hours > 0) {
      return `Due in ${hours}h ${mins}m ${secs}s`;
    }
    return `Due in ${mins}m ${secs}s`;
  };

  const totalDoses = events.length;
  const takenCount = events.filter((e) => e.status === 'taken').length;
  const skippedCount = events.filter((e) => e.status === 'not_taken').length;
  const unresolvedCount = events.filter((e) => e.status === 'unresolved').length;

  const handleSimulate = async (eventId: string) => {
    setSimulating(true);
    try {
      await api.simulateReminder(eventId);
      setMessage(`Reminder trigger simulated! Delivery attempt registered.`);
      setTimeout(() => setMessage(null), 4000);
      onRefresh();
    } catch (err: any) {
      setMessage(`Simulation error: ${err.message}`);
    } finally {
      setSimulating(false);
    }
  };

  const handleRunSweeper = async () => {
    try {
      const res = await api.triggerDevSweep();
      setMessage(`Sweeper evaluated: ${res.unresolved_swept_count} expired response windows marked unresolved.`);
      setTimeout(() => setMessage(null), 4000);
      onRefresh();
    } catch (err: any) {
      setMessage(`Sweeper error: ${err.message}`);
    }
  };

  return (
    <div className="space-y-6">
      {/* Toast message */}
      {message && (
        <div className="p-3 bg-teal-50 dark:bg-teal-950/60 border border-teal-300 dark:border-teal-700 text-teal-950 dark:text-teal-200 rounded text-xs flex items-center justify-between shadow-xs">
          <span>{message}</span>
          <button onClick={() => setMessage(null)} className="font-bold text-sm px-1">×</button>
        </div>
      )}

      {/* Pinned Next Dose Hero Card */}
      {nextUpcoming ? (
        <div className="bg-white dark:bg-[#1E2226] border-2 border-[#0F5C5A] dark:border-[#1EB8B4] p-5 rounded-md shadow-sm">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold uppercase tracking-wider text-[#0F5C5A] dark:text-[#1EB8B4] flex items-center gap-1.5">
              <Clock className="w-4 h-4" /> Next Scheduled Dose
            </span>
            <div className="flex items-center gap-2">
              <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                {getTimeRemaining(nextUpcoming.scheduled_at)}
              </span>
              <span className="text-xs font-mono-numbers font-semibold text-[#4A5159] dark:text-[#9EABB5] bg-[#F7F5F0] dark:bg-[#121416] px-2 py-0.5 rounded border border-[#D9D5CA] dark:border-[#2E363D]">
                {new Date(nextUpcoming.scheduled_at).toLocaleTimeString([], {
                  hour: '2-digit',
                  minute: '2-digit',
                })}
              </span>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mt-2">
            <div>
              <h2 className="text-2xl font-bold text-[#1B1F23] dark:text-[#ECEFF1]">
                {nextUpcoming.medication_name}
              </h2>
              <p className="text-xs text-[#4A5159] dark:text-[#9EABB5] mt-0.5">
                Self-reported confirmation required. Outcome will be recorded on your permanent ledger.
              </p>
            </div>

            <button
              onClick={() => setSelectedEvent(nextUpcoming)}
              className="h-12 px-6 bg-[#0F5C5A] dark:bg-[#1EB8B4] hover:bg-teal-900 text-white dark:text-[#121416] font-semibold text-sm rounded shadow-xs transition-colors self-start sm:self-auto"
            >
              Record Dose
            </button>
          </div>
        </div>
      ) : events.length > 0 ? (
        <div className="bg-emerald-50/70 dark:bg-emerald-950/30 border border-emerald-300 dark:border-emerald-800 p-4 rounded-md flex items-center gap-3">
          <CheckCircle2 className="w-5 h-5 text-emerald-700 dark:text-emerald-400 flex-shrink-0" />
          <div className="text-xs text-emerald-950 dark:text-emerald-200">
            <span className="font-semibold block">All scheduled doses for today have been addressed!</span>
            <span>You can review or correct your logged entries in the timeline below or on the Dose History page.</span>
          </div>
        </div>
      ) : null}

      {/* Today's T/N/U Ledger Summary (Display Numbers) */}
      <div className="bg-white dark:bg-[#1E2226] border border-[#D9D5CA] dark:border-[#2E363D] rounded-md p-4">
        <div className="flex items-center justify-between mb-3 border-b border-[#D9D5CA] dark:border-[#2E363D] pb-2">
          <span className="text-xs font-bold uppercase tracking-wider text-[#4A5159] dark:text-[#9EABB5] flex items-center gap-1.5">
            <Calendar className="w-3.5 h-3.5" />
            Today's Ledger Overview
          </span>
          <span className="text-xs font-medium text-[#4A5159] dark:text-[#9EABB5]">
            {now.toLocaleDateString(undefined, { weekday: 'long', month: 'short', day: 'numeric' })}
          </span>
        </div>

        <div className="grid grid-cols-4 gap-2 text-center">
          <div className="p-3 bg-[#F7F5F0] dark:bg-[#121416] rounded border border-[#D9D5CA]/50 dark:border-[#2E363D]">
            <div className="text-[11px] font-semibold uppercase tracking-wider text-[#4A5159] dark:text-[#9EABB5]">Scheduled</div>
            <div className="text-3xl font-mono-numbers font-bold text-[#1B1F23] dark:text-[#ECEFF1] mt-0.5">
              {totalDoses}
            </div>
          </div>
          <div className="p-3 bg-[#1E6B3A]/10 dark:bg-[#2FA85C]/15 rounded border border-[#1E6B3A]/30 dark:border-[#2FA85C]/30">
            <div className="text-[11px] font-semibold uppercase tracking-wider text-[#1E6B3A] dark:text-[#2FA85C]">Taken</div>
            <div className="text-3xl font-mono-numbers font-bold text-[#1E6B3A] dark:text-[#2FA85C] mt-0.5">
              {takenCount}
            </div>
          </div>
          <div className="p-3 bg-[#8A2D2D]/10 dark:bg-[#C94A4A]/15 rounded border border-[#8A2D2D]/30 dark:border-[#C94A4A]/30">
            <div className="text-[11px] font-semibold uppercase tracking-wider text-[#8A2D2D] dark:text-[#C94A4A]">Skipped</div>
            <div className="text-3xl font-mono-numbers font-bold text-[#8A2D2D] dark:text-[#C94A4A] mt-0.5">
              {skippedCount}
            </div>
          </div>
          <div className="p-3 bg-[#7A5A00]/10 dark:bg-[#D4A017]/15 rounded border border-dashed border-[#7A5A00]/40 dark:border-[#D4A017]/40">
            <div className="text-[11px] font-semibold uppercase tracking-wider text-[#7A5A00] dark:text-[#D4A017]">Unresolved</div>
            <div className="text-3xl font-mono-numbers font-bold text-[#7A5A00] dark:text-[#D4A017] mt-0.5">
              {unresolvedCount}
            </div>
          </div>
        </div>
      </div>

      {/* Chronological Ledger Table */}
      <div className="bg-white dark:bg-[#1E2226] border border-[#D9D5CA] dark:border-[#2E363D] rounded-md overflow-hidden">
        <div className="px-4 py-3 bg-[#F7F5F0] dark:bg-[#252A2F] border-b border-[#D9D5CA] dark:border-[#2E363D] flex items-center justify-between">
          <h3 className="text-xs font-bold uppercase tracking-wider text-[#1B1F23] dark:text-[#ECEFF1]">
            Scheduled Timeline
          </h3>
          <div className="flex items-center gap-2">
            <button
              onClick={handleRunSweeper}
              title="Sweeps expired response windows to 'unresolved'"
              className="text-xs text-[#4A5159] dark:text-[#9EABB5] hover:text-[#1B1F23] dark:hover:text-[#ECEFF1] flex items-center gap-1 border border-neutral-300 dark:border-[#2E363D] rounded px-2.5 py-1 bg-white dark:bg-[#121416]"
            >
              <RefreshCw className="w-3 h-3" /> Sweeper
            </button>
            <button
              onClick={onRefresh}
              disabled={loading}
              className="text-xs text-[#0F5C5A] dark:text-[#1EB8B4] hover:underline flex items-center gap-1 font-semibold"
            >
              <RefreshCw className={`w-3 h-3 ${loading ? 'animate-spin' : ''}`} /> Refresh
            </button>
          </div>
        </div>

        {events.length === 0 ? (
          <div className="p-10 text-center text-[#4A5159] dark:text-[#9EABB5] space-y-2">
            <AlertCircle className="w-8 h-8 mx-auto text-neutral-400" />
            <p className="font-semibold text-sm">No scheduled doses for today.</p>
            <p className="text-xs">Add a medication schedule to populate your ledger.</p>
          </div>
        ) : (
          <div className="divide-y divide-[#D9D5CA] dark:divide-[#2E363D]">
            {sorted.map((ev) => {
              const timeStr = new Date(ev.scheduled_at).toLocaleTimeString([], {
                hour: '2-digit',
                minute: '2-digit',
              });

              return (
                <div
                  key={ev.id}
                  className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-[#F7F5F0]/60 dark:hover:bg-[#252A2F] transition-colors"
                >
                  <div className="flex items-start sm:items-center gap-3">
                    <span className="font-mono-numbers font-semibold text-sm text-[#4A5159] dark:text-[#9EABB5] w-16 pt-0.5 sm:pt-0">
                      {timeStr}
                    </span>
                    <div>
                      <div className="font-semibold text-base text-[#1B1F23] dark:text-[#ECEFF1] flex items-center gap-2">
                        <span>{ev.medication_name}</span>
                      </div>
                      <div className="text-xs text-[#4A5159] dark:text-[#9EABB5] mt-0.5">
                        {ev.responded_at ? (
                          <span>
                            Logged at {new Date(ev.responded_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </span>
                        ) : (
                          <span>Pending intake confirmation</span>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center justify-between sm:justify-end gap-3 w-full sm:w-auto">
                    <StatusBadge status={ev.status} isLate={ev.is_late} />

                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => setSelectedEvent(ev)}
                        className="px-3.5 py-1.5 bg-white dark:bg-[#121416] border border-[#0F5C5A] dark:border-[#1EB8B4] text-[#0F5C5A] dark:text-[#1EB8B4] hover:bg-[#0F5C5A] hover:text-white dark:hover:bg-[#1EB8B4] dark:hover:text-[#121416] rounded text-xs font-semibold transition-colors"
                      >
                        {ev.status === 'scheduled' ? 'Record' : 'Update'}
                      </button>

                      <button
                        onClick={() => handleSimulate(ev.id)}
                        disabled={simulating}
                        title="Simulate push/local reminder"
                        className="p-1.5 text-[#4A5159] dark:text-[#9EABB5] hover:text-[#0F5C5A] dark:hover:text-[#1EB8B4] border border-neutral-300 dark:border-[#2E363D] rounded hover:bg-neutral-50 dark:hover:bg-[#252A2F]"
                      >
                        <Play className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Response Sheet/Drawer */}
      {selectedEvent && (
        <ResponseDrawer
          event={selectedEvent}
          onClose={() => setSelectedEvent(null)}
          onActionComplete={onRefresh}
        />
      )}
    </div>
  );
};
