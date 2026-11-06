import React, { useState } from 'react';
import { Clock, Play, RefreshCw, AlertCircle } from 'lucide-react';
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

  // Separate upcoming vs past/current
  const now = new Date();
  const sorted = [...events].sort(
    (a, b) => new Date(a.scheduled_at).getTime() - new Date(b.scheduled_at).getTime()
  );

  const nextUpcoming = sorted.find(
    (e) => e.status === 'scheduled' && new Date(e.scheduled_at) >= now
  ) || sorted.find((e) => e.status === 'scheduled');

  const totalDoses = events.length;
  const takenCount = events.filter((e) => e.status === 'taken').length;
  const skippedCount = events.filter((e) => e.status === 'not_taken').length;
  const unresolvedCount = events.filter((e) => e.status === 'unresolved').length;

  const handleSimulate = async (eventId: string) => {
    setSimulating(true);
    try {
      const res = await api.simulateReminder(eventId);
      setMessage(`Simulated reminder fired! Attempt recorded.`);
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
      setMessage(`Sweeper evaluated: ${res.unresolved_swept_count} events marked unresolved.`);
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
        <div className="p-3 bg-teal-50 border border-[#0F5C5A]/30 text-[#0F5C5A] rounded text-xs flex items-center justify-between">
          <span>{message}</span>
          <button onClick={() => setMessage(null)} className="text-teal-900 font-bold">×</button>
        </div>
      )}

      {/* Pinned Next Dose Card */}
      {nextUpcoming && (
        <div className="bg-white border-2 border-[#0F5C5A] p-4 rounded-md shadow-sm">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold uppercase tracking-wider text-[#0F5C5A] flex items-center gap-1.5">
              <Clock className="w-3.5 h-3.5" /> Next Scheduled Dose
            </span>
            <span className="text-xs font-mono-numbers font-medium text-[#4A5159]">
              {new Date(nextUpcoming.scheduled_at).toLocaleTimeString([], {
                hour: '2-digit',
                minute: '2-digit',
              })}
            </span>
          </div>

          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-xl font-semibold text-[#1B1F23]">
                {nextUpcoming.medication_name}
              </h2>
              <p className="text-xs text-[#4A5159] mt-0.5">
                Self-reported outcome required
              </p>
            </div>

            <button
              onClick={() => setSelectedEvent(nextUpcoming)}
              className="h-11 px-5 bg-[#0F5C5A] hover:bg-teal-900 text-white font-medium text-sm rounded shadow-sm transition-colors"
            >
              Record Dose
            </button>
          </div>
        </div>
      )}

      {/* Today's T/N/U Ledger Summary */}
      <div className="bg-white border border-[#D9D5CA] rounded-md p-4">
        <div className="flex items-center justify-between mb-3 border-b border-[#D9D5CA] pb-2">
          <span className="text-xs font-bold uppercase tracking-wider text-[#4A5159]">
            Today's Ledger Overview
          </span>
          <span className="text-xs text-[#4A5159]">
            {now.toLocaleDateString(undefined, { weekday: 'long', month: 'short', day: 'numeric' })}
          </span>
        </div>

        <div className="grid grid-cols-4 gap-2 text-center">
          <div className="p-2 bg-[#F7F5F0] rounded">
            <div className="text-xs text-[#4A5159]">Scheduled</div>
            <div className="text-2xl font-mono-numbers font-semibold text-[#1B1F23]">
              {totalDoses}
            </div>
          </div>
          <div className="p-2 bg-[#1E6B3A]/10 rounded border border-[#1E6B3A]/20">
            <div className="text-xs text-[#1E6B3A] font-medium">Taken</div>
            <div className="text-2xl font-mono-numbers font-semibold text-[#1E6B3A]">
              {takenCount}
            </div>
          </div>
          <div className="p-2 bg-[#8A2D2D]/10 rounded border border-[#8A2D2D]/20">
            <div className="text-xs text-[#8A2D2D] font-medium">Skipped</div>
            <div className="text-2xl font-mono-numbers font-semibold text-[#8A2D2D]">
              {skippedCount}
            </div>
          </div>
          <div className="p-2 bg-[#7A5A00]/10 rounded border border-[#7A5A00]/20">
            <div className="text-xs text-[#7A5A00] font-medium">Unresolved</div>
            <div className="text-2xl font-mono-numbers font-semibold text-[#7A5A00]">
              {unresolvedCount}
            </div>
          </div>
        </div>
      </div>

      {/* Chronological Ledger Table */}
      <div className="bg-white border border-[#D9D5CA] rounded-md overflow-hidden">
        <div className="px-4 py-3 bg-[#F7F5F0] border-b border-[#D9D5CA] flex items-center justify-between">
          <h3 className="text-sm font-semibold uppercase tracking-wider text-[#1B1F23]">
            Scheduled Timeline
          </h3>
          <div className="flex items-center gap-2">
            <button
              onClick={handleRunSweeper}
              title="Sweeps expired response windows to 'unresolved'"
              className="text-xs text-[#4A5159] hover:text-[#1B1F23] flex items-center gap-1 border border-neutral-300 rounded px-2 py-1 bg-white"
            >
              <RefreshCw className="w-3 h-3" /> Sweeper
            </button>
            <button
              onClick={onRefresh}
              disabled={loading}
              className="text-xs text-[#0F5C5A] hover:underline flex items-center gap-1 font-medium"
            >
              <RefreshCw className={`w-3 h-3 ${loading ? 'animate-spin' : ''}`} /> Refresh
            </button>
          </div>
        </div>

        {events.length === 0 ? (
          <div className="p-8 text-center text-[#4A5159] space-y-2">
            <AlertCircle className="w-8 h-8 mx-auto text-neutral-400" />
            <p className="font-medium">No scheduled doses for today.</p>
            <p className="text-xs">Add a medication schedule to populate your ledger.</p>
          </div>
        ) : (
          <div className="divide-y divide-[#D9D5CA]">
            {sorted.map((ev) => {
              const timeStr = new Date(ev.scheduled_at).toLocaleTimeString([], {
                hour: '2-digit',
                minute: '2-digit',
              });

              return (
                <div
                  key={ev.id}
                  className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-[#F7F5F0]/50 transition-colors"
                >
                  <div className="flex items-start sm:items-center gap-3">
                    <span className="font-mono-numbers font-medium text-sm text-[#4A5159] w-16 pt-0.5 sm:pt-0">
                      {timeStr}
                    </span>
                    <div>
                      <div className="font-semibold text-base text-[#1B1F23]">
                        {ev.medication_name}
                      </div>
                      <div className="text-xs text-[#4A5159]">
                        {ev.is_synthetic && (
                          <span className="text-amber-800 font-medium mr-2">Synthetic</span>
                        )}
                        {ev.responded_at && (
                          <span>
                            Logged at {new Date(ev.responded_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center justify-between sm:justify-end gap-3 w-full sm:w-auto">
                    <StatusBadge status={ev.status} isLate={ev.is_late} />

                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => setSelectedEvent(ev)}
                        className="px-3 py-1.5 bg-[#FFFFFF] border border-[#0F5C5A] text-[#0F5C5A] hover:bg-[#0F5C5A] hover:text-white rounded text-xs font-medium transition-colors"
                      >
                        {ev.status === 'scheduled' ? 'Record' : 'Update'}
                      </button>

                      <button
                        onClick={() => handleSimulate(ev.id)}
                        disabled={simulating}
                        title="Simulate push/local reminder"
                        className="p-1.5 text-[#4A5159] hover:text-[#0F5C5A] border border-neutral-300 rounded hover:bg-neutral-50"
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
