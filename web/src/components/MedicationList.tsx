import React, { useState } from 'react';
import {
  Plus,
  Archive,
  Trash2,
  CheckCircle2,
  AlertCircle,
  Clock,
  ShieldCheck,
  History,
  Calendar,
  ChevronRight,
  Edit2,
} from 'lucide-react';
import { Medication, ScheduleVersion, api } from '../services/api';

interface Props {
  medications: Medication[];
  onRefresh: () => void;
}

export const MedicationList: React.FC<Props> = ({ medications, onRefresh }) => {
  const [tab, setTab] = useState<'active' | 'archived'>('active');
  const [showWizard, setShowWizard] = useState(false);
  const [step, setStep] = useState<1 | 2 | 3 | 4>(1);

  // Detail & schedule version state
  const [selectedMed, setSelectedMed] = useState<Medication | null>(null);
  const [schedules, setSchedules] = useState<ScheduleVersion[]>([]);
  const [loadingSchedules, setLoadingSchedules] = useState(false);
  const [showScheduleEditor, setShowScheduleEditor] = useState(false);
  const [newDoseTimes, setNewDoseTimes] = useState<string[]>(['08:00']);
  const [updatingSchedule, setUpdatingSchedule] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Form fields for new medication wizard
  const [displayName, setDisplayName] = useState('');
  const [form, setForm] = useState('tablet');
  const [startDate, setStartDate] = useState(new Date().toISOString().split('T')[0]);
  const [prescribedText, setPrescribedText] = useState('');
  const [doseTimes, setDoseTimes] = useState<string[]>(['08:00']);
  const [frequencyType, setFrequencyType] = useState('daily');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const filteredMeds = medications.filter((m) => (tab === 'active' ? m.active : !m.active));

  const handleAddTime = (isEditing: boolean = false) => {
    if (isEditing) {
      setNewDoseTimes([...newDoseTimes, '20:00']);
    } else {
      setDoseTimes([...doseTimes, '20:00']);
    }
  };

  const handleRemoveTime = (index: number, isEditing: boolean = false) => {
    if (isEditing) {
      if (newDoseTimes.length > 1) {
        setNewDoseTimes(newDoseTimes.filter((_, i) => i !== index));
      }
    } else {
      if (doseTimes.length > 1) {
        setDoseTimes(doseTimes.filter((_, i) => i !== index));
      }
    }
  };

  const handleTimeChange = (index: number, val: string, isEditing: boolean = false) => {
    if (isEditing) {
      const updated = [...newDoseTimes];
      updated[index] = val;
      setNewDoseTimes(updated);
    } else {
      const updated = [...doseTimes];
      updated[index] = val;
      setDoseTimes(updated);
    }
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
    if (
      window.confirm(
        'Archive this medication? Past records will be safely preserved, but no new reminders will be generated.'
      )
    ) {
      try {
        await api.archiveMedication(id);
        if (selectedMed?.id === id) {
          setSelectedMed(null);
        }
        onRefresh();
      } catch (err: any) {
        alert(err.message);
      }
    }
  };

  const handleDeleteMedication = async (id: string, name: string) => {
    if (
      window.confirm(
        `Permanently remove "${name}"? This will delete future scheduled doses for this medication.`
      )
    ) {
      try {
        await api.deleteMedication(id);
        setToastMessage(`Medication "${name}" removed successfully.`);
        setTimeout(() => setToastMessage(null), 4000);
        if (selectedMed?.id === id) {
          setSelectedMed(null);
        }
        onRefresh();
      } catch (err: any) {
        alert(`Failed to remove medication: ${err.message}`);
      }
    }
  };

  const handleOpenDetail = async (med: Medication) => {
    setSelectedMed(med);
    setShowScheduleEditor(false);
    setLoadingSchedules(true);
    try {
      const schedList = await api.getMedicationSchedules(med.id);
      setSchedules(schedList);
      if (med.current_schedule?.dose_times) {
        setNewDoseTimes([...med.current_schedule.dose_times]);
      }
    } catch (err: any) {
      console.error(err);
    } finally {
      setLoadingSchedules(false);
    }
  };

  const handleSaveScheduleVersion = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedMed) return;
    setUpdatingSchedule(true);
    try {
      const updatedMed = await api.updateMedicationSchedule(selectedMed.id, {
        dose_times: newDoseTimes,
        frequency_type: 'daily',
      });
      setToastMessage('New Schedule Version activated. Future events scheduled without altering past records.');
      setTimeout(() => setToastMessage(null), 4000);
      setShowScheduleEditor(false);
      setSelectedMed(updatedMed);
      const schedList = await api.getMedicationSchedules(selectedMed.id);
      setSchedules(schedList);
      onRefresh();
    } catch (err: any) {
      alert(`Schedule update failed: ${err.message}`);
    } finally {
      setUpdatingSchedule(false);
    }
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

      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-2 border-b border-[#D9D5CA] dark:border-[#2E363D]">
          <button
            onClick={() => setTab('active')}
            className={`pb-2 px-3 text-sm font-semibold transition-colors ${
              tab === 'active'
                ? 'border-b-2 border-[#0F5C5A] dark:border-[#1EB8B4] text-[#0F5C5A] dark:text-[#1EB8B4]'
                : 'text-[#4A5159] dark:text-[#9EABB5] hover:text-[#1B1F23]'
            }`}
          >
            Active Medications ({medications.filter((m) => m.active).length})
          </button>
          <button
            onClick={() => setTab('archived')}
            className={`pb-2 px-3 text-sm font-semibold transition-colors ${
              tab === 'archived'
                ? 'border-b-2 border-[#0F5C5A] dark:border-[#1EB8B4] text-[#0F5C5A] dark:text-[#1EB8B4]'
                : 'text-[#4A5159] dark:text-[#9EABB5] hover:text-[#1B1F23]'
            }`}
          >
            Archived ({medications.filter((m) => !m.active).length})
          </button>
        </div>

        <button
          onClick={() => setShowWizard(true)}
          className="h-10 px-4 bg-[#0F5C5A] dark:bg-[#1EB8B4] hover:bg-teal-900 text-white dark:text-[#121416] rounded text-sm font-medium flex items-center justify-center gap-1.5 shadow-xs transition-colors self-start sm:self-auto"
        >
          <Plus className="w-4 h-4" /> Add Medication
        </button>
      </div>

      {/* Medication List */}
      <div className="space-y-4">
        {filteredMeds.length === 0 ? (
          <div className="bg-white dark:bg-[#1E2226] border border-[#D9D5CA] dark:border-[#2E363D] rounded p-8 text-center text-[#4A5159] dark:text-[#9EABB5] space-y-2">
            <AlertCircle className="w-8 h-8 mx-auto text-neutral-400" />
            <p className="font-medium">No {tab} medications found.</p>
          </div>
        ) : (
          filteredMeds.map((med) => (
            <div
              key={med.id}
              className="bg-white dark:bg-[#1E2226] border border-[#D9D5CA] dark:border-[#2E363D] rounded p-5 space-y-3 hover:border-neutral-400 transition-colors shadow-xs"
            >
              <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-2">
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-lg font-semibold text-[#1B1F23] dark:text-[#ECEFF1]">
                      {med.display_name}
                    </h3>
                    <span className="px-2 py-0.5 bg-neutral-100 dark:bg-neutral-800 text-[#4A5159] dark:text-[#9EABB5] rounded text-xs capitalize">
                      {med.form || 'tablet'}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 text-xs text-[#1E6B3A] dark:text-[#2FA85C] mt-1 font-medium">
                    <ShieldCheck className="w-3.5 h-3.5" />
                    <span>Verified Schedule Version</span>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => handleOpenDetail(med)}
                    className="text-xs text-[#0F5C5A] dark:text-[#1EB8B4] hover:bg-[#F7F5F0] dark:hover:bg-[#2E363D] border border-[#D9D5CA] dark:border-[#2E363D] px-2.5 py-1.5 rounded flex items-center gap-1 font-medium"
                  >
                    <History className="w-3.5 h-3.5" />
                    <span>Schedules & Details</span>
                  </button>

                  {med.active && (
                    <button
                      onClick={() => handleArchive(med.id)}
                      title="Archive medication (preserve historical records)"
                      className="text-xs text-[#4A5159] dark:text-[#9EABB5] hover:text-amber-700 flex items-center gap-1 border border-neutral-200 dark:border-neutral-700 px-2.5 py-1.5 rounded"
                    >
                      <Archive className="w-3.5 h-3.5" /> Archive
                    </button>
                  )}

                  <button
                    onClick={() => handleDeleteMedication(med.id, med.display_name)}
                    title="Permanently remove medication"
                    className="text-xs text-rose-700 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 flex items-center gap-1 border border-rose-200 dark:border-rose-900 px-2.5 py-1.5 rounded transition-colors"
                  >
                    <Trash2 className="w-3.5 h-3.5" /> Remove
                  </button>
                </div>
              </div>

              {/* Prescribed instruction text */}
              <div className="p-3 bg-[#F7F5F0] dark:bg-[#252A2F] rounded border border-[#D9D5CA]/60 dark:border-[#2E363D] text-xs space-y-1">
                <span className="font-semibold uppercase tracking-wider text-[#4A5159] dark:text-[#9EABB5] text-[10px]">
                  Prescribed Instruction
                </span>
                <p className="text-[#1B1F23] dark:text-[#ECEFF1] font-normal leading-relaxed">
                  {med.prescribed_instruction_text}
                </p>
              </div>

              {/* Reminder times */}
              {med.current_schedule && (
                <div className="flex flex-wrap items-center gap-2 text-xs text-[#4A5159] dark:text-[#9EABB5]">
                  <Clock className="w-3.5 h-3.5 text-[#0F5C5A] dark:text-[#1EB8B4]" />
                  <span>Reminder times:</span>
                  <div className="flex items-center gap-1.5">
                    {med.current_schedule.dose_times.map((t, idx) => (
                      <span
                        key={idx}
                        className="font-mono-numbers px-2 py-0.5 bg-white dark:bg-[#121416] border border-neutral-300 dark:border-neutral-700 rounded text-neutral-800 dark:text-neutral-200 font-medium"
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

      {/* Medication Detail & Schedule Version History Modal */}
      {selectedMed && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4 animate-in fade-in duration-150">
          <div className="bg-white dark:bg-[#1E2226] max-w-xl w-full rounded-md border border-[#D9D5CA] dark:border-[#2E363D] shadow-2xl overflow-hidden max-h-[90vh] flex flex-col">
            <div className="bg-[#F7F5F0] dark:bg-[#252A2F] px-6 py-4 border-b border-[#D9D5CA] dark:border-[#2E363D] flex items-center justify-between">
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-[#0F5C5A] dark:text-[#1EB8B4]">
                  Medication Specifications
                </span>
                <h3 className="text-lg font-semibold text-[#1B1F23] dark:text-[#ECEFF1]">
                  {selectedMed.display_name} ({selectedMed.form || 'tablet'})
                </h3>
              </div>
              <button
                onClick={() => setSelectedMed(null)}
                className="text-[#4A5159] dark:text-[#9EABB5] hover:text-[#1B1F23] text-xl font-bold"
              >
                ×
              </button>
            </div>

            <div className="p-6 space-y-4 overflow-y-auto text-xs">
              {/* Prescribed text */}
              <div className="p-3 bg-[#F7F5F0] dark:bg-[#252A2F] rounded border border-[#D9D5CA] dark:border-[#2E363D] space-y-1">
                <span className="font-semibold uppercase tracking-wider text-[#4A5159] dark:text-[#9EABB5] text-[10px]">
                  Prescribed Instruction Label
                </span>
                <p className="text-[#1B1F23] dark:text-[#ECEFF1] font-mono leading-relaxed">
                  {selectedMed.prescribed_instruction_text}
                </p>
              </div>

              {/* Schedule Version History */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="font-bold uppercase tracking-wider text-[#4A5159] dark:text-[#9EABB5]">
                    Schedule Version History
                  </h4>
                  {selectedMed.active && !showScheduleEditor && (
                    <button
                      onClick={() => setShowScheduleEditor(true)}
                      className="px-2.5 py-1 bg-[#0F5C5A] dark:bg-[#1EB8B4] text-white dark:text-[#121416] rounded font-medium flex items-center gap-1"
                    >
                      <Edit2 className="w-3 h-3" />
                      Adjust Reminder Times
                    </button>
                  )}
                </div>

                {/* Inline Schedule Version Form */}
                {showScheduleEditor && (
                  <form
                    onSubmit={handleSaveScheduleVersion}
                    className="p-4 bg-teal-50/70 dark:bg-teal-950/40 border border-teal-300 dark:border-teal-700 rounded space-y-3"
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-semibold text-teal-950 dark:text-teal-200">
                        Create New Schedule Version
                      </span>
                      <button
                        type="button"
                        onClick={() => handleAddTime(true)}
                        className="text-xs text-[#0F5C5A] dark:text-[#1EB8B4] hover:underline font-semibold"
                      >
                        + Add Time
                      </button>
                    </div>
                    <p className="text-[11px] text-teal-900 dark:text-teal-300">
                      Modifying dose times creates a new immutable version. Past recorded dose events remain completely intact.
                    </p>

                    <div className="space-y-2">
                      {newDoseTimes.map((t, idx) => (
                        <div key={idx} className="flex items-center gap-2">
                          <input
                            type="time"
                            value={t}
                            onChange={(e) => handleTimeChange(idx, e.target.value, true)}
                            className="px-3 py-1.5 border border-[#D9D5CA] dark:border-[#2E363D] bg-white dark:bg-[#121416] text-[#1B1F23] dark:text-[#ECEFF1] rounded font-mono-numbers"
                          />
                          {newDoseTimes.length > 1 && (
                            <button
                              type="button"
                              onClick={() => handleRemoveTime(idx, true)}
                              className="text-xs text-rose-600 hover:underline"
                            >
                              Remove
                            </button>
                          )}
                        </div>
                      ))}
                    </div>

                    <div className="flex justify-end gap-2 pt-2">
                      <button
                        type="button"
                        onClick={() => setShowScheduleEditor(false)}
                        className="px-3 py-1.5 border border-neutral-300 dark:border-neutral-600 rounded text-neutral-700 dark:text-neutral-300"
                      >
                        Cancel
                      </button>
                      <button
                        type="submit"
                        disabled={updatingSchedule || newDoseTimes.length === 0}
                        className="px-4 py-1.5 bg-[#0F5C5A] dark:bg-[#1EB8B4] text-white dark:text-[#121416] rounded font-medium disabled:opacity-50"
                      >
                        {updatingSchedule ? 'Activating…' : 'Save New Schedule Version'}
                      </button>
                    </div>
                  </form>
                )}

                {/* Schedule Versions List */}
                <div className="border border-[#D9D5CA] dark:border-[#2E363D] rounded divide-y divide-[#D9D5CA] dark:divide-[#2E363D]">
                  {loadingSchedules ? (
                    <div className="p-4 text-center text-neutral-500">Loading schedules…</div>
                  ) : schedules.length === 0 ? (
                    <div className="p-4 text-center text-neutral-500">No schedule history recorded.</div>
                  ) : (
                    schedules.map((s, idx) => (
                      <div key={s.id} className="p-3 space-y-1">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <span className="font-semibold text-[#1B1F23] dark:text-[#ECEFF1]">
                              Version #{schedules.length - idx}
                            </span>
                            {!s.effective_to ? (
                              <span className="px-1.5 py-0.2 bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300 text-[10px] font-bold uppercase rounded">
                                Current Active
                              </span>
                            ) : (
                              <span className="px-1.5 py-0.2 bg-neutral-100 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-400 text-[10px] font-medium rounded">
                                Superseded
                              </span>
                            )}
                          </div>
                          <span className="font-mono text-[10px] text-neutral-400">
                            ID: {s.id.substring(0, 8)}…
                          </span>
                        </div>
                        <div className="flex items-center gap-2 font-mono-numbers text-neutral-700 dark:text-neutral-300">
                          <span>Times: {s.dose_times.join(', ')}</span>
                          <span>·</span>
                          <span className="capitalize">{s.frequency_rule.type}</span>
                        </div>
                        <div className="text-[10px] text-neutral-500">
                          Effective: {new Date(s.effective_from).toLocaleDateString()}
                          {s.effective_to && ` to ${new Date(s.effective_to).toLocaleDateString()}`}
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Add Medication 4-Step Wizard Modal */}
      {showWizard && (
        <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-[#1E2226] max-w-lg w-full rounded-md border border-[#D9D5CA] dark:border-[#2E363D] shadow-2xl overflow-hidden">
            <div className="bg-[#F7F5F0] dark:bg-[#252A2F] px-6 py-4 border-b border-[#D9D5CA] dark:border-[#2E363D] flex items-center justify-between">
              <div>
                <span className="text-xs font-semibold uppercase tracking-wider text-[#0F5C5A] dark:text-[#1EB8B4]">
                  Step {step} of 4
                </span>
                <h3 className="text-lg font-semibold text-[#1B1F23] dark:text-[#ECEFF1]">
                  {step === 1 && 'Medication Details'}
                  {step === 2 && 'Prescription Instructions'}
                  {step === 3 && 'Reminder Schedule'}
                  {step === 4 && 'Verification & Confirmation'}
                </h3>
              </div>
              <button
                onClick={() => setShowWizard(false)}
                className="text-[#4A5159] dark:text-[#9EABB5] hover:text-[#1B1F23] text-lg font-bold"
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
                    <label className="block text-xs font-semibold uppercase tracking-wider text-[#4A5159] dark:text-[#9EABB5] mb-1">
                      Medication Display Name *
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. Amlodipine 5mg"
                      value={displayName}
                      onChange={(e) => setDisplayName(e.target.value)}
                      className="w-full px-3 py-2 border border-[#D9D5CA] dark:border-[#2E363D] bg-white dark:bg-[#121416] text-[#1B1F23] dark:text-[#ECEFF1] rounded text-sm focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold uppercase tracking-wider text-[#4A5159] dark:text-[#9EABB5] mb-1">
                      Medication Form
                    </label>
                    <select
                      value={form}
                      onChange={(e) => setForm(e.target.value)}
                      className="w-full px-3 py-2 border border-[#D9D5CA] dark:border-[#2E363D] bg-white dark:bg-[#121416] text-[#1B1F23] dark:text-[#ECEFF1] rounded text-sm focus:outline-none"
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
                    <label className="block text-xs font-semibold uppercase tracking-wider text-[#4A5159] dark:text-[#9EABB5] mb-1">
                      Start Date
                    </label>
                    <input
                      type="date"
                      value={startDate}
                      onChange={(e) => setStartDate(e.target.value)}
                      className="w-full px-3 py-2 border border-[#D9D5CA] dark:border-[#2E363D] bg-white dark:bg-[#121416] text-[#1B1F23] dark:text-[#ECEFF1] rounded text-sm focus:outline-none"
                    />
                  </div>
                </div>
              )}

              {step === 2 && (
                <div className="space-y-4">
                  <div className="p-3 bg-neutral-50 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded text-xs text-[#4A5159] dark:text-[#9EABB5]">
                    <p className="font-semibold text-neutral-800 dark:text-neutral-200 mb-1">Clinical Integrity Rule</p>
                    <p>
                      Enter the exact text from your doctor or prescription label. This is kept strictly separate from reminder times and is never altered automatically.
                    </p>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold uppercase tracking-wider text-[#4A5159] dark:text-[#9EABB5] mb-1">
                      Prescribed Instruction Text *
                    </label>
                    <textarea
                      rows={4}
                      placeholder="e.g. Take 1 tablet once daily in the morning with water after food."
                      value={prescribedText}
                      onChange={(e) => setPrescribedText(e.target.value)}
                      className="w-full px-3 py-2 border border-[#D9D5CA] dark:border-[#2E363D] bg-white dark:bg-[#121416] text-[#1B1F23] dark:text-[#ECEFF1] rounded text-sm focus:outline-none"
                    />
                  </div>
                </div>
              )}

              {step === 3 && (
                <div className="space-y-4">
                  <div>
                    <label className="block text-xs font-semibold uppercase tracking-wider text-[#4A5159] dark:text-[#9EABB5] mb-1">
                      Recurrence Frequency
                    </label>
                    <select
                      value={frequencyType}
                      onChange={(e) => setFrequencyType(e.target.value)}
                      className="w-full px-3 py-2 border border-[#D9D5CA] dark:border-[#2E363D] bg-white dark:bg-[#121416] text-[#1B1F23] dark:text-[#ECEFF1] rounded text-sm focus:outline-none"
                    >
                      <option value="daily">Every day (Daily)</option>
                      <option value="days_of_week">Specific Days of the Week</option>
                    </select>
                  </div>

                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <label className="text-xs font-semibold uppercase tracking-wider text-[#4A5159] dark:text-[#9EABB5]">
                        Daily Reminder Times
                      </label>
                      <button
                        type="button"
                        onClick={() => handleAddTime(false)}
                        className="text-xs text-[#0F5C5A] dark:text-[#1EB8B4] hover:underline font-semibold"
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
                            onChange={(e) => handleTimeChange(idx, e.target.value, false)}
                            className="px-3 py-1.5 border border-[#D9D5CA] dark:border-[#2E363D] bg-white dark:bg-[#121416] text-[#1B1F23] dark:text-[#ECEFF1] rounded text-sm font-mono-numbers focus:outline-none"
                          />
                          {doseTimes.length > 1 && (
                            <button
                              type="button"
                              onClick={() => handleRemoveTime(idx, false)}
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
                  <div className="p-4 bg-teal-50 dark:bg-teal-950/50 border border-teal-200 dark:border-teal-800 rounded text-xs space-y-2 text-teal-950 dark:text-teal-200">
                    <div className="flex items-center gap-1.5 font-semibold text-teal-900 dark:text-teal-100">
                      <CheckCircle2 className="w-4 h-4 text-teal-700 dark:text-teal-400" />
                      <span>Review Before Activating Schedule</span>
                    </div>
                    <p>
                      Please verify that these entries match your prescription. Once confirmed, scheduled dose events will be generated on your ledger.
                    </p>
                  </div>

                  <div className="border border-[#D9D5CA] dark:border-[#2E363D] rounded divide-y divide-[#D9D5CA] dark:divide-[#2E363D] text-xs">
                    <div className="p-3 flex justify-between">
                      <span className="text-[#4A5159] dark:text-[#9EABB5]">Medication:</span>
                      <span className="font-semibold text-[#1B1F23] dark:text-[#ECEFF1]">{displayName} ({form})</span>
                    </div>
                    <div className="p-3 space-y-1">
                      <span className="text-[#4A5159] dark:text-[#9EABB5] block">Prescription Text:</span>
                      <p className="font-mono text-neutral-800 dark:text-neutral-200 bg-[#F7F5F0] dark:bg-[#252A2F] p-2 rounded">
                        {prescribedText}
                      </p>
                    </div>
                    <div className="p-3 flex justify-between">
                      <span className="text-[#4A5159] dark:text-[#9EABB5]">Times:</span>
                      <span className="font-mono-numbers font-medium text-[#1B1F23] dark:text-[#ECEFF1]">
                        {doseTimes.join(', ')} ({frequencyType})
                      </span>
                    </div>
                  </div>
                </div>
              )}

              {/* Navigation buttons */}
              <div className="flex items-center justify-between pt-4 border-t border-[#D9D5CA] dark:border-[#2E363D]">
                {step > 1 ? (
                  <button
                    onClick={() => setStep((step - 1) as any)}
                    className="px-4 py-2 border border-neutral-300 dark:border-neutral-600 text-[#4A5159] dark:text-[#9EABB5] rounded text-sm hover:bg-neutral-50 dark:hover:bg-neutral-800"
                  >
                    Back
                  </button>
                ) : <div />}

                {step < 4 ? (
                  <button
                    disabled={(step === 1 && !displayName.trim()) || (step === 2 && !prescribedText.trim())}
                    onClick={() => setStep((step + 1) as any)}
                    className="px-5 py-2 bg-[#0F5C5A] dark:bg-[#1EB8B4] hover:bg-teal-900 text-white dark:text-[#121416] rounded text-sm font-medium disabled:opacity-50"
                  >
                    Next Step
                  </button>
                ) : (
                  <button
                    onClick={handleCreate}
                    disabled={submitting}
                    className="px-6 py-2 bg-[#1E6B3A] dark:bg-[#2FA85C] hover:bg-[#16522c] text-white rounded text-sm font-medium shadow-xs disabled:opacity-50"
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
