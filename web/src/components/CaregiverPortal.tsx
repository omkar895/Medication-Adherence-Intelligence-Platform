import React, { useState, useEffect } from 'react';
import { ShieldCheck, ShieldAlert, Key, Bell, Clock, Calendar, AlertCircle } from 'lucide-react';
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
  }, []);

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

  const loadSharedData = async (patientId: string) => {
    setLoadingData(true);
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
      setLoadingData(false);
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
        <div className="p-3 bg-teal-50 border border-teal-300 text-teal-950 rounded text-xs flex justify-between">
          <span>{message}</span>
          <button onClick={() => setMessage(null)} className="font-bold">×</button>
        </div>
      )}

      {/* Top Banner: Consent & Role */}
      <div className="bg-white border border-[#D9D5CA] rounded-md p-5 space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="p-2 bg-[#0F5C5A]/10 text-[#0F5C5A] rounded">
              <ShieldCheck className="w-5 h-5" />
            </span>
            <div>
              <h2 className="text-lg font-semibold text-[#1B1F23]">
                Caregiver Authorized Portal
              </h2>
              <p className="text-xs text-[#4A5159]">
                Read-only access governed strictly by real-time patient consent grants.
              </p>
            </div>
          </div>

          {/* Accept New Invitation Form */}
          <form onSubmit={handleAcceptInvite} className="flex items-center gap-2">
            <input
              type="text"
              placeholder="Enter Invite Code (e.g. DEMO-INVITE-TOKEN-2026)"
              value={inviteToken}
              onChange={(e) => setInviteToken(e.target.value)}
              className="px-3 py-1.5 border border-[#D9D5CA] rounded text-xs w-64 focus:border-[#0F5C5A] focus:outline-none"
            />
            <button
              type="submit"
              disabled={accepting || !inviteToken.trim()}
              className="px-3 py-1.5 bg-[#0F5C5A] text-white rounded text-xs font-medium hover:bg-teal-900 disabled:opacity-50"
            >
              {accepting ? 'Linking…' : 'Accept Code'}
            </button>
          </form>
        </div>

        {/* Patient selector */}
        {patients.length > 0 && (
          <div className="flex items-center gap-2 pt-3 border-t border-[#D9D5CA]">
            <span className="text-xs font-semibold uppercase tracking-wider text-[#4A5159]">
              Connected Patient:
            </span>
            <div className="flex gap-2">
              {patients.map((p) => (
                <button
                  key={p.patient_id}
                  onClick={() => setSelectedPatientId(p.patient_id)}
                  className={`px-3 py-1 rounded text-xs font-medium ${
                    selectedPatientId === p.patient_id
                      ? 'bg-[#0F5C5A] text-white'
                      : 'bg-[#F7F5F0] text-[#4A5159] hover:bg-neutral-200'
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
        <div className="bg-white border border-[#D9D5CA] rounded p-8 text-center text-[#4A5159] space-y-3">
          <Key className="w-8 h-8 mx-auto text-neutral-400" />
          <h3 className="font-semibold text-base text-[#1B1F23]">No Patients Currently Linked</h3>
          <p className="text-xs max-w-md mx-auto">
            To view a patient's medication ledger, enter an invitation code generated by the patient in the box above.
          </p>
        </div>
      ) : activePatient ? (
        <div className="space-y-6">
          {/* Active Scope Notice */}
          <div className="bg-teal-50 border border-teal-200 rounded p-4 text-xs space-y-1 text-teal-950">
            <span className="font-bold uppercase tracking-wider text-teal-900 block text-[11px]">
              Active Consent Scope for {activePatient.patient_name}:
            </span>
            <div className="flex flex-wrap gap-1.5 pt-1">
              {activePatient.scopes.map((s: string) => (
                <span key={s} className="px-2 py-0.5 bg-white border border-teal-300 rounded text-[11px] text-teal-900 font-mono">
                  {s}
                </span>
              ))}
            </div>
          </div>

          {/* Today Dose Status (if scope granted) */}
          {todayStatus && (
            <div className="bg-white border border-[#D9D5CA] rounded-md p-5 space-y-3">
              <h3 className="text-xs font-bold uppercase tracking-wider text-[#4A5159]">
                Today's Overview ({todayStatus.date})
              </h3>
              <div className="grid grid-cols-4 gap-2 text-center">
                <div className="p-2 bg-[#F7F5F0] rounded">
                  <div className="text-xs text-[#4A5159]">Total Scheduled</div>
                  <div className="text-xl font-mono-numbers font-semibold text-[#1B1F23]">{todayStatus.total_scheduled}</div>
                </div>
                <div className="p-2 bg-[#1E6B3A]/10 rounded border border-[#1E6B3A]/20">
                  <div className="text-xs text-[#1E6B3A]">Taken</div>
                  <div className="text-xl font-mono-numbers font-semibold text-[#1E6B3A]">{todayStatus.taken}</div>
                </div>
                <div className="p-2 bg-[#8A2D2D]/10 rounded border border-[#8A2D2D]/20">
                  <div className="text-xs text-[#8A2D2D]">Skipped</div>
                  <div className="text-xl font-mono-numbers font-semibold text-[#8A2D2D]">{todayStatus.not_taken}</div>
                </div>
                <div className="p-2 bg-[#7A5A00]/10 rounded border border-[#7A5A00]/20">
                  <div className="text-xs text-[#7A5A00]">Unresolved</div>
                  <div className="text-xl font-mono-numbers font-semibold text-[#7A5A00]">{todayStatus.unresolved}</div>
                </div>
              </div>
            </div>
          )}

          {/* Adherence Dashboard (if scope granted) */}
          {dashboard && (
            <div className="bg-white border border-[#D9D5CA] rounded-md p-5 space-y-3">
              <h3 className="text-xs font-bold uppercase tracking-wider text-[#4A5159]">
                Shared 30-Day Adherence Dashboard
              </h3>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="p-3 bg-neutral-50 rounded border border-neutral-200">
                  <span className="text-[11px] text-[#4A5159] uppercase tracking-wider">Scheduled (S)</span>
                  <div className="text-2xl font-mono-numbers font-bold text-[#1B1F23] mt-1">{dashboard.S}</div>
                </div>
                <div className="p-3 bg-[#1E6B3A]/5 rounded border border-[#1E6B3A]/20">
                  <span className="text-[11px] text-[#1E6B3A] uppercase tracking-wider">Confirmed Intake</span>
                  <div className="text-2xl font-mono-numbers font-bold text-[#1E6B3A] mt-1">
                    {dashboard.confirmed_pct !== null ? `${dashboard.confirmed_pct}%` : 'N/A'}
                  </div>
                  <span className="text-[10px] text-[#4A5159] font-mono-numbers">{dashboard.T} / {dashboard.S}</span>
                </div>
                <div className="p-3 bg-[#8A2D2D]/5 rounded border border-[#8A2D2D]/20">
                  <span className="text-[11px] text-[#8A2D2D] uppercase tracking-wider">Skipped</span>
                  <div className="text-2xl font-mono-numbers font-bold text-[#8A2D2D] mt-1">
                    {dashboard.not_taken_pct !== null ? `${dashboard.not_taken_pct}%` : 'N/A'}
                  </div>
                  <span className="text-[10px] text-[#4A5159] font-mono-numbers">{dashboard.N} / {dashboard.S}</span>
                </div>
                <div className="p-3 bg-neutral-100 rounded border border-neutral-300">
                  <span className="text-[11px] text-neutral-800 uppercase tracking-wider">Record Coverage</span>
                  <div className="text-2xl font-mono-numbers font-bold text-neutral-900 mt-1">
                    {dashboard.outcome_coverage_pct !== null ? `${dashboard.outcome_coverage_pct}%` : 'N/A'}
                  </div>
                  <span className="text-[10px] text-[#4A5159] font-mono-numbers">({dashboard.T}+{dashboard.N})/{dashboard.S}</span>
                </div>
              </div>
            </div>
          )}

          {/* Shared Medications */}
          <div className="bg-white border border-[#D9D5CA] rounded-md overflow-hidden">
            <div className="px-4 py-3 bg-[#F7F5F0] border-b border-[#D9D5CA]">
              <h3 className="text-xs font-bold uppercase tracking-wider text-[#1B1F23]">
                Shared Medications
              </h3>
            </div>
            <div className="divide-y divide-[#D9D5CA]">
              {medications.length === 0 ? (
                <div className="p-4 text-xs text-[#4A5159]">No medications shared under this scope.</div>
              ) : (
                medications.map((m) => (
                  <div key={m.id} className="p-4 flex items-center justify-between">
                    <div>
                      <span className="font-semibold text-sm text-[#1B1F23]">{m.display_name}</span>
                      <span className="ml-2 text-xs text-[#4A5159] capitalize">({m.form})</span>
                    </div>
                    {m.is_synthetic && (
                      <span className="text-[10px] bg-amber-100 text-amber-900 px-1.5 py-0.5 rounded font-mono font-medium">
                        Synthetic
                      </span>
                    )}
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Notification Feed */}
          {notifications.length > 0 && (
            <div className="bg-white border border-[#D9D5CA] rounded-md overflow-hidden">
              <div className="px-4 py-3 bg-[#F7F5F0] border-b border-[#D9D5CA] flex items-center gap-2">
                <Bell className="w-4 h-4 text-[#0F5C5A]" />
                <h3 className="text-xs font-bold uppercase tracking-wider text-[#1B1F23]">
                  Caregiver Notification Log
                </h3>
              </div>
              <div className="divide-y divide-[#D9D5CA]">
                {notifications.map((n) => (
                  <div key={n.id} className="p-3 text-xs flex justify-between gap-3">
                    <span className="text-[#1B1F23]">{n.text}</span>
                    <span className="font-mono-numbers text-[10px] text-[#4A5159] flex-shrink-0">
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
