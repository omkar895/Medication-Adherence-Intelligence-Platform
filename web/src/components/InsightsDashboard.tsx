import React, { useState, useEffect } from 'react';
import {
  ShieldAlert,
  ThumbsUp,
  ThumbsDown,
  Calendar,
  Copy,
  LayoutGrid,
  Send,
  MessageSquare,
  AlertCircle,
  X,
  Phone,
} from 'lucide-react';
import { PeriodSummary, Insight, DoseEvent, api } from '../services/api';

interface Props {
  insights: Insight[];
  onRefresh: () => void;
}

interface DayCell {
  date: string;
  dayOfWeek: number; // 0-6 (Sun-Sat)
  S: number;
  T: number;
  N: number;
  U: number;
  late: number;
  status: 'taken' | 'delayed' | 'missed' | 'empty';
}

export const InsightsDashboard: React.FC<Props> = ({ insights, onRefresh }) => {
  const [days, setDays] = useState<number>(30);
  const [summary, setSummary] = useState<PeriodSummary | null>(null);
  const [medSummaries, setMedSummaries] = useState<any[]>([]);
  const [allEvents, setAllEvents] = useState<DoseEvent[]>([]);
  const [selectedDayCell, setSelectedDayCell] = useState<DayCell | null>(null);
  const [loading, setLoading] = useState(true);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // WhatsApp report state
  const [caretakerPhone, setCaretakerPhone] = useState<string>('');
  const [showWhatsAppModal, setShowWhatsAppModal] = useState<boolean>(false);

  useEffect(() => {
    loadAnalytics();
  }, [days]);

  const loadAnalytics = async () => {
    setLoading(true);
    try {
      const now = new Date();
      const startDate = new Date(now.getTime() - days * 24 * 3600 * 1000).toISOString();
      const [sumData, medData, eventsData] = await Promise.all([
        api.getSummary(days),
        api.getMedicationSummaries(days),
        api.listDoseEvents({ start_date: startDate, limit: 200 }),
      ]);
      setSummary(sumData);
      setMedSummaries(medData);
      setAllEvents(eventsData || []);
    } catch (err: any) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  // Build the GitHub-style block matrix data for the selected period
  const buildHeatmapGrid = (): DayCell[] => {
    const cells: DayCell[] = [];
    const now = new Date();
    
    // Build day map from events
    const dayMap = new Map<string, { S: number; T: number; N: number; U: number; late: number }>();
    for (const ev of allEvents) {
      const dStr = new Date(ev.scheduled_at).toISOString().split('T')[0];
      if (!dayMap.has(dStr)) {
        dayMap.set(dStr, { S: 0, T: 0, N: 0, U: 0, late: 0 });
      }
      const entry = dayMap.get(dStr)!;
      entry.S += 1;
      if (ev.status === 'taken') {
        entry.T += 1;
        if (ev.is_late) entry.late += 1;
      } else if (ev.status === 'not_taken') {
        entry.N += 1;
      } else if (ev.status === 'unresolved') {
        entry.U += 1;
      }
    }

    // Generate consecutive days ending today
    for (let i = days - 1; i >= 0; i--) {
      const d = new Date(now.getTime() - i * 24 * 3600 * 1000);
      const dStr = d.toISOString().split('T')[0];
      const entry = dayMap.get(dStr) || { S: 0, T: 0, N: 0, U: 0, late: 0 };
      
      let status: 'taken' | 'delayed' | 'missed' | 'empty' = 'empty';
      if (entry.S > 0) {
        if (entry.N > 0 || entry.U > 0) {
          status = 'missed'; // Red block for missed / skipped / unresolved
        } else if (entry.late > 0) {
          status = 'delayed'; // Yellow block for delayed / late intake
        } else if (entry.T > 0) {
          status = 'taken'; // Green block for confirmed taken
        }
      }

      cells.push({
        date: dStr,
        dayOfWeek: d.getDay(),
        S: entry.S,
        T: entry.T,
        N: entry.N,
        U: entry.U,
        late: entry.late,
        status,
      });
    }

    return cells;
  };

  const heatmapCells = buildHeatmapGrid();

  const handleDismiss = async (id: string) => {
    try {
      await api.dismissInsight(id);
      onRefresh();
    } catch (err: any) {
      alert(err.message);
    }
  };

  const handleFeedback = async (id: string, useful: boolean) => {
    try {
      await api.feedbackInsight(id, useful);
      onRefresh();
    } catch (err: any) {
      alert(err.message);
    }
  };

  const generateReportText = () => {
    if (!summary) return '';
    return (
      `*MEDICATION ADHERENCE REPORT (MAIP LEDGER)*\n` +
      `📅 Period: ${summary.start_date} to ${summary.end_date} (${days} days)\n` +
      `------------------------------------\n` +
      `✅ Confirmed Taken: ${summary.T} / ${summary.S} (${summary.confirmed_pct ?? 0}%)\n` +
      `❌ Reported Skipped: ${summary.N}\n` +
      `⚠️ Unresolved Window: ${summary.U}\n` +
      `📊 Record Coverage: ${summary.outcome_coverage_pct ?? 0}%\n` +
      `------------------------------------\n` +
      `*Active Medications:*\n` +
      medSummaries.map((m) => `• ${m.display_name}: ${m.T}/${m.S} taken (${m.confirmed_pct ?? 0}%)`).join('\n') +
      `\n------------------------------------\n` +
      `_Note: Self-reported patient intake ledger._`
    );
  };

  const handleCopyClinicalSummary = () => {
    const reportText = generateReportText();
    navigator.clipboard.writeText(reportText);
    setToastMessage('Clinical adherence report formatted and copied to clipboard.');
    setTimeout(() => setToastMessage(null), 4000);
  };

  const handleSendWhatsApp = (e: React.FormEvent) => {
    e.preventDefault();
    const cleanNumber = caretakerPhone.replace(/[^0-9]/g, '');
    const reportText = generateReportText();
    const encoded = encodeURIComponent(reportText);
    const url = cleanNumber ? `https://wa.me/${cleanNumber}?text=${encoded}` : `https://wa.me/?text=${encoded}`;
    window.open(url, '_blank');
    setShowWhatsAppModal(false);
  };

  return (
    <div className="space-y-6">
      {/* Toast Alert */}
      {toastMessage && (
        <div className="p-3 bg-teal-50 dark:bg-teal-950/60 border border-teal-300 dark:border-teal-700 text-teal-900 dark:text-teal-200 rounded text-xs flex justify-between items-center shadow-xs">
          <span>{toastMessage}</span>
          <button onClick={() => setToastMessage(null)} className="font-bold text-sm px-1">×</button>
        </div>
      )}

      {/* Horizon Filter & WhatsApp Sharing Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white dark:bg-[#1E2226] p-4 rounded-md border border-[#D9D5CA] dark:border-[#2E363D]">
        <div className="flex items-center gap-2">
          <Calendar className="w-4 h-4 text-[#0F5C5A] dark:text-[#1EB8B4]" />
          <span className="text-xs font-bold uppercase tracking-wider text-[#4A5159] dark:text-[#9EABB5]">
            Horizon:
          </span>
          <div className="flex gap-1.5 ml-1">
            {[7, 14, 30, 60].map((d) => (
              <button
                key={d}
                onClick={() => setDays(d)}
                className={`px-3 py-1 rounded text-xs font-semibold transition-colors ${
                  days === d
                    ? 'bg-[#0F5C5A] dark:bg-[#1EB8B4] text-white dark:text-[#121416]'
                    : 'bg-[#F7F5F0] dark:bg-[#2E363D] text-[#4A5159] dark:text-[#ECEFF1] hover:bg-neutral-200 dark:hover:bg-neutral-700'
                }`}
              >
                {d}d
              </button>
            ))}
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowWhatsAppModal(true)}
            disabled={!summary || summary.S === 0}
            className="px-3.5 py-1.5 bg-[#25D366] hover:bg-[#1EBE5D] text-white rounded text-xs font-semibold flex items-center gap-1.5 shadow-xs disabled:opacity-50 transition-colors"
          >
            <Send className="w-3.5 h-3.5" />
            <span>WhatsApp Caretaker</span>
          </button>

          <button
            onClick={handleCopyClinicalSummary}
            disabled={!summary || summary.S === 0}
            className="px-3 py-1.5 bg-[#F7F5F0] dark:bg-[#2E363D] hover:bg-neutral-200 dark:hover:bg-neutral-700 border border-[#D9D5CA] dark:border-[#2E363D] text-[#0F5C5A] dark:text-[#1EB8B4] rounded text-xs font-semibold flex items-center gap-1.5 disabled:opacity-50 transition-colors"
          >
            <Copy className="w-3.5 h-3.5" />
            <span>Copy Summary</span>
          </button>
        </div>
      </div>

      {/* GitHub-style Block Graph Matrix Heatmap */}
      <div className="bg-white dark:bg-[#1E2226] border border-[#D9D5CA] dark:border-[#2E363D] rounded-md p-5 space-y-4 shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-[#D9D5CA] dark:border-[#2E363D] pb-3">
          <div className="flex items-center gap-2">
            <LayoutGrid className="w-4 h-4 text-[#0F5C5A] dark:text-[#1EB8B4]" />
            <h3 className="text-xs font-bold uppercase tracking-wider text-[#1B1F23] dark:text-[#ECEFF1]">
              Adherence Block Matrix ({days}-Day Activity)
            </h3>
          </div>

          {/* GitHub-style legend */}
          <div className="flex items-center gap-3 text-[11px] font-medium">
            <span className="flex items-center gap-1.5">
              <span className="w-3 h-3 rounded-xs bg-[#1E6B3A] dark:bg-[#2FA85C] inline-block shadow-2xs" />
              <span className="text-[#1E6B3A] dark:text-[#2FA85C]">Taken</span>
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-3 h-3 rounded-xs bg-[#D4A017] dark:bg-[#F1B638] inline-block shadow-2xs" />
              <span className="text-[#7A5A00] dark:text-[#F1B638]">Delayed</span>
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-3 h-3 rounded-xs bg-[#8A2D2D] dark:bg-[#E56363] inline-block shadow-2xs" />
              <span className="text-[#8A2D2D] dark:text-[#E56363]">Missed</span>
            </span>
            <span className="flex items-center gap-1.5 text-neutral-400">
              <span className="w-3 h-3 rounded-xs bg-neutral-200 dark:bg-neutral-800 border border-neutral-300 dark:border-neutral-700 inline-block" />
              <span>None</span>
            </span>
          </div>
        </div>

        {/* Heatmap Grid of Squares */}
        <div className="overflow-x-auto py-2">
          <div className="flex flex-wrap gap-2 min-w-[320px]">
            {heatmapCells.map((cell) => {
              let bgClass = 'bg-neutral-200 dark:bg-neutral-800 border border-neutral-300 dark:border-neutral-700';
              if (cell.status === 'taken') {
                bgClass = 'bg-[#1E6B3A] dark:bg-[#2FA85C] border border-[#16522c] hover:brightness-110';
              } else if (cell.status === 'delayed') {
                bgClass = 'bg-[#D4A017] dark:bg-[#F1B638] border border-[#a87d0d] hover:brightness-110';
              } else if (cell.status === 'missed') {
                bgClass = 'bg-[#8A2D2D] dark:bg-[#E56363] border border-[#6e2323] hover:brightness-110';
              }

              const isSelected = selectedDayCell?.date === cell.date;

              return (
                <button
                  key={cell.date}
                  onClick={() => setSelectedDayCell(cell)}
                  title={`${cell.date}: Scheduled=${cell.S}, Taken=${cell.T}, Delayed=${cell.late}, Missed=${cell.N + cell.U}`}
                  className={`w-7 h-7 sm:w-8 sm:h-8 rounded-sm ${bgClass} transition-all transform hover:scale-110 focus:outline-none flex flex-col items-center justify-center ${
                    isSelected ? 'ring-2 ring-[#0F5C5A] dark:ring-[#1EB8B4] scale-110' : ''
                  }`}
                >
                  <span className="text-[9px] font-mono font-bold text-white/90 drop-shadow-xs">
                    {new Date(cell.date + 'T00:00:00Z').getDate()}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Interactive block inspection drawer / pill */}
        {selectedDayCell && (
          <div className="p-3.5 bg-[#F7F5F0] dark:bg-[#121416] border border-[#D9D5CA] dark:border-[#2E363D] rounded flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs animate-in fade-in duration-150">
            <div>
              <span className="font-bold text-[#1B1F23] dark:text-[#ECEFF1]">
                {new Date(selectedDayCell.date + 'T00:00:00Z').toLocaleDateString(undefined, {
                  weekday: 'long',
                  month: 'short',
                  day: 'numeric',
                })}
              </span>
              <span className="ml-2 font-mono-numbers text-[#4A5159] dark:text-[#9EABB5]">
                Scheduled: {selectedDayCell.S} doses
              </span>
            </div>

            <div className="flex items-center gap-3">
              <span className="text-[#1E6B3A] dark:text-[#2FA85C] font-semibold">
                ✓ {selectedDayCell.T} Taken {selectedDayCell.late > 0 && `(${selectedDayCell.late} Late)`}
              </span>
              <span>·</span>
              <span className="text-[#8A2D2D] dark:text-[#E56363] font-semibold">
                ✕ {selectedDayCell.N} Skipped
              </span>
              <span>·</span>
              <span className="text-[#7A5A00] dark:text-[#F1B638] font-semibold">
                ◌ {selectedDayCell.U} Unresolved
              </span>
              <button
                onClick={() => setSelectedDayCell(null)}
                className="text-[#4A5159] hover:text-[#1B1F23] ml-2 font-bold"
              >
                ×
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Metrics Ledger with Transparent Denominators */}
      {summary && (
        <div className="bg-white dark:bg-[#1E2226] border border-[#D9D5CA] dark:border-[#2E363D] rounded-md p-5 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-[#D9D5CA] dark:border-[#2E363D] pb-3">
            <div>
              <span className="text-xs font-bold uppercase tracking-wider text-[#4A5159] dark:text-[#9EABB5]">
                Adherence Rate & Denominator Audit
              </span>
              <div className="text-xs text-[#4A5159] dark:text-[#9EABB5]">
                Period: {summary.start_date} to {summary.end_date} (Total scheduled: {summary.S})
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="p-3 bg-[#1E6B3A]/5 dark:bg-[#2FA85C]/10 border border-[#1E6B3A]/30 dark:border-[#2FA85C]/30 rounded">
              <span className="text-xs font-semibold text-[#1E6B3A] dark:text-[#2FA85C] uppercase tracking-wider">
                Confirmed Taken
              </span>
              <div className="text-3xl font-mono-numbers font-bold text-[#1E6B3A] dark:text-[#2FA85C] mt-1">
                {summary.confirmed_pct !== null ? `${summary.confirmed_pct}%` : 'N/A'}
              </div>
              <div className="text-xs text-[#4A5159] dark:text-[#9EABB5] mt-1 font-mono-numbers">
                {summary.T} / {summary.S} doses
              </div>
            </div>

            <div className="p-3 bg-[#8A2D2D]/5 dark:bg-[#C94A4A]/10 border border-[#8A2D2D]/30 dark:border-[#C94A4A]/30 rounded">
              <span className="text-xs font-semibold text-[#8A2D2D] dark:text-[#C94A4A] uppercase tracking-wider">
                Reported Skipped
              </span>
              <div className="text-3xl font-mono-numbers font-bold text-[#8A2D2D] dark:text-[#C94A4A] mt-1">
                {summary.not_taken_pct !== null ? `${summary.not_taken_pct}%` : 'N/A'}
              </div>
              <div className="text-xs text-[#4A5159] dark:text-[#9EABB5] mt-1 font-mono-numbers">
                {summary.N} / {summary.S} doses
              </div>
            </div>

            <div className="p-3 bg-[#7A5A00]/5 dark:bg-[#D4A017]/10 border border-dashed border-[#7A5A00]/40 dark:border-[#D4A017]/40 rounded">
              <span className="text-xs font-semibold text-[#7A5A00] dark:text-[#D4A017] uppercase tracking-wider">
                Unresolved Record
              </span>
              <div className="text-3xl font-mono-numbers font-bold text-[#7A5A00] dark:text-[#D4A017] mt-1">
                {summary.unresolved_pct !== null ? `${summary.unresolved_pct}%` : 'N/A'}
              </div>
              <div className="text-xs text-[#4A5159] dark:text-[#9EABB5] mt-1 font-mono-numbers">
                {summary.U} / {summary.S} doses
              </div>
            </div>

            <div className="p-3 bg-neutral-100 dark:bg-neutral-800 border border-neutral-300 dark:border-neutral-700 rounded">
              <span className="text-xs font-semibold text-neutral-800 dark:text-neutral-200 uppercase tracking-wider">
                Outcome Coverage
              </span>
              <div className="text-3xl font-mono-numbers font-bold text-neutral-900 dark:text-neutral-100 mt-1">
                {summary.outcome_coverage_pct !== null ? `${summary.outcome_coverage_pct}%` : 'N/A'}
              </div>
              <div className="text-xs text-[#4A5159] dark:text-[#9EABB5] mt-1 font-mono-numbers">
                ({summary.T} + {summary.N}) / {summary.S}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Per-Medication Ledger Breakdown */}
      <div className="bg-white dark:bg-[#1E2226] border border-[#D9D5CA] dark:border-[#2E363D] rounded-md overflow-hidden">
        <div className="px-4 py-3 bg-[#F7F5F0] dark:bg-[#252A2F] border-b border-[#D9D5CA] dark:border-[#2E363D]">
          <h3 className="text-xs font-bold uppercase tracking-wider text-[#1B1F23] dark:text-[#ECEFF1]">
            Per-Medication Breakdown
          </h3>
        </div>
        <div className="divide-y divide-[#D9D5CA] dark:divide-[#2E363D]">
          {medSummaries.map((m) => (
            <div key={m.medication_id} className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <div className="font-semibold text-sm text-[#1B1F23] dark:text-[#ECEFF1]">{m.display_name}</div>
                <div className="text-xs text-[#4A5159] dark:text-[#9EABB5] font-mono-numbers mt-0.5">
                  Scheduled (S): {m.S} · Taken (T): {m.T} · Skipped (N): {m.N} · Unresolved (U): {m.U}
                </div>
              </div>
              <div className="text-right">
                <div className="text-xs font-bold text-[#1E6B3A] dark:text-[#2FA85C]">
                  {m.confirmed_pct !== null ? `${m.confirmed_pct}%` : 'No doses'}
                </div>
                <div className="text-[10px] text-[#4A5159] dark:text-[#9EABB5]">Confirmed Intake</div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* WhatsApp Sharing Modal */}
      {showWhatsAppModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-150">
          <div className="bg-white dark:bg-[#1E2226] max-w-md w-full rounded-md border border-[#D9D5CA] dark:border-[#2E363D] shadow-2xl overflow-hidden">
            <div className="bg-[#25D366] text-white p-5 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <MessageSquare className="w-5 h-5" />
                <h3 className="font-bold text-base">Send Adherence Report to WhatsApp</h3>
              </div>
              <button onClick={() => setShowWhatsAppModal(false)} className="text-white text-xl font-bold">×</button>
            </div>

            <form onSubmit={handleSendWhatsApp} className="p-6 space-y-4 text-xs">
              <div>
                <label className="block text-xs font-semibold text-[#4A5159] dark:text-[#9EABB5] mb-1">
                  Caretaker Mobile Phone Number (with Country Code)
                </label>
                <div className="flex items-center border border-[#D9D5CA] dark:border-[#2E363D] rounded px-3 py-2 bg-white dark:bg-[#121416]">
                  <Phone className="w-4 h-4 text-neutral-400 mr-2" />
                  <input
                    type="text"
                    required
                    placeholder="e.g. 919876543210 or 14155552671"
                    value={caretakerPhone}
                    onChange={(e) => setCaretakerPhone(e.target.value)}
                    className="w-full bg-transparent text-[#1B1F23] dark:text-[#ECEFF1] focus:outline-none"
                  />
                </div>
                <span className="text-[10px] text-neutral-500 mt-1 block">
                  Tip: Enter 10 to 12 digits including country code (e.g., 91 for India).
                </span>
              </div>

              <div>
                <label className="block text-[11px] uppercase tracking-wider font-semibold text-[#4A5159] dark:text-[#9EABB5] mb-1">
                  Preview of Report to be Sent:
                </label>
                <pre className="p-3 bg-[#F7F5F0] dark:bg-[#121416] border border-[#D9D5CA] dark:border-[#2E363D] rounded text-[11px] text-[#1B1F23] dark:text-[#ECEFF1] whitespace-pre-wrap font-mono leading-relaxed max-h-48 overflow-y-auto">
                  {generateReportText()}
                </pre>
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowWhatsAppModal(false)}
                  className="px-4 py-2 border border-neutral-300 dark:border-neutral-700 text-[#4A5159] dark:text-[#9EABB5] rounded"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-[#25D366] hover:bg-[#1EBE5D] text-white rounded font-semibold flex items-center gap-1.5"
                >
                  <Send className="w-3.5 h-3.5" />
                  Open in WhatsApp
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Deterministic R1 Insights Section */}
      <div className="space-y-3">
        <div className="flex items-center gap-2">
          <ShieldAlert className="w-4 h-4 text-[#0F5C5A] dark:text-[#1EB8B4]" />
          <h3 className="text-sm font-bold uppercase tracking-wider text-[#1B1F23] dark:text-[#ECEFF1]">
            Pattern Insights (Rule R1)
          </h3>
        </div>

        {insights.length === 0 ? (
          <div className="bg-white dark:bg-[#1E2226] border border-[#D9D5CA] dark:border-[#2E363D] rounded-md p-6 text-center text-[#4A5159] dark:text-[#9EABB5] text-xs">
            No pattern thresholds detected. Rule R1 requires ≥ 4 comparable scheduled events across ≥ 2 calendar weeks with ≥ 3 unresolved entries.
          </div>
        ) : (
          insights.map((ins) => (
            <div
              key={ins.id}
              className="bg-white dark:bg-[#1E2226] border-2 border-amber-300 dark:border-amber-700 rounded-md p-5 space-y-3 shadow-xs"
            >
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-2">
                  <span className="px-2 py-0.5 bg-amber-100 dark:bg-amber-950 text-amber-900 dark:text-amber-200 border border-amber-300 dark:border-amber-700 rounded text-xs font-bold font-mono">
                    RULE R1: Unresolved Cluster
                  </span>
                  <span className="text-xs font-semibold text-neutral-800 dark:text-neutral-200">
                    {ins.medication_name}
                  </span>
                </div>
                <button
                  onClick={() => handleDismiss(ins.id)}
                  title="Dismiss insight"
                  className="text-[#4A5159] dark:text-[#9EABB5] hover:text-[#1B1F23] text-sm"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <p className="text-sm text-[#1B1F23] dark:text-[#ECEFF1] leading-relaxed">
                {ins.description}
              </p>

              <div className="p-3 bg-[#F7F5F0] dark:bg-[#252A2F] rounded text-xs text-[#4A5159] dark:text-[#9EABB5] space-y-1">
                <span className="font-semibold block text-[11px] uppercase tracking-wider text-[#1B1F23] dark:text-[#ECEFF1]">
                  Supporting Recorded Evidence:
                </span>
                <p>
                  Linked to {ins.evidence_event_ids.length} specific dose records in your ledger between{' '}
                  {ins.date_range.start} and {ins.date_range.end}.
                </p>
              </div>

              <div className="flex items-center justify-between pt-2 border-t border-[#D9D5CA] dark:border-[#2E363D]">
                <span className="text-xs text-[#4A5159] dark:text-[#9EABB5]">Is this record pattern helpful?</span>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => handleFeedback(ins.id, true)}
                    className={`px-3 py-1 text-xs rounded border flex items-center gap-1 ${
                      ins.useful === true
                        ? 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 border-emerald-300 dark:border-emerald-700'
                        : 'border-neutral-300 dark:border-neutral-600 text-[#4A5159] dark:text-[#9EABB5] hover:bg-neutral-50 dark:hover:bg-neutral-800'
                    }`}
                  >
                    <ThumbsUp className="w-3 h-3" /> Useful
                  </button>
                  <button
                    onClick={() => handleFeedback(ins.id, false)}
                    className={`px-3 py-1 text-xs rounded border flex items-center gap-1 ${
                      ins.useful === false
                        ? 'bg-rose-50 dark:bg-rose-950/60 text-rose-800 dark:text-rose-300 border-rose-300 dark:border-rose-700'
                        : 'border-neutral-300 dark:border-neutral-600 text-[#4A5159] dark:text-[#9EABB5] hover:bg-neutral-50 dark:hover:bg-neutral-800'
                    }`}
                  >
                    <ThumbsDown className="w-3 h-3" /> Not useful
                  </button>
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};
