import React, { useState, useEffect } from 'react';
import {
  ShieldCheck,
  ShieldAlert,
  Key,
  Bell,
  Clock,
  Calendar,
  AlertCircle,
  FileText,
  MessageCircle,
  Send,
  Copy,
  Trash2,
  Check,
  UserMinus,
  Phone,
  ExternalLink,
  CheckCircle2,
} from 'lucide-react';
import { api, PeriodSummary } from '../services/api';
import { StatusBadge } from './StatusBadge';
import { notificationService } from '../services/notifications';

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

  // WhatsApp and Alert State
  const [showWhatsAppModal, setShowWhatsAppModal] = useState<boolean>(false);
  const [whatsAppPhone, setWhatsAppPhone] = useState<string>(() => {
    return localStorage.getItem('maip_caregiver_wa_phone') || '';
  });
  const [copiedReport, setCopiedReport] = useState<boolean>(false);
  const [selectedBlockCell, setSelectedBlockCell] = useState<any | null>(null);
  const [activeDueAlert, setActiveDueAlert] = useState<any | null>(null);

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

  // Real-time audio and visual alert when patient's dose time arrives
  useEffect(() => {
    const activePatient = patients.find((p) => p.patient_id === selectedPatientId);
    if (!activePatient || history.length === 0) return;

    notificationService.requestPermission().catch(() => {});

    const now = new Date();
    const todayStr = now.toISOString().split('T')[0];
    const todayEvents = history.filter(
      (ev) => ev.status === 'scheduled' && ev.scheduled_at && ev.scheduled_at.startsWith(todayStr)
    );

    for (const ev of todayEvents) {
      const schedTime = new Date(ev.scheduled_at).getTime();
      const diffMinutes = (now.getTime() - schedTime) / (60 * 1000);
      if (diffMinutes >= -5 && diffMinutes <= 35 && !notificationService.hasAlerted('cg_' + ev.id)) {
        notificationService.markAlerted('cg_' + ev.id);
        notificationService.playChime();
        notificationService.showSystemNotification(
          `Medication Due for ${activePatient.patient_name}`,
          `Scheduled dose: ${ev.medication_name} is due now.`
        );
        setActiveDueAlert(ev);
        break;
      }
    }
  }, [patients, selectedPatientId, history]);

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

  const handleDisconnectPatient = async (patientId: string, patientName: string) => {
    if (
      window.confirm(
        `Disconnect from ${patientName}? You will no longer receive alerts or view this patient's adherence records.`
      )
    ) {
      try {
        await api.caregiverDisconnectPatient(patientId);
        setMessage(`Successfully disconnected from ${patientName}.`);
        setSelectedPatientId(null);
        loadCaregiverState();
      } catch (err: any) {
        alert(err.message);
      }
    }
  };

  const activePatient = patients.find((p) => p.patient_id === selectedPatientId);

  // Generate complete WhatsApp Adherence Report
  const generateWhatsAppReport = () => {
    if (!activePatient) return '';
    const nowStr = new Date().toLocaleDateString(undefined, {
      weekday: 'long',
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });

    let text = `📋 *MAIP PATIENT ADHERENCE REPORT*\n`;
    text += `👤 *Patient:* ${activePatient.patient_name}\n`;
    text += `📅 *Date:* ${nowStr}\n\n`;

    if (todayStatus) {
      text += `*Today's Dose Status:*\n`;
      text += `• Total Scheduled: ${todayStatus.total_scheduled}\n`;
      text += `• Taken: ${todayStatus.taken} ✅\n`;
      text += `• Skipped: ${todayStatus.not_taken} ❌\n`;
      text += `• Unresolved: ${todayStatus.unresolved} ⏳\n\n`;
    }

    if (dashboard) {
      text += `*30-Day Adherence Performance:*\n`;
      text += `• Confirmed Intake: ${dashboard.confirmed_pct !== null ? dashboard.confirmed_pct + '%' : 'N/A'} (${dashboard.T}/${dashboard.S} doses)\n`;
      text += `• Skipped: ${dashboard.not_taken_pct !== null ? dashboard.not_taken_pct + '%' : 'N/A'} (${dashboard.N}/${dashboard.S} doses)\n`;
      text += `• Record Coverage: ${dashboard.outcome_coverage_pct !== null ? dashboard.outcome_coverage_pct + '%' : 'N/A'}\n\n`;
    }

    if (medications.length > 0) {
      text += `*Active Prescribed Medications:*\n`;
      medications.forEach((m: any, idx: number) => {
        text += `${idx + 1}. ${m.display_name} (${m.form || 'tablet'})\n`;
      });
      text += `\n`;
    }

    text += `_Report compiled via MAIP Adherence Platform._`;
    return text;
  };

  const handleSendWhatsApp = (e: React.FormEvent) => {
    e.preventDefault();
    const cleanNumber = whatsAppPhone.replace(/[^0-9]/g, '');
    localStorage.setItem('maip_caregiver_wa_phone', whatsAppPhone);
    const text = generateWhatsAppReport();
    const encoded = encodeURIComponent(text);
    const url = cleanNumber ? `https://wa.me/${cleanNumber}?text=${encoded}` : `https://wa.me/?text=${encoded}`;
    window.open(url, '_blank');
    setShowWhatsAppModal(false);
  };

  const handleCopyReport = () => {
    const text = generateWhatsAppReport();
    navigator.clipboard.writeText(text);
    setCopiedReport(true);
    setTimeout(() => setCopiedReport(false), 3000);
  };

  const handleSendUrgentMissedAlert = () => {
    if (!activePatient) return;
    const cleanNumber = whatsAppPhone.replace(/[^0-9]/g, '');
    const alertMsg = `⚠️ *MAIP Care Alert for ${activePatient.patient_name}*:\nOne or more scheduled medication doses are marked skipped or unresolved today. Please check in with ${activePatient.patient_name}.\n\n_Sent via MAIP Caregiver Portal_`;
    const encoded = encodeURIComponent(alertMsg);
    const url = cleanNumber ? `https://wa.me/${cleanNumber}?text=${encoded}` : `https://wa.me/?text=${encoded}`;
    window.open(url, '_blank');
  };

  const handleSendDueReminder = (ev: any) => {
    if (!activePatient) return;
    const cleanNumber = whatsAppPhone.replace(/[^0-9]/g, '');
    const reminderMsg = `🔔 *Medication Reminder for ${activePatient.patient_name}*:\nHi, it's time for your scheduled dose of *${ev.medication_name}*.\nPlease take your dose and confirm intake in the MAIP app!`;
    const encoded = encodeURIComponent(reminderMsg);
    const url = cleanNumber ? `https://wa.me/${cleanNumber}?text=${encoded}` : `https://wa.me/?text=${encoded}`;
    window.open(url, '_blank');
  };

  // Build GitHub-style block graph
  const buildHeatmapGrid = () => {
    const cells = [];
    const now = new Date();
    const dayMap = new Map<string, { S: number; T: number; N: number; U: number; late: number }>();

    for (const ev of history) {
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

    for (let i = 29; i >= 0; i--) {
      const d = new Date(now.getTime() - i * 24 * 3600 * 1000);
      const dStr = d.toISOString().split('T')[0];
      const entry = dayMap.get(dStr) || { S: 0, T: 0, N: 0, U: 0, late: 0 };
      let status: 'taken' | 'delayed' | 'missed' | 'empty' = 'empty';
      if (entry.S > 0) {
        if (entry.N > 0 || entry.U > 0) {
          status = 'missed';
        } else if (entry.late > 0) {
          status = 'delayed';
        } else if (entry.T > 0) {
          status = 'taken';
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

  return (
    <div className="space-y-6">
      {/* Toast message */}
      {message && (
        <div className="p-3 bg-teal-50 dark:bg-teal-950/60 border border-teal-300 dark:border-teal-700 text-teal-950 dark:text-teal-200 rounded text-xs flex justify-between items-center shadow-xs">
          <span>{message}</span>
          <button onClick={() => setMessage(null)} className="font-bold text-sm px-1">
            ×
          </button>
        </div>
      )}

      {/* Real-time Dose Alert Banner for Caretaker */}
      {activeDueAlert && (
        <div className="bg-amber-500/10 dark:bg-amber-500/20 border-2 border-amber-500 rounded-md p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 animate-in fade-in duration-200">
          <div className="flex items-center gap-3">
            <span className="p-2 bg-amber-500 text-white rounded-full flex-shrink-0 animate-bounce">
              <Bell className="w-4 h-4" />
            </span>
            <div>
              <div className="text-xs font-bold uppercase tracking-wider text-amber-800 dark:text-amber-300">
                Live Medication Due for {activePatient?.patient_name}
              </div>
              <div className="font-semibold text-sm text-[#1B1F23] dark:text-[#ECEFF1] mt-0.5">
                {activeDueAlert.medication_name} — Scheduled:{' '}
                {new Date(activeDueAlert.scheduled_at).toLocaleTimeString([], {
                  hour: '2-digit',
                  minute: '2-digit',
                })}
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => handleSendDueReminder(activeDueAlert)}
              className="px-3.5 py-2 bg-[#25D366] hover:bg-[#20ba59] text-white rounded text-xs font-semibold flex items-center gap-1.5 shadow-xs transition-colors"
            >
              <MessageCircle className="w-3.5 h-3.5" />
              <span>Remind via WhatsApp</span>
            </button>
            <button
              onClick={() => setActiveDueAlert(null)}
              className="px-3 py-2 bg-neutral-200 dark:bg-neutral-700 text-neutral-700 dark:text-neutral-200 rounded text-xs font-medium hover:bg-neutral-300"
            >
              Dismiss
            </button>
          </div>
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
              placeholder="Enter 6-Digit Invite Code"
              value={inviteToken}
              onChange={(e) => setInviteToken(e.target.value)}
              className="px-3 py-1.5 border border-[#D9D5CA] dark:border-[#2E363D] bg-white dark:bg-[#121416] text-[#1B1F23] dark:text-[#ECEFF1] rounded text-xs w-44 sm:w-56 focus:outline-none"
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

        {/* Patient selector & Disconnect Option */}
        {patients.length > 0 && (
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-3 border-t border-[#D9D5CA] dark:border-[#2E363D]">
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold uppercase tracking-wider text-[#4A5159] dark:text-[#9EABB5]">
                Connected Patients:
              </span>
              <div className="flex flex-wrap gap-2">
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

            {/* Quick WhatsApp Action Button for Caregiver */}
            {activePatient && (
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setShowWhatsAppModal(true)}
                  className="px-3 py-1.5 bg-[#25D366] hover:bg-[#20ba59] text-white rounded text-xs font-semibold flex items-center gap-1.5 shadow-xs transition-colors"
                >
                  <MessageCircle className="w-3.5 h-3.5" />
                  <span>WhatsApp Report</span>
                </button>

                <button
                  onClick={() => handleDisconnectPatient(activePatient.patient_id, activePatient.patient_name)}
                  title="Disconnect from this patient"
                  className="px-2.5 py-1.5 text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 border border-rose-200 dark:border-rose-800/80 rounded text-xs font-medium flex items-center gap-1 transition-colors"
                >
                  <UserMinus className="w-3.5 h-3.5" />
                  <span>Disconnect</span>
                </button>
              </div>
            )}
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
          <div className="bg-teal-50 dark:bg-teal-950/50 border border-teal-200 dark:border-teal-800 rounded p-4 text-xs space-y-1 text-teal-950 dark:text-teal-200 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div>
              <span className="font-bold uppercase tracking-wider text-teal-900 dark:text-teal-100 block text-[11px]">
                Active Consent Scope for {activePatient.patient_name}:
              </span>
              <div className="flex flex-wrap gap-1.5 pt-1">
                {activePatient.scopes.map((s: string) => (
                  <span
                    key={s}
                    className="px-2 py-0.5 bg-white dark:bg-[#1E2226] border border-teal-300 dark:border-teal-700 rounded text-[11px] text-teal-900 dark:text-teal-200 font-mono"
                  >
                    {s}
                  </span>
                ))}
              </div>
            </div>

            {/* Quick Urgent Missed Alert Button */}
            {todayStatus && (todayStatus.unresolved > 0 || todayStatus.not_taken > 0) && (
              <button
                onClick={handleSendUrgentMissedAlert}
                className="px-3 py-1.5 bg-rose-600 hover:bg-rose-700 text-white rounded text-xs font-semibold flex items-center gap-1.5 shadow-xs transition-colors self-start sm:self-auto"
              >
                <AlertCircle className="w-3.5 h-3.5" />
                <span>Send WhatsApp Missed Alert</span>
              </button>
            )}
          </div>

          {/* Today Dose Status (if scope granted) */}
          {todayStatus && (
            <div className="bg-white dark:bg-[#1E2226] border border-[#D9D5CA] dark:border-[#2E363D] rounded-md p-5 space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-xs font-bold uppercase tracking-wider text-[#4A5159] dark:text-[#9EABB5]">
                  Today's Overview ({todayStatus.date})
                </h3>
                <span className="text-xs text-[#0F5C5A] dark:text-[#1EB8B4] font-medium">
                  {todayStatus.taken} of {todayStatus.total_scheduled} confirmed
                </span>
              </div>
              <div className="grid grid-cols-4 gap-2 text-center">
                <div className="p-3 bg-[#F7F5F0] dark:bg-[#252A2F] rounded border border-[#D9D5CA]/50 dark:border-[#2E363D]">
                  <div className="text-xs text-[#4A5159] dark:text-[#9EABB5]">Scheduled</div>
                  <div className="text-2xl font-mono-numbers font-bold text-[#1B1F23] dark:text-[#ECEFF1] mt-0.5">
                    {todayStatus.total_scheduled}
                  </div>
                </div>
                <div className="p-3 bg-[#1E6B3A]/10 rounded border border-[#1E6B3A]/30">
                  <div className="text-xs text-[#1E6B3A] dark:text-[#2FA85C] font-semibold">Taken</div>
                  <div className="text-2xl font-mono-numbers font-bold text-[#1E6B3A] dark:text-[#2FA85C] mt-0.5">
                    {todayStatus.taken}
                  </div>
                </div>
                <div className="p-3 bg-[#8A2D2D]/10 rounded border border-[#8A2D2D]/30">
                  <div className="text-xs text-[#8A2D2D] dark:text-[#C94A4A] font-semibold">Skipped</div>
                  <div className="text-2xl font-mono-numbers font-bold text-[#8A2D2D] dark:text-[#C94A4A] mt-0.5">
                    {todayStatus.not_taken}
                  </div>
                </div>
                <div className="p-3 bg-[#7A5A00]/10 rounded border border-[#7A5A00]/30">
                  <div className="text-xs text-[#7A5A00] dark:text-[#D4A017] font-semibold">Unresolved</div>
                  <div className="text-2xl font-mono-numbers font-bold text-[#7A5A00] dark:text-[#D4A017] mt-0.5">
                    {todayStatus.unresolved}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* GitHub-Style 30-Day Activity Block Graph for Caretaker */}
          <div className="bg-white dark:bg-[#1E2226] border border-[#D9D5CA] dark:border-[#2E363D] rounded-md p-5 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-[#D9D5CA] dark:border-[#2E363D] pb-3">
              <div>
                <span className="text-xs font-bold uppercase tracking-wider text-[#4A5159] dark:text-[#9EABB5]">
                  30-Day Adherence Block Graph (GitHub Style)
                </span>
                <p className="text-xs text-[#4A5159] dark:text-[#9EABB5] mt-0.5">
                  Green = Confirmed Taken · Yellow = Delayed · Red = Missed / Skipped · Gray = No Doses
                </p>
              </div>

              {/* Legend */}
              <div className="flex items-center gap-3 text-[11px] text-[#4A5159] dark:text-[#9EABB5]">
                <div className="flex items-center gap-1">
                  <div className="w-3 h-3 rounded-xs bg-[#2FA85C]" />
                  <span>Taken</span>
                </div>
                <div className="flex items-center gap-1">
                  <div className="w-3 h-3 rounded-xs bg-[#D4A017]" />
                  <span>Delay</span>
                </div>
                <div className="flex items-center gap-1">
                  <div className="w-3 h-3 rounded-xs bg-[#C94A4A]" />
                  <span>Missed</span>
                </div>
              </div>
            </div>

            {/* Block Grid */}
            <div className="overflow-x-auto pb-2">
              <div className="flex flex-wrap gap-1.5 sm:gap-2">
                {heatmapCells.map((cell) => {
                  let bgClass = 'bg-neutral-200 dark:bg-neutral-800 text-neutral-400';
                  if (cell.status === 'taken') bgClass = 'bg-[#2FA85C] text-white hover:brightness-110';
                  if (cell.status === 'delayed') bgClass = 'bg-[#D4A017] text-white hover:brightness-110';
                  if (cell.status === 'missed') bgClass = 'bg-[#C94A4A] text-white hover:brightness-110';

                  const isSelected = selectedBlockCell?.date === cell.date;

                  return (
                    <button
                      key={cell.date}
                      onClick={() => setSelectedBlockCell(cell)}
                      title={`${cell.date}: Scheduled=${cell.S}, Taken=${cell.T}, Delayed=${cell.late}, Missed=${cell.N + cell.U}`}
                      className={`w-7 h-7 sm:w-8 sm:h-8 rounded-sm ${bgClass} transition-all transform hover:scale-110 focus:outline-none flex flex-col items-center justify-center ${
                        isSelected ? 'ring-2 ring-[#0F5C5A] dark:ring-[#1EB8B4] scale-110' : ''
                      }`}
                    >
                      <span className="text-[9px] font-mono font-bold text-white/90">
                        {new Date(cell.date + 'T00:00:00Z').getDate()}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Interactive Block Inspector Drawer */}
            {selectedBlockCell && (
              <div className="p-3 bg-[#F7F5F0] dark:bg-[#121416] border border-[#D9D5CA] dark:border-[#2E363D] rounded flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs animate-in fade-in duration-150">
                <div>
                  <span className="font-bold text-[#1B1F23] dark:text-[#ECEFF1]">
                    {new Date(selectedBlockCell.date + 'T00:00:00Z').toLocaleDateString(undefined, {
                      weekday: 'long',
                      month: 'short',
                      day: 'numeric',
                    })}
                  </span>
                  <span className="ml-2 font-mono-numbers text-[#4A5159] dark:text-[#9EABB5]">
                    Scheduled: {selectedBlockCell.S} doses
                  </span>
                </div>

                <div className="flex items-center gap-3">
                  <span className="text-[#1E6B3A] dark:text-[#2FA85C] font-semibold">
                    ✓ {selectedBlockCell.T} Taken {selectedBlockCell.late > 0 && `(${selectedBlockCell.late} Late)`}
                  </span>
                  <span>·</span>
                  <span className="text-[#8A2D2D] dark:text-[#E56363] font-semibold">
                    ✕ {selectedBlockCell.N} Skipped
                  </span>
                  <span>·</span>
                  <span className="text-[#7A5A00] dark:text-[#F1B638] font-semibold">
                    ◌ {selectedBlockCell.U} Unresolved
                  </span>
                  <button
                    onClick={() => setSelectedBlockCell(null)}
                    className="text-[#4A5159] hover:text-[#1B1F23] ml-2 font-bold"
                  >
                    ×
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Adherence Dashboard Metrics (if scope granted) */}
          {dashboard && (
            <div className="bg-white dark:bg-[#1E2226] border border-[#D9D5CA] dark:border-[#2E363D] rounded-md p-5 space-y-3">
              <h3 className="text-xs font-bold uppercase tracking-wider text-[#4A5159] dark:text-[#9EABB5]">
                Shared 30-Day Adherence Metrics & Denominators
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
                Shared Prescriptions ({medications.length})
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
                      {m.prescribed_instruction_text && (
                        <div className="text-xs text-[#4A5159] dark:text-[#9EABB5] mt-0.5">
                          {m.prescribed_instruction_text}
                        </div>
                      )}
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

      {/* WhatsApp Adherence Report Modal */}
      {showWhatsAppModal && activePatient && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-150">
          <div className="bg-white dark:bg-[#1E2226] max-w-lg w-full rounded-md border border-[#D9D5CA] dark:border-[#2E363D] shadow-2xl overflow-hidden">
            <div className="bg-[#25D366] px-6 py-4 text-white flex items-center justify-between">
              <div className="flex items-center gap-2">
                <MessageCircle className="w-5 h-5" />
                <h3 className="font-bold text-base">WhatsApp Patient Adherence Report</h3>
              </div>
              <button
                onClick={() => setShowWhatsAppModal(false)}
                className="text-white hover:text-neutral-200 text-xl font-bold"
              >
                ×
              </button>
            </div>

            <form onSubmit={handleSendWhatsApp} className="p-6 space-y-4 text-xs">
              <div>
                <label className="block text-xs font-semibold text-[#1B1F23] dark:text-[#ECEFF1] mb-1">
                  Recipient WhatsApp Number (Caregiver / Patient Phone)
                </label>
                <div className="relative">
                  <Phone className="w-4 h-4 text-neutral-400 absolute left-3 top-2.5" />
                  <input
                    type="tel"
                    placeholder="e.g. +91 9876543210 or 9876543210"
                    value={whatsAppPhone}
                    onChange={(e) => setWhatsAppPhone(e.target.value)}
                    className="w-full pl-9 pr-3 py-2 border border-[#D9D5CA] dark:border-[#2E363D] bg-white dark:bg-[#121416] text-[#1B1F23] dark:text-[#ECEFF1] rounded text-xs focus:outline-none"
                  />
                </div>
                <p className="text-[11px] text-[#4A5159] dark:text-[#9EABB5] mt-1">
                  If left blank, WhatsApp will prompt you to select any contact from your WhatsApp chat list.
                </p>
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#1B1F23] dark:text-[#ECEFF1] mb-1">
                  Formatted Report Message Preview:
                </label>
                <textarea
                  readOnly
                  rows={8}
                  value={generateWhatsAppReport()}
                  className="w-full p-2.5 bg-[#F7F5F0] dark:bg-[#121416] border border-[#D9D5CA] dark:border-[#2E363D] text-[#1B1F23] dark:text-[#ECEFF1] rounded font-mono text-[11px] leading-relaxed select-all"
                />
              </div>

              <div className="flex items-center justify-between pt-2">
                <button
                  type="button"
                  onClick={handleCopyReport}
                  className="px-3.5 py-2 border border-[#D9D5CA] dark:border-[#2E363D] hover:bg-neutral-100 dark:hover:bg-neutral-800 text-[#1B1F23] dark:text-[#ECEFF1] rounded text-xs font-semibold flex items-center gap-1.5 transition-colors"
                >
                  {copiedReport ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{copiedReport ? 'Copied to Clipboard!' : 'Copy Text'}</span>
                </button>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setShowWhatsAppModal(false)}
                    className="px-4 py-2 border border-[#D9D5CA] dark:border-[#2E363D] text-[#4A5159] dark:text-[#9EABB5] rounded text-xs hover:bg-neutral-100 dark:hover:bg-neutral-800"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 bg-[#25D366] hover:bg-[#20ba59] text-white rounded text-xs font-semibold flex items-center gap-1.5 shadow-xs transition-colors"
                  >
                    <ExternalLink className="w-3.5 h-3.5" />
                    <span>Open in WhatsApp</span>
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
