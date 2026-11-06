import React, { useState, useEffect } from 'react';
import { ShieldCheck, ShieldAlert, Key, Bell, Clock, Calendar, AlertCircle, FileText } from 'lucide-react';
import { api, PeriodSummary } from '../services/api';
import { StatusBadge } from './StatusBadge';

export const CaregiverPortal: React.FC = () => {
  const [patients, setPatients] = useState<any[]>([]);
  const [selectedPatientId, setSelectedPatientId] = useState<string | null>(null);
  const [inviteToken, setInviteToken] = useState('');
  const [accepting, setAccepting] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  // Patient scoped data
  const [medications, setMedications] = useState<any[]>([]);
  const [schedules, setSchedules] = useState<any[]>([]);
  const [todayStatus, setTodayStatus] = useState<any | null>(null);
  const [history, setHistory] = useState<any[]>([]);
  const [dashboard, setDashboard] = useState<PeriodSummary | null>(null);
  const [notifications, setNotifications] = useState<any[]>([]);
  const [loadingData, setLoadingData] = useState(false);

  useEffect(() => {
    loadCaregiverState();
    const interval = setInterval(() => {
      if (document.visibilityState === 'visible') {
        loadCaregiverState();
        if (selectedPatientId) {
          loadSharedData(selectedPatientId, true);
        }
      }
    }, 4000);
    return () => clearInterval(interval);
  }, [selectedPatientId]);

  useEffect(() => {
    if (selectedPatientId) {
      loadSharedData(selectedPatientId);
    }
  }, [selectedPatientId]);

  const loadCaregiverState = async () => {
    try {
      const data = await api.listCaregivers();
      const shared = data.shared_patients || [];
      setPatients(shared);
      if (shared.length > 0 && !selectedPatientId) {
        setSelectedPatientId(shared[0].patient_id);
      }
      const notifs = await api.getCaregiverNotifications();
      setNotifications(notifs);
    } catch (err: any) {
      console.error(err);
    }
  };

  const loadSharedData = async (patientId: string, silent = false) => {
    if (!silent) setLoadingData(true);
    try {
      const [meds, scheds, status, hist, dash] = await Promise.allSettled([
        api.getSharedMedications(patientId),
        api.getSharedScheduleSummary(patientId),
        api.getSharedDoseStatus(patientId),
        api.getSharedHistory(patientId),
        api.getSharedDashboard(patientId),
      ]);

      setMedications(meds.status === 'fulfilled' ? meds.value : []);
      setSchedules(scheds.status === 'fulfilled' ? scheds.value : []);
      setTodayStatus(status.status === 'fulfilled' ? status.value : null);
      setHistory(hist.status === 'fulfilled' ? hist.value : []);
      setDashboard(dash.status === 'fulfilled' ? dash.value : null);
    } finally {
      if (!silent) setLoadingData(false);
    }
  };

  const handleAcceptInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inviteToken.trim()) return;
    setAccepting(true);
    try {
      await api.acceptInvite(inviteToken.trim());
      setMessage('Invitation successfully accepted! Patient data linked.');
      setInviteToken('');
      loadCaregiverState();
    } catch (err: any) {
      setMessage(`Error: ${err.message}`);
    } finally {
      setAccepting(false);
    }
  };

  const activePatient = patients.find((p) => p.patient_id === selectedPatientId);

  return (
    <div className="space-y-6">
      {/* Toast message */}
      {message && (
        <div className="p-3 bg-teal-50 dark:bg-teal-950/60 border border-teal-300 dark:border-teal-700 text-teal-950 dark:text-teal-200 rounded text-xs flex justify-between items-center shadow-xs">
          <span>{message}</span>
          <button onClick={() => setMessage(null)} className="font-bold text-sm px-1">×</button>
        </div>
      )}

      {/* Top Banner: Consent & Role */}
      <div className="bg-white dark:bg-[#1E2226] border border-[#D9D5CA] dark:border-[#2E363D] rounded-md p-5 space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <span className="p-2 bg-[#0F5C5A]/10 text-[#0F5C5A] dark:text-[#1EB8B4] rounded">
              <ShieldCheck className="w-5 h-5" />
            </span>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-semibold text-[#1B1F23] dark:text-[#ECEFF1]">
                  Caregiver Authorized Portal
                </h2>
                <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                  Real-time Sync
                </span>
              </div>
              <p className="text-xs text-[#4A5159] dark:text-[#9EABB5]">
                Read-only access governed strictly by real-time patient consent grants.
              </p>
            </div>
          </div>

          {/* Accept New Invitation Form */}
          <form onSubmit={handleAcceptInvite} className="flex items-center gap-2">
            <input
              type="text"
              placeholder="Enter Invite Code"
              value={inviteToken}
              onChange={(e) => setInviteToken(e.target.value)}
              className="px-3 py-1.5 border border-[#D9D5CA] dark:border-[#2E363D] bg-white dark:bg-[#121416] text-[#1B1F23] dark:text-[#ECEFF1] rounded text-xs w-48 sm:w-64 focus:outline-none"
            />
            <button
              type="submit"
              disabled={accepting || !inviteToken.trim()}
              className="px-3 py-1.5 bg-[#0F5C5A] dark:bg-[#1EB8B4] text-white dark:text-[#121416] rounded text-xs font-medium hover:bg-teal-900 disabled:opacity-50"
            >
              {accepting ? 'Linking…' : 'Accept Code'}
            </button>
          </form>
        </div>

        {/* Patient selector */}
        {patients.length > 0 && (
          <div className="flex items-center gap-2 pt-3 border-t border-[#D9D5CA] dark:border-[#2E363D]">
            <span className="text-xs font-semibold uppercase tracking-wider text-[#4A5159] dark:text-[#9EABB5]">
              Connected Patient:
            </span>
            <div className="flex gap-2">
              {patients.map((p) => (
                <button
                  key={p.patient_id}
                  onClick={() => setSelectedPatientId(p.patient_id)}
                  className={`px-3 py-1 rounded text-xs font-medium transition-colors ${
                    selectedPatientId === p.patient_id
                      ? 'bg-[#0F5C5A] dark:bg-[#1EB8B4] text-white dark:text-[#121416]'
                      : 'bg-[#F7F5F0] dark:bg-[#2E363D] text-[#4A5159] dark:text-[#ECEFF1] hover:bg-neutral-200 dark:hover:bg-neutral-700'
                  }`}
                >
                  {p.patient_name}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      {patients.length === 0 ? (
        <div className="bg-white dark:bg-[#1E2226] border border-[#D9D5CA] dark:border-[#2E363D] rounded p-8 text-center text-[#4A5159] dark:text-[#9EABB5] space-y-3">
          <Key className="w-8 h-8 mx-auto text-neutral-400" />
          <h3 className="font-semibold text-base text-[#1B1F23] dark:text-[#ECEFF1]">No Patients Currently Linked</h3>
          <p className="text-xs max-w-md mx-auto">
            To view a patient's medication ledger, enter an invitation code generated by the patient in the box above.
          </p>
        </div>
      ) : activePatient ? (
        <div className="space-y-6">
          {/* Active Scope Notice */}
          <div className="bg-teal-50 dark:bg-teal-950/50 border border-teal-200 dark:border-teal-800 rounded p-4 text-xs space-y-1 text-teal-950 dark:text-teal-200">
            <span className="font-bold uppercase tracking-wider text-teal-900 dark:text-teal-100 block text-[11px]">
              Active Consent Scope for {activePatient.patient_name}:
            </span>
            <div className="flex flex-wrap gap-1.5 pt-1">
              {activePatient.scopes.map((s: string) => (
                <span key={s} className="px-2 py-0.5 bg-white dark:bg-[#1E2226] border border-teal-300 dark:border-teal-700 rounded text-[11px] text-teal-900 dark:text-teal-200 font-mono">
                  {s}
                </span>
              ))}
            </div>
          </div>

          {/* Today Dose Status (if scope granted) */}
          {todayStatus && (
            <div className="bg-white dark:bg-[#1E2226] border border-[#D9D5CA] dark:border-[#2E363D] rounded-md p-5 space-y-3">
              <h3 className="text-xs font-bold uppercase tracking-wider text-[#4A5159] dark:text-[#9EABB5]">
                Today's Overview ({todayStatus.date})
              </h3>
              <div className="grid grid-cols-4 gap-2 text-center">
                <div className="p-2 bg-[#F7F5F0] dark:bg-[#252A2F] rounded">
                  <div className="text-xs text-[#4A5159] dark:text-[#9EABB5]">Total Scheduled</div>
                  <div className="text-xl font-mono-numbers font-semibold text-[#1B1F23] dark:text-[#ECEFF1]">{todayStatus.total_scheduled}</div>
                </div>
                <div className="p-2 bg-[#1E6B3A]/10 rounded border border-[#1E6B3A]/20">
                  <div className="text-xs text-[#1E6B3A] dark:text-[#2FA85C]">Taken</div>
                  <div className="text-xl font-mono-numbers font-semibold text-[#1E6B3A] dark:text-[#2FA85C]">{todayStatus.taken}</div>
                </div>
                <div className="p-2 bg-[#8A2D2D]/10 rounded border border-[#8A2D2D]/20">
                  <div className="text-xs text-[#8A2D2D] dark:text-[#C94A4A]">Skipped</div>
                  <div className="text-xl font-mono-numbers font-semibold text-[#8A2D2D] dark:text-[#C94A4A]">{todayStatus.not_taken}</div>
                </div>
                <div className="p-2 bg-[#7A5A00]/10 rounded border border-[#7A5A00]/20">
                  <div className="text-xs text-[#7A5A00] dark:text-[#D4A017]">Unresolved</div>
                  <div className="text-xl font-mono-numbers font-semibold text-[#7A5A00] dark:text-[#D4A017]">{todayStatus.unresolved}</div>
                </div>
              </div>
            </div>
          )}

          {/* Adherence Dashboard (if scope granted) */}
          {dashboard && (
            <div className="bg-white dark:bg-[#1E2226] border border-[#D9D5CA] dark:border-[#2E363D] rounded-md p-5 space-y-3">
              <h3 className="text-xs font-bold uppercase tracking-wider text-[#4A5159] dark:text-[#9EABB5]">
                Shared 30-Day Adherence Dashboard
              </h3>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="p-3 bg-neutral-50 dark:bg-neutral-800 rounded border border-neutral-200 dark:border-neutral-700">
                  <span className="text-[11px] text-[#4A5159] dark:text-[#9EABB5] uppercase tracking-wider">Scheduled (S)</span>
                  <div className="text-2xl font-mono-numbers font-bold text-[#1B1F23] dark:text-[#ECEFF1] mt-1">{dashboard.S}</div>
                </div>
                <div className="p-3 bg-[#1E6B3A]/5 dark:bg-[#2FA85C]/10 rounded border border-[#1E6B3A]/20">
                  <span className="text-[11px] text-[#1E6B3A] dark:text-[#2FA85C] uppercase tracking-wider">Confirmed Intake</span>
                  <div className="text-2xl font-mono-numbers font-bold text-[#1E6B3A] dark:text-[#2FA85C] mt-1">
                    {dashboard.confirmed_pct !== null ? `${dashboard.confirmed_pct}%` : 'N/A'}
                  </div>
                  <span className="text-[10px] text-[#4A5159] dark:text-[#9EABB5] font-mono-numbers">{dashboard.T} / {dashboard.S}</span>
                </div>
                <div className="p-3 bg-[#8A2D2D]/5 dark:bg-[#C94A4A]/10 rounded border border-[#8A2D2D]/20">
                  <span className="text-[11px] text-[#8A2D2D] dark:text-[#C94A4A] uppercase tracking-wider">Skipped</span>
                  <div className="text-2xl font-mono-numbers font-bold text-[#8A2D2D] dark:text-[#C94A4A] mt-1">
                    {dashboard.not_taken_pct !== null ? `${dashboard.not_taken_pct}%` : 'N/A'}
                  </div>
                  <span className="text-[10px] text-[#4A5159] dark:text-[#9EABB5] font-mono-numbers">{dashboard.N} / {dashboard.S}</span>
                </div>
                <div className="p-3 bg-neutral-100 dark:bg-neutral-800 rounded border border-neutral-300 dark:border-neutral-700">
                  <span className="text-[11px] text-neutral-800 dark:text-neutral-200 uppercase tracking-wider">Record Coverage</span>
                  <div className="text-2xl font-mono-numbers font-bold text-neutral-900 dark:text-neutral-100 mt-1">
                    {dashboard.outcome_coverage_pct !== null ? `${dashboard.outcome_coverage_pct}%` : 'N/A'}
                  </div>
                  <span className="text-[10px] text-[#4A5159] dark:text-[#9EABB5] font-mono-numbers">({dashboard.T}+{dashboard.N})/{dashboard.S}</span>
                </div>
              </div>
            </div>
          )}

          {/* Shared Medications */}
          <div className="bg-white dark:bg-[#1E2226] border border-[#D9D5CA] dark:border-[#2E363D] rounded-md overflow-hidden">
            <div className="px-4 py-3 bg-[#F7F5F0] dark:bg-[#252A2F] border-b border-[#D9D5CA] dark:border-[#2E363D]">
              <h3 className="text-xs font-bold uppercase tracking-wider text-[#1B1F23] dark:text-[#ECEFF1]">
                Shared Medications
              </h3>
            </div>
            <div className="divide-y divide-[#D9D5CA] dark:divide-[#2E363D]">
              {medications.length === 0 ? (
                <div className="p-4 text-xs text-[#4A5159] dark:text-[#9EABB5]">No medications shared under this scope.</div>
              ) : (
                medications.map((m) => (
                  <div key={m.id} className="p-4 flex items-center justify-between">
                    <div>
                      <span className="font-semibold text-sm text-[#1B1F23] dark:text-[#ECEFF1]">{m.display_name}</span>
                      <span className="ml-2 text-xs text-[#4A5159] dark:text-[#9EABB5] capitalize">({m.form})</span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Shared Dose History Table */}
          {history.length > 0 && (
            <div className="bg-white dark:bg-[#1E2226] border border-[#D9D5CA] dark:border-[#2E363D] rounded-md overflow-hidden">
              <div className="px-4 py-3 bg-[#F7F5F0] dark:bg-[#252A2F] border-b border-[#D9D5CA] dark:border-[#2E363D] flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <FileText className="w-4 h-4 text-[#0F5C5A] dark:text-[#1EB8B4]" />
                  <h3 className="text-xs font-bold uppercase tracking-wider text-[#1B1F23] dark:text-[#ECEFF1]">
                    Authorized Dose History ({history.length} records)
                  </h3>
                </div>
              </div>
              <div className="divide-y divide-[#D9D5CA] dark:divide-[#2E363D]">
                {history.map((ev) => (
                  <div key={ev.id} className="p-3.5 flex items-center justify-between text-xs">
                    <div>
                      <div className="font-semibold text-[#1B1F23] dark:text-[#ECEFF1]">
                        {ev.medication_name}
                      </div>
                      <div className="text-[11px] text-[#4A5159] dark:text-[#9EABB5] font-mono-numbers mt-0.5">
                        Scheduled: {new Date(ev.scheduled_at).toLocaleString([], { dateStyle: 'short', timeStyle: 'short' })}
                        {ev.responded_at && (
                          <span className="ml-2">
                            · Responded: {new Date(ev.responded_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </span>
                        )}
                      </div>
                    </div>
                    <StatusBadge status={ev.status} isLate={ev.is_late} />
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Notification Feed */}
          {notifications.length > 0 && (
            <div className="bg-white dark:bg-[#1E2226] border border-[#D9D5CA] dark:border-[#2E363D] rounded-md overflow-hidden">
              <div className="px-4 py-3 bg-[#F7F5F0] dark:bg-[#252A2F] border-b border-[#D9D5CA] dark:border-[#2E363D] flex items-center gap-2">
                <Bell className="w-4 h-4 text-[#0F5C5A] dark:text-[#1EB8B4]" />
                <h3 className="text-xs font-bold uppercase tracking-wider text-[#1B1F23] dark:text-[#ECEFF1]">
                  Caregiver Notification Log
                </h3>
              </div>
              <div className="divide-y divide-[#D9D5CA] dark:divide-[#2E363D]">
                {notifications.map((n) => (
                  <div key={n.id} className="p-3 text-xs flex justify-between gap-3">
                    <span className="text-[#1B1F23] dark:text-[#ECEFF1]">{n.text}</span>
                    <span className="font-mono-numbers text-[10px] text-[#4A5159] dark:text-[#9EABB5] flex-shrink-0">
                      {new Date(n.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      ) : null}
    </div>
  );
};
