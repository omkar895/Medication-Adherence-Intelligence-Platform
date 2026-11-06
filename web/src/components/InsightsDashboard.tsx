import React, { useState, useEffect } from 'react';
import {
  ShieldAlert,
  Check,
  X,
  ThumbsUp,
  ThumbsDown,
  AlertCircle,
  Info,
  Calendar,
  Share2,
  Copy,
  TrendingUp,
} from 'lucide-react';
import { PeriodSummary, Insight, api } from '../services/api';

interface Props {
  insights: Insight[];
  onRefresh: () => void;
}

interface TrendDay {
  date: string;
  S: number;
  T: number;
  N: number;
  U: number;
}

export const InsightsDashboard: React.FC<Props> = ({ insights, onRefresh }) => {
  const [days, setDays] = useState<number>(30);
  const [summary, setSummary] = useState<PeriodSummary | null>(null);
  const [medSummaries, setMedSummaries] = useState<any[]>([]);
  const [trends, setTrends] = useState<TrendDay[]>([]);
  const [loading, setLoading] = useState(true);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  useEffect(() => {
    loadAnalytics();
  }, [days]);

  const loadAnalytics = async () => {
    setLoading(true);
    try {
      const [sumData, medData, trendData] = await Promise.all([
        api.getSummary(days),
        api.getMedicationSummaries(days),
        api.getTrends(days <= 14 ? 14 : days <= 30 ? 30 : 60),
      ]);
      setSummary(sumData);
      setMedSummaries(medData);
      setTrends(trendData || []);
    } catch (err: any) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

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

  const handleCopyClinicalSummary = () => {
    if (!summary) return;
    const lines = [
      '====================================================',
      'MEDICATION ADHERENCE CLINICAL SUMMARY (MAIP LEDGER)',
      '====================================================',
      `Reporting Horizon: ${summary.start_date} to ${summary.end_date} (${days} days)`,
      `Total Scheduled Doses (S): ${summary.S}`,
      `Confirmed Taken (T): ${summary.T} (${summary.confirmed_pct !== null ? summary.confirmed_pct + '%' : 'N/A'}) [Self-reported]`,
      `Reported Skipped (N): ${summary.N} (${summary.not_taken_pct !== null ? summary.not_taken_pct + '%' : 'N/A'})`,
      `Unresolved Window (U): ${summary.U} (${summary.unresolved_pct !== null ? summary.unresolved_pct + '%' : 'N/A'})`,
      `Outcome Coverage: ${summary.outcome_coverage_pct !== null ? summary.outcome_coverage_pct + '%' : 'N/A'}`,
      '----------------------------------------------------',
      'PER-MEDICATION BREAKDOWN:',
      ...medSummaries.map(
        (m) =>
          `• ${m.display_name}: S=${m.S}, Taken=${m.T} (${m.confirmed_pct !== null ? m.confirmed_pct + '%' : 'N/A'}), Skipped=${m.N}, Unresolved=${m.U}`
      ),
      '----------------------------------------------------',
      'DISCLOSURE:',
      'Based solely on self-reported inputs recorded in this application.',
      'Does not constitute verified medical dispensing records.',
      '====================================================',
    ];

    navigator.clipboard.writeText(lines.join('\n'));
    setToastMessage('Clinical summary formatted and copied to clipboard.');
    setTimeout(() => setToastMessage(null), 4000);
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

      {/* Horizon Filter & Export Action */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white dark:bg-[#1E2226] p-3 rounded-md border border-[#D9D5CA] dark:border-[#2E363D]">
        <div className="flex items-center gap-2">
          <Calendar className="w-4 h-4 text-[#0F5C5A] dark:text-[#1EB8B4]" />
          <span className="text-xs font-semibold uppercase tracking-wider text-[#4A5159] dark:text-[#9EABB5]">
            Reporting Horizon:
          </span>
          <div className="flex gap-1.5 ml-1">
            {[7, 14, 30, 90].map((d) => (
              <button
                key={d}
                onClick={() => setDays(d)}
                className={`px-3 py-1 rounded text-xs font-medium transition-colors ${
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

        <button
          onClick={handleCopyClinicalSummary}
          disabled={!summary || summary.S === 0}
          className="px-3 py-1.5 bg-[#F7F5F0] dark:bg-[#2E363D] hover:bg-neutral-200 dark:hover:bg-neutral-700 border border-[#D9D5CA] dark:border-[#2E363D] text-[#0F5C5A] dark:text-[#1EB8B4] rounded text-xs font-medium flex items-center gap-1.5 self-start sm:self-auto disabled:opacity-50"
        >
          <Copy className="w-3.5 h-3.5" />
          <span>Copy Clinical Summary</span>
        </button>
      </div>

      {/* Metrics Ledger with Transparent Denominators */}
      {summary && (
        <div className="bg-white dark:bg-[#1E2226] border border-[#D9D5CA] dark:border-[#2E363D] rounded-md p-5 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-[#D9D5CA] dark:border-[#2E363D] pb-3">
            <div>
              <span className="text-xs font-bold uppercase tracking-wider text-[#4A5159] dark:text-[#9EABB5]">
                Record Coverage & Adherence Ledger
              </span>
              <div className="text-xs text-[#4A5159] dark:text-[#9EABB5]">
                Period: {summary.start_date} to {summary.end_date} (Total scheduled doses: {summary.S})
              </div>
            </div>
            {summary.small_sample_warning && (
              <span className="text-[11px] bg-amber-100 dark:bg-amber-950 text-amber-900 dark:text-amber-200 border border-amber-300 dark:border-amber-700 px-2 py-0.5 rounded self-start sm:self-auto">
                Small sample size (&lt; 10 doses)
              </span>
            )}
          </div>

          {summary.S === 0 ? (
            <div className="p-6 text-center text-[#4A5159] dark:text-[#9EABB5]">
              <p className="font-semibold text-base">No scheduled doses</p>
              <p className="text-xs mt-1">No percentage is calculated when the denominator is zero.</p>
            </div>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {/* Confirmed Rate */}
              <div className="p-3 bg-[#1E6B3A]/5 dark:bg-[#2FA85C]/10 border border-[#1E6B3A]/30 dark:border-[#2FA85C]/30 rounded">
                <span className="text-xs font-medium text-[#1E6B3A] dark:text-[#2FA85C] uppercase tracking-wider">
                  Confirmed Intake
                </span>
                <div className="text-3xl font-mono-numbers font-bold text-[#1E6B3A] dark:text-[#2FA85C] mt-1">
                  {summary.confirmed_pct !== null ? `${summary.confirmed_pct}%` : 'N/A'}
                </div>
                <div className="text-xs text-[#4A5159] dark:text-[#9EABB5] mt-1 font-mono-numbers">
                  {summary.T} / {summary.S} doses
                </div>
              </div>

              {/* Not Taken Rate */}
              <div className="p-3 bg-[#8A2D2D]/5 dark:bg-[#C94A4A]/10 border border-[#8A2D2D]/30 dark:border-[#C94A4A]/30 rounded">
                <span className="text-xs font-medium text-[#8A2D2D] dark:text-[#C94A4A] uppercase tracking-wider">
                  Reported Skipped
                </span>
                <div className="text-3xl font-mono-numbers font-bold text-[#8A2D2D] dark:text-[#C94A4A] mt-1">
                  {summary.not_taken_pct !== null ? `${summary.not_taken_pct}%` : 'N/A'}
                </div>
                <div className="text-xs text-[#4A5159] dark:text-[#9EABB5] mt-1 font-mono-numbers">
                  {summary.N} / {summary.S} doses
                </div>
              </div>

              {/* Unresolved Rate */}
              <div className="p-3 bg-[#7A5A00]/5 dark:bg-[#D4A017]/10 border border-dashed border-[#7A5A00]/40 dark:border-[#D4A017]/40 rounded">
                <span className="text-xs font-medium text-[#7A5A00] dark:text-[#D4A017] uppercase tracking-wider">
                  Unresolved Record
                </span>
                <div className="text-3xl font-mono-numbers font-bold text-[#7A5A00] dark:text-[#D4A017] mt-1">
                  {summary.unresolved_pct !== null ? `${summary.unresolved_pct}%` : 'N/A'}
                </div>
                <div className="text-xs text-[#4A5159] dark:text-[#9EABB5] mt-1 font-mono-numbers">
                  {summary.U} / {summary.S} doses
                </div>
              </div>

              {/* Outcome Coverage Rate */}
              <div className="p-3 bg-neutral-100 dark:bg-neutral-800 border border-neutral-300 dark:border-neutral-700 rounded">
                <span className="text-xs font-medium text-neutral-800 dark:text-neutral-200 uppercase tracking-wider">
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
          )}
        </div>
      )}

      {/* Daily Adherence Ledger Stacked Chart */}
      {trends.length > 0 && (
        <div className="bg-white dark:bg-[#1E2226] border border-[#D9D5CA] dark:border-[#2E363D] rounded-md p-5 space-y-4">
          <div className="flex items-center justify-between border-b border-[#D9D5CA] dark:border-[#2E363D] pb-3">
            <div className="flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-[#0F5C5A] dark:text-[#1EB8B4]" />
              <h3 className="text-xs font-bold uppercase tracking-wider text-[#1B1F23] dark:text-[#ECEFF1]">
                Daily Adherence Timeline (Last {trends.length} Days)
              </h3>
            </div>
            <div className="flex items-center gap-3 text-[11px]">
              <span className="flex items-center gap-1 text-[#1E6B3A] dark:text-[#2FA85C]">
                <span className="w-2.5 h-2.5 bg-[#1E6B3A] dark:bg-[#2FA85C] rounded-xs inline-block" /> Taken
              </span>
              <span className="flex items-center gap-1 text-[#8A2D2D] dark:text-[#C94A4A]">
                <span className="w-2.5 h-2.5 bg-[#8A2D2D] dark:bg-[#C94A4A] rounded-xs inline-block" /> Skipped
              </span>
              <span className="flex items-center gap-1 text-[#7A5A00] dark:text-[#D4A017]">
                <span className="w-2.5 h-2.5 bg-[#7A5A00] dark:bg-[#D4A017] rounded-xs inline-block" /> Unresolved
              </span>
            </div>
          </div>

          <div className="overflow-x-auto pb-2">
            <div className="flex items-end gap-1.5 h-36 min-w-[500px] pt-4 px-1">
              {trends.map((t) => {
                const maxVal = Math.max(...trends.map((d) => d.S), 4);
                const heightPct = t.S > 0 ? (t.S / maxVal) * 100 : 8;
                const takenPct = t.S > 0 ? (t.T / t.S) * 100 : 0;
                const skippedPct = t.S > 0 ? (t.N / t.S) * 100 : 0;
                const unresolvedPct = t.S > 0 ? (t.U / t.S) * 100 : 0;

                const dayLabel = new Date(t.date + 'T00:00:00Z').toLocaleDateString([], {
                  month: 'numeric',
                  day: 'numeric',
                });

                return (
                  <div
                    key={t.date}
                    className="flex-1 flex flex-col items-center group relative cursor-pointer"
                    title={`${t.date}: S=${t.S}, T=${t.T}, N=${t.N}, U=${t.U}`}
                  >
                    {/* Tooltip on hover */}
                    <div className="absolute -top-12 z-20 hidden group-hover:block bg-[#1B1F23] text-white text-[10px] py-1 px-2 rounded shadow-md whitespace-nowrap pointer-events-none">
                      {t.date} | S:{t.S} T:{t.T} N:{t.N} U:{t.U}
                    </div>

                    {/* Stacked bar */}
                    <div
                      style={{ height: `${Math.max(heightPct, 12)}%` }}
                      className="w-full max-w-[28px] rounded-t-xs overflow-hidden flex flex-col justify-end bg-neutral-200 dark:bg-neutral-800"
                    >
                      {t.S === 0 ? (
                        <div className="w-full h-full bg-neutral-200 dark:bg-neutral-700/50" />
                      ) : (
                        <>
                          {unresolvedPct > 0 && (
                            <div
                              style={{ height: `${unresolvedPct}%` }}
                              className="w-full bg-[#7A5A00] dark:bg-[#D4A017]"
                            />
                          )}
                          {skippedPct > 0 && (
                            <div
                              style={{ height: `${skippedPct}%` }}
                              className="w-full bg-[#8A2D2D] dark:bg-[#C94A4A]"
                            />
                          )}
                          {takenPct > 0 && (
                            <div
                              style={{ height: `${takenPct}%` }}
                              className="w-full bg-[#1E6B3A] dark:bg-[#2FA85C]"
                            />
                          )}
                        </>
                      )}
                    </div>

                    <span className="text-[10px] font-mono-numbers text-[#4A5159] dark:text-[#9EABB5] mt-1.5 truncate max-w-full">
                      {dayLabel}
                    </span>
                  </div>
                );
              })}
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
              <div className="flex items-center gap-3">
                <div className="text-right">
                  <div className="text-xs font-semibold text-[#1E6B3A] dark:text-[#2FA85C]">
                    {m.confirmed_pct !== null ? `${m.confirmed_pct}%` : 'No doses'}
                  </div>
                  <div className="text-[10px] text-[#4A5159] dark:text-[#9EABB5]">Confirmed Intake</div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

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

              {/* Feedback buttons */}
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
