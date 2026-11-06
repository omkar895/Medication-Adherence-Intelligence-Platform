import React from 'react';
import { Bell, Check, X, Clock, Volume2 } from 'lucide-react';
import { DoseEvent } from '../services/api';

interface Props {
  event: DoseEvent;
  onTake: (eventId: string) => void;
  onSkip: (eventId: string) => void;
  onSnooze: (eventId: string) => void;
  onDismiss: () => void;
}

export const ActiveMedicationAlert: React.FC<Props> = ({
  event,
  onTake,
  onSkip,
  onSnooze,
  onDismiss,
}) => {
  const timeStr = new Date(event.scheduled_at).toLocaleTimeString([], {
    hour: '2-digit',
    minute: '2-digit',
  });

  return (
    <div className="bg-[#0F5C5A] dark:bg-[#0A4240] text-white border-b-2 border-amber-400 px-4 py-3 shadow-lg animate-in slide-in-from-top duration-200">
      <div className="max-w-4xl mx-auto flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-amber-400 text-teal-950 flex items-center justify-center animate-bounce">
            <Bell className="w-5 h-5 fill-current" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-[10px] uppercase font-bold tracking-wider bg-amber-400 text-teal-950 px-1.5 py-0.2 rounded font-mono">
                SCHEDULED DOSE DUE ({timeStr})
              </span>
              <Volume2 className="w-3.5 h-3.5 text-teal-200" />
            </div>
            <h4 className="text-base font-bold text-white mt-0.5">
              It is time for your {event.medication_name}
            </h4>
          </div>
        </div>

        <div className="flex items-center gap-2 self-start sm:self-auto">
          <button
            onClick={() => onTake(event.id)}
            className="px-4 py-2 bg-[#1E6B3A] hover:bg-[#16522c] text-white rounded text-xs font-bold flex items-center gap-1.5 shadow-xs transition-colors"
          >
            <Check className="w-4 h-4 stroke-[3]" />
            <span>Mark Taken</span>
          </button>

          <button
            onClick={() => onSnooze(event.id)}
            className="px-3 py-2 bg-white/20 hover:bg-white/30 text-white rounded text-xs font-semibold flex items-center gap-1 transition-colors"
          >
            <Clock className="w-3.5 h-3.5" />
            <span>Snooze (15m)</span>
          </button>

          <button
            onClick={() => onSkip(event.id)}
            className="px-3 py-2 bg-red-800/80 hover:bg-red-900 text-white rounded text-xs font-semibold flex items-center gap-1 transition-colors"
          >
            <X className="w-3.5 h-3.5" />
            <span>Skip</span>
          </button>

          <button
            onClick={onDismiss}
            className="text-white/70 hover:text-white p-1 text-base font-bold"
            title="Dismiss alert"
          >
            ×
          </button>
        </div>
      </div>
    </div>
  );
};

