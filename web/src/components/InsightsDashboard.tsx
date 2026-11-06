import React, { useState, useEffect } from 'react';
import { ShieldAlert, Check, X, ThumbsUp, ThumbsDown, AlertCircle, Info, Calendar } from 'lucide-react';
import { PeriodSummary, Insight, api } from '../services/api';

interface Props {
  insights: Insight[];
  onRefresh: () => void;
}

export const InsightsDashboard: React.FC<Props> = ({ insights, onRefresh }) => {
  const [days, setDays] = useState<number>(30);
  const [summary, setSummary] = useState<PeriodSummary | null>(null);
  const [medSummaries, setMedSummaries] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadAnalytics();
  }, [days]);

  const loadAnalytics = async () => {
    setLoading(true);
    try {
      const [sumData, medData] = await Promise.all([
        api.getSummary(days),
        api.getMedicationSummaries(days),
      ]);
      setSummary(sumData);
      setMedSummaries(medData);
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

  return (
    <div className="space-y-6">
      {/* Range Filter */}
      <div className="flex items-center justify-between bg-white p-3 rounded border border-[#D9D5CA]">
        <div className="flex items-center gap-2">
          <Calendar className="w-4 h-4 text-[#0F5C5A]" />
          <span className="text-xs font-semibold uppercase tracking-wider text-[#4A5159]">
            Reporting Horizon:
          </span>
        </div>
        <div className="flex gap-1.5">
          {[7, 14, 30, 90].map((d) => (
            <button
              key={d}
              onClick={() => setDays(d)}
              className={`px-3 py-1 rounded text-xs font-medium transition-colors ${
                days === d
                  ? 'bg-[#0F5C5A] text-white'
                  : 'bg-[#F7F5F0] text-[#4A5159] hover:bg-neutral-200'
              }`}
            >
              {d} Days
            </button>
          ))}
        </div>
      </div>

      {/* Metrics Ledger with Transparent Denominators */}
      {summary && (
        <div className="bg-white border border-[#D9D5CA] rounded-md p-5 space-y-4">
          <div className="flex items-center justify-between border-b border-[#D9D5CA] pb-3">
            <div>
              <span className="text-xs font-bold uppercase tracking-wider text-[#4A5159]">
                Record Coverage & Adherence Ledger
              </span>
              <div className="text-xs text-[#4A5159]">
                Period: {summary.start_date} to {summary.end_date} (Total scheduled doses: {summary.S})
              </div>
            </div>
            {summary.small_sample_warning && (
              <span className="text-[11px] bg-amber-100 text-amber-900 border border-amber-300 px-2 py-0.5 rounded">
                Small sample size (&lt; 10 doses)
              </span>
            )}
          </div>

          {summary.S === 0 ? (
            <div className="p-6 text-center text-[#4A5159]">
              <p className="font-semibold text-base">No scheduled doses</p>
              <p className="text-xs mt-1">No percentage is calculated when the denominator is zero.</p>
            </div>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {/* Confirmed Rate */}
              <div className="p-3 bg-[#1E6B3A]/5 border border-[#1E6B3A]/30 rounded">
                <span className="text-xs font-medium text-[#1E6B3A] uppercase tracking-wider">
                  Confirmed Intake
                </span>
                <div className="text-3xl font-mono-numbers font-bold text-[#1E6B3A] mt-1">
                  {summary.confirmed_pct !== null ? `${summary.confirmed_pct}%` : 'N/A'}
                </div>
                <div className="text-xs text-[#4A5159] mt-1 font-mono-numbers">
                  {summary.T} / {summary.S} doses
                </div>
              </div>

              {/* Not Taken Rate */}
              <div className="p-3 bg-[#8A2D2D]/5 border border-[#8A2D2D]/30 rounded">
                <span className="text-xs font-medium text-[#8A2D2D] uppercase tracking-wider">
                  Reported Skipped
                </span>
                <div className="text-3xl font-mono-numbers font-bold text-[#8A2D2D] mt-1">
                  {summary.not_taken_pct !== null ? `${summary.not_taken_pct}%` : 'N/A'}
                </div>
                <div className="text-xs text-[#4A5159] mt-1 font-mono-numbers">
                  {summary.N} / {summary.S} doses
                </div>
              </div>

              {/* Unresolved Rate */}
              <div className="p-3 bg-[#7A5A00]/5 border border-dashed border-[#7A5A00]/40 rounded">
                <span className="text-xs font-medium text-[#7A5A00] uppercase tracking-wider">
                  Unresolved Record
                </span>
                <div className="text-3xl font-mono-numbers font-bold text-[#7A5A00] mt-1">
                  {summary.unresolved_pct !== null ? `${summary.unresolved_pct}%` : 'N/A'}
                </div>
                <div className="text-xs text-[#4A5159] mt-1 font-mono-numbers">
                  {summary.U} / {summary.S} doses
                </div>
              </div>

              {/* Outcome Coverage Rate */}
              <div className="p-3 bg-neutral-100 border border-neutral-300 rounded">
                <span className="text-xs font-medium text-neutral-800 uppercase tracking-wider">
                  Outcome Coverage
                </span>
                <div className="text-3xl font-mono-numbers font-bold text-neutral-900 mt-1">
                  {summary.outcome_coverage_pct !== null ? `${summary.outcome_coverage_pct}%` : 'N/A'}
                </div>
                <div className="text-xs text-[#4A5159] mt-1 font-mono-numbers">
                  ({summary.T} + {summary.N}) / {summary.S}
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Per-Medication Ledger Breakdown */}
      <div className="bg-white border border-[#D9D5CA] rounded-md overflow-hidden">
        <div className="px-4 py-3 bg-[#F7F5F0] border-b border-[#D9D5CA]">
          <h3 className="text-xs font-bold uppercase tracking-wider text-[#1B1F23]">
            Per-Medication Breakdown
          </h3>
        </div>
        <div className="divide-y divide-[#D9D5CA]">
          {medSummaries.map((m) => (
            <div key={m.medication_id} className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <div className="font-semibold text-sm text-[#1B1F23]">{m.display_name}</div>
                <div className="text-xs text-[#4A5159] font-mono-numbers mt-0.5">
                  Scheduled (S): {m.S} · Taken (T): {m.T} · Skipped (N): {m.N} · Unresolved (U): {m.U}
                </div>
              </div>
              <div className="flex items-center gap-3">
                <div className="text-right">
                  <div className="text-xs font-semibold text-[#1E6B3A]">
                    {m.confirmed_pct !== null ? `${m.confirmed_pct}%` : 'No doses'}
                  </div>
                  <div className="text-[10px] text-[#4A5159]">Confirmed Intake</div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Deterministic R1 Insights Section */}
      <div className="space-y-3">
        <div className="flex items-center gap-2">
          <ShieldAlert className="w-4 h-4 text-[#0F5C5A]" />
          <h3 className="text-sm font-bold uppercase tracking-wider text-[#1B1F23]">
            Pattern Insights (Rule R1)
          </h3>
        </div>

        {insights.length === 0 ? (
          <div className="bg-white border border-[#D9D5CA] rounded p-6 text-center text-[#4A5159] text-xs">
            No pattern thresholds detected. Rule R1 requires ≥ 4 comparable scheduled events across ≥ 2 calendar weeks with ≥ 3 unresolved entries.
          </div>
        ) : (
          insights.map((ins) => (
            <div
              key={ins.id}
              className="bg-white border-2 border-amber-300 rounded-md p-5 space-y-3 shadow-sm"
            >
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-2">
                  <span className="px-2 py-0.5 bg-amber-100 text-amber-900 border border-amber-300 rounded text-xs font-bold font-mono">
                    RULE R1: Unresolved Cluster
                  </span>
                  <span className="text-xs font-semibold text-neutral-800">
                    {ins.medication_name}
                  </span>
                </div>
                <button
                  onClick={() => handleDismiss(ins.id)}
                  title="Dismiss insight"
                  className="text-[#4A5159] hover:text-[#1B1F23] text-sm"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <p className="text-sm text-[#1B1F23] leading-relaxed">
                {ins.description}
              </p>

              <div className="p-3 bg-[#F7F5F0] rounded text-xs text-[#4A5159] space-y-1">
                <span className="font-semibold block text-[11px] uppercase tracking-wider text-[#1B1F23]">
                  Supporting Recorded Evidence:
                </span>
                <p>
                  Linked to {ins.evidence_event_ids.length} specific dose records in your ledger between{' '}
                  {ins.date_range.start} and {ins.date_range.end}.
                </p>
              </div>

              {/* Feedback buttons */}
              <div className="flex items-center justify-between pt-2 border-t border-[#D9D5CA]">
                <span className="text-xs text-[#4A5159]">Is this record pattern helpful?</span>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => handleFeedback(ins.id, true)}
                    className={`px-3 py-1 text-xs rounded border flex items-center gap-1 ${
                      ins.useful === true
                        ? 'bg-emerald-50 text-emerald-800 border-emerald-300'
                        : 'border-neutral-300 text-[#4A5159] hover:bg-neutral-50'
                    }`}
                  >
                    <ThumbsUp className="w-3 h-3" /> Useful
                  </button>
                  <button
                    onClick={() => handleFeedback(ins.id, false)}
                    className={`px-3 py-1 text-xs rounded border flex items-center gap-1 ${
                      ins.useful === false
                        ? 'bg-rose-50 text-rose-800 border-rose-300'
                        : 'border-neutral-300 text-[#4A5159] hover:bg-neutral-50'
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
