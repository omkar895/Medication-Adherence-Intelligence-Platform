import React, { useState } from 'react';
import { Plus, Archive, CheckCircle2, AlertCircle, Clock, ShieldCheck } from 'lucide-react';
import { Medication, api } from '../services/api';

interface Props {
  medications: Medication[];
  onRefresh: () => void;
}

export const MedicationList: React.FC<Props> = ({ medications, onRefresh }) => {
  const [tab, setTab] = useState<'active' | 'archived'>('active');
  const [showWizard, setShowWizard] = useState(false);
  const [step, setStep] = useState<1 | 2 | 3 | 4>(1);

  // Form fields
  const [displayName, setDisplayName] = useState('');
  const [form, setForm] = useState('tablet');
  const [startDate, setStartDate] = useState(new Date().toISOString().split('T')[0]);
  const [prescribedText, setPrescribedText] = useState('');
  const [doseTimes, setDoseTimes] = useState<string[]>(['08:00']);
  const [frequencyType, setFrequencyType] = useState('daily');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const filteredMeds = medications.filter((m) => (tab === 'active' ? m.active : !m.active));

  const handleAddTime = () => {
    setDoseTimes([...doseTimes, '20:00']);
  };

  const handleRemoveTime = (index: number) => {
    if (doseTimes.length > 1) {
      setDoseTimes(doseTimes.filter((_, i) => i !== index));
    }
  };

  const handleTimeChange = (index: number, val: string) => {
    const updated = [...doseTimes];
    updated[index] = val;
    setDoseTimes(updated);
  };

  const handleCreate = async () => {
    setSubmitting(true);
    setError(null);
    try {
      await api.createMedication({
        display_name: displayName,
        prescribed_instruction_text: prescribedText,
        form,
        start_date: startDate,
        dose_times: doseTimes,
        frequency_type: frequencyType,
      });
      setShowWizard(false);
      setStep(1);
      // Reset form
      setDisplayName('');
      setPrescribedText('');
      setDoseTimes(['08:00']);
      onRefresh();
    } catch (err: any) {
      setError(err.message || 'Failed to save medication');
    } finally {
      setSubmitting(false);
    }
  };

  const handleArchive = async (id: string) => {
    if (window.confirm('Archive this medication? Past records will be safely preserved, but no new reminders will be generated.')) {
      try {
        await api.archiveMedication(id);
        onRefresh();
      } catch (err: any) {
        alert(err.message);
      }
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 border-b border-[#D9D5CA]">
          <button
            onClick={() => setTab('active')}
            className={`pb-2 px-3 text-sm font-semibold transition-colors ${
              tab === 'active'
                ? 'border-b-2 border-[#0F5C5A] text-[#0F5C5A]'
                : 'text-[#4A5159] hover:text-[#1B1F23]'
            }`}
          >
            Active Medications ({medications.filter((m) => m.active).length})
          </button>
          <button
            onClick={() => setTab('archived')}
            className={`pb-2 px-3 text-sm font-semibold transition-colors ${
              tab === 'archived'
                ? 'border-b-2 border-[#0F5C5A] text-[#0F5C5A]'
                : 'text-[#4A5159] hover:text-[#1B1F23]'
            }`}
          >
            Archived ({medications.filter((m) => !m.active).length})
          </button>
        </div>

        <button
          onClick={() => setShowWizard(true)}
          className="h-10 px-4 bg-[#0F5C5A] hover:bg-teal-900 text-white rounded text-sm font-medium flex items-center gap-1.5 shadow-sm"
        >
          <Plus className="w-4 h-4" /> Add Medication
        </button>
      </div>

      {/* Medication List */}
      <div className="space-y-4">
        {filteredMeds.length === 0 ? (
          <div className="bg-white border border-[#D9D5CA] rounded p-8 text-center text-[#4A5159] space-y-2">
            <AlertCircle className="w-8 h-8 mx-auto text-neutral-400" />
            <p className="font-medium">No {tab} medications found.</p>
          </div>
        ) : (
          filteredMeds.map((med) => (
            <div
              key={med.id}
              className="bg-white border border-[#D9D5CA] rounded p-5 space-y-3 hover:border-neutral-400 transition-colors"
            >
              <div className="flex items-start justify-between">
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-lg font-semibold text-[#1B1F23]">
                      {med.display_name}
                    </h3>
                    <span className="px-2 py-0.5 bg-neutral-100 text-[#4A5159] rounded text-xs capitalize">
                      {med.form || 'tablet'}
                    </span>
                    {med.is_synthetic && (
                      <span className="text-[10px] font-semibold tracking-wider text-amber-900 bg-amber-100 border border-amber-300 px-1.5 py-0.2 rounded uppercase">
                        Synthetic
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-2 text-xs text-[#1E6B3A] mt-1 font-medium">
                    <ShieldCheck className="w-3.5 h-3.5" />
                    <span>Verified Schedule Version</span>
                  </div>
                </div>

                {med.active && (
                  <button
                    onClick={() => handleArchive(med.id)}
                    title="Archive medication"
                    className="text-xs text-[#4A5159] hover:text-red-700 flex items-center gap-1 border border-neutral-200 px-2.5 py-1.5 rounded"
                  >
                    <Archive className="w-3.5 h-3.5" /> Archive
                  </button>
                )}
              </div>

              {/* Prescribed instruction text - separated from reminder times */}
              <div className="p-3 bg-[#F7F5F0] rounded border border-[#D9D5CA]/60 text-xs space-y-1">
                <span className="font-semibold uppercase tracking-wider text-[#4A5159] text-[10px]">
                  Prescribed Instruction
                </span>
                <p className="text-[#1B1F23] font-normal leading-relaxed">
                  {med.prescribed_instruction_text}
                </p>
              </div>

              {/* Reminder times */}
              {med.current_schedule && (
                <div className="flex items-center gap-2 text-xs text-[#4A5159]">
                  <Clock className="w-3.5 h-3.5 text-[#0F5C5A]" />
                  <span>Reminder times:</span>
                  <div className="flex items-center gap-1.5">
                    {med.current_schedule.dose_times.map((t, idx) => (
                      <span
                        key={idx}
                        className="font-mono-numbers px-2 py-0.5 bg-white border border-neutral-300 rounded text-neutral-800 font-medium"
                      >
                        {t}
                      </span>
                    ))}
                  </div>
                  <span className="text-neutral-400">|</span>
                  <span className="capitalize">{med.current_schedule.frequency_rule.type}</span>
                </div>
              )}
            </div>
          ))
        )}
      </div>

      {/* Add Medication Wizard Modal */}
      {showWizard && (
        <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4">
          <div className="bg-white max-w-lg w-full rounded-md border border-[#D9D5CA] shadow-2xl overflow-hidden">
            {/* Step indicator */}
            <div className="bg-[#F7F5F0] px-6 py-4 border-b border-[#D9D5CA] flex items-center justify-between">
              <div>
                <span className="text-xs font-semibold uppercase tracking-wider text-[#0F5C5A]">
                  Step {step} of 4
                </span>
                <h3 className="text-lg font-semibold text-[#1B1F23]">
                  {step === 1 && 'Medication Details'}
                  {step === 2 && 'Prescription Instructions'}
                  {step === 3 && 'Reminder Schedule'}
                  {step === 4 && 'Verification & Confirmation'}
                </h3>
              </div>
              <button
                onClick={() => setShowWizard(false)}
                className="text-[#4A5159] hover:text-[#1B1F23] text-lg font-bold"
              >
                ×
              </button>
            </div>

            <div className="p-6 space-y-4">
              {error && (
                <div className="p-3 bg-red-50 text-red-800 border border-red-200 rounded text-xs">
                  {error}
                </div>
              )}

              {step === 1 && (
                <div className="space-y-4">
                  <div>
                    <label className="block text-xs font-semibold uppercase tracking-wider text-[#4A5159] mb-1">
                      Medication Display Name *
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. Amlodipine 5mg"
                      value={displayName}
                      onChange={(e) => setDisplayName(e.target.value)}
                      className="w-full px-3 py-2 border border-[#D9D5CA] rounded text-sm focus:border-[#0F5C5A] focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold uppercase tracking-wider text-[#4A5159] mb-1">
                      Medication Form
                    </label>
                    <select
                      value={form}
                      onChange={(e) => setForm(e.target.value)}
                      className="w-full px-3 py-2 border border-[#D9D5CA] rounded text-sm focus:border-[#0F5C5A] focus:outline-none"
                    >
                      <option value="tablet">Tablet</option>
                      <option value="capsule">Capsule</option>
                      <option value="syrup">Syrup / Liquid</option>
                      <option value="inhaler">Inhaler</option>
                      <option value="injection">Injection</option>
                      <option value="drops">Drops</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold uppercase tracking-wider text-[#4A5159] mb-1">
                      Start Date
                    </label>
                    <input
                      type="date"
                      value={startDate}
                      onChange={(e) => setStartDate(e.target.value)}
                      className="w-full px-3 py-2 border border-[#D9D5CA] rounded text-sm focus:border-[#0F5C5A] focus:outline-none"
                    />
                  </div>
                </div>
              )}

              {step === 2 && (
                <div className="space-y-4">
                  <div className="p-3 bg-neutral-50 border border-neutral-200 rounded text-xs text-[#4A5159]">
                    <p className="font-semibold text-neutral-800 mb-1">Clinical Integrity Rule</p>
                    <p>
                      Enter the exact text from your doctor or prescription label. This is kept strictly separate from reminder times and is never altered automatically.
                    </p>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold uppercase tracking-wider text-[#4A5159] mb-1">
                      Prescribed Instruction Text *
                    </label>
                    <textarea
                      rows={4}
                      placeholder="e.g. Take 1 tablet once daily in the morning with water after food."
                      value={prescribedText}
                      onChange={(e) => setPrescribedText(e.target.value)}
                      className="w-full px-3 py-2 border border-[#D9D5CA] rounded text-sm focus:border-[#0F5C5A] focus:outline-none"
                    />
                  </div>
                </div>
              )}

              {step === 3 && (
                <div className="space-y-4">
                  <div>
                    <label className="block text-xs font-semibold uppercase tracking-wider text-[#4A5159] mb-1">
                      Recurrence Frequency
                    </label>
                    <select
                      value={frequencyType}
                      onChange={(e) => setFrequencyType(e.target.value)}
                      className="w-full px-3 py-2 border border-[#D9D5CA] rounded text-sm focus:border-[#0F5C5A] focus:outline-none"
                    >
                      <option value="daily">Every day (Daily)</option>
                      <option value="days_of_week">Specific Days of the Week</option>
                    </select>
                  </div>

                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <label className="text-xs font-semibold uppercase tracking-wider text-[#4A5159]">
                        Daily Reminder Times
                      </label>
                      <button
                        type="button"
                        onClick={handleAddTime}
                        className="text-xs text-[#0F5C5A] hover:underline font-semibold"
                      >
                        + Add Time
                      </button>
                    </div>

                    <div className="space-y-2">
                      {doseTimes.map((time, idx) => (
                        <div key={idx} className="flex items-center gap-2">
                          <input
                            type="time"
                            value={time}
                            onChange={(e) => handleTimeChange(idx, e.target.value)}
                            className="px-3 py-1.5 border border-[#D9D5CA] rounded text-sm font-mono-numbers focus:border-[#0F5C5A] focus:outline-none"
                          />
                          {doseTimes.length > 1 && (
                            <button
                              type="button"
                              onClick={() => handleRemoveTime(idx)}
                              className="text-xs text-red-600 hover:underline px-2"
                            >
                              Remove
                            </button>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {step === 4 && (
                <div className="space-y-4">
                  <div className="p-4 bg-teal-50 border border-teal-200 rounded text-xs space-y-2 text-teal-950">
                    <div className="flex items-center gap-1.5 font-semibold text-teal-900">
                      <CheckCircle2 className="w-4 h-4 text-teal-700" />
                      <span>Review Before Activating Schedule</span>
                    </div>
                    <p>
                      Please verify that these entries match your prescription. Once confirmed, scheduled dose events will be generated on your ledger.
                    </p>
                  </div>

                  <div className="border border-[#D9D5CA] rounded divide-y divide-[#D9D5CA] text-xs">
                    <div className="p-3 flex justify-between">
                      <span className="text-[#4A5159]">Medication:</span>
                      <span className="font-semibold text-[#1B1F23]">{displayName} ({form})</span>
                    </div>
                    <div className="p-3 space-y-1">
                      <span className="text-[#4A5159] block">Prescription Text:</span>
                      <p className="font-mono text-neutral-800 bg-[#F7F5F0] p-2 rounded">
                        {prescribedText}
                      </p>
                    </div>
                    <div className="p-3 flex justify-between">
                      <span className="text-[#4A5159]">Times:</span>
                      <span className="font-mono-numbers font-medium text-[#1B1F23]">
                        {doseTimes.join(', ')} ({frequencyType})
                      </span>
                    </div>
                  </div>
                </div>
              )}

              {/* Navigation buttons */}
              <div className="flex items-center justify-between pt-4 border-t border-[#D9D5CA]">
                {step > 1 ? (
                  <button
                    onClick={() => setStep((step - 1) as any)}
                    className="px-4 py-2 border border-neutral-300 text-[#4A5159] rounded text-sm hover:bg-neutral-50"
                  >
                    Back
                  </button>
                ) : <div />}

                {step < 4 ? (
                  <button
                    disabled={step === 1 && !displayName.trim() || step === 2 && !prescribedText.trim()}
                    onClick={() => setStep((step + 1) as any)}
                    className="px-5 py-2 bg-[#0F5C5A] hover:bg-teal-900 text-white rounded text-sm font-medium disabled:opacity-50"
                  >
                    Next Step
                  </button>
                ) : (
                  <button
                    onClick={handleCreate}
                    disabled={submitting}
                    className="px-6 py-2 bg-[#1E6B3A] hover:bg-[#16522c] text-white rounded text-sm font-medium shadow-sm disabled:opacity-50"
                  >
                    {submitting ? 'Activating…' : 'Confirm & Activate'}
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

